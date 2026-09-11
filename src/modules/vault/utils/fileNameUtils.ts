/**
 * Utilitários para validação, sanitização e normalização de nomes de arquivos e pastas no Vault.
 * Garante total compatibilidade com o sistema de arquivos Windows (NTFS), Chromium File System Access API
 * e IndexedDB, preservando acentuação e convertendo caracteres proibidos em equivalentes limpos e seguros.
 */

// Caracteres estritamente proibidos em nomes de arquivos e pastas no Windows (NTFS)
export const WINDOWS_FORBIDDEN_CHARACTERS = ['\\', '/', ':', '*', '?', '"', '<', '>', '|'] as const;
export const WINDOWS_FORBIDDEN_CHARS_DISPLAY = '\\ / : * ? " < > |';
export const WINDOWS_FORBIDDEN_REGEX = /[<>:"/\\|?*\x00-\x1f\x7f]/g;

/**
 * Valida se um texto contém caracteres proibidos no Windows e retorna os caracteres encontrados.
 */
export function detectInvalidWindowsChars(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/[<>:"/\\|?*\x00-\x1f\x7f]/g);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Remove caracteres proibidos do Windows e retorna a versão limpa junto com quais foram removidos.
 */
export function stripInvalidWindowsChars(text: string): { clean: string; hadInvalid: boolean; invalidChars: string[] } {
  if (!text) return { clean: '', hadInvalid: false, invalidChars: [] };
  const invalidChars = detectInvalidWindowsChars(text);
  const clean = text.replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '');
  return {
    clean,
    hadInvalid: invalidChars.length > 0,
    invalidChars,
  };
}

// Nomes reservados de dispositivos no sistema de arquivos do Windows (DOS)
const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
]);

/**
 * Sanitiza um nome de arquivo ou pasta individual (sem barras de diretório),
 * substituindo caracteres proibidos no Windows/Chromium por alternativas elegantes
 * e preservando 100% de caracteres internacionais, acentos e símbolos permitidos.
 */
export function sanitizeVaultFileName(name: string, isFolder: boolean = false): string {
  if (!name) return isFolder ? 'Nova Pasta' : 'Nova nota';

  let clean = name.trim();

  // Decodifica entidades URL se o nome contiver codificação percentual (ex: %20, %C3%A7)
  if (/%[0-9a-fA-F]{2}/.test(clean)) {
    try {
      clean = decodeURIComponent(clean);
    } catch {
      // Mantém original se decode falhar
    }
  }

  // Normalização Unicode NFC para garantir composição correta de acentos (ex: á, ã, ç, é)
  clean = clean.normalize('NFC');

  // Substituição de caracteres proibidos no Windows (< > : " / \ | ? *)
  clean = clean
    // Dois pontos e Pipe convertidos em espaço-hífen-espaço para títulos naturais (ex: "Capítulo 1: Início" -> "Capítulo 1 - Início")
    .replace(/[:|]/g, ' - ')
    // Barras de caminho convertidas em hífen único (ex: "10/12/2024" -> "10-12-2024")
    .replace(/[\\/]/g, '-')
    // Aspas duplas convertidas em aspas simples (ex: O "Mestre" -> O 'Mestre')
    .replace(/"/g, "'")
    // Símbolos de menor e maior convertidos em parênteses (ex: <Template> -> (Template))
    .replace(/</g, '(')
    .replace(/>/g, ')')
    // Remoção de asteriscos, interrogações e caracteres de controle (0x00 a 0x1F e 0x7F)
    .replace(/[*?\x00-\x1f\x7f]/g, '');

  // Colapsa múltiplos espaços consecutivos em um só
  clean = clean.replace(/\s+/g, ' ');

  // Colapsa múltiplos hífens consecutivos em um só
  clean = clean.replace(/-{2,}/g, '-');

  // Ajusta espaçamentos ao redor de hífens (ex: " - " fica uniforme)
  clean = clean.replace(/\s+-\s+/g, ' - ').trim();

  // Windows proíbe nomes que começam ou terminam com pontos ou espaços antes da extensão
  clean = clean.replace(/^[.\s]+|[.\s]+$/g, '');

  // Se o nome resultante ficou vazio após a limpeza de caracteres proibidos
  if (!clean) {
    return isFolder ? 'Nova Pasta' : 'Nova nota';
  }

  // Protege contra nomes reservados do Windows
  const upper = clean.toUpperCase();
  if (WINDOWS_RESERVED_NAMES.has(upper)) {
    clean = `_${clean}`;
  }

  return clean;
}

/**
 * Sanitiza um caminho completo (ex: "Campanha/Ato 1/Capítulo 1: O Início.md"),
 * preservando a hierarquia de pastas válidas e sanitizando cada segmento individualmente.
 */
export function sanitizeVaultPath(path: string, isFolder: boolean = false): string {
  if (!path) return '';

  let cleanPath = path.trim().replace(/\\/g, '/');

  // Decodifica se houver URL encoding
  if (/%[0-9a-fA-F]{2}/.test(cleanPath)) {
    try {
      cleanPath = decodeURIComponent(cleanPath);
    } catch {}
  }

  cleanPath = cleanPath.normalize('NFC');

  const rawSegments = cleanPath.split('/').filter(Boolean);
  if (rawSegments.length === 0) return '';

  if (isFolder) {
    return rawSegments.map((seg) => sanitizeVaultFileName(seg, true)).join('/');
  }

  const rawFileName = rawSegments.pop()!;
  const isTxt = rawFileName.toLowerCase().endsWith('.txt');
  const isMd = rawFileName.toLowerCase().endsWith('.md');
  let ext = '';
  let baseName = rawFileName;

  if (isTxt) {
    ext = '.txt';
    baseName = rawFileName.slice(0, -4);
  } else if (isMd) {
    ext = '.md';
    baseName = rawFileName.slice(0, -3);
  } else {
    const lastDot = rawFileName.lastIndexOf('.');
    if (lastDot > 0) {
      ext = rawFileName.slice(lastDot);
      baseName = rawFileName.slice(0, lastDot);
    }
  }

  const cleanBase = sanitizeVaultFileName(baseName, false);
  const cleanFileName = ext ? `${cleanBase}${ext}` : cleanBase;

  const cleanFolders = rawSegments.map((seg) => sanitizeVaultFileName(seg, true));
  return cleanFolders.length > 0 ? `${cleanFolders.join('/')}/${cleanFileName}` : cleanFileName;
}

/**
 * Valida se um nome de arquivo ou pasta é seguro e não possui caracteres proibidos no Windows.
 */
export function isValidVaultFileName(name: string): boolean {
  if (!name || !name.trim()) return false;
  // Caracteres estritamente proibidos no Windows: < > : " / \ | ? *
  if (/[<>:"/\\|?*\x00-\x1f\x7f]/.test(name)) return false;
  // Não pode terminar em espaço ou ponto
  if (/[.\s]$/.test(name)) return false;
  // Não pode ser nome reservado
  const base = name.split('.')[0].toUpperCase();
  if (WINDOWS_RESERVED_NAMES.has(base)) return false;
  return true;
}
