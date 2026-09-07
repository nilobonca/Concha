import React from 'react';
import clsx from 'clsx';
import { RefreshCw, Sparkles, CheckCircle2, Download, ArrowUpCircle, AlertCircle, Laptop, ExternalLink } from 'lucide-react';
import { ConchaLogo } from '@/components/common/ConchaLogo';
import { useAppUpdateStore } from '@/store/useAppUpdateStore';
import { useThemeStore } from '@/store/themeStore';

export const AppUpdateSettingsSection: React.FC = () => {
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  const {
    status,
    currentVersion,
    availableVersion,
    percent,
    isChecking,
    errorMessage,
    checkForUpdates,
    startDownload,
    quitAndInstall,
    openPrompt,
    openReleasePage,
    isElectron
  } = useAppUpdateStore();

  const handleCheck = () => {
    checkForUpdates(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className={clsx("text-sm font-semibold tracking-wide uppercase", isLight ? "text-stone-500" : "text-neutral-400")}>
          Versão & Atualizações do App
        </h3>
        {currentVersion && (
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#1831D7]/15 border border-[#7F95FF]/30 text-[#1831D7] dark:text-[#7F95FF] font-semibold">
            v{currentVersion}
          </span>
        )}
      </div>

      <div className={clsx(
        "p-5 border transition-all duration-300",
        isLight
          ? "border-[#1831D7]/15 bg-white/70 rounded-xl"
          : "border-[#7F95FF]/15 bg-[#17192A]/60 rounded-xl"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ConchaLogo className="w-4 h-4" theme={theme} />
              <h4 className={clsx("font-semibold text-sm", isLight ? "text-[#17192A]" : "text-[#F4F0E6]")}>
                Concha Desktop
              </h4>
              {isElectron && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1831D7]/20 text-[#7F95FF] border border-[#7F95FF]/30">
                  Instalado
                </span>
              )}
            </div>
            <p className={clsx("text-xs leading-relaxed", isLight ? "text-[#17192A]/70" : "text-[#B4D3F1]/80")}>
              {status === 'idle' && 'O aplicativo verifica novas versões automaticamente ao iniciar.'}
              {status === 'checking' && 'Buscando atualizações no repositório...'}
              {status === 'available' && `A versão v${availableVersion || ''} está disponível para download.`}
              {status === 'downloading' && `Baixando atualização em segundo plano (${percent}% concluído)...`}
              {status === 'downloaded' && 'Atualização pronta! Reinicie o aplicativo para aplicar silenciosamente.'}
              {status === 'not-available' && 'Você já está usando a versão mais recente do Concha.'}
              {status === 'error' && (errorMessage || 'Não foi possível verificar atualizações.')}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {status === 'available' ? (
              <button
                onClick={() => {
                  startDownload();
                  openPrompt();
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#1831D7] hover:bg-[#1831D7]/90 text-[#F4F0E6] shadow-lg shadow-[#1831D7]/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                Baixar v{availableVersion}
              </button>
            ) : status === 'downloaded' ? (
              <button
                onClick={quitAndInstall}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                title="Reiniciar e aplicar silenciosamente em segundo plano"
              >
                <ArrowUpCircle className="w-4 h-4" />
                Reiniciar Agora
              </button>
            ) : (
              <button
                onClick={handleCheck}
                disabled={isChecking}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer",
                  isChecking
                    ? "opacity-60 cursor-not-allowed bg-stone-300 dark:bg-[#131524] text-stone-600 dark:text-neutral-400"
                    : isLight
                    ? "bg-[#1831D7]/10 hover:bg-[#1831D7]/20 text-[#17192A]"
                    : "bg-[#7F95FF]/10 hover:bg-[#7F95FF]/20 text-[#F4F0E6]"
                )}
              >
                <RefreshCw className={clsx("w-4 h-4", isChecking && "animate-spin")} />
                {isChecking ? 'Verificando...' : 'Verificar Atualizações'}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar during download */}
        {status === 'downloading' && (
          <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="bg-brand-gradient-h h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(percent, 4)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-stone-400 font-mono">
              <span>Baixando pacote de instalação</span>
              <span>{percent}%</span>
            </div>
          </div>
        )}

        {/* Status indicator badges */}
        {status === 'not-available' && (
          <div className="mt-3 pt-3 border-t border-stone-200 dark:border-white/10 flex items-center gap-2 text-xs text-emerald-500 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Tudo atualizado! Nenhuma versão pendente encontrada.</span>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-3 pt-3 border-t border-stone-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-500 dark:text-rose-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage || 'Falha ao buscar atualizações. Tente novamente mais tarde.'}</span>
            </div>
            <button
              onClick={openReleasePage}
              className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2 text-[#1831D7] dark:text-[#7F95FF] hover:opacity-80 cursor-pointer self-start sm:self-auto shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Baixar pelo GitHub
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
