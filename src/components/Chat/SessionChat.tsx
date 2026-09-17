import React, { useState, useRef, useEffect } from 'react';
import { Send, Volume2, VolumeX, X, MessageSquare, Dices, Trash2 } from 'lucide-react';
import { ChatMessage } from '@/interfaces/chat';
import { formatTimestamp } from '@/utils/time';
import { DiceTray } from '@/components/Dice/DiceTray';
import { useClickOutside } from '@/hooks/useClickOutside';

interface SessionChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string, isRoll?: boolean) => void;
  title?: string;
  onClose?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  className?: string;
  isHost?: boolean;
  saveChatEnabled?: boolean;
  onToggleSaveChat?: () => void;
  onClear?: () => void;
}

export const SessionChat: React.FC<SessionChatProps> = ({
  messages,
  currentUserId,
  onSendMessage,
  title = "Chat da Sessão",
  onClose,
  soundEnabled,
  onToggleSound,
  className = "",
  isHost,
  saveChatEnabled,
  onToggleSaveChat,
  onClear
}) => {
  const [text, setText] = useState('');
  const chatListRef = useRef<HTMLDivElement>(null);
  const diceMenuContainerRef = useRef<HTMLDivElement>(null);
  const [showDiceMenu, setShowDiceMenu] = useState(false);

  useClickOutside({
    ref: diceMenuContainerRef,
    onClose: () => setShowDiceMenu(false),
    enabled: showDiceMenu,
  });

  const scrollToBottom = () => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  };


  return (
    <div className={`flex flex-col bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-gray-200/50 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-950 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-[#7F95FF]" />
          <h3 className="font-semibold text-neutral-200 text-sm">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {isHost && onToggleSaveChat && (
            <button
              onClick={onToggleSaveChat}
              title={saveChatEnabled ? "Histórico será salvo no projeto" : "Histórico temporário (não será salvo)"}
              className={`text-xs px-2 py-1 rounded transition-colors ${saveChatEnabled ? 'bg-[#1831D7]/20 text-[#7F95FF]' : 'bg-neutral-800 text-neutral-500'}`}
            >
              {saveChatEnabled ? 'Salvar Histórico: ON' : 'Salvar Histórico: OFF'}
            </button>
          )}
          {onClear && (
            <button
              onClick={onClear}
              className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-md transition-colors"
              title="Limpar Chat"
            >
              <Trash2 size={16} />
            </button>
          )}
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
              title={soundEnabled ? "Desativar notificações sonoras" : "Ativar notificações sonoras"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors ml-1"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={chatListRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] bg-neutral-900/50">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-neutral-500 text-xs">
            Nenhuma mensagem ainda.<br />Mande um olá para começar!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            
            if (msg.isRoll) {
              return (
                <div key={msg.id} className="flex flex-col items-center my-3">
                  <div className="text-[11px] text-neutral-400 font-medium tracking-wide mb-1">
                    {isMe ? 'Você' : msg.senderName} • {formatTimestamp(msg.timestamp)}
                  </div>
                  <div 
                    className="px-5 py-3 w-full max-w-[90%] bg-gradient-to-br from-[#17192A] via-[#131524] to-[#17192A] border border-[#7F95FF]/40 rounded-2xl shadow-xl text-[15px] text-[#F4F0E6] font-medium tracking-wide text-center"
                    dangerouslySetInnerHTML={{ 
                      __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white text-[16px] drop-shadow-sm">$1</strong>') 
                    }}
                  />
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1`}>
                <span className="text-[11px] text-neutral-400 font-medium tracking-wide mb-1 px-1">
                  {isMe ? 'Você' : msg.senderName} • {formatTimestamp(msg.timestamp)}
                </span>
                <div 
                  className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-[15px] leading-relaxed break-words shadow-md ${
                    isMe 
                      ? 'bg-[#1831D7] text-white rounded-tr-sm border border-[#7F95FF]/40' 
                      : 'bg-neutral-800/95 text-neutral-100 border border-neutral-700/80 rounded-tl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div ref={diceMenuContainerRef} className="p-3 bg-neutral-950 border-t border-neutral-800 relative">
        {showDiceMenu && (
          <div className="absolute bottom-[100%] right-0 mb-2">
            <DiceTray 
              onClose={() => setShowDiceMenu(false)}
              onRoll={(resultText, isPrivate) => {
                if (!isPrivate) {
                  onSendMessage(resultText, true);
                }
                setShowDiceMenu(false);
              }}
            />
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowDiceMenu(!showDiceMenu)}
            className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
              showDiceMenu ? 'bg-[#1831D7] text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
            }`}
            title="Rolar Dados"
          >
            <Dices size={18} />
          </button>
          <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite uma mensagem..."
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#7F95FF] focus:ring-1 focus:ring-[#7F95FF] transition-all"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="bg-[#1831D7] hover:bg-[#1831D7]/90 disabled:bg-neutral-800 disabled:text-neutral-500 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
