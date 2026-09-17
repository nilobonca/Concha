import React from 'react';
import { DatabaseViewTabsList } from './DatabaseViewTabsList';
import { DatabaseToolbarActions } from './DatabaseToolbarActions';
import { DatabaseViewConfig, DatabaseViewType } from '../../types';

export interface DatabaseViewTabsProps {
  views: DatabaseViewConfig[];
  activeViewId: string;
  onSelectView: (viewId: string) => void;
  onAddView: (type: DatabaseViewType, name?: string) => void;
  onRenameView: (viewId: string, newName: string) => void;
  onDeleteView: (viewId: string) => void;
  onReorderViews?: (newViews: DatabaseViewConfig[]) => void;
  isInline?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  activeFilterCount?: number;
  onOpenFilterConfig?: () => void;
  activeSortCount?: number;
  onOpenSortConfig?: () => void;
  onOpenViewSettings?: () => void;
  onAddNewRow?: () => void;
}

export const DatabaseViewTabs: React.FC<DatabaseViewTabsProps> = ({
  views,
  activeViewId,
  onSelectView,
  onAddView,
  onRenameView,
  onDeleteView,
  onReorderViews,
  isInline = false,
  searchQuery,
  onSearchChange,
  activeFilterCount,
  onOpenFilterConfig,
  activeSortCount,
  onOpenSortConfig,
  onOpenViewSettings,
  onAddNewRow,
}) => {
  return (
    <div className="w-full flex flex-col select-none">
      {/* Container principal flex com abas em scroll invisível e ações no alinhamento à direita */}
      <div
        className={`w-full flex items-center justify-between gap-2 overflow-hidden ${
          isInline ? 'px-3 py-1' : 'px-6 py-1.5'
        }`}
      >
        {/* Componente 1: Lista de Abas de Visualização (Scroll horizontal invisível quando atinge as ações) */}
        <DatabaseViewTabsList
          views={views}
          activeViewId={activeViewId}
          onSelectView={onSelectView}
          onAddView={onAddView}
          onRenameView={onRenameView}
          onDeleteView={onDeleteView}
          onReorderViews={onReorderViews}
        />

        {/* Componente 2: Botões de Ação da Toolbar (Filtro, Ordenar, Pesquisa, Configurações, Novo) */}
        <DatabaseToolbarActions
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          activeFilterCount={activeFilterCount}
          onOpenFilterConfig={onOpenFilterConfig}
          activeSortCount={activeSortCount}
          onOpenSortConfig={onOpenSortConfig}
          onOpenViewSettings={onOpenViewSettings}
          onAddNewRow={onAddNewRow}
        />
      </div>
    </div>
  );
};
