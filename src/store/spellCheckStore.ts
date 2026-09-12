import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setSpellCheckerConfig, addWordToSpellCheckerDictionary } from '@/utils/electronHelper';

export interface SpellCheckLanguage {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_SPELLCHECK_LANGUAGES: SpellCheckLanguage[] = [
  { code: 'pt-BR', name: 'Português (Brasil)', nativeName: 'Português (Brasil)' },
  { code: 'pt-PT', name: 'Português (Portugal)', nativeName: 'Português (Portugal)' },
  { code: 'en-US', name: 'English (US)', nativeName: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)' },
  { code: 'es-ES', name: 'Español', nativeName: 'Español' },
  { code: 'fr-FR', name: 'Français', nativeName: 'Français' },
  { code: 'de-DE', name: 'Deutsch', nativeName: 'Deutsch' },
  { code: 'it-IT', name: 'Italiano', nativeName: 'Italiano' },
];

export interface SpellCheckState {
  enabled: boolean;
  languages: string[];
  // language mantido para retrocompatibilidade de leitura (retorna o idioma principal)
  language: string;
  availableLanguages: SpellCheckLanguage[];
  customDictionary: string[];
  setEnabled: (enabled: boolean) => void;
  setLanguages: (languages: string[]) => void;
  toggleLanguage: (code: string) => void;
  setLanguage: (lang: string) => void;
  toggleEnabled: () => void;
  addWordToDictionary: (word: string) => Promise<boolean>;
  syncWithEnvironment: () => void;
}

export const useSpellCheckStore = create<SpellCheckState>()(
  persist(
    (set, get) => ({
      enabled: true,
      languages: ['pt-BR'],
      language: 'pt-BR',
      availableLanguages: SUPPORTED_SPELLCHECK_LANGUAGES,
      customDictionary: [],

      setEnabled: (enabled: boolean) => {
        set({ enabled });
        get().syncWithEnvironment();
      },

      setLanguages: (languages: string[]) => {
        const valid = languages.length > 0 ? languages : ['pt-BR'];
        set({ languages: valid, language: valid[0] });
        get().syncWithEnvironment();
      },

      toggleLanguage: (code: string) => {
        const current = get().languages;
        let next: string[];
        if (current.includes(code)) {
          // Não permite desmarcar se for o único idioma restante
          if (current.length === 1) return;
          next = current.filter(c => c !== code);
        } else {
          next = [...current, code];
        }
        set({ languages: next, language: next[0] });
        get().syncWithEnvironment();
      },

      setLanguage: (lang: string) => {
        set({ languages: [lang], language: lang });
        get().syncWithEnvironment();
      },

      toggleEnabled: () => {
        const nextEnabled = !get().enabled;
        set({ enabled: nextEnabled });
        get().syncWithEnvironment();
      },

      addWordToDictionary: async (word: string) => {
        const trimmed = word ? word.trim() : '';
        if (!trimmed) return false;

        const currentDict = get().customDictionary;
        if (!currentDict.includes(trimmed)) {
          set({ customDictionary: [...currentDict, trimmed] });
        }

        // Sincroniza com o corretor nativo do Electron se disponível
        try {
          await addWordToSpellCheckerDictionary(trimmed);
        } catch (e) {
          console.warn('[SpellCheckStore] Falha ao adicionar palavra ao Electron:', e);
        }
        return true;
      },

      syncWithEnvironment: () => {
        const { enabled, languages, customDictionary } = get();
        const activeLangs = languages && languages.length > 0 ? languages : ['pt-BR'];

        // 1. Atualiza idioma no HTML para navegadores web
        if (typeof document !== 'undefined') {
          document.documentElement.lang = activeLangs.join(' ');
        }

        // 2. Sincroniza múltiplos idiomas no Electron (session suporta array de BCP 47)
        setSpellCheckerConfig(enabled, activeLangs).catch((err) => {
          console.warn('[SpellCheckStore] Erro ao sincronizar com Electron:', err);
        });

        // 3. Sincroniza palavras do dicionário personalizado salvas no armazenamento
        if (customDictionary && customDictionary.length > 0) {
          for (const word of customDictionary) {
            addWordToSpellCheckerDictionary(word).catch(() => {});
          }
        }
      },
    }),
    {
      name: 'concha-spellcheck-config',
      migrate: (persistedState: any) => {
        if (persistedState) {
          if (!Array.isArray(persistedState.languages)) {
            persistedState.languages = persistedState.language ? [persistedState.language] : ['pt-BR'];
          }
          persistedState.language = persistedState.languages[0] || 'pt-BR';
        }
        return persistedState as SpellCheckState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.syncWithEnvironment();
        }
      },
    }
  )
);

/**
 * Função utilitária para leitura direta das configurações de ortografia
 * Útil para serviços externos, exportadores ou contexto de IA
 */
export const getSpellCheckConfig = () => {
  const state = useSpellCheckStore.getState();
  return {
    enabled: state.enabled,
    languages: state.languages,
    language: state.language,
  };
};
