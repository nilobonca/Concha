import { useEffect, RefObject } from 'react';

export interface UseClickOutsideOptions {
  /** Indica se o escutador está ativo (padrão: true) */
  enabled?: boolean;
  /** Função de callback chamada para fechar o menu */
  onClose: () => void;
  /** Referência ou lista de referências dos elementos que compõem o menu */
  ref: RefObject<HTMLElement | null> | Array<RefObject<HTMLElement | null>>;
  /** Se deve fechar ao pressionar a tecla Escape (padrão: true) */
  closeOnEscape?: boolean;
  /** Se deve fechar ao rolar a página/contêiner fora do menu (padrão: true) */
  closeOnScroll?: boolean;
  /** Se deve fechar ao perder o foco da janela/navegador (padrão: true) */
  closeOnWindowBlur?: boolean;
}

/**
 * Hook customizado para fechar componentes de UI (menus, popovers, dropdowns)
 * quando o usuário interage fora do elemento ou realiza ações globais.
 */
export function useClickOutside({
  enabled = true,
  onClose,
  ref,
  closeOnEscape = true,
  closeOnScroll = true,
  closeOnWindowBlur = true,
}: UseClickOutsideOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const getRefs = (): Array<RefObject<HTMLElement | null>> =>
      Array.isArray(ref) ? ref : [ref];

    const handlePointerDown = (event: PointerEvent | MouseEvent | TouchEvent) => {
      const refs = getRefs();
      const target = event.target as Node | null;
      if (!target) return;

      const isInside = refs.some(r => r.current && r.current.contains(target));
      if (!isInside) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = (event: Event) => {
      if (!closeOnScroll) return;
      const refs = getRefs();
      const target = event.target as Node | null;
      // Se a rolagem ocorreu dentro do próprio menu, ignora
      if (target && refs.some(r => r.current && r.current.contains(target))) {
        return;
      }
      onClose();
    };

    const handleWindowBlur = () => {
      if (closeOnWindowBlur) {
        onClose();
      }
    };

    const handleGlobalClose = () => {
      onClose();
    };

    // Usamos a fase de captura (true) para capturar o evento antes de e.stopPropagation()
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);

    if (closeOnEscape) {
      document.addEventListener('keydown', handleKeyDown, true);
    }
    if (closeOnScroll) {
      window.addEventListener('scroll', handleScroll, true);
    }
    if (closeOnWindowBlur) {
      window.addEventListener('blur', handleWindowBlur);
    }
    window.addEventListener('close-all-menus', handleGlobalClose);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);

      if (closeOnEscape) {
        document.removeEventListener('keydown', handleKeyDown, true);
      }
      if (closeOnScroll) {
        window.removeEventListener('scroll', handleScroll, true);
      }
      if (closeOnWindowBlur) {
        window.removeEventListener('blur', handleWindowBlur);
      }
      window.removeEventListener('close-all-menus', handleGlobalClose);
    };
  }, [enabled, onClose, ref, closeOnEscape, closeOnScroll, closeOnWindowBlur]);
}

/**
 * Utilitário global para disparar um evento que fecha todos os menus ativos no app.
 */
export function closeAllMenus(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('close-all-menus'));
  }
}
