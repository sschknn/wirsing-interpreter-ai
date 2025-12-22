import * as React from 'react';
import { Suspense, lazy } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { PresentationData, AppModeType } from '../types';
import { Template } from '../services/templateService';

// ============================================================================
// LAZY-LOADED COMPONENTS MIT PRELOADING
// ============================================================================

// Hauptkomponenten für Lazy Loading
export const LazyPresentationEditor = lazy(() => 
  import('./PresentationEditor').then(module => ({
    default: module.default
  }))
);

export const LazyPresentationViewer = lazy(() => 
  import('./PresentationViewer').then(module => ({
    default: module.default
  }))
);

export const LazyAdvancedTemplates = lazy(() => 
  import('./AdvancedTemplates').then(module => ({
    default: module.default
  }))
);

export const LazyElementEditor = lazy(() => 
  import('./ElementEditor').then(module => ({
    default: module.default
  }))
);

export const LazyLiveBriefingPanel = lazy(() => 
  import('./LiveBriefingPanel').then(module => ({
    default: module.default
  }))
);

export const LazyExportMode = lazy(() => 
  import('./ExportMode').then(module => ({
    default: module.default
  }))
);

// ============================================================================
// LOADING COMPONENTS
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text = 'Wird geladen...' 
}) => {
  const sizeClasses: Record<string, string> = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`${sizeClasses[size]} border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4`} />
      <p className="text-slate-400 text-sm font-medium">{text}</p>
    </div>
  );
};

// Spezifische Loading Screens für verschiedene Komponenten
export const EditorLoading = () => (
  <div className="h-full flex items-center justify-center bg-slate-900">
    <LoadingSpinner size="lg" text="Editor wird geladen..." />
  </div>
);

export const ViewerLoading = () => (
  <div className="h-full flex items-center justify-center bg-[#020617]">
    <LoadingSpinner size="lg" text="Präsentation wird vorbereitet..." />
  </div>
);

export const TemplatesLoading = () => (
  <div className="h-full flex items-center justify-center bg-slate-950">
    <LoadingSpinner size="lg" text="Vorlagen werden geladen..." />
  </div>
);

export const BriefingLoading = () => (
  <div className="h-full flex items-center justify-center bg-[#020617]">
    <LoadingSpinner size="md" text="Briefing-Panel wird geladen..." />
  </div>
);

export const ExportLoading = () => (
  <div className="h-full flex items-center justify-center bg-slate-900">
    <LoadingSpinner size="lg" text="Export-Modus wird vorbereitet..." />
  </div>
);

// ============================================================================
// LAZY WRAPPER COMPONENT
// ============================================================================

