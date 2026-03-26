'use client';

import DashboardCharts from '@/components/DashboardCharts';
import FindingsTable from '@/components/FindingsTable';
import MetricCards from '@/components/MetricCards';
import SummarySection from '@/components/SummarySection';
import UploadPanel from '@/components/UploadPanel';
import { AlertTriangle, Download, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

export default function HomePage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const [exporting, setExporting] = useState('');

  const heroStats = useMemo(
    () => [
      { label: 'AI Engine', value: 'Isolation-style anomaly screening' },
      { label: 'Uploads', value: 'Excel, CSV, and text-based PDF' },
      { label: 'Outputs', value: 'Fraud %, charts, suspicious activity, export' }
    ],
    []
  );

  async function handleAnalyze() {
    setLoading(true);
    setError('');
    setReport(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed.');
      }

      setReport(data);
    } catch (err) {
      setError(err.message || 'Something went wrong while analyzing the files.');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format) {
    if (!report) return;
    setExporting(format);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, format })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Export failed.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = format === 'docx' ? 'fraudguard-report.docx' : 'fraudguard-report.html';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Unable to export the report.');
    } finally {
      setExporting('');
    }
  }

  return (
    <main className="page-shell">
      <div className="container">
        <div className="topbar">
          <div className="brand">
            <div className="brand-badge">
              <ShieldCheck className="green" />
            </div>
            <div>
              <h1>FraudGuard AI</h1>
              <p>Elegant fraud detection dashboard for financial risk review</p>
            </div>
          </div>
          <div className="brand" style={{ gap: 10 }}>
            <Sparkles size={16} className="blue" />
            <p className="subtle">Built by Fabiana Fazio</p>
          </div>
        </div>

        <section className="hero">
          <motion.div
            className="card hero-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="risk-badge" style={{ display: 'inline-flex', marginBottom: 16 }}>
              Professional fraud analytics experience
            </div>
            <h2 className="hero-title">
              Turn uploaded financial files into a <span className="gradient-text">clean fraud risk dashboard</span>
            </h2>
            <p className="helper" style={{ maxWidth: 680, fontSize: '1rem', lineHeight: 1.65 }}>
              Upload structured finance, bank, sales, payroll, or customer files. The system screens them for suspicious patterns, estimates a fraud percentage, explains where the red flags are, and lets the user export the results.
            </p>

            <div className="hero-grid">
              {heroStats.map((item) => (
                <div className="info-pill" key={item.label}>
                  <div className="metric-label">{item.label}</div>
                  <div style={{ fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <UploadPanel files={files} onFilesChange={setFiles} onAnalyze={handleAnalyze} loading={loading} />
        </section>

        {error ? (
          <div className="card summary-card" style={{ marginBottom: 18, borderColor: 'rgba(255, 93, 115, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle className="red" />
              <strong>Analysis Error</strong>
            </div>
            <p className="helper" style={{ marginTop: 10 }}>{error}</p>
          </div>
        ) : null}

        {report ? (
          <>
            <div className="section-title" style={{ marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0 }}>Fraud Detection Results</h2>
                <p className="helper">Generated {new Date(report.generatedAt).toLocaleString()}</p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn secondary" disabled={!!exporting} onClick={() => handleExport('html')}>
                  <Download size={16} style={{ marginRight: 8 }} /> Save as PDF-ready HTML
                </button>
                <button className="btn success" disabled={!!exporting} onClick={() => handleExport('docx')}>
                  <Download size={16} style={{ marginRight: 8 }} /> Save as DOCX
                </button>
              </div>
            </div>

            <MetricCards report={report} />
            <DashboardCharts report={report} />
            <SummarySection report={report} />
            <FindingsTable report={report} />
          </>
        ) : (
          <div className="card summary-card">
            <div className="section-title">
              <div>
                <h3>What this website does</h3> 
              </div>
            </div>
            <div className="summary-list">
              <div className="summary-item">
                <h4>1. Upload files</h4>
                <p>Drag Excel, CSV, or PDF files into the page and starts the fraud scan.</p>
              </div>
              <div className="summary-item">
                <h4>2. Run anomaly detection</h4>
                <p>The backend extracts rows, checks suspicious rules, and creates an Isolation-Forest-style fraud score dashboard experience.</p>
              </div>
              <div className="summary-item">
                <h4>3. Review the results</h4>
                <p>The user sees the fraud percentage, suspicious activity summary, charts, and a table of high-risk records.</p>
              </div>
              <div className="summary-item">
                <h4>4. Export the report</h4>
                <p>The results can be downloaded as a DOCX file or as an HTML file that is easy to print as PDF.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
