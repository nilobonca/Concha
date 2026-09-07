import { v4 as uuidv4 } from 'uuid';
import { 
  VaultLayoutNode, 
  VaultPaneLeaf, 
  VaultPaneSplit, 
  VaultTab, 
  SplitDirection 
} from '../interfaces/layout';

export function isPaneLeaf(node: VaultLayoutNode): node is VaultPaneLeaf {
  return node.type === 'leaf';
}

export function isPaneSplit(node: VaultLayoutNode): node is VaultPaneSplit {
  return node.type === 'split';
}

export function createPaneLeaf(tabs: VaultTab[] = [], activePath?: string | null): VaultPaneLeaf {
  return {
    id: `pane-${uuidv4().slice(0, 8)}`,
    type: 'leaf',
    tabs,
    activePath: activePath !== undefined ? activePath : (tabs[0]?.path || null)
  };
}

export function findPaneLeaf(node: VaultLayoutNode, paneId: string): VaultPaneLeaf | null {
  if (isPaneLeaf(node)) {
    return node.id === paneId ? node : null;
  }
  for (const child of node.children) {
    const found = findPaneLeaf(child, paneId);
    if (found) return found;
  }
  return null;
}

export function getAllPanes(node: VaultLayoutNode): VaultPaneLeaf[] {
  if (isPaneLeaf(node)) {
    return [node];
  }
  return node.children.flatMap(getAllPanes);
}

