import * as React from 'react';
import { useState, useRef } from 'react';
import { SlideElement } from './PresentationEditor';
import '../styles/element-editor.css';

// ============================================================================
// ELEMENT EDITOR COMPONENT
// ============================================================================

interface ElementEditorProps {
  element: SlideElement | null;
  onElementChange: (element: SlideElement) => void;
  onElementDelete: (elementId: string) => void;
}

const ElementEditor: React.FC<ElementEditorProps> = ({
  element,
  onElementChange,
  onElementDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (element && element.type === 'text' && isEditing) {
      setEditText(element.content?.text || '');
    }
  }, [element, isEditing]);

  if (!element) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <div className="text-center">
          <p className="text-sm">Kein Element ausgewählt</p>
          <p className="text-xs mt-1">Wählen Sie ein Element zum Bearbeiten aus</p>
        </div>
      </div>
    );
  }

  const handleTextEdit = () => {
    if (isEditing && element) {
      const updatedElement = {
        ...element,
        content: {
          ...element.content,
          text: editText
        }
      };
      onElementChange(updatedElement);
    }
    setIsEditing(!isEditing);
  };

  const handleStyleChange = (property: string, value: any) => {
    const updatedElement = {
      ...element,
      style: {
        ...element.style,
        [property]: value
      }
    };
    onElementChange(updatedElement);
  };

  const handlePositionChange = (property: 'x' | 'y', value: number) => {
    const updatedElement = {
      ...element,
      position: {
        ...element.position,
        [property]: value
      }
    };
    onElementChange(updatedElement);
  };

  const handleSizeChange = (property: 'width' | 'height', value: number) => {
    const updatedElement = {
      ...element,
      size: {
        ...element.size,
        [property]: value
      }
    };
    onElementChange(updatedElement);
  };

  const getElementPreview = () => {
    switch (element.type) {
      case 'text':
        return (
          <div
            className="relative"
            style={{
              position: 'absolute',
              left: element.position.x,
              top: element.position.y,
              width: element.size.width,
              height: element.size.height,
              fontSize: element.style?.fontSize || 16,
              fontFamily: element.style?.fontFamily || 'Inter, sans-serif',
              color: element.style?.color || '#000000',
              backgroundColor: element.style?.backgroundColor || 'transparent',
              border: element.style?.borderWidth ? `${element.style.borderWidth}px solid ${element.style.borderColor}` : 'none',
              borderRadius: element.style?.borderRadius || 0,
              opacity: element.style?.opacity || 1,
              transform: element.style?.rotation ? `rotate(${element.style.rotation}deg)` : 'none',
              display: 'flex',
              alignItems: 'center',
              padding: '8px',
              outline: '2px solid #3b82f6',
              outlineOffset: '2px'
            }}
            onClick={() => setIsEditing(true)}
          >
            {isEditing ? (
              <textarea
                ref={textAreaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={handleTextEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTextEdit();
                  }
                }}
                className="element-editor-textarea"
                title="Text-Editor für Element-Inhalt"
                placeholder="Geben Sie hier Ihren Text ein..."
                autoFocus
                aria-label="Text-Editor für Element-Inhalt"
              />
            ) : (
              <div className="cursor-text w-full">
                {element.content?.text || 'Text eingeben...'}
              </div>
            )}
          </div>
        );

      case 'image':
        return (
          <div
            className="relative cursor-pointer"
            style={{
              position: 'absolute',
              left: element.position.x,
              top: element.position.y,
              width: element.size.width,
              height: element.size.height,
              borderRadius: element.style?.borderRadius || 0,
              opacity: element.style?.opacity || 1,
              transform: element.style?.rotation ? `rotate(${element.style.rotation}deg)` : 'none'
            }}
          >
            <img
              src={element.content?.src || 'https://via.placeholder.com/200x150?text=Bild'}
              alt={element.content?.alt || `Bearbeitbares Element: ${element.type} mit ID ${element.id}`}
              className="w-full h-full object-cover rounded"
              style={{ borderRadius: element.style?.borderRadius || 0 }}
            />
            <div className="absolute inset-0 border-2 border-dashed border-indigo-500 rounded opacity-50" />
          </div>
        );

      case 'shape':
        const shapeStyle = {
          position: 'absolute' as const,
          left: element.position.x,
          top: element.position.y,
          width: element.size.width,
          height: element.size.height,
          backgroundColor: element.style?.backgroundColor || '#3b82f6',
          border: element.style?.borderWidth ? `${element.style.borderWidth}px solid ${element.style.borderColor}` : 'none',
          borderRadius: element.style?.borderRadius || 0,
          opacity: element.style?.opacity || 1,
          transform: element.style?.rotation ? `rotate(${element.style.rotation}deg)` : 'none'
        };

        const shape = element.content?.shape || 'rectangle';
        
        return (
          <div className="relative">
            <div
              className="border-2 border-dashed border-indigo-500 rounded"
              style={shapeStyle}
            >
              {shape === 'circle' ? (
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    backgroundColor: element.style?.backgroundColor || '#3b82f6'
                  }}
                />
              ) : (
                <div className="w-full h-full" />
              )}
            </div>
          </div>
        );

      default:
        return (
          <div
            className="relative border-2 border-dashed border-indigo-500 rounded"
            style={{
              position: 'absolute',
              left: element.position.x,
              top: element.position.y,
              width: element.size.width,
              height: element.size.height,
              backgroundColor: element.style?.backgroundColor || 'transparent',
              borderRadius: element.style?.borderRadius || 0,
              opacity: element.style?.opacity || 1
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
              {element.type}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Element bearbeiten
          </h2>
          <button
            onClick={() => onElementDelete(element.id)}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Löschen
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Typ: {element.type} | ID: {element.id}
        </p>
      </div>

      {/* Element Preview */}
      <div className="flex-1 relative bg-gray-50 overflow-hidden">
        <div className="absolute inset-0">
          {getElementPreview()}
        </div>
        
        {/* Grid Background */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e5e7eb 1px, transparent 1px),
              linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-gray-200 bg-white max-h-64 overflow-y-auto">
        <div className="space-y-4">
          {/* Position Controls */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Position</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  X
                </label>
                <input
                  type="number"
                  value={element.position.x}
                  onChange={(e) => handlePositionChange('x', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  title="X-Position des Elements"
                  placeholder="X-Position"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Y
                </label>
                <input
                  type="number"
                  value={element.position.y}
                  onChange={(e) => handlePositionChange('y', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  title="Y-Position des Elements"
                  placeholder="Y-Position"
                />
              </div>
            </div>
          </div>

          {/* Size Controls */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Größe</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Breite
                </label>
                <input
                  type="number"
                  value={element.size.width}
                  onChange={(e) => handleSizeChange('width', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  title="Breite des Elements in Pixeln"
                  placeholder="Breite"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Höhe
                </label>
                <input
                  type="number"
                  value={element.size.height}
                  onChange={(e) => handleSizeChange('height', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  title="Höhe des Elements in Pixeln"
                  placeholder="Höhe"
                />
              </div>
            </div>
          </div>

          {/* Style Controls */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Stil</h3>
            <div className="space-y-3">
              {/* Rotation */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Rotation: {element.style?.rotation || 0}°
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={element.style?.rotation || 0}
                  onChange={(e) => handleStyleChange('rotation', Number(e.target.value))}
                  className="w-full"
                  title="Rotation des Elements in Grad"
                />
              </div>

              {/* Opacity */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Deckkraft: {Math.round((element.style?.opacity || 1) * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(element.style?.opacity || 1) * 100}
                  onChange={(e) => handleStyleChange('opacity', Number(e.target.value) / 100)}
                  className="w-full"
                  title="Deckkraft des Elements"
                />
              </div>

              {/* Background Color (for shapes and containers) */}
              {(element.type === 'shape' || element.type === 'text') && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Hintergrundfarbe
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={element.style?.backgroundColor || '#ffffff'}
                      onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                      className="w-8 h-8 rounded border border-gray-300"
                      title="Hintergrundfarbe auswählen"
                    />
                    <input
                      type="text"
                      value={element.style?.backgroundColor || '#ffffff'}
                      onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      title="Hintergrundfarbe als Hex-Code eingeben"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              )}

              {/* Text Color (for text elements) */}
              {element.type === 'text' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Textfarbe
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={element.style?.color || '#000000'}
                      onChange={(e) => handleStyleChange('color', e.target.value)}
                      className="w-8 h-8 rounded border border-gray-300"
                      title="Textfarbe auswählen"
                    />
                    <input
                      type="text"
                      value={element.style?.color || '#000000'}
                      onChange={(e) => handleStyleChange('color', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      title="Textfarbe als Hex-Code eingeben"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              )}

              {/* Font Size (for text elements) */}
              {element.type === 'text' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Schriftgröße
                  </label>
                  <input
                    type="number"
                    min="8"
                    max="72"
                    value={element.style?.fontSize || 16}
                    onChange={(e) => handleStyleChange('fontSize', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    title="Schriftgröße in Pixeln"
                    placeholder="16"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Content Controls */}
          {element.type === 'image' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Bildinhalt</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Bild-URL
                  </label>
                  <input
                    type="url"
                    value={element.content?.src || ''}
                    onChange={(e) => onElementChange({
                      ...element,
                      content: { ...element.content, src: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="https://example.com/image.jpg"
                    title="URL des Bildes eingeben"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Alt-Text
                  </label>
                  <input
                    type="text"
                    value={element.content?.alt || ''}
                    onChange={(e) => onElementChange({
                      ...element,
                      content: { ...element.content, alt: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Beschreibung des Bildes"
                    title="Alt-Text für das Bild (Barrierefreiheit)"
                  />
                </div>
              </div>
            </div>
          )}

          {element.type === 'shape' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Form-Eigenschaften</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Form-Typ
                  </label>
                  <select
                    value={element.content?.shape || 'rectangle'}
                    onChange={(e) => onElementChange({
                      ...element,
                      content: { ...element.content, shape: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    title="Form-Typ auswählen"
                  >
                    <option value="rectangle">Rechteck</option>
                    <option value="circle">Kreis</option>
                    <option value="triangle">Dreieck</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElementEditor;