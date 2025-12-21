
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
  type: 'strategy' | 'tasks' | 'ideas' | 'problems' | 'summary' | 'suggestions' | 'custom' | 'gallery';
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
