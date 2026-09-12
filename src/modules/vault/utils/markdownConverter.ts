import { marked } from 'marked';
import TurndownService from 'turndown';
import { parseFrontmatter } from './frontmatterUtils';
import { tables } from 'turndown-plugin-gfm';
import katex from 'katex';

// Configure Turndown for clean, standard Markdown
const turndown = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
});

// CRITICAL: Prevent Turndown from escaping Markdown characters with backslashes!
turndown.escape = (str: string) => str;

// Enable GitHub Flavored Markdown Tables
turndown.use(tables);

// Empty paragraph preservation: ensure empty paragraphs or lines with only <br> are not stripped by Turndown
turndown.addRule('emptyParagraph', {
  filter: (node) => {
    if (node.nodeName === 'P') {
      const html = node.innerHTML.trim();
      return html === '' || html === '<br>' || html === '<br/>' || html === '<br class="ProseMirror-trailingBreak">' || html === '&nbsp;';
    }
    return false;
  },
  replacement: () => '\n\n&nbsp;\n\n'
});

// Embed Note: <div data-type="embed-note"> -> ![[Target]]
turndown.addRule('embedNote', {
  filter: (node) => {
    return node.nodeName === 'DIV' && node.getAttribute('data-type') === 'embed-note';
  },
  replacement: (_content, node) => {
    const title = (node as HTMLElement).getAttribute('data-embed-title') || '';
    return `\n\n![[${title}]]\n\n`;
  }
});

// Math Block: <div data-type="math-block"> -> $$\nformula\n$$
turndown.addRule('mathBlock', {
  filter: (node) => {
    return node.nodeName === 'DIV' && node.getAttribute('data-type') === 'math-block';
  },
  replacement: (_content, node) => {
    const rawLatex = decodeURIComponent((node as HTMLElement).getAttribute('data-latex') || '');
    return `\n\n$$\n${rawLatex}\n$$\n\n`;
  }
});

// Math Inline: <span data-type="math-inline"> -> $formula$
turndown.addRule('mathInline', {
  filter: (node) => {
    return node.nodeName === 'SPAN' && node.getAttribute('data-type') === 'math-inline';
  },
  replacement: (_content, node) => {
    const rawLatex = decodeURIComponent((node as HTMLElement).getAttribute('data-latex') || '');
    return `$${rawLatex}$`;
  }
});

// Mermaid Diagram: <div data-type="mermaid"> -> ```mermaid\nchart\n```
turndown.addRule('mermaid', {
  filter: (node) => {
    return node.nodeName === 'DIV' && node.getAttribute('data-type') === 'mermaid';
  },
  replacement: (_content, node) => {
    const rawChart = decodeURIComponent((node as HTMLElement).getAttribute('data-chart') || '');
    return `\n\n\`\`\`mermaid\n${rawChart}\n\`\`\`\n\n`;
  }
});

// Database Block: <div data-type="database-block"> -> preserve HTML block
turndown.addRule('databaseBlock', {
  filter: (node) => {
    return node.nodeName === 'DIV' && node.getAttribute('data-type') === 'database-block';
  },
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const dbId = el.getAttribute('data-database-id') || '';
    const dbPath = el.getAttribute('data-database-path') || '';
    const dbRaw = el.getAttribute('data-database-raw') || '';
    return `\n\n<div data-type="database-block" data-database-id="${dbId}" data-database-path="${dbPath}" data-database-raw="${dbRaw}"></div>\n\n`;
  }
});


// Callout block: <div data-type="callout"> -> > [!TYPE] Title\n> Content
turndown.addRule('callout', {
  filter: (node) => {
    return node.nodeName === 'DIV' && node.getAttribute('data-type') === 'callout';
  },
  replacement: (_content, node) => {
    const type = ((node as HTMLElement).getAttribute('data-callout') || 'note').toUpperCase();
    const title = (node as HTMLElement).getAttribute('data-callout-title');
    const contentEl = (node as HTMLElement).querySelector('.vault-callout-content');
    const innerHtml = contentEl ? contentEl.innerHTML : (node as HTMLElement).innerHTML;
    const innerMd = turndown.turndown(innerHtml).trim();
    
    const titleSuffix = title && title.toLowerCase() !== type.toLowerCase() ? ` ${title}` : '';
    const headerLine = `> [!${type}]${titleSuffix}`;
    const contentLines = innerMd ? innerMd.split('\n').map(line => `> ${line}`).join('\n') : '> ';
    return `\n\n${headerLine}\n${contentLines}\n\n`;
  }
});

