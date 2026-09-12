import React from 'react';
import { Eye, EyeOff, X, SlidersHorizontal, Layers, LayoutGrid, Hash } from 'lucide-react';
import { DatabaseViewConfig, PropertyDefinition, CardSize, RowHeight } from '../../types';

export interface ViewSettingsPopoverProps {
  isOpen: boolean;
  viewConfig: DatabaseViewConfig;
  properties: PropertyDefinition[];
  onUpdateViewConfig: (updates: Partial<DatabaseViewConfig>) => void;
  onClose: () => void;
}

export const ViewSettingsPopover: React.FC<ViewSettingsPopoverProps> = ({
  isOpen,
  viewConfig,
  properties,
  onUpdateViewConfig,
  onClose,
}) => {
  if (!isOpen) return null;

  const togglePropertyVisibility = (propId: string) => {
    const isVisible = viewConfig.visiblePropertyIds.includes(propId);
    let newVisible: string[];
    if (isVisible) {
      newVisible = viewConfig.visiblePropertyIds.filter((id) => id !== propId);
    } else {
      newVisible = [...viewConfig.visiblePropertyIds, propId];
    }
    onUpdateViewConfig({ visiblePropertyIds: newVisible });
  };

  const eligibleGroupByProps = properties.filter(
    (p) => p.type === 'select' || p.type === 'status' || p.type === 'checkbox'
  );

  const eligibleCoverProps = properties.filter(
    (p) => p.type === 'files' || p.type === 'url'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white dark:bg-[#1E2238] rounded-2xl shadow-2xl border border-stone-200 dark:border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#52B1FF]" />
            <h3 className="text-sm font-semibold text-stone-800 dark:text-[#F4F0E6]">
              Opções de Exibição
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
          {/* Group By (for board or table) */}
          {(viewConfig.type === 'board' || viewConfig.type === 'table') && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-[#B4D3F1] mb-1.5">
                <Layers className="w-3.5 h-3.5 text-[#52B1FF]" />
                <span>Agrupar por Coluna</span>
              </label>
              <select
                value={viewConfig.groupByPropertyId || ''}
                onChange={(e) =>
                  onUpdateViewConfig({ groupByPropertyId: e.target.value || undefined })
                }
                className="w-full px-3 py-1.5 text-xs bg-stone-50 dark:bg-[#232742] border border-stone-200 dark:border-white/10 rounded-lg text-stone-800 dark:text-[#F4F0E6] outline-none"
              >
                <option value="">Nenhum agrupamento</option>
                {eligibleGroupByProps.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Card Size (for gallery or board) */}
          {(viewConfig.type === 'gallery' || viewConfig.type === 'board') && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-[#B4D3F1] mb-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-[#52B1FF]" />
                <span>Tamanho dos Cards</span>
              </label>
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as CardSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => onUpdateViewConfig({ cardSize: size })}
                    className={`flex-1 py-1.5 text-xs rounded-lg border capitalize cursor-pointer transition-colors ${
                      (viewConfig.cardSize || 'medium') === size
                        ? 'border-[#1831D7] bg-[#1831D7]/10 text-[#1831D7] dark:border-[#52B1FF] dark:bg-[#52B1FF]/20 dark:text-[#52B1FF] font-medium'
                        : 'border-stone-200 dark:border-white/10 text-stone-600 dark:text-[#B4D3F1]/70'
                    }`}
                  >
                    {size === 'small' ? 'Pequeno' : size === 'medium' ? 'Médio' : 'Grande'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Row Height (for table) */}
          {viewConfig.type === 'table' && (
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-[#B4D3F1] mb-1.5">
                Altura das Linhas
              </label>
              <div className="flex gap-2">
                {(['compact', 'normal', 'spacious'] as RowHeight[]).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onUpdateViewConfig({ rowHeight: h })}
                    className={`flex-1 py-1.5 text-xs rounded-lg border capitalize cursor-pointer transition-colors ${
                      (viewConfig.rowHeight || 'normal') === h
                        ? 'border-[#1831D7] bg-[#1831D7]/10 text-[#1831D7] dark:border-[#52B1FF] dark:bg-[#52B1FF]/20 dark:text-[#52B1FF] font-medium'
                        : 'border-stone-200 dark:border-white/10 text-stone-600 dark:text-[#B4D3F1]/70'
                    }`}
                  >
                    {h === 'compact' ? 'Compacto' : h === 'normal' ? 'Normal' : 'Espaçoso'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Row Numbers (#) for table */}
          {viewConfig.type === 'table' && (
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-[#B4D3F1] mb-1.5">
                Coluna de Numeração (#)
              </label>
              <div
                onClick={() =>
                  onUpdateViewConfig({ showRowNumbers: !viewConfig.showRowNumbers })
                }
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                  viewConfig.showRowNumbers
                    ? 'border-[#52B1FF]/50 bg-stone-100 dark:bg-white/5 text-stone-800 dark:text-[#F4F0E6]'
                    : 'border-stone-200 dark:border-white/10 text-stone-500 dark:text-[#B4D3F1]/60 hover:bg-stone-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-[#52B1FF]" />
                  <span className="font-medium">Mostrar Coluna # (Número da linha)</span>
                </div>
                <button
                  type="button"
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-white"
                >
                  {viewConfig.showRowNumbers ? (
                    <Eye className="w-4 h-4 text-[#52B1FF]" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Cover Property (for gallery) */}
          {viewConfig.type === 'gallery' && eligibleCoverProps.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-[#B4D3F1] mb-1.5">
                Propriedade de Capa
              </label>
              <select
                value={viewConfig.coverPropertyId || ''}
                onChange={(e) =>
                  onUpdateViewConfig({ coverPropertyId: e.target.value || undefined })
                }
                className="w-full px-3 py-1.5 text-xs bg-stone-50 dark:bg-[#232742] border border-stone-200 dark:border-white/10 rounded-lg text-stone-800 dark:text-[#F4F0E6] outline-none"
              >
                <option value="">Nenhuma capa</option>
                {eligibleCoverProps.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Visible Properties Toggles */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-[#B4D3F1] mb-2">
              Propriedades Visíveis nesta Visualização
            </label>
            <div className="space-y-1">
              {properties.map((prop) => {
                const isVisible = viewConfig.visiblePropertyIds.includes(prop.id);
                const isTitle = prop.type === 'title';

                return (
                  <div
                    key={prop.id}
                    onClick={() => !isTitle && togglePropertyVisibility(prop.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isVisible
                        ? 'bg-stone-100 dark:bg-white/5 text-stone-800 dark:text-[#F4F0E6]'
                        : 'text-stone-400 dark:text-[#B4D3F1]/40 hover:bg-stone-50 dark:hover:bg-white/5'
                    } ${isTitle ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <span className="font-medium">{prop.name}</span>
                    <button
                      type="button"
                      disabled={isTitle}
                      className="text-stone-400 hover:text-stone-700 dark:hover:text-white"
                    >
                      {isVisible ? (
                        <Eye className="w-4 h-4 text-[#52B1FF]" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
