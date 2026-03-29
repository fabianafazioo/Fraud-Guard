export default function SummarySection({ report }) {
  return (
    <section className="summary-layout">
      <div className="summary-card glass">
        <p className="eyebrow">Executive summary</p>
        <h3>What the system found</h3>
        <p className="summary-text">{report.narrativeSummary}</p>

        <div className="area-list">
          {report.suspiciousAreas.map((item) => (
            <div className="area-item" key={`${item.area}-${item.fileName}`}>
              <div>
                <strong>{item.area}</strong>
                <span>{item.fileName}</span>
              </div>
              <p>{item.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="summary-card glass">
        <p className="eyebrow">File breakdown</p>
        <h3>Where the strongest fraud signals appeared</h3>
        <div className="breakdown-list">
          {report.fileSummaries.map((file) => (
            <div className="breakdown-row" key={file.fileName}>
              <div>
                <strong>{file.fileName}</strong>
                <span>{file.area}</span>
              </div>
              <div className="breakdown-right">
                <strong>{file.flaggedCount} flagged</strong>
                <span>{file.flaggedPercent}% of rows</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