// Preserve any legacy wikilink spans in Turndown
turndown.addRule('wikilink', {
  filter: (node) => {
    return node.nodeName === 'SPAN' && (node.hasAttribute('data-wikilink-title') || node.hasAttribute('data-wikilink'));
  },
  replacement: (content, node) => {
    const title = (node as HTMLElement).getAttribute('data-wikilink-title') || content;
    const alias = (node as HTMLElement).getAttribute('data-wikilink-alias');
    const cleanContent = content.replace(/^\[\[|\]\]$/g, '').trim();
    const cleanTitle = title.replace(/^\[\[|\]\]$/g, '').trim();
    const cleanAlias = alias ? alias.replace(/^\[\[|\]\]$/g, '').trim() : cleanContent;

    if (cleanAlias && cleanAlias !== cleanTitle) {
      return `[[${cleanTitle}|${cleanAlias}]]`;
    }
    return `[[${cleanTitle}]]`;
  }
});

// Highlight mark: <mark> -> ==text==
turndown.addRule('highlight', {
  filter: ['mark'],
  replacement: (content) => `==${content.trim()}==`
});

// Task list item: <li data-type="taskItem"> -> - [ ] or - [x]
turndown.addRule('taskItem', {
  filter: (node) => {
    return node.nodeName === 'LI' && (node.getAttribute('data-type') === 'taskItem' || node.classList.contains('task-list-item'));
  },
  replacement: (content, node) => {
    const el = node as HTMLElement;
    // 1. TipTap sets data-checked="true" | "false" directly on the taskItem <li>
    let isChecked = el.getAttribute('data-checked') === 'true';

    // 2. If data-checked is not explicitly set, find the direct checkbox belonging to this <li>
    if (!el.hasAttribute('data-checked')) {
      const allInputs = el.querySelectorAll('input[type="checkbox"]');
      for (const inp of Array.from(allInputs)) {
        if (inp.closest('li') === el) {
          isChecked = inp.hasAttribute('checked') || (inp as HTMLInputElement).checked === true || /\bchecked\b/i.test(inp.outerHTML);
          break;
        }
      }
    }

    // Clean out any checkbox characters or whitespace already added by inner tags
    const cleanContent = content.trim().replace(/^\[[ xX]\]\s*/, '');
    return `${isChecked ? '- [x] ' : '- [ ] '}${cleanContent}\n`;
  }
});

// Task list wrapper
turndown.addRule('taskList', {
  filter: (node) => {
    return node.nodeName === 'UL' && node.getAttribute('data-type') === 'taskList';
  },
  replacement: (content) => {
    return `\n${content}\n`;
  }
});

/**
 * Converts Markdown string to structured HTML for the TipTap editor.
 * Preserves literal [[Title]] or [[Title|Alias]] characters in text so they are real editable characters!
 */
