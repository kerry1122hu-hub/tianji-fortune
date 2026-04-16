# Insight Aggregation Rules v1
Version: 1.0.0
Status: Draft
Owner: Interpretation Engine

## 1. Goal

This specification defines how multiple `tag_code` values aggregate into higher-level `Insight` objects.

Goals:

1. insight generation is stable, not prompt improvisation
2. the same tag set under the same version yields the same insight set
3. insights are rankable, confidence-bearing, explainable, and traceable
4. the same aggregation layer can support summary, self, relationship, career, timing, and other render paths

## 2. Standard Flow

`Ref Codes -> Tag Matching -> Tag Scoring -> Insight Aggregation -> Insight Ranking -> Narrative Rendering`

### 2.1 Layer Roles

- `ref_code` = fact
- `tag_code` = semantic atom
- `insight_code` = theme-level interpretation unit
- `section` = user-facing report bucket

## 3. Insight Definition

An `Insight` is a higher-level interpretation object built from one or more tags.

Examples:

- `self_expansion_through_learning`
- `relationships_need_boundaries`
- `career_benefits_from_visibility`
- `structure_stabilizes_growth`

### 3.1 Insight Traits

1. most insights are supported by 2-5 tags
2. one strong tag may trigger a single-tag insight
3. every insight must remain traceable to evidence
4. every insight must have priority and confidence
5. every insight must map to one primary narrative section

## 4. Rule Shape

Suggested normalized rule object:

```json
{
  "insight_code": "relationships_need_boundaries",
  "category": "theme",
  "section": "relationship",
  "priority_base": 7,
  "activation_mode": "all_of_any_group",
  "required_groups": [
    ["relationship.attachment_style.high_selectivity", "relationship.attachment_style.reassurance_hunger"],
    ["relationship.partnership_dynamics.intense_bonding", "self.shadow.control_through_withdrawal"]
  ],
  "optional_tags": [
    "self.temperament.deep_internalization"
  ],
  "negative_tags": [
    "relationship.social_mode.networked_support"
  ],
  "min_score": 0.62,
  "render_hints": {
    "tone": "reflective",
    "avoid_absolutes": true
  }
}
```

## 5. `activation_mode`

### 5.1 `single_tag`

One tag can trigger the insight.

### 5.2 `any_of`

Any one required tag can trigger the insight.

### 5.3 `all_of`

All required tags must be present.

### 5.4 `all_of_any_group`

Any full required group can trigger the insight.

## 6. Score Rules

### 6.1 `tag_score`

```text
tag_score = tag.strength * tag.confidence
```

### 6.2 `insight_raw_score`

```text
insight_raw_score =
sum(required_tag_scores * required_weight)
+ sum(optional_tag_scores * optional_weight)
- sum(negative_tag_scores * negative_weight)
```

Suggested defaults:

- required weight = `1.00`
- optional weight = `0.45`
- negative weight = `0.35`

### 6.3 `insight_activation_score`

```text
insight_activation_score =
insight_raw_score
* coverage_factor
* coherence_factor
* guardrail_factor
```

#### A. `coverage_factor`

- all required tags hit: `1.00`
- any-of hit by one valid path: `0.90`
- full required group hit: `1.00`
- weak edge activation only: `0.75`

#### B. `coherence_factor`

- strongly coherent: `1.00`
- mild internal tension: `0.90`
- stronger contradiction: `0.78 - 0.88`

#### C. `guardrail_factor`

- no guardrail limit: `1.00`
- approximate time: `0.90`
- unknown time but not house-dependent: `0.82`
- unknown time and house/angle-dependent: `0.00`

## 7. Confidence Rules

### 7.1 Formula

```text
insight_confidence =
average(contributing_tag_confidence)
* rule_stability_factor
* evidence_density_factor
```

Suggested parameters:

- `rule_stability_factor = 0.95`

`evidence_density_factor`:

- 1 strong evidence chain: `0.85`
- 2-3 evidence chains: `0.95`
- 4+ evidence chains: `1.00`

