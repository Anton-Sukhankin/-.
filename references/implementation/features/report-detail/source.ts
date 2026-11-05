import type { MetricsSource } from './metrics/model';
import type { MailingsSource } from './mailings/source';
import type { ReportUsageSource } from './usage/model';
import type { ReportDataSource, ReportLineage } from './sources/model';
export interface ReportOverviewContent {
  description: string;
  businessQuestions: readonly string[];
  terms: readonly string[];
  methodology: readonly string[];
  additional: string;
  context: string;
  questions: readonly { title: string; answer: string }[];
}
export interface ReportDetailContent {
  overview: ReportOverviewContent;
  slides: readonly string[];
  sources: readonly ReportDataSource[];
  lineage?: ReportLineage;
}
export interface ReportDetailSources {
  read(reportId: string): ReportDetailContent | undefined;
  metrics: MetricsSource;
  mailings: MailingsSource;
  usage?: ReportUsageSource;
}
