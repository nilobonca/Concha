import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useThemeStore } from '@/store/themeStore';
import { X, Check, DownloadCloud, UploadCloud, MessageSquareText, Palette, Monitor, Database, Keyboard, Gamepad2, KeyRound } from 'lucide-react';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import { useIDB } from '@/utils/indexedDB';
import { ExportModal } from '@/components/ExportModal';
import { ImportConflictModal } from '@/components/ImportConflictModal';
import { parseBackupFile, ParsedImportData } from '@/utils/exportSystem/importUtils';
import { ChatLogModal } from './ChatLogModal';
import { useShortcutStore } from '@/store/shortcutStore';
import { useMinigamesStore } from '@/store/minigamesStore';
import { AppUpdateSettingsSection } from './AppUpdateSettingsSection';

type Tab = 'appearance' | 'system' | 'backup' | 'shortcuts' | 'minigames';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcutCategories = [
  {
    name: 'Menus e Painéis',
    actions: [
      { id: 'toggleChat', label: 'Chat' },
      { id: 'toggleDiceTray', label: 'Bandeja de Dados' },
      { id: 'toggleHistory', label: 'Histórico' },
      { id: 'toggleSoundboard', label: 'Soundboard' },
      { id: 'toggleGlobalAudio', label: 'Áudio Global' },
      { id: 'toggleLayers', label: 'Camadas' },
      { id: 'toggleSettings', label: 'Configurações' }
    ]
  },
  {
    name: 'Ferramentas',
    actions: [
      { id: 'toolCursor', label: 'Cursor' },
      { id: 'toolArea', label: 'Área' },
      { id: 'toolWall', label: 'Parede' },
      { id: 'toolPin', label: 'Pino' },
      { id: 'toolNote', label: 'Nota' },
      { id: 'toolEraser', label: 'Borracha' },
    ]
  },
  {
    name: 'Controle de Áudio',
    actions: [
      { id: 'muteMaster', label: 'Mutar Master' },
      { id: 'stopAllAudio', label: 'Parar Áudio' }
    ]
  },
  {
    name: 'Sistema',
    actions: [
      { id: 'toggleTheaterMode', label: 'Modo Teatro' },
      { id: 'togglePreviewMode', label: 'Modo Preview' },
      { id: 'undo', label: 'Desfazer' },
      { id: 'redo', label: 'Refazer' },
      { id: 'deleteSelection', label: 'Deletar Seleção' },
    ]
  }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    theme, 
    setTheme,
    isSettingsOpen,
    setIsSettingsOpen,
    audioVizEnabled,
    audioVizColor,
    audioVizIntensity,
    setAudioVizEnabled,
    setAudioVizColor,
    setAudioVizIntensity,
    areaRippleEnabled,
    setAreaRippleEnabled,
  } = useThemeStore();
  
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { activeLayers, isPreviewMode, startPreview, discardPreview } = useIDB();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [parsedImportData, setParsedImportData] = useState<ParsedImportData | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isChatLogModalOpen, setIsChatLogModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('appearance');
  
  const { bindings, setBinding } = useShortcutStore();
  const [listeningFor, setListeningFor] = useState<string | null>(null);
  const { addGame } = useMinigamesStore();  
  // Extract project/page ID from URL if inside a project
  const currentProjectId = router.query.id as string | undefined;
  const currentPageId = router.query.page as string | undefined;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!listeningFor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      
      if (e.key === 'Escape') {
        setBinding(listeningFor, 'Escape');
        setListeningFor(null);
        return;
      }
      
      const keys = [];
      if (e.ctrlKey) keys.push('Control');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');
      
      const keyName = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(keyName)) {
        keys.push(keyName);
        setBinding(listeningFor, keys.join('+'));
        setListeningFor(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listeningFor, setBinding]);

  useEffect(() => {
    if (!isOpen || listeningFor) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, listeningFor, onClose]);

  if (!isOpen || !mounted) return null;

  const isLight = theme === 'light';

  const renderTabButton = (id: Tab, icon: React.ReactNode, label: string) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={clsx(
          "flex items-center gap-3 px-3.5 py-2.5 w-full rounded-xl transition-all text-sm font-medium",
          isActive 
            ? (isLight ? "bg-[#1831D7]/15 text-[#1831D7] font-semibold shadow-xs" : "bg-white/10 text-white font-semibold")
            : (isLight ? "text-stone-600 hover:text-stone-900 hover:bg-stone-100/60" : "text-neutral-400 hover:text-white hover:bg-white/5")
        )}
      >
        {icon}
        {label}
      </button>
    );
  };

  const renderAppearanceTab = () => (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className={clsx("text-sm font-semibold tracking-wide uppercase", isLight ? "text-stone-700" : "text-neutral-400")}>
            Atmosfera de Tema
          </h3>
          <span className="text-xs text-stone-600 dark:text-[#9E9EA8] font-medium">
            Selecione a paleta visual ideal para seu ambiente
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          {/* 1. Modo Escuro Oficial (Midnight Navy) */}
          <button
            onClick={() => setTheme('dark')}
            className={clsx(
              "relative flex flex-col items-start p-4 text-left border transition-all duration-300 group rounded-[1.5rem] cursor-pointer",
              theme === 'dark'
                ? "border-[#7F95FF] bg-[#1831D7]/15 shadow-lg shadow-[#1831D7]/10 ring-2 ring-[#7F95FF]/30"
                : "border-stone-200 dark:border-white/10 hover:border-[#7F95FF]/50 dark:hover:border-white/20 bg-stone-50/50 dark:bg-white/5"
            )}
          >
            <div className="w-full h-20 mb-3 rounded-xl bg-[#17192A] border border-white/10 p-2.5 flex flex-col gap-1.5 shadow-inner">
               <div className="flex items-center gap-1.5">
                 <div className="w-12 h-3 rounded-full bg-[#52B1FF] shadow-xs"></div>
                 <div className="w-10 h-3 rounded-full bg-[#7F95FF] shadow-xs"></div>
                 <div className="w-8 h-3 rounded-full bg-[#001FFF]/80 shadow-xs"></div>
               </div>
               <div className="w-full h-8 rounded-lg bg-[#1D2035] border border-white/10 flex items-center px-2.5 justify-between">
                 <div className="w-1/3 h-2 rounded-full bg-[#F4F0E6]/80"></div>
                 <div className="w-3 h-3 rounded-full bg-[#7F95FF]/70"></div>
               </div>
            </div>
            <span className="font-semibold text-stone-900 dark:text-[#F4F0E6] flex items-center gap-1.5 text-sm">
              🌙 Modo Escuro Oficial
            </span>
            <span className="text-xs text-stone-500 dark:text-[#B4D3F1]/80 mt-0.5 leading-relaxed">
              Midnight Navy (#17192A), tipografia marfim (#F4F0E6) de alto contraste e gradiente azul oficial.
            </span>
            {theme === 'dark' && <div className="absolute top-4 right-4 text-[#7F95FF]"><Check size={18} /></div>}
          </button>

          {/* 2. Modo Claro Oficial (Warm Ivory) */}
          <button
            onClick={() => setTheme('light')}
            className={clsx(
              "relative flex flex-col items-start p-4 text-left border transition-all duration-300 group rounded-[1.5rem] cursor-pointer",
              theme === 'light'
                ? "border-[#1831D7] bg-[#1831D7]/10 shadow-lg shadow-[#1831D7]/5 ring-2 ring-[#1831D7]/20"
                : "border-stone-200 dark:border-white/10 hover:border-[#1831D7]/40 dark:hover:border-white/20 bg-stone-50/50 dark:bg-white/5"
            )}
          >
            <div className="w-full h-20 mb-3 rounded-xl bg-[#F4F0E6] border border-black/10 p-2.5 flex flex-col gap-1.5 shadow-inner">
               <div className="flex items-center gap-1.5">
                 <div className="w-12 h-3 rounded-full bg-[#1831D7]"></div>
                 <div className="w-10 h-3 rounded-full bg-[#7F95FF]"></div>
                 <div className="w-8 h-3 rounded-full bg-[#52B1FF]"></div>
               </div>
               <div className="w-full h-8 rounded-lg bg-white border border-black/10 flex items-center px-2.5 justify-between">
                 <div className="w-1/3 h-2 rounded-full bg-[#17192A]"></div>
                 <div className="w-3 h-3 rounded-full bg-[#1831D7]"></div>
               </div>
            </div>
            <span className="font-semibold text-stone-900 dark:text-white flex items-center gap-1.5 text-sm">
              ☀️ Modo Claro Oficial
            </span>
            <span className="text-xs text-stone-600 dark:text-neutral-400 mt-0.5 leading-relaxed font-medium">
              Marfim aquecido (#F4F0E6), superfícies brancas e tipografia em azul meia-noite (#17192A).
            </span>
            {theme === 'light' && <div className="absolute top-4 right-4 text-[#1831D7] dark:text-[#7F95FF]"><Check size={18} /></div>}
          </button>
        </div>
      </div>

      <div>
        <h3 className={clsx("mb-4 text-sm font-semibold tracking-wide uppercase", isLight ? "text-stone-600" : "text-neutral-400")}>
          Efeito Visual de Áudio
        </h3>
        <div className="p-4 border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-white/5 rounded-[1.5rem] transition-all duration-300 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className={clsx("font-medium text-sm", isLight ? "text-stone-900" : "text-neutral-200")}>Brilho nas Bordas</div>
              <div className={clsx("text-xs", isLight ? "text-stone-600" : "text-neutral-400")}>Tela pulsa com o ritmo da música</div>
            </div>
            <button
              onClick={() => setAudioVizEnabled(!audioVizEnabled)}
              className={clsx(
                "relative w-11 h-6 rounded-full transition-colors duration-200",
                audioVizEnabled ? "bg-[#1831D7]" : "bg-neutral-700"
              )}
            >
              <span className={clsx(
                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                audioVizEnabled && "translate-x-5"
              )} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className={clsx("font-medium text-sm", isLight ? "text-stone-900" : "text-neutral-200")}>Ondas nas Áreas</div>
              <div className={clsx("text-xs", isLight ? "text-stone-600" : "text-neutral-400")}>Ondas sonoras emanam do centro das áreas ativas</div>
            </div>
            <button
              onClick={() => setAreaRippleEnabled(!areaRippleEnabled)}
              className={clsx(
                "relative w-11 h-6 rounded-full transition-colors duration-200",
                areaRippleEnabled ? "bg-[#1831D7]" : "bg-neutral-700"
              )}
            >
              <span className={clsx(
                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                areaRippleEnabled && "translate-x-5"
              )} />
            </button>
          </div>
          {audioVizEnabled && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className={clsx("font-medium text-sm", isLight ? "text-stone-900" : "text-neutral-200")}>Cor do Efeito</div>
                  <div className={clsx("text-xs", isLight ? "text-stone-600" : "text-neutral-400")}>Escolha a cor do brilho</div>
                </div>
                <div className="flex items-center gap-2">
                  {['#7F95FF', '#52B1FF', '#1831D7', '#B4D3F1', '#17192A'].map(color => (
                    <button
                      key={color}
                      onClick={() => setAudioVizColor(color)}
                      className={clsx(
                        "w-7 h-7 rounded-full border-2 transition-all duration-200 hover:scale-110",
                        audioVizColor === color ? "border-white scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={audioVizColor}
                    onChange={(e) => setAudioVizColor(e.target.value)}
                    className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent"
                    title="Cor personalizada"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className={clsx("font-medium text-sm", isLight ? "text-stone-900" : "text-neutral-200")}>Intensidade</div>
                    <div className={clsx("text-xs", isLight ? "text-stone-600" : "text-neutral-400")}>Controla o tamanho e força do brilho</div>
                  </div>
                  <span className={clsx("text-xs font-mono", isLight ? "text-stone-700 font-semibold" : "text-neutral-400")}>{Math.round(audioVizIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={Math.round(audioVizIntensity * 100)}
                  onChange={(e) => setAudioVizIntensity(Number(e.target.value) / 100)}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-neutral-700 accent-[#1831D7]"
                />
              </div>
              <div 
                className="relative h-16 rounded-xl overflow-hidden border border-white/10"
                style={{ boxShadow: `inset 0 0 80px ${audioVizColor}88`, backgroundColor: '#0a0a0a' }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400">
                  Prévia do efeito
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderSystemTab = () => (
    <div className="space-y-8">
      <AppUpdateSettingsSection />

      <div>
        <h3 className={clsx("mb-4 text-sm font-semibold tracking-wide uppercase", isLight ? "text-stone-700" : "text-[#B4D3F1]/80")}>
          Geral
        </h3>
        <div className={clsx("p-4 border", isLight ? "border-stone-200 bg-stone-50/70 rounded-xl" : "border-[#7F95FF]/15 bg-[#17192A]/50 rounded-xl")}>
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <h4 className={clsx("font-medium", isLight ? "text-stone-800" : "text-[#F4F0E6]")}>Modo Preview</h4>
              <p className={clsx("text-sm mt-1", isLight ? "text-stone-600 font-medium" : "text-neutral-400")}>
                Faça alterações no mapa sem afetar o que os jogadores veem.
              </p>
            </div>
            <button
              onClick={() => {
                if (isPreviewMode) discardPreview?.();
                else startPreview?.();
              }}
              className={clsx(
                "px-4 py-2 font-medium transition-all text-sm rounded-lg whitespace-nowrap",
                isPreviewMode 
                  ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30" 
                  : (isLight ? "bg-stone-200 hover:bg-stone-300 text-stone-900" : "bg-[#1831D7] hover:bg-[#1831D7]/90 text-[#F4F0E6]")
              )}
            >
              {isPreviewMode ? 'Desativar Preview' : 'Ativar Preview'}
            </button>
          </div>
        </div>
      </div>

      {currentProjectId && (
        <div>
          <h3 className={clsx("mb-4 text-sm font-semibold tracking-wide uppercase", isLight ? "text-stone-700" : "text-[#B4D3F1]/80")}>
            Logs da Sessão
          </h3>
          <button
            onClick={() => setIsChatLogModalOpen(true)}
            className={clsx(
              "flex items-center gap-3 p-4 border transition-all duration-300 w-full hover:scale-[1.01] rounded-xl",
              isLight
                ? "border-stone-200 bg-white hover:border-[#1831D7] text-stone-800 hover:text-[#1831D7]"
                : "border-[#7F95FF]/20 bg-[#17192A]/70 hover:border-[#7F95FF] text-[#F4F0E6] hover:text-[#7F95FF]"
            )}
          >
            <MessageSquareText size={24} className="flex-shrink-0 text-[#7F95FF]" />
            <div className="text-left">
              <div className="font-medium text-inherit">Histórico do Chat</div>
              <div className="text-xs opacity-70">Visualize, baixe ou apague o log permanente de mensagens e rolagens.</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );

  const renderBackupTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className={clsx("mb-4 text-sm font-semibold tracking-wide uppercase", isLight ? "text-stone-700" : "text-[#B4D3F1]/80")}>
          Exportação e Backup
        </h3>
        <div className="flex gap-4">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className={clsx(
              "flex items-center gap-3 p-4 border transition-all duration-300 w-1/2 hover:scale-[1.02] rounded-xl",
              isLight
                ? "border-stone-200 bg-white hover:border-emerald-600 text-stone-800 hover:text-emerald-600"
                : "border-[#7F95FF]/20 bg-[#17192A]/70 hover:border-emerald-500 text-[#F4F0E6] hover:text-emerald-400"
            )}
          >
            <DownloadCloud size={24} className="flex-shrink-0 text-emerald-400" />
            <div className="text-left">
              <div className="font-medium text-inherit">Exportar Dados</div>
              <div className="text-xs opacity-70">Faça o download.</div>
            </div>
          </button>

          <label
            className={clsx(
              "flex items-center gap-3 p-4 border transition-all duration-300 w-1/2 hover:scale-[1.02] cursor-pointer rounded-xl",
              isLight
                ? "border-stone-200 bg-white hover:border-[#1831D7] text-stone-800 hover:text-[#1831D7]"
                : "border-[#7F95FF]/20 bg-[#17192A]/70 hover:border-[#7F95FF] text-[#F4F0E6] hover:text-[#7F95FF]"
            )}
          >
            <UploadCloud size={24} className="flex-shrink-0 text-[#7F95FF]" />
            <div className="text-left">
              <div className="font-medium text-inherit">Importar Backup</div>
              <div className="text-xs opacity-70">Carregar arquivo .zip.</div>
            </div>
            <input 
              type="file" 
              accept=".zip" 
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const parsed = await parseBackupFile(file);
                  setParsedImportData(parsed);
                  setIsImportModalOpen(true);
                } catch (err) {
                  console.error(err);
                  alert("Arquivo zip inválido ou corrompido.");
                }
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );

  const renderShortcutsTab = () => (
    <div className="space-y-6">
      {shortcutCategories.map((category) => (
        <div key={category.name}>
          <h3 className={clsx("mb-3 text-sm font-semibold tracking-wide uppercase", isLight ? "text-stone-500" : "text-[#B4D3F1]/80")}>
            {category.name}
          </h3>
          <div className={clsx("divide-y border rounded-xl", isLight ? "divide-stone-200 border-stone-200 bg-white" : "divide-white/10 border-[#7F95FF]/20 bg-[#17192A]/50")}>
            {category.actions.map((action) => (
              <div key={action.id} className="flex items-center justify-between p-4">
                <span className={clsx("text-sm font-medium", isLight ? "text-stone-800" : "text-neutral-200")}>{action.label}</span>
                <button
                  onClick={() => setListeningFor(action.id)}
                  className={clsx(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
                    listeningFor === action.id 
                      ? "bg-[#1831D7]/20 text-[#7F95FF] border-[#7F95FF]/50 animate-pulse" 
                      : (isLight ? "bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200" : "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10 hover:text-white")
                  )}
                >
                  {listeningFor === action.id ? "Pressione..." : (bindings[action.id] || "Não definido")}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );


  const renderMinigamesTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className={clsx("mb-4 text-sm font-semibold tracking-wide uppercase", isLight ? "text-stone-500" : "text-[#B4D3F1]/80")}>
          Minigames e Desafios
        </h3>
        <div className="space-y-4">
          
          {/* Clicker Minigame */}
          <div className={clsx("p-4 border rounded-xl", isLight ? "border-stone-200 bg-stone-50/70" : "border-[#7F95FF]/15 bg-[#17192A]/50")}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="pr-4">
                  <h4 className={clsx("font-medium", isLight ? "text-stone-800" : "text-neutral-200")}>Desafio de Cliques</h4>
                  <p className={clsx("text-sm mt-1", isLight ? "text-stone-600 font-medium" : "text-neutral-400")}>
                    Inicie um minigame onde os jogadores devem clicar rapidamente para atingir uma meta.
                  </p>
                </div>
                <button
                  onClick={() => {
                    addGame({
                      id: uuidv4(),
                      gameId: 'clicker',
                      title: 'Desafio de Cliques',
                      isMinimized: false,
                      status: 'idle',
                      config: { targetClicks: 100, timeLimit: 30 }
                    });
                    onClose();
                  }}
                  className={clsx(
                    "px-4 py-2 font-medium transition-all text-sm rounded-lg whitespace-nowrap",
                    isLight ? "bg-stone-200 hover:bg-stone-300 text-stone-900" : "bg-[#1831D7] hover:bg-[#1831D7]/90 text-[#F4F0E6]"
                  )}
                >
                  Novo Desafio
                </button>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-neutral-800 dark:border-white/10">
                <div className={clsx("text-sm font-medium", isLight ? "text-stone-700" : "text-neutral-400")}>Fixar botão no menu lateral</div>
                <button
                  onClick={() => useThemeStore.getState().togglePinnedMinigame('clicker')}
                  className={clsx(
                    "relative w-11 h-6 rounded-full transition-colors duration-200",
                    useThemeStore.getState().pinnedMinigames.includes('clicker') ? "bg-[#1831D7] dark:bg-[#7F95FF]" : "bg-neutral-700"
                  )}
                >
                  <span className={clsx(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                    useThemeStore.getState().pinnedMinigames.includes('clicker') && "translate-x-5"
                  )} />
                </button>
              </div>
            </div>
          </div>

          {/* Coin Flip Minigame */}
          <div className={clsx("p-4 border rounded-xl", isLight ? "border-stone-200 bg-stone-50/70" : "border-[#7F95FF]/15 bg-[#17192A]/50")}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="pr-4">
                  <h4 className={clsx("font-medium", isLight ? "text-stone-800" : "text-neutral-200")}>Cara ou Coroa</h4>
                  <p className={clsx("text-sm mt-1", isLight ? "text-stone-600 font-medium" : "text-neutral-400")}>
                    Gire uma moeda 3D em tempo real. Você pode predefinir ou forçar o resultado.
                  </p>
                </div>
                <button
                  onClick={() => {
                    addGame({
                      id: `coin_flip_${Date.now()}`,
                      gameId: 'coin_flip',
                      title: 'Cara ou Coroa',
                      isMinimized: false,
                      status: 'idle',
                      config: { maxFlips: 1, permissions: {} }
                    });
                    onClose();
                  }}
                  className={clsx(
                    "px-4 py-2 font-medium transition-all text-sm rounded-lg whitespace-nowrap",
                    isLight ? "bg-stone-200 hover:bg-stone-300 text-stone-900" : "bg-[#1831D7] hover:bg-[#1831D7]/90 text-[#F4F0E6]"
                  )}
                >
                  Novo Desafio
                </button>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-neutral-800 dark:border-white/10">
                <div className={clsx("text-sm font-medium", isLight ? "text-stone-700" : "text-neutral-400")}>Fixar botão no menu lateral</div>
                <button
                  onClick={() => useThemeStore.getState().togglePinnedMinigame('coin_flip')}
                  className={clsx(
                    "relative w-11 h-6 rounded-full transition-colors duration-200",
                    useThemeStore.getState().pinnedMinigames.includes('coin_flip') ? "bg-[#1831D7] dark:bg-[#7F95FF]" : "bg-neutral-700"
                  )}
                >
                  <span className={clsx(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                    useThemeStore.getState().pinnedMinigames.includes('coin_flip') && "translate-x-5"
                  )} />
                </button>
              </div>
            </div>
          </div>

          {/* Cartas Minigame */}
          <div className={clsx(
            "p-6 rounded-2xl border transition-all",
            isLight ? "bg-white border-stone-200" : "bg-[#17192A]/50 border-[#7F95FF]/15"
          )}>
            <div className="flex items-center gap-4 mb-4">
              <div className={clsx(
                "p-3 rounded-xl",
                isLight ? "bg-[#1831D7]/10 text-[#1831D7]" : "bg-[#7F95FF]/10 text-[#7F95FF]"
              )}>
                <Gamepad2 size={24} />
              </div>
              <div>
                <h3 className={clsx("text-lg font-medium", isLight ? "text-stone-800" : "text-neutral-200")}>Cartas</h3>
                <span className="text-xs text-[#7F95FF] font-medium">Novo</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="pr-4">
                  <h4 className={clsx("font-medium", isLight ? "text-stone-800" : "text-neutral-200")}>Distribuição de Cartas</h4>
                  <p className={clsx("text-sm mt-1", isLight ? "text-stone-600 font-medium" : "text-neutral-400")}>
                    Exiba cartas personalizadas para os ouvintes, com opções de face inicial e revelação (secreta ou pública).
                  </p>
                </div>
                <button
                  onClick={() => {
                    addGame({
                      id: `cards_${Date.now()}`,
                      gameId: 'cards',
                      title: 'Escolha uma Carta',
                      isMinimized: false,
                      status: 'idle',
                      config: { permissions: {} }
                    });
                    onClose();
                  }}
                  className={clsx(
                    "px-4 py-2 font-medium transition-all text-sm rounded-lg whitespace-nowrap",
                    isLight ? "bg-stone-200 hover:bg-stone-300 text-stone-900" : "bg-[#1831D7] hover:bg-[#1831D7]/90 text-[#F4F0E6]"
                  )}
                >
                  Novo Desafio
                </button>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-neutral-800 dark:border-white/10">
                <div className={clsx("text-sm font-medium", isLight ? "text-stone-700" : "text-neutral-400")}>Fixar botão no menu lateral</div>
                <button
                  onClick={() => useThemeStore.getState().togglePinnedMinigame('cards')}
                  className={clsx(
                    "relative w-11 h-6 rounded-full transition-colors duration-200",
                    useThemeStore.getState().pinnedMinigames.includes('cards') ? "bg-[#1831D7] dark:bg-[#7F95FF]" : "bg-neutral-700"
                  )}
                >
                  <span className={clsx(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                    useThemeStore.getState().pinnedMinigames.includes('cards') && "translate-x-5"
                  )} />
                </button>
              </div>
            </div>
          </div>

          {/* Lockpicker de Precisao Minigame */}
          <div className={clsx(
            "p-6 rounded-2xl border transition-all",
            isLight ? "bg-white border-stone-200" : "bg-[#17192A]/50 border-[#7F95FF]/15"
          )}>
            <div className="flex items-center gap-4 mb-4">
              <div className={clsx(
                "p-3 rounded-xl",
                isLight ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              )}>
                <KeyRound size={24} />
              </div>
              <div>
                <h3 className={clsx("text-lg font-medium", isLight ? "text-stone-800" : "text-neutral-200")}>Lockpicker de Precisão</h3>
                <span className="text-xs text-amber-400 font-medium">Novo</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="pr-4">
                  <h4 className={clsx("font-medium", isLight ? "text-stone-800" : "text-neutral-200")}>Decodificador de Fechaduras</h4>
                  <p className={clsx("text-sm mt-1", isLight ? "text-stone-600 font-medium" : "text-neutral-400")}>
                    Desafio tátil em 2 fases: sintonize o tremor da agulha para achar o ponto secreto e gire o cilindro como chave!
                  </p>
                </div>
                <button
                  onClick={() => {
                    addGame({
                      id: `dial_lock_${Date.now()}`,
                      gameId: 'dial_lock',
                      title: 'Lockpicker de Precisão',
                      isMinimized: false,
                      status: 'idle',
                      config: { stages: 3, tolerance: 6, maxAttempts: 5, permissions: {} }
                    });
                    onClose();
                  }}
                  className={clsx(
                    "px-4 py-2 font-medium transition-all text-sm rounded-lg whitespace-nowrap",
                    isLight ? "bg-stone-200 hover:bg-stone-300 text-stone-900" : "bg-[#1831D7] hover:bg-[#1831D7]/90 text-[#F4F0E6]"
                  )}
                >
                  Novo Desafio
                </button>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-neutral-800 dark:border-white/10">
                <div className={clsx("text-sm font-medium", isLight ? "text-stone-700" : "text-neutral-400")}>Fixar botão no menu lateral</div>
                <button
                  onClick={() => useThemeStore.getState().togglePinnedMinigame('dial_lock')}
                  className={clsx(
                    "relative w-11 h-6 rounded-full transition-colors duration-200",
                    useThemeStore.getState().pinnedMinigames.includes('dial_lock') ? "bg-[#1831D7] dark:bg-[#7F95FF]" : "bg-neutral-700"
                  )}
                >
                  <span className={clsx(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                    useThemeStore.getState().pinnedMinigames.includes('dial_lock') && "translate-x-5"
                  )} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
      <div 
        className={clsx(
          "w-full max-w-4xl flex flex-col overflow-hidden transition-all duration-300 h-[80vh]",
          isLight
            ? "bg-[#F4F0E6] border border-stone-200/80 rounded-[2rem] shadow-2xl text-[#17192A]"
            : "bg-[#17192A] border border-[#7F95FF]/20 rounded-[2rem] shadow-2xl text-[#F4F0E6]"
        )}
      >
        <div className={clsx(
          "flex items-center justify-between p-6 border-b shrink-0",
          isLight ? "border-[#1831D7]/15" : "border-white/10"
        )}>
          <h2 className={clsx("text-xl font-bold tracking-tight", isLight ? "text-[#17192A]" : "text-white")}>
            Configurações
          </h2>
          <button 
            onClick={onClose}
            className={clsx(
              "p-2 rounded-full transition-colors",
              isLight ? "hover:bg-stone-200 text-stone-600 hover:text-stone-900" : "hover:bg-white/10 text-neutral-400 hover:text-white"
            )}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className={clsx(
            "w-64 border-r p-4 flex flex-col gap-2 overflow-y-auto shrink-0",
            isLight ? "border-stone-200/80 bg-stone-50/50" : "border-white/10 bg-black/20"
          )}>
            {renderTabButton('appearance', <Palette size={18} />, 'Aparência')}
            {renderTabButton('system', <Monitor size={18} />, 'Sistema')}
            {renderTabButton('backup', <Database size={18} />, 'Backup')}
            {renderTabButton('shortcuts', <Keyboard size={18} />, 'Atalhos')}
            {renderTabButton('minigames', <Gamepad2 size={18} />, 'Minigames')}
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'appearance' && renderAppearanceTab()}
            {activeTab === 'system' && renderSystemTab()}
            {activeTab === 'backup' && renderBackupTab()}
            {activeTab === 'shortcuts' && renderShortcutsTab()}
            {activeTab === 'minigames' && renderMinigamesTab()}
          </div>
        </div>
      </div>
      
      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        activeLayers={activeLayers}
        currentProjectId={currentProjectId}
        currentPageId={currentPageId}
      />
      <ImportConflictModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        parsedData={parsedImportData}
        onSuccess={() => {
          setIsImportModalOpen(false);
          alert('Importação concluída com sucesso! A página será recarregada.');
          window.location.reload();
        }}
      />
      
      {currentProjectId && (
        <ChatLogModal
          isOpen={isChatLogModalOpen}
          onClose={() => setIsChatLogModalOpen(false)}
          projectId={currentProjectId}
        />
      )}
    </div>
  );
};
