import type { GeneratedRef } from './types';

export const REF_RULES_VERSION = 'ref-rules-v1.0.0';
export const TAG_MATCHING_VERSION = 'tag-matching-v1.0.0';
export const INSIGHT_RULES_VERSION = 'insight-rules-v1.0.0';

export const ANGULAR_HOUSES = new Set([1, 4, 7, 10]);

export const SIGN_TO_ELEMENT: Record<string, string> = {
  aries: 'FIRE',
  leo: 'FIRE',
  sagittarius: 'FIRE',
  taurus: 'EARTH',
  virgo: 'EARTH',
  capricorn: 'EARTH',
  gemini: 'AIR',
  libra: 'AIR',
  aquarius: 'AIR',
  cancer: 'WATER',
  scorpio: 'WATER',
  pisces: 'WATER',
};

export const POINT_PRIORITY: Record<string, number> = {
  ASC: 1,
  MC: 2,
  SUN: 3,
  MOON: 4,
  MERCURY: 5,
  VENUS: 6,
  MARS: 7,
  JUPITER: 8,
  SATURN: 9,
  URANUS: 10,
  NEPTUNE: 11,
  PLUTO: 12,
  CHIRON: 13,
  TRUE_NODE: 14,
  MEAN_NODE: 15,
  SOUTH_NODE: 16,
  PART_OF_FORTUNE: 17,
};

export const REF_TYPE_DEFAULT_WEIGHT: Record<GeneratedRef['ref_type'], number> = {
  point_sign: 0.76,
  point_house: 0.78,
  point_motion: 0.58,
  point_angularity: 0.74,
  house_cusp_sign: 0.62,
  house_cusp_element: 0.58,
  aspect: 0.82,
  derived_metric: 0.7,
  emphasis: 0.66,
  pattern: 0.72,
  dominance: 0.7,
  event_trigger: 0.8,
  palace: 0.72,
  star: 0.74,
  transformation: 0.72,
  cross_reference: 0.64,
};

export const TIME_ACCURACY_FACTOR: Record<string, number> = {
  exact: 1,
  approximate: 0.82,
  unknown: 0.35,
};

export function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

export function average(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
