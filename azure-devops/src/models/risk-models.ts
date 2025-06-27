// Risk Assessment Models
export interface RiskScore {
  overall: number; // 0-10 scale
  level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100 percentage
  categories: RiskCategories;
}

export interface RiskCategories {
  codeQuality: RiskDimension;
  security: RiskDimension;
  testing: RiskDimension;
  deployment: RiskDimension;
  business: RiskDimension;
  process: RiskDimension;
}

export interface RiskDimension {
  score: number; // 0-10 scale
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  evidence: string[];
  mitigations?: string[];
}

export interface RiskFactor {
  category: keyof RiskCategories;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence?: string;
  recommendation?: string;
  impact: string;
}

export interface PRRiskAssessment {
  pullRequestId: number;
  riskScore: RiskScore;
  keyRiskFactors: string[];
  mitigationRecommendations: MitigationRecommendation[];
  deploymentRecommendation: DeploymentRecommendation;
  analysisTimestamp: string;
}

export interface MitigationRecommendation {
  priority: 'blocker' | 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
  category: keyof RiskCategories;
  estimatedEffort?: string;
}

export interface DeploymentRecommendation {
  decision: 'go' | 'caution' | 'no-go';
  reasoning: string;
  conditions?: string[];
  timing?: string;
  rollbackPlan?: string;
  monitoringRequirements?: string[];
}

export interface BatchRiskAnalysis {
  summary: {
    totalPRs: number;
    riskDistribution: Record<string, number>;
    averageRiskScore: number;
    totalChangedFiles: number;
    totalLinesChanged: number;
  };
  riskTrends: {
    increasingComplexity: boolean;
    frequentCriticalChanges: boolean;
    testCoverageDecline: boolean;
    deploymentRiskIncrease: boolean;
  };
  prComparison: Array<{
    pullRequestId: number;
    riskScore: number;
    riskLevel: string;
    primaryConcerns: string[];
  }>;
  aggregateRecommendations: {
    immediateActions: string[];
    processImprovements: string[];
    teamRecommendations: string[];
  };
}

export interface ComplexityMetrics {
  pullRequestId: number;
  complexityAnalysis: {
    overall: {
      cyclomaticComplexityDelta: number;
      cognitiveComplexityDelta: number;
      maintainabilityIndexDelta: number;
      duplicatedLinesDelta: number;
      codeSmellsDelta: number;
    };
    fileLevel: FileComplexityMetric[];
    hotspots: ComplexityHotspot[];
  };
  qualityGates: {
    passedComplexityThreshold: boolean;
    passedDuplicationThreshold: boolean;
    passedMaintainabilityThreshold: boolean;
    overallQualityScore: number;
  };
}

export interface FileComplexityMetric {
  fileName: string;
  complexityBefore: number;
  complexityAfter: number;
  complexityDelta: number;
  newMethods: number;
  modifiedMethods: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComplexityHotspot {
  file: string;
  method?: string;
  complexity: number;
  concern: string;
  recommendation?: string;
}

export interface SecurityAnalysis {
  pullRequestId: number;
  securityAnalysis: {
    sensitiveFileChanges: SensitiveFileChange[];
    securityPatterns: SecurityPatterns;
    dependencyVulnerabilities: SecurityVulnerability[];
    secretsDetection: SecretsDetection;
    complianceImpact: ComplianceImpact;
  };
}

export interface SensitiveFileChange {
  fileName: string;
  changeType: 'added' | 'modified' | 'deleted';
  concerns: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityPatterns {
  authenticationChanges: boolean;
  authorizationChanges: boolean;
  cryptographyChanges: boolean;
  dataValidationChanges: boolean;
  sqlInjectionRisk: boolean;
  xssRisk: boolean;
  csrfRisk: boolean;
}

export interface SecretsDetection {
  potentialSecrets: number;
  hardcodedCredentials: number;
  suspiciousPatterns: string[];
}

export interface ComplianceImpact {
  pciDssImpact: boolean;
  soxImpact: boolean;
  gdprImpact: boolean;
  hipaaImpact: boolean;
  customCompliance?: string[];
}

export interface SecurityVulnerability {
  package: string;
  version: string;
  vulnerability: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  patchAvailable: boolean;
  description?: string;
  cvssScore?: number;
}

export interface TestImpactAnalysis {
  pullRequestId: number;
  testAnalysis: {
    coverage: {
      coverageBefore: number;
      coverageAfter: number;
      coverageDelta: number;
      uncoveredLines: number;
      newUncoveredLines: number;
    };
    testChanges: {
      newTests: number;
      modifiedTests: number;
      deletedTests: number;
      testToCodeRatio: number;
    };
    testExecution: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      skippedTests: number;
      testDuration: number;
      flakyTests: string[];
    };
    riskAssessment: {
      missingCriticalTests: boolean;
      hasRegressionRisk: boolean;
      testQualityScore: number;
    };
  };
}
