import { useLang } from '../context/LanguageContext';

const LangSwitch = ({ light = false }) => {
  const { lang, setLang } = useLang();
  return (
    <div className={`lang-switch ${light ? 'light' : ''}`} role="group" aria-label="Language">
      <button type="button" className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>
        EN
      </button>
      <button type="button" className={lang === 'hi' ? 'on' : ''} onClick={() => setLang('hi')}>
        हिं
      </button>
    </div>
  );
};

export default LangSwitch;
