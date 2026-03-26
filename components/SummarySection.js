export default function SummarySection({ report }) {
  return (
    <div className="summary-grid">
      <div className="card summary-card">
        <div className="section-title">
          <div>
            <h3>Suspicious Activity Summary</h3>
            <p className="helper">Where the model sees the strongest red flags</p>
          </div>
        </div>
        <div className="summary-list">
          <div className="summary-item">
            <h4>Executive Summary</h4>
            <p>{report.narrativeSummary}</p>
          </div>
          {report.suspiciousAreas.length ? (
            report.suspiciousAreas.map((area) => (
              <div className="summary-item" key={`${area.area}-${area.note}`}>
                <h4>{area.area}</h4>
                <p>{area.note}</p>
              </div>
            ))
          ) : (
            <div className="summary-item">
              <h4>No strong area pattern found</h4>
              <p>The uploaded files did not clearly match a specific financial area, but unusual rows were still checked for outliers and fraud indicators.</p>
            </div>
          )}
        </div>
      </div>

      <div className="card summary-card">
        <div className="section-title">
          <div>
            <h3>Result Breakdown</h3>
            <p className="helper">Simple dashboard metrics for decision-makers</p>
          </div>
        </div>
        <div className="breakdown">
          {report.sheetSummaries.map((sheet) => (
            <div className="breakdown-item" key={sheet.sheetName}>
              <span>{sheet.sheetName}</span>
              <strong>{sheet.suspiciousCount} flagged</strong>
            </div>
          ))}
        </div>
        <p className="footer-note">
          This website gives an anomaly score, not a legal finding of fraud. It is a screening tool designed to help auditors and analysts review high-risk records faster.
        </p>
      </div>
    </div>
  );
}
