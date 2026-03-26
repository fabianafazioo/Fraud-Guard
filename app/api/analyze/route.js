import { buildFraudReport, parseUploadedFiles } from '@/lib/fraud-analysis';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files').filter(Boolean);

    if (!files.length) {
      return Response.json({ error: 'Please upload at least one Excel, CSV, or PDF file.' }, { status: 400 });
    }

    const sheets = await parseUploadedFiles(files);
    const report = buildFraudReport(sheets);
    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message || 'Something went wrong while analyzing the uploaded files.' }, { status: 500 });
  }
}
