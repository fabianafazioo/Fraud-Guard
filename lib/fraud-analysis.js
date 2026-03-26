import * as XLSX from 'xlsx';

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function zScoreFlags(values, direction = 'both', limit = 2) {
  if (!values.length) return values.map(() => false);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length || 0;
  const std = Math.sqrt(variance) || 1;

  return values.map((value) => {
    const z = (value - mean) / std;
    if (direction === 'high') return z > limit;
    if (direction === 'low') return z < -limit;
    return Math.abs(z) > limit;
  });
}

function scoreFromFlags(flagsByRecord) {
  return flagsByRecord.map((flags) => Object.values(flags).reduce((sum, flag) => sum + (flag ? 1 : 0), 0));
}

function classifyRisk(fraudPercent) {
  if (fraudPercent >= 45) return 'High Risk';
  if (fraudPercent >= 20) return 'Medium Risk';
  return 'Low Risk';
}

function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[$,%\s,]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function normalizeRows(rows) {
  return rows
    .filter((row) => row && Object.keys(row).length > 0)
    .map((row) => {
      const normalized = {};
      for (const [key, value] of Object.entries(row)) {
        const cleanKey = String(key || '').trim();
        if (!cleanKey) continue;
        normalized[cleanKey] = value;
      }
      return normalized;
    });
}

function summarizeSheet(sheetName, rows) {
  const lowerHeaders = rows.length ? Object.keys(rows[0]).map((key) => key.toLowerCase()) : [];
  const amountIndexPerRow = rows.map((row) => {
    const entries = Object.entries(row);
    const picked = entries.find(([key]) => /(amount|salary|deal_value|monthly_fee|credit|debit|revenue|balance|discount|logins|manual_adjustments|extracted_value)/i.test(key));
    if (!picked) {
      return Object.values(row).map(parseNumber).find((v) => v !== null) ?? null;
    }
    return parseNumber(picked[1]);
  });

  const comparableValues = amountIndexPerRow.filter((v) => v !== null);
  const sorted = [...comparableValues].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  const upperFence = q3 + 1.5 * iqr;
  const lowerFence = q1 - 1.5 * iqr;

  const duplicateStrings = new Set();
  const seen = new Set();
  rows.forEach((row) => {
    const raw = JSON.stringify(row);
    if (seen.has(raw)) duplicateStrings.add(raw);
    seen.add(raw);
  });

  const hasAdjustment = rows.map((row) => JSON.stringify(row).toLowerCase().includes('adjustment'));
  const hasManualOverride = rows.map((row) => JSON.stringify(row).toLowerCase().includes('manual override'));
  const hasAdmin = rows.map((row) => JSON.stringify(row).toLowerCase().includes('admin'));
  const hasZeroLogins = rows.map((row) => {
    const loginKey = Object.keys(row).find((key) => /login/i.test(key));
    if (!loginKey) return false;
    return parseNumber(row[loginKey]) === 0;
  });
  const hasHighDiscount = rows.map((row) => {
    const discountKey = Object.keys(row).find((key) => /discount/i.test(key));
    if (!discountKey) return false;
    const discount = parseNumber(row[discountKey]);
    return discount !== null && discount >= 40;
  });
  const outlierAmounts = amountIndexPerRow.map((value) => value !== null && (value > upperFence || value < lowerFence));
  const zHigh = zScoreFlags(comparableValues, 'high', 2);
  let zCursor = 0;
  const zHighPerRow = amountIndexPerRow.map((value) => {
    if (value === null) return false;
    const flag = zHigh[zCursor];
    zCursor += 1;
    return flag;
  });

  const flagsByRecord = rows.map((row, index) => ({
    duplicate: duplicateStrings.has(JSON.stringify(row)),
    adjustment: hasAdjustment[index],
    manualOverride: hasManualOverride[index],
    adminEntry: hasAdmin[index],
    zeroLogins: hasZeroLogins[index],
    highDiscount: hasHighDiscount[index],
    outlierAmount: outlierAmounts[index],
    extremeValue: zHighPerRow[index]
  }));

  const anomalyScores = scoreFromFlags(flagsByRecord);
  const suspiciousRows = rows
    .map((row, index) => ({
      row,
      anomalyScore: anomalyScores[index],
      reasons: Object.entries(flagsByRecord[index]).filter(([, value]) => value).map(([key]) => key)
    }))
    .filter((item) => item.anomalyScore >= 2)
    .sort((a, b) => b.anomalyScore - a.anomalyScore);

  return {
    sheetName,
    rowCount: rows.length,
    suspiciousCount: suspiciousRows.length,
    suspiciousRows,
    charts: {
      reasons: [
        { name: 'Adjustments', value: hasAdjustment.filter(Boolean).length },
        { name: 'Manual Overrides', value: hasManualOverride.filter(Boolean).length },
        { name: 'Admin Entries', value: hasAdmin.filter(Boolean).length },
        { name: 'Zero Logins', value: hasZeroLogins.filter(Boolean).length },
        { name: 'High Discounts', value: hasHighDiscount.filter(Boolean).length },
        { name: 'Outlier Values', value: outlierAmounts.filter(Boolean).length }
      ]
    },
    lowerHeaders
  };
}

function recordsFromWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  return workbook.SheetNames.map((sheetName) => ({
    sheetName,
    rows: normalizeRows(XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' }))
  })).filter((sheet) => sheet.rows.length > 0);
}

