import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useThemeStore } from '@/store/themeStore';
import { 
  X, Check, DownloadCloud, UploadCloud, MessageSquareText, Palette, 
  Monitor, Database, Keyboard, Gamepad2, KeyRound, HardDrive, FolderSync, 
  Laptop, Trash2, Edit2, Folder, RefreshCw, Info, ShieldCheck 
} from 'lucide-react';
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
import { SpellCheckSettingsSection } from './SpellCheckSettingsSection';
import { SafeIcon } from '@/components/common/SafeIcon';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { 
  getCanvasNoteSyncPref, 
  setCanvasNoteSyncPref, 
  CanvasNoteSyncPref 
} from '@/modules/vault/utils/canvasNoteSyncPref';

type Tab = 'appearance' | 'vault' | 'system' | 'backup' | 'shortcuts' | 'minigames';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDashboard?: boolean;
  initialTab?: Tab;
}

const shortcutCategories = [
  {
    name: 'Menus e Painéis',
    actions: [
      { id: 'toggleChat', label: 'Chat', isCanvasOnly: true },
      { id: 'toggleDiceTray', label: 'Bandeja de Dados', isCanvasOnly: true },
      { id: 'toggleHistory', label: 'Histórico', isCanvasOnly: true },
      { id: 'toggleSoundboard', label: 'Soundboard', isCanvasOnly: true },
      { id: 'toggleGlobalAudio', label: 'Áudio Global', isCanvasOnly: true },
      { id: 'toggleLayers', label: 'Camadas', isCanvasOnly: true },
      { id: 'toggleSettings', label: 'Configurações', isCanvasOnly: false }
    ]
  },
  {
    name: 'Ferramentas',
    isCanvasOnly: true,
    actions: [
      { id: 'toolCursor', label: 'Cursor', isCanvasOnly: true },
      { id: 'toolArea', label: 'Área', isCanvasOnly: true },
      { id: 'toolWall', label: 'Parede', isCanvasOnly: true },
      { id: 'toolPin', label: 'Pino', isCanvasOnly: true },
      { id: 'toolNote', label: 'Nota', isCanvasOnly: true },
      { id: 'toolEraser', label: 'Borracha', isCanvasOnly: true },
    ]
  },
  {
    name: 'Controle de Áudio',
    isCanvasOnly: true,
    actions: [
      { id: 'muteMaster', label: 'Mutar Master', isCanvasOnly: true },
      { id: 'stopAllAudio', label: 'Parar Áudio', isCanvasOnly: true }
    ]
  },
  {
    name: 'Sistema',
    actions: [
      { id: 'toggleTheaterMode', label: 'Modo Teatro', isCanvasOnly: true },
      { id: 'togglePreviewMode', label: 'Modo Preview', isCanvasOnly: true },
      { id: 'undo', label: 'Desfazer', isCanvasOnly: false },
      { id: 'redo', label: 'Refazer', isCanvasOnly: false },
      { id: 'deleteSelection', label: 'Deletar Seleção', isCanvasOnly: false },
    ]
  }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, isDashboard, initialTab }) => {
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

  // Vault Store integration
  const { 
    settingsOpen: vaultSettingsOpen, 
    setSettingsOpen: setVaultSettingsOpen,
    vaultName, 
    setVaultName, 
    storageType, 
    isConnected,
    vaultId,
    connectFSA, 
    connectIDB,
    refreshNodes,
    getAllFiles
  } = useVaultStore();
  
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { activeLayers, isPreviewMode, startPreview, discardPreview } = useIDB();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [parsedImportData, setParsedImportData] = useState<ParsedImportData | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isChatLogModalOpen, setIsChatLogModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab || 'appearance');
  
  const { bindings, setBinding } = useShortcutStore();
  const [listeningFor, setListeningFor] = useState<string | null>(null);
  const { addGame } = useMinigamesStore();  
  const currentProjectId = router.query.id as string | undefined;
  const currentPageId = router.query.page as string | undefined;
  const isDashboardMode = isDashboard ?? (!currentProjectId && !router.pathname.startsWith('/project'));

  // Vault State
  const [vaultNameInput, setVaultNameInput] = useState(vaultName);
  const [vaultNameSaved, setVaultNameSaved] = useState(false);
  const [isConnectingFSA, setIsConnectingFSA] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(true);
  const [syncPref, setSyncPref] = useState<CanvasNoteSyncPref>('ask');

  const isModalOpen = isOpen || vaultSettingsOpen;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (vaultSettingsOpen) {
      setActiveTab('vault');
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [vaultSettingsOpen, initialTab]);

  useEffect(() => {
    setVaultNameInput(vaultName);
  }, [vaultName]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const skip = localStorage.getItem('vault_skip_delete_confirm') === 'true';
      setConfirmDelete(!skip);
      setSyncPref(getCanvasNoteSyncPref());
    }
  }, [isModalOpen]);

  const handleModalClose = () => {
    onClose();
    if (vaultSettingsOpen) {
      setVaultSettingsOpen(false);
    }
  };

  const handleSyncPrefChange = (val: CanvasNoteSyncPref) => {
    setSyncPref(val);
    setCanvasNoteSyncPref(val);
  };

  const handleToggleConfirmDelete = (enabled: boolean) => {
    setConfirmDelete(enabled);
    if (typeof window !== 'undefined') {
      if (enabled) {
        localStorage.removeItem('vault_skip_delete_confirm');
      } else {
        localStorage.setItem('vault_skip_delete_confirm', 'true');
      }
    }
  };

  const handleSaveVaultName = async () => {
    const trimmed = vaultNameInput.trim();
    if (trimmed && trimmed !== vaultName) {
      await setVaultName(trimmed);
      setVaultNameSaved(true);
      setTimeout(() => setVaultNameSaved(false), 2500);
    }
  };

  const handleConnectWindowsFolder = async () => {
    try {
      setIsConnectingFSA(true);
      const success = await connectFSA(vaultId, true);
      if (success) {
        await refreshNodes();
      }
    } finally {
      setIsConnectingFSA(false);
    }
  };

  const handleReconnectWindowsFolder = async () => {
    try {
      setIsConnectingFSA(true);
      await connectFSA(vaultId, false);
      await refreshNodes();
    } catch (err) {
      console.warn('Falha ao reconectar pasta:', err);
    } finally {
      setIsConnectingFSA(false);
    }
  };

  const handleSwitchToIDB = async () => {
    if (confirm('Deseja alternar para o banco de dados interno (IndexedDB)? Seus arquivos na pasta do Windows permanecerão intactos no seu computador.')) {
      await connectIDB();
      await refreshNodes();
    }
  };

  const totalVaultFiles = getAllFiles().length;

  useEffect(() => {
    if (isDashboardMode && activeTab === 'minigames') {
      setActiveTab('appearance');
    }
  }, [isDashboardMode, activeTab]);

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
    if (!isModalOpen || listeningFor) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleModalClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isModalOpen, listeningFor]);

  if (!isModalOpen || !mounted) return null;

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

      {!isDashboardMode && (
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
      )}
    </div>
  );

  const renderVaultTab = () => (
    <div className="space-y-6 text-xs">
      {/* 1. Armazenamento & Vincular Pasta do Windows (FSA / HD Local / IDB) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Laptop className="w-4 h-4 text-[#1831D7] dark:text-[#7F95FF]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-neutral-400">
            Armazenamento & Pasta do Windows
          </h3>
        </div>

        {storageType === 'fsa' ? (
          isConnected ? (
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Conectado a uma Pasta Local do Windows (HD)
                    </span>
                    <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 mt-0.5">
                      Sincronização ativa: seus arquivos <code className="font-mono bg-emerald-100 dark:bg-emerald-900/50 px-1 py-0.2 rounded">.md</code>, áudios e imagens são salvos diretamente no seu computador.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-emerald-200/70 dark:border-emerald-800/30">
                <button
                  onClick={handleConnectWindowsFolder}
                  disabled={isConnectingFSA}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isConnectingFSA ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FolderSync className="w-3.5 h-3.5" />
                  )}
                  <span>Alterar Pasta do Windows...</span>
                </button>

                <button
                  onClick={handleSwitchToIDB}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-700 dark:text-neutral-300 font-medium text-xs border border-stone-200 dark:border-white/10 transition-colors cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 text-[#1831D7] dark:text-[#7F95FF]" />
                  <span>Usar Banco IndexedDB</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Pasta Desconectada (Permissão Pendente)
                    </span>
                    <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-0.5">
                      O acesso à pasta local deste Vault precisa de autorização para abrir e criar notas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-amber-200/70 dark:border-amber-800/30">
                <button
                  onClick={handleReconnectWindowsFolder}
                  disabled={isConnectingFSA}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1831D7] hover:bg-[#1831D7]/90 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isConnectingFSA ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FolderSync className="w-3.5 h-3.5" />
                  )}
                  <span>Reconectar Pasta</span>
                </button>

                <button
                  onClick={handleConnectWindowsFolder}
                  disabled={isConnectingFSA}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-700 dark:text-neutral-300 font-medium text-xs border border-stone-200 dark:border-white/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span>Escolher Outra Pasta...</span>
                </button>

                <button
                  onClick={handleSwitchToIDB}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-700 dark:text-neutral-300 font-medium text-xs border border-stone-200 dark:border-white/10 transition-colors cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 text-[#1831D7] dark:text-[#7F95FF]" />
                  <span>Usar IDB</span>
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="p-4 rounded-xl bg-[#1831D7]/10 border border-[#7F95FF]/30 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1831D7]/20 flex items-center justify-center text-[#1831D7] dark:text-[#7F95FF] shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-xs text-[#1831D7] dark:text-[#7F95FF] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1831D7]" />
                  Armazenamento Local no Navegador (IndexedDB)
                </span>
                <p className="text-[11px] text-stone-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                  Seus arquivos estão salvos no banco local. Você pode vincular uma pasta do Windows a qualquer momento para editar suas notas no Explorador ou VS Code.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#7F95FF]/30">
              <button
                onClick={handleConnectWindowsFolder}
                disabled={isConnectingFSA}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1831D7] hover:bg-[#1831D7]/90 text-white font-semibold text-xs transition-all cursor-pointer shadow-md shadow-[#1831D7]/20 disabled:opacity-50"
              >
                {isConnectingFSA ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <HardDrive className="w-4 h-4" />
                )}
                <span>Vincular Pasta do Windows (HD Local)...</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Nome do Vault */}
      <div className="space-y-3 pt-2 border-t border-stone-200/80 dark:border-white/5">
        <div className="flex items-center gap-2">
          <Edit2 className="w-4 h-4 text-[#1831D7] dark:text-[#7F95FF]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-neutral-400">
            Nome do Vault
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={vaultNameInput}
            onChange={(e) => setVaultNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveVaultName();
            }}
            placeholder="Nome do seu Vault..."
            className="flex-1 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-stone-900 dark:text-neutral-100 outline-none focus:border-[#7F95FF]"
          />
          <button
            onClick={handleSaveVaultName}
            disabled={!vaultNameInput.trim() || vaultNameInput.trim() === vaultName}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1831D7] hover:bg-[#1831D7]/90 disabled:opacity-40 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            {vaultNameSaved ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{vaultNameSaved ? 'Salvo!' : 'Salvar Nome'}</span>
          </button>
        </div>
      </div>

      {/* 3. Lixeira & Confirmação */}
      <div className="space-y-3 pt-2 border-t border-stone-200/80 dark:border-white/5">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-[#1831D7] dark:text-[#7F95FF]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-neutral-400">
            Lixeira & Confirmação de Exclusão
          </h3>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 dark:bg-white/[0.02] border border-stone-200/70 dark:border-white/5">
          <div className="pr-3">
            <span className="font-semibold text-xs text-stone-900 dark:text-neutral-100 block">
              Confirmar antes de excluir arquivos
            </span>
            <p className="text-[11px] text-stone-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
              Exibe o modal de confirmação antes de apagar notas ou pastas do Vault.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={confirmDelete}
              onChange={(e) => handleToggleConfirmDelete(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1831D7]"></div>
          </label>
        </div>
      </div>

      {/* 4. Sincronização de Notas */}
      <div className="space-y-3 pt-2 border-t border-stone-200/80 dark:border-white/5">
        <div className="flex items-center gap-2">
          <FolderSync className="w-4 h-4 text-[#1831D7] dark:text-[#7F95FF]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-neutral-400">
            Sincronização de Notas no Canvas
          </h3>
        </div>

        <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/[0.02] border border-stone-200/70 dark:border-white/5 space-y-2">
          <div>
            <span className="font-semibold text-xs text-stone-900 dark:text-neutral-100 block">
              Ao editar nota vinculada no Canvas
            </span>
            <p className="text-[11px] text-stone-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
              Define o comportamento ao alterar o texto de uma nota vinculada diretamente no canvas.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handleSyncPrefChange('ask')}
              className={clsx(
                "px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center",
                syncPref === 'ask'
                  ? "bg-white dark:bg-white/15 border-stone-400 dark:border-white/30 text-stone-900 dark:text-white shadow-xs font-semibold"
                  : "border-stone-200 dark:border-white/5 text-stone-600 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-white/5"
              )}
            >
              Sempre perguntar
            </button>

            <button
              type="button"
              onClick={() => handleSyncPrefChange('always')}
              className={clsx(
                "px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center",
                syncPref === 'always'
                  ? "bg-white dark:bg-white/15 border-stone-400 dark:border-white/30 text-stone-900 dark:text-white shadow-xs font-semibold"
                  : "border-stone-200 dark:border-white/5 text-stone-600 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-white/5"
              )}
            >
              Sempre atualizar
            </button>

            <button
              type="button"
              onClick={() => handleSyncPrefChange('never')}
              className={clsx(
                "px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center",
                syncPref === 'never'
                  ? "bg-white dark:bg-white/15 border-stone-400 dark:border-white/30 text-stone-900 dark:text-white shadow-xs font-semibold"
                  : "border-stone-200 dark:border-white/5 text-stone-600 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-white/5"
              )}
            >
              Não atualizar
            </button>
          </div>
        </div>
      </div>

      {/* 5. Informações do Vault */}
      <div className="space-y-2 pt-2 border-t border-stone-200/80 dark:border-white/5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-neutral-400">
          Informações do Vault
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/[0.02] border border-stone-200/70 dark:border-white/5">
            <span className="text-[11px] text-stone-500 dark:text-neutral-400 block">Total de Arquivos & Notas</span>
            <span className="font-bold text-sm text-stone-900 dark:text-neutral-100">{totalVaultFiles} itens</span>
          </div>
          <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/[0.02] border border-stone-200/70 dark:border-white/5">
            <span className="text-[11px] text-stone-500 dark:text-neutral-400 block">Tipo de Armazenamento</span>
            <span className="font-bold text-sm text-stone-900 dark:text-neutral-100">
              {storageType === 'fsa' ? 'HD Local (Windows)' : 'IndexedDB'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemTab = () => (
    <div className="space-y-8">
      <AppUpdateSettingsSection />
      <SpellCheckSettingsSection />

      {!isDashboardMode && (
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
      )}

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

  const renderShortcutsTab = () => {
    const visibleCategories = shortcutCategories
      .filter((cat) => !isDashboardMode || !cat.isCanvasOnly)
      .map((cat) => ({
        ...cat,
        actions: cat.actions.filter((act) => !isDashboardMode || !act.isCanvasOnly),
      }))
      .filter((cat) => cat.actions.length > 0);

    return (
      <div className="space-y-6">
        {visibleCategories.map((category) => (
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
  };


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
          <div>
            <h2 className={clsx("text-xl font-bold tracking-tight", isLight ? "text-[#17192A]" : "text-white")}>
              {isDashboardMode ? 'Opções do Aplicativo' : 'Configurações'}
            </h2>
            {isDashboardMode && (
              <p className="text-xs text-stone-500 dark:text-neutral-400 font-medium mt-0.5">
                Preferências gerais do sistema, armazenamento do vault e backup do app
              </p>
            )}
          </div>
          <button 
            onClick={handleModalClose}
            className={clsx(
              "p-2 rounded-full transition-colors cursor-pointer",
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
            {renderTabButton('vault', <SafeIcon size={18} />, 'Vault & Armazenamento')}
            {renderTabButton('system', <Monitor size={18} />, 'Sistema')}
            {renderTabButton('backup', <Database size={18} />, 'Backup')}
            {renderTabButton('shortcuts', <Keyboard size={18} />, isDashboardMode ? 'Atalhos do App' : 'Atalhos')}
            {!isDashboardMode && renderTabButton('minigames', <Gamepad2 size={18} />, 'Minigames')}
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'appearance' && renderAppearanceTab()}
            {activeTab === 'vault' && renderVaultTab()}
            {activeTab === 'system' && renderSystemTab()}
            {activeTab === 'backup' && renderBackupTab()}
            {activeTab === 'shortcuts' && renderShortcutsTab()}
            {!isDashboardMode && activeTab === 'minigames' && renderMinigamesTab()}
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
