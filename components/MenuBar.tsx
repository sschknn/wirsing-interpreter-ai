import React from 'react';
import { MenuAction, PresentationData } from '../types';
import { 
  FileIcon, 
  EditIcon, 
  InsertIcon, 
  ViewIcon,
  SaveIcon,
  OpenIcon,
  NewIcon,
  ExportIcon,
  UndoIcon,
  RedoIcon,
  CopyIcon,
  PasteIcon,
  SlideIcon,
  TextIcon,
  ImageIcon,
  ShapeIcon,
  EditorIcon,
  PresentationModeIcon,
  FullscreenIcon
} from './Icons';

interface MenuBarProps {
  onFileAction: (action: string) => void;
  onEditAction: (action: string) => void;
  onInsertAction: (action: string) => void;
  onViewAction: (action: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  hasUnsavedChanges: boolean;
  currentMode: string;
  disabled?: boolean;
}

const MenuBar: React.FC<MenuBarProps> = ({
  onFileAction,
  onEditAction,
  onInsertAction,
  onViewAction,
  canUndo,
  canRedo,
  hasUnsavedChanges,
  currentMode,
  disabled = false
}) => {
  const createMenuItem = (
    icon: React.ComponentType<any>,
    label: string,
    shortcut?: string,
    disabled = false,
    onClick: () => void = () => {},
    isActive = false
  ) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-md
        ${disabled 
          ? 'text-slate-500 cursor-not-allowed' 
          : isActive
            ? 'bg-indigo-600 text-white'
            : 'text-slate-300 hover:text-white hover:bg-white/10'
        }
      `}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
    >
      {React.createElement(icon, { className: "w-4 h-4" })}
      <span>{label}</span>
      {shortcut && <span className="text-xs opacity-70 ml-auto">{shortcut}</span>}
    </button>
  );

  return (
    <div className="bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-1">
        {/* Datei Menü */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors">
            <FileIcon className="w-4 h-4" />
            <span>Datei</span>
          </button>
          <div className="absolute top-full left-0 mt-1 w-48 bg-slate-900 border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="p-2 space-y-1">
              {createMenuItem(NewIcon, 'Neu', 'Ctrl+N', disabled, () => onFileAction('new'))}
              {createMenuItem(OpenIcon, 'Öffnen', 'Ctrl+O', disabled, () => onFileAction('open'))}
              <div className="border-t border-white/10 my-1" />
              {createMenuItem(SaveIcon, 'Speichern', 'Ctrl+S', !hasUnsavedChanges, () => onFileAction('save'))}
              {createMenuItem(ExportIcon, 'Exportieren', 'Ctrl+E', disabled, () => onFileAction('export'))}
            </div>
          </div>
        </div>

        {/* Bearbeiten Menü */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors">
            <EditIcon className="w-4 h-4" />
            <span>Bearbeiten</span>
          </button>
          <div className="absolute top-full left-0 mt-1 w-48 bg-slate-900 border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="p-2 space-y-1">
              {createMenuItem(UndoIcon, 'Rückgängig', 'Ctrl+Z', !canUndo, () => onEditAction('undo'))}
              {createMenuItem(RedoIcon, 'Wiederholen', 'Ctrl+Y', !canRedo, () => onEditAction('redo'))}
              <div className="border-t border-white/10 my-1" />
              {createMenuItem(CopyIcon, 'Kopieren', 'Ctrl+C', disabled, () => onEditAction('copy'))}
              {createMenuItem(PasteIcon, 'Einfügen', 'Ctrl+V', disabled, () => onEditAction('paste'))}
            </div>
          </div>
        </div>

        {/* Einfügen Menü */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors">
            <InsertIcon className="w-4 h-4" />
            <span>Einfügen</span>
          </button>
          <div className="absolute top-full left-0 mt-1 w-48 bg-slate-900 border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="p-2 space-y-1">
              {createMenuItem(SlideIcon, 'Neue Folie', 'Ctrl+Shift+N', disabled, () => onInsertAction('new-slide'))}
              {createMenuItem(TextIcon, 'Text', 'Ctrl+T', disabled, () => onInsertAction('text'))}
              {createMenuItem(ImageIcon, 'Bild', 'Ctrl+I', disabled, () => onInsertAction('image'))}
              {createMenuItem(ShapeIcon, 'Form', 'Ctrl+Shift+S', disabled, () => onInsertAction('shape'))}
            </div>
          </div>
        </div>

        {/* Ansicht Menü */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors">
            <ViewIcon className="w-4 h-4" />
            <span>Ansicht</span>
          </button>
          <div className="absolute top-full left-0 mt-1 w-48 bg-slate-900 border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="p-2 space-y-1">
              {createMenuItem(
                EditorIcon, 
                'Editor', 
                'Ctrl+1', 
                currentMode === 'editor', 
                () => onViewAction('editor'),
                currentMode === 'editor'
              )}
              {createMenuItem(
                PresentationModeIcon, 
                'Präsentation', 
                'Ctrl+2', 
                currentMode === 'presentation', 
                () => onViewAction('presentation'),
                currentMode === 'presentation'
              )}
              {createMenuItem(
                FullscreenIcon, 
                'Vollbild', 
                'F11', 
                currentMode !== 'presentation', 
                () => onViewAction('fullscreen'),
                false
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-4">
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span>Ungespeicherte Änderungen</span>
          </div>
        )}
        <div className="text-xs text-slate-500 font-mono">
          {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Modus
        </div>
      </div>
    </div>
  );
};

export default MenuBar;