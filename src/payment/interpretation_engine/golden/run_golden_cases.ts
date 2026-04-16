import { runInterpretationPipeline } from '../index';
import { GOLDEN_TEST_CASES_V1 } from './golden_test_cases.v1';
import * as fs from 'fs';
import * as path from 'path';

type DiffResult = {
  missing: string[];
  unexpected: string[];
};

type CaseFailure = {
  case_id: string;
  group: string;
  actual: {
    refs: string[];
    tags: string[];
    insights: string[];
    cross_system_tags: string[];
  };
  failures: Array<{
    label: string;
    diff: DiffResult;
  }>;
};

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function diffValues(expected: string[], actual: string[]): DiffResult {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return {
    missing: uniqueSorted(expected.filter((value) => !actualSet.has(value))),
    unexpected: uniqueSorted(actual.filter((value) => !expectedSet.has(value))),
  };
}

function hasDiff(diff: DiffResult): boolean {
  return diff.missing.length > 0 || diff.unexpected.length > 0;
}

function hasBlockingDiff(diff: DiffResult, isStrict: boolean): boolean {
  return diff.missing.length > 0 || (isStrict && diff.unexpected.length > 0);
}

function formatDiff(diff: DiffResult): string[] {
  const lines: string[] = [];
  if (diff.missing.length) {
    lines.push(`    missing: ${diff.missing.join(', ')}`);
  }
  if (diff.unexpected.length) {
    lines.push(`    unexpected: ${diff.unexpected.join(', ')}`);
  }
  if (!lines.length) {
    lines.push('    no diff');
  }
  return lines;
}

