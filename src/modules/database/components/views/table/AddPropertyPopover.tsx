import React, { useState, useRef, useEffect } from 'react';
import {
  Type,
  Hash,
  List,
  CheckSquare,
  Calendar,
  Link,
  Mail,
  Paperclip,
  GitFork,
  Activity,
  Check,
} from 'lucide-react';
import { PropertyType } from '../../../types';

export interface AddPropertyPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: PropertyType, name?: string) => void;
  showRowNumbers?: boolean;
  onToggleRowNumbers?: () => void;
}

const PROPERTY_TYPES: { type: PropertyType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Texto', icon: <Type className="w-3.5 h-3.5" /> },
  { type: 'number', label: 'Número', icon: <Hash className="w-3.5 h-3.5" /> },
  { type: 'select', label: 'Seleção', icon: <List className="w-3.5 h-3.5" /> },
  { type: 'multi-select', label: 'Múltipla Escolha', icon: <List className="w-3.5 h-3.5" /> },
  { type: 'status', label: 'Status', icon: <Activity className="w-3.5 h-3.5" /> },
  { type: 'date', label: 'Data', icon: <Calendar className="w-3.5 h-3.5" /> },
  { type: 'checkbox', label: 'Caixa de Seleção', icon: <CheckSquare className="w-3.5 h-3.5" /> },
  { type: 'url', label: 'URL / Link', icon: <Link className="w-3.5 h-3.5" /> },
  { type: 'email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" /> },
  { type: 'files', label: 'Arquivos & Mídia', icon: <Paperclip className="w-3.5 h-3.5" /> },
  { type: 'relation', label: 'Relação (Vault)', icon: <GitFork className="w-3.5 h-3.5" /> },
];

export const AddPropertyPopover: React.FC<AddPropertyPopoverProps> = ({
  isOpen,
  onClose,
  onSelectType,
  showRowNumbers = false,
  onToggleRowNumbers,
}) => {
  const [propertyName, setPropertyName] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      inputRef.current?.focus();
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute top-full left-0 mt-1 w-60 bg-white dark:bg-[#1E2238] rounded-xl shadow-2xl border border-stone-200 dark:border-white/10 z-50 p-2 backdrop-blur-md"
    >
      {/* Property Name Input */}
      <div className="mb-2">
        <input
          ref={inputRef}
          type="text"
          value={propertyName}
          onChange={(e) => setPropertyName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onClose();
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (propertyName.trim()) {
                onSelectType('text', propertyName.trim());
              }
            }
          }}
          placeholder="Nome da propriedade..."
          className="w-full px-2.5 py-1.5 text-xs bg-stone-50 dark:bg-[#232742] border border-stone-200 dark:border-white/10 rounded-lg text-stone-800 dark:text-[#F4F0E6] outline-none focus:border-[#52B1FF] transition-colors"
        />
      </div>

      {/* Row Numbers (#) Option inside the popover */}
      {onToggleRowNumbers && (
        <div className="mb-1">
          <button
            type="button"
            onClick={onToggleRowNumbers}
            className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors text-left ${
              showRowNumbers
                ? 'bg-[#1831D7]/10 dark:bg-[#52B1FF]/15 text-[#1831D7] dark:text-[#52B1FF] font-medium'
                : 'text-stone-700 dark:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-[#52B1FF]" />
              <span>Coluna de Numeração (#)</span>
            </div>
            {showRowNumbers ? (
              <span className="text-[10px] font-semibold text-[#52B1FF] flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Ativa
              </span>
            ) : (
              <span className="text-[10px] text-stone-400 dark:text-[#B4D3F1]/60">Adicionar</span>
            )}
          </button>
        </div>
      )}

      <div className="my-1.5 border-t border-stone-200 dark:border-white/10" />

      {/* Type list section */}
      <div className="px-2 py-1 text-[10px] font-semibold text-stone-400 dark:text-[#B4D3F1]/50 uppercase tracking-wider">
        Tipos de Propriedade
      </div>

      <div className="space-y-0.5 max-h-56 overflow-y-auto pr-0.5">
        {PROPERTY_TYPES.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onSelectType(item.type, propertyName.trim() || item.label)}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-stone-700 dark:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer transition-colors text-left"
          >
            <span className="text-stone-400 dark:text-[#B4D3F1]/70">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
