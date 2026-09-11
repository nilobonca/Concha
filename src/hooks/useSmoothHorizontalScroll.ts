import { useEffect, useRef, MutableRefObject } from 'react';

export interface SmoothHorizontalScrollOptions {
  /**
   * Multiplicador de velocidade para a roda do mouse.
   * @default 1.1
   */
  speed?: number;

  /**
   * Coeficiente de amortecimento da interpolação suave (0 a 1).
   * Valores entre 0.12 e 0.20 proporcionam uma transição muito fluida e responsiva.
   * @default 0.16
   */
  easing?: number;

  /**
   * Ativa ou desativa a rolagem suave.
   * @default true
   */
  enabled?: boolean;
}

/**
 * Hook que adiciona rolagem horizontal fluida (com inércia e interpolação por RAF)
 * a qualquer elemento com overflow horizontal (como barras de abas e listas de pílulas),
 * convertendo a roda vertical do mouse (deltaY) em deslocamento horizontal suave
 * e independente da taxa de atualização do monitor (60Hz, 120Hz, 144Hz, 240Hz).
 */
export function useSmoothHorizontalScroll<T extends HTMLElement = HTMLDivElement>(
  options: SmoothHorizontalScrollOptions = {}
): MutableRefObject<T | null> {
  const { speed = 1.1, easing = 0.16, enabled = true } = options;
  const containerRef = useRef<T | null>(null);
  const targetScrollRef = useRef<number>(0);
  const isAnimatingRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    targetScrollRef.current = container.scrollLeft;

    const animate = (currentTime: number) => {
      if (!container) return;

      const dt = lastTimeRef.current > 0 ? Math.min(50, Math.max(1, currentTime - lastTimeRef.current)) : 16.67;
      lastTimeRef.current = currentTime;

      const current = container.scrollLeft;
      const target = targetScrollRef.current;
      const diff = target - current;

      if (Math.abs(diff) < 0.5) {
        container.scrollLeft = target;
        isAnimatingRef.current = false;
        rafIdRef.current = null;
        lastTimeRef.current = 0;
        return;
      }

      // Decaimento exponencial independente de FPS (calibrado para base 60fps = 16.67ms)
      const frameFactor = 1 - Math.pow(1 - easing, dt / 16.67);
      container.scrollLeft = current + diff * frameFactor;

      rafIdRef.current = requestAnimationFrame(animate);
    };

    const handleWheel = (e: WheelEvent) => {
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      if (maxScroll <= 0) return;

      let delta = 0;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        delta = e.deltaY;
      } else if (Math.abs(e.deltaX) > 0) {
        delta = e.deltaX;
      }

      if (delta === 0) return;

      // Normaliza o deltaMode (0 = pixels, 1 = linhas, 2 = páginas)
      if (e.deltaMode === 1) {
        delta *= 18;
      } else if (e.deltaMode === 2) {
        delta *= container.clientWidth;
      }

      delta *= speed;

      // Impede o scroll de página padrão e consome o evento
      e.preventDefault();
      e.stopPropagation();

      // Se não estiver animando ou se a rolagem foi alterada externamente, sincroniza o alvo
      if (!isAnimatingRef.current) {
        targetScrollRef.current = container.scrollLeft;
        lastTimeRef.current = performance.now();
      }

      // Acumula o alvo com clamp estrito entre 0 e maxScroll
      targetScrollRef.current = Math.max(0, Math.min(maxScroll, targetScrollRef.current + delta));

      if (!isAnimatingRef.current) {
        isAnimatingRef.current = true;
        rafIdRef.current = requestAnimationFrame(animate);
      }
    };

    // Sincroniza a posição caso o container seja rolado externamente (ex: scrollIntoView)
    const handleScroll = () => {
      if (!isAnimatingRef.current) {
        targetScrollRef.current = container.scrollLeft;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      isAnimatingRef.current = false;
      lastTimeRef.current = 0;
    };
  }, [enabled, speed, easing]);

  return containerRef;
}
