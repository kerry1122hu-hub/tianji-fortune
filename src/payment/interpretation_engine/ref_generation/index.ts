import {
  ANGULAR_HOUSES,
  POINT_PRIORITY,
  REF_RULES_VERSION,
  REF_TYPE_DEFAULT_WEIGHT,
  SIGN_TO_ELEMENT,
  TIME_ACCURACY_FACTOR,
  average,
  clamp01,
} from '../constants';
import type {
  ChartFact,
  ChartResultLike,
  GeneratedRef,
  RefType,
  RefGenerationResult,
  SystemCode,
  SystemResult,
} from '../types';

function toUpperToken(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  return value.trim().replace(/[\s-]+/g, '_').toUpperCase();
}

function toLowerToken(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  return value.trim().replace(/[\s-]+/g, '_').toLowerCase();
}

function numeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function getTimeAccuracy(chart: ChartResultLike): 'exact' | 'approximate' | 'unknown' {
  const value = chart.subjects?.[0]?.birth_input?.time_accuracy;
  if (value === 'approximate' || value === 'unknown') {
    return value;
  }
  return 'exact';
}

function getQualifier(fact: ChartFact, key: string): unknown {
  if (fact.qualifiers?.[key] !== undefined) {
    return fact.qualifiers[key];
  }
  if (fact.value && typeof fact.value === 'object' && fact.value !== null && key in fact.value) {
    return (fact.value as Record<string, unknown>)[key];
  }
  if (fact.extensions?.[key] !== undefined) {
    return fact.extensions[key];
  }
  return undefined;
}

function buildConfidence(base: number, system: SystemResult, timeAccuracy: string, isHouseDependent: boolean, isAspect: boolean): number {
  let confidence = base;
  if (isAspect) {
    confidence *= system.confidence?.aspects ?? 0.92;
  }
  if (isHouseDependent) {
    confidence *= system.confidence?.houses ?? 0.9;
  }
  confidence *= TIME_ACCURACY_FACTOR[timeAccuracy] ?? 1;
  return clamp01(confidence);
}

function pushRef(target: Map<string, GeneratedRef>, ref: GeneratedRef): void {
  const existing = target.get(ref.ref_code);
  if (!existing) {
    target.set(ref.ref_code, ref);
    return;
  }

  existing.source_fact_ids = [...new Set([...existing.source_fact_ids, ...ref.source_fact_ids])];
  existing.confidence = clamp01(Math.max(existing.confidence, ref.confidence));
  existing.weight_hint = clamp01(Math.max(existing.weight_hint, ref.weight_hint));
  existing.metadata = { ...existing.metadata, ...ref.metadata };
}

function buildBaseRef(params: {
  ref_code: string;
  ref_type: RefType;
  system_code: SystemCode;
  source_fact_ids: string[];
  confidence: number;
  metadata: Record<string, unknown>;
  source?: 'chart_result' | 'derived' | 'event_rule';
  weight_hint?: number;
}): GeneratedRef {
  return {
    ref_code: params.ref_code,
    ref_type: params.ref_type,
    source: params.source ?? 'chart_result',
    system_code: params.system_code,
    source_fact_ids: params.source_fact_ids,
    weight_hint: params.weight_hint ?? REF_TYPE_DEFAULT_WEIGHT[params.ref_type],
    confidence: clamp01(params.confidence),
    metadata: params.metadata,
  };
}

function orderedPoints(pointA: string, pointB: string): [string, string] {
  const scoreA = POINT_PRIORITY[pointA] ?? 999;
  const scoreB = POINT_PRIORITY[pointB] ?? 999;
  return scoreA <= scoreB ? [pointA, pointB] : [pointB, pointA];
}