### 7.2 Confidence Bands

- high: `>= 0.82`
- medium: `0.68 - 0.81`
- low: `0.55 - 0.67`
- below `0.55`: usually exclude from primary narrative blocks

## 8. Priority Rules

### 8.1 `priority_final`

```text
priority_final =
priority_base
+ intensity_bonus
+ relevance_bonus
- conflict_penalty
```

#### A. `intensity_bonus`

- score `>= 0.85`: `+2`
- score `>= 0.72`: `+1`
- otherwise: `+0`

#### B. `relevance_bonus`

By output mode:

- self/personality reports: self + purpose + spirit `+1`
- relationship reports: relationship `+2`
- career reports: career + wealth `+2`
- timing reports: timing `+2`

#### C. `conflict_penalty`

- obvious section conflict with a stronger insight: `-1` to `-3`

## 9. Conflict Handling

### 9.1 Conflict Types

#### A. Direct tension

Example:

- `relationship.social_mode.networked_support`
- `relationship.attachment_style.high_selectivity`

#### B. Directional tension

Example:

- `self.values.self_definition`
- `self.growth_pattern.self_reinvention`

#### C. Tone tension

Example:

- a strongly encouraging insight
- a warning-oriented shadow insight

### 9.2 Resolution Principles

1. keep facts; do not delete truth for neatness
2. prefer the higher-scoring, better-supported insight
3. allow tension to coexist when close
4. per section, prefer:
   - 1 primary insight
   - 1 supporting insight
   - 1 tension insight at most

### 9.3 Tension-Pair Rule

If two conflicting insights are within `0.08` score difference:

- keep both
- mark `tension_pair = true`
- narrative should use a dual-structure frame rather than a single verdict

## 10. Section Assignment

Each insight must map to one primary section.

Current section set:

- `summary`
- `self`
- `relationship`
- `career`
- `wealth`
- `health`
- `timing`
- `purpose`
- `spirit`

### 10.1 Default Domain Mapping

| tag category | default section |
|---|---|
| `self` | `self` |
| `career` | `career` |
| `relationship` | `relationship` |
| `wealth` | `wealth` |
| `health` | `health` |
| `timing` | `timing` |
| `purpose` | `purpose` |
| `spirit` | `spirit` |

### 10.2 Override

A rule may explicitly override the default section.

## 11. v1 Insight Rule Seed

### 11.1 `self_expansion_through_learning`

```json
{
  "insight_code": "self_expansion_through_learning",
  "category": "theme",
  "section": "self",
  "priority_base": 8,
  "activation_mode": "any_of",
  "required_tags": [
    "self.values.self_definition",
    "self.decision_style.analytic_patterning",
    "self.decision_style.strategic_indirection"
  ],
  "optional_tags": [
    "career.leadership_style.public_leadership",
    "relationship.social_mode.networked_support"
  ],
  "negative_tags": [
    "self.shadow.overresponsibility"
  ],
  "min_score": 0.62
}
```

### 11.2 `self_definition_needs_focus`

```json
{
  "insight_code": "self_definition_needs_focus",
  "category": "theme",
  "section": "self",
  "priority_base": 7,
  "activation_mode": "any_of",
  "required_tags": [
    "self.values.self_definition",
    "purpose.lessons.delayed_maturation"
  ],
  "optional_tags": [
    "career.strengths.earned_respect",
    "wealth.earning_style.accumulative_discipline"
  ],
  "negative_tags": [
    "self.growth_pattern.self_reinvention"
  ],
  "min_score": 0.60
}
```

### 11.3 `emotions_run_deep_but_not_always_visible`

```json
{
  "insight_code": "emotions_run_deep_but_not_always_visible",
  "category": "theme",
  "section": "self",
  "priority_base": 8,
  "activation_mode": "all_of_any_group",
  "required_groups": [
    ["self.temperament.deep_internalization", "relationship.attachment_style.reassurance_hunger"],
    ["self.temperament.deep_internalization", "self.shadow.control_through_withdrawal"]
  ],
  "optional_tags": [
    "relationship.family_patterns.early_responsibility"
  ],
  "negative_tags": [],
  "min_score": 0.64
}
```

