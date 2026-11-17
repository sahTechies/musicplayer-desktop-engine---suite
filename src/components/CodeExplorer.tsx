import React, { useState } from 'react';
import { FileCode, Folder, Copy, Check, Download, ExternalLink, Code2 } from 'lucide-react';
import JSZip from 'jszip';
import { JAVA_PROJECT_FILES, CodeFile } from '../data/sourceCode';

export const CodeExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(JAVA_PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const rootFolder = zip.folder('music-player');

      if (rootFolder) {
        JAVA_PROJECT_FILES.forEach((file) => {
          rootFolder.file(file.path, file.content);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'music-player-complete.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error generating zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const categories = Array.from(new Set(JAVA_PROJECT_FILES.map(f => f.category)));

  return (
    <div className="w-full bg-[#0c0d14] border border-slate-800 rounded-xl p-6 text-slate-200 shadow-2xl space-y-5 font-sans">
      {/* HEADER & DOWNLOAD ACTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-sky-400" />
            <span>Complete Java / Maven Source Code Deliverables</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            100% production-ready, compilable Java 21 LTS &amp; JavaFX modules with zero stubs or placeholders.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#171a26] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied File!' : 'Copy Current File'}</span>
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isZipping ? 'Packaging ZIP...' : 'Download Full Project (.ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* CODE EXPLORER GRID: FILE TREE + CODE VIEWER */}
      <div className="grid grid-cols-12 gap-5 min-h-[560px]">
        {/* LEFT: FILE TREE BY CATEGORY */}
        <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-[#11131e] border border-slate-800 rounded-xl p-3 space-y-3 overflow-y-auto max-h-[620px]">
          <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-2">
            Maven Project Tree (`music-player/`)
          </p>

          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat} className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 px-2">
                  <Folder className="w-3.5 h-3.5 text-sky-400" />
                  <span>{cat}</span>
                </div>
                <div className="space-y-0.5 pl-2">
                  {JAVA_PROJECT_FILES.filter(f => f.category === cat).map((file) => {
                    const isSelected = selectedFile.path === file.path;
                    return (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFile(file)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono truncate flex items-center gap-2 transition-colors ${
                          isSelected
                            ? 'bg-sky-500/15 text-sky-400 font-bold border border-sky-500/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                        }`}
                      >
                        <FileCode className="w-3 h-3 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: CODE VIEWER */}
        <div className="col-span-12 md:col-span-8 lg:col-span-9 bg-[#11131e] border border-slate-800 rounded-xl flex flex-col overflow-hidden">
          {/* File Tab Info */}
          <div className="h-10 bg-[#161825] border-b border-slate-800 px-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-400">{selectedFile.path}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-sans">
              {selectedFile.description}
            </span>
          </div>

          {/* Code Content with Line Numbers */}
          <div className="flex-1 p-4 font-mono text-xs overflow-auto max-h-[580px] bg-[#0c0d13]">
            <pre className="text-slate-300 leading-relaxed">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