function generateWesternRefs(system: SystemResult, timeAccuracy: string, target: Map<string, GeneratedRef>, warnings: string[]): void {
  for (const fact of system.facts) {
    if (fact.fact_type === 'point') {
      const pointCode = toUpperToken(getQualifier(fact, 'point_code'));
      const sign = toUpperToken(getQualifier(fact, 'sign'));
      const houseNumber = numeric(getQualifier(fact, 'house_number'));
      const motion = toUpperToken(getQualifier(fact, 'motion'));
      const confidenceBase = fact.confidence ?? 0.98;

      if (pointCode && sign) {
        pushRef(
          target,
          buildBaseRef({
            ref_code: `${pointCode}_IN_${sign}`,
            ref_type: 'point_sign',
            system_code: system.system_code,
            source_fact_ids: [fact.fact_id],
            confidence: buildConfidence(confidenceBase, system, timeAccuracy, false, false),
            metadata: { point_code: pointCode, sign: sign.toLowerCase() },
          }),
        );
      }

      if (pointCode && houseNumber !== null) {
        if (timeAccuracy !== 'unknown' && (system.confidence?.houses ?? 0.9) >= 0.65) {
          pushRef(
            target,
            buildBaseRef({
              ref_code: `${pointCode}_IN_HOUSE_${houseNumber}`,
              ref_type: 'point_house',
              system_code: system.system_code,
              source_fact_ids: [fact.fact_id],
              confidence: buildConfidence(confidenceBase, system, timeAccuracy, true, false),
              metadata: { point_code: pointCode, house_number: houseNumber },
            }),
          );

          if (ANGULAR_HOUSES.has(houseNumber)) {
            pushRef(
              target,
              buildBaseRef({
                ref_code: `${pointCode}_ANGULAR`,
                ref_type: 'point_angularity',
                system_code: system.system_code,
                source_fact_ids: [fact.fact_id],
                confidence: buildConfidence(confidenceBase * 0.95, system, timeAccuracy, true, false),
                metadata: { point_code: pointCode, house_number: houseNumber },
                source: 'derived',
              }),
            );
          }
        } else {
          warnings.push(`Skipped house refs for ${fact.fact_id} because house confidence is low or time is unknown.`);
        }
      }

      if (pointCode && motion && ['DIRECT', 'RETROGRADE', 'STATIONARY'].includes(motion)) {
        pushRef(
          target,
          buildBaseRef({
            ref_code: `${pointCode}_${motion}`,
            ref_type: 'point_motion',
            system_code: system.system_code,
            source_fact_ids: [fact.fact_id],
            confidence: buildConfidence(confidenceBase * 0.95, system, timeAccuracy, false, false),
            metadata: { point_code: pointCode, motion: motion.toLowerCase() },
          }),
        );
      }
    }

    if (fact.fact_type === 'house') {
      const houseNumber = numeric(getQualifier(fact, 'house_number'));
      const sign = toUpperToken(getQualifier(fact, 'sign'));
      if (houseNumber === null || !sign) {
        continue;
      }
      if (timeAccuracy === 'unknown' || (system.confidence?.houses ?? 0.9) < 0.65) {
        warnings.push(`Skipped house cusp refs for ${fact.fact_id} because house confidence is low or time is unknown.`);
        continue;
      }

      const signLower = sign.toLowerCase();
      const element = SIGN_TO_ELEMENT[signLower];
      const confidence = buildConfidence(fact.confidence ?? 0.95, system, timeAccuracy, true, false);

      pushRef(
        target,
        buildBaseRef({
          ref_code: `HOUSE_${houseNumber}_CUSP_IN_${sign}`,
          ref_type: 'house_cusp_sign',
          system_code: system.system_code,
          source_fact_ids: [fact.fact_id],
          confidence,
          metadata: { house_number: houseNumber, sign: signLower },
        }),
      );

      if (element) {
        pushRef(
          target,
          buildBaseRef({
            ref_code: `HOUSE_${houseNumber}_CUSP_IN_${element}_SIGN`,
            ref_type: 'house_cusp_element',
            system_code: system.system_code,
            source_fact_ids: [fact.fact_id],
            confidence: clamp01(confidence * 0.95),
            metadata: { house_number: houseNumber, sign: signLower, element: element.toLowerCase() },
            source: 'derived',
          }),
        );
      }
    }

    if (fact.fact_type === 'aspect') {
      const pointA = toUpperToken(getQualifier(fact, 'point_a_code'));
      const pointB = toUpperToken(getQualifier(fact, 'point_b_code'));
      const aspectType = toUpperToken(getQualifier(fact, 'aspect_type'));
      if (!pointA || !pointB || !aspectType) {
        continue;
      }
      const [left, right] = orderedPoints(pointA, pointB);
      pushRef(
        target,
        buildBaseRef({
          ref_code: `${left}_${aspectType}_${right}`,
          ref_type: 'aspect',
          system_code: system.system_code,
          source_fact_ids: [fact.fact_id],
          confidence: buildConfidence(fact.confidence ?? 0.92, system, timeAccuracy, false, true),
          metadata: {
            point_a_code: left,
            point_b_code: right,
            aspect_type: aspectType.toLowerCase(),
            orb_deg: getQualifier(fact, 'orb_deg'),
            strength_score: getQualifier(fact, 'strength_score'),
            exact: getQualifier(fact, 'exact'),
          },
        }),
      );
    }

    if (fact.fact_type === 'derived_metric') {
      const metricCode = toUpperToken(getQualifier(fact, 'metric_code') ?? fact.fact_code);
      if (!metricCode) {
        continue;
      }
      pushRef(
        target,
        buildBaseRef({
          ref_code: metricCode,
          ref_type: metricCode.startsWith('DOMINANT_') ? 'dominance' : 'derived_metric',
          system_code: system.system_code,
          source_fact_ids: [fact.fact_id],
          confidence: clamp01((fact.confidence ?? 0.9) * (system.confidence?.overall ?? 0.95)),
          metadata: { metric_code: metricCode, value: fact.value },
        }),
      );
    }

    if (fact.fact_type === 'pattern') {
      const patternCode = toUpperToken(getQualifier(fact, 'pattern_code') ?? fact.fact_code);
      if (!patternCode) {
        continue;
      }
      const refCode = patternCode.startsWith('PATTERN_') ? patternCode : `PATTERN_${patternCode}`;
      pushRef(
        target,
        buildBaseRef({
          ref_code: refCode,
          ref_type: 'pattern',
          system_code: system.system_code,
          source_fact_ids: [fact.fact_id],
          confidence: clamp01((fact.confidence ?? 0.88) * (system.confidence?.overall ?? 0.95)),
          metadata: { pattern_code: patternCode, value: fact.value },
        }),
      );
    }
  }
}

