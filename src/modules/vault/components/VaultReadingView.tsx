import React, { useEffect, useRef } from 'react';
import { markdownToHtml } from '../utils/markdownConverter';
import { useVaultStore } from '../hooks/useVaultStore';
import mermaid from 'mermaid';

interface VaultReadingViewProps {
  content: string;
}

export const VaultReadingView: React.FC<VaultReadingViewProps> = ({ content }) => {
  const { openOrCreateDocumentByTitle } = useVaultStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const html = markdownToHtml(content);

  useEffect(() => {
    if (!containerRef.current) return;
    const mermaidNodes = containerRef.current.querySelectorAll<HTMLElement>('div[data-type="mermaid"]');
    if (mermaidNodes.length === 0) return;

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'inherit'
      });

      mermaidNodes.forEach(async (el) => {
        const encoded = el.getAttribute('data-chart');
        if (!encoded) return;
        const chart = decodeURIComponent(encoded);
        try {
          const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
          const { svg } = await mermaid.render(id, chart);
          el.innerHTML = svg;
        } catch {
          el.innerHTML = `<div class="text-rose-400 text-xs font-mono">Erro de Sintaxe no Diagrama Mermaid</div>`;
        }
      });
    } catch {
      // ignore
    }
  }, [html]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('[data-wikilink-title]');
    if (target) {
      const title = target.getAttribute('data-wikilink-title');
      if (title) {
        e.preventDefault();
        openOrCreateDocumentByTitle(title);
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="prose dark:prose-invert max-w-none min-h-[500px] text-stone-900 dark:text-neutral-200 leading-relaxed text-base font-normal select-text"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
