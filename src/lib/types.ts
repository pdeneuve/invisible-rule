export type BopPhase =
  | 'ORIENTATION'
  | 'TOLERATIONS'
  | 'TRANSLATION'
  | 'TRIUMPH'
  | 'FIRST_HOUSE'
  | 'PATTERN_CODING'
  | 'BOP_HYPOTHESIS'
  | 'OBSERVATION'
  | 'COUNTER_STRATEGY'
  | 'LEAD_CAPTURE'
  | 'REPORT';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  phase?: BopPhase;
}

export interface SessionState {
  phase: BopPhase;
  phaseProgress: number;
  overallProgress: number;
  messages: Message[];
  tolerations: string[];
  repeatingThemes: string[];
  firstHouseMemories: string[];
  patternData: PatternData;
  workingHypothesis: string;
  confirmedHypothesis: string;
  detectedArchetype: BopArchetype | null;
  confidenceScore: number;
  observationLogs: ObservationLog[];
  leadCaptured: boolean;
  leadData: LeadData | null;
  safetyTriggered: boolean;
  sessionId: string;
}

export interface PatternData {
  threatThemes: string[];
  emotionalSignals: string[];
  adaptationMoves: string[];
  protectedNeeds: string[];
  coreBeliefs: string[];
  memoryWeights: MemoryWeight[];
}

export interface MemoryWeight {
  memory: string;
  ageWeight: number;
  intensityWeight: number;
  repetitionWeight: number;
  crossDomainWeight: number;
  total: number;
}

export interface ObservationLog {
  day: number;
  trigger: string;
  bodyResponse: string;
  automaticMove: string;
  outcome: string;
  confidenceScore: number;
}

export interface LeadData {
  firstName: string;
  email: string;
  sessionId: string;
  sessionTranscript: string;
  workingHypothesis: string;
  confirmedHypothesis: string;
  detectedArchetype: string;
  tolerations: string[];
  patternData: PatternData;
  completedAt: string;
}

export type BopArchetype =
  | 'INVISIBLE_CHILD'
  | 'PEACEKEEPER_FAWNER'
  | 'OVERACHIEVER'
  | 'CONTROLLER'
  | 'HYPER_INDEPENDENT'
  | 'STRONG_ONE'
  | 'SICK_CHILD'
  | 'DEFENDER_REBEL'
  | 'HYPERVIGILANT_CHILD'
  | 'DOOM_PREPARER'
  | 'VOLATILE_DEFENDER';

export interface ReportData {
  versionA: VersionAReport;
  versionB?: VersionBReport;
}

export interface VersionAReport {
  tolerationsSummary: string;
  repeatingThemesSummary: string;
  bopStatement: string;
  evidenceSection: string;
  whatItProtected: string;
  costToday: string;
  evolvedPrinciple: string;
  nextSteps: string;
}

export interface VersionBReport {
  originContext: string;
  tolerationsMapped: string;
  firstHousePatternMap: string;
  memoryThemeAnalysis: string;
  archetypeAnalysis: string;
  fullBopHypothesis: string;
  payoffAndCost: string;
  observationFindings: string;
  neurologicalShift: string;
  newOperatingPrinciple: string;
  thirtyDayPlan: string;
  integrationAndIdentity: string;
}