function generateZiweiRefs(system: SystemResult, target: Map<string, GeneratedRef>): void {
  for (const fact of system.facts) {
    if (fact.fact_type === 'palace') {
      const palaceCode = toUpperToken(getQualifier(fact, 'palace_code'));
      const mainStar = toUpperToken(getQualifier(fact, 'main_star'));
      if (palaceCode && mainStar) {
        pushRef(
          target,
          buildBaseRef({
            ref_code: `ZIWEI_${palaceCode}_MAIN_${mainStar}`,
            ref_type: 'palace',
            system_code: system.system_code,
            source_fact_ids: [fact.fact_id],
            confidence: clamp01((fact.confidence ?? 0.92) * (system.confidence?.overall ?? 0.95)),
            metadata: { palace_code: palaceCode, main_star: mainStar },
          }),
        );
      }
    }

    if (fact.fact_type === 'star') {
      const starCode = toUpperToken(getQualifier(fact, 'star_code'));
      const palaceCode = toUpperToken(getQualifier(fact, 'palace_code'));
      if (starCode && palaceCode) {
        pushRef(
          target,
          buildBaseRef({
            ref_code: `ZIWEI_${starCode}_IN_${palaceCode}`,
            ref_type: 'star',
            system_code: system.system_code,
            source_fact_ids: [fact.fact_id],
            confidence: clamp01((fact.confidence ?? 0.92) * (system.confidence?.overall ?? 0.95)),
            metadata: { star_code: starCode, palace_code: palaceCode },
          }),
        );
      }
    }

    if (fact.fact_type === 'transformation') {
      const palaceCode = toUpperToken(getQualifier(fact, 'palace_code'));
      const transformationCode = toUpperToken(getQualifier(fact, 'transformation_code'));
      if (palaceCode && transformationCode) {
        pushRef(
          target,
          buildBaseRef({
            ref_code: `ZIWEI_${palaceCode}_${transformationCode}`,
            ref_type: 'transformation',
            system_code: system.system_code,
            source_fact_ids: [fact.fact_id],
            confidence: clamp01((fact.confidence ?? 0.9) * (system.confidence?.overall ?? 0.95)),
            metadata: { palace_code: palaceCode, transformation_code: transformationCode },
          }),
        );
      }
    }

    if (fact.fact_type === 'cross_reference') {
      const refCode = toUpperToken(getQualifier(fact, 'ref_code') ?? fact.fact_code);
      if (refCode) {
        pushRef(
          target,
          buildBaseRef({
            ref_code: refCode,
            ref_type: 'cross_reference',
            system_code: system.system_code,
            source_fact_ids: [fact.fact_id],
            confidence: clamp01((fact.confidence ?? 0.88) * (system.confidence?.overall ?? 0.95)),
            metadata: { source_fact_code: fact.fact_code },
          }),
        );
      }
    }
  }
}

