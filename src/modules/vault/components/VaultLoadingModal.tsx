import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { SafeIcon } from '@/components/common/SafeIcon';
import { useVaultStore } from '../hooks/useVaultStore';
import { Sparkles, ShieldCheck, Database, HardDrive } from 'lucide-react';

const LOADING_STEPS = [
  { title: 'Conectando ao Vault', desc: 'Inicializando o provedor de dados...', icon: HardDrive },
  { title: 'Sincronizando notas & wikilinks', desc: 'Mapeando grafos e conexões locais...', icon: Database },
  { title: 'Indexando pastas & arquivos', desc: 'Organizando estrutura de conhecimento...', icon: ShieldCheck },
  { title: 'Preparando seu workspace', desc: 'Carregando layouts e visualizações...', icon: Sparkles },
];

export const VaultLoadingModal: React.FC = () => {
  const router = useRouter();
  const isEnteringVault = useVaultStore((s) => s.isEnteringVault);
  const enteringVaultName = useVaultStore((s) => s.enteringVaultName);
  const vaultName = useVaultStore((s) => s.vaultName);
  const isLoading = useVaultStore((s) => s.isLoading);
  const finishEnteringVault = useVaultStore((s) => s.finishEnteringVault);

  // Visível se o usuário clicou para entrar no vault OU se está em /vault e a inicialização ainda está rodando
  const isVaultPage = router.pathname === '/vault';
  const isVisible = isEnteringVault || (isVaultPage && isLoading);

  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(18);

  // Timer de segurança e atualização dinâmica de progresso/passos
  useEffect(() => {
    if (!isVisible) {
      setStepIndex(0);
      setProgress(18);
      return;
    }

    // Safety timeout para evitar travamento
    const safetyTimer = setTimeout(() => {
      finishEnteringVault();
    }, 12000);

    // Ciclo suave dos textos informativos
    const stepInterval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1200);

    // Progresso fluido até ~94% enquanto carrega
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 94) return 94;
        return prev + Math.floor(Math.random() * 7 + 3);
      });
    }, 300);

    return () => {
      clearTimeout(safetyTimer);
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [isVisible, finishEnteringVault]);

  const displayName = enteringVaultName || (vaultName && vaultName !== 'default-vault' ? vaultName : 'Vault');
  const currentStep = LOADING_STEPS[stepIndex];
  const CurrentStepIcon = currentStep.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Cortina suave de fundo (Backdrop Blur Glass) */}
          <motion.div
            key="vault-loading-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-[99990] bg-black/40 dark:bg-black/65 backdrop-blur-md pointer-events-auto"
          />

          {/* Modal Central HUD Elevado */}
          <motion.div
            key="vault-loading-modal-hud"
            initial={{ opacity: 0, scale: 0.92, y: '-45%', x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: '-55%', x: '-50%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="fixed top-1/2 left-1/2 z-[99999] pointer-events-auto select-none w-[92vw] max-w-sm sm:max-w-md"
          >
            {/* Ambient Aura Glow */}
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-600/30 via-indigo-500/25 to-purple-600/30 blur-2xl opacity-70 animate-pulse pointer-events-none" />

            {/* Outer Shell (Double-Bezel) */}
            <div className="relative overflow-hidden rounded-2xl p-1 bg-black/20 dark:bg-white/[0.08] backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl shadow-blue-950/40 dark:shadow-black/90">
              
              {/* Shimmer Edge Beam */}
              <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden bg-white/10 z-20">
                <motion.div
                  className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#7F95FF] to-transparent"
                  animate={{ x: ['-100%', '350%'] }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                />
              </div>

              {/* Inner Core Content */}
              <div className="relative rounded-xl p-5 sm:p-6 bg-white/95 dark:bg-[#111322]/95 text-stone-900 dark:text-[#F4F0E6] border border-black/5 dark:border-white/5 flex flex-col gap-4 sm:gap-5 shadow-inner">
                
                {/* Header Row: Icon Orbit & Live Badge */}
                <div className="flex items-center justify-between">
                  {/* Icon With Double Orbital Ring */}
                  <div className="relative flex items-center justify-center">
                    {/* Outer Dashed Spinning Ring */}
                    <div className="absolute -inset-2.5 rounded-2xl border border-dashed border-[#7F95FF]/40 animate-[spin_10s_linear_infinite] pointer-events-none" />
                    
                    {/* Inner Spinning Counter Pulse */}
                    <div className="absolute -inset-1 rounded-xl border border-[#7F95FF]/60 border-t-transparent animate-spin pointer-events-none" />

                    {/* Glowing Icon Square */}
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#1831D7]/20 via-[#7F95FF]/15 to-purple-500/10 dark:from-[#7F95FF]/25 dark:to-indigo-900/40 text-[#1831D7] dark:text-[#7F95FF] border border-[#1831D7]/30 dark:border-[#7F95FF]/40 flex items-center justify-center shadow-lg shadow-blue-500/10 shrink-0">
                      <SafeIcon size={22} variant="duotone" bodyColor="currentColor" doorColor="#7F95FF" dialColor="currentColor" knobColor="#FFFFFF" handleColor="currentColor" />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 dark:bg-[#7F95FF]/15 border border-blue-500/20 dark:border-[#7F95FF]/30">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7F95FF] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7F95FF]" />
                    </span>
                    <span className="text-[11px] font-semibold tracking-wide uppercase text-blue-600 dark:text-[#9BB1FF]">
                      Sincronizando
                    </span>
                  </div>
                </div>

                {/* Vault Title Details */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 dark:text-[#7F95FF]">
                    Carregando Vault
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-stone-900 dark:text-white truncate">
                    {displayName}
                  </h3>
                </div>

                {/* Animated Micro-step Transition Box */}
                <div className="min-h-[48px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-stone-100/90 dark:bg-white/[0.04] border border-stone-200/80 dark:border-white/[0.08]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep.title}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3 w-full"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-500/10 dark:bg-[#7F95FF]/20 text-[#1831D7] dark:text-[#7F95FF] shrink-0">
                        <CurrentStepIcon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-semibold text-stone-800 dark:text-stone-100 truncate">
                          {currentStep.title}
                        </span>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                          {currentStep.desc}
                        </span>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Progress Bar & Percentage */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-[11px] font-medium text-stone-500 dark:text-stone-400">
                    <span>Progresso do ambiente</span>
                    <span className="font-mono font-semibold text-stone-700 dark:text-stone-200">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-stone-200 dark:bg-white/10 overflow-hidden relative">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 rounded-full"
                      initial={{ width: '15%' }}
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: 'easeOut', duration: 0.3 }}
                    />
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
