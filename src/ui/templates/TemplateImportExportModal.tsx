/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Download,
  Upload,
  FileCode,
  Check,
  Copy,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Template } from '../../domain/template/Template';
import { TemplateService } from '../../domain/template/templateService';

interface TemplateImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'export' | 'import';
  templateToExport?: Template | null;
  onImportSuccess?: (template: Template) => void;
}

export const TemplateImportExportModal: React.FC<TemplateImportExportModalProps> = ({
  isOpen,
  onClose,
  mode,
  templateToExport,
  onImportSuccess,
}) => {
  const templateService = TemplateService.getInstance();
  const [jsonContent, setJsonContent] = useState(() => {
    if (mode === 'export' && templateToExport) {
      return templateService.exportTemplateToJson(templateToExport);
    }
    return '';
  });
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!templateToExport) return;
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veecut_template_${templateToExport.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setError(null);
    if (!jsonContent.trim()) {
      setError('Please paste template JSON content.');
      return;
    }

    const imported = templateService.importTemplateFromJson(jsonContent);
    if (imported) {
      if (onImportSuccess) {
        onImportSuccess(imported);
      }
      onClose();
    } else {
      setError('Invalid VeeCut Template JSON schema. Please ensure mediaSlots and aspectRatio are present.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonContent(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#0f121d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141824]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              {mode === 'export' ? <Download className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'export' ? 'Export Template JSON' : 'Import Template JSON'}
              </h3>
              <p className="text-xs text-slate-400">
                {mode === 'export'
                  ? 'Standard VeeCut template schema for sharing or publishing'
                  : 'Import a custom template file or paste JSON definition'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {mode === 'import' && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-dashed border-white/20">
              <span className="text-xs text-slate-300">Upload .json template file:</span>
              <label className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-semibold cursor-pointer border border-sky-500/30 transition-colors">
                Browse File
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>JSON Definition</span>
              {mode === 'export' && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                </button>
              )}
            </div>

            <textarea
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
              placeholder='{\n  "name": "My Custom Template",\n  "aspectRatio": "9:16",\n  "mediaSlots": [...]\n}'
              rows={12}
              className="w-full p-3.5 rounded-xl bg-black/60 border border-white/10 text-sky-300 font-mono text-xs focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
              readOnly={mode === 'export'}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#141824]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {mode === 'export' ? (
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20 transition-all hover:scale-105"
              >
                <Download className="w-4 h-4" />
                Download JSON File
              </button>
            ) : (
              <button
                type="button"
                onClick={handleImport}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20 transition-all hover:scale-105"
              >
                <Sparkles className="w-4 h-4" />
                Import Template
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