function deriveSignEmphasis(refs: GeneratedRef[], target: Map<string, GeneratedRef>): void {
  const grouped = new Map<string, GeneratedRef[]>();
  for (const ref of refs) {
    if (ref.ref_type !== 'point_sign') {
      continue;
    }
    const sign = toLowerToken(ref.metadata.sign);
    const pointCode = toUpperToken(ref.metadata.point_code);
    if (!sign || !pointCode) {
      continue;
    }
    const bucket = grouped.get(sign) ?? [];
    bucket.push(ref);
    grouped.set(sign, bucket);
  }

  for (const [sign, signRefs] of grouped.entries()) {
    const coreHits = signRefs.filter((ref) => ['SUN', 'MOON', 'ASC'].includes(String(ref.metadata.point_code)));
    const majorHits = signRefs.filter((ref) =>
      ['SUN', 'MOON', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN', 'ASC'].includes(String(ref.metadata.point_code)),
    );
    if (majorHits.length < 3 && coreHits.length < 2) {
      continue;
    }

    pushRef(
      target,
      buildBaseRef({
        ref_code: `${sign.toUpperCase()}_EMPHASIS`,
        ref_type: 'emphasis',
        system_code: signRefs[0].system_code,
        source_fact_ids: signRefs.flatMap((ref) => ref.source_fact_ids),
        confidence: clamp01(average(signRefs.map((ref) => ref.confidence)) * 0.92),
        metadata: {
          sign,
          contributing_refs: signRefs.map((ref) => ref.ref_code),
          emphasis_strength: majorHits.length >= 3 ? 'strong' : 'moderate',
        },
        source: 'derived',
      }),
    );
  }
}

export function generateRefs(chart: ChartResultLike): RefGenerationResult {
  const refMap = new Map<string, GeneratedRef>();
  const warnings: string[] = [];
  const timeAccuracy = getTimeAccuracy(chart);

  for (const system of chart.systems) {
    if (system.system_code === 'western') {
      generateWesternRefs(system, timeAccuracy, refMap, warnings);
    } else if (system.system_code === 'ziwei') {
      generateZiweiRefs(system, refMap);
    }
  }

  deriveSignEmphasis([...refMap.values()], refMap);

  return {
    chart_id: chart.chart_id,
    ref_version: REF_RULES_VERSION,
    refs: [...refMap.values()].sort((left, right) => left.ref_code.localeCompare(right.ref_code)),
    warnings,
  };
}
