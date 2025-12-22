import { PresentationData } from '../types';

export interface ExportOptions {
  format: 'pdf' | 'pptx' | 'html' | 'json';
  quality?: 'low' | 'medium' | 'high';
  compression?: boolean;
  watermark?: boolean;
  includeNotes?: boolean;
  theme?: 'default' | 'business' | 'modern' | 'creative';
}

export interface SharingOptions {
  enablePassword: boolean;
  password?: string;
  expirationDate?: Date;
  allowComments: boolean;
  cloudIntegration?: 'google-drive' | 'one-drive' | 'dropbox' | 'none';
}

export interface ExportResult {
  success: boolean;
  data?: Blob | string;
  filename?: string;
  shareUrl?: string;
  error?: string;
}

class ExportService {
  
  /**
   * Exportiert Präsentationsdaten zu PDF
   */
  static async exportToPDF(data: PresentationData, options: ExportOptions = { format: 'pdf' }): Promise<ExportResult> {
    try {
      // HTML generieren für PDF-Konvertierung
      const htmlContent = this.generateHTML(data, options);
      
      // PDF mit html2canvas und jsPDF generieren (vereinfacht)
      // In einer echten Implementierung würde hier ein PDF-Service verwendet
      const blob = new Blob([htmlContent], { type: 'text/html' });
      
      return {
        success: true,
        data: blob,
        filename: `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
      };
    } catch (error) {
      return {
        success: false,
        error: `PDF-Export fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      };
    }
  }

  /**
   * Exportiert zu PowerPoint
   */
  static async exportToPowerPoint(data: PresentationData, _options: ExportOptions = { format: 'pptx' }): Promise<ExportResult> {
    try {
      // PowerPoint-Export mit PptxGenJS (vereinfacht)
      const pptxData = this.convertToPowerPointFormat(data);
      
      // In einer echten Implementierung würde hier PptxGenJS verwendet
      const blob = new Blob([JSON.stringify(pptxData)], { type: 'application/json' });
      
      return {
        success: true,
        data: blob,
        filename: `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx`
      };
    } catch (error) {
      return {
        success: false,
        error: `PowerPoint-Export fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      };
    }
  }

  /**
   * Exportiert zu HTML
   */
  static async exportToHTML(data: PresentationData, options: ExportOptions = { format: 'html' }): Promise<ExportResult> {
    try {
      const htmlContent = this.generateStandaloneHTML(data, options);
      
      return {
        success: true,
        data: htmlContent,
        filename: `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`
      };
    } catch (error) {
      return {
        success: false,
        error: `HTML-Export fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      };
    }
  }