### 11.4 `communication_prefers_clarity_and_speed`

```json
{
  "insight_code": "communication_prefers_clarity_and_speed",
  "category": "strength",
  "section": "self",
  "priority_base": 6,
  "activation_mode": "any_of",
  "required_tags": [
    "self.decision_style.analytic_patterning",
    "self.decision_style.dual_track_thinking"
  ],
  "optional_tags": [],
  "negative_tags": [
    "self.decision_style.strategic_indirection"
  ],
  "min_score": 0.58
}
```

### 11.5 `relationships_seek_closeness_but_need_boundaries`

```json
{
  "insight_code": "relationships_seek_closeness_but_need_boundaries",
  "category": "theme",
  "section": "relationship",
  "priority_base": 9,
  "activation_mode": "all_of",
  "required_tags": [
    "relationship.attachment_style.reassurance_hunger",
    "relationship.attachment_style.high_selectivity"
  ],
  "optional_tags": [
    "relationship.attachment_style.slow_to_trust",
    "self.temperament.deep_internalization"
  ],
  "negative_tags": [],
  "min_score": 0.66
}
```

### 11.6 `relationships_can_be_intense_and_transformative`

```json
{
  "insight_code": "relationships_can_be_intense_and_transformative",
  "category": "theme",
  "section": "relationship",
  "priority_base": 8,
  "activation_mode": "any_of",
  "required_tags": [
    "relationship.partnership_dynamics.intense_bonding",
    "self.shadow.control_through_withdrawal"
  ],
  "optional_tags": [
    "relationship.attachment_style.reassurance_hunger",
    "self.temperament.deep_internalization"
  ],
  "negative_tags": [
    "relationship.social_mode.networked_support"
  ],
  "min_score": 0.63
}
```

### 11.7 `security_is_a_key_relationship_need`

```json
{
  "insight_code": "security_is_a_key_relationship_need",
  "category": "theme",
  "section": "relationship",
  "priority_base": 7,
  "activation_mode": "single_tag",
  "required_tags": [
    "relationship.attachment_style.reassurance_hunger"
  ],
  "optional_tags": [
    "relationship.family_patterns.early_responsibility",
    "self.temperament.deep_internalization"
  ],
  "negative_tags": [],
  "min_score": 0.57
}
```

### 11.8 `career_benefits_from_visibility`

```json
{
  "insight_code": "career_benefits_from_visibility",
  "category": "opportunity",
  "section": "career",
  "priority_base": 9,
  "activation_mode": "any_of",
  "required_tags": [
    "career.leadership_style.public_leadership",
    "relationship.social_mode.networked_support"
  ],
  "optional_tags": [
    "self.temperament.magnetic_visibility",
    "self.shadow.overresponsibility"
  ],
  "negative_tags": [],
  "min_score": 0.63
}
```

### 11.9 `career_growth_requires_structure`

```json
{
  "insight_code": "career_growth_requires_structure",
  "category": "theme",
  "section": "career",
  "priority_base": 8,
  "activation_mode": "all_of_any_group",
  "required_groups": [
    ["career.strengths.earned_respect", "purpose.lessons.delayed_maturation"],
    ["career.strengths.earned_respect", "wealth.earning_style.accumulative_discipline"]
  ],
  "optional_tags": [],
  "negative_tags": [
    "self.growth_pattern.self_reinvention"
  ],
  "min_score": 0.64
}
```

### 11.10 `career_path_prefers_specialization`

```json
{
  "insight_code": "career_path_prefers_specialization",
  "category": "opportunity",
  "section": "career",
  "priority_base": 8,
  "activation_mode": "single_tag",
  "required_tags": [
    "career.strengths.specialist_mastery"
  ],
  "optional_tags": [
    "self.decision_style.analytic_patterning",
    "career.strengths.earned_respect"
  ],
  "negative_tags": [],
  "min_score": 0.60
}
```