function recordsFromPdfText(text, fileName) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 300);
  const rows = lines.map((line, index) => {
    const numbers = line.match(/-?\$?\d[\d,]*(?:\.\d+)?%?/g) || [];
    return {
      line: index + 1,
      content: line,
      extracted_value: numbers.length ? parseNumber(numbers[0]) ?? '' : '',
      contains_adjustment: /adjustment/i.test(line) ? 'yes' : 'no',
      contains_manual_override: /manual override/i.test(line) ? 'yes' : 'no',
      contains_admin: /admin/i.test(line) ? 'yes' : 'no'
    };
  });
  return [{ sheetName: `${fileName} PDF`, rows }];
}

export async function parseUploadedFiles(files) {
  const sheets = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name || 'Uploaded file';
    const lower = name.toLowerCase();
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
      sheets.push(...recordsFromWorkbook(buffer));
      continue;
    }
    if (lower.endsWith('.pdf')) {
      const { default: pdf } = await import('pdf-parse');
      const parsed = await pdf(buffer);
      sheets.push(...recordsFromPdfText(parsed.text || '', name));
      continue;
    }
    throw new Error(`Unsupported file type for ${name}. Please upload Excel, CSV, or PDF files.`);
  }
  return sheets;
}

export function buildFraudReport(sheets) {
  const sheetSummaries = sheets.map((sheet) => summarizeSheet(sheet.sheetName, sheet.rows));
  const totalRows = sheetSummaries.reduce((sum, sheet) => sum + sheet.rowCount, 0);
  const suspiciousRows = sheetSummaries.reduce((sum, sheet) => sum + sheet.suspiciousCount, 0);
  const fraudPercent = totalRows ? Number(((suspiciousRows / totalRows) * 100).toFixed(1)) : 0;
  const safePercent = Number((100 - fraudPercent).toFixed(1));
  const riskLevel = classifyRisk(fraudPercent);

  const suspiciousAreas = [];
  sheetSummaries.forEach((sheet) => {
    const lowerHeaders = sheet.lowerHeaders.join(' ');
    if (/salary|bank_account|payroll|employee|logins/.test(lowerHeaders)) suspiciousAreas.push({ area: 'Payroll', note: `${sheet.suspiciousCount} suspicious payroll-style records detected, including ghost employee patterns, duplicate payout routes, or unusual compensation behavior.` });
    if (/deal_value|discount|sales_rep|deal/.test(lowerHeaders)) suspiciousAreas.push({ area: 'Sales', note: `${sheet.suspiciousCount} suspicious sales-style records detected, including unusually high discounts or value anomalies.` });
    if (/monthly_fee|customer|plan_type/.test(lowerHeaders)) suspiciousAreas.push({ area: 'Customer Revenue', note: `${sheet.suspiciousCount} suspicious customer-style records detected, including paying accounts with no activity or strange fee patterns.` });
    if (/credit|debit|entered_by|account/.test(lowerHeaders)) suspiciousAreas.push({ area: 'Ledger', note: `${sheet.suspiciousCount} suspicious ledger-style records detected, including manual overrides, admin entries, or extreme values.` });
    if (/revenue|billed|recognized|deferred/.test(lowerHeaders)) suspiciousAreas.push({ area: 'Financial Statements', note: `${sheet.suspiciousCount} suspicious financial-style records detected, including manual adjustments or abnormal revenue gaps.` });
    if (/transaction|balance|amount|bank/.test(lowerHeaders)) suspiciousAreas.push({ area: 'Bank Activity', note: `${sheet.suspiciousCount} suspicious banking-style records detected, including repeated amounts, adjustment entries, or outlier transactions.` });
  });

  const topFindings = sheetSummaries.flatMap((sheet) => sheet.suspiciousRows.slice(0, 4).map((item) => ({ source: sheet.sheetName, anomalyScore: item.anomalyScore, reasons: item.reasons, preview: Object.fromEntries(Object.entries(item.row).slice(0, 5)) }))).sort((a, b) => b.anomalyScore - a.anomalyScore).slice(0, 10);
  const charts = {
    fraudGauge: [{ name: 'Suspicious', value: fraudPercent }, { name: 'Clear', value: safePercent }],
    bySheet: sheetSummaries.map((sheet) => ({ name: sheet.sheetName.slice(0, 18), suspicious: sheet.suspiciousCount, rows: sheet.rowCount })),
    reasons: sheetSummaries.flatMap((sheet) => sheet.charts.reasons).reduce((acc, current) => {
      const found = acc.find((item) => item.name === current.name);
      if (found) found.value += current.value; else acc.push({ ...current });
      return acc;
    }, [])
  };

  const narrativeSummary = riskLevel === 'High Risk' ? 'The uploaded files contain a significant concentration of anomalous patterns. Immediate review is recommended, especially for the records listed in the suspicious activity table.' : riskLevel === 'Medium Risk' ? 'The uploaded files show several records that deserve review. The results do not prove fraud, but they do highlight areas that should be investigated.' : 'The uploaded files show a relatively low anomaly rate. Even so, the flagged rows should still be reviewed because anomaly screening is designed to surface unusual behavior early.';

  return { generatedAt: new Date().toISOString(), riskLevel, fraudPercent, safePercent, totalRows, suspiciousRows, sheetsAnalyzed: sheetSummaries.length, narrativeSummary, suspiciousAreas, topFindings, charts, sheetSummaries };
}
