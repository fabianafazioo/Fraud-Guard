export default function MetricCards({ report }) {
  const cards = [
    { label: 'Fraud Probability', value: `${report.fraudPercent}%`, note: report.riskLevel, tone: report.riskTone },
    { label: 'Flagged Records', value: report.flaggedRecords, note: `${report.totalRows} total rows reviewed`, tone: 'warn' },
    { label: 'Files Reviewed', value: report.filesAnalyzed, note: 'Actual file names preserved', tone: 'cool' },
    { label: 'Most Affected Area', value: report.primaryArea || 'General review', note: 'Highest concentration of risk', tone: 'soft' }
  ];

  return (
    <section className="metric-grid">
      {cards.map((card) => (
        <div className={`metric-card glass ${card.tone}`} key={card.label}>
          <p>{card.label}</p>
          <h3>{card.value}</h3>
          <span>{card.note}</span>
        </div>
      ))}
    </section>
  );
}
