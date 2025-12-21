import React from 'react';
import { ToolbarState } from '../types';
import { 
  UndoIcon, 
  RedoIcon, 
  SaveIcon, 
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
  GridIcon,
  PresentationIcon,
  SparklesIcon,
  ImageIcon,
  LayoutIcon
} from './Icons';

interface ToolbarProps {
  state: ToolbarState;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onExport: () => void;
  onSlideNavigate: (direction: 'prev' | 'next') => void;
  onZoomChange: (zoom: number) => void;
  onToggleGrid: () => void;
  onPresentationMode: () => void;
  onCreatePresentation?: () => void;
  onOptimizeLayout?: () => void;
  onAddImages?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  canSave: boolean;
  hasUnsavedChanges: boolean;
  disabled?: boolean;
  isCreatingPresentation?: boolean;
  isOptimizingLayout?: boolean;
  isAddingImages?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  state,
  onUndo,
  onRedo,
  onSave,
  onExport,
  onSlideNavigate,
  onZoomChange,
  onToggleGrid,
  onPresentationMode,
  onCreatePresentation,
  onOptimizeLayout,
  onAddImages,
  canUndo,
  canRedo,
  canSave,
  hasUnsavedChanges,
  disabled = false,
  isCreatingPresentation = false,
  isOptimizingLayout = false,
  isAddingImages = false
}) => {
  const buttonClass = `
    flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-lg border
    ${disabled 
      ? 'text-slate-500 cursor-not-allowed border-white/5' 
      : 'text-slate-300 hover:text-white hover:bg-white/10 border-white/10'
    }
  `;

  const primaryButtonClass = `
    flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors rounded-lg
    ${disabled 
      ? 'text-slate-500 cursor-not-allowed bg-slate-800' 
      : hasUnsavedChanges
        ? 'text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg'
        : 'text-slate-300 hover:text-white hover:bg-white/10 border border-white/10'
    }
  `;

  return (
    <div className="bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left Section - History Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo || disabled}
            className={buttonClass}
            title="Rückgängig (Ctrl+Z)"
          >
            <UndoIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Rückgängig</span>
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo || disabled}
            className={buttonClass}
            title="Wiederholen (Ctrl+Y)"
          >
            <RedoIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Wiederholen</span>
          </button>

          <div className="w-px h-6 bg-white/10 mx-2" />
        </div>

        {/* Center Section - Slide Navigation */}
        {state.totalSlides > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSlideNavigate('prev')}
              disabled={state.selectedSlide <= 0 || disabled}
              className={buttonClass}
              title="Vorherige Folie"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Vorherige</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
              <span className="text-sm font-medium text-white">
                {state.selectedSlide + 1}
              </span>
              <span className="text-xs text-slate-500">von</span>
              <span className="text-sm font-medium text-white">
                {state.totalSlides}
              </span>
            </div>

            <button
              onClick={() => onSlideNavigate('next')}
              disabled={state.selectedSlide >= state.totalSlides - 1 || disabled}
              className={buttonClass}
              title="Nächste Folie"
            >
              <span className="hidden sm:inline">Nächste</span>
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Right Section - Actions and Tools */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg">
            <button
              onClick={() => onZoomChange(Math.max(25, state.zoom - 25))}
              disabled={disabled || state.zoom <= 25}
              className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Verkleinern"
            >
              <ZoomOutIcon className="w-4 h-4" />
            </button>
            
            <div className="px-2 py-1 text-xs font-mono text-slate-300 min-w-[3rem] text-center">
              {state.zoom}%
            </div>
            
            <button
              onClick={() => onZoomChange(Math.min(200, state.zoom + 25))}
              disabled={disabled || state.zoom >= 200}
              className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Vergrößern"
            >
              <ZoomInIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Grid Toggle */}
          <button
            onClick={onToggleGrid}
            disabled={disabled}
            className={`
              p-2 rounded-lg border transition-colors
              ${state.showGrid
                ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/10 border-white/10'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            title="Raster ein-/ausblenden"
          >
            <GridIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-white/10 mx-2" />

          {/* KI-Assistenten Sektion */}
          <div className="flex items-center gap-1">
            {/* Präsentationserstellung */}
            {onCreatePresentation && (
              <button
                onClick={onCreatePresentation}
                disabled={disabled || isCreatingPresentation}
                className={`
                  p-2 rounded-lg border transition-colors flex items-center gap-1
                  ${isCreatingPresentation
                    ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 cursor-wait'
                    : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border-purple-500/20'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                title="KI-Präsentation erstellen"
              >
                <SparklesIcon className="w-4 h-4" />
                <span className="hidden lg:inline text-xs">
                  {isCreatingPresentation ? 'Erstelle...' : 'KI-Präsentation'}
                </span>
              </button>
            )}

            {/* Layout-Optimierung */}
            {onOptimizeLayout && (
              <button
                onClick={onOptimizeLayout}
                disabled={disabled || isOptimizingLayout || state.totalSlides === 0}
                className={`
                  p-2 rounded-lg border transition-colors flex items-center gap-1
                  ${isOptimizingLayout
                    ? 'text-green-400 bg-green-500/10 border-green-500/20 cursor-wait'
                    : 'text-green-400 hover:text-green-300 hover:bg-green-500/10 border-green-500/20'
                  }
                  ${disabled || state.totalSlides === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                title="Layout optimieren"
              >
                <LayoutIcon className="w-4 h-4" />
                <span className="hidden lg:inline text-xs">
                  {isOptimizingLayout ? 'Optimiere...' : 'Layout'}
                </span>
              </button>
            )}

            {/* Bilder hinzufügen */}
            {onAddImages && (
              <button
                onClick={onAddImages}
                disabled={disabled || isAddingImages || state.totalSlides === 0}
                className={`
                  p-2 rounded-lg border transition-colors flex items-center gap-1
                  ${isAddingImages
                    ? 'text-blue-400 bg-blue-500/10 border-blue-500/20 cursor-wait'
                    : 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 border-blue-500/20'
                  }
                  ${disabled || state.totalSlides === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                title="KI-Bilder hinzufügen"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="hidden lg:inline text-xs">
                  {isAddingImages ? 'Lade...' : 'Bilder'}
                </span>
              </button>
            )}
          </div>

          <div className="w-px h-6 bg-white/10 mx-2" />

          {/* Save Button */}
          <button
            onClick={onSave}
            disabled={!canSave || disabled}
            className={primaryButtonClass}
            title="Speichern (Ctrl+S)"
          >
            <SaveIcon className="w-4 h-4" />
            <span className="hidden sm:inline">
              {hasUnsavedChanges ? 'Speichern*' : 'Gespeichert'}
            </span>
          </button>

          {/* Export Button */}
          <button
            onClick={onExport}
            disabled={disabled}
            className={buttonClass}
            title="Exportieren (Ctrl+E)"
          >
            <DownloadIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Presentation Mode Button */}
          <button
            onClick={onPresentationMode}
            disabled={disabled || state.totalSlides === 0}
            className={buttonClass}
            title="Präsentationsmodus (F5)"
          >
            <PresentationIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Präsentation</span>
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-slate-500">
          <span>Zoom: {state.zoom}%</span>
          {state.showGrid && <span>Raster aktiv</span>}
          {hasUnsavedChanges && (
            <span className="text-amber-400 flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              Ungespeicherte Änderungen
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          {state.totalSlides > 0 && (
            <span>
              Folie {state.selectedSlide + 1} von {state.totalSlides}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;