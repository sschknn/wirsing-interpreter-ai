import * as React from 'react';
import { SlideElement } from './PresentationEditor';
import { 
  TextIcon, 
  ImageIcon, 
  ShapeIcon, 
  LayoutIcon,
  TableIcon,
  VideoIcon,
  TypeIcon,
  CircleIcon,
  SquareIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon
} from './Icons';

// ============================================================================
// ELEMENT TOOLBAR COMPONENT
// ============================================================================

interface ElementToolbarProps {
  onElementAdd: (element: SlideElement) => void;
  onElementTypeSelect: (type: string) => void;
  selectedElement: string | null;
}

const ElementToolbar: React.FC<ElementToolbarProps> = ({
  onElementAdd,
  onElementTypeSelect,
  selectedElement
}: ElementToolbarProps) => {
  
  const createElement = (type: 'text' | 'image' | 'shape' | 'chart' | 'table' | 'video') => {
    const element: SlideElement = {
      id: `${type}_${Date.now()}`,
      type,
      position: { x: 100, y: 100 },
      size: { width: 200, height: 100 },
      content: getDefaultContent(type),
      style: getDefaultStyle(type)
    };

    onElementAdd(element);
    onElementTypeSelect(type);
  };

  const getDefaultContent = (type: 'text' | 'image' | 'shape' | 'chart' | 'table' | 'video') => {
    switch (type) {
      case 'text':
        return { text: 'Neuer Text', fontSize: 16 };
      case 'image':
        return { src: '', alt: 'Neues Bild' };
      case 'shape':
        return { shape: 'rectangle' };
      case 'chart':
        return { type: 'bar', data: [] };
      case 'table':
        return { rows: 3, cols: 3, data: [] };
      case 'video':
        return { src: '', title: 'Neues Video' };
      default:
        return {};
    }
  };

  const getDefaultStyle = (type: 'text' | 'image' | 'shape' | 'chart' | 'table' | 'video') => {
    const baseStyle = {
      fontSize: 16,
      fontFamily: 'Inter, sans-serif',
      color: '#000000',
      backgroundColor: 'transparent',
      borderColor: '#000000',
      borderWidth: 1,
      borderRadius: 0,
      opacity: 1,
      rotation: 0
    };

    switch (type) {
      case 'text':
        return { ...baseStyle };
      case 'image':
        return { ...baseStyle, borderRadius: 8 };
      case 'shape':
        return { 
          ...baseStyle, 
          backgroundColor: '#3b82f6',
          borderWidth: 0,
          borderRadius: 4
        };
      default:
        return baseStyle;
    }
  };

  const toolGroups = [
    {
      name: 'Grundelemente',
      tools: [
        {
          id: 'text',
          icon: TextIcon,
          label: 'Text',
          shortcut: 'T',
          description: 'Text hinzufügen'
        },
        {
          id: 'image',
          icon: ImageIcon,
          label: 'Bild',
          shortcut: 'I',
          description: 'Bild einfügen'
        },
        {
          id: 'shape',
          icon: ShapeIcon,
          label: 'Form',
          shortcut: 'S',
          description: 'Geometrische Form hinzufügen'
        }
      ]
    },
    {
      name: 'Daten',
      tools: [
        {
          id: 'chart',
          icon: LayoutIcon,
          label: 'Diagramm',
          shortcut: 'C',
          description: 'Chart hinzufügen'
        },
        {
          id: 'table',
          icon: TableIcon,
          label: 'Tabelle',
          shortcut: 'B',
          description: 'Tabelle erstellen'
        },
        {
          id: 'video',
          icon: VideoIcon,
          label: 'Video',
          shortcut: 'V',
          description: 'Video einfügen'
        }
      ]
    },
    {
      name: 'Formen',
      tools: [
        {
          id: 'rectangle',
          icon: SquareIcon,
          label: 'Rechteck',
          description: 'Rechteck-Form'
        },
        {
          id: 'circle',
          icon: CircleIcon,
          label: 'Kreis',
          description: 'Kreis-Form'
        }
      ]
    }
  ];

  return (
    <div className="h-full bg-slate-950 border-r border-white/5 p-2">
      <div className="space-y-6">
        {toolGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {group.name}
            </h3>
            
            <div className="space-y-2">
              {group.tools.map((tool) => {
                const Icon = tool.icon;
                
                return (
                  <button
                    key={tool.id}
                    onClick={() => createElement(tool.id as 'text' | 'image' | 'shape' | 'chart' | 'table' | 'video')}
                    className="
                      w-12 h-12 rounded-lg border border-white/10 hover:border-white/20 
                      hover:bg-white/5 transition-all duration-200 flex flex-col items-center 
                      justify-center gap-1 group relative
                    "
                    title={`${tool.label}${'shortcut' in tool && tool.shortcut ? ` (${tool.shortcut})` : ''}`}
                  >
                    <Icon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                    
                    {'shortcut' in tool && tool.shortcut && (
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-800 px-1 py-0.5 rounded">
                          {('shortcut' in tool ? tool.shortcut : '')}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Text Formatting Tools (shown when text is selected) */}
      {selectedElement && (
        <div className="mt-8 pt-6 border-t border-white/5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Formatierung
          </h3>
          
          <div className="space-y-2">
            <button
              className="w-12 h-8 rounded border border-white/10 hover:border-white/20 hover:bg-white/5 transition-colors flex items-center justify-center"
              title="Fett"
            >
              <BoldIcon className="w-4 h-4 text-slate-400" />
            </button>
            
            <button
              className="w-12 h-8 rounded border border-white/10 hover:border-white/20 hover:bg-white/5 transition-colors flex items-center justify-center"
              title="Kursiv"
            >
              <ItalicIcon className="w-4 h-4 text-slate-400" />
            </button>
            
            <button
              className="w-12 h-8 rounded border border-white/10 hover:border-white/20 hover:bg-white/5 transition-colors flex items-center justify-center"
              title="Unterstrichen"
            >
              <UnderlineIcon className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <button
              className="w-12 h-8 rounded border border-white/10 hover:border-white/20 hover:bg-white/5 transition-colors flex items-center justify-center"
              title="Linksbündig"
            >
              <AlignLeftIcon className="w-4 h-4 text-slate-400" />
            </button>
            
            <button
              className="w-12 h-8 rounded border border-white/10 hover:border-white/20 hover:bg-white/5 transition-colors flex items-center justify-center"
              title="Zentriert"
            >
              <AlignCenterIcon className="w-4 h-4 text-slate-400" />
            </button>
            
            <button
              className="w-12 h-8 rounded border border-white/10 hover:border-white/20 hover:bg-white/5 transition-colors flex items-center justify-center"
              title="Rechtsbündig"
            >
              <AlignRightIcon className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 pt-6 border-t border-white/5">
        <div className="text-xs text-slate-600 space-y-1">
          <div className="font-medium">Tastatur:</div>
          <div>T = Text</div>
          <div>I = Bild</div>
          <div>S = Form</div>
          <div>C = Diagramm</div>
        </div>
      </div>
    </div>
  );
};

export default ElementToolbar;