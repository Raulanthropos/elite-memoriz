import { Globe } from 'lucide-react';
import type { PublicLanguage } from '../lib/publicLanguage';

type PublicLanguageToggleProps = {
  language: PublicLanguage;
  onChange: (language: PublicLanguage) => void;
};

export const PublicLanguageToggle = ({ language, onChange }: PublicLanguageToggleProps) => {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/95 px-2 py-2 shadow-sm backdrop-blur">
      <Globe size={16} className="text-stone-500" />
      <div className="flex items-center rounded-full bg-stone-100 p-1">
        <button
          type="button"
          onClick={() => onChange('el')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
            language === 'el' ? 'bg-stone-950 text-white' : 'text-stone-600 hover:text-stone-950'
          }`}
        >
          EL
        </button>
        <button
          type="button"
          onClick={() => onChange('en')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
            language === 'en' ? 'bg-stone-950 text-white' : 'text-stone-600 hover:text-stone-950'
          }`}
        >
          EN
        </button>
      </div>
    </div>
  );
};
