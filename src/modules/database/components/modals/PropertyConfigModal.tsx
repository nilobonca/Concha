import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Trash2,
  Plus,
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
  DollarSign,
} from 'lucide-react';
import {
  PropertyDefinition,
  PropertyType,
  NumberFormat,
  SelectOption,
  PropertyOptionColor,
  SELECT_OPTION_COLOR_MAP,
} from '../../types';
import { generatePropertyId, generateOptionId } from '../../utils/databaseDefaults';

export interface PropertyConfigModalProps {
  isOpen: boolean;
  property?: PropertyDefinition | null;
  onClose: () => void;
  onSave: (prop: PropertyDefinition) => void;
  onDelete?: (propertyId: string) => void;
}

const PROPERTY_TYPES_LIST: { type: PropertyType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Texto', icon: <Type className="w-4 h-4" /> },
  { type: 'number', label: 'Número', icon: <Hash className="w-4 h-4" /> },
  { type: 'select', label: 'Seleção', icon: <List className="w-4 h-4" /> },
  { type: 'multi-select', label: 'Múltipla Escolha', icon: <List className="w-4 h-4" /> },
  { type: 'status', label: 'Status', icon: <Activity className="w-4 h-4" /> },
  { type: 'date', label: 'Data', icon: <Calendar className="w-4 h-4" /> },
  { type: 'checkbox', label: 'Caixa de Seleção', icon: <CheckSquare className="w-4 h-4" /> },
  { type: 'url', label: 'URL / Link', icon: <Link className="w-4 h-4" /> },
  { type: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
  { type: 'files', label: 'Arquivos & Mídia', icon: <Paperclip className="w-4 h-4" /> },
  { type: 'relation', label: 'Relação (Vault)', icon: <GitFork className="w-4 h-4" /> },
];

const COLORS: PropertyOptionColor[] = [
  'blue',
  'cyan',
  'green',
  'amber',
  'rose',
  'purple',
  'indigo',
  'gray',
];

export const PropertyConfigModal: React.FC<PropertyConfigModalProps> = ({
  isOpen,
  property,
  onClose,
  onSave,
  onDelete,
}) => {
  const isEditing = Boolean(property);

  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('text');
  const [numberFormat, setNumberFormat] = useState<NumberFormat>('number');
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [newOptionName, setNewOptionName] = useState('');

  useEffect(() => {
    if (property) {
      setName(property.name);
      setType(property.type);
      setNumberFormat(property.numberFormat || 'number');
      setOptions(property.options ? [...property.options] : []);
    } else {
      setName('');
      setType('text');
      setNumberFormat('number');
      setOptions([]);
    }
    setNewOptionName('');
  }, [property, isOpen]);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (!newOptionName.trim()) return;
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const newOpt: SelectOption = {
      id: generateOptionId(),
      name: newOptionName.trim(),
      color: randomColor,
    };
    setOptions([...options, newOpt]);
    setNewOptionName('');
  };

  const handleRemoveOption = (optId: string) => {
    setOptions(options.filter((o) => o.id !== optId));
  };

  const handleChangeOptionColor = (optId: string, color: PropertyOptionColor) => {
    setOptions(
      options.map((o) => (o.id === optId ? { ...o, color } : o))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const propData: PropertyDefinition = {
      id: property?.id || generatePropertyId(),
      name: name.trim(),
      type,
      width: property?.width || 180,
      ...(type === 'number' ? { numberFormat } : {}),
      ...(type === 'select' || type === 'multi-select' ? { options } : {}),
      ...(type === 'status' ? { statusOptions: property?.statusOptions } : {}),
    };

    onSave(propData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white dark:bg-[#1E2238] rounded-2xl shadow-2xl border border-stone-200 dark:border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-white/10">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-[#F4F0E6]">
            {isEditing ? 'Editar Propriedade' : 'Nova Propriedade'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Property Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-[#B4D3F1] mb-1">
              Nome da Coluna / Propriedade
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Status, Prioridade, Estimativa..."
              autoFocus
              className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-lg text-stone-800 dark:text-[#F4F0E6] outline-none focus:border-[#52B1FF] transition-colors"
            />
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-[#B4D3F1] mb-1.5">
              Tipo de Dado
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1 bg-stone-50 dark:bg-white/5 rounded-xl border border-stone-200 dark:border-white/5">
              {PROPERTY_TYPES_LIST.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setType(item.type)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors text-left ${
                    type === item.type
                      ? 'bg-[#1831D7] text-white shadow-xs'
                      : 'text-stone-700 dark:text-[#B4D3F1]/80 hover:bg-stone-200/60 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Number format picker */}
          {type === 'number' && (
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-[#B4D3F1] mb-1">
                Formato Numérico
              </label>
              <select
                value={numberFormat}
                onChange={(e) => setNumberFormat(e.target.value as NumberFormat)}
                className="w-full px-3 py-1.5 text-xs bg-stone-50 dark:bg-[#232742] border border-stone-200 dark:border-white/10 rounded-lg text-stone-800 dark:text-[#F4F0E6] outline-none"
              >
                <option value="number">Número Normal (1.234)</option>
                <option value="currency_brl">Moeda Real (R$ 1.234,00)</option>
                <option value="currency_usd">Moeda Dólar ($ 1,234.00)</option>
                <option value="percent">Porcentagem (%)</option>
                <option value="compact">Compacto (1.2M)</option>
              </select>
            </div>
          )}

          {/* Options manager for Select and Multi-Select */}
          {(type === 'select' || type === 'multi-select') && (
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-[#B4D3F1] mb-1">
                Opções Pré-definidas
              </label>

              <div className="space-y-1.5 mb-2 max-h-32 overflow-y-auto">
                {options.map((opt) => {
                  const color = SELECT_OPTION_COLOR_MAP[opt.color] || SELECT_OPTION_COLOR_MAP.gray;
                  return (
                    <div
                      key={opt.id}
                      className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-white/5 border border-stone-200/60 dark:border-white/5"
                    >
                      <span
                        style={{
                          backgroundColor: color.bg,
                          color: color.text,
                          borderColor: color.border,
                        }}
                        className="px-2 py-0.5 rounded-full border text-xs font-medium truncate"
                      >
                        {opt.name}
                      </span>

                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5">
                          {COLORS.slice(0, 5).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => handleChangeOptionColor(opt.id, c)}
                              className={`w-3 h-3 rounded-full border ${
                                opt.color === c ? 'scale-125 border-white' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: SELECT_OPTION_COLOR_MAP[c].text }}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(opt.id)}
                          className="p-1 text-stone-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  placeholder="Nova opção..."
                  className="flex-1 px-3 py-1.5 text-xs bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-lg text-stone-800 dark:text-[#F4F0E6] outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="px-3 py-1.5 text-xs font-medium bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-white rounded-lg hover:bg-stone-300 dark:hover:bg-white/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-white/10">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (property) {
                    onDelete(property.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-[#B4D3F1] hover:bg-stone-100 dark:hover:bg-white/5 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#1831D7] dark:bg-[#7F95FF] text-white dark:text-[#17192A] rounded-lg disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
