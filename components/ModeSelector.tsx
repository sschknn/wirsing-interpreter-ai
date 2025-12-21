import React from 'react';
import { AppModeType } from '../types';
import { MicIcon, PresentationIcon, PencilIcon, DownloadIcon, LayoutIcon } from './Icons';

interface ModeSelectorProps {
  currentMode: AppModeType;
  onModeChange: (mode: AppModeType) => void;
  disabled?: boolean;
  hasData?: boolean;
}

interface ModeConfig {
  id: AppModeType;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  hoverColor: string;
  borderColor: string;
  disabled?: boolean;
}

const modes: ModeConfig[] = [
  {
    id: 'voice',
    label: 'Voice-Modus',
    description: 'Live-Input mit KI',
    icon: MicIcon,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    hoverColor: 'hover:bg-red-500/20',
    borderColor: 'border-red-500/20'
  },
  {
    id: 'editor',
    label: 'Editor-Modus',
    description: 'Manuelle Bearbeitung',
    icon: PencilIcon,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    hoverColor: 'hover:bg-indigo-500/20',
    borderColor: 'border-indigo-500/20'
  },
  {
    id: 'presentation',
    label: 'Präsentations-Modus',
    description: 'Anzeige-Modus',
    icon: PresentationIcon,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    hoverColor: 'hover:bg-green-500/20',
    borderColor: 'border-green-500/20'
  },
  {
    id: 'export',
    label: 'Export-Modus',
    description: 'Teilen & Exportieren',
    icon: DownloadIcon,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    hoverColor: 'hover:bg-purple-500/20',
    borderColor: 'border-purple-500/20'
  },
  {
    id: 'templates',
    label: 'Vorlagen-Modus',
    description: 'Professionelle Vorlagen',
    icon: LayoutIcon,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    hoverColor: 'hover:bg-cyan-500/20',
    borderColor: 'border-cyan-500/20'
  }
];

const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onModeChange,
  disabled = false,
  hasData = false
}) => {
  return (
    <div className="bg-slate-950/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">Arbeitsmodus</h3>
        <div className="text-xs text-slate-500 font-mono">
          {modes.find(m => m.id === currentMode)?.label || 'Unbekannt'}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          const isDisabled = disabled || (mode.id !== 'voice' && mode.id !== 'editor' && !hasData);

          return (
            <button
              key={mode.id}
              onClick={() => !isDisabled && onModeChange(mode.id)}
              disabled={isDisabled}
              className={`
                relative p-4 rounded-xl border transition-all duration-300 text-left group
                ${isActive 
                  ? `${mode.bgColor} ${mode.borderColor} border-2 shadow-lg` 
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Active Indicator */}
              {isActive && (
                <div className="absolute top-2 right-2">
                  <div className={`w-2 h-2 rounded-full ${mode.color.replace('text-', 'bg-')} animate-pulse`} />
                </div>
              )}

              {/* Icon */}
              <div className={`mb-3 ${isActive ? mode.color : 'text-slate-400 group-hover:text-white'} transition-colors`}>
                <Icon className="w-6 h-6" />
              </div>

              {/* Label */}
              <div className="font-semibold text-sm text-white mb-1">
                {mode.label}
              </div>

              {/* Description */}
              <div className="text-xs text-slate-500 leading-relaxed">
                {mode.description}
              </div>

              {/* Disabled Overlay */}
              {isDisabled && mode.id !== 'voice' && mode.id !== 'editor' && (
                <div className="absolute inset-0 bg-slate-900/50 rounded-xl flex items-center justify-center">
                  <div className="text-xs text-slate-600 font-medium">
                    {!hasData ? 'Keine Daten' : 'Nicht verfügbar'}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mode Description */}
      <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-white/5">
        <div className="flex items-start gap-3">
          <div className={`w-1.5 h-1.5 rounded-full mt-2 ${
            modes.find(m => m.id === currentMode)?.color.replace('text-', 'bg-')
          }`} />
          <div>
            <h4 className="font-semibold text-sm text-white mb-1">
              {modes.find(m => m.id === currentMode)?.label}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {getModeDescription(currentMode)}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            currentMode === 'voice' ? 'bg-red-500 animate-pulse' : 'bg-slate-600'
          }`} />
          <span className="text-xs text-slate-500 font-medium">
            {currentMode === 'voice' ? 'KI aktiv' : 'KI bereit'}
          </span>
        </div>

        {(currentMode === 'editor' || currentMode === 'presentation') && hasData && (
          <button
            onClick={() => onModeChange('voice')}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <MicIcon className="w-3 h-3" />
            Zu Voice-Modus
          </button>
        )}
      </div>
    </div>
  );
};

function getModeDescription(mode: AppModeType): string {
  switch (mode) {
    case 'voice':
      return 'Sprechen Sie frei und lassen Sie die KI Ihre Gedanken in Echtzeit strukturieren und organisieren. Perfekt für Brainstorming und spontane Ideenfindung.';
    case 'editor':
      return 'Bearbeiten Sie Ihre Präsentation manuell. Fügen Sie Folien hinzu, ändern Sie Inhalte und organisieren Sie Ihre Gedanken nach Ihren Vorstellungen.';
    case 'presentation':
      return 'Zeigen Sie Ihre Präsentation im professionellen Modus an. Optimiert für Bildschirmpräsentationen und Vorträge.';
    case 'export':
      return 'Exportieren und teilen Sie Ihre Präsentation. Verschiedene Formate verfügbar für maximale Kompatibilität.';
    case 'templates':
      return 'Wählen Sie aus professionellen Vorlagen für verschiedene Branchen und Anlässe. Erstellen Sie schnell beeindruckende Präsentationen.';
    default:
      return 'Wählen Sie einen Arbeitsmodus aus, um zu beginnen.';
  }
}

export default ModeSelector;