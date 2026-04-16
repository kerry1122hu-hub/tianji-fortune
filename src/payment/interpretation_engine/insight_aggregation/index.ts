import { INSIGHT_RULES_VERSION, average, clamp01 } from '../constants';
import type { AggregatedInsight, InsightRule, SemanticItem } from '../types';
import { INSIGHT_RULES } from './rules';

function tagScoreMap(items: SemanticItem[]): Map<string, SemanticItem> {
  return new Map(items.map((item) => [item.tag_code, item]));
}

function scoreOf(item: SemanticItem | undefined): number {
  if (!item) {
    return 0;
  }
  return item.strength * item.confidence;
}

function matchedGroup(rule: InsightRule, items: Map<string, SemanticItem>): string[] | null {
  if (!rule.required_groups?.length) {
    return null;
  }
  for (const group of rule.required_groups) {
    if (group.every((tagCode) => items.has(tagCode))) {
      return group;
    }
  }
  return null;
}

function activationTags(rule: InsightRule, items: Map<string, SemanticItem>): string[] {
  if (rule.activation_mode === 'single_tag') {
    return rule.required_tags?.filter((tagCode) => items.has(tagCode)).slice(0, 1) ?? [];
  }
  if (rule.activation_mode === 'any_of') {
    return rule.required_tags?.filter((tagCode) => items.has(tagCode)) ?? [];
  }
  if (rule.activation_mode === 'all_of') {
    const tags = rule.required_tags ?? [];
    return tags.every((tagCode) => items.has(tagCode)) ? tags : [];
  }
  const group = matchedGroup(rule, items);
  return group ?? [];
}

function coverageFactor(rule: InsightRule, activeTags: string[]): number {
  if (!activeTags.length) {
    return 0;
  }
  if (rule.activation_mode === 'single_tag') {
    return 1;
  }
  if (rule.activation_mode === 'any_of') {
    return activeTags.length > 1 ? 1 : 0.9;
  }
  return 1;
}

function coherenceFactor(rule: InsightRule, items: Map<string, SemanticItem>): number {
  const negatives = (rule.negative_tags ?? []).filter((tagCode) => items.has(tagCode));
  if (!negatives.length) {
    return 1;
  }
  return Math.max(0.78, 1 - negatives.length * 0.08);
}

function buildInsight(rule: InsightRule, items: Map<string, SemanticItem>): AggregatedInsight | null {
  const activeTags = activationTags(rule, items);
  if (!activeTags.length) {
    return null;
  }

  const requiredScore = activeTags.reduce((sum, tagCode) => sum + scoreOf(items.get(tagCode)), 0);
  const optionalScore = (rule.optional_tags ?? [])
    .filter((tagCode) => items.has(tagCode))
    .reduce((sum, tagCode) => sum + scoreOf(items.get(tagCode)) * 0.45, 0);
  const negativeScore = (rule.negative_tags ?? [])
    .filter((tagCode) => items.has(tagCode))
    .reduce((sum, tagCode) => sum + scoreOf(items.get(tagCode)) * 0.35, 0);

  const rawScore = requiredScore + optionalScore - negativeScore;
  const activationScore = rawScore * coverageFactor(rule, activeTags) * coherenceFactor(rule, items);

  if (activationScore < rule.min_score) {
    return null;
  }

  const allTags = [
    ...activeTags,
    ...((rule.optional_tags ?? []).filter((tagCode) => items.has(tagCode))),
    ...((rule.negative_tags ?? []).filter((tagCode) => items.has(tagCode))),
  ];
  const uniqueTags = [...new Set(allTags)];
  const contributingItems = uniqueTags.map((tagCode) => items.get(tagCode)).filter(Boolean) as SemanticItem[];
  const evidenceRefs = [...new Set(contributingItems.flatMap((item) => item.evidence_refs))];
  const confidenceBase = average(contributingItems.map((item) => item.confidence));
  const confidenceDensity = contributingItems.length >= 4 ? 1 : contributingItems.length >= 2 ? 0.95 : 0.85;
  const confidence = clamp01(confidenceBase * 0.95 * confidenceDensity);
  const intensityBonus = activationScore >= 0.85 ? 2 : activationScore >= 0.72 ? 1 : 0;

  return {
    insight_code: rule.insight_code,
    category: rule.category,
    section: rule.section,
    priority: rule.priority_base + intensityBonus,
    score: clamp01(activationScore),
    confidence,
    tag_refs: uniqueTags,
    evidence_refs: evidenceRefs,
    render_hints: rule.render_hints,
  };
}

export function aggregateInsights(semanticItems: SemanticItem[]): { insights: AggregatedInsight[]; aggregation_version: string } {
  const itemMap = tagScoreMap(semanticItems);
  const insights = INSIGHT_RULES.map((rule) => buildInsight(rule, itemMap)).filter(Boolean) as AggregatedInsight[];

  insights.sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }
    const delta = right.score * right.confidence - left.score * left.confidence;
    if (delta !== 0) {
      return delta;
    }
    return left.insight_code.localeCompare(right.insight_code);
  });

  const seenBySection = new Map<string, AggregatedInsight[]>();
  for (const insight of insights) {
    const bucket = seenBySection.get(insight.section) ?? [];
    const conflict = bucket.find((existing) => Math.abs(existing.score - insight.score) < 0.08);
    if (conflict) {
      conflict.tension_pair = true;
      insight.tension_pair = true;
    }
    bucket.push(insight);
    seenBySection.set(insight.section, bucket);
  }

  return {
    insights,
    aggregation_version: INSIGHT_RULES_VERSION,
  };
}
