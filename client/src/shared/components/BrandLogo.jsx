import { useLang } from '../context/LanguageContext';

const BrandLogo = ({ className = '', size = 40, showWordmark = true, light = false }) => {
  const { t } = useLang();
  return (
    <div className={`brand-logo ${light ? 'light' : ''} ${className}`}>
      <img src="/logo.png" alt="Vastora Tech" height={size} style={{ height: size, width: 'auto', maxWidth: size * 2.8 }} />
      {showWordmark && (
        <div className="brand-wordmark">
          <strong>VASTORA</strong>
          <small>{t('brand')}</small>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
