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
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Pencil,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { PropertyDefinition, PropertyType, SortDirection } from '../../../types';

export interface TableColumnHeaderProps {
  property: PropertyDefinition;
  width: number;
  sortDirection?: SortDirection | null;
  onSortChange?: (propertyId: string, direction: SortDirection | null) => void;
  onEditProperty?: (property: PropertyDefinition) => void;
  onHideProperty?: (propertyId: string) => void;
  onDeleteProperty?: (propertyId: string) => void;
  onResizeStart: (propertyId: string, currentWidth: number, e: React.MouseEvent) => void;
}

const PROPERTY_ICONS: Record<PropertyType, React.ReactNode> = {
  title: <Type className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/70" />,
  text: <Type className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/70" />,
  number: <Hash className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/70" />,
  select: <List className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/70" />,
  'multi-select': <List className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/70" />,
  status: <Activity className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/70" />,
  date: <Calendar className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/70" />,
  checkbox: <CheckSquare className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/70" />,
  url: <Link className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/70" />,
  email: <Mail className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/70" />,
  phone: <Type className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/70" />,
  files: <Paperclip className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/70" />,
  relation: <GitFork className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/70" />,
  created_time: <Calendar className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/70" />,
  last_edited_time: <Calendar className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/70" />,
};

export const TableColumnHeader: React.FC<TableColumnHeaderProps> = ({
  property,
  width,
  sortDirection,
  onSortChange,
  onEditProperty,
  onHideProperty,
  onDeleteProperty,
  onResizeStart,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const isTitle = property.type === 'title';

  return (
    <div
      style={{ width: `${width}px`, minWidth: `${width}px` }}
      className="group relative h-9 flex items-center justify-between px-3 border-r border-stone-200 dark:border-white/10 select-none shrink-0"
    >
      {/* Title & Icon */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="shrink-0">{PROPERTY_ICONS[property.type] || PROPERTY_ICONS.text}</span>
        <span className="text-xs font-semibold text-stone-600 dark:text-[#B4D3F1] truncate">
          {property.name}
        </span>
        {sortDirection === 'asc' && (
          <ArrowUp className="w-3 h-3 text-[#52B1FF] shrink-0 ml-0.5" />
        )}
        {sortDirection === 'desc' && (
          <ArrowDown className="w-3 h-3 text-[#7F95FF] shrink-0 ml-0.5" />
        )}
      </div>

      {/* 3-dots Menu Button */}
      <div ref={menuRef} className="relative flex items-center">
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-stone-700 dark:hover:text-white rounded cursor-pointer transition-opacity"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>

        {isMenuOpen && (
          <div className="absolute top-full right-0 mt-1 w-44 bg-white dark:bg-[#1E2238] rounded-xl shadow-xl border border-stone-200 dark:border-white/10 z-50 p-1 backdrop-blur-md">
            {onSortChange && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onSortChange(property.id, sortDirection === 'asc' ? null : 'asc');
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-stone-700 dark:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer transition-colors text-left"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-[#52B1FF]" />
                  <span>Ordenar Crescente</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSortChange(property.id, sortDirection === 'desc' ? null : 'desc');
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-stone-700 dark:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer transition-colors text-left"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-[#7F95FF]" />
                  <span>Ordenar Decrescente</span>
                </button>
              </>
            )}

            {onEditProperty && !isTitle && (
              <button
                type="button"
                onClick={() => {
                  onEditProperty(property);
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-stone-700 dark:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer transition-colors text-left"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Editar Propriedade</span>
              </button>
            )}

            {onHideProperty && !isTitle && (
              <button
                type="button"
                onClick={() => {
                  onHideProperty(property.id);
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-stone-700 dark:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer transition-colors text-left"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Ocultar da Vista</span>
              </button>
            )}

            {onDeleteProperty && !isTitle && (
              <button
                type="button"
                onClick={() => {
                  onDeleteProperty(property.id);
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Coluna</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Column Resize Handle */}
      <div
        onMouseDown={(e) => onResizeStart(property.id, width, e)}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[#52B1FF] transition-colors"
      />
    </div>
  );
};
