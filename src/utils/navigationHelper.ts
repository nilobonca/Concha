import type { NextRouter } from 'next/router';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { useCanvasGlobalStore } from '@/store/canvasStore';

/**
 * Universal Navigation Helper
 * Ensures smooth routing across Desktop (Electron), Web, and Mobile (Android / Capacitor).
 * Supports query-based routing (/project?id=... and /board?id=...) for 100% static export compatibility.
 */

export const navigateToProject = (router: NextRouter, projectId: string, projectName?: string) => {
  if (!projectId) return Promise.resolve(false);
  useCanvasGlobalStore.getState().startEnteringProject(projectName);
  return router.push(`/project?id=${encodeURIComponent(projectId)}`);
};

export const navigateToBoard = (router: NextRouter, boardId: string) => {
  if (!boardId) return Promise.resolve(false);
  return router.push(`/board?id=${encodeURIComponent(boardId)}`);
};

export const navigateToVault = (router: NextRouter, docPath?: string, vaultName?: string) => {
  useVaultStore.getState().startEnteringVault(vaultName);
  if (docPath) {
    return router.push(`/vault?doc=${encodeURIComponent(docPath)}`);
  }
  return router.push('/vault');
};

export const navigateToHome = (router: NextRouter) => {
  return router.push('/');
};