### 11.11 `wealth_prefers_stability_and_control`

```json
{
  "insight_code": "wealth_prefers_stability_and_control",
  "category": "theme",
  "section": "wealth",
  "priority_base": 7,
  "activation_mode": "single_tag",
  "required_tags": [
    "wealth.earning_style.accumulative_discipline"
  ],
  "optional_tags": [
    "purpose.lessons.delayed_maturation",
    "career.strengths.earned_respect"
  ],
  "negative_tags": [
    "wealth.earning_style.volatile_growth"
  ],
  "min_score": 0.58
}
```

### 11.12 `wealth_needs_risk_boundaries`

```json
{
  "insight_code": "wealth_needs_risk_boundaries",
  "category": "risk",
  "section": "wealth",
  "priority_base": 8,
  "activation_mode": "single_tag",
  "required_tags": [
    "wealth.earning_style.volatile_growth"
  ],
  "optional_tags": [
    "career.leadership_style.public_leadership"
  ],
  "negative_tags": [
    "wealth.earning_style.accumulative_discipline"
  ],
  "min_score": 0.60
}
```

### 11.13 `family_responsibility_shapes_closeness`

```json
{
  "insight_code": "family_responsibility_shapes_closeness",
  "category": "theme",
  "section": "relationship",
  "priority_base": 7,
  "activation_mode": "single_tag",
  "required_tags": [
    "relationship.family_patterns.early_responsibility"
  ],
  "optional_tags": [
    "relationship.attachment_style.reassurance_hunger",
    "self.temperament.deep_internalization"
  ],
  "negative_tags": [],
  "min_score": 0.57
}
```

### 11.14 `growth_comes_from_clearer_structure`

```json
{
  "insight_code": "growth_comes_from_clearer_structure",
  "category": "growth",
  "section": "purpose",
  "priority_base": 9,
  "activation_mode": "single_tag",
  "required_tags": [
    "purpose.lessons.delayed_maturation"
  ],
  "optional_tags": [
    "career.strengths.earned_respect",
    "wealth.earning_style.accumulative_discipline",
    "self.shadow.overresponsibility"
  ],
  "negative_tags": [],
  "min_score": 0.60
}
```

### 11.15 `growth_requires_periodic_repatterning`

```json
{
  "insight_code": "growth_requires_periodic_repatterning",
  "category": "growth",
  "section": "purpose",
  "priority_base": 8,
  "activation_mode": "single_tag",
  "required_tags": [
    "purpose.lessons.crisis_repatterning"
  ],
  "optional_tags": [
    "self.growth_pattern.self_reinvention",
    "self.shadow.control_through_withdrawal"
  ],
  "negative_tags": [],
  "min_score": 0.60
}
```

### 11.16 `this_period_supports_acceleration`

```json
{
  "insight_code": "this_period_supports_acceleration",
  "category": "opportunity",
  "section": "timing",
  "priority_base": 9,
  "activation_mode": "single_tag",
  "required_tags": [
    "timing.upcoming_cycle.visibility_rise"
  ],
  "optional_tags": [
    "career.leadership_style.public_leadership",
    "self.temperament.magnetic_visibility"
  ],
  "negative_tags": [
    "timing.current_season.consolidation_phase"
  ],
  "min_score": 0.62
}
```

### 11.17 `this_period_requires_consolidation`

```json
{
  "insight_code": "this_period_requires_consolidation",
  "category": "theme",
  "section": "timing",
  "priority_base": 9,
  "activation_mode": "single_tag",
  "required_tags": [
    "timing.current_season.consolidation_phase"
  ],
  "optional_tags": [
    "purpose.lessons.delayed_maturation",
    "career.strengths.earned_respect"
  ],
  "negative_tags": [
    "timing.upcoming_cycle.visibility_rise"
  ],
  "min_score": 0.62
}
```

### 11.18 `power_and_control_are_sensitive_themes`

