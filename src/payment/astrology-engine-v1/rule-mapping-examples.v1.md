# Rule Mapping Examples v1
Version: 0.1.0
Status: Draft
Owner: Core Platform

## 1. Goal

This document shows how raw chart facts map into semantic items.

It exists to make one thing unambiguous:

- chart engine emits facts
- rule engine emits signals and semantic items
- narrative engine renders only from semantic items

The examples below use:

- one western-only mapping
- one ziwei-only mapping
- one cross-system agreement mapping
- one cross-system tension mapping

All examples are illustrative v1 patterns, not canonical doctrine.

## 2. Mapping Template

Each rule should be implementable in this shape:

1. Read structured facts from one or more systems.
2. Detect a system-specific signal.
3. Map that signal to one shared `tag_code`.
4. Attach provenance with fact references and rule reference.
5. Emit confidence and polarity.

Suggested internal rule object shape:

```json
{
  "rule_ref": "rule_western_career_0_1_0_001",
  "input_fact_refs": ["fact_western_saturn_mc_001", "fact_western_house_10_001"],
  "signal_code": "western.aspect.saturn_mc_concentration",
  "output_tag_code": "career.authority.earned_respect",
  "polarity": "supportive",
  "strength_formula": "weighted_sum",
  "confidence_formula": "min(input_confidence) * rule_confidence"
}
```

## 3. Example A: Western Only

Goal:

- map a western career signature into a shared semantic tag

Example source facts:

```json
[
  {
    "fact_id": "fact_western_saturn_house_10_001",
    "fact_code": "western.point.saturn.house",
    "fact_type": "point",
    "value": 10
  },
  {
    "fact_id": "fact_western_saturn_mc_trine_001",
    "fact_code": "western.aspect.saturn_mc.trine",
    "fact_type": "aspect",
    "value": {
      "orb_deg": 1.2,
      "strength_score": 0.88
    }
  }
]
```

Derived signal:

```json
{
  "signal_code": "western.aspect.saturn_mc_concentration",
  "rule_ref": "rule_western_career_0_1_0_001"
}
```

Semantic output:

```json
{
  "item_id": "sem_001",
  "tag_code": "career.authority.earned_respect",
  "category": "career",
  "strength": 0.82,
  "polarity": "supportive",
  "confidence": 0.9,
  "themes": ["career", "authority", "discipline"],
  "cross_system_agreement": false,
  "cross_system_conflict": false,
  "provenance": [
    {
      "system": "western",
      "signal_code": "western.aspect.saturn_mc_concentration",
      "fact_refs": [
        "fact_western_saturn_house_10_001",
        "fact_western_saturn_mc_trine_001"
      ],
      "rule_ref": "rule_western_career_0_1_0_001",
      "contribution_weight": 1.0
    }
  ]
}
```

Interpretation note:

- the semantic item does not mention Saturn or MC in the tag itself
- that information stays in provenance

## 4. Example B: Ziwei Only

Goal:

- map a ziwei life-palace leadership signature into a shared semantic tag

Example source facts:

```json
[
  {
    "fact_id": "fact_ziwei_life_palace_main_star_001",
    "fact_code": "ziwei.palace.life.main_star",
    "fact_type": "palace",
    "value": "zi_wei"
  },
  {
    "fact_id": "fact_ziwei_life_palace_assistants_001",
    "fact_code": "ziwei.palace.life.auxiliary_stars",
    "fact_type": "auxiliary_star",
    "value": ["zuo_fu", "you_bi"]
  }
]
```

Derived signal:

```json
{
  "signal_code": "ziwei.palace.life_palace_zi_wei_presence",
  "rule_ref": "rule_ziwei_identity_0_1_0_001"
}
```

Semantic output:

```json
{
  "item_id": "sem_014",
  "tag_code": "identity.presence.magnetic_visibility",
  "category": "identity",
  "strength": 0.8,
  "polarity": "supportive",
  "confidence": 0.86,
  "themes": ["identity", "presence", "visibility"],
  "cross_system_agreement": false,
  "cross_system_conflict": false,
  "provenance": [
    {
      "system": "ziwei",
      "signal_code": "ziwei.palace.life_palace_zi_wei_presence",
      "fact_refs": [
        "fact_ziwei_life_palace_main_star_001",
        "fact_ziwei_life_palace_assistants_001"
      ],
      "rule_ref": "rule_ziwei_identity_0_1_0_001",
      "contribution_weight": 1.0
    }
  ]
}
```

Interpretation note:

- different schools may explain this differently in prose
- they can still share one stable semantic tag

## 5. Example C: Cross-System Agreement

Goal:

- both western and ziwei independently support the same growth arc

Western facts:

```json
[
  {
    "fact_id": "fact_western_saturn_angular_001",
    "fact_code": "western.point.saturn.angularity",
    "fact_type": "point",
    "value": true
  }
]
```

Ziwei facts:

