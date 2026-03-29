'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#20c997', '#ff6b81', '#7c5cff', '#2f80ed', '#f7b731', '#5ce1e6'];

export default function DashboardCharts({ report }) {
  return (
    <section className="charts-grid">
      <div className="chart-card glass">
        <div className="chart-head">
          <div>
            <p className="eyebrow">Overall risk</p>
            <h3>Flagged vs clear rows</h3>
          </div>
        </div>
        <div className="chart-frame">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={report.charts.gauge} dataKey="value" nameKey="name" innerRadius={76} outerRadius={108} paddingAngle={4}>
                {report.charts.gauge.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card glass">
        <div className="chart-head">
          <div>
            <p className="eyebrow">By file</p>
            <h3>Flagged records</h3>
          </div>
        </div>
        <div className="chart-frame">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={report.charts.byFile}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
              <XAxis dataKey="name" stroke="#8f9bb8" tickLine={false} axisLine={false} />
              <YAxis stroke="#8f9bb8" tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="flagged" radius={[8, 8, 0, 0]} fill="#20c997" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card glass full-span">
        <div className="chart-head">
          <div>
            <p className="eyebrow">Why rows were flagged</p>
            <h3>Suspicious pattern counts</h3>
          </div>
        </div>
        <div className="chart-frame">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report.charts.reasons}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
              <XAxis dataKey="name" stroke="#8f9bb8" tickLine={false} axisLine={false} />
              <YAxis stroke="#8f9bb8" tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#7c5cff" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
