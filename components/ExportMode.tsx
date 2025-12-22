import React, { useState, useCallback } from 'react';
import { PresentationData } from '../types';
import ExportService, { ExportOptions, SharingOptions, ExportResult } from '../services/exportService';
import { DownloadIcon, ShareIcon, DocumentIcon, CodeIcon, EyeIcon, SettingsIcon } from './Icons';

interface ExportModeProps {
  data: PresentationData;
  onClose: () => void;
}

interface ExportFormat {
  id: 'pdf' | 'pptx' | 'html' | 'json';
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  recommended?: boolean;
}

const formats: ExportFormat[] = [
  {
    id: 'pdf',
    name: 'PDF',
    description: 'Professionelles Format für Druck und Archivierung',
    icon: DocumentIcon,
    color: 'red',
    recommended: true
  },
  {
    id: 'pptx',
    name: 'PowerPoint',
    description: 'Native PowerPoint-Datei für weitere Bearbeitung',
    icon: DocumentIcon,
    color: 'orange'
  },
  {
    id: 'html',
    name: 'HTML',
    description: 'Web-optimiertes Format für Online-Präsentationen',
    icon: CodeIcon,
    color: 'blue'
  },
  {
    id: 'json',
    name: 'JSON',
    description: 'Datenformat für API-Integration und Backup',
    icon: CodeIcon,
    color: 'green'
  }
];

