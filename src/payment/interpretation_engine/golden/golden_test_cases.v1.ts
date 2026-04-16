import type { ChartResultLike } from '../types';

export interface GoldenTestCase {
  case_id: string;
  group: 'western-only' | 'ziwei-only' | 'cross-system';
  description: string;
  chart: ChartResultLike;
  expected_refs: string[];
  expected_tags: string[];
  expected_insights: string[];
  expected_cross_system_tags?: string[];
  strict_expected_refs?: string[];
  strict_expected_tags?: string[];
  strict_expected_insights?: string[];
  strict_expected_cross_system_tags?: string[];
}

export const GOLDEN_TEST_CASES_V1: GoldenTestCase[] = [
  {
    case_id: 'career_discipline_western',
    group: 'western-only',
    description: 'Western-heavy chart should surface disciplined career growth and accumulative wealth style.',
    chart: {
      chart_id: 'golden-001',
      subjects: [{ subject_id: 'subject-001', birth_input: { time_accuracy: 'exact' } }],
      systems: [
        {
          system_code: 'western',
          confidence: { overall: 0.96, houses: 0.93, aspects: 0.94 },
          facts: [
            {
              fact_id: 'g1-f1',
              fact_code: 'saturn_point',
              fact_type: 'point',
              qualifiers: { point_code: 'SATURN', sign: 'capricorn', house_number: 10, motion: 'retrograde' },
              confidence: 0.98,
            },
            {
              fact_id: 'g1-f2',
              fact_code: 'mercury_point',
              fact_type: 'point',
              qualifiers: { point_code: 'MERCURY', sign: 'virgo', house_number: 9, motion: 'direct' },
              confidence: 0.97,
            },
            {
              fact_id: 'g1-f3',
              fact_code: 'house_2',
              fact_type: 'house',
              qualifiers: { house_number: 2, sign: 'taurus' },
              confidence: 0.95,
            },
            {
              fact_id: 'g1-f4',
              fact_code: 'jupiter_point',
              fact_type: 'point',
              qualifiers: { point_code: 'JUPITER', sign: 'taurus', house_number: 2, motion: 'direct' },
              confidence: 0.96,
            },
          ],
        },
      ],
    },
    expected_refs: [
      'SATURN_IN_HOUSE_10',
      'SATURN_ANGULAR',
      'SATURN_RETROGRADE',
      'MERCURY_IN_VIRGO',
      'JUPITER_IN_HOUSE_2',
      'HOUSE_2_CUSP_IN_EARTH_SIGN',
    ],
    expected_tags: [
      'career.trajectory.late_bloomer',
      'career.strengths.specialist_mastery',
      'wealth.earning_style.accumulative_discipline',
    ],
    expected_insights: ['career_compounds_through_discipline', 'money_builds_best_with_patience_and_structure'],
    strict_expected_refs: [
      'HOUSE_2_CUSP_IN_EARTH_SIGN',
      'HOUSE_2_CUSP_IN_TAURUS',
      'JUPITER_DIRECT',
      'JUPITER_IN_HOUSE_2',
      'JUPITER_IN_TAURUS',
      'MERCURY_DIRECT',
      'MERCURY_IN_HOUSE_9',
      'MERCURY_IN_VIRGO',
      'SATURN_ANGULAR',
      'SATURN_IN_CAPRICORN',
      'SATURN_IN_HOUSE_10',
      'SATURN_RETROGRADE',
    ],
    strict_expected_tags: [
      'career.strengths.specialist_mastery',
      'self.decision_style.analytic_patterning',
      'career.strengths.earned_respect',
      'career.trajectory.late_bloomer',
      'wealth.earning_style.accumulative_discipline',
      'purpose.lessons.delayed_maturation',
      'self.shadow.overresponsibility',
    ],
    strict_expected_insights: [
      'career_compounds_through_discipline',
      'growth_runs_through_delayed_maturation',
      'money_builds_best_with_patience_and_structure',
    ],
  },
  {
    case_id: 'visibility_cross_system',
    group: 'cross-system',
    description: 'Western and Ziwei signals should agree on public leadership / visibility.',
    chart: {
      chart_id: 'golden-002',
      subjects: [{ subject_id: 'subject-002', birth_input: { time_accuracy: 'exact' } }],
      systems: [
        {
          system_code: 'western',
          confidence: { overall: 0.95, houses: 0.92, aspects: 0.92 },
          facts: [
            {
              fact_id: 'g2-f1',
              fact_code: 'sun_point',
              fact_type: 'point',
              qualifiers: { point_code: 'SUN', sign: 'leo', house_number: 10, motion: 'direct' },
              confidence: 0.98,
            },
          ],
        },
        {
          system_code: 'ziwei',
          confidence: { overall: 0.91 },
          facts: [
            {
              fact_id: 'g2-z1',
              fact_code: 'ziwei_career_ref',
              fact_type: 'cross_reference',
              qualifiers: { ref_code: 'ZIWEI_ZI_WEI_IN_CAREER' },
              confidence: 0.9,
            },
            {
              fact_id: 'g2-z2',
              fact_code: 'ziwei_life_ref',
              fact_type: 'cross_reference',
              qualifiers: { ref_code: 'ZIWEI_ZI_WEI_IN_LIFE' },
              confidence: 0.9,
            },
          ],
        },
      ],
    },
    expected_refs: ['SUN_IN_HOUSE_10', 'SUN_IN_LEO', 'ZIWEI_ZI_WEI_IN_CAREER', 'ZIWEI_ZI_WEI_IN_LIFE'],
    expected_tags: ['career.leadership_style.public_leadership', 'self.temperament.magnetic_visibility'],
    expected_insights: ['leadership_grows_with_public_exposure'],
    expected_cross_system_tags: ['career.leadership_style.public_leadership', 'self.temperament.magnetic_visibility'],
    strict_expected_refs: [
      'SUN_ANGULAR',
      'SUN_DIRECT',
      'SUN_IN_HOUSE_10',
      'SUN_IN_LEO',
      'ZIWEI_ZI_WEI_IN_CAREER',
      'ZIWEI_ZI_WEI_IN_LIFE',
    ],
    strict_expected_tags: [
      'spirit.archetypes.sovereign_presence',
      'self.temperament.magnetic_visibility',
      'career.leadership_style.public_leadership',
      'self.shadow.overresponsibility',
    ],
    strict_expected_insights: [
      'leadership_grows_with_public_exposure',
      'self_definition_expands_through_visibility',
    ],
    strict_expected_cross_system_tags: [
      'spirit.archetypes.sovereign_presence',
      'self.temperament.magnetic_visibility',
      'career.leadership_style.public_leadership',
    ],
  },
  {
    case_id: 'interiority_and_trust',
    group: 'western-only',
    description: 'Reserved emotional style plus relationship caution should converge into a trust-and-processing-space insight.',
    chart: {
      chart_id: 'golden-003',
      subjects: [{ subject_id: 'subject-003', birth_input: { time_accuracy: 'exact' } }],
      systems: [
        {
          system_code: 'western',
          confidence: { overall: 0.95, houses: 0.92, aspects: 0.93 },
          facts: [
            {
              fact_id: 'g3-f1',
              fact_code: 'moon_point',
              fact_type: 'point',
              qualifiers: { point_code: 'MOON', sign: 'capricorn', house_number: 4, motion: 'direct' },
              confidence: 0.97,
            },
            {
              fact_id: 'g3-f2',
              fact_code: 'saturn_point',
              fact_type: 'point',
              qualifiers: { point_code: 'SATURN', sign: 'cancer', house_number: 7, motion: 'direct' },
              confidence: 0.96,
            },
            {
              fact_id: 'g3-f3',
              fact_code: 'venus_saturn_aspect',
              fact_type: 'aspect',
              qualifiers: { point_a_code: 'VENUS', point_b_code: 'SATURN', aspect_type: 'square', orb_deg: 1.9, strength_score: 0.83, exact: false },
              confidence: 0.92,
            },
          ],
        },
      ],
    },
    expected_refs: ['MOON_IN_CAPRICORN', 'SATURN_IN_HOUSE_7', 'VENUS_SQUARE_SATURN'],
    expected_tags: [
      'self.temperament.deep_internalization',
      'relationship.attachment_style.slow_to_trust',
      'relationship.attachment_style.high_selectivity',
    ],
    expected_insights: ['interiority_needs_trust_and_processing_space'],
  },
  {
    case_id: 'crisis_repatterning_cross_system',
    group: 'cross-system',
    description: 'Plutonian western signals plus Ziwei transformation should stabilize the crisis-repatterning path.',
    chart: {
      chart_id: 'golden-004',
      subjects: [{ subject_id: 'subject-004', birth_input: { time_accuracy: 'exact' } }],
      systems: [
        {
          system_code: 'western',
          confidence: { overall: 0.95, houses: 0.93, aspects: 0.93 },
          facts: [
            {
              fact_id: 'g4-f1',
              fact_code: 'pluto_point',
              fact_type: 'point',
              qualifiers: { point_code: 'PLUTO', sign: 'scorpio', house_number: 1, motion: 'direct' },
              confidence: 0.97,
            },
            {
              fact_id: 'g4-f2',
              fact_code: 'moon_pluto_aspect',
              fact_type: 'aspect',
              qualifiers: { point_a_code: 'MOON', point_b_code: 'PLUTO', aspect_type: 'conjunction', orb_deg: 1.1, strength_score: 0.88, exact: false },
              confidence: 0.93,
            },
            {
              fact_id: 'g4-f3',
              fact_code: 'sun_pluto_aspect',
              fact_type: 'aspect',
              qualifiers: { point_a_code: 'SUN', point_b_code: 'PLUTO', aspect_type: 'square', orb_deg: 2.2, strength_score: 0.84, exact: false },
              confidence: 0.92,
            },
          ],
        },
        {
          system_code: 'ziwei',
          confidence: { overall: 0.9 },
          facts: [
            {
              fact_id: 'g4-z1',
              fact_code: 'hua_ji_ref',
              fact_type: 'cross_reference',
              qualifiers: { ref_code: 'ZIWEI_HUA_JI' },
              confidence: 0.89,
            },
          ],
        },
      ],
    },
    expected_refs: ['PLUTO_ANGULAR', 'MOON_CONJUNCTION_PLUTO', 'SUN_SQUARE_PLUTO', 'ZIWEI_HUA_JI'],
    expected_tags: ['purpose.lessons.crisis_repatterning', 'self.growth_pattern.self_reinvention'],
    expected_insights: ['inner_crises_reorganize_identity'],
    expected_cross_system_tags: ['purpose.lessons.crisis_repatterning', 'self.growth_pattern.self_reinvention'],
    strict_expected_refs: [
      'MOON_CONJUNCTION_PLUTO',
      'PLUTO_ANGULAR',
      'PLUTO_DIRECT',
      'PLUTO_IN_HOUSE_1',
      'PLUTO_IN_SCORPIO',
      'SUN_SQUARE_PLUTO',
      'ZIWEI_HUA_JI',
    ],
    strict_expected_tags: [
      'self.shadow.control_through_withdrawal',
      'purpose.lessons.crisis_repatterning',
      'self.growth_pattern.self_reinvention',
      'self.decision_style.strategic_indirection',
      'timing.current_season.consolidation_phase',
    ],
    strict_expected_insights: ['inner_crises_reorganize_identity'],
    strict_expected_cross_system_tags: [
      'self.shadow.control_through_withdrawal',
      'purpose.lessons.crisis_repatterning',
      'self.growth_pattern.self_reinvention',
    ],
  },
  {
    case_id: 'money_volatility_risk',
    group: 'western-only',
    description: 'Volatile second-house signatures should surface risk-boundary insight.',
    chart: {
      chart_id: 'golden-005',
      subjects: [{ subject_id: 'subject-005', birth_input: { time_accuracy: 'exact' } }],
      systems: [
        {
          system_code: 'western',
          confidence: { overall: 0.95, houses: 0.92, aspects: 0.93 },
          facts: [
            {
              fact_id: 'g5-f1',
              fact_code: 'uranus_point',
              fact_type: 'point',
              qualifiers: { point_code: 'URANUS', sign: 'aquarius', house_number: 2, motion: 'direct' },
              confidence: 0.97,
            },
            {
              fact_id: 'g5-f2',
              fact_code: 'venus_uranus_aspect',
              fact_type: 'aspect',
              qualifiers: { point_a_code: 'VENUS', point_b_code: 'URANUS', aspect_type: 'square', orb_deg: 2.0, strength_score: 0.82, exact: false },
              confidence: 0.92,
            },
            {
              fact_id: 'g5-f3',
              fact_code: 'mars_point',
              fact_type: 'point',
              qualifiers: { point_code: 'MARS', sign: 'aries', house_number: 1, motion: 'direct' },
              confidence: 0.96,
            },
          ],
        },
      ],
    },
    expected_refs: ['URANUS_IN_HOUSE_2', 'VENUS_SQUARE_URANUS', 'MARS_IN_ARIES'],
    expected_tags: ['wealth.earning_style.volatile_growth', 'self.temperament.fast_reactivity'],
    expected_insights: ['money_needs_clear_risk_edges'],
    strict_expected_refs: [
      'MARS_ANGULAR',
      'MARS_DIRECT',
      'MARS_IN_ARIES',
      'MARS_IN_HOUSE_1',
      'URANUS_DIRECT',
      'URANUS_IN_AQUARIUS',
      'URANUS_IN_HOUSE_2',
      'VENUS_SQUARE_URANUS',
    ],
    strict_expected_tags: ['self.temperament.fast_reactivity', 'wealth.earning_style.volatile_growth'],
    strict_expected_insights: ['money_needs_clear_risk_edges'],
  },
  {
    case_id: 'timing_visibility_window',
    group: 'ziwei-only',
    description: 'Ziwei-only visibility and leadership signals should trigger the timing opportunity insight.',
    chart: {
      chart_id: 'golden-006',
      subjects: [{ subject_id: 'subject-006', birth_input: { time_accuracy: 'exact' } }],
      systems: [
        {
          system_code: 'ziwei',
          confidence: { overall: 0.9 },
          facts: [
            {
              fact_id: 'g6-z1',
              fact_code: 'visibility_trigger',
              fact_type: 'cross_reference',
              qualifiers: { ref_code: 'ZIWEI_CAREER_MAIN_STAR' },
              confidence: 0.9,
            },
            {
              fact_id: 'g6-z2',
              fact_code: 'leadership_trigger',
              fact_type: 'cross_reference',
              qualifiers: { ref_code: 'ZIWEI_ZI_WEI_IN_CAREER' },
              confidence: 0.9,
            },
          ],
        },
      ],
    },
    expected_refs: ['ZIWEI_CAREER_MAIN_STAR', 'ZIWEI_ZI_WEI_IN_CAREER'],
    expected_tags: ['career.leadership_style.public_leadership', 'timing.upcoming_cycle.visibility_rise'],
    expected_insights: ['current_cycle_favors_structured_visibility'],
    strict_expected_refs: ['ZIWEI_CAREER_MAIN_STAR', 'ZIWEI_ZI_WEI_IN_CAREER'],
    strict_expected_tags: [
      'career.leadership_style.public_leadership',
      'career.strengths.earned_respect',
      'purpose.lessons.delayed_maturation',
      'timing.upcoming_cycle.visibility_rise',
    ],
    strict_expected_insights: ['current_cycle_favors_structured_visibility'],
  },
  {
    case_id: 'timing_consolidation_window',
    group: 'cross-system',
    description: 'Consolidation timing plus earned-respect signatures should produce the consolidation insight.',
    chart: {
      chart_id: 'golden-007',
      subjects: [{ subject_id: 'subject-007', birth_input: { time_accuracy: 'exact' } }],
      systems: [
        {
          system_code: 'western',
          confidence: { overall: 0.95, houses: 0.92, aspects: 0.93 },
          facts: [
            {
              fact_id: 'g7-f1',
              fact_code: 'saturn_point',
              fact_type: 'point',
              qualifiers: { point_code: 'SATURN', sign: 'capricorn', house_number: 10, motion: 'direct' },
              confidence: 0.97,
            },
          ],
        },
        {
          system_code: 'ziwei',
          confidence: { overall: 0.9 },
          facts: [
            {
              fact_id: 'g7-z1',
              fact_code: 'consolidation_trigger',
              fact_type: 'cross_reference',
              qualifiers: { ref_code: 'ZIWEI_HUA_JI' },
              confidence: 0.9,
            },
          ],
        },
      ],
    },
    expected_refs: ['SATURN_IN_HOUSE_10', 'SATURN_ANGULAR', 'ZIWEI_HUA_JI'],
    expected_tags: ['career.strengths.earned_respect', 'timing.current_season.consolidation_phase'],
    expected_insights: ['this_phase_requires_consolidation'],
  },
  {
    case_id: 'reassurance_and_trust_relationship',
    group: 'western-only',
    description: 'Reassurance need plus slow trust should produce the main relationship insight.',
    chart: {
      chart_id: 'golden-008',
      subjects: [{ subject_id: 'subject-008', birth_input: { time_accuracy: 'exact' } }],
      systems: [
        {
          system_code: 'western',
          confidence: { overall: 0.95, houses: 0.93, aspects: 0.93 },
          facts: [
            {
              fact_id: 'g8-f1',
              fact_code: 'moon_point',
              fact_type: 'point',
              qualifiers: { point_code: 'MOON', sign: 'cancer', house_number: 4, motion: 'direct' },
              confidence: 0.97,
            },
            {
              fact_id: 'g8-f2',
              fact_code: 'venus_point',
              fact_type: 'point',
              qualifiers: { point_code: 'VENUS', sign: 'cancer', house_number: 7, motion: 'direct' },
              confidence: 0.97,
            },
            {
              fact_id: 'g8-f3',
              fact_code: 'venus_saturn_aspect',
              fact_type: 'aspect',
              qualifiers: { point_a_code: 'VENUS', point_b_code: 'SATURN', aspect_type: 'square', orb_deg: 1.7, strength_score: 0.84, exact: false },
              confidence: 0.92,
            },
          ],
        },
      ],
    },
    expected_refs: ['MOON_IN_CANCER', 'VENUS_IN_HOUSE_7', 'VENUS_SQUARE_SATURN'],
    expected_tags: ['relationship.attachment_style.reassurance_hunger', 'relationship.attachment_style.slow_to_trust'],
    expected_insights: ['bonds_need_reassurance_but_open_slowly'],
    strict_expected_refs: [
      'MOON_ANGULAR',
      'MOON_DIRECT',
      'MOON_IN_CANCER',
      'MOON_IN_HOUSE_4',
      'VENUS_ANGULAR',
      'VENUS_DIRECT',
      'VENUS_IN_CANCER',
      'VENUS_IN_HOUSE_7',
      'VENUS_SQUARE_SATURN',
    ],
    strict_expected_tags: [
      'relationship.attachment_style.high_selectivity',
      'relationship.attachment_style.reassurance_hunger',
      'relationship.attachment_style.slow_to_trust',
      'relationship.family_patterns.early_responsibility',
    ],
    strict_expected_insights: ['bonds_need_reassurance_but_open_slowly'],
  },
  {
    case_id: 'health_reserves_attention',
    group: 'western-only',
    description: 'Fluctuating reserves should trigger the energy-management risk insight.',
    chart: {
      chart_id: 'golden-009',
      subjects: [{ subject_id: 'subject-009', birth_input: { time_accuracy: 'exact' } }],
      systems: [
        {
          system_code: 'western',
          confidence: { overall: 0.94, houses: 0.92, aspects: 0.92 },
          facts: [
            {
              fact_id: 'g9-f1',
              fact_code: 'neptune_point',
              fact_type: 'point',
              qualifiers: { point_code: 'NEPTUNE', sign: 'pisces', house_number: 1, motion: 'direct' },
              confidence: 0.96,
            },
            {
              fact_id: 'g9-f2',
              fact_code: 'moon_neptune_aspect',
              fact_type: 'aspect',
              qualifiers: { point_a_code: 'MOON', point_b_code: 'NEPTUNE', aspect_type: 'square', orb_deg: 2.0, strength_score: 0.83, exact: false },
              confidence: 0.92,
            },
          ],
        },
      ],
    },
    expected_refs: ['NEPTUNE_ANGULAR', 'MOON_SQUARE_NEPTUNE'],
    expected_tags: ['health.vitality.fluctuating_reserves'],
    expected_insights: ['energy_management_needs_attention'],
    strict_expected_refs: ['MOON_SQUARE_NEPTUNE', 'NEPTUNE_ANGULAR', 'NEPTUNE_DIRECT', 'NEPTUNE_IN_HOUSE_1', 'NEPTUNE_IN_PISCES'],
    strict_expected_tags: ['health.vitality.fluctuating_reserves'],
    strict_expected_insights: ['energy_management_needs_attention'],
  },
];
