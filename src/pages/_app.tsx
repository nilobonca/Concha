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
import { PollsProvider } from "@/contexts/PollsContext";
import { useThemeStore } from "@/store/themeStore";
import { useAppUpdateStore } from "@/store/useAppUpdateStore";
import { useAdaptiveFavicon } from "@/hooks/useAdaptiveFavicon";
import { SettingsModal } from "@/components/SettingsModal/SettingsModal";
import clsx from "clsx";

export default function App({ Component, pageProps }: AppProps) {
  const { theme, isSettingsOpen, setIsSettingsOpen } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const initAppUpdate = useAppUpdateStore((state) => state.init);

  // Dynamically adapt browser favicon to match theme
  useAdaptiveFavicon();

  useEffect(() => {
    setMounted(true);
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
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
                
                {mounted && (
                  <>
                    <SettingsModal 
                      isOpen={isSettingsOpen} 
                      onClose={() => setIsSettingsOpen(false)} 
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
