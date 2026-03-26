import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';

export const runtime = 'nodejs';

function buildDoc(report) {
  const rows = [new TableRow({ children: ['Source', 'Anomaly Score', 'Reasons', 'Preview'].map((text) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })] })) }), ...report.topFindings.map((finding) => new TableRow({ children: [new TableCell({ children: [new Paragraph(String(finding.source))] }), new TableCell({ children: [new Paragraph(String(finding.anomalyScore))] }), new TableCell({ children: [new Paragraph(finding.reasons.join(', '))] }), new TableCell({ children: [new Paragraph(JSON.stringify(finding.preview))] })] }))];
  return new Document({ sections: [{ children: [new Paragraph({ text: 'FraudGuard AI Report', heading: HeadingLevel.TITLE }), new Paragraph({ text: `Risk Level: ${report.riskLevel}` }), new Paragraph({ text: `Estimated Fraud Percentage: ${report.fraudPercent}%` }), new Paragraph({ text: `Suspicious Rows: ${report.suspiciousRows} of ${report.totalRows}` }), new Paragraph({ text: `Generated: ${new Date(report.generatedAt).toLocaleString()}` }), new Paragraph({ text: 'Executive Summary', heading: HeadingLevel.HEADING_1 }), new Paragraph(report.narrativeSummary), new Paragraph({ text: 'Suspicious Activity Overview', heading: HeadingLevel.HEADING_1 }), ...report.suspiciousAreas.map((area) => new Paragraph({ children: [new TextRun({ text: `${area.area}: `, bold: true }), new TextRun(area.note)] })), new Paragraph({ text: 'Top Flagged Records', heading: HeadingLevel.HEADING_1 }), new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } })] }] });
}

function escapeHtml(value = '') { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

function buildHtmlReport(report) {
  const findingRows = report.topFindings.map((finding) => `<tr><td>${escapeHtml(finding.source)}</td><td>${escapeHtml(finding.anomalyScore)}</td><td>${escapeHtml(finding.reasons.join(', '))}</td><td><pre>${escapeHtml(JSON.stringify(finding.preview, null, 2))}</pre></td></tr>`).join('');
  const areaRows = report.suspiciousAreas.map((area) => `<li><strong>${escapeHtml(area.area)}:</strong> ${escapeHtml(area.note)}</li>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>FraudGuard AI Report</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111827;}h1,h2{margin-bottom:8px;}.meta{margin-bottom:24px;}table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{border:1px solid #d1d5db;padding:10px;text-align:left;vertical-align:top;}th{background:#f3f4f6;}pre{white-space:pre-wrap;word-break:break-word;margin:0;}</style></head><body><h1>FraudGuard AI Report</h1><div class="meta"><p><strong>Risk Level:</strong> ${escapeHtml(report.riskLevel)}</p><p><strong>Estimated Fraud Percentage:</strong> ${escapeHtml(report.fraudPercent)}%</p><p><strong>Suspicious Rows:</strong> ${escapeHtml(report.suspiciousRows)} of ${escapeHtml(report.totalRows)}</p><p><strong>Generated:</strong> ${escapeHtml(new Date(report.generatedAt).toLocaleString())}</p></div><h2>Executive Summary</h2><p>${escapeHtml(report.narrativeSummary)}</p><h2>Suspicious Activity Overview</h2><ul>${areaRows}</ul><h2>Top Flagged Records</h2><table><thead><tr><th>Source</th><th>Anomaly Score</th><th>Reasons</th><th>Preview</th></tr></thead><tbody>${findingRows}</tbody></table></body></html>`;
}

export async function POST(request) {
  try {
    const { report, format } = await request.json();
    if (!report) return Response.json({ error: 'No report data was provided for export.' }, { status: 400 });
    if (format === 'docx') {
      const buffer = await Packer.toBuffer(buildDoc(report));
      return new Response(buffer, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': 'attachment; filename="fraudguard-report.docx"' } });
    }
    const html = buildHtmlReport(report);
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': 'attachment; filename="fraudguard-report.html"' } });
  } catch (error) {
    return Response.json({ error: error.message || 'Export failed.' }, { status: 500 });
  }
}
