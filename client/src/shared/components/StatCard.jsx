import './StatCard.css';
import { fmtNum } from './ChartKit';

const StatCard = ({ title, value, icon: Icon, tone = 'plain' }) => (
  <div className={`metric metric-${tone}`}>
    <div>
      <span className="metric-k">{title}</span>
      <span className="metric-v">{fmtNum(value)}</span>
    </div>
    {Icon && (
      <span className="metric-i">
        <Icon size={18} strokeWidth={1.75} />
      </span>
    )}
  </div>
);

export default StatCard;
