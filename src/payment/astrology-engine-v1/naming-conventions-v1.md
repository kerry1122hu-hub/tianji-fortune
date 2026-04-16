# Naming Conventions v1
Version: 1.0.0
Status: Draft
Owner: Core Platform

## 1. Goal

This specification unifies naming, enums, references, and version labels across:

- calculation layer
- semantic layer
- narrative layer
- persistence
- tests
- frontend label mappers

The intent is simple:

1. identifiers stay stable after launch
2. evidence chains remain traceable
3. old data survives new rules
4. backend and rules engine speak one language

## 2. General Naming Principles

### 2.1 Core Rules

1. Machine identifiers prioritize stability over prettiness.
2. Once an enum is live, do not rename it casually.
3. Display copy is separate from internal codes.
4. Similar fields must follow the same naming style.
5. Enumerate whenever possible; use free text only when the space is genuinely open.

### 2.2 Case Rules

| Type | Rule | Example |
|---|---|---|
| JSON field names | `snake_case` | `chart_id`, `house_number` |
| enum codes for facts and warnings | `UPPER_SNAKE_CASE` | `SUN`, `TIME_UNKNOWN` |
| system enums and low-level value enums | `snake_case` | `western`, `whole_sign`, `retrograde` |
| semantic tags | `dot.namespace_style` | `career.trajectory.late_bloomer` |
| insight codes | `lower_snake_case` | `career_needs_public_visibility` |
| markdown and schema filenames | `kebab-case` | `chart-result.schema.json` |
| version labels | `name@semver` or `name-vsemver` | `western-core@0.1.0`, `semantic-map-v1.0.0` |

### 2.3 Prohibited Patterns

Do not:

1. mix languages in one identifier: `sun_in_9宫`
2. use spaces: `sun in sagittarius`
3. put UI copy in machine codes: `YOU_ARE_A_BORN_LEADER`
4. encode probability words inside codes: `POSSIBLY_EMOTIONAL`
5. mix package or pricing concepts into core identifiers: `VIP_RELATIONSHIP_TAG`

## 3. Core Code Families

### 3.1 `system_code`

Allowed values in v1:

- `western`
- `ziwei`

### 3.2 `chart_type`

Shared chart enum:

- `natal`
- `transit`
- `synastry`
- `composite`
- `solar_return`
- `lunar_return`
- `secondary_progression`

### 3.3 `point_code`

Represents western bodies or sensitive points.

Rules:

- uppercase English
- one concept per code
- do not combine sign, house, or aspect into the point code itself

v1 enum:

- `SUN`
- `MOON`
- `MERCURY`
- `VENUS`
- `MARS`
- `JUPITER`
- `SATURN`
- `URANUS`
- `NEPTUNE`
- `PLUTO`
- `CHIRON`
- `TRUE_NODE`
- `MEAN_NODE`
- `SOUTH_NODE`
- `ASC`
- `DSC`
- `MC`
- `IC`
- `PART_OF_FORTUNE`

### 3.4 `point_type`

- `planet`
- `angle`
- `node`
- `asteroid`
- `arabic_part`
- `hypothetical`

### 3.5 `sign_code`

Use lowercase English:

- `aries`
- `taurus`
- `gemini`
- `cancer`
- `leo`
- `virgo`
- `libra`
- `scorpio`
- `sagittarius`
- `capricorn`
- `aquarius`
- `pisces`

### 3.6 `house_number`

Rules:

- integer `1` through `12`
- do not use `HOUSE_1` as the primary stored value
- derived references may still render `HOUSE_1`

### 3.7 `aspect_type`

Lowercase enum:

- `conjunction`
- `sextile`
- `square`
- `trine`
- `opposition`
- `quincunx`
- `semisextile`
- `semisquare`
- `sesquiquadrate`
- `quintile`
- `biquintile`

### 3.8 `house_system`

- `placidus`
- `whole_sign`
- `koch`
- `equal`
- `porphyry`
- `regiomontanus`
- `campanus`
- `morinus`

### 3.9 `motion`

- `direct`
- `retrograde`
- `stationary`

### 3.10 `time_accuracy`

- `exact`
- `approximate`
- `noon`
- `unknown`

### 3.11 `fact_type`

Current chart fact types:

- `point`
- `house`
- `aspect`
- `derived_metric`
- `palace`
- `star`
- `transformation`
- `auxiliary_star`
- `pattern`
- `cross_reference`

## 4. Ziwei-Specific Enums

### 4.1 `ziwei_palace_code`

- `life`
- `siblings`
- `spouse`
- `children`
- `wealth`
- `health`
- `travel`
- `friends`
- `career`
- `property`
- `fortune`
- `parents`

### 4.2 `ziwei_star_code`

Core major stars:

- `zi_wei`
- `tian_ji`
- `tai_yang`
- `wu_qu`
- `tian_tong`
- `lian_zhen`
- `tian_fu`
- `tai_yin`
- `tan_lang`
- `ju_men`
- `tian_xiang`
- `tian_liang`
- `qi_sha`
- `po_jun`

