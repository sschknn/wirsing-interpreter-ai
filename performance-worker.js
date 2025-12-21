// Performance-optimized Web Worker for heavy computations
// This worker handles CPU-intensive tasks to keep the main thread responsive

self.addEventListener('message', function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'PROCESS_AUDIO_DATA':
      // Audio processing in background thread
      processAudioData(data);
      break;
      
    case 'GENERATE_IMAGE_BATCH':
      // Batch image generation processing
      generateImageBatch(data);
      break;
      
    case 'ANALYZE_PERFORMANCE':
      // Performance analysis in background
      analyzePerformance(data);
      break;
      
    case 'PREPROCESS_BRIEFING_DATA':
      // Briefing data preprocessing
      preprocessBriefingData(data);
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
});

function processAudioData(audioBuffer) {
  const startTime = performance.now();
  
  try {
    // Simulate heavy audio processing
    const processedData = audioBuffer.map((sample, index) => {
      // Complex audio processing algorithm
      return sample * Math.sin(index * 0.001) * Math.exp(-index * 0.0001);
    });
    
    const processingTime = performance.now() - startTime;
    
    self.postMessage({
      type: 'AUDIO_DATA_PROCESSED',
      data: {
        processedData,
        processingTime,
        originalSize: audioBuffer.length
      }
    });
  } catch (error) {
    self.postMessage({
      type: 'AUDIO_PROCESSING_ERROR',
      data: { error: error.message }
    });
  }
}

function generateImageBatch(imageRequests) {
  const startTime = performance.now();
  const results = [];
  
  // Process multiple image generation requests
  imageRequests.forEach((request, index) => {
    const { prompt, slideIndex, itemIndex } = request;
    
    // Simulate AI image generation processing
    const result = {
      prompt,
      slideIndex,
      itemIndex,
      // Simulated image data (in real implementation, this would be actual AI response)
      imageUrl: `data:image/png;base64,simulated_image_data_${Date.now()}`,
      generationTime: Math.random() * 500 + 100 // 100-600ms simulated
    };
    
    results.push(result);
  });
  
  const totalTime = performance.now() - startTime;
  
  self.postMessage({
    type: 'IMAGE_BATCH_GENERATED',
    data: {
      results,
      totalTime,
      batchSize: imageRequests.length
    }
  });
}

function analyzePerformance(performanceData) {
  const startTime = performance.now();
  
  const analysis = {
    totalOperations: performanceData.length,
    averageTime: 0,
    slowestOperation: null,
    fastestOperation: null,
    recommendations: []
  };
  
  if (performanceData.length > 0) {
    const times = performanceData.map(op => op.duration);
    analysis.averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    analysis.slowestOperation = performanceData.reduce((prev, current) => 
      (prev.duration > current.duration) ? prev : current
    );
    analysis.fastestOperation = performanceData.reduce((prev, current) => 
      (prev.duration < current.duration) ? prev : current
    );
    
    // Generate recommendations based on analysis
    if (analysis.averageTime > 100) {
      analysis.recommendations.push('Consider optimizing operations taking longer than 100ms');
    }
    
    if (analysis.slowestOperation.duration > 500) {
      analysis.recommendations.push('Priority: Optimize the slowest operation');
    }
  }
  
  const analysisTime = performance.now() - startTime;
  
  self.postMessage({
    type: 'PERFORMANCE_ANALYSIS_COMPLETE',
    data: {
      analysis,
      analysisTime
    }
  });
}

function preprocessBriefingData(briefingData) {
  const startTime = performance.now();
  
  try {
    // Heavy preprocessing of briefing data
    const processed = {
      ...briefingData,
      slides: briefingData.slides.map(slide => ({
        ...slide,
        items: slide.items.map(item => ({
          ...item,
          // Pre-process text for better rendering
          processedText: item.text.toLowerCase().trim(),
          wordCount: item.text.split(' ').length,
          complexity: calculateComplexity(item.text)
        }))
      })),
      metadata: {
        totalSlides: briefingData.slides.length,
        totalItems: briefingData.slides.reduce((sum, slide) => sum + slide.items.length, 0),
        averageWordsPerItem: calculateAverageWords(briefingData.slides)
      }
    };
    
    const processingTime = performance.now() - startTime;
    
    self.postMessage({
      type: 'BRIEFING_DATA_PREPROCESSED',
      data: {
        processedData: processed,
        processingTime
      }
    });
  } catch (error) {
    self.postMessage({
      type: 'BRIEFING_PREPROCESSING_ERROR',
      data: { error: error.message }
    });
  }
}

function calculateComplexity(text) {
  // Simple complexity calculation based on various factors
  const words = text.split(' ').length;
  const sentences = text.split(/[.!?]+/).length;
  const avgWordsPerSentence = words / sentences;
  
  if (avgWordsPerSentence > 20) return 'high';
  if (avgWordsPerSentence > 10) return 'medium';
  return 'low';
}

function calculateAverageWords(slides) {
  const totalItems = slides.reduce((sum, slide) => sum + slide.items.length, 0);
  const totalWords = slides.reduce((sum, slide) => {
    return sum + slide.items.reduce((itemSum, item) => {
      return itemSum + item.text.split(' ').length;
    }, 0);
  }, 0);
  
  return totalItems > 0 ? totalWords / totalItems : 0;
}

// Error handling
self.addEventListener('error', function(e) {
  console.error('Worker error:', e.error);
  self.postMessage({
    type: 'WORKER_ERROR',
    data: { error: e.error.message, filename: e.filename, lineno: e.lineno }
  });
});

self.addEventListener('unhandledrejection', function(e) {
  console.error('Worker unhandled promise rejection:', e.reason);
  self.postMessage({
    type: 'WORKER_PROMISE_REJECTION',
    data: { reason: e.reason }
  });
});