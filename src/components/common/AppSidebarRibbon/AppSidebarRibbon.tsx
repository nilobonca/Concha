import React, { useState } from 'react';
import { 
  Box, 
  Files, 
  Network, 
  FolderKanban, 
  LayoutTemplate, 
  Search, 
  Link2 
} from 'lucide-react';
import { SafeIcon } from '@/components/common/SafeIcon';
import { RibbonLogo } from './RibbonLogo';
import { RibbonIconButton } from './RibbonIconButton';
import { RibbonFooter } from './RibbonFooter';
import { VaultMenuPopover } from './VaultMenuPopover';
import { CreateVaultModal } from '@/components/Dashboard/CreateVaultModal';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { useVaultRegistry, RegisteredVault } from '@/modules/vault/hooks/useVaultRegistry';
import { useThemeStore } from '@/store/themeStore';
import clsx from 'clsx';

export type DashboardTab = 'active-vault' | 'canvases';

export interface DashboardRibbonVariantProps {
  variant: 'dashboard';
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenSettings: () => void;
  theme?: string;
  onToggleTheme?: () => void;
  className?: string;
}

export interface VaultRibbonVariantProps {
  variant: 'vault';
  onOpenGraph: () => void;
  onCreateBoardCanvas: () => void;
  className?: string;
}

export type AppSidebarRibbonProps = DashboardRibbonVariantProps | VaultRibbonVariantProps;

