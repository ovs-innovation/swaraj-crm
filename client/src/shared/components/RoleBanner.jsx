import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import './RoleBanner.css';

const RoleBanner = ({ extra = '' }) => {
  const { user, isSuperAdmin, isHqAdmin, isAreaManager } = useAuth();
  const { t } = useLang();
  const tone = isSuperAdmin ? 'sa' : isHqAdmin ? 'ho' : isAreaManager ? 'am' : 'dl';
  const roleName = t(`roles.${user?.role || 'dealer'}`);

  return (
    <div className={`role-banner role-banner-${tone}`}>
      <strong>{roleName}</strong>
      <span>{user?.name}{extra ? ` · ${extra}` : ''}</span>
    </div>
  );
};

export default RoleBanner;
