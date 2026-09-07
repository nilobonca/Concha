import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Download, CheckCircle2, AlertCircle, X, ArrowUpCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { ConchaLogo } from '@/components/common/ConchaLogo';
import { useAppUpdateStore } from '@/store/useAppUpdateStore';

export const AppUpdateToast: React.FC = () => {
  const {
    status,
    availableVersion,
    percent,
    speed,
    errorMessage,
    isPromptVisible,
    startDownload,
    quitAndInstall,
    dismissPrompt,
    openReleasePage,
    isElectron
  } = useAppUpdateStore();

  // If not running in Electron or prompt is closed or idle, do not render
  if (!isElectron || !isPromptVisible || status === 'idle' || status === 'not-available') {
    return null;
  }

  // Format download speed into human readable string
  const formattedSpeed = speed > 0
    ? speed > 1024 * 1024
      ? `${(speed / (1024 * 1024)).toFixed(1)} MB/s`
      : `${Math.round(speed / 1024)} KB/s`
    : '';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 35, x: -20, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
        exit={{ opacity: 0, y: 25, x: -15, scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="fixed bottom-5 left-5 z-[99999] max-w-sm w-full select-none pointer-events-auto"
      >
        <div className="bg-[#17192A]/95 dark:bg-[#131524]/95 text-[#F4F0E6] backdrop-blur-2xl border border-[#7F95FF]/20 rounded-2xl shadow-2xl p-4.5 overflow-hidden relative shadow-blue-950/40">
          {/* Subtle accent glow line on top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-brand-gradient-h" />

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#1831D7]/20 text-[#7F95FF] border border-[#7F95FF]/30 shrink-0 mt-0.5 shadow-xs">
                {status === 'downloaded' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : status === 'downloading' ? (
                  <Download className="w-5 h-5 text-[#7F95FF] animate-bounce" />
                ) : status === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                ) : status === 'checking' ? (
                  <RefreshCw className="w-5 h-5 text-[#7F95FF] animate-spin" />
                ) : (
                  <ConchaLogo className="w-5 h-5" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold tracking-tight text-white">
                    {status === 'available' && 'Atualização do Concha'}
                    {status === 'downloading' && 'Baixando Atualização...'}
                    {status === 'downloaded' && 'Atualização Pronta!'}
                    {status === 'error' && 'Falha na Atualização'}
                    {status === 'checking' && 'Verificando...'}
                  </h4>
                  {availableVersion && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[#1831D7]/25 border border-[#7F95FF]/30 text-[#B4D3F1]">
                      v{availableVersion}
                    </span>
                  )}
                </div>

                <p className="text-xs text-stone-300/90 leading-relaxed">
                  {status === 'available' &&
                    `Uma nova versão está disponível. Deseja atualizar o aplicativo agora?`}
                  {status === 'downloading' &&
                    `${percent}% baixado ${formattedSpeed ? `(${formattedSpeed})` : ''} em segundo plano.`}
                  {status === 'downloaded' &&
                    'A nova versão foi baixada em segundo plano. Ela será aplicada silenciosamente ao fechar o Concha, ou você pode reiniciar agora.'}
                  {status === 'error' &&
                    (errorMessage || 'Ocorreu um erro ao buscar ou baixar a atualização.')}
                  {status === 'checking' &&
                    'Consultando repositório por novas versões...'}
                </p>
              </div>
            </div>

            <button
              onClick={dismissPrompt}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Download Progress Bar */}
          {status === 'downloading' && (
            <div className="mt-3.5 space-y-1.5">
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden p-0.5">
                <motion.div
                  className="bg-brand-gradient-h h-full rounded-full shadow-sm"
                  initial={{ width: '2%' }}
                  animate={{ width: `${Math.max(percent, 5)}%` }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-stone-400 font-mono">
                <span>Progresso</span>
                <span>{percent}%</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-3.5 flex items-center justify-end gap-2 pt-1 border-t border-white/10">
            {status === 'available' && (
              <>
                <button
                  onClick={dismissPrompt}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Mais Tarde
                </button>
                <button
                  onClick={startDownload}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1831D7] hover:bg-[#1831D7]/90 text-[#F4F0E6] shadow-lg shadow-[#1831D7]/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download className="w-3.5 h-3.5" />
                  Atualizar Agora
                </button>
              </>
            )}

            {status === 'downloading' && (
              <button
                onClick={dismissPrompt}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Ocultar (Baixar em 2º plano)
              </button>
            )}

            {status === 'downloaded' && (
              <>
                <button
                  onClick={dismissPrompt}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Atualizar silenciosamente ao fechar o Concha"
                >
                  Ao Fechar
                </button>
                <button
                  onClick={quitAndInstall}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  title="Reinicia o aplicativo e aplica a atualização sem instalador"
                >
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                  Reiniciar Agora
                </button>
              </>
            )}

            {status === 'error' && (
              <>
                <button
                  onClick={openReleasePage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Abrir página de download da versão no GitHub"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Baixar pelo GitHub
                </button>
                <button
                  onClick={() => useAppUpdateStore.getState().checkForUpdates(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1831D7] hover:bg-[#1831D7]/90 text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tentar Novamente
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