export function findParentSplit(
  root: VaultLayoutNode, 
  targetId: string
): { parent: VaultPaneSplit; index: number } | null {
  if (isPaneLeaf(root)) return null;

  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i];
    if (child.id === targetId) {
      return { parent: root, index: i };
    }
    if (isPaneSplit(child)) {
      const found = findParentSplit(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

export function updatePaneInTree(
  root: VaultLayoutNode,
  paneId: string,
  updater: (pane: VaultPaneLeaf) => VaultPaneLeaf
): VaultLayoutNode {
  if (isPaneLeaf(root)) {
    return root.id === paneId ? updater(root) : root;
  }

  return {
    ...root,
    children: root.children.map(child => updatePaneInTree(child, paneId, updater))
  };
}

/**
 * Normaliza tamanhos percentuais para que somem exatamente 100
 */
export function normalizeSizes(count: number, existingSizes?: number[]): number[] {
  if (count <= 0) return [];
  if (count === 1) return [100];

  if (existingSizes && existingSizes.length === count) {
    const sum = existingSizes.reduce((acc, v) => acc + v, 0);
    if (sum > 0) {
      return existingSizes.map(v => Math.round((v / sum) * 1000) / 10);
    }
  }

  const equal = Math.round((100 / count) * 10) / 10;
  const sizes = Array(count).fill(equal);
  // Ajuste do resto para fechar 100
  const total = sizes.reduce((a, b) => a + b, 0);
  sizes[sizes.length - 1] += Math.round((100 - total) * 10) / 10;
  return sizes;
}

/**
 * Remove folhas vazias e colapsa splits com apenas 1 filho
 */
export function pruneLayoutTree(node: VaultLayoutNode): VaultLayoutNode | null {
  if (isPaneLeaf(node)) {
    return node;
  }

  const prunedChildren = node.children
    .map(pruneLayoutTree)
    .filter((child): child is VaultLayoutNode => child !== null);

  if (prunedChildren.length === 0) {
    return null;
  }

  if (prunedChildren.length === 1) {
    return prunedChildren[0];
  }

  return {
    ...node,
    children: prunedChildren,
    sizes: normalizeSizes(prunedChildren.length, node.sizes)
  };
}

/**
 * Helper para correspondência flexível e segura de caminho de abas ao fechar ou excluir arquivos/pastas
 */
export function isTabPathMatch(
  tabPath?: string | null,
  targetPath?: string | null,
  isFolder?: boolean,
  tabCanvasId?: string
): boolean {
  if (!tabPath || !targetPath) return false;

  let normTab = tabPath.trim().replace(/\\/g, '/');
  let normTarget = targetPath.trim().replace(/\\/g, '/');

  try { normTab = decodeURIComponent(normTab); } catch {}
  try { normTarget = decodeURIComponent(normTarget); } catch {}

  normTab = normTab.toLowerCase();
  normTarget = normTarget.toLowerCase();

  // Remove barras e prefixos relativos no início e fim
  normTab = normTab.replace(/^(\.\/|\/)+/, '').replace(/\/+$/, '');
  normTarget = normTarget.replace(/^(\.\/|\/)+/, '').replace(/\/+$/, '');

  // Verificação de tabs de canvas
  const tabIsCanvas = normTab.startsWith('canvas:');
  const targetIsCanvas = normTarget.startsWith('canvas:');
  const cleanTabCanvasId = tabIsCanvas ? normTab.replace('canvas:', '') : normTab;
  const cleanTargetCanvasId = targetIsCanvas ? normTarget.replace('canvas:', '') : normTarget;

  if (tabIsCanvas || targetIsCanvas || tabCanvasId) {
    if (tabCanvasId && tabCanvasId.toLowerCase() === cleanTargetCanvasId) return true;
    if (cleanTabCanvasId === cleanTargetCanvasId) return true;
  }

  if (isFolder) {
    return normTab === normTarget || normTab.startsWith(`${normTarget}/`);
  }

  if (normTab === normTarget) return true;

  // Comparação ignorando extensão de arquivo (.md, .txt, etc.)
  const tabNoExt = normTab.replace(/\.[^/.]+$/, '');
  const targetNoExt = normTarget.replace(/\.[^/.]+$/, '');
  return tabNoExt === targetNoExt;
}

/**
 * Remove uma aba de um painel específico
 */
export function removeTabFromPane(
  root: VaultLayoutNode,
  paneId: string,
  tabPath: string
): { newLayout: VaultLayoutNode; closedPane: boolean } {
  let closedPane = false;

  const updated = updatePaneInTree(root, paneId, (pane) => {
    const isMatch = (t: VaultTab) => t.path === tabPath || isTabPathMatch(t.path, tabPath, false, t.canvasId);
    const nextTabs = pane.tabs.filter(t => !isMatch(t));
    let nextActivePath = pane.activePath;

    if (pane.activePath && (pane.activePath === tabPath || isTabPathMatch(pane.activePath, tabPath))) {
      nextActivePath = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].path : null;
    }

    return {
      ...pane,
      tabs: nextTabs,
      activePath: nextActivePath
    };
  });

  // Se o painel ficou sem abas, verificamos se há outros painéis para fechar este
  const allPanes = getAllPanes(updated);
  const targetPane = findPaneLeaf(updated, paneId);

  if (targetPane && targetPane.tabs.length === 0 && allPanes.length > 1) {
    closedPane = true;
    const pruned = removePaneFromTree(updated, paneId);
    return {
      newLayout: pruned || createPaneLeaf([], null),
      closedPane: true
    };
  }

  return {
    newLayout: updated,
    closedPane: false
  };
}

/**
 * Remove um painel completo da árvore
 */
export function removePaneFromTree(root: VaultLayoutNode, paneId: string): VaultLayoutNode | null {
  if (isPaneLeaf(root)) {
    return root.id === paneId ? null : root;
  }

  const nextChildren: VaultLayoutNode[] = [];
  for (const child of root.children) {
    if (child.id === paneId) continue;

    if (isPaneSplit(child)) {
      const pruned = removePaneFromTree(child, paneId);
      if (pruned) nextChildren.push(pruned);
    } else {
      nextChildren.push(child);
    }
  }

  if (nextChildren.length === 0) return null;
  if (nextChildren.length === 1) return nextChildren[0];

  return {
    ...root,
    children: nextChildren,
    sizes: normalizeSizes(nextChildren.length)
  };
}

/**
 * Move ou insere uma aba dentro de um painel existente
 */
export function insertTabInPane(
  root: VaultLayoutNode,
  targetPaneId: string,
  tab: VaultTab,
  targetIndex?: number
): VaultLayoutNode {
  return updatePaneInTree(root, targetPaneId, (pane) => {
    const existingIndex = pane.tabs.findIndex(t => t.path === tab.path);
    let nextTabs = [...pane.tabs];

    if (existingIndex !== -1) {
      // Já existe no painel, apenas ativa
      return {
        ...pane,
        activePath: tab.path
      };
    }

    if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= nextTabs.length) {
      nextTabs.splice(targetIndex, 0, tab);
    } else {
      nextTabs.push(tab);
    }

    return {
      ...pane,
      tabs: nextTabs,
      activePath: tab.path
    };
  });
}

/**
 * Realiza o split de um painel, criando um novo painel com a aba especificada
 */
