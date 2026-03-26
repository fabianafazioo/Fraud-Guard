'use client';

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const COLORS = ['#ff5d73', '#48d597', '#6ea8fe', '#ffd166', '#9b7cff', '#39c3ff'];

export default function DashboardCharts({ report }) {
  return (
    <div className="dashboard-grid">
      <div className="card chart-card">
        <div className="section-title">
          <div>
            <h3>Fraud Exposure Score</h3>
            <p className="helper">Suspicious versus clear records across all uploads</p>
          </div>
          <span className="risk-badge">{report.riskLevel}</span>
        </div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={report.charts.fraudGauge} dataKey="value" nameKey="name" innerRadius={78} outerRadius={110} paddingAngle={4}>
                {report.charts.fraudGauge.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card chart-card">
        <div className="section-title">
          <div>
            <h3>Flags by Uploaded File</h3>
            <p className="helper">How many records were flagged inside each upload</p>
          </div>
        </div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={report.charts.bySheet}>
              <XAxis dataKey="name" stroke="#9da7c5" />
              <YAxis stroke="#9da7c5" />
              <Tooltip />
              <Bar dataKey="suspicious" radius={[10, 10, 0, 0]} fill="#48d597" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card chart-card">
        <div className="section-title">
          <div>
            <h3>Why Records Were Flagged</h3>
            <p className="helper">Main suspicious patterns found during analysis</p>
          </div>
        </div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={report.charts.reasons} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" stroke="#9da7c5" />
              <YAxis type="category" dataKey="name" width={110} stroke="#9da7c5" />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 10, 10, 0]} fill="#6ea8fe" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card chart-card">
        <div className="section-title">
          <div>
            <h3>Analysis Summary</h3>
            <p className="helper">A quick executive view of the uploaded evidence</p>
          </div>
        </div>
        <div className="breakdown">
          <div className="breakdown-item"><span>Risk level</span><strong>{report.riskLevel}</strong></div>
          <div className="breakdown-item"><span>Fraud probability</span><strong>{report.fraudPercent}%</strong></div>
          <div className="breakdown-item"><span>Suspicious rows</span><strong>{report.suspiciousRows}</strong></div>
          <div className="breakdown-item"><span>Uploads analyzed</span><strong>{report.sheetsAnalyzed}</strong></div>
        </div>
      </div>
    </div>
  );
}
