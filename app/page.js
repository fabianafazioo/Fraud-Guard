'use client';

import { useState } from 'react';
import { AlertTriangle, ShieldCheck, FileDown } from 'lucide-react';
import { motion } from 'framer-motion';
import UploadPanel from '@/components/UploadPanel';
import MetricCards from '@/components/MetricCards';
import DashboardCharts from '@/components/DashboardCharts';
import FindingsPanel from '@/components/FindingsPanel';
import SummarySection from '@/components/SummarySection';

export default function HomePage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  async function handleAnalyze() {
    if (!files.length) {
      setError('Please upload at least one file before running the analysis.');
      return;
    }

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
      setError(err.message || 'Something went wrong while analyzing your files.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePdf() {
    if (!report) return;

    setExporting(true);
    setError('');

    try {
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Unable to create the PDF.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'fraudguard-report.pdf';
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Unable to save the PDF report.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="container">
        <header className="topbar">
          <div className="brand-wrap">
            <div className="brand-badge">
              <ShieldCheck size={22} />
            </div>

            <div>
              <p className="eyebrow">Fraud Analytics Platform</p>
              <h1>FraudGuard AI</h1>
              <p className="subtle">
                Upload your files. Detect suspicious activity. Review clear results in seconds.
              </p>
            </div>
          </div>
        </header>

        <section className="hero-layout">
          <motion.div
            className="hero-panel glass"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <span className="hero-chip">Advanced fraud detection</span>

            <h2>
              Clear, modern, and reliable <span className="gradient-text">fraud analysis</span>
            </h2>

            <p className="hero-copy">
              Upload Excel, CSV, or PDF files and get fast insights, suspicious activity summaries,
              and visual results designed to help you review risk with confidence.
            </p>

            <div className="hero-points">
              <div className="hero-point">
                <strong>Excel, CSV, PDF</strong>
                <span>Flexible file support for financial review.</span>
              </div>

              <div className="hero-point">
                <strong>Clear results</strong>
                <span>See flagged patterns and suspicious records quickly.</span>
              </div>

              <div className="hero-point">
                <strong>Professional reports</strong>
                <span>Download your findings as a clean PDF report.</span>
              </div>
            </div>
          </motion.div>

          <UploadPanel
            files={files}
            onFilesChange={setFiles}
            onAnalyze={handleAnalyze}
            loading={loading}
          />
        </section>

        {error ? (
          <div className="notice error-notice glass">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        ) : null}

        {report ? (
          <section className="results-section">
            <div className="results-toolbar">
              <div>
                <p className="eyebrow">Analysis completed</p>
                <h2 className="results-title">Fraud Detection Results</h2>
                <p className="subtle">
                  Generated {new Date(report.generatedAt).toLocaleString()}
                </p>
              </div>

              <button
                className="primary-action save-btn"
                onClick={handleSavePdf}
                disabled={exporting}
              >
                <FileDown size={18} />
                {exporting ? 'Creating PDF...' : 'Save as a PDF'}
              </button>
            </div>

            <MetricCards report={report} />
            <SummarySection report={report} />
            <DashboardCharts report={report} />
            <FindingsPanel report={report} />
          </section>
        ) : (
          <section className="empty-state glass">
            <h3>Ready to review your files</h3>
            <p>
              Upload your documents and run the analysis to view fraud risk,
              suspicious activity, charts, and flagged records in one place.
            </p>
          </section>
        )}

        <footer className="site-footer">
          <p>Created by Fabiana Fazio</p>
        </footer>
      </div>
    </main>
  );
}