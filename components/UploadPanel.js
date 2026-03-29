'use client';

import { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, FileText, Play } from 'lucide-react';

function prettySize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function UploadPanel({ files, onFilesChange, onAnalyze, loading }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    onFilesChange((prev) => {
      const merged = [...prev, ...incoming];
      return merged.filter((file, index) => merged.findIndex((item) => item.name === file.name && item.size === file.size) === index);
    });
  }

  function removeFile(target) {
    onFilesChange((prev) => prev.filter((file) => !(file.name === target.name && file.size === target.size)));
  }

  return (
    <div className="upload-card glass">
      <div className="upload-head">
        <div>
          <p className="eyebrow">Evidence upload</p>
          <h3>Drop your files here</h3>
          <p className="subtle">Accepted file types: Excel, CSV, and PDF</p>
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
        <UploadCloud size={42} />
        <h4>Drag and drop your files</h4>
        <p>or click below to browse your device</p>
        <button type="button" className="ghost-btn" onClick={() => inputRef.current?.click()}>
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept=".xlsx,.xls,.csv,.pdf"
          onChange={(event) => addFiles(event.target.files)}
        />
      </div>

      <div className="file-stack">
        {files.length ? (
          files.map((file) => {
            const Icon = /pdf$/i.test(file.name) ? FileText : FileSpreadsheet;
            return (
              <div className="file-item" key={`${file.name}-${file.size}`}>
                <div className="file-meta">
                  <Icon size={18} />
                  <div>
                    <strong>{file.name}</strong>
                    <span>{prettySize(file.size)}</span>
                  </div>
                </div>
                <button className="remove-file" onClick={() => removeFile(file)}>
                  Remove
                </button>
              </div>
            );
          })
        ) : (
          <div className="file-placeholder">No files uploaded yet.</div>
        )}
      </div>

      <button className="primary-action run-btn" onClick={onAnalyze} disabled={loading || !files.length}>
        <Play size={18} />
        {loading ? 'Analyzing files...' : 'Run Analysis'}
      </button>
    </div>
  );
}
