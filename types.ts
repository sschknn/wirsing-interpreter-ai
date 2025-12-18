
export type BoardCategory = 'Ideen' | 'Aufgaben' | 'Probleme' | 'Lösungen' | 'Entscheidungen' | 'Offene Fragen' | 'Notizen' | 'To-Dos';

export interface BoardItem {
  id: string;
  category: BoardCategory;
  content: string;
  timestamp: number;
}

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
  board: BoardItem[];
  suggestions: SmartSuggestion[];
  isThinking: boolean;
}

export enum Priority {
  HIGH = 'hoch',
  MEDIUM = 'mittel',
  LOW = 'niedrig'
}

// Added missing Task interface
export interface Task {
  id: string;
  title: string;
  category: string;
  priority: Priority;
  deadline?: string;
  completed: boolean;
}

// Added missing ParsedData interface
export interface ParsedData {
  tasks: Task[];
  projects: {
    name: string;
    subtasks: string[];
  }[];
  lists: {
    title: string;
    type: 'Einkauf' | 'Ideen' | 'Notizen';
    items: string[];
  }[];
  summary: string;
}

export interface SlideType {
  type: 'strategy' | 'tasks' | 'ideas' | 'problems' | 'summary' | 'suggestions' | 'custom';
}

export interface SlideItem {
  text: string;
  subItems?: string[];
  category?: string;
  priority?: Priority;
}

export interface Insight {
  title: string;
  description: string;
  sourceUrl?: string;
}

export interface Slide {
  title: string;
  items: SlideItem[];
  type: SlideType['type'];
  insights?: Insight[];
}

export interface PresentationData {
  title: string;
  subtitle: string;
  slides: Slide[];
}
