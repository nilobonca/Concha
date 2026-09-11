import { useState, useCallback, useRef } from 'react';
import { BoardElement, BoardConnection } from '../types';

export interface BoardHistorySnapshot {
  elements: BoardElement[];
  connections: BoardConnection[];
}

interface UseBoardHistoryOptions {
  maxDepth?: number;
}

export function useBoardHistory(options: UseBoardHistoryOptions = {}) {
  const maxDepth = options.maxDepth ?? 50;

  // Refs para gerenciar as pilhas com garantia síncrona sem atrasos de reconciliação
  const undoStackRef = useRef<BoardHistorySnapshot[]>([]);
  const redoStackRef = useRef<BoardHistorySnapshot[]>([]);

  // Estados reativos para botões e indicadores de interface
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateStateFlags = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const addToHistory = useCallback((snapshot: BoardHistorySnapshot) => {
    // Clona os elementos e conexões para preservar snapshot imutável
    const clonedSnapshot: BoardHistorySnapshot = {
      elements: JSON.parse(JSON.stringify(snapshot.elements)),
      connections: JSON.parse(JSON.stringify(snapshot.connections)),
    };

    undoStackRef.current.push(clonedSnapshot);
    if (undoStackRef.current.length > maxDepth) {
      undoStackRef.current.shift();
    }
    // Nova ação limpa a pilha de refazer (redo)
    redoStackRef.current = [];
    updateStateFlags();
  }, [maxDepth, updateStateFlags]);

  const undo = useCallback((currentSnapshot: BoardHistorySnapshot): BoardHistorySnapshot | null => {
    if (undoStackRef.current.length === 0) return null;

    const previous = undoStackRef.current.pop()!;
    const clonedCurrent: BoardHistorySnapshot = {
      elements: JSON.parse(JSON.stringify(currentSnapshot.elements)),
      connections: JSON.parse(JSON.stringify(currentSnapshot.connections)),
    };
    redoStackRef.current.push(clonedCurrent);
    if (redoStackRef.current.length > maxDepth) {
      redoStackRef.current.shift();
    }

    updateStateFlags();
    return previous;
  }, [maxDepth, updateStateFlags]);

  const redo = useCallback((currentSnapshot: BoardHistorySnapshot): BoardHistorySnapshot | null => {
    if (redoStackRef.current.length === 0) return null;

    const next = redoStackRef.current.pop()!;
    const clonedCurrent: BoardHistorySnapshot = {
      elements: JSON.parse(JSON.stringify(currentSnapshot.elements)),
      connections: JSON.parse(JSON.stringify(currentSnapshot.connections)),
    };
    undoStackRef.current.push(clonedCurrent);
    if (undoStackRef.current.length > maxDepth) {
      undoStackRef.current.shift();
    }

    updateStateFlags();
    return next;
  }, [maxDepth, updateStateFlags]);

  const clearHistory = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    updateStateFlags();
  }, [updateStateFlags]);

  return {
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
}