function ensureArtifactsDir(): string {
  const dir = path.resolve(process.cwd(), 'src', 'payment', 'interpretation_engine', 'golden', 'artifacts');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function writeArtifacts(args: {
  isStrict: boolean;
  failures: CaseFailure[];
  grouped: Map<string, { total: number; passed: number; case_ids: string[] }>;
}): string {
  const artifactsDir = ensureArtifactsDir();
  const modeName = args.isStrict ? 'strict' : 'subset';
  const summaryPath = path.join(artifactsDir, `${modeName}-summary.json`);
  const markdownPath = path.join(artifactsDir, `${modeName}-summary.md`);
  const caseDir = path.join(artifactsDir, modeName);
  if (fs.existsSync(caseDir)) {
    fs.rmSync(caseDir, { recursive: true, force: true });
  }
  fs.mkdirSync(caseDir, { recursive: true });
  const payload = {
    mode: modeName,
    generated_at: new Date().toISOString(),
    total_cases: GOLDEN_TEST_CASES_V1.length,
    groups: [...args.grouped.entries()].map(([group, value]) => ({
      group,
      total: value.total,
      passed: value.passed,
      failed: value.total - value.passed,
      case_ids: value.case_ids,
    })),
    failures: args.failures,
  };
  fs.writeFileSync(summaryPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(markdownPath, buildMarkdownSummary(payload), 'utf8');

  for (const failure of args.failures) {
    const casePath = path.join(caseDir, `${failure.case_id}.json`);
    fs.writeFileSync(
      casePath,
      JSON.stringify(
        {
          mode: modeName,
          generated_at: payload.generated_at,
          case_id: failure.case_id,
          group: failure.group,
          actual: failure.actual,
          failures: failure.failures,
        },
        null,
        2,
      ),
      'utf8',
    );
  }

  return summaryPath;
}

function buildMarkdownSummary(payload: {
  mode: string;
  generated_at: string;
  total_cases: number;
  groups: Array<{ group: string; total: number; passed: number; failed: number; case_ids: string[] }>;
  failures: CaseFailure[];
}): string {
  const lines: string[] = [];
  lines.push(`# Golden Summary (${payload.mode})`);
  lines.push('');
  lines.push(`- Generated at: ${payload.generated_at}`);
  lines.push(`- Total cases: ${payload.total_cases}`);
  lines.push(`- Failed cases: ${payload.failures.length}`);
  lines.push('');
  lines.push('## Groups');
  lines.push('');
  for (const group of payload.groups) {
    lines.push(`- ${group.group}: ${group.passed}/${group.total} passed`);
  }

  if (!payload.failures.length) {
    lines.push('');
    lines.push('## Result');
    lines.push('');
    lines.push('All golden cases passed.');
    return `${lines.join('\n')}\n`;
  }

  lines.push('');
  lines.push('## Failures');
  lines.push('');
  for (const failure of payload.failures) {
    lines.push(`### ${failure.case_id} [${failure.group}]`);
    lines.push('');
    for (const entry of failure.failures) {
      lines.push(`- ${entry.label}`);
      if (entry.diff.missing.length) {
        lines.push(`  - missing: ${entry.diff.missing.join(', ')}`);
      }
      if (entry.diff.unexpected.length) {
        lines.push(`  - unexpected: ${entry.diff.unexpected.join(', ')}`);
      }
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function main(): void {
  const isStrict = process.env.GOLDEN_STRICT === '1';
  const failures: CaseFailure[] = [];
  const grouped = new Map<string, { total: number; passed: number; case_ids: string[] }>();

  for (const testCase of GOLDEN_TEST_CASES_V1) {
    const bucket = grouped.get(testCase.group) ?? { total: 0, passed: 0, case_ids: [] };
    bucket.total += 1;
    bucket.case_ids.push(testCase.case_id);
    grouped.set(testCase.group, bucket);

    const result = runInterpretationPipeline(testCase.chart);
    const actualRefs = result.refs.refs.map((ref) => ref.ref_code);
    const actualTags = result.semantic_items.map((item) => item.tag_code);
    const actualInsights = result.insights.map((insight) => insight.insight_code);
    const actualCrossSystemTags = result.semantic_items
      .filter((item) => item.cross_system_agreement)
      .map((item) => item.tag_code);

    const refsDiff = diffValues(testCase.expected_refs, actualRefs);
    const tagsDiff = diffValues(testCase.expected_tags, actualTags);
    const insightsDiff = diffValues(testCase.expected_insights, actualInsights);
    const crossSystemDiff = testCase.expected_cross_system_tags?.length
      ? diffValues(testCase.expected_cross_system_tags, actualCrossSystemTags)
      : null;

    const strictRefsDiff = testCase.strict_expected_refs ? diffValues(testCase.strict_expected_refs, actualRefs) : null;
    const strictTagsDiff = testCase.strict_expected_tags ? diffValues(testCase.strict_expected_tags, actualTags) : null;
    const strictInsightsDiff = testCase.strict_expected_insights
      ? diffValues(testCase.strict_expected_insights, actualInsights)
      : null;
    const strictCrossSystemDiff = testCase.strict_expected_cross_system_tags
      ? diffValues(testCase.strict_expected_cross_system_tags, actualCrossSystemTags)
      : null;

    const caseFailures = [
      { label: 'refs', diff: refsDiff },
      { label: 'tags', diff: tagsDiff },
      { label: 'insights', diff: insightsDiff },
      ...(crossSystemDiff ? [{ label: 'cross_system_tags', diff: crossSystemDiff }] : []),
      ...(isStrict && strictRefsDiff ? [{ label: 'strict_refs', diff: strictRefsDiff }] : []),
      ...(isStrict && strictTagsDiff ? [{ label: 'strict_tags', diff: strictTagsDiff }] : []),
      ...(isStrict && strictInsightsDiff ? [{ label: 'strict_insights', diff: strictInsightsDiff }] : []),
      ...(isStrict && strictCrossSystemDiff ? [{ label: 'strict_cross_system_tags', diff: strictCrossSystemDiff }] : []),
    ].filter((entry) => {
      if (entry.label.startsWith('strict_')) {
        return hasDiff(entry.diff);
      }
      return hasBlockingDiff(entry.diff, false);
    });

    if (caseFailures.length) {
      failures.push({
        case_id: testCase.case_id,
        group: testCase.group,
        actual: {
          refs: uniqueSorted(actualRefs),
          tags: uniqueSorted(actualTags),
          insights: uniqueSorted(actualInsights),
          cross_system_tags: uniqueSorted(actualCrossSystemTags),
        },
        failures: caseFailures,
      });
      continue;
    }

    bucket.passed += 1;
  }

  console.log('Golden case groups:');
  for (const groupName of ['western-only', 'ziwei-only', 'cross-system']) {
    const group = grouped.get(groupName);
    if (!group) {
      continue;
    }
    console.log(`- ${groupName}: ${group.passed}/${group.total} passed (${group.case_ids.join(', ')})`);
  }

  if (failures.length) {
    const artifactPath = writeArtifacts({ isStrict, failures, grouped });
    console.error('\nGolden case failures:');
    for (const failure of failures) {
      console.error(`- ${failure.case_id} [${failure.group}]`);
      for (const entry of failure.failures) {
        console.error(`  ${entry.label}:`);
        for (const line of formatDiff(entry.diff)) {
          console.error(line);
        }
      }
    }
    console.error(`\nArtifacts written to: ${artifactPath}`);
    throw new Error(`Golden cases failed: ${failures.length}/${GOLDEN_TEST_CASES_V1.length}`);
  }

  const artifactPath = writeArtifacts({ isStrict, failures, grouped });
  console.log(`Mode: ${isStrict ? 'strict' : 'subset'}`);
  console.log(`Artifacts written to: ${artifactPath}`);
  console.log(`\nGolden cases passed: ${GOLDEN_TEST_CASES_V1.length}`);
}

main();