Starter auxiliary stars:

- `zuo_fu`
- `you_bi`
- `wen_chang`
- `wen_qu`
- `lu_cun`
- `qing_yang`
- `tuo_luo`
- `huo_xing`
- `ling_xing`
- `tian_kui`
- `tian_yue`
- `di_kong`
- `di_jie`

### 4.3 `ziwei_transformation_code`

- `hua_lu`
- `hua_quan`
- `hua_ke`
- `hua_ji`

## 5. Metric Code Rules

Use `UPPER_SNAKE_CASE`.

Rules:

- category first, meaning second
- one metric code should express one fact
- prefer multiple small metrics over one overloaded metric

Recommended v1 set:

### Elements

- `ELEMENT_FIRE_SCORE`
- `ELEMENT_EARTH_SCORE`
- `ELEMENT_AIR_SCORE`
- `ELEMENT_WATER_SCORE`

### Modalities

- `MODALITY_CARDINAL_SCORE`
- `MODALITY_FIXED_SCORE`
- `MODALITY_MUTABLE_SCORE`

### Hemispheres / Quadrants

- `HEMISPHERE_NORTH_SCORE`
- `HEMISPHERE_SOUTH_SCORE`
- `HEMISPHERE_EAST_SCORE`
- `HEMISPHERE_WEST_SCORE`
- `QUADRANT_1_SCORE`
- `QUADRANT_2_SCORE`
- `QUADRANT_3_SCORE`
- `QUADRANT_4_SCORE`

### House emphasis

- `ANGULAR_HOUSE_SCORE`
- `SUCCEDENT_HOUSE_SCORE`
- `CADENT_HOUSE_SCORE`

### Sect

- `SECT_DAY_CHART`
- `SECT_NIGHT_CHART`

### Chart patterns

- `CHART_PATTERN_BUNDLE`
- `CHART_PATTERN_BOWL`
- `CHART_PATTERN_BUCKET`
- `CHART_PATTERN_LOCOMOTIVE`
- `CHART_PATTERN_SPLASH`
- `CHART_PATTERN_SEESAW`

### Concentration / isolation

- `STELLIUM_PRESENT`
- `SINGLETON_PRESENT`

### Dominants

- `DOMINANT_ELEMENT`
- `DOMINANT_MODALITY`
- `DOMINANT_PLANET`
- `DOMINANT_HEMISPHERE`

## 6. `ref_code` Rules

`ref_code` is the backbone of traceable evidence.

### 6.1 Principles

1. A `ref_code` should make the fact type obvious at a glance.
2. `ref_code` points to fact-layer evidence, not narrative language.
3. The same fact may support multiple tags.

### 6.2 Patterns

#### A. Point in sign

`{POINT_CODE}_IN_{SIGN_CODE_UPPER}`

Examples:

- `SUN_IN_SAGITTARIUS`
- `MOON_IN_CAPRICORN`
- `ASC_IN_LIBRA`

#### B. Point in house

`{POINT_CODE}_IN_HOUSE_{N}`

Examples:

- `SUN_IN_HOUSE_9`
- `MOON_IN_HOUSE_4`
- `VENUS_IN_HOUSE_7`

#### C. Aspect

`{POINT_A}_{ASPECT_TYPE_UPPER}_{POINT_B}`

Examples:

- `SUN_TRINE_JUPITER`
- `MOON_SQUARE_SATURN`
- `VENUS_CONJUNCTION_MARS`

Ordering rule:

- use one stable priority order
- never emit both `A_B` and `B_A` for the same fact

Recommended priority:

`ASC/MC -> SUN -> MOON -> MERCURY -> VENUS -> MARS -> JUPITER -> SATURN -> URANUS -> NEPTUNE -> PLUTO -> CHIRON -> NODE`

#### D. House cusp in sign

`HOUSE_{N}_CUSP_IN_{SIGN_CODE_UPPER}`

Examples:

- `HOUSE_1_CUSP_IN_LIBRA`
- `HOUSE_10_CUSP_IN_CANCER`

#### E. Derived metric

Use `metric_code` directly.

Examples:

- `ELEMENT_FIRE_SCORE`
- `DOMINANT_PLANET`

#### F. Pattern fact

`PATTERN_{PATTERN_NAME}`

Examples:

- `PATTERN_STELLIUM`
- `PATTERN_BOWL`
- `PATTERN_T_SQUARE`

#### G. Ziwei palace fact

`ZIWEI_{PALACE_CODE}_{FACT_NAME}`

Examples:

- `ZIWEI_LIFE_MAIN_STAR`
- `ZIWEI_CAREER_HUA_JI`
- `ZIWEI_FORTUNE_AUXILIARY_STARS`

#### H. Ziwei star placement

`ZIWEI_{STAR_CODE_UPPER}_IN_{PALACE_CODE_UPPER}`

Examples:

