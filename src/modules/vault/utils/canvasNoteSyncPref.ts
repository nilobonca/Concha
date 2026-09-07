export type CanvasNoteSyncPref = 'always' | 'never' | 'ask';

const PREF_STORAGE_KEY = 'vault_canvas_note_sync_pref';

/**
 * Obtém a preferência salva de sincronização entre notas do canvas e arquivos originais no Vault.
 * Padrão: 'ask' (sempre perguntar).
 */
export function getCanvasNoteSyncPref(): CanvasNoteSyncPref {
  if (typeof window === 'undefined') return 'ask';
  try {
    const saved = localStorage.getItem(PREF_STORAGE_KEY);
    if (saved === 'always' || saved === 'never' || saved === 'ask') {
      return saved;
    }
  } catch {
    // Falha silenciosa em ambientes restritos
  }
  return 'ask';
}

/**
 * Define a preferência de sincronização no localStorage e emite evento customizado.
 */
export function setCanvasNoteSyncPref(pref: CanvasNoteSyncPref): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREF_STORAGE_KEY, pref);
    window.dispatchEvent(new CustomEvent('canvas_note_sync_pref_change', { detail: pref }));
  } catch (err) {
    console.error('Erro ao salvar preferência de sincronização de nota:', err);
  }
}