```json
{
  "insight_code": "power_and_control_are_sensitive_themes",
  "category": "risk",
  "section": "self",
  "priority_base": 8,
  "activation_mode": "single_tag",
  "required_tags": [
    "self.shadow.control_through_withdrawal"
  ],
  "optional_tags": [
    "relationship.partnership_dynamics.intense_bonding",
    "self.temperament.deep_internalization"
  ],
  "negative_tags": [],
  "min_score": 0.60
}
```

### 11.19 `external_pressure_can_distort_self_worth`

```json
{
  "insight_code": "external_pressure_can_distort_self_worth",
  "category": "risk",
  "section": "self",
  "priority_base": 7,
  "activation_mode": "single_tag",
  "required_tags": [
    "self.shadow.overresponsibility"
  ],
  "optional_tags": [
    "career.leadership_style.public_leadership",
    "self.temperament.magnetic_visibility"
  ],
  "negative_tags": [],
  "min_score": 0.58
}
```

### 11.20 `inner_life_needs_symbolic_space`

```json
{
  "insight_code": "inner_life_needs_symbolic_space",
  "category": "theme",
  "section": "spirit",
  "priority_base": 7,
  "activation_mode": "single_tag",
  "required_tags": [
    "spirit.symbolic_themes.inner_refinement"
  ],
  "optional_tags": [
    "self.temperament.deep_internalization",
    "purpose.lessons.delayed_maturation"
  ],
  "negative_tags": [],
  "min_score": 0.58
}
```

## 12. Deduplication And Merge

### 12.1 Same-Theme Collision

If two insights are highly overlapping:

- keep the higher-scoring one
- downgrade the lower one to supporting insight if still useful

### 12.2 Supporting Insight Criteria

When:

- score `>= 0.58`
- same section as primary insight
- no hard conflict with primary insight

Then:

- exclude from summary
- allow as secondary card or subsection support

## 13. Output Volume Control

### 13.1 Full Report

- summary: `2-3` insights
- self: `2 primary + 1 supporting`
- relationship: `1-2`
- career: `1-2`
- wealth / health / timing / purpose / spirit: `0-1` each

### 13.2 Preview

- no more than `4` total insights

### 13.3 `chat_seed`

- `3-6` high-confidence insights

## 14. Guardrail Integration

### 14.1 `TIME_UNKNOWN`

Block insights that depend on:

- houses
- ascendant
- midheaven
- palace placement if the configured system mode depends on missing birth-time precision

### 14.2 `HOUSES_UNRELIABLE`

Downgrade related insight confidence by:

- `* 0.70`

### 14.3 `LOW_CONFIDENCE_OUTPUT`

- exclude from summary
- allow retention in internal QA or support facts

## 15. Suggested Interface

### 15.1 Input

- `SemanticInterpretation.items`
- `SemanticInterpretation.guardrails`

### 15.2 Output

```json
{
  "insights": [],
  "ranked_sections": {
    "self": [],
    "relationship": [],
    "career": []
  },
  "summary_candidates": [],
  "aggregation_version": "insight-rules-v1.0.0"
}
```

### 15.3 Suggested Module Layout

```text
interpretation_engine/
  insight_aggregation/
    rules/
      self.py
      relationship.py
      career.py
      wealth.py
      health.py
      purpose.py
      timing.py
      spirit.py
    scoring.py
    conflict_resolution.py
    ranking.py
```

## 16. Why This Structure

1. `ref_code -> tag -> insight` creates a stable three-layer reasoning chain
2. the model becomes an expression layer, not a judgment layer
3. adding tags does not require rewriting all narrative logic
4. the same semantic core can power:
   - Chinese and English
   - premium and lightweight versions
   - app copy and chat copy

## 17. Recommended v1 Delivery

Build the smallest closed loop first:

1. 20-30 auto-generated `ref_code` rules
2. 20-30 `tag_code` seeds
3. 12-20 `insight_code` rules
4. 5 major narrative sections:
   - summary
   - self
   - relationship
   - career
   - purpose

Then expand timing, health, wealth, and spirit once the loop is stable.
