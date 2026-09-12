import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { 
  isElectron, 
  minimizeWindow, 
  maximizeWindow, 
  closeWindow, 
  isWindowMaximized, 
  subscribeToMaximizedChange 
} from '@/utils/electronHelper';
import clsx from 'clsx';

export interface WindowControlsProps {
  className?: string;
  variant?: 'compact' | 'normal';
}

/**
 * Controles de Janela Customizados Integrados ao App (Minimizar, Maximizar/Restaurar, Fechar)
 * Estilo Minimalista Moderno (Windows 11 / VS Code).
 * Renderiza EXCLUSIVAMENTE quando executado no Electron (.exe).
 */
export const WindowControls: React.FC<WindowControlsProps> = ({
  className,
  variant = 'normal',
}) => {
  const [electronEnv, setElectronEnv] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (isElectron()) {
      setElectronEnv(true);
      // Checa estado inicial de maximizado
      isWindowMaximized().then(setMaximized);
      // Inscreve no listener de mudança de estado da janela
      const unsubscribe = subscribeToMaximizedChange((isMax) => {
        setMaximized(isMax);
      });
      return () => unsubscribe();
    }
  }, []);

  // Se não estiver rodando no Electron, não renderiza nada no navegador web
  if (!electronEnv) return null;

  const buttonSizeClass = variant === 'compact' ? 'h-7 w-7 rounded-md' : 'h-8 w-9 rounded-md';
  const iconSize = variant === 'compact' ? 12 : 13;

  return (
    <div 
      className={clsx(
        "flex items-center gap-0.5 select-none shrink-0 z-50 app-region-no-drag pointer-events-auto",
        className
      )}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Botão Minimizar */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          minimizeWindow();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        data-no-drag="true"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className={clsx(
          buttonSizeClass,
          "app-region-no-drag flex items-center justify-center transition-colors cursor-pointer",
          "text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white",
          "hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 pointer-events-auto"
        )}
        title="Minimizar"
        aria-label="Minimizar janela"
      >
        <Minus size={iconSize} strokeWidth={2} className="pointer-events-none" />
      </button>

      {/* Botão Maximizar / Restaurar */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          maximizeWindow();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        data-no-drag="true"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className={clsx(
          buttonSizeClass,
          "app-region-no-drag flex items-center justify-center transition-colors cursor-pointer",
          "text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white",
          "hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 pointer-events-auto"
        )}
        title={maximized ? "Restaurar" : "Maximizar"}
        aria-label={maximized ? "Restaurar janela" : "Maximizar janela"}
      >
        {maximized ? (
          <Copy size={iconSize - 2} strokeWidth={2} className="rotate-90 pointer-events-none" />
        ) : (
          <Square size={iconSize - 2} strokeWidth={2} className="pointer-events-none" />
        )}
      </button>

      {/* Botão Fechar */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          closeWindow();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        data-no-drag="true"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className={clsx(
          buttonSizeClass,
          "app-region-no-drag flex items-center justify-center transition-colors cursor-pointer",
          "text-stone-500 dark:text-neutral-400",
          "hover:bg-rose-600 hover:text-white active:bg-rose-700 active:scale-95 pointer-events-auto"
        )}
        title="Fechar"
        aria-label="Fechar aplicação"
      >
        <X size={iconSize + 1} strokeWidth={2} className="pointer-events-none" />
      </button>
    </div>
  );
};

