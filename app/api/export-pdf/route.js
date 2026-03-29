import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const runtime = 'nodejs';

function addWrappedText(page, text, options) {
  const {
    font,
    fontSize = 11,
    x = 50,
    y,
    maxWidth = 500,
    lineHeight = 16,
    color = rgb(0.1, 0.12, 0.2)
  } = options;

  const words = String(text || '').split(/\s+/);
  let line = '';
  let cursorY = y;

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, fontSize);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: cursorY, size: fontSize, font, color });
      cursorY -= lineHeight;
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) {
    page.drawText(line, { x, y: cursorY, size: fontSize, font, color });
    cursorY -= lineHeight;
  }

  return cursorY;
}

export async function POST(request) {
  try {
    const { report } = await request.json();
    if (!report) {
      return Response.json({ error: 'Missing report data.' }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([842, 595]);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const dark = rgb(0.08, 0.1, 0.16);
    const muted = rgb(0.36, 0.42, 0.55);
    const accent = rgb(0.13, 0.54, 0.84);

    page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: rgb(0.97, 0.98, 1) });
    page.drawRectangle({ x: 0, y: 520, width: 842, height: 75, color: rgb(0.07, 0.1, 0.18) });
    page.drawText('FraudGuard AI Report', { x: 46, y: 548, size: 24, font: bold, color: rgb(1, 1, 1) });
    page.drawText(`Generated ${new Date(report.generatedAt).toLocaleString()}`, { x: 46, y: 528, size: 10, font: regular, color: rgb(0.82, 0.87, 0.95) });

    const cards = [
      ['Fraud Probability', `${report.fraudPercent}%`],
      ['Risk Level', report.riskLevel],
      ['Flagged Records', `${report.flaggedRecords}`],
      ['Files Reviewed', `${report.filesAnalyzed}`]
    ];

    cards.forEach((card, index) => {
      const x = 46 + index * 188;
      page.drawRectangle({ x, y: 435, width: 172, height: 64, color: rgb(1, 1, 1), borderColor: rgb(0.86, 0.89, 0.94), borderWidth: 1 });
      page.drawText(card[0], { x: x + 12, y: 476, size: 10, font: regular, color: muted });
      page.drawText(card[1], { x: x + 12, y: 452, size: 20, font: bold, color: dark });
    });

    let cursorY = 400;
    page.drawText('Executive Summary', { x: 46, y: cursorY, size: 14, font: bold, color: accent });
    cursorY -= 20;
    cursorY = addWrappedText(page, report.narrativeSummary, { font: regular, x: 46, y: cursorY, maxWidth: 750, color: dark });

    cursorY -= 10;
    page.drawText('Top Findings', { x: 46, y: cursorY, size: 14, font: bold, color: accent });
    cursorY -= 20;

    for (const finding of report.topFindings.slice(0, 5)) {
      if (cursorY < 80) {
        page = pdfDoc.addPage([842, 595]);
        page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: rgb(0.97, 0.98, 1) });
        cursorY = 540;
      }

      page.drawRectangle({ x: 46, y: cursorY - 60, width: 750, height: 64, color: rgb(1, 1, 1), borderColor: rgb(0.88, 0.9, 0.95), borderWidth: 1 });
      page.drawText(`${finding.fileName} · Row ${finding.rowNumber} · ${finding.area}`, { x: 58, y: cursorY - 14, size: 11, font: bold, color: dark });
      const reasons = finding.reasons.join(' • ');
      addWrappedText(page, reasons, { font: regular, x: 58, y: cursorY - 34, maxWidth: 720, fontSize: 10, lineHeight: 13, color: muted });
      cursorY -= 78;
    }

    const pdfBytes = await pdfDoc.save();
    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="fraudguard-report.pdf"'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to create the PDF.' }, { status: 500 });
  }
}
