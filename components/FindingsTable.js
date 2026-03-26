function renderValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function FindingsTable({ report }) {
  return (
    <div className="card table-card">
      <div className="section-title">
        <div>
          <h3>Top Flagged Records</h3>
          <p className="helper">The strongest suspicious patterns found by the analyzer</p>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Anomaly Score</th>
              <th>Reasons</th>
              <th>Preview</th>
            </tr>
          </thead>
          <tbody>
            {report.topFindings.length ? (
              report.topFindings.map((finding, index) => (
                <tr key={`${finding.source}-${index}`}>
                  <td>{finding.source}</td>
                  <td>{finding.anomalyScore}</td>
                  <td>{finding.reasons.join(', ')}</td>
                  <td>
                    {Object.entries(finding.preview)
                      .slice(0, 4)
                      .map(([key, value]) => `${key}: ${renderValue(value)}`)
                      .join(' | ')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>No suspicious records were strong enough to be shown in the table.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
