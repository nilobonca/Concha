import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { SafeIcon } from '@/components/common/SafeIcon';
import { useVaultStore } from '../hooks/useVaultStore';

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

  // Timer de segurança de 12s para evitar qualquer travamento permanente em caso de cancelamento/erro
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      finishEnteringVault();
    }, 12000);
    return () => clearTimeout(timer);
  }, [isVisible, finishEnteringVault]);

  const displayName = enteringVaultName || (vaultName && vaultName !== 'default-vault' ? vaultName : 'Vault');

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="vault-loading-bottom-modal"
          initial={{ opacity: 0, y: 32, x: '-50%', scale: 0.94 }}
          animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
          exit={{ opacity: 0, y: 24, x: '-50%', scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="fixed bottom-6 left-1/2 z-[99999] pointer-events-auto select-none max-w-sm w-[92vw] sm:w-auto"
        >
          {/* Double-Bezel Outer Shell */}
          <div className="p-1 rounded-2xl bg-black/10 dark:bg-white/[0.08] backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-2xl shadow-blue-950/30 dark:shadow-black/60">
            {/* Double-Bezel Inner Core */}
            <div className="relative overflow-hidden rounded-xl px-4 py-3 bg-white/95 dark:bg-[#131524]/95 text-stone-900 dark:text-[#F4F0E6] border border-black/5 dark:border-white/5 flex items-center gap-3.5 shadow-inner">
              {/* Shimmer beam on top edge */}
              <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden bg-black/5 dark:bg-white/10">
                <motion.div
                  className="h-full w-1/3 bg-linear-to-r from-transparent via-[#7F95FF] to-transparent"
                  animate={{ x: ['-100%', '350%'] }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                />
              </div>

              {/* Icon with orbital pulse */}
              <div className="relative flex items-center justify-center shrink-0">
                <div className="w-9 h-9 rounded-xl bg-[#1831D7]/15 dark:bg-[#7F95FF]/20 text-[#1831D7] dark:text-[#7F95FF] border border-[#1831D7]/20 dark:border-[#7F95FF]/30 flex items-center justify-center shadow-xs">
                  <SafeIcon size={16} />
                </div>
                <div className="absolute -inset-1 rounded-2xl border border-[#7F95FF]/50 border-t-transparent animate-spin pointer-events-none" />
              </div>

              {/* Text Information */}
              <div className="flex flex-col min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold tracking-tight text-stone-900 dark:text-white truncate max-w-[200px] sm:max-w-[240px]">
                    Carregando {displayName}
                  </h4>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#7F95FF] animate-ping shrink-0" />
                </div>
                <p className="text-[11px] text-stone-500 dark:text-[#B4D3F1]/80 truncate">
                  Sincronizando notas, canvas e wikilinks...
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
