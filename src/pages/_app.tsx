import "@/utils/cryptoPolyfill";
import "@/styles/globals.css";
import "katex/dist/katex.min.css";
import { IDBProvider } from "@/utils/indexedDB";
import { LogSystemProvider } from "@/utils/logSystem";
import { ThemeProvider } from "@/components/theme-provider";
import type { AppProps } from "next/app";
import Head from "next/head";

import { useEffect, useState } from "react";
import { FeedbackWidget } from "@/components/Feedback/FeedbackWidget";
import { AppUpdateToast } from "@/components/common/AppUpdateToast";
import { VaultLoadingModal } from "@/modules/vault/components/VaultLoadingModal";
import { AudioCanvasLoadingModal } from "@/components/Canva/AudioCanvasLoadingModal";
import { PollsProvider } from "@/contexts/PollsContext";
import { useThemeStore } from "@/store/themeStore";
import { useAppUpdateStore } from "@/store/useAppUpdateStore";
import { useSpellCheckStore } from "@/store/spellCheckStore";
import { useAdaptiveFavicon } from "@/hooks/useAdaptiveFavicon";
import { SettingsModal } from "@/components/SettingsModal/SettingsModal";
import { TextContextMenu, TextContextMenuState } from "@/components/ContextMenu/TextContextMenu";
import { subscribeToSpellCheckMenuData } from "@/utils/electronHelper";
import clsx from "clsx";

export default function App({ Component, pageProps }: AppProps) {
  const { theme, isSettingsOpen, setIsSettingsOpen } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const [textContextMenu, setTextContextMenu] = useState<TextContextMenuState | null>(null);
  const initAppUpdate = useAppUpdateStore((state) => state.init);

  // Dynamically adapt browser favicon to match theme
  useAdaptiveFavicon();

  useEffect(() => {
    setMounted(true);

    // Inicializa sincronização do corretor ortográfico e idioma de escrita
    useSpellCheckStore.getState().syncWithEnvironment();

    // Em ambiente Electron, escuta o evento de contexto com dados ortográficos e sugestões
    const unsubSpellCheckMenu = subscribeToSpellCheckMenuData((data) => {
      setTextContextMenu({
        x: data.x,
        y: data.y,
        word: data.misspelledWord || (data.selectionText && data.selectionText.trim().length <= 50 && !data.selectionText.includes('\n') ? data.selectionText.trim() : null),
        suggestions: data.suggestions || [],
        isEditable: data.isEditable,
        hasSelection: Boolean(data.selectionText && data.selectionText.trim()),
        target: document.activeElement as HTMLElement | null,
      });
    });

    const handleContextMenu = (e: MouseEvent) => {
      // Se estiver no Electron, deixa o evento seguir para o webContents.on('context-menu') do Electron,
      // onde event.preventDefault() bloqueia o menu do SO e despacha o menu in-app com sugestões
      if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
        return;
      }

      // No navegador web comum, bloqueia o menu nativo e abre o menu do próprio app
      e.preventDefault();

      const target = e.target as HTMLElement | null;
      const isEditable = Boolean(
        target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('[contenteditable="true"]')
        )
      );

      const selection = window.getSelection()?.toString().trim() || '';
      const hasSelection = Boolean(selection);

      let word: string | null = null;
      if (hasSelection && selection.length <= 50 && !selection.includes('\n')) {
        word = selection;
      } else if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const val = target.value;
        const start = target.selectionStart ?? 0;
        const leftMatch = val.slice(0, start).match(/[a-zA-Z0-9_\u00C0-\u00FF-]+$/);
        const rightMatch = val.slice(start).match(/^[a-zA-Z0-9_\u00C0-\u00FF-]+/);
        const candidate = `${leftMatch ? leftMatch[0] : ''}${rightMatch ? rightMatch[0] : ''}`.trim();
        if (candidate && candidate.length >= 2) word = candidate;
      } else if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (range && range.startContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
          const text = range.startContainer.textContent || '';
          const offset = range.startOffset;
          const leftMatch = text.slice(0, offset).match(/[a-zA-Z0-9_\u00C0-\u00FF-]+$/);
          const rightMatch = text.slice(offset).match(/^[a-zA-Z0-9_\u00C0-\u00FF-]+/);
          const candidate = `${leftMatch ? leftMatch[0] : ''}${rightMatch ? rightMatch[0] : ''}`.trim();
          if (candidate && candidate.length >= 2) word = candidate;
        }
      }

      // Se for campo editável, seleção de texto ou palavra identificada, abre o menu do próprio app
      if (isEditable || hasSelection || word) {
        setTextContextMenu({
          x: e.clientX,
          y: e.clientY,
          word,
          target,
          hasSelection,
          isEditable,
        });
      } else {
        setTextContextMenu(null);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);

    // Electron Global Hotkeys Listener
    let unsubMute: (() => void) | undefined;
    let unsubTrigger: (() => void) | undefined;

    if (typeof window !== 'undefined' && window.electronAPI) {
      unsubMute = window.electronAPI.onMuteAll(() => {
        document.querySelectorAll('audio').forEach((el) => {
          if (!el.paused) el.pause();
        });
      });

      unsubTrigger = window.electronAPI.onSoundboardTrigger((slot) => {
        const soundboardBtns = document.querySelectorAll('[data-soundboard-slot]');
        if (soundboardBtns[slot - 1]) {
          (soundboardBtns[slot - 1] as HTMLElement).click();
        }
      });
    }

    // Initialize auto-updater store and auto-check on startup
    const unsubUpdate = initAppUpdate();

    // In mobile / Capacitor environment, automatically hide status bar for immersive full-screen
    if (typeof window !== 'undefined') {
      import('@capacitor/status-bar')
        .then(({ StatusBar }) => {
          StatusBar.hide().catch(() => {});
        })
        .catch(() => {});
    }

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      unsubSpellCheckMenu?.();
      unsubMute?.();
      unsubTrigger?.();
      unsubUpdate?.();
    };
  }, [initAppUpdate]);

  const activeTheme = mounted ? theme : 'dark';

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'ethereal', 'grimdark', 'cyber', 'taverna');
    root.classList.add(activeTheme === 'light' ? 'light' : 'dark');
  }, [activeTheme, mounted]);

  return (
    <>
      <Head>
        <title>Concha</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="application-name" content="Concha" />
        <meta name="apple-mobile-web-app-title" content="Concha" />
      </Head>
      <LogSystemProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <PollsProvider>
            <IDBProvider>
              <div className={clsx(
                "w-screen h-screen overflow-hidden flex flex-col transition-colors duration-300", 
                activeTheme,
                activeTheme === 'light' 
                  ? 'bg-[#F4F0E6] text-[#17192A]' 
                  : 'bg-[#17192A] text-[#F4F0E6]'
              )}>
                <div className="flex-1 w-full h-full overflow-hidden relative">
                  <Component {...pageProps} />
                </div>
                <FeedbackWidget />
                <AppUpdateToast />
                <VaultLoadingModal />
                <AudioCanvasLoadingModal />
                
                {mounted && (
                  <>
                    <SettingsModal 
                      isOpen={isSettingsOpen} 
                      onClose={() => setIsSettingsOpen(false)} 
                    />
                    <TextContextMenu 
                      state={textContextMenu} 
                      onClose={() => setTextContextMenu(null)} 
                    />
                  </>
                )}
              </div>
            </IDBProvider>
        </PollsProvider>
      </ThemeProvider>
      </LogSystemProvider>
    </>
  );
}
