export interface Story {
  id: string;
  title: string;
  location: string;
  time: string;
  tag: string;
  img: string;
}

export interface Resource {
  id: number;
  name: string;
  type: string;
  dist: string;
  phone: string;
  mapPos: { top: string; left: string };
}

export interface Symptom {
  id: string;
  label: string;
  icon: string;
}

export interface FirstAidTopic {
  id: string;
  title: string;
  icon: string;
  steps: string[];
}

export interface UserProfile {
  name: string;
  role: string;
  location: string;
  trustScore: number;
  totalPaws: number;
  level: string;
  levelNum: number;
  nextLevel: string;
  progress: number;
  streak: number;
  livesImpacted: number;
}

export interface Report {
  id: string;
  reporter: string;
  verified: boolean;
  location: string;
  distance: string;
  time: string;
  type: string;
  status: 'CRITICAL' | 'HELP' | 'SAFE' | 'ADOPT';
  progressStep: number;
  volunteers: number;
  desc: string;
  image: string | null;
  coords: string;
  phone: string | null;
  votes: number;
  isNew?: boolean;
  mapPos?: { top: string; left: string };
}

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export interface VetAIResult {
  condition: string;
  severity: string;
  confidence: number;
  riskLevel: string;
  survivalWindow: string;
  immediateActions: string[];
  volunteer: {
    steps: string[];
    donts: string[];
  };
  vet: {
    classification: string;
    diagnostics: string;
    protocol: string;
    dosage: string;
    triageCode: string;
  };
}

export enum View {
  FEED = 'FEED',
  MAPS = 'MAPS',
  AI_CHAT = 'AI_CHAT',
  PROFILE = 'PROFILE',
  CAMERA = 'CAMERA',
  REPORT_LOCATION = 'REPORT_LOCATION',
  REPORT_DETAILS = 'REPORT_DETAILS',
  REPORT_REPORTER = 'REPORT_REPORTER',
  REPORT_REVIEW = 'REPORT_REVIEW',
  RESCUE_STATUS = 'RESCUE_STATUS',
  NAVIGATION = 'NAVIGATION'
}