export const AppSidebarRibbon: React.FC<AppSidebarRibbonProps> = (props) => {
  const isDashboard = props.variant === 'dashboard';

  // Global Theme Store
  const globalTheme = useThemeStore((s) => s.theme);
  const globalToggleTheme = useThemeStore((s) => s.toggleTheme);

  const activeTheme = isDashboard && props.theme ? props.theme : globalTheme;
  const onToggleTheme = isDashboard && props.onToggleTheme ? props.onToggleTheme : globalToggleTheme;
  const isLight = activeTheme === 'light';

  // Vault Store & Registry (used when variant === 'vault')
  const vaultStore = useVaultStore();
  const vaultRegistry = useVaultRegistry();

  const [vaultMenuOpen, setVaultMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Handlers for Vault Mode
  const handleToggleFilesTab = () => {
    if (!vaultStore.sidebarOpen) {
      vaultStore.toggleSidebar();
      vaultStore.setSidebarTab('files');
    } else if (vaultStore.sidebarTab === 'files') {
      vaultStore.toggleSidebar();
    } else {
      vaultStore.setSidebarTab('files');
    }
  };

  const handleToggleCanvasesTab = () => {
    if (!vaultStore.sidebarOpen) {
      vaultStore.toggleSidebar();
      vaultStore.setSidebarTab('canvases');
    } else if (vaultStore.sidebarTab === 'canvases') {
      vaultStore.toggleSidebar();
    } else {
      vaultStore.setSidebarTab('canvases');
    }
  };

  const handleSelectVault = async (targetVault: RegisteredVault) => {
    if (targetVault.id === vaultRegistry.activeVaultId && vaultStore.isConnected) {
      setVaultMenuOpen(false);
      return;
    }
    const ok = await vaultRegistry.switchVault(targetVault);
    if (ok) {
      await vaultStore.refreshNodes();
    }
    setVaultMenuOpen(false);
  };

  const handleSaveVaultName = async (newName: string) => {
    await vaultStore.setVaultName(newName);
  };

  return (
    <>
      <aside
        aria-label={isDashboard ? "Barra de Navegação Lateral" : "Barra de Navegação Lateral do Vault"}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className={clsx(
          "w-11 h-full min-h-screen shrink-0 z-30 flex flex-col items-center justify-between py-2 select-none app-region-no-drag",
          "border-r transition-colors duration-300",
          isLight
            ? "bg-[#EDE8DD] border-black/[0.08] shadow-[4px_0_24px_rgba(0,0,0,0.03)]"
            : "bg-[#131524] border-white/[0.07] shadow-[4px_0_24px_rgba(0,0,0,0.4)]",
          props.className
        )}
      >
        {/* TOP: LOGO / MARCA CONCHA */}
        <div className="flex flex-col items-center gap-2">
          <RibbonLogo theme={activeTheme} />

          {/* NAVIGATION ITEMS */}
          <nav className="flex flex-col items-center gap-1" role="tablist">
            {isDashboard ? (
              <>
                {/* 1. Vault Ativo */}
                <RibbonIconButton
                  icon={SafeIcon}
                  label="Vault Ativo"
                  subtitle="Configurações e Detalhes"
                  isSelected={props.activeTab === 'active-vault'}
                  isLight={isLight}
                  showActiveIndicator={props.activeTab === 'active-vault'}
                  activeIndicatorTitle="Vault conectado e ativo"
                  onClick={() => props.onSelectTab('active-vault')}
                />

                {/* 2. Baú de Canvas */}
                <RibbonIconButton
                  icon={Box}
                  label="Baú de Canvas"
                  subtitle="Acesso Rápido aos Canvas"
                  isSelected={props.activeTab === 'canvases'}
                  isLight={isLight}
                  onClick={() => props.onSelectTab('canvases')}
                />
              </>
            ) : (
              <>
                {/* 1. Vault Ativo com Popover */}
                <RibbonIconButton
                  icon={SafeIcon}
                  label="Vault Ativo"
                  subtitle={vaultStore.vaultName}
                  isSelected={vaultMenuOpen}
                  isLight={isLight}
                  showActiveIndicator={true}
                  activeIndicatorTitle={
                    vaultStore.storageType === 'fsa'
                      ? 'Vault conectado via HD Local'
                      : 'Vault conectado via IndexedDB'
                  }
                  onClick={() => setVaultMenuOpen((prev) => !prev)}
                >
                  <VaultMenuPopover
                    isOpen={vaultMenuOpen}
                    onClose={() => setVaultMenuOpen(false)}
                    vaultName={vaultStore.vaultName}
                    storageType={vaultStore.storageType}
                    onSaveName={handleSaveVaultName}
                    onOpenSettings={() => {
                      setVaultMenuOpen(false);
                      vaultStore.setSettingsOpen(true);
                    }}
                    vaults={vaultRegistry.vaults}
                    activeVaultId={vaultRegistry.activeVaultId}
                    onSelectVault={handleSelectVault}
                    onCreateVault={() => {
                      setVaultMenuOpen(false);
                      setIsCreateModalOpen(true);
                    }}
                  />
                </RibbonIconButton>

                {/* 2. Baú de Canvas */}
                <RibbonIconButton
                  icon={Box}
                  label="Baú de Canvas"
                  subtitle="Acesso Rápido aos Canvas"
                  isSelected={vaultStore.sidebarOpen && vaultStore.sidebarTab === 'canvases'}
                  isLight={isLight}
                  onClick={handleToggleCanvasesTab}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('application/rpgsa-canvas')) {
                      e.preventDefault();
                      if (!vaultStore.sidebarOpen) vaultStore.toggleSidebar();
                      vaultStore.setSidebarTab('canvases');
                    }
                  }}
                />

                {/* Separador entre a navegação principal e ferramentas do Vault */}
                <div className="w-5 h-px bg-black/[0.08] dark:bg-white/[0.08] my-1" />

                {/* 3. Explorador de Arquivos */}
                <RibbonIconButton
                  icon={Files}
                  label="Explorador de Arquivos"
                  subtitle="Notas e Documentos (Ctrl+B)"
                  isSelected={vaultStore.sidebarOpen && vaultStore.sidebarTab === 'files'}
                  isLight={isLight}
                  onClick={handleToggleFilesTab}
                  onDragOver={(e) => {
                    if (
                      e.dataTransfer.types.includes('application/rpgsa-vault-node') ||
                      e.dataTransfer.types.includes('Files')
                    ) {
                      e.preventDefault();
                      if (!vaultStore.sidebarOpen) vaultStore.toggleSidebar();
                      vaultStore.setSidebarTab('files');
                    }
                  }}
                />

                {/* 4. Grafo de Conexões */}
                <RibbonIconButton
                  icon={Network}
                  label="Grafo Interativo"
                  subtitle="Visualizar Conexões"
                  isLight={isLight}
                  onClick={props.onOpenGraph}
                />

                {/* 5. Novo Quadro de Conexões */}
                <RibbonIconButton
                  icon={FolderKanban}
                  label="Novo Quadro"
                  subtitle="Canvas de Conexões"
                  isLight={isLight}
                  onClick={props.onCreateBoardCanvas}
                />

                {/* 6. Modelos de Notas */}
                <RibbonIconButton
                  icon={LayoutTemplate}
                  label="Modelos de Notas"
                  subtitle="Templates Reutilizáveis"
                  isSelected={vaultStore.templateModalOpen}
                  isLight={isLight}
                  onClick={() => vaultStore.setTemplateModalOpen(true)}
                />

                {/* 7. Busca Global */}
                <RibbonIconButton
                  icon={Search}
                  label="Busca Global"
                  subtitle="Comandos e Notas (Ctrl+P)"
                  isLight={isLight}
                  onClick={() => vaultStore.setCommandPaletteOpen(true)}
                />

                {/* 8. Backlinks */}
                <RibbonIconButton
                  icon={Link2}
                  label="Backlinks"
                  subtitle="Propriedades e Citações"
                  isSelected={vaultStore.backlinksPanelOpen}
                  isLight={isLight}
                  onClick={() => vaultStore.setBacklinksPanelOpen(!vaultStore.backlinksPanelOpen)}
                />
              </>
            )}
          </nav>
        </div>

        {/* BOTTOM: THEME TOGGLE & SETTINGS */}
        <RibbonFooter
          isLight={isLight}
          onToggleTheme={onToggleTheme}
          onOpenSettings={() => {
            if (isDashboard) {
              props.onOpenSettings();
            } else {
              vaultStore.setSettingsOpen(true);
            }
          }}
          settingsTooltip={isDashboard ? "Configurações Gerais" : "Configurações do Vault"}
        />
      </aside>

      {/* Modal para criar novo Vault diretamente do editor (Vault mode) */}
      {!isDashboard && (
        <CreateVaultModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onConnectFSA={async () => {
            const ok = await vaultRegistry.connectFSA();
            if (ok) {
              await vaultStore.refreshNodes();
            }
            return ok;
          }}
          onCreateIDB={async (newId, newName) => {
            await vaultRegistry.connectIDB(newId, newName);
            await vaultStore.refreshNodes();
          }}
          onRegisterVault={(v) => {
            vaultRegistry.registerVault(v);
          }}
        />
      )}
    </>
  );
};
