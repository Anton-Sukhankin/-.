import type { MetricsSource } from './metrics/model';
import type { MailingsSource } from './mailings/source';
import type { ReportUsageSource } from './usage/model';
import type { ReportDataSource, ReportLineage } from './sources/model';
import type { ReportTechnicalContent } from './technical/model';
export interface ReportOverviewContent {
  description: string;
  businessQuestions?: readonly string[];
  terms?: readonly string[];
  methodology?: readonly string[];
  additional?: string;
  context?: string;
  questions?: readonly { title: string; answer: string }[];
  refreshSchedule?: string;
  people?: readonly { name: string; description: string; role: string; avatar: string }[];
}

export interface ReportSlide {
  title: string;
  description: string;
  example: readonly (readonly [label: string, value: string])[];
}

export interface ReportDetailContent {
  overview?: ReportOverviewContent;
  slides?: readonly ReportSlide[];
  sources?: readonly ReportDataSource[];
  technical?: ReportTechnicalContent;
  /** Counts available independently of the corresponding item lists. */
  confirmedCounts?: { slides?: number; metrics?: number; sources?: number };
  lineage?: ReportLineage;
  catalogId?: string;
  headingNote?: string;
  demonstration?: boolean;
}
export interface ReportDetailSources {
  read(reportId: string): ReportDetailContent | undefined;
  metrics: MetricsSource;
  mailings: MailingsSource;
  usage?: ReportUsageSource;
}
