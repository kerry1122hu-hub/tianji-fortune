import { generateRefs } from './ref_generation';
import { aggregateInsights } from './insight_aggregation';
import { matchTags } from './tag_matching';
import type { ChartResultLike, InterpretationPipelineResult } from './types';

export * from './types';
export * from './ref_generation';
export * from './tag_matching';
export * from './insight_aggregation';

export function runInterpretationPipeline(chart: ChartResultLike): InterpretationPipelineResult {
  const refs = generateRefs(chart);
  const { semantic_items } = matchTags(refs.refs);
  const { insights, aggregation_version } = aggregateInsights(semantic_items);

  return {
    chart_id: chart.chart_id,
    refs,
    semantic_items,
    insights,
    aggregation_version,
  };
}
