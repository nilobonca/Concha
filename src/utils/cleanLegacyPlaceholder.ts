/**
 * Sanitiza e remove permanentemente qualquer resquício do texto placeholder
 * "Nota vazia. Clique na caneta acima para editar." e suas variações em Markdown ou HTML.
 */
export function cleanLegacyPlaceholder(content?: string): string {
  if (!content) return '';
  return content
    .replace(/<([a-zA-Z0-9]+)[^>]*>[\s\S]*?Nota vazia[\s\S]*?<\/\1>/gi, '')
    .replace(/<([a-zA-Z0-9]+)[^>]*>[\s\S]*?Clique na caneta[\s\S]*?<\/\1>/gi, '')
    .replace(/[*_~`>#]*\s*Nota vazia\.?\s*Clique na caneta acima para editar\.?\s*[*_~`>]*/gi, '')
    .replace(/Nota vazia\.?\s*Clique na caneta acima para editar\.?/gi, '')
    .replace(/Nota vazia\.?/gi, '')
    .replace(/Clique na caneta acima para editar\.?/gi, '')
    .trim();
}

/**
 * Remove qualquer cabeçalho ou título redundante no início do conteúdo que
 * duplique o próprio título/nome da nota (ex.: "# Simone\n\n", "## Simone\n", "Simone\n\n", "<h1>Simone</h1>").
 */
export function cleanDuplicateTitle(content?: string, title?: string): string {
  if (!content) return '';
  if (!title || !title.trim()) return content;

  const rawTitle = title.trim();
  const titleWithoutExt = rawTitle.replace(/\.(md|markdown|txt)$/i, '').trim();

  // Títulos candidatos a serem expurgados do topo do conteúdo
  const candidates = Array.from(new Set([rawTitle, titleWithoutExt])).filter(Boolean);

  let result = content;

  // Se houver frontmatter YAML no topo, preserva-o temporariamente
  const frontmatterMatch = result.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/);
  let frontmatter = '';
  let body = result;
  if (frontmatterMatch) {
    frontmatter = frontmatterMatch[1];
    body = result.slice(frontmatter.length);
  }

  for (const candidate of candidates) {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Remove formato HTML de cabeçalho (ex: <h1>Simone</h1> ou <h2>Simone</h2>)
    body = body.replace(
      new RegExp(`^\\s*<h[1-6][^>]*>\\s*${escaped}\\s*<\\/h[1-6]>\\s*(?:(?:\\r?\\n)+|$)`, 'i'),
      ''
    );

    // Remove formato Markdown (# Simone, ## Simone, **Simone**, ou apenas a linha isolada com o título)
    body = body.replace(
      new RegExp(`^\\s*(?:#+\\s*|\\*\\*\\s*)?${escaped}(?:\\s*\\*\\*)?\\s*(?:(?:\\r?\\n)+|$)`, 'i'),
      ''
    );
  }

  body = body.trimStart();
  return frontmatter ? `${frontmatter}${body}` : body;
}
