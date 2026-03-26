export default function MetricCards({ report }) {
  const metrics = [
    {
      label: 'Estimated Fraud %',
      value: `${report.fraudPercent}%`,
      note: report.riskLevel,
      tone: report.fraudPercent >= 20 ? 'red' : 'green'
    },
    {
      label: 'Suspicious Records',
      value: report.suspiciousRows,
      note: `${report.totalRows} total rows reviewed`,
      tone: 'yellow'
    },
    {
      label: 'Files / Sheets Analyzed',
      value: report.sheetsAnalyzed,
      note: 'Structured anomaly screening',
      tone: 'blue'
    },
    {
      label: 'Clear Records %',
      value: `${report.safePercent}%`,
      note: 'Not flagged by the rule engine',
      tone: 'green'
    }
  ];

  return (
    <div className="metrics-grid">
      {metrics.map((metric) => (
        <div className="card metric-card" key={metric.label}>
          <div className="metric-label">{metric.label}</div>
          <div className={`metric-value ${metric.tone}`}>{metric.value}</div>
          <div className="metric-trend">{metric.note}</div>
        </div>
      ))}
    </div>
  );
}
