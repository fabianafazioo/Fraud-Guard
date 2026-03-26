'use client';

import { FileSpreadsheet, FileText, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';

function formatSize(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export default function UploadPanel({ files, onFilesChange, onAnalyze, loading }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    onFilesChange((prev) => {
      const merged = [...prev, ...incoming];
      const unique = merged.filter((file, index) => {
        const firstIndex = merged.findIndex((item) => item.name === file.name && item.size === file.size);
        return firstIndex === index;
      });
      return unique;
    });
  }

  return (
    <div className="card upload-panel">
      <div className="section-title">
        <div>
          <h2>Upload Evidence Files</h2>
          <p className="helper">Drag and drop Excel, CSV, or PDF files for anomaly screening.</p>
        </div>
      </div>

      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <UploadCloud size={38} className="blue" />
        <h3 style={{ marginBottom: 8 }}>Drop your fraud data files here</h3>
        <p className="helper" style={{ maxWidth: 440, margin: '0 auto' }}>
          Best results come from structured Excel or CSV files. PDF support is included for text-based PDFs, but scanned PDFs may need manual review.
        </p>

        <div className="upload-actions" style={{ justifyContent: 'center' }}>
          <button className="btn secondary" onClick={() => inputRef.current?.click()}>
            Choose Files
          </button>
          <button className="btn" disabled={!files.length || loading} onClick={onAnalyze}>
            {loading ? <span className="loader" /> : 'Run Fraud Scan'}
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          multiple
          hidden
          onChange={(event) => addFiles(event.target.files)}
        />
      </div>

      <div className="file-list">
        {files.length ? (
          files.map((file) => {
            const isPdf = file.name.toLowerCase().endsWith('.pdf');
            const Icon = isPdf ? FileText : FileSpreadsheet;
            return (
              <div className="file-chip" key={`${file.name}-${file.size}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon size={18} className={isPdf ? 'yellow' : 'green'} />
                  <div>
                    <div style={{ color: 'white', fontWeight: 600 }}>{file.name}</div>
                    <div className="helper">{formatSize(file.size)}</div>
                  </div>
                </div>
                <button
                  className="btn secondary"
                  style={{ padding: '8px 12px' }}
                  onClick={() => onFilesChange((prev) => prev.filter((item) => !(item.name === file.name && item.size === file.size)))}
                >
                  Remove
                </button>
              </div>
            );
          })
        ) : (
          <p className="helper">No files uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