```json
[
  {
    "fact_id": "fact_ziwei_career_palace_main_star_001",
    "fact_code": "ziwei.palace.career.main_star",
    "fact_type": "palace",
    "value": "wu_qu"
  },
  {
    "fact_id": "fact_ziwei_fortune_palace_structure_001",
    "fact_code": "ziwei.palace.fortune.structure_bias",
    "fact_type": "pattern",
    "value": "long_arc_building"
  }
]
```

Semantic output:

```json
{
  "item_id": "sem_031",
  "tag_code": "growth.path.delayed_maturation",
  "category": "growth",
  "strength": 0.87,
  "polarity": "neutral_positive",
  "confidence": 0.93,
  "themes": ["growth", "timing", "maturity"],
  "cross_system_agreement": true,
  "cross_system_conflict": false,
  "provenance": [
    {
      "system": "western",
      "signal_code": "western.lifecycle.saturnian_maturation",
      "fact_refs": ["fact_western_saturn_angular_001"],
      "rule_ref": "rule_western_growth_0_1_0_002",
      "contribution_weight": 0.46
    },
    {
      "system": "ziwei",
      "signal_code": "ziwei.cycle.long_arc_refinement",
      "fact_refs": [
        "fact_ziwei_career_palace_main_star_001",
        "fact_ziwei_fortune_palace_structure_001"
      ],
      "rule_ref": "rule_ziwei_growth_0_1_0_003",
      "contribution_weight": 0.54
    }
  ]
}
```

Narrative implication:

- report can say the conclusion is reinforced across two systems
- report must still avoid overclaiming if upstream confidence is low

## 6. Example D: Cross-System Tension

Goal:

- western favors public assertion while ziwei suggests cautious pacing

Western facts:

```json
[
  {
    "fact_id": "fact_western_sun_mc_001",
    "fact_code": "western.aspect.sun_mc.conjunction",
    "fact_type": "aspect",
    "value": {
      "orb_deg": 0.8,
      "strength_score": 0.94
    }
  }
]
```

Ziwei facts:

```json
[
  {
    "fact_id": "fact_ziwei_career_hua_ji_001",
    "fact_code": "ziwei.palace.career.transformation",
    "fact_type": "transformation",
    "value": "hua_ji"
  }
]
```

Semantic outputs:

```json
[
  {
    "item_id": "sem_044",
    "tag_code": "career.style.public_leadership",
    "category": "career",
    "strength": 0.79,
    "polarity": "supportive",
    "confidence": 0.85,
    "themes": ["career", "visibility", "leadership"],
    "cross_system_agreement": false,
    "cross_system_conflict": true,
    "provenance": [
      {
        "system": "western",
        "signal_code": "western.solar_visibility.public_leadership",
        "fact_refs": ["fact_western_sun_mc_001"],
        "rule_ref": "rule_western_career_0_1_0_005",
        "contribution_weight": 1.0
      }
    ]
  },
  {
    "item_id": "sem_045",
    "tag_code": "timing.window.consolidation_phase",
    "category": "timing",
    "strength": 0.74,
    "polarity": "neutral",
    "confidence": 0.83,
    "themes": ["timing", "career", "consolidation"],
    "cross_system_agreement": false,
    "cross_system_conflict": true,
    "provenance": [
      {
        "system": "ziwei",
        "signal_code": "ziwei.transform.hua_ji_on_career_axis",
        "fact_refs": ["fact_ziwei_career_hua_ji_001"],
        "rule_ref": "rule_ziwei_timing_0_1_0_002",
        "contribution_weight": 1.0
      }
    ]
  }
]
```

Interpretation rule:

- conflict does not mean one system is wrong
- conflict means narrative should frame timing, conditions, or tradeoffs carefully

## 7. Guardrail Example

If birth time is unknown:

- western house and angle based rules should be blocked or down-weighted
- ziwei rules that depend on palace placement precision should also respect the same upstream uncertainty policy if applicable to the chosen calculation mode

Example semantic guardrail:

```json
{
  "code": "TIME_ACCURACY_LIMIT",
  "severity": "warning",
  "message": "Birth time uncertainty reduces confidence for house, angle, and palace-specific claims.",
  "affected_scopes": ["houses", "angles", "timing", "overall"]
}
```

## 8. Implementation Notes

Use these conventions when coding rules:

1. One rule should emit one primary semantic item.
2. A semantic item may have multiple provenance entries.
3. Cross-system synthesis happens after per-system signal extraction.
4. Keep school-specific nuance in signal code and rule ref, not in tag code.
5. Narrative templates should branch on:
   - `cross_system_agreement`
   - `cross_system_conflict`
   - `polarity`
   - `confidence`
   - `themes`

## 9. Next Step

After this file, the most useful implementation artifact is:

- `rule-pack.v1.json` or equivalent code module

That artifact should define:

- rule matching conditions
- score weights
- confidence math
- emitted tags
- blocked conditions
