function previewEntries(record) {
  return Object.entries(record || {}).slice(0, 6);
}

export default function FindingsPanel({ report }) {
  return (
    <section className="findings-card glass">
      <div className="chart-head">
        <div>
          <p className="eyebrow">Detailed review</p>
          <h3>Where the suspicious activity really is</h3>
        </div>
      </div>

      <div className="finding-list">
        {report.topFindings.length ? (
          report.topFindings.map((item, index) => (
            <article className="finding-item" key={`${item.fileName}-${item.rowNumber}-${index}`}>
              <div className="finding-top">
                <div>
                  <strong>{item.fileName}</strong>
                  <span>Row {item.rowNumber} · {item.area}</span>
                </div>
                <div className="risk-pill">Risk score {item.riskScore}</div>
              </div>
              <p className="finding-reasons">{item.reasons.join(' • ')}</p>
              <div className="preview-grid">
                {previewEntries(item.preview).map(([key, value]) => (
                  <div className="preview-item" key={`${item.fileName}-${item.rowNumber}-${key}`}>
                    <span>{key}</span>
                    <strong>{String(value ?? '—')}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))
        ) : (
          <p className="subtle">No strong suspicious rows were returned.</p>
        )}
      </div>
    </section>
  );
}
