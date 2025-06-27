// Pull Request Models
export interface PullRequest {
  id: number;
  title: string;
  description?: string;
  author: string;
  createdDate: string;
  completedDate?: string;
  mergedDate?: string;
  targetBranch: string;
  sourceBranch: string;
  status: string;
  mergeStatus?: string;
  isDraft?: boolean;
  labels?: string[];
}

export interface PRSummary {
  totalPRs: number;
  dateRange: {
    from: string;
    to: string;
  };
  statusBreakdown: {
    completed: number;
    active: number;
    abandoned: number;
  };
}

export interface PRChanges {
  filesChanged: string[];
  totalFilesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  netLinesChanged: number;
  changedDirectories: string[];
  fileTypeBreakdown: Record<string, number>;
  criticalFilesChanged: string[];
  configurationFiles: string[];
  migrationFiles: string[];
  testFiles: string[];
}

export interface ReviewProcess {
  totalReviewers: number;
  reviewers: string[];
  approvals: number;
  reviewComments: number;
  reviewDurationHours: number;
  iterationsCount: number;
  hasSecurityReview: boolean;
  hasArchitectureReview: boolean;
  reviewQualityScore: number;
}

export interface CICDInfo {
  buildStatus: string;
  testsPassed: number;
  testsFailed: number;
  testCoverage: number;
  buildDurationMinutes: number;
  deploymentStatus?: string;
  previousFailures: number;
  qualityGatesPassed: boolean;
}

export interface CodeComplexity {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  duplicatedLines: number;
  codeSmells: number;
  maintainabilityIndex: number;
  technicalDebtMinutes: number;
}

export interface FileDiff {
  fileName: string;
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  isCriticalFile: boolean;
  fileType: string;
  linesAdded: number;
  linesDeleted: number;
  diffSummary: string;
  diffContent?: string;
  beforeContent?: string;
  afterContent?: string;
  riskIndicators: RiskIndicators;
}

export interface RiskIndicators {
  touchesAuthentication: boolean;
  touchesDatabase: boolean;
  touchesConfiguration: boolean;
  touchesSecurityModule: boolean;
  hasHardcodedValues: boolean;
  hasComplexLogic: boolean;
  affectsPublicAPI: boolean;
  hasSecurityVulnerabilities: boolean;
  hasPerformanceImpact: boolean;
}

export interface PRDetailedAnalysis {
  pullRequest: PullRequest;
  changes: PRChanges;
  reviewProcess: ReviewProcess;
  cicd: CICDInfo;
  codeComplexity: CodeComplexity;
  dependencies?: DependencyChanges;
}

export interface DependencyChanges {
  added: string[];
  updated: Array<{
    name: string;
    fromVersion: string;
    toVersion: string;
  }>;
  removed: string[];
  vulnerabilities: SecurityVulnerability[];
}

export interface SecurityVulnerability {
  package: string;
  version: string;
  vulnerability: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  patchAvailable: boolean;
  description?: string;
}
