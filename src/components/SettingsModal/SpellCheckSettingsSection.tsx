import React from 'react';
import { useSpellCheckStore } from '@/store/spellCheckStore';
import { useThemeStore } from '@/store/themeStore';
import { SpellCheck, Languages, Check, Info, Globe, Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface SpellCheckSettingsSectionProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const SpellCheckSettingsSection: React.FC<SpellCheckSettingsSectionProps> = ({
  className,
  variant = 'full',
}) => {
  const {
    enabled,
    languages,
    availableLanguages,
    setLanguages,
    toggleLanguage,
    toggleEnabled,
  } = useSpellCheckStore();
  const theme = useThemeStore(state => state.theme);
  const isLight = theme === 'light';

  const activeLanguages = languages && languages.length > 0 ? languages : ['pt-BR'];

  const handlePreset = (presetLangs: string[]) => {
    setLanguages(presetLangs);
  };

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={clsx(
            "p-1.5 rounded-lg",
            isLight ? "bg-stone-100 text-stone-700" : "bg-white/5 text-[#7F95FF]"
          )}>
            <SpellCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className={clsx(
              "text-sm font-semibold tracking-wide uppercase",
              isLight ? "text-stone-700" : "text-[#B4D3F1]/80"
            )}>
              Ortografia & Idiomas de Escrita
            </h3>
          </div>
        </div>

        {/* Badge de Status Geral */}
        <span className={clsx(
          "text-[11px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5 transition-colors",
          enabled
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            : (isLight ? "bg-stone-100 text-stone-500 border border-stone-200" : "bg-white/5 text-neutral-400 border border-white/10")
        )}>
          <span className={clsx("w-1.5 h-1.5 rounded-full", enabled ? "bg-emerald-500 animate-pulse" : "bg-stone-400 dark:bg-neutral-600")} />
          {enabled ? `${activeLanguages.length} ${activeLanguages.length === 1 ? 'idioma' : 'idiomas'} (${activeLanguages.join(', ')})` : 'Desativada'}
        </span>
      </div>

      {/* Card 1: Toggle Principal de Verificação Ortográfica */}
      <div className={clsx(
        "p-4 border transition-all rounded-xl",
        isLight
          ? "border-stone-200 bg-stone-50/70"
          : "border-[#7F95FF]/15 bg-[#17192A]/50"
      )}>
        <div className="flex items-center justify-between gap-4">
          <div className="pr-2">
            <h4 className={clsx("font-medium text-sm flex items-center gap-2", isLight ? "text-stone-800" : "text-[#F4F0E6]")}>
              <span>Verificação Ortográfica Contínua</span>
            </h4>
            <p className={clsx("text-xs mt-1 leading-relaxed", isLight ? "text-stone-600 font-medium" : "text-neutral-400")}>
              Sublinha palavras desconhecidas e oferece sugestões rápidas no menu do próprio app (botão direito). Ao desativar, toda a checagem é completamente silenciada no Vault e Canvas.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={toggleEnabled}
            className={clsx(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#7F95FF] focus:ring-offset-2",
              enabled
                ? "bg-[#1831D7] dark:bg-[#7F95FF]"
                : (isLight ? "bg-stone-300" : "bg-neutral-700")
            )}
            title={enabled ? "Desativar verificação ortográfica" : "Ativar verificação ortográfica"}
          >
            <span
              className={clsx(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                enabled ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>
      </div>

      {/* Card 2: Seletor Multi-idioma de Escrita */}
      <div className={clsx(
        "p-4 border transition-all rounded-xl",
        !enabled && "opacity-50 pointer-events-none",
        isLight
          ? "border-stone-200 bg-stone-50/70"
          : "border-[#7F95FF]/15 bg-[#17192A]/50"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#7F95FF]" />
              <h4 className={clsx("font-medium text-sm", isLight ? "text-stone-800" : "text-[#F4F0E6]")}>
                Idiomas Simultâneos de Escrita
              </h4>
            </div>
            <p className={clsx("text-xs mt-0.5", isLight ? "text-stone-600" : "text-neutral-400")}>
              Selecione um ou mais idiomas ativos. O corretor reconhece múltiplos idiomas ao mesmo tempo sem marcar falsos erros.
            </p>
          </div>

          {/* Atalhos rápidos / Presets */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handlePreset(['pt-BR', 'en-US'])}
              disabled={!enabled}
              className={clsx(
                "text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer",
                activeLanguages.includes('pt-BR') && activeLanguages.includes('en-US') && activeLanguages.length === 2
                  ? (isLight ? "bg-[#1831D7] text-white border-[#1831D7]" : "bg-[#7F95FF] text-black font-semibold border-[#7F95FF]")
                  : (isLight ? "bg-white border-stone-200 hover:bg-stone-100 text-stone-700" : "bg-white/5 border-white/10 hover:bg-white/10 text-neutral-300")
              )}
            >
              PT + EN
            </button>
            <button
              type="button"
              onClick={() => handlePreset(['pt-BR'])}
              disabled={!enabled}
              className={clsx(
                "text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer",
                activeLanguages.length === 1 && activeLanguages[0] === 'pt-BR'
                  ? (isLight ? "bg-[#1831D7] text-white border-[#1831D7]" : "bg-[#7F95FF] text-black font-semibold border-[#7F95FF]")
                  : (isLight ? "bg-white border-stone-200 hover:bg-stone-100 text-stone-700" : "bg-white/5 border-white/10 hover:bg-white/10 text-neutral-300")
              )}
            >
              Só PT
            </button>
            <button
              type="button"
              onClick={() => handlePreset(['en-US'])}
              disabled={!enabled}
              className={clsx(
                "text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer",
                activeLanguages.length === 1 && activeLanguages[0] === 'en-US'
                  ? (isLight ? "bg-[#1831D7] text-white border-[#1831D7]" : "bg-[#7F95FF] text-black font-semibold border-[#7F95FF]")
                  : (isLight ? "bg-white border-stone-200 hover:bg-stone-100 text-stone-700" : "bg-white/5 border-white/10 hover:bg-white/10 text-neutral-300")
              )}
            >
              Só EN
            </button>
          </div>
        </div>

        {/* Grade de Seleção Múltipla de Idiomas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-200/60 dark:border-white/5">
          {availableLanguages.map((lang) => {
            const isSelected = activeLanguages.includes(lang.code);
            const isOnlyOneSelected = isSelected && activeLanguages.length === 1;

            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => toggleLanguage(lang.code)}
                disabled={!enabled || isOnlyOneSelected}
                title={isOnlyOneSelected ? "Ao menos um idioma deve permanecer selecionado" : `Clique para ${isSelected ? 'remover' : 'adicionar'} ${lang.name}`}
                className={clsx(
                  "flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition-all border select-none",
                  isOnlyOneSelected ? "cursor-not-allowed opacity-90" : "cursor-pointer",
                  isSelected
                    ? (isLight
                        ? "bg-white border-[#1831D7] text-[#1831D7] font-semibold shadow-2xs"
                        : "bg-[#7F95FF]/15 border-[#7F95FF]/60 text-[#7F95FF] font-semibold shadow-2xs")
                    : (isLight
                        ? "bg-white/60 border-stone-200 hover:bg-white text-stone-700 hover:border-stone-300"
                        : "bg-white/[0.02] border-white/5 hover:bg-white/5 text-neutral-400 hover:text-neutral-200")
                )}
              >
                <div className="min-w-0 pr-1 truncate">
                  <span className="truncate block font-medium">{lang.nativeName}</span>
                  <span className="text-[10px] font-mono opacity-60 uppercase">{lang.code}</span>
                </div>
                <div className={clsx(
                  "w-4 h-4 rounded flex items-center justify-center shrink-0 ml-1 transition-colors border",
                  isSelected
                    ? "bg-[#1831D7] border-[#1831D7] text-white dark:bg-[#7F95FF] dark:border-[#7F95FF] dark:text-black"
                    : (isLight ? "border-stone-300 bg-white" : "border-white/20 bg-transparent")
                )}>
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dica de Uso e Context Menu Integrado */}
      <div className={clsx(
        "flex items-start gap-2.5 p-3.5 rounded-xl border text-xs leading-relaxed",
        isLight
          ? "bg-blue-50/60 border-blue-200/80 text-blue-900"
          : "bg-[#1831D7]/10 border-[#7F95FF]/20 text-[#B4D3F1]"
      )}>
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#1831D7] dark:text-[#7F95FF]" />
        <div>
          <span className="font-semibold">Menu de sugestões in-app: </span>
          <span>
            Ao clicar com o <strong>botão direito</strong> em qualquer palavra incorreta, o menu do próprio app abrirá imediatamente sugestões ortográficas corretas e a opção <em>&quot;Adicionar ao dicionário&quot;</em>. O menu de contexto nativo do sistema operacional foi desativado em favor da interface do Concha.
          </span>
        </div>
      </div>
    </div>
  );
};
