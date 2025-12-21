
export type BoardCategory = 'Ideen' | 'Aufgaben' | 'Probleme' | 'Lösungen' | 'Strategie' | 'Recherche';

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface SmartSuggestion {
  id: string;
  type: 'clarification' | 'insight' | 'action';
  text: string;
  reason: string;
  timestamp: number;
}

export interface SecretaryState {
  isActive: boolean;
  transcript: TranscriptEntry[];
  suggestions: SmartSuggestion[];
}

export enum Priority {
  HIGH = 'hoch',
  MEDIUM = 'mittel',
  LOW = 'niedrig'
}

export interface Task {
  id: string;
  title: string;
  category: string;
  priority: Priority;
  deadline?: string;
  completed: boolean;
}

export interface SlideItem {
  text: string;
  subItems?: string[];
  category?: string;
  priority?: Priority;
  imageUrl?: string;
  imageLoading?: boolean;
}

export interface Insight {
  title: string;
  description: string;
  sourceUrl?: string;
}

export interface Slide {
  title: string;
  items: SlideItem[];
  type: 'strategy' | 'tasks' | 'ideas' | 'problems' | 'summary' | 'suggestions' | 'custom' | 'gallery' | 'title' | 'content' | 'list';
  insights?: Insight[];
}

export interface PresentationData {
  title: string;
  subtitle: string;
  slides: Slide[];
}

export interface ParsedData {
  tasks: Task[];
  summary: string;
  projects: { name: string; subtasks: string[] }[];
  lists: { title: string; type: string; items: string[] }[];
}

// ============================================================================
// ERWEITERTE PRÄSENTATIONS-KI TYPES
// ============================================================================

export interface BriefingData {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PresentationInput {
  title: string;
  subtitle?: string;
  content: string;
  targetAudience?: string;
  presentationStyle?: 'professional' | 'creative' | 'technical' | 'executive';
  language?: 'de' | 'en';
  includeImages?: boolean;
  maxSlides?: number;
}

export interface SlideContent {
  title: string;
  content: string[];
  bulletPoints?: string[];
  notes?: string;
  imageSuggestions?: string[];
  layout: 'title' | 'content' | 'comparison' | 'list' | 'gallery' | 'summary';
}

export interface OptimizedLayout {
  slideOrder: number[];
  suggestedTransitions: string[];
  visualHierarchy: Record<string, 'primary' | 'secondary' | 'tertiary'>;
  colorScheme?: string;
  fontSuggestions?: string[];
}

export type SlideType = 'strategy' | 'tasks' | 'ideas' | 'problems' | 'summary' | 'suggestions' | 'custom' | 'gallery' | 'title' | 'content' | 'list';

// App Mode Management
export type AppModeType = 'voice' | 'editor' | 'presentation' | 'export' | 'templates';

export interface AppMode {
  current: AppModeType;
  canUndo: boolean;
  canRedo: boolean;
  hasUnsavedChanges: boolean;
  history: PresentationData[];
  historyIndex: number;
}

// Menu Actions
export interface MenuAction {
  id: string;
  label: string;
  shortcut?: string;
  icon?: string;
  disabled?: boolean;
  onClick: () => void;
}

// Toolbar State
export interface ToolbarState {
  selectedSlide: number;
  totalSlides: number;
  zoom: number;
  showGrid: boolean;
}

// File Operations
export interface FileOperation {
  type: 'new' | 'open' | 'save' | 'export';
  format?: 'json' | 'pdf' | 'html' | 'pptx';
  filename?: string;
  data?: PresentationData;
}