const ExportMode: React.FC<ExportModeProps> = ({ data, onClose }) => {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'pptx' | 'html' | 'json'>('pdf');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    quality: 'high',
    compression: false,
    watermark: false,
    includeNotes: true,
    theme: 'default'
  });
  const [sharingOptions, setSharingOptions] = useState<SharingOptions>({
    enablePassword: false,
    allowComments: true,
    cloudIntegration: 'none'
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSharing, setShowSharing] = useState(false);
  const [batchFormats, setBatchFormats] = useState<Set<string>>(new Set());

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportResult(null);

    try {
      const options = { ...exportOptions, format: selectedFormat };
      let result: ExportResult;

      if (batchFormats.size > 0) {
        // Batch-Export
        const formats = Array.from(batchFormats) as ('pdf' | 'pptx' | 'html' | 'json')[];
        result = { success: true, data: 'Batch-Export gestartet...' } as ExportResult;
        
        const results = await ExportService.batchExport(data, formats);
        console.log('Batch-Export Ergebnisse:', results);
      } else {
        // Einzelner Export
        switch (selectedFormat) {
          case 'pdf':
            result = await ExportService.exportToPDF(data, options);
            break;
          case 'pptx':
            result = await ExportService.exportToPowerPoint(data, options);
            break;
          case 'html':
            result = await ExportService.exportToHTML(data, options);
            break;
          case 'json':
            result = await ExportService.exportToJSON(data);
            break;
          default:
            throw new Error('Unbekanntes Format');
        }
      }

      setExportResult(result);

      if (result.success && result.data) {
        if (result.filename && result.data instanceof Blob) {
          ExportService.downloadFile(result.data, result.filename);
        } else if (typeof result.data === 'string' && selectedFormat === 'html') {
          ExportService.openInNewTab(result.data, result.filename || 'presentation.html');
        }
      }
    } catch (error) {
      setExportResult({
        success: false,
        error: error instanceof Error ? error.message : 'Export fehlgeschlagen'
      });
    } finally {
      setIsExporting(false);
    }
  }, [data, selectedFormat, exportOptions, batchFormats]);

  const handleShare = useCallback(async () => {
    setIsExporting(true);

    try {
      const result = await ExportService.createShareableLink(data, sharingOptions);
      setExportResult(result);

      if (result.success && result.shareUrl) {
        await navigator.clipboard.writeText(result.shareUrl);
        alert('Link in Zwischenablage kopiert!');
      }
    } catch (error) {
      setExportResult({
        success: false,
        error: error instanceof Error ? error.message : 'Teilen fehlgeschlagen'
      });
    } finally {
      setIsExporting(false);
    }
  }, [data, sharingOptions]);

  const toggleBatchFormat = useCallback((formatId: string) => {
    setBatchFormats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(formatId)) {
        newSet.delete(formatId);
      } else {
        newSet.add(formatId);
      }
      return newSet;
    });
  }, []);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Export & Teilen</h1>
            <p className="text-slate-400 mt-1">"{data?.title || 'Untitled Presentation'}" in verschiedenen Formaten exportieren</p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Zurück
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Export Options */}
        <div className="w-2/3 p-6 overflow-y-auto">
          {/* Format Selection */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DownloadIcon className="w-5 h-5" />
              Export-Format wählen
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {formats.map((format) => {
                const Icon = format.icon;
                const isSelected = selectedFormat === format.id;
                const isBatchSelected = batchFormats.has(format.id);
                
                return (
                  <div
                    key={format.id}
                    className={`
                      relative p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${isSelected || isBatchSelected 
                        ? `border-${format.color}-500 bg-${format.color}-500/10` 
                        : 'border-white/10 hover:border-white/20 bg-white/5'
                      }
                    `}
                    onClick={() => {
                      if (isBatchSelected) {
                        toggleBatchFormat(format.id);
                      } else {
                        setSelectedFormat(format.id);
                        setBatchFormats(new Set());
                      }
                    }}
                  >
                    {format.recommended && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded">
                        Empfohlen
                      </div>
                    )}
                    
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-${format.color}-500/20`}>
                        <Icon className={`w-6 h-6 text-${format.color}-400`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{format.name}</h3>
                        <p className="text-sm text-slate-400 mt-1">{format.description}</p>
                      </div>
                    </div>
                    
                    {isBatchSelected && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                        Batch
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="mb-8">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <SettingsIcon className="w-5 h-5" />
              Erweiterte Optionen
            </button>
            
            {showAdvanced && (
              <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-white/10 space-y-4">
                {/* Quality Settings */}
                <div>
                  <label className="block text-sm font-medium mb-2">Qualität</label>
                  <select
                    value={exportOptions.quality}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, quality: e.target.value as any }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2"
                  >
                    <option value="low">Niedrig (schnell)</option>
                    <option value="medium">Mittel (ausgewogen)</option>
                    <option value="high">Hoch (beste Qualität)</option>
                  </select>
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium mb-2">Design-Thema</label>
                  <select
                    value={exportOptions.theme}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, theme: e.target.value as any }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2"
                  >
                    <option value="default">Standard</option>
                    <option value="business">Business</option>
                    <option value="modern">Modern</option>
                    <option value="creative">Kreativ</option>
                  </select>
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.compression}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, compression: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Komprimierung aktivieren</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.watermark}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, watermark: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Wasserzeichen hinzufügen</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeNotes}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, includeNotes: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Notizen einschließen</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <EyeIcon className="w-5 h-5" />
              Vorschau
            </h2>
            <div className="bg-slate-900/50 border border-white/10 rounded-lg p-6">
              <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center text-slate-400">
                  <DocumentIcon className="w-16 h-16 mx-auto mb-2" />
                  <p className="text-sm">Vorschau wird geladen...</p>
                  <p className="text-xs mt-1">{data?.slides?.length || 0} Folien</p>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Format: {formats.find(f => f.id === selectedFormat)?.name} • 
                Qualität: {exportOptions.quality} • 
                {exportOptions.compression && ' Komprimiert'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Actions */}
        <div className="w-1/3 border-l border-white/10 p-6">
          {/* Export Actions */}
          <div className="space-y-4">
            <button
              onClick={handleExport}
              disabled={isExporting || (batchFormats.size === 0 && !selectedFormat)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {isExporting ? 'Exportiere...' : 
               batchFormats.size > 0 ? `Batch-Export (${batchFormats.size} Formate)` :
               'Export starten'}
            </button>

            <button
              onClick={() => setShowSharing(!showSharing)}
              className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ShareIcon className="w-5 h-5" />
              Teilen & Cloud
            </button>
          </div>

          {/* Sharing Options */}
          {showSharing && (
            <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-white/10 space-y-4">
              <h3 className="font-semibold">Sharing-Einstellungen</h3>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sharingOptions.enablePassword}
                  onChange={(e) => setSharingOptions(prev => ({ ...prev, enablePassword: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Passwort-Schutz</span>
              </label>
              
              {sharingOptions.enablePassword && (
                <input
                  type="password"
                  placeholder="Passwort eingeben"
                  value={sharingOptions.password || ''}
                  onChange={(e) => setSharingOptions(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm"
                />
              )}
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sharingOptions.allowComments}
                  onChange={(e) => setSharingOptions(prev => ({ ...prev, allowComments: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Kommentare erlauben</span>
              </label>
              
              <div>
                <label className="block text-sm font-medium mb-2">Cloud-Integration</label>
                <select
                  value={sharingOptions.cloudIntegration}
                  onChange={(e) => setSharingOptions(prev => ({ ...prev, cloudIntegration: e.target.value as any }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="none">Keine</option>
                  <option value="google-drive">Google Drive</option>
                  <option value="one-drive">OneDrive</option>
                  <option value="dropbox">Dropbox</option>
                </select>
              </div>
              
              <button
                onClick={handleShare}
                disabled={isExporting}
                className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 rounded-lg text-sm transition-colors"
              >
                {isExporting ? 'Link wird erstellt...' : 'Link erstellen & teilen'}
              </button>
            </div>
          )}

          {/* Export Result */}
          {exportResult && (
            <div className={`mt-6 p-4 rounded-lg border ${
              exportResult.success 
                ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <div className="font-medium mb-1">
                {exportResult.success ? 'Export erfolgreich!' : 'Export fehlgeschlagen'}
              </div>
              {exportResult.success && exportResult.shareUrl && (
                <div className="text-sm">
                  Share-URL: {exportResult.shareUrl}
                </div>
              )}
              {exportResult.error && (
                <div className="text-sm mt-1">
                  Fehler: {exportResult.error}
                </div>
              )}
            </div>
          )}

          {/* Quick Stats */}
          <div className="mt-8 p-4 bg-slate-900/30 rounded-lg border border-white/5">
            <h3 className="font-medium mb-3">Präsentations-Info</h3>
            <div className="space-y-2 text-sm text-slate-400">
              <div className="flex justify-between">
                <span>Titel:</span>
                <span className="text-white">{data?.title || 'Untitled Presentation'}</span>
              </div>
              <div className="flex justify-between">
                <span>Folien:</span>
                <span className="text-white">{data?.slides?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Geschätzte Dauer:</span>
                <span className="text-white">{Math.max(1, Math.round((data?.slides?.length || 0) * 0.5))} min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportMode;