import { runInterpretationPipeline } from './index';
import type { ChartResultLike } from './types';

const sampleChart: ChartResultLike = {
  chart_id: 'demo-chart-001',
  subjects: [
    {
      subject_id: 'demo-subject',
      birth_input: {
        time_accuracy: 'exact',
      },
    },
  ],
  systems: [
    {
      system_code: 'western',
      confidence: {
        overall: 0.96,
        houses: 0.93,
        aspects: 0.94,
      },
      facts: [
        {
          fact_id: 'f001',
          fact_code: 'sun_point',
          fact_type: 'point',
          qualifiers: {
            point_code: 'SUN',
            sign: 'leo',
            house_number: 10,
            motion: 'direct',
          },
          confidence: 0.98,
        },
        {
          fact_id: 'f002',
          fact_code: 'saturn_point',
          fact_type: 'point',
          qualifiers: {
            point_code: 'SATURN',
            sign: 'capricorn',
            house_number: 10,
            motion: 'retrograde',
          },
          confidence: 0.97,
        },
        {
          fact_id: 'f003',
          fact_code: 'mercury_point',
          fact_type: 'point',
          qualifiers: {
            point_code: 'MERCURY',
            sign: 'virgo',
            house_number: 9,
            motion: 'direct',
          },
          confidence: 0.97,
        },
        {
          fact_id: 'f004',
          fact_code: 'moon_aspect_saturn',
          fact_type: 'aspect',
          qualifiers: {
            point_a_code: 'MOON',
            point_b_code: 'SATURN',
            aspect_type: 'square',
            orb_deg: 2.1,
            strength_score: 0.84,
            exact: false,
          },
          confidence: 0.91,
        },
        {
          fact_id: 'f005',
          fact_code: 'house_2',
          fact_type: 'house',
          qualifiers: {
            house_number: 2,
            sign: 'taurus',
          },
          confidence: 0.95,
        },
      ],
    },
    {
      system_code: 'ziwei',
      confidence: {
        overall: 0.9,
      },
      facts: [
        {
          fact_id: 'z001',
          fact_code: 'ziwei_ming',
          fact_type: 'palace',
          qualifiers: {
            palace_code: 'MING',
            main_star: 'ZI_WEI',
          },
          confidence: 0.92,
        },
        {
          fact_id: 'z002',
          fact_code: 'guanlu_huaquan',
          fact_type: 'transformation',
          qualifiers: {
            palace_code: 'GUAN_LU',
            transformation_code: 'HUA_QUAN',
          },
          confidence: 0.88,
        },
      ],
    },
  ],
};

const result = runInterpretationPipeline(sampleChart);

console.log(JSON.stringify(result, null, 2));
