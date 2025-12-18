
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

export interface SecretaryState {
  isActive: boolean;
  transcript: TranscriptEntry[];
  board: BoardItem[];
  isThinking: boolean;
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

export interface Project {
  name: string;
  subtasks: string[];
}

export interface ThoughtList {
  title: string;
  type: 'Einkauf' | 'Ideen' | 'Notizen';
  items: string[];
}

export interface ParsedData {
  tasks: Task[];
  projects: Project[];
  lists: ThoughtList[];
  summary: string;
}

export interface Slide {
  title: string;
  points: string[];
  type: 'strategy' | 'tasks' | 'ideas' | 'problems' | 'summary';
}

export interface PresentationData {
  title: string;
  subtitle: string;
  slides: Slide[];
}