export function markdownToHtml(raw: string): string {
  if (!raw || !raw.trim()) return '<p></p>';

  // Strip frontmatter from raw markdown so it does not render as an HR or raw text in the editor body
  const { content: rawBody } = parseFrontmatter(raw);

  // Remove any previously escaped backslashes (e.g. \# -> #, \*\* -> **, \[\[ -> [[)
  let clean = rawBody.replace(/\\([#*_`~>[\]+\\-])/g, '$1');

  // Convert any legacy <span data-wikilink-title="..."> back to pure [[Title]] or [[Title|Alias]]
  clean = clean.replace(/<span[^>]*data-wikilink-title="([^"]*)"(?:[^>]*data-wikilink-alias="([^"]*)")?[^>]*>([\s\S]*?)<\/span>/gi, (_m, title, alias, content) => {
    const cleanTitle = title.trim();
    const cleanContent = content.replace(/^\[\[|\]\]$/g, '').trim();
    const cleanAlias = alias ? alias.trim() : cleanContent;
    if (cleanAlias && cleanAlias !== cleanTitle) {
      return `[[${cleanTitle}|${cleanAlias}]]`;
    }
    return `[[${cleanTitle}]]`;
  });

  // If the string is already HTML that doesn't contain raw markdown headers/bold:
  const isPureHtml = /^\s*<[a-z][\s\S]*>\s*$/i.test(clean) && 
                     !clean.includes('# ') && 
                     !clean.includes('**');

  if (isPureHtml) {
    return clean;
  }

  // If it's HTML with embedded markdown, convert HTML to clean markdown first
  if (/<[a-z][\s\S]*>/i.test(clean)) {
    try {
      clean = turndown.turndown(clean);
    } catch {
      // keep clean
    }
  }

  // Convert Obsidian ==highlight== syntax to <mark>
  clean = clean.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');

  // Process Transclusions / Embed Notes: ![[Note]] or ![[Note|Alias]]
  clean = clean.replace(/!\[\[([^[\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target) => {
    const title = target.trim();
    return `<div data-type="embed-note" data-embed-title="${title}" class="vault-embed-note border border-[#1831D7]/30 dark:border-[#7F95FF]/30 rounded-xl p-3.5 my-3 bg-[#1831D7]/5 dark:bg-[#1831D7]/15 shadow-xs"><div class="flex items-center gap-2 text-xs font-semibold text-[#1831D7] dark:text-[#7F95FF] cursor-pointer hover:underline" data-wikilink-title="${title.split('#')[0]}"><span class="w-2 h-2 rounded-full bg-[#1831D7] dark:bg-[#7F95FF]"></span><span>Nota incorporada: ${title}</span></div><div class="text-[11px] text-stone-500 dark:text-neutral-400 mt-1 italic">[[${title}]]</div></div>`;
  });

  // Process LaTeX Block formulas: $$...$$
  clean = clean.replace(/\$\$([\s\S]*?)\$\$/g, (_m, tex) => {
    const formula = tex.trim();
    try {
      const rendered = katex.renderToString(formula, { displayMode: true, throwOnError: false });
      return `<div data-type="math-block" data-latex="${encodeURIComponent(formula)}" class="vault-math-block my-3 py-2 px-3 bg-stone-50/80 dark:bg-white/[0.03] rounded-lg border border-stone-200/70 dark:border-white/10 text-center overflow-x-auto">${rendered}</div>`;
    } catch {
      return `<div data-type="math-block" data-latex="${encodeURIComponent(formula)}" class="vault-math-block my-3 py-2 px-3 text-rose-500 font-mono text-xs">${formula}</div>`;
    }
  });

  // Process LaTeX Inline formulas: $...$
  clean = clean.replace(/(?<!\\)\$([^\$\n]+?)\$/g, (_m, tex) => {
    const formula = tex.trim();
    try {
      const rendered = katex.renderToString(formula, { displayMode: false, throwOnError: false });
      return `<span data-type="math-inline" data-latex="${encodeURIComponent(formula)}" class="vault-math-inline px-1 py-0.5 rounded bg-stone-100 dark:bg-white/5 border border-stone-200/50 dark:border-white/10">${rendered}</span>`;
    } catch {
      return `<span data-type="math-inline" data-latex="${encodeURIComponent(formula)}" class="vault-math-inline text-rose-500 font-mono text-xs">${formula}</span>`;
    }
  });

  // Process Mermaid Diagrams: ```mermaid ... ```
  clean = clean.replace(/```mermaid\s*([\s\S]*?)```/g, (_m, chart) => {
    return `<div data-type="mermaid" data-chart="${encodeURIComponent(chart.trim())}" class="vault-mermaid-diagram my-4 p-4 rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/40 dark:bg-white/[0.02] flex justify-center text-xs text-stone-400 font-mono">Carregando diagrama...</div>`;
  });

  // Preserve intentional multiple blank lines (2 or more Enters) outside code blocks
  const codeBlocks: string[] = [];
  clean = clean.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  clean = clean.replace(/\n{3,}/g, (match) => '\n\n' + '&nbsp;\n\n'.repeat(match.length - 2));

  clean = clean.replace(/__CODE_BLOCK_(\d+)__/g, (_m, idx) => codeBlocks[Number(idx)] || '');

  try {
    let parsed = marked.parse(clean, { async: false, breaks: true }) as string;

    // Transform marked checkboxes into TipTap taskList/taskItem structure
    if (parsed.includes('type="checkbox"')) {
      if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
        const doc = new DOMParser().parseFromString(`<body>${parsed}</body>`, 'text/html');
        const listItems = Array.from(doc.querySelectorAll('li'));
        let hasTaskItem = false;

        for (const li of listItems) {
          const checkbox = li.querySelector('input[type="checkbox"]');
          if (!checkbox) continue;

          // Ensure this checkbox belongs to this li directly, not a descendant li
          const closestLi = checkbox.closest('li');
          if (closestLi !== li) continue;

          hasTaskItem = true;
          const isChecked = checkbox.hasAttribute('checked') || 
            (checkbox as HTMLInputElement).checked === true || 
            /\bchecked\b/i.test(checkbox.outerHTML);

          li.setAttribute('data-type', 'taskItem');
          li.setAttribute('data-checked', isChecked ? 'true' : 'false');

          // Remove the checkbox element from its current position
          checkbox.remove();

          // Create the standard TipTap TaskItem DOM structure:
          // <label><input type="checkbox" ...><span></span></label>
          // <div><p>Content</p> [nested ul]</div>
          const label = doc.createElement('label');
          const input = doc.createElement('input');
          input.setAttribute('type', 'checkbox');
          if (isChecked) {
            input.setAttribute('checked', 'checked');
          }
          const span = doc.createElement('span');
          label.appendChild(input);
          label.appendChild(span);

          // Collect existing children of li (which may include text, <p>, <ul>, etc.)
          const existingNodes = Array.from(li.childNodes);
          const contentDiv = doc.createElement('div');
          const paragraph = doc.createElement('p');

          for (const node of existingNodes) {
            if (node.nodeName === 'UL' || node.nodeName === 'OL') {
              contentDiv.appendChild(node);
            } else if (node.nodeName === 'P') {
              while (node.firstChild) {
                paragraph.appendChild(node.firstChild);
              }
            } else {
              paragraph.appendChild(node);
            }
          }

          if (paragraph.childNodes.length > 0 || contentDiv.childNodes.length === 0) {
            contentDiv.insertBefore(paragraph, contentDiv.firstChild);
          }

          li.innerHTML = '';
          li.appendChild(label);
          li.appendChild(contentDiv);
        }

        if (hasTaskItem) {
          const uls = doc.querySelectorAll('ul');
          for (const ul of Array.from(uls)) {
            if (ul.querySelector('li[data-type="taskItem"]')) {
              ul.setAttribute('data-type', 'taskList');
            }
          }
          parsed = doc.body.innerHTML;
        }
      } else {
        // Fallback for non-DOM environments
        parsed = parsed.replace(/<li\b([^>]*)>([\s\S]*?)<\/li>/gi, (match, liAttrs, liInner) => {
          const inputMatch = liInner.match(/<input\b[^>]*type=["']?checkbox["']?[^>]*>/i);
          if (!inputMatch) return match;
          const inputTag = inputMatch[0];
          const isChecked = /\bchecked\b/i.test(inputTag);
          let cleanContent = liInner.replace(inputTag, '').trim();
          cleanContent = cleanContent.replace(/^<p\b[^>]*>([\s\S]*?)<\/p>$/i, '$1').trim();
          return `<li data-type="taskItem" data-checked="${isChecked ? 'true' : 'false'}"${liAttrs}><label><input type="checkbox"${isChecked ? ' checked="checked"' : ''}><span></span></label><div><p>${cleanContent}</p></div></li>`;
        });
        parsed = parsed.replace(/<ul\b([^>]*)>([\s\S]*?)<\/ul>/gi, (match, attrs, inner) => {
          if (inner.includes('data-type="taskItem"')) {
            return `<ul data-type="taskList"${attrs}>${inner}</ul>`;
          }
          return match;
        });
      }
    }

    // Transform marked callouts into TipTap callout node structure
    parsed = parsed.replace(/<blockquote>\s*<p>\[!([a-zA-Z]+)\](?:[ \t]+([^\n<]+))?([\s\S]*?)<\/blockquote>/gi, (_m, type, title, rest) => {
      const calloutType = type.toLowerCase();
      const calloutTitle = title ? title.trim() : (type.charAt(0).toUpperCase() + type.slice(1));
      let inner = rest.trim();
      if (inner && !inner.startsWith('<p>') && !inner.startsWith('<ul>') && !inner.startsWith('<ol>')) {
        inner = `<p>${inner}`;
      }
      return `<div data-type="callout" data-callout="${calloutType}" data-callout-title="${calloutTitle}" class="vault-callout vault-callout-${calloutType}"><div class="vault-callout-header" contenteditable="false"><span class="vault-callout-title">${calloutTitle}</span></div><div class="vault-callout-content">${inner || '<p></p>'}</div></div>`;
    });

    return parsed;
  } catch (err) {
    console.error('Error parsing markdown to HTML:', err);
    return clean;
  }
}

/**
 * Converts editor HTML back to pure, clean standard Markdown for file persistence
 */
export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';
  try {
    return turndown.turndown(html);
  } catch (err) {
    console.error('Error converting HTML to Markdown:', err);
    return html;
  }
}