  /**
   * Exportiert zu JSON
   */
  static async exportToJSON(data: PresentationData): Promise<ExportResult> {
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      
      return {
        success: true,
        data: jsonContent,
        filename: `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`
      };
    } catch (error) {
      return {
        success: false,
        error: `JSON-Export fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      };
    }
  }

  /**
   * Erstellt einen teilbaren Link
   */
  static async createShareableLink(data: PresentationData, options: SharingOptions): Promise<ExportResult> {
    try {
      // In einer echten Implementierung würde hier ein Cloud-Service verwendet
      const shareData = {
        data,
        options,
        timestamp: new Date().toISOString(),
        id: this.generateShareId()
      };
      
      // Mock URL - in echter Implementierung würde hier eine echte URL erstellt
      const shareUrl = `https://share.example.com/${shareData.id}`;
      
      return {
        success: true,
        data: shareUrl,
        filename: `share-${shareData.id}`,
        shareUrl
      };
    } catch (error) {
      return {
        success: false,
        error: `Link-Erstellung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      };
    }
  }

  /**
   * Batch-Export in mehrere Formate
   */
  static async batchExport(data: PresentationData, formats: ExportOptions['format'][]): Promise<ExportResult[]> {
    const results: ExportResult[] = [];
    
    for (const format of formats) {
      const options: ExportOptions = { format };
      let result: ExportResult;
      
      switch (format) {
        case 'pdf':
          result = await this.exportToPDF(data, options);
          break;
        case 'pptx':
          result = await this.exportToPowerPoint(data, options);
          break;
        case 'html':
          result = await this.exportToHTML(data, options);
          break;
        case 'json':
          result = await this.exportToJSON(data);
          break;
        default:
          result = {
            success: false,
            error: `Nicht unterstütztes Format: ${format}`
          };
      }
      
      results.push(result);
    }
    
    return results;
  }

  /**
   * Generiert HTML für PDF-Konvertierung
   */
  private static generateHTML(data: PresentationData, options: ExportOptions): string {
    const theme = this.getThemeCSS(options.theme || 'default');
    
    return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title}</title>
    ${theme}
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            padding: 40px;
            background: white;
            color: #1e293b;
        }
        .slide {
            page-break-after: always;
            min-height: 90vh;
            padding: 60px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .slide:last-child {
            page-break-after: avoid;
        }
        .slide-title {
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 2rem;
            color: #0f172a;
        }
        .slide-subtitle {
            font-size: 1.5rem;
            color: #64748b;
            margin-bottom: 3rem;
        }
        .slide-content {
            font-size: 1.25rem;
            line-height: 1.8;
        }
        .slide-item {
            margin-bottom: 1.5rem;
            padding-left: 1rem;
            border-left: 4px solid #3b82f6;
        }
        .watermark {
            position: fixed;
            bottom: 20px;
            right: 20px;
            opacity: 0.3;
            font-size: 0.8rem;
            color: #64748b;
        }
        @media print {
            .slide { page-break-after: always; }
            body { margin: 0; padding: 20px; }
        }
    </style>
</head>
<body>
    ${data.slides.map((slide) => `
        <div class="slide">
            <h1 class="slide-title">${slide.title}</h1>
            <div class="slide-content">
                ${slide.items.map(item => `
                    <div class="slide-item">
                        <strong>${item.text}</strong>
                        ${item.subItems ? `
                            <ul style="margin-top: 0.5rem; margin-left: 1.5rem;">
                                ${item.subItems.map(subItem => `<li>${subItem}</li>`).join('')}
                            </ul>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('')}
    
    ${options.watermark ? '<div class="watermark">Generiert mit Thought Parser</div>' : ''}
</body>
</html>`;
  }

  /**
   * Generiert standalone HTML
   */
  private static generateStandaloneHTML(data: PresentationData, options: ExportOptions): string {
    return this.generateHTML(data, options);
  }

  /**
   * Konvertiert zu PowerPoint-Format
   */
  private static convertToPowerPointFormat(data: PresentationData): any {
    return {
      title: data.title,
      subtitle: data.subtitle,
      slides: data.slides.map(slide => ({
        title: slide.title,
        layout: 'titleAndContent',
        shapes: slide.items.map(item => ({
          type: 'text',
          text: item.text,
          bulletPoints: item.subItems
        }))
      }))
    };
  }

  /**
   * Holt Theme-CSS
   */
  private static getThemeCSS(theme: string): string {
    const themes = {
      default: `
        <style>
          .slide-title { color: #0f172a; }
          .slide-subtitle { color: #64748b; }
          .slide-item { border-left-color: #3b82f6; }
        </style>
      `,
      business: `
        <style>
          .slide-title { color: #1e40af; }
          .slide-subtitle { color: #374151; }
          .slide-item { border-left-color: #1e40af; }
        </style>
      `,
      modern: `
        <style>
          .slide-title { color: #7c3aed; }
          .slide-subtitle { color: #6b7280; }
          .slide-item { border-left-color: #7c3aed; }
        </style>
      `,
      creative: `
        <style>
          .slide-title { color: #dc2626; }
          .slide-subtitle { color: #4b5563; }
          .slide-item { border-left-color: #dc2626; }
        </style>
      `
    };
    
    return themes[theme as keyof typeof themes] || themes.default;
  }

  /**
   * Generiert Share-ID
   */
  private static generateShareId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Lädt Datei herunter
   */
  static downloadFile(data: Blob | string, filename: string): void {
    const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Öffnet Datei in neuem Tab
   */
  static openInNewTab(data: string, _filename: string): void {
    const blob = new Blob([data], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // URL wird automatisch vom Browser freigegeben, wenn die Seite geschlossen wird
  }
}

export default ExportService;