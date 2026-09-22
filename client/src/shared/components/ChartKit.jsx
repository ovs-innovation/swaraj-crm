import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './ChartKit.css';

export const SWARAJ_RED = '#0078D4';
export const SWARAJ_GOLD = '#1B365D';

export const tick = { fill: '#6a625a', fontSize: 12, fontWeight: 600 };
export const gridProps = {
  stroke: '#efe8e2',
  vertical: false,
  strokeDasharray: '3 6',
};
export const chartMargin = { top: 12, right: 12, left: 4, bottom: 8 };

export const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN');

const shortLabel = (v) => {
  const s = String(v || '');
  return s.length > 12 ? `${s.slice(0, 11)}…` : s;
};

export const ChartTip = ({ active, payload, label, valueKey }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <span>{label}</span>
      {payload.map((item) => (
        <strong key={item.dataKey}>
          {fmtNum(item.value)}
          {item.name && item.name !== item.dataKey ? <em> {item.name}</em> : null}
        </strong>
      ))}
    </div>
  );
};

export const ChartEmpty = ({ text = 'No chart data yet' }) => (
  <div className="chart-empty">{text}</div>
);

export const BrandBarChart = ({ data, xKey = 'name', yKey = 'count', height = 280, horizontal = false }) => {
  if (!data?.length) return <ChartEmpty />;
  const layout = horizontal ? 'vertical' : 'horizontal';
  return (
    <div className="chart-shell" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={layout} margin={chartMargin} barCategoryGap="22%">
          <defs>
            <linearGradient id="swarajBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4aa3e8" />
              <stop offset="100%" stopColor="#0078D4" />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={tick} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey={xKey} tick={{ ...tick, fontSize: 11 }} axisLine={false} tickLine={false} width={92} tickFormatter={shortLabel} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={tick} axisLine={false} tickLine={false} interval={0} tickFormatter={shortLabel} height={42} />
              <YAxis tick={tick} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
            </>
          )}
          <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(0, 120, 212, 0.08)' }} />
          <Bar dataKey={yKey} fill="url(#swarajBar)" maxBarSize={horizontal ? 22 : 36} radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const BrandAreaChart = ({ data, xKey = 'date', yKey = 'visits', height = 280, color = SWARAJ_RED, fillId = 'visitsFill' }) => {
  if (!data?.length) return <ChartEmpty />;
  return (
    <div className="chart-shell" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={chartMargin}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey={xKey} tick={tick} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis tick={tick} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
          <Tooltip content={<ChartTip />} />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={color}
            strokeWidth={2.4}
            fill={`url(#${fillId})`}
            dot={{ r: 3, fill: '#fff', stroke: color, strokeWidth: 2 }}
            activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
