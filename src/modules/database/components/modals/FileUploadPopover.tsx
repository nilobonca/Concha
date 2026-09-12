import React, { useState, useRef, useMemo } from 'react';
import { Upload, Link as LinkIcon, Folder, X, Check, FileText } from 'lucide-react';
import { DatabaseAttachment, DatabaseAttachmentFileType } from '../../types';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { VaultNode } from '@/modules/vault/interfaces/vault';

export interface FileUploadPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (attachment: DatabaseAttachment) => void;
}

function flattenVaultFiles(nodes: VaultNode[]): { path: string; name: string }[] {
  const result: { path: string; name: string }[] = [];
  function recurse(list: VaultNode[]) {
    for (const node of list) {
      if (node.type === 'file') {
        result.push({ path: node.path, name: node.name });
      }
      if (node.children) {
        recurse(node.children);
      }
    }
  }
  recurse(nodes || []);
  return result;
}

export const FileUploadPopover: React.FC<FileUploadPopoverProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'vault' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [urlName, setUrlName] = useState('');
  const [urlType, setUrlType] = useState<DatabaseAttachmentFileType>('image');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { nodes } = useVaultStore();

  const vaultFiles = useMemo(() => flattenVaultFiles(nodes || []), [nodes]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let detectedType: DatabaseAttachmentFileType = 'other';
    if (file.type.startsWith('image/')) detectedType = 'image';
    else if (file.type.startsWith('audio/')) detectedType = 'audio';
    else if (file.type === 'application/pdf') detectedType = 'pdf';
    else if (file.type.includes('text') || file.type.includes('document')) detectedType = 'document';

    // Create object URL for local preview
    const objectUrl = URL.createObjectURL(file);

    const attachment: DatabaseAttachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: file.name,
      url: objectUrl,
      fileType: detectedType,
      size: file.size,
      mimeType: file.type,
      uploadedAt: Date.now(),
    };

    onUpload(attachment);
    onClose();
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;

    const attachment: DatabaseAttachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: urlName.trim() || urlInput.split('/').pop() || 'Arquivo Externo',
      url: urlInput.trim(),
      fileType: urlType,
      uploadedAt: Date.now(),
    };

    onUpload(attachment);
    onClose();
  };

  const handleSelectVaultAsset = (docPath: string, docName: string) => {
    let detectedType: DatabaseAttachmentFileType = 'document';
    if (docPath.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) detectedType = 'image';
    else if (docPath.match(/\.(mp3|wav|ogg|m4a)$/i)) detectedType = 'audio';
    else if (docPath.endsWith('.pdf')) detectedType = 'pdf';

    const attachment: DatabaseAttachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: docName || docPath,
      vaultPath: docPath,
      fileType: detectedType,
      uploadedAt: Date.now(),
    };

    onUpload(attachment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white dark:bg-[#1E2238] rounded-2xl shadow-2xl border border-stone-200 dark:border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-white/10">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-[#F4F0E6]">
            Adicionar Arquivo ou Anexo
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 dark:border-white/10 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'text-[#1831D7] dark:text-[#52B1FF] border-b-2 border-[#1831D7] dark:border-[#52B1FF] font-semibold'
                : 'text-stone-500 dark:text-[#B4D3F1]/60 hover:text-stone-800 dark:hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Fazer Upload</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vault')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-colors cursor-pointer ${
              activeTab === 'vault'
                ? 'text-[#1831D7] dark:text-[#52B1FF] border-b-2 border-[#1831D7] dark:border-[#52B1FF] font-semibold'
                : 'text-stone-500 dark:text-[#B4D3F1]/60 hover:text-stone-800 dark:hover:text-white'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Vault</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-colors cursor-pointer ${
              activeTab === 'url'
                ? 'text-[#1831D7] dark:text-[#52B1FF] border-b-2 border-[#1831D7] dark:border-[#52B1FF] font-semibold'
                : 'text-stone-500 dark:text-[#B4D3F1]/60 hover:text-stone-800 dark:hover:text-white'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Link URL</span>
          </button>
        </div>

        {/* Tab content */}
        <div className="p-4">
          {activeTab === 'upload' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-stone-200 dark:border-white/15 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#52B1FF] dark:hover:border-[#52B1FF] bg-stone-50/50 dark:bg-white/5 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-10 h-10 rounded-full bg-[#1831D7]/10 dark:bg-[#52B1FF]/20 flex items-center justify-center text-[#1831D7] dark:text-[#52B1FF] mb-3">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-stone-800 dark:text-[#F4F0E6]">
                Clique para selecionar ou arraste um arquivo
              </p>
              <p className="text-[11px] text-stone-400 dark:text-[#B4D3F1]/50 mt-1">
                Suporta imagens, áudios MP3/WAV, PDFs e documentos
              </p>
            </div>
          )}

          {activeTab === 'vault' && (
            <div className="max-h-56 overflow-y-auto space-y-1">
              {vaultFiles.length > 0 ? (
                vaultFiles.map((doc) => (
                  <button
                    key={doc.path}
                    type="button"
                    onClick={() => handleSelectVaultAsset(doc.path, doc.name)}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-[#F4F0E6] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-[#52B1FF] shrink-0" />
                      <span className="truncate">{doc.name}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 dark:text-[#B4D3F1]/40 shrink-0">
                      Vault
                    </span>
                  </button>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-stone-400 dark:text-[#B4D3F1]/40">
                  Nenhum arquivo encontrado no Vault
                </div>
              )}
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-stone-500 dark:text-[#B4D3F1] mb-1">
                  URL do Recurso
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://exemplo.com/imagem.png"
                  className="w-full px-3 py-1.5 text-xs bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-lg text-stone-800 dark:text-[#F4F0E6] outline-none focus:border-[#52B1FF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-500 dark:text-[#B4D3F1] mb-1">
                  Nome (Opcional)
                </label>
                <input
                  type="text"
                  value={urlName}
                  onChange={(e) => setUrlName(e.target.value)}
                  placeholder="Ex: Capa do Projeto"
                  className="w-full px-3 py-1.5 text-xs bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-lg text-stone-800 dark:text-[#F4F0E6] outline-none focus:border-[#52B1FF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-500 dark:text-[#B4D3F1] mb-1">
                  Tipo
                </label>
                <div className="flex gap-2">
                  {(['image', 'audio', 'document'] as DatabaseAttachmentFileType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setUrlType(t)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border capitalize cursor-pointer transition-colors ${
                        urlType === t
                          ? 'border-[#1831D7] bg-[#1831D7]/10 text-[#1831D7] dark:border-[#52B1FF] dark:bg-[#52B1FF]/20 dark:text-[#52B1FF] font-medium'
                          : 'border-stone-200 dark:border-white/10 text-stone-600 dark:text-[#B4D3F1]/70'
                      }`}
                    >
                      {t === 'image' ? 'Imagem' : t === 'audio' ? 'Áudio' : 'Documento'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  disabled={!urlInput.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#1831D7] dark:bg-[#7F95FF] text-white dark:text-[#17192A] rounded-lg disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
