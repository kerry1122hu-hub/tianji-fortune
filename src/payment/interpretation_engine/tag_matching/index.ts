import { TAG_MATCHING_VERSION, average, clamp01 } from '../constants';
import type { GeneratedRef, SemanticItem, SemanticProvenance, TagSeed } from '../types';
import { TAG_SEEDS } from './seed_tags';

function themeList(tagCode: string): string[] {
  const parts = tagCode.split('.');
  return parts.slice(0, Math.min(parts.length, 2));
}

function buildProvenance(tag: TagSeed, refs: GeneratedRef[]): SemanticProvenance[] {
  const grouped = new Map<string, GeneratedRef[]>();
  for (const ref of refs) {
    const bucket = grouped.get(ref.system_code) ?? [];
    bucket.push(ref);
    grouped.set(ref.system_code, bucket);
  }

  return [...grouped.entries()].map(([systemCode, systemRefs]) => ({
    system: systemCode as SemanticProvenance['system'],
    signal: `${tag.tag_code}:${systemRefs.map((ref) => ref.ref_code).join('|')}`,
    fact_refs: [...new Set(systemRefs.flatMap((ref) => ref.source_fact_ids))],
    ref_codes: systemRefs.map((ref) => ref.ref_code),
  }));
}

function findMatches(seed: TagSeed, refs: GeneratedRef[]): GeneratedRef[] {
  return refs.filter((ref) => seed.typical_evidence_patterns.includes(ref.ref_code));
}

export function matchTags(refs: GeneratedRef[]): { semantic_items: SemanticItem[]; matching_version: string } {
  const semanticItems: SemanticItem[] = [];
  let counter = 1;

  for (const seed of TAG_SEEDS) {
    const matches = findMatches(seed, refs);
    if (!matches.length) {
      continue;
    }

    const strengths = matches.map((ref) => ref.weight_hint);
    const confidences = matches.map((ref) => ref.confidence);
    const systems = new Set(matches.map((ref) => ref.system_code));
    const evidenceRefs = [...new Set(matches.flatMap((ref) => ref.source_fact_ids))];

    semanticItems.push({
      item_id: `sem_${String(counter).padStart(3, '0')}`,
      tag_code: seed.tag_code,
      category: seed.category,
      polarity: seed.polarity_default,
      strength: clamp01(Math.max(...strengths) * (matches.length > 1 ? 1 : 0.92)),
      confidence: clamp01(average(confidences) * (matches.length >= 2 ? 1 : 0.94)),
      evidence_refs: evidenceRefs,
      themes: themeList(seed.tag_code),
      cross_system_agreement: systems.size >= 2,
      provenance: buildProvenance(seed, matches),
      matched_ref_codes: matches.map((ref) => ref.ref_code),
    });

    counter += 1;
  }

  semanticItems.sort((left, right) => {
    const delta = right.strength * right.confidence - left.strength * left.confidence;
    if (delta !== 0) {
      return delta;
    }
    return left.tag_code.localeCompare(right.tag_code);
  });

  return {
    semantic_items: semanticItems,
    matching_version: TAG_MATCHING_VERSION,
  };
}
