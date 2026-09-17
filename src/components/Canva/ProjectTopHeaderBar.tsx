import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  ArrowLeft, 
  BookOpen, 
  Edit2, 
  Users, 
  MessageSquare, 
  Dices, 
  Power, 
  X, 
  Check 
} from 'lucide-react';
import { WindowControls } from '@/components/common/WindowControls';
import { isElectron } from '@/utils/electronHelper';
import { SafeIcon } from '@/components/common/SafeIcon';
import { navigateToVault } from '@/utils/navigationHelper';
import { Layer } from '@/interfaces/utils/indexedDB';
import clsx from 'clsx';

export interface ProjectTopHeaderBarProps {
  projectId: string | string[];
  projectName: string;
  setProjectName: (name: string) => void;
  isEditingName: boolean;
  setIsEditingName: (editing: boolean) => void;
  tempName: string;
  setTempName: (name: string) => void;
  handleSaveName: () => void;
  activeLayers: Layer[];
  isTheaterMode?: boolean;

  // Session Props
  isSessionActive: boolean;
  setIsSessionActive: (active: boolean) => void;
  showInviteModal: boolean;
  setShowInviteModal: (show: boolean) => void;
  listenersOpen: boolean;
  setListenersOpen: (open: boolean) => void;
  sessionListeners: any[];
  onKickListener?: (listenerId: string) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  hasUnreadMessages: boolean;
  isDiceTrayOpen?: boolean;
  setIsDiceTrayOpen?: (open: boolean) => void;
}

/**
 * Barra Superior Unificada do Canvas de Projeto (RPGSA Supercanvas)
 * Conecta HeaderProjectBar + SessionStatusUI + WindowControls em um único container nativo.
 * Suporta arrasto nativo da janela no Electron em todas as áreas livres (WebkitAppRegion: 'drag')
 * mantendo clique imediato e responsivo em todos os botões (WebkitAppRegion: 'no-drag').
 */
