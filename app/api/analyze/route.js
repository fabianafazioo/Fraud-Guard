import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

export const runtime = 'nodejs';

function runPythonAnalysis(scriptPath, filePaths) {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', [scriptPath, ...filePaths], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || 'Python analysis failed.'));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`Invalid analysis response: ${error.message}`));
      }
    });
  });
}

export async function POST(request) {
  const tempFiles = [];

  try {
    const formData = await request.formData();
    const files = formData.getAll('files');

    if (!files.length) {
      return Response.json({ error: 'No files were uploaded.' }, { status: 400 });
    }

    const workingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fraud-guard-'));
    const scriptPath = path.join(process.cwd(), 'python', 'analyze.py');

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const safeName = String(file.name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = path.join(workingDir, safeName);
      await fs.writeFile(filePath, buffer);
      tempFiles.push(filePath);
    }

    const report = await runPythonAnalysis(scriptPath, tempFiles);
    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message || 'Analysis failed.' }, { status: 500 });
  } finally {
    await Promise.all(tempFiles.map((filePath) => fs.unlink(filePath).catch(() => null)));
  }
}
