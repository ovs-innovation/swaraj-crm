const BrandLogo = ({ className = '', size = 40, light = false }) => (
  <div className={`brand-logo ${light ? 'light' : ''} ${className}`}>
    <img src="/logo.png" alt="" height={size} style={{ height: size, width: 'auto', maxWidth: size * 3.2 }} />
  </div>
);

export default BrandLogo;