export const ProjectTopHeaderBar: React.FC<ProjectTopHeaderBarProps> = ({
  projectId,
  projectName,
  setProjectName,
  isEditingName,
  setIsEditingName,
  tempName,
  setTempName,
  handleSaveName,
  activeLayers,
  isTheaterMode = false,

  isSessionActive,
  setIsSessionActive,
  showInviteModal,
  setShowInviteModal,
  listenersOpen,
  setListenersOpen,
  sessionListeners,
  onKickListener,
  isChatOpen,
  setIsChatOpen,
  hasUnreadMessages,
  isDiceTrayOpen,
  setIsDiceTrayOpen,
}) => {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isElec, setIsElec] = useState(false);

  useEffect(() => {
    setIsElec(isElectron());
  }, []);

  const pId = Array.isArray(projectId) ? projectId[0] : projectId;
  const currentLayer = activeLayers.find(l => l.id === pId);
  const displayName = currentLayer?.name || projectName || 'Projeto Sem Nome';

  return (
    <>
      {/* Top Header Bar Container — Arrastável nativamente em todas as áreas livres */}
      <header
        className={clsx(
          "fixed top-0 inset-x-0 h-[calc(2.75rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] z-50 flex items-center justify-between px-3 select-none transition-opacity duration-300 pointer-events-auto",
          "bg-white/80 dark:bg-[#0c0c12]/85 backdrop-blur-md border-b border-black/5 dark:border-white/10 text-stone-900 dark:text-neutral-100",
          "app-region-drag",
          isTheaterMode ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* ============================================================
            LADO ESQUERDO: Voltar + Vault + Nome do Projeto (Editável)
            ============================================================ */}
        <div
          className="flex items-center gap-2 app-region-no-drag shrink-0 pointer-events-auto"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Botão Voltar para o Vault */}
          <button
            type="button"
            onClick={() => navigateToVault(router)}
            className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Voltar para o Vault"
          >
            <ArrowLeft size={16} />
          </button>

          {/* Botão Vault */}
          <button
            type="button"
            onClick={() => navigateToVault(router)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-[#1831D7]/10 hover:bg-[#1831D7]/20 text-[#1831D7] dark:text-[#7F95FF] border border-[#1831D7]/25 transition-all cursor-pointer"
            title="Abrir Vault de Notas"
          >
            <SafeIcon size={14} />
            <span>Vault</span>
          </button>

          <div className="h-4 w-px bg-stone-300 dark:bg-neutral-700 mx-1 shrink-0" />

          {/* Nome do Projeto (Editável) */}
          {isEditingName ? (
            <div className="flex items-center gap-1 app-region-no-drag">
              <input
                className="font-bold text-sm bg-transparent border-b-2 border-[#1831D7] dark:border-[#7F95FF] text-stone-900 dark:text-neutral-100 focus:outline-none px-1 py-0.5"
                style={{ width: `${Math.max(tempName.length, 1) + 2}ch`, WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                autoFocus
                maxLength={120}
              />
              <span className="text-[10px] text-stone-400 font-mono">
                {tempName.length}/120
              </span>
            </div>
          ) : (
            <div
              onClick={() => {
                setTempName(displayName);
                setIsEditingName(true);
              }}
              className="font-bold text-sm cursor-pointer transition-colors flex items-center gap-1.5 group select-none text-stone-800 dark:text-neutral-200 hover:text-[#1831D7] dark:hover:text-[#7F95FF] app-region-no-drag"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              title="Clique para renomear"
            >
              <span className="truncate max-w-[240px]">
                {displayName}
              </span>
              <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 dark:text-neutral-500" />
            </div>
          )}
        </div>

        {/* ============================================================
            CENTRO: Área Livre de Arrastar Janela do Windows (Electron)
            ============================================================ */}
        <div 
          className="flex-1 h-full min-w-8 app-region-drag cursor-default"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          title="Arrastar Janela"
        />

        {/* ============================================================
            LADO DIREITO: Sessão + Convidar + Dados + Ouvintes + Chat + Controles Janela
            ============================================================ */}
        <div
          className="flex items-center gap-1.5 app-region-no-drag shrink-0 pointer-events-auto"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Status Ao Vivo / Offline */}
          <button
            type="button"
            onClick={() => setIsSessionActive(!isSessionActive)}
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer",
              isSessionActive 
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 border border-rose-500/20" 
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20"
            )}
            title={isSessionActive ? "Desligar Sessão" : "Ligar Sessão"}
          >
            {isSessionActive ? (
              <>
                <span className="flex h-2 w-2 relative pointer-events-none">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="pointer-events-none">Ao Vivo</span>
              </>
            ) : (
              <>
                <Power size={12} className="pointer-events-none" />
                <span className="pointer-events-none">Offline</span>
              </>
            )}
          </button>

          {/* Convidar */}
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[#1831D7] hover:bg-[#1831D7]/90 text-white rounded-md transition-colors cursor-pointer shadow-xs"
          >
            <Users size={12} className="pointer-events-none" />
            <span>Convidar</span>
          </button>

          <div className="h-4 w-px bg-stone-300 dark:bg-neutral-700 mx-0.5 shrink-0" />

          {/* Dados */}
          <button
            type="button"
            onClick={() => setIsDiceTrayOpen && setIsDiceTrayOpen(!isDiceTrayOpen)}
            className={clsx(
              "flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
              isDiceTrayOpen 
                ? "bg-[#1831D7] text-white" 
                : "text-stone-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10"
            )}
          >
            <Dices size={13} className="pointer-events-none" />
            <span>Dados</span>
          </button>

          {isSessionActive && (
            <>
              {/* Ouvintes */}
              <button
                type="button"
                onClick={() => setListenersOpen(!listenersOpen)}
                className={clsx(
                  "flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
                  listenersOpen 
                    ? "bg-black/10 dark:bg-white/15 text-stone-900 dark:text-white" 
                    : "text-stone-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10"
                )}
              >
                <Users size={13} className="pointer-events-none" />
                <span>Ouvintes ({sessionListeners.length})</span>
              </button>

              {/* Chat */}
              <button
                type="button"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={clsx(
                  "flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer relative",
                  isChatOpen 
                    ? "bg-[#1831D7] text-white" 
                    : hasUnreadMessages
                      ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                      : "text-stone-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10"
                )}
              >
                <MessageSquare size={13} className={clsx("pointer-events-none", hasUnreadMessages && !isChatOpen ? "animate-pulse" : "")} />
                <span>Chat</span>
                {hasUnreadMessages && !isChatOpen && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white dark:border-neutral-900 pointer-events-none"></span>
                )}
              </button>
            </>
          )}

          {/* Controles de Janela do Windows (.exe Electron) */}
          {isElec && (
            <>
              <div className="h-4 w-px bg-stone-300 dark:bg-neutral-700 mx-1 shrink-0" />
              <WindowControls variant="compact" />
            </>
          )}
        </div>
      </header>

      {/* ============================================================
          MODAL DE CONVITE (COMPARTILHAMENTO DE SESSÃO)
          ============================================================ */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
          <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="text-[#1831D7] dark:text-[#7F95FF]" size={20} />
                  Sessão Compartilhada
                </h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                  Convide ouvintes para escutar seus áudios espaciais em tempo real.
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200 p-1 rounded transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 my-4">
              {/* Session Status Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-neutral-800/40 rounded-lg border border-gray-100 dark:border-neutral-800">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500 block">Status da Sessão</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-neutral-200 mt-1 block">
                    {isSessionActive ? 'Sessão Ativa' : 'Sessão Inativa'}
                  </span>
                </div>
                <button
                  onClick={() => setIsSessionActive(!isSessionActive)}
                  className={`px-4 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer ${
                    isSessionActive
                      ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500'
                      : 'bg-[#1831D7] hover:bg-[#1831D7]/90 text-white shadow-md shadow-[#1831D7]/20'
                  }`}
                >
                  {isSessionActive ? 'Desativar' : 'Ativar Sessão'}
                </button>
              </div>

              {/* Invite Link Details */}
              {isSessionActive ? (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">Link de Convite</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/project/${pId}/session` : ''}
                      className="flex-1 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 dark:text-neutral-300 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          const textToCopy = `${window.location.origin}/project/${pId}/session`;
                          if (navigator.clipboard && window.isSecureContext) {
                              navigator.clipboard.writeText(textToCopy);
                          } else {
                              const textArea = document.createElement("textarea");
                              textArea.value = textToCopy;
                              textArea.style.position = "fixed";
                              textArea.style.left = "-999999px";
                              textArea.style.top = "-999999px";
                              document.body.appendChild(textArea);
                              textArea.focus();
                              textArea.select();
                              try {
                                  document.execCommand('copy');
                              } catch (err) {
                                  console.error('Fallback copy failed', err);
                              }
                              textArea.remove();
                          }
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }
                      }}
                      className="bg-[#1831D7] hover:bg-[#1831D7]/90 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-w-[80px]"
                    >
                      {copied ? (
                        <>
                          <Check size={14} />
                          Copiado
                        </>
                      ) : (
                        'Copiar'
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-normal">
                    Compartilhe este link com as pessoas. Ao entrar, elas aparecerão no seu canvas como pins e ouvirão os sons da cena.
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-gray-200 dark:border-neutral-800 rounded-lg text-xs text-gray-500 dark:text-neutral-500 font-medium">
                  Ative a sessão acima para gerar o link de convite.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-neutral-800 mt-4">
              <button
                onClick={() => setShowInviteModal(false)}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-800 dark:text-neutral-200 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          DROPDOWN DE OUVINTES CONECTADOS
          ============================================================ */}
      {listenersOpen && isSessionActive && (
        <div className="fixed top-12 right-4 z-50 w-64 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto">
          <div className="bg-gray-50 dark:bg-neutral-800/50 px-3 py-2 border-b border-gray-200 dark:border-neutral-800 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-700 dark:text-neutral-300">Ouvintes Conectados</span>
            <span className="bg-[#1831D7]/10 text-[#1831D7] dark:bg-[#1831D7]/20 dark:text-[#7F95FF] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {sessionListeners.length}
            </span>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {sessionListeners.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500 dark:text-neutral-500">
                Nenhum ouvinte na sessão no momento.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-neutral-800/50">
                {sessionListeners.map(listener => (
                  <li key={listener.listenerId} className="px-3 py-2.5 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-[#1831D7]/10 dark:bg-[#1831D7]/20 flex items-center justify-center shrink-0">
                      <Users size={12} className="text-[#1831D7] dark:text-[#7F95FF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-neutral-200 truncate">
                        {listener.name || 'Convidado'}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-neutral-500 truncate">
                        ID: {listener.listenerId.substring(0, 8)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]"></div>
                      {onKickListener && (
                        <button
                          onClick={() => onKickListener(listener.listenerId)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                          title="Expulsar convidado"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
};