- `ZIWEI_ZI_WEI_IN_LIFE`
- `ZIWEI_TIAN_JI_IN_CAREER`

## 7. `evidence_id` Rules

Internal evidence ids should be opaque.

Recommended format:

- `ev_{short_uuid}`

Examples:

- `ev_a81f0c`
- `ev_c3b971`

Rules:

1. `evidence_id` carries no business meaning
2. `ref_code` carries the semantics
3. `evidence_id` is unique only within one interpretation artifact

## 8. Semantic Naming

### 8.1 `tag_code`

Use the shared taxonomy:

- `domain.subdomain.specific`

Rules:

1. one tag expresses one interpretable meaning
2. tags stay system-neutral
3. tags should survive language and persona changes
4. use tendency/theme/tension/drive framing rather than verdict framing

Good:

- `self.values.self_definition`
- `career.trajectory.late_bloomer`
- `relationship.attachment_style.slow_to_trust`

Bad:

- `you_are_destined_to_be_famous`
- `western.saturn.delay`
- `ziwei.life_palace.strong`

### 8.2 `category`

The semantic top-level domains are:

- `self`
- `career`
- `relationship`
- `wealth`
- `health`
- `timing`
- `purpose`
- `spirit`

### 8.3 `polarity`

- `supportive`
- `challenging`
- `mixed`
- `neutral`
- `neutral_positive`
- `neutral_negative`

## 9. `insight_code` Rules

`insight_code` aggregates one or more tags into a higher-level interpretation unit.

Format:

- `lower_snake_case`

Examples:

- `self_expression_is_growth_path`
- `relationships_need_boundaries`
- `career_needs_public_visibility`

Rules:

1. insight codes may read more like structured conclusions than tags
2. they are still not user-facing copy
3. one insight should usually reference 2-5 tags

## 10. Warning And Guardrail Codes

Use `UPPER_SNAKE_CASE`.

Suggested v1 set:

### Input / precision

- `TIME_UNKNOWN`
- `TIME_APPROXIMATE`
- `TIME_NOON_ASSUMED`
- `TIMEZONE_INFERRED`
- `LOCATION_GEOCODE_FALLBACK`

### Calculation / output limits

- `HOUSES_UNRELIABLE`
- `ANGLES_UNRELIABLE`
- `TIMING_LIMITED`
- `RELATIONSHIP_OVERCLAIM_BLOCKED`
- `CAREER_OVERCLAIM_BLOCKED`
- `WEALTH_OVERCLAIM_BLOCKED`
- `HEALTH_OVERCLAIM_BLOCKED`

### System

- `ENGINE_PARTIAL_RESULT`
- `UNSUPPORTED_CONFIGURATION`
- `LOW_CONFIDENCE_OUTPUT`

## 11. Version Label Rules

### 11.1 Service version

Format:

`{service-name}-v{major}.{minor}.{patch}`

Examples:

- `astro-engine-v1.0.0`
- `semantic-map-v1.0.0`
- `narrative-engine-v1.0.0`

### 11.2 Ruleset version

Format:

`{domain}-rules-v{major}.{minor}.{patch}` or `{name}@{semver}`

Examples:

- `natal-rules-v1.0.0`
- `western-core@0.1.0`
- `ziwei-core@0.1.0`

### 11.3 Persona / style version

Format:

`{persona_or_style}-v{major}.{minor}.{patch}`

Examples:

- `cn_premium_v1-v1.0.0`
- `mingme_mentor-v1.0.0`

## 12. Localization Separation

Codes must never be shown directly to users.

Every displayable code should go through a label mapper.

Example:

```json
{
  "point_code": "SUN",
  "display": {
    "zh-CN": "太阳",
    "en-US": "Sun"
  }
}
```

The same rule applies to:

- signs
- aspect types
- house systems
- tag codes
- warning codes
- ziwei star names

## 13. Suggested Build Order

Recommended engineering order:

1. `constants/point_codes.*`
2. `constants/aspect_types.*`
3. `constants/metric_codes.*`
4. `constants/warning_codes.*`
5. `constants/tag_codes.*`
6. `mappers/display_labels/*.json`
7. `mappers/ref_code_builders.*`

## 14. Freeze Strategy

Before v1 launch, freeze:

1. `system_code`
2. `chart_type`
3. `point_code`
4. `aspect_type`
5. `house_system`
6. `time_accuracy`
7. `metric_code`
8. `warning_code`
9. `ziwei_palace_code`
10. `ziwei_star_code`
11. `ziwei_transformation_code`
12. first production `tag_code` set

After freeze:

- addition is allowed
- deletion is not allowed casually
- renaming is not allowed casually
- deprecated items must be marked, not silently removed

## 15. Deprecation Strategy

When an identifier must change:

1. add the new identifier
2. mark the old one `deprecated: true`
3. add a compatibility mapping
4. remove only in a future major version

## 16. Immediate Outputs From This Spec

This spec should directly feed:

- constants modules
- ref-code generators
- display label mappers
- semantic seed dictionaries
- migration maps