export function splitPaneInTree(
  root: VaultLayoutNode,
  targetPaneId: string,
  tab: VaultTab,
  direction: SplitDirection,
  position: 'before' | 'after',
  sourcePaneId?: string
): { newLayout: VaultLayoutNode; newPaneId: string } {
  // 1. Cria a nova folha com a aba
  const newLeaf = createPaneLeaf([tab], tab.path);
  const newPaneId = newLeaf.id;

  // 2. Se a aba veio de um painel existente, remove de lá sem remover o painel alvo
  let tree = root;
  if (sourcePaneId) {
    tree = updatePaneInTree(tree, sourcePaneId, (p) => {
      const nextTabs = p.tabs.filter(t => t.path !== tab.path);
      const nextActive = p.activePath === tab.path 
        ? (nextTabs[nextTabs.length - 1]?.path || null) 
        : p.activePath;
      return { ...p, tabs: nextTabs, activePath: nextActive };
    });
  }

  // Se o targetPaneId não existir mais (ex: era o mesmo e foi fechado), cria layout simples
  const targetPane = findPaneLeaf(tree, targetPaneId);
  if (!targetPane) {
    return {
      newLayout: {
        id: `split-${uuidv4().slice(0, 8)}`,
        type: 'split',
        direction,
        children: position === 'before' ? [newLeaf, tree] : [tree, newLeaf],
        sizes: [50, 50]
      },
      newPaneId
    };
  }

  // 3. Verifica se o painel pai já possui a mesma direção de split
  const parentInfo = findParentSplit(tree, targetPaneId);
  if (parentInfo && parentInfo.parent.direction === direction) {
    // Insere como irmão direto no mesmo split! (ex: nova coluna ao lado)
    const insertIdx = position === 'before' ? parentInfo.index : parentInfo.index + 1;
    const parent = parentInfo.parent;
    const nextChildren = [...parent.children];
    nextChildren.splice(insertIdx, 0, newLeaf);

    const updatedParent: VaultPaneSplit = {
      ...parent,
      children: nextChildren,
      sizes: normalizeSizes(nextChildren.length)
    };

    const replaceInTree = (node: VaultLayoutNode): VaultLayoutNode => {
      if (node.id === parent.id) return updatedParent;
      if (isPaneSplit(node)) {
        return {
          ...node,
          children: node.children.map(replaceInTree)
        };
      }
      return node;
    };

    return {
      newLayout: replaceInTree(tree),
      newPaneId
    };
  }

  // 4. Caso contrário, substitui targetPane por um novo split contendo targetPane e newLeaf
  const newSplit: VaultPaneSplit = {
    id: `split-${uuidv4().slice(0, 8)}`,
    type: 'split',
    direction,
    children: position === 'before' ? [newLeaf, targetPane] : [targetPane, newLeaf],
    sizes: [50, 50]
  };

  const replaceTarget = (node: VaultLayoutNode): VaultLayoutNode => {
    if (node.id === targetPaneId) {
      return newSplit;
    }
    if (isPaneSplit(node)) {
      return {
        ...node,
        children: node.children.map(replaceTarget)
      };
    }
    return node;
  };

  return {
    newLayout: replaceTarget(tree),
    newPaneId
  };
}

export function resizeSplitInTree(
  root: VaultLayoutNode,
  splitId: string,
  newSizes: number[]
): VaultLayoutNode {
  if (isPaneLeaf(root)) return root;

  if (root.id === splitId) {
    return {
      ...root,
      sizes: newSizes
    };
  }

  return {
    ...root,
    children: root.children.map(c => resizeSplitInTree(c, splitId, newSizes))
  };
}

const STORAGE_KEY = 'vault_panes_layout';

export function saveLayoutToStorage(layout: VaultLayoutNode, vaultId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = vaultId ? `${STORAGE_KEY}_${vaultId}` : STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(layout));
  } catch (err) {
    console.error('Falha ao salvar layout do vault:', err);
  }
}

export function loadLayoutFromStorage(vaultId?: string): VaultLayoutNode | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = vaultId ? `${STORAGE_KEY}_${vaultId}` : STORAGE_KEY;
    let raw = localStorage.getItem(key);
    // Fallback para chave legada apenas se for o vault padrão
    if (!raw && (!vaultId || vaultId === 'default-vault')) {
      raw = localStorage.getItem(STORAGE_KEY);
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.type === 'leaf' || parsed.type === 'split')) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}
