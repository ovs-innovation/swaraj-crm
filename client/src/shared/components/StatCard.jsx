import './StatCard.css';

const StatCard = ({ title, value, icon: Icon, color = 'primary' }) => (
  <div className={`stat-card stat-${color}`}>
    <div className="stat-info">
      <span className="stat-title">{title}</span>
      <span className="stat-value">{value ?? 0}</span>
    </div>
    {Icon && (
      <div className="stat-icon">
        <Icon size={24} />
      </div>
    )}
  </div>
);

export default StatCard;
