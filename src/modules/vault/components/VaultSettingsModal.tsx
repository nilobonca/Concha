import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useVaultStore } from '../hooks/useVaultStore';
import { 
  Settings, X, HardDrive, Database, FolderSync, Check, 
  Edit2, Folder, RefreshCw, Info, ArrowRight, ShieldCheck, Laptop, Trash2
} from 'lucide-react';
import { SafeIcon } from '@/components/common/SafeIcon';
import { 
  getCanvasNoteSyncPref, 
  setCanvasNoteSyncPref, 
  CanvasNoteSyncPref 
} from '../utils/canvasNoteSyncPref';

export const VaultSettingsModal: React.FC = () => {
  const { 
    settingsOpen, 
    setSettingsOpen, 
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

  const [nameInput, setNameInput] = useState(vaultName);
  const [nameSaved, setNameSaved] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(true);
  const [syncPref, setSyncPref] = useState<CanvasNoteSyncPref>('ask');

  useEffect(() => {
    setNameInput(vaultName);
  }, [vaultName]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const skip = localStorage.getItem('vault_skip_delete_confirm') === 'true';
      setConfirmDelete(!skip);
      setSyncPref(getCanvasNoteSyncPref());
    }
  }, [settingsOpen]);

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

  // Handle ESC key to close
  useEffect(() => {
    if (!settingsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen, setSettingsOpen]);

  if (!settingsOpen) return null;

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== vaultName) {
      await setVaultName(trimmed);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2500);
    }
  };

  const handleConnectWindowsFolder = async () => {
    try {
      setIsConnecting(true);
      const success = await connectFSA(vaultId, true);
      if (success) {
        await refreshNodes();
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleReconnectWindowsFolder = async () => {
    try {
      setIsConnecting(true);
      await connectFSA(vaultId, false);
      await refreshNodes();
    } catch (err) {
      console.warn('Falha ao reconectar pasta:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSwitchToIDB = async () => {
    if (confirm('Deseja alternar para o banco de dados interno (IndexedDB)? Seus arquivos na pasta do Windows permanecerão intactos no seu computador.')) {
      await connectIDB();
      await refreshNodes();
    }
  };

  const totalFiles = getAllFiles().length;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 backdrop-blur-xs flex animate-in fade-in duration-150 select-none"
      onClick={() => setSettingsOpen(false)}
    >
      <div 
        className="ml-11 h-full w-[440px] max-w-[calc(100vw-44px)] bg-white dark:bg-[#16161D] border-r border-stone-200 dark:border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200 text-stone-900 dark:text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200/90 dark:border-white/10 flex items-center justify-between bg-stone-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1831D7]/10 border border-[#7F95FF]/30 flex items-center justify-center text-[#1831D7] dark:text-[#7F95FF] shrink-0">
              <SafeIcon size={20} className="text-[#1831D7] dark:text-[#7F95FF]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-neutral-100">
                Configurações do Vault
              </h2>
              <p className="text-xs text-stone-500 dark:text-neutral-400">
                Vincule pastas locais do Windows, gerencie armazenamento e opções
              </p>
            </div>
          </div>

          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 hover:bg-stone-200/70 dark:hover:bg-white/10 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
            title="Fechar configurações (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar text-xs">
          
          {/* Section 1: Vincular Pasta do Windows (FSA / Local File System) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-[#1831D7] dark:text-[#7F95FF]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-neutral-400">
                Vincular Pasta do Windows & Armazenamento
              </h3>
            </div>

            {/* Current Storage Status Box */}
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
                      disabled={isConnecting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isConnecting ? (
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
                          O acesso à pasta local deste Vault precisa de autorização do navegador para abrir e criar notas.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-amber-200/70 dark:border-amber-800/30">
                    <button
                      onClick={handleReconnectWindowsFolder}
                      disabled={isConnecting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1831D7] hover:bg-[#1831D7]/90 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isConnecting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FolderSync className="w-3.5 h-3.5" />
                      )}
                      <span>Reconectar Pasta</span>
                    </button>

                    <button
                      onClick={handleConnectWindowsFolder}
                      disabled={isConnecting}
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
                      Seus arquivos estão salvos no armazenamento local do navegador. Você pode vincular uma pasta do Windows a qualquer momento para editar suas notas diretamente no Explorador de Arquivos, Obsidian ou VS Code.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#7F95FF]/30">
                  <button
                    onClick={handleConnectWindowsFolder}
                    disabled={isConnecting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1831D7] hover:bg-[#1831D7]/90 text-white font-semibold text-xs transition-all cursor-pointer shadow-md shadow-[#1831D7]/20 disabled:opacity-50"
                  >
                    {isConnecting ? (
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

          {/* Section 2: Nome do Vault (Identidade) */}
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
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                }}
                placeholder="Nome do seu Vault..."
                className="flex-1 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-stone-900 dark:text-neutral-100 outline-none focus:border-[#7F95FF]"
              />
              <button
                onClick={handleSaveName}
                disabled={!nameInput.trim() || nameInput.trim() === vaultName}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1831D7] hover:bg-[#1831D7]/90 disabled:opacity-40 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                {nameSaved ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{nameSaved ? 'Salvo!' : 'Salvar Nome'}</span>
              </button>
            </div>
          </div>

          {/* Section 3: Lixeira & Confirmação de Exclusão */}
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
                  Exibe o modal de confirmação com aviso de envio para a lixeira do Windows e alerta de links antes de apagar notas ou pastas.
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

          {/* Section: Sincronização de Notas no Canvas */}
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
                  Define o comportamento ao alterar o texto de uma nota vinculada diretamente na tela do canvas.
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

          {/* Section 4: Informações e Estatísticas */}
          <div className="space-y-2 pt-2 border-t border-stone-200/80 dark:border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-neutral-400">
              Informações do Sistema
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/[0.02] border border-stone-200/70 dark:border-white/5">
                <span className="text-[11px] text-stone-500 dark:text-neutral-400 block">Total de Arquivos & Notas</span>
                <span className="font-bold text-sm text-stone-900 dark:text-neutral-100">{totalFiles} itens</span>
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

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200/90 dark:border-white/10 flex items-center justify-end bg-stone-50/70 dark:bg-white/[0.02]">
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-stone-200/80 dark:bg-white/10 hover:bg-stone-300/80 dark:hover:bg-white/15 text-stone-800 dark:text-neutral-200 font-medium text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
