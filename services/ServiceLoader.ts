// ============================================================================
// DYNAMIC SERVICE LOADER FÜR BUNDLE-OPTIMIERUNG
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export interface ServiceModule {
  default?: any;
  [key: string]: any;
}

export interface LazyServiceCache {
  aiService?: ServiceModule;
  templateService?: ServiceModule;
  exportService?: ServiceModule;
}

// ============================================================================
// SERVICE CACHE
// ============================================================================

const serviceCache: LazyServiceCache = {};

// ============================================================================
// LAZY LOADING FUNCTIONS
// ============================================================================

export const loadAIService = async (): Promise<ServiceModule> => {
  if (serviceCache.aiService) {
    return serviceCache.aiService;
  }
  
  try {
    const module = await import('./aiService');
    serviceCache.aiService = module;
    console.log('✅ AIService lazy-loaded successfully');
    return module;
  } catch (error) {
    console.error('❌ Failed to load AIService:', error);
    throw new Error('AIService could not be loaded');
  }
};

export const loadTemplateService = async (): Promise<ServiceModule> => {
  if (serviceCache.templateService) {
    return serviceCache.templateService;
  }
  
  try {
    const module = await import('./templateService');
    serviceCache.templateService = module;
    console.log('✅ TemplateService lazy-loaded successfully');
    return module;
  } catch (error) {
    console.error('❌ Failed to load TemplateService:', error);
    throw new Error('TemplateService could not be loaded');
  }
};

export const loadExportService = async (): Promise<ServiceModule> => {
  if (serviceCache.exportService) {
    return serviceCache.exportService;
  }
  
  try {
    const module = await import('./exportService');
    serviceCache.exportService = module;
    console.log('✅ ExportService lazy-loaded successfully');
    return module;
  } catch (error) {
    console.error('❌ Failed to load ExportService:', error);
    throw new Error('ExportService could not be loaded');
  }
};

// GeminiService removed - functionality moved to AIService

// ============================================================================
// CONVENIENCE FUNCTIONS FOR COMMON SERVICES
// ============================================================================

export const getAIService = async () => {
  const module = await loadAIService();
  return module.AIService;
};

export const getAIServiceExports = async () => {
  const module = await loadAIService();
  return module;
};

export const getTemplateService = async () => {
  const module = await loadTemplateService();
  return module.default;
};

export const getTemplateServiceExports = async () => {
  const module = await loadTemplateService();
  return module;
};

export const getExportService = async () => {
  const module = await loadExportService();
  return module.default;
};

export const getExportServiceExports = async () => {
  const module = await loadExportService();
  return module;
};

export const getGeminiService = async () => {
  // Use AIService.parseThoughts instead of deprecated geminiService
  const module = await loadAIService();
  return module.AIService?.parseThoughts;
};

export const getGeminiServiceExports = async () => {
  // Use AIService exports instead of deprecated geminiService
  const module = await loadAIService();
  return { parseThoughts: module.AIService?.parseThoughts };
};

// ============================================================================
// PRELOADING FUNCTIONS
// ============================================================================

export const preloadAllServices = async () => {
  const preloadPromises = [
    loadAIService(),
    loadTemplateService(),
    loadExportService()
    // geminiService removed - use AIService instead
  ];
  
  try {
    await Promise.all(preloadPromises);
    console.log('🚀 All services preloaded successfully');
  } catch (error) {
    console.warn('⚠️ Some services failed to preload:', error);
  }
};

export const preloadAIService = () => {
  loadAIService().catch(console.warn);
};

export const preloadTemplateService = () => {
  loadTemplateService().catch(console.warn);
};

export const preloadExportService = () => {
  loadExportService().catch(console.warn);
};

// preloadGeminiService removed - use AIService instead

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const clearServiceCache = () => {
  Object.keys(serviceCache).forEach(key => {
    delete serviceCache[key as keyof LazyServiceCache];
  });
  console.log('🧹 Service cache cleared');
};

export const getServiceCacheStatus = () => {
  return {
    aiService: !!serviceCache.aiService,
    templateService: !!serviceCache.templateService,
    exportService: !!serviceCache.exportService,
    // geminiService removed - use AIService instead
    totalLoaded: Object.values(serviceCache).filter(Boolean).length
  };
};

// ============================================================================
// HOOK FOR REACT COMPONENTS
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export const useServiceLoader = <T>(
  serviceLoader: () => Promise<T>,
  dependencies: any[] = []
) => {
  const [service, setService] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadService = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedService = await serviceLoader();
      setService(loadedService);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Service loading failed'));
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    loadService();
  }, [loadService]);

  return { service, loading, error, reload: loadService };
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  loadAIService,
  loadTemplateService,
  loadExportService,
  // loadGeminiService removed - use loadAIService instead
  getAIService,
  getTemplateService,
  getExportService,
  getGeminiService, // Now redirects to AIService
  preloadAllServices,
  clearServiceCache,
  getServiceCacheStatus,
  useServiceLoader
};