interface LazyComponentProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export const LazyComponent: React.FC<LazyComponentProps> = ({
  children,
  fallback,
  componentName = 'Komponente',
  onError
}: LazyComponentProps) => {
  const errorFallback = (
    <div className="h-full flex items-center justify-center bg-red-950/20 border border-red-500/20 rounded-lg m-4">
      <div className="text-center p-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-red-400 mb-2">Ladefehler</h3>
        <p className="text-red-300 mb-4">
          {componentName} konnte nicht geladen werden.
        </p>
        {onError && (
          <button
            onClick={() => onError(new Error('Manual retry'), { componentStack: 'Manual retry click' })}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
          >
            Erneut versuchen
          </button>
        )}
      </div>
    </div>
  );

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    if (onError) {
      onError(error, errorInfo);
    }
  };

  return (
    <ErrorBoundary
      fallback={errorFallback}
      onError={handleError}
    >
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

// ============================================================================
// PRELOADING FUNCTIONS
// ============================================================================

export const preloadPresentationEditor = () => {
  import('./PresentationEditor');
};

export const preloadPresentationViewer = () => {
  import('./PresentationViewer');
};

export const preloadAdvancedTemplates = () => {
  import('./AdvancedTemplates');
};

export const preloadElementEditor = () => {
  import('./ElementEditor');
};

export const preloadLiveBriefingPanel = () => {
  import('./LiveBriefingPanel');
};

export const preloadExportMode = () => {
  import('./ExportMode');
};

// Preload all components
export const preloadAllComponents = () => {
  preloadPresentationEditor();
  preloadPresentationViewer();
  preloadAdvancedTemplates();
  preloadElementEditor();
  preloadLiveBriefingPanel();
  preloadExportMode();
};

// ============================================================================
// TYPED LAZY COMPONENTS
// ============================================================================

export const LazyPresentationEditorComponent = lazy(() => 
  import('./PresentationEditor').then(module => ({
    default: module.default
  }))
);

export const LazyPresentationViewerComponent = lazy(() => 
  import('./PresentationViewer').then(module => ({
    default: module.default
  }))
);

export const LazyAdvancedTemplatesComponent = lazy(() => 
  import('./AdvancedTemplates').then(module => ({
    default: module.default
  }))
);

export const LazyLiveBriefingPanelComponent = lazy(() => 
  import('./LiveBriefingPanel').then(module => ({
    default: module.default
  }))
);

export const LazyExportModeComponent = lazy(() => 
  import('./ExportMode').then(module => ({
    default: module.default
  }))
);

// ============================================================================
// TYPED PROPS INTERFACES
// ============================================================================

interface PresentationEditorLazyProps {
  data: PresentationData;
  onDataChange: (data: PresentationData) => void;
  onModeChange: (mode: AppModeType) => void;
  disabled?: boolean;
}

interface PresentationViewerLazyProps {
  data: PresentationData;
  onClose: () => void;
}

interface AdvancedTemplatesLazyProps {
  onTemplateSelect: (template: Template) => void;
  onCreateCustom: (data: PresentationData) => void;
  onClose: () => void;
}

interface LiveBriefingPanelLazyProps {
  data: PresentationData | null;
  isLoading: boolean;
  completedPoints: Set<string>;
  onTogglePoint: (id: string) => void;
}

interface ExportModeLazyProps {
  data: PresentationData;
  onClose: () => void;
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

export const LazyPresentationEditorWrapper: React.FC<PresentationEditorLazyProps> = (props: PresentationEditorLazyProps) => {
  // DEBUG: Props validieren
  console.log('🔍 [LazyPresentationEditorWrapper] Empfangene Props:', {
    hasData: !!props.data,
    hasOnDataChange: typeof props.onDataChange === 'function',
    hasOnModeChange: typeof props.onModeChange === 'function',
    disabled: props.disabled
  });
  
  return (
    <LazyComponent
      fallback={<EditorLoading />}
      componentName="Presentation Editor"
    >
      <LazyPresentationEditorComponent {...props} />
    </LazyComponent>
  );
};

export const LazyPresentationViewerWrapper: React.FC<PresentationViewerLazyProps> = (props: PresentationViewerLazyProps) => (
  <LazyComponent
    fallback={<ViewerLoading />}
    componentName="Presentation Viewer"
  >
    <LazyPresentationViewerComponent {...props} />
  </LazyComponent>
);

export const LazyAdvancedTemplatesWrapper: React.FC<AdvancedTemplatesLazyProps> = (props: AdvancedTemplatesLazyProps) => (
  <LazyComponent
    fallback={<TemplatesLoading />}
    componentName="Advanced Templates"
  >
    <LazyAdvancedTemplatesComponent {...props} />
  </LazyComponent>
);

export const LazyLiveBriefingPanelWrapper: React.FC<LiveBriefingPanelLazyProps> = (props) => (
  <LazyComponent
    fallback={<BriefingLoading />}
    componentName="Live Briefing Panel"
  >
    <LazyLiveBriefingPanelComponent {...props} />
  </LazyComponent>
);

export const LazyExportModeWrapper: React.FC<ExportModeLazyProps> = (props) => (
  <LazyComponent
    fallback={<ExportLoading />}
    componentName="Export Mode"
  >
    <LazyExportModeComponent {...props} />
  </LazyComponent>
);

export default LazyComponent;