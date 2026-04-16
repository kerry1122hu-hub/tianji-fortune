export type SystemCode = 'western' | 'ziwei';

export type RefSource = 'chart_result' | 'derived' | 'event_rule';

export type RefType =
  | 'point_sign'
  | 'point_house'
  | 'point_motion'
  | 'point_angularity'
  | 'house_cusp_sign'
  | 'house_cusp_element'
  | 'aspect'
  | 'derived_metric'
  | 'emphasis'
  | 'pattern'
  | 'dominance'
  | 'event_trigger'
  | 'palace'
  | 'star'
  | 'transformation'
  | 'cross_reference';

export type SemanticCategory =
  | 'self'
  | 'career'
  | 'relationship'
  | 'wealth'
  | 'health'
  | 'timing'
  | 'purpose'
  | 'spirit';

export type Polarity =
  | 'supportive'
  | 'challenging'
  | 'mixed'
  | 'neutral'
  | 'neutral_positive'
  | 'neutral_negative';

export type InsightCategory =
  | 'strength'
  | 'tension'
  | 'theme'
  | 'opportunity'
  | 'risk'
  | 'growth';

export type InsightSection =
  | 'summary'
  | 'personality'
  | 'relationships'
  | 'career'
  | 'money'
  | 'family'
  | 'growth'
  | 'timing'
  | 'shadow';

export interface BirthInputLike {
  time_accuracy?: 'exact' | 'approximate' | 'unknown' | null;
}

export interface ChartSubjectLike {
  subject_id?: string;
  birth_input?: BirthInputLike | null;
}

export interface ChartFact {
  fact_id: string;
  fact_code: string;
  fact_type: string;
  subject_ref?: string | null;
  source_path?: string | null;
  value?: unknown;
  qualifiers?: Record<string, unknown>;
  confidence?: number | null;
  extensions?: Record<string, unknown>;
}

export interface SystemResult {
  system_code: SystemCode;
  system_version?: string;
  facts: ChartFact[];
  confidence?: {
    overall?: number | null;
    houses?: number | null;
    angles?: number | null;
    aspects?: number | null;
  };
  extensions?: Record<string, unknown>;
}

export interface ChartResultLike {
  chart_id: string;
  chart_type?: string;
  subjects?: ChartSubjectLike[];
  systems: SystemResult[];
  confidence?: {
    overall?: number | null;
    houses?: number | null;
    angles?: number | null;
    aspects?: number | null;
  };
  warnings?: Array<{ code: string; severity?: string; message?: string }>;
}

export interface GeneratedRef {
  ref_code: string;
  ref_type: RefType;
  source: RefSource;
  system_code: SystemCode;
  source_fact_ids: string[];
  weight_hint: number;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface RefGenerationResult {
  chart_id: string;
  ref_version: string;
  refs: GeneratedRef[];
  warnings: string[];
}

export interface TagSeed {
  tag_code: string;
  category: SemanticCategory;
  polarity_default: Polarity;
  typical_evidence_patterns: string[];
  systems_supported?: SystemCode[];
  label?: string;
  label_zh?: string;
  label_en?: string;
  description?: string;
  render_hints?: RenderHints;
  deprecated?: boolean;
}

export interface SemanticProvenance {
  system: SystemCode;
  signal: string;
  fact_refs: string[];
  ref_codes: string[];
}

export interface SemanticItem {
  item_id: string;
  tag_code: string;
  category: SemanticCategory;
  polarity: Polarity;
  strength: number;
  confidence: number;
  evidence_refs: string[];
  themes: string[];
  cross_system_agreement: boolean;
  provenance: SemanticProvenance[];
  matched_ref_codes: string[];
}

export interface RenderHints {
  tone?: 'neutral' | 'warm' | 'clinical' | 'encouraging' | 'reflective';
  avoid_absolutes?: boolean;
  suggested_section?: InsightSection;
}

export interface InsightRule {
  insight_code: string;
  category: InsightCategory;
  section: InsightSection;
  priority_base: number;
  activation_mode: 'single_tag' | 'any_of' | 'all_of' | 'all_of_any_group';
  required_tags?: string[];
  required_groups?: string[][];
  optional_tags?: string[];
  negative_tags?: string[];
  min_score: number;
  render_hints?: RenderHints;
}

export interface AggregatedInsight {
  insight_code: string;
  category: InsightCategory;
  section: InsightSection;
  priority: number;
  score: number;
  confidence: number;
  tag_refs: string[];
  evidence_refs: string[];
  render_hints?: RenderHints;
  tension_pair?: boolean;
}

export interface InterpretationPipelineResult {
  chart_id: string;
  refs: RefGenerationResult;
  semantic_items: SemanticItem[];
  insights: AggregatedInsight[];
  aggregation_version: string;
}
