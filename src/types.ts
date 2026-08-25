export type DeviceViewport = 'desktop' | 'tablet' | 'mobile';

export interface AppVersion {
  id: string;
  versionNumber: number;
  timestamp: string;
  prompt: string;
  code: string;
  title: string;
  isEdit?: boolean;
}

export interface TemplateApp {
  id: string;
  title: string;
  category: 'Productivity' | 'Games' | 'Calculators' | 'Creative' | 'Utilities';
  description: string;
  prompt: string;
  code: string;
  iconName: string;
  tags: string[];
  complexity: 'Simple' | 'Medium' | 'Advanced';
}

export interface ConsoleLogItem {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: string;
}

export interface GenerationOptions {
  theme: 'modern' | 'dark' | 'neon' | 'minimal' | 'glass';
  complexity: 'simple' | 'medium' | 'advanced';
  features: string[];
}

export type GenerationStatus = 'idle' | 'generating' | 'refining' | 'ready' | 'error';

export interface ExplanationData {
  summary: string;
  features: string[];
  architecture?: string;
  techStack: string[];
}
