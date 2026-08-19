export type DocumentType =
  | "supply"
  | "nda"
  | "it"
  | "procurement";

export type RiskLevel =
  | "critical"
  | "warning"
  | "safe";

export type BusinessRecommendation =
  | "Можно подписывать"
  | "Можно подписывать после правок"
  | "Не подписывать без внесения изменений";

export type AuditRisk = {
  id: string;
  level: RiskLevel;
  title: string;
  clause: string;
  finding: string;
  recommendation: string;
  replacementText: string;
  evidence: string;
};

export type AuditSummary = {
  critical: number;
  warning: number;
  safe: number;
  score: number;
};

export type AuditResult = {
  fileName: string;

  documentType: DocumentType;

  executiveSummary: string;

  businessRecommendation: BusinessRecommendation;

  topRisks: string[];

  extractedText: string;

  risks: AuditRisk[];

  summary: AuditSummary;

  auditedAt: string;
};