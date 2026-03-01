import { useTranslation } from 'react-i18next';
import { toggleLanguage } from '../i18n';

interface Props {
  className?: string;
}

export default function LanguageToggle({ className = '' }: Props) {
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all bg-white/15 hover:bg-white/25 text-white border border-white/20 ${className}`}
      title={isHe ? 'Switch to English' : 'עבור לעברית'}
    >
      {isHe ? '🇬🇧 EN' : '🇮🇱 עב'}
    </button>
  );
}
