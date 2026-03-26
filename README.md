# FraudGuard AI

A polished fraud detection website built with **Next.js** for **VS Code + GitHub + Vercel**.

## What it does

- Drag and drop **Excel, CSV, or PDF** files
- Analyze uploaded files for suspicious patterns
- Show an estimated **fraud percentage**
- Summarize suspicious activity by area
- Display charts and top flagged records
- Export results as **DOCX** or **PDF-ready HTML**

## Important note about PDF uploads

Excel and CSV uploads are the most reliable because they are structured.

PDF support is included, but it works best for **text-based PDFs**. If the PDF is scanned or image-only, the extracted structure may be limited. For production-level PDF parsing, you would usually add OCR and a custom table extraction pipeline.

## Tech stack

- Next.js App Router
- React
- Recharts
- Framer Motion
- xlsx
- pdf-parse
- docx

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`

## Deploy to Vercel

1. Push this folder to GitHub.
2. Import the repo into Vercel.
3. Click deploy.

No environment variables are required for this version.

## Suggested GitHub upload steps

```bash
git init
git add .
git commit -m "Initial fraud detection website"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## Project structure

```text
app/
  api/
    analyze/route.js
    export/route.js
  globals.css
  layout.js
  page.js
components/
  DashboardCharts.js
  FindingsTable.js
  MetricCards.js
  SummarySection.js
  UploadPanel.js
lib/
  fraud-analysis.js
```
