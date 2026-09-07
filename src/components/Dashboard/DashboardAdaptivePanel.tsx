import React from 'react';
import { Layer } from '@/interfaces/utils/indexedDB';
import { RegisteredVault } from '@/modules/vault/hooks/useVaultRegistry';
import { DashboardTab } from './DashboardSidebarRibbon';
import { ActiveVaultPanelSection } from './adaptive/ActiveVaultPanelSection';
import { CanvasesQuickPanelSection } from './adaptive/CanvasesQuickPanelSection';
import { WindowControls } from '@/components/common/WindowControls';
import { ConchaLogo } from '@/components/common/ConchaLogo';
import clsx from 'clsx';

export interface DashboardAdaptivePanelProps {
  activeTab: DashboardTab;
  // Vault Data & Actions
  activeVault: RegisteredVault;
  vaults: RegisteredVault[];
  onRenameVault: (id: string, newName: string) => void;
  onSwitchVault: (vault: RegisteredVault, forcePicker?: boolean) => Promise<boolean | void> | void;
  onConnectFSA: () => Promise<boolean | void> | void;
  onCreateVault?: () => void;
  onRemoveVault?: (id: string, deleteDiskFolder?: boolean) => Promise<boolean | void> | void;
  onOpenSettings?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
  isConnectingFSA?: boolean;
  // Canvas Data & Actions
  canvases: Layer[];
  projectPageCounts?: Record<string, number>;
  onCreateCanvas?: (type?: 'board' | 'audio') => void;
  onOpenCanvas?: (canvas: Layer) => void;
  onRenameCanvas?: (canvasId: string, newName: string) => void;
  onDeleteCanvas?: (canvas: Layer) => void;
  onUpdateCanvas?: (canvas: Layer) => void;
  // Appearance
  className?: string;
  theme?: string;
}

export const DashboardAdaptivePanel: React.FC<DashboardAdaptivePanelProps> = ({
  activeTab,
  activeVault,
  vaults,
  onRenameVault,
  onSwitchVault,
  onConnectFSA,
  onCreateVault,
  onRemoveVault,
  onOpenSettings,
  onExportBackup,
  onImportBackup,
  isConnectingFSA = false,
  canvases,
  projectPageCounts = {},
  onCreateCanvas,
  onOpenCanvas,
  onRenameCanvas,
  onDeleteCanvas,
  onUpdateCanvas,
  className,
  theme,
}) => {
  const isLight = theme === 'light';

  return (
    <aside
      aria-label="Painel Lateral Adaptativo"
      className={clsx(
        "w-full sm:w-[370px] lg:w-[380px] h-full shrink-0 z-20 flex flex-col p-4 sm:p-5 overflow-hidden app-region-no-drag",
        "border-r transition-colors duration-300",
        isLight
          ? "bg-[#F4F0E6] border-black/[0.08] shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
          : "bg-[#131524] border-white/[0.07] shadow-[10px_0_30px_rgba(0,0,0,0.4)]",
        className
      )}
    >
      {/* Launcher Header & Drag Area for Electron */}
      <div 
        className="w-full h-8 flex items-center justify-between select-none -mt-1 mb-3 shrink-0 pointer-events-auto app-region-drag"
      >
        <div 
          className="flex items-center gap-2 app-region-no-drag pointer-events-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ConchaLogo className="w-3.5 h-3.5" theme={theme} />
          <span className="text-xs font-bold text-stone-700 dark:text-neutral-300 tracking-wide">Concha</span>
        </div>
        <div 
          className="flex-1 h-full app-region-drag cursor-default"
          title="Arrastar Janela"
        />
        {/* Controles de Janela (.exe Electron) visíveis quando a área direita estiver oculta */}
        <div 
          className="md:hidden app-region-no-drag flex items-center pointer-events-auto shrink-0"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <WindowControls variant="compact" />
        </div>
      </div>

      {/* ============================================================
          DYNAMIC CONTENT BASED ON ACTIVE TAB
          ============================================================ */}
      {activeTab === 'active-vault' && (
        <ActiveVaultPanelSection
          activeVault={activeVault}
          vaults={vaults}
          onSwitchVault={onSwitchVault}
          onCreateVault={onCreateVault}
          onRemoveVault={onRemoveVault}
          onRenameVault={onRenameVault}
          onConnectFSA={onConnectFSA}
          onOpenSettings={onOpenSettings}
          onExportBackup={onExportBackup}
          onImportBackup={onImportBackup}
          isConnectingFSA={isConnectingFSA}
        />
      )}

      {activeTab === 'canvases' && (
        <CanvasesQuickPanelSection
          canvases={canvases}
          vaults={vaults}
          activeVaultId={activeVault.id}
          projectPageCounts={projectPageCounts}
          onCreateCanvas={onCreateCanvas}
          onOpenCanvas={onOpenCanvas}
          onRenameCanvas={onRenameCanvas}
          onDeleteCanvas={onDeleteCanvas}
          onUpdateCanvas={onUpdateCanvas}
        />
      )}
    </aside>
  );
};
