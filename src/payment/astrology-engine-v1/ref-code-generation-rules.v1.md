# Ref Code Auto-Generation Rules v1
Version: 1.0.0
Status: Draft
Owner: Interpretation Engine

## 1. Goal

This specification defines how `ChartResult` turns into stable, repeatable `ref_code` entries for the interpretation layer.

Goals:

1. all interpretation evidence comes from one repeatable fact code system
2. the same chart generates the same `ref_code` set under the same version
3. tag and insight matching read `ref_code`, not raw chart fields
4. derived helper facts can be added without breaking the raw-fact layer

## 2. Standard Flow

`ChartResult -> Fact Extraction -> Ref Code Generation -> Ref Registry -> Tag Matching`

### 2.1 Fact Layers

#### A. Raw Facts

Directly from calculation output:

- point in sign
- point in house
- aspect
- house cusp sign
- motion / retrograde
- derived metrics already emitted by calculation
- ziwei palace, star, transformation, and pattern facts

#### B. Derived Refs

Generated from raw facts:

- `JUPITER_ANGULAR`
- `LEO_EMPHASIS`
- `MC_STRONGLY_ASPECTED`
- `HOUSE_2_CUSP_IN_EARTH_SIGN`
- `ZIWEI_LIFE_PALACE_EMPHASIS`

#### C. Event Refs

Used for transit, return, and progression modes:

- `TRANSIT_JUPITER_TO_ASC`
- `SATURN_RETURN`
- `PROGRESSION_NEW_MOON`

## 3. Output Shape

Each generated ref should conform to one stable object shape:

```json
{
  "ref_code": "SUN_IN_SAGITTARIUS",
  "ref_type": "point_sign",
  "source": "chart_result",
  "weight_hint": 0.82,
  "confidence": 0.96,
  "metadata": {
    "point_code": "SUN",
    "sign": "sagittarius"
  }
}
```

Field meaning:

- `ref_code`: the unique fact code
- `ref_type`: fact family
- `source`: `chart_result | derived | event_rule`
- `weight_hint`: suggested downstream importance, not truth
- `confidence`: confidence of the fact itself
- `metadata`: audit-friendly snapshot of relevant source values

## 4. `ref_type` Enum

Recommended v1 set:

- `point_sign`
- `point_house`
- `point_motion`
- `point_retrograde`
- `point_angularity`
- `angle_sign`
- `house_cusp_sign`
- `house_cusp_element`
- `aspect`
- `derived_metric`
- `emphasis`
- `pattern`
- `dominance`
- `event_trigger`
- `sect`
- `warning_linked`
- `ziwei_palace`
- `ziwei_star_position`
- `ziwei_transformation`

## 5. Raw Fact Generation Rules

### 5.1 Point In Sign

Source:

- `ChartResult.systems[].facts` where a western point has a sign value

Format:

`{POINT_CODE}_IN_{SIGN_UPPER}`

Examples:

- `SUN_IN_SAGITTARIUS`
- `MOON_IN_CAPRICORN`
- `ASC_IN_LIBRA`

Generation condition:

- sign exists

Suggested default weight:

- Sun / Moon / ASC: `0.85`
- Mercury / Venus / Mars: `0.78`
- Jupiter / Saturn: `0.72`
- Uranus / Neptune / Pluto: `0.60`
- others: `0.50`

### 5.2 Point In House

Source:

- point facts with `house_number`

Format:

`{POINT_CODE}_IN_HOUSE_{N}`

Examples:

- `SUN_IN_HOUSE_9`
- `VENUS_IN_HOUSE_7`

Generation condition:

- `house_number` exists
- house confidence meets threshold, default `0.65`

Degrade rules:

- `time_accuracy = unknown`: do not generate
- `time_accuracy = approximate`: generate with `confidence * 0.75`
- `time_accuracy = noon`: default block unless noon-mode is explicitly allowed by the engine

### 5.3 House Cusp In Sign

Source:

- `houses[*].sign`

Format:

`HOUSE_{N}_CUSP_IN_{SIGN_UPPER}`

Examples:

- `HOUSE_1_CUSP_IN_LIBRA`
- `HOUSE_10_CUSP_IN_CANCER`

### 5.4 Motion State

Source:

- point `motion`
- point `retrograde`

Format:

- `{POINT_CODE}_DIRECT`
- `{POINT_CODE}_RETROGRADE`
- `{POINT_CODE}_STATIONARY`

Examples:

- `MERCURY_RETROGRADE`
- `SATURN_DIRECT`

Normalization rule:

- if both `motion` and `retrograde` exist, `motion` wins
- never emit duplicate motion refs for the same point

### 5.5 Aspect

Source:

- aspect facts

Format:

`{POINT_A}_{ASPECT_TYPE_UPPER}_{POINT_B}`

Examples:

- `MOON_SQUARE_SATURN`
- `SUN_TRINE_JUPITER`
- `VENUS_CONJUNCTION_NEPTUNE`

#### 5.5.1 Point Ordering

To avoid duplicates, use one fixed priority:

1. `ASC`
2. `MC`
3. `SUN`
4. `MOON`
5. `MERCURY`
6. `VENUS`
7. `MARS`
8. `JUPITER`
9. `SATURN`
10. `URANUS`
11. `NEPTUNE`
12. `PLUTO`
13. `CHIRON`
14. `TRUE_NODE`
15. `MEAN_NODE`
16. `SOUTH_NODE`
17. `PART_OF_FORTUNE`

Only emit the higher-priority point first.

#### 5.5.2 Aspect Thresholds

Default max orb:

- conjunction: `8`
- opposition: `8`
- trine: `7`
- square: `7`
- sextile: `5`
- quincunx: `3`
- semisextile: `2`
- semisquare: `2`
- sesquiquadrate: `2`
- quintile: `2`
- biquintile: `2`

Important:

- the interpretation layer must not re-decide whether an aspect exists
- it only converts already accepted aspect facts into refs

#### 5.5.3 Aspect Metadata

Attach:

- `orb_deg`
- `strength_score`
- `exact`

### 5.6 Ziwei Palace Facts

Source:

- ziwei palace facts

Format:

`ZIWEI_{PALACE_CODE}_{FACT_NAME}`

Examples:

- `ZIWEI_LIFE_MAIN_STAR`
- `ZIWEI_CAREER_HUA_JI`
- `ZIWEI_FORTUNE_AUXILIARY_STARS`

Attach metadata such as:

- `palace_code`
- `main_star`
- `auxiliary_stars`
- `transformation`

### 5.7 Ziwei Star Placement

Source:

- star placement facts

Format:

`ZIWEI_{STAR_CODE_UPPER}_IN_{PALACE_CODE_UPPER}`

Examples:

- `ZIWEI_ZI_WEI_IN_LIFE`
- `ZIWEI_TIAN_JI_IN_CAREER`
- `ZIWEI_WU_QU_IN_WEALTH`

### 5.8 Ziwei Transformations

Source:

- transformation facts

Format:

`ZIWEI_{PALACE_CODE}_{TRANSFORMATION_CODE_UPPER}`

Examples:

- `ZIWEI_CAREER_HUA_JI`
- `ZIWEI_LIFE_HUA_LU`

## 6. Derived Fact Rules

### 6.1 Angularity

Source:

- point house number
- angular houses: `1, 4, 7, 10`

Format:

`{POINT_CODE}_ANGULAR`

Examples:

- `JUPITER_ANGULAR`
- `SATURN_ANGULAR`
- `PLUTO_ANGULAR`

Conditions:

- house in `1/4/7/10`
- house confidence >= `0.65`

Suggested weight:

- `0.72`

### 6.2 Succedent / Cadent

Optional in v1.

Formats:

- `{POINT_CODE}_SUCCEDENT`
- `{POINT_CODE}_CADENT`

### 6.3 House Cusp Element

Source:

- house cusp sign mapped to element

Element map:

- fire: aries, leo, sagittarius
- earth: taurus, virgo, capricorn
- air: gemini, libra, aquarius
- water: cancer, scorpio, pisces

Format:

`HOUSE_{N}_CUSP_IN_{ELEMENT}_SIGN`

Examples:

- `HOUSE_2_CUSP_IN_EARTH_SIGN`
- `HOUSE_7_CUSP_IN_WATER_SIGN`

### 6.4 Sign Emphasis

Format:

`{SIGN_UPPER}_EMPHASIS`

Examples:

- `LEO_EMPHASIS`
- `SCORPIO_EMPHASIS`

Recommended rules:

Generate when either:

1. the sign contains 3 or more major points from Sun through Saturn
2. at least 2 of Sun / Moon / ASC fall in the same sign

Suggested weights:

- strong generation: `0.82`
- weak generation: `0.65`

### 6.5 MC Strongly Aspected

Format:

`MC_STRONGLY_ASPECTED`

Conditions:

- MC forms major aspects with at least 2 major points
  or
- any one MC major aspect has `strength_score >= 0.80`

Parallel extension:

- `ASC_STRONGLY_ASPECTED`

### 6.6 Dominance Refs

Source:

- derived metrics

Use metric code directly:

- `DOMINANT_PLANET`
- `DOMINANT_ELEMENT`
- `DOMINANT_MODALITY`

Example metadata:

```json
{
  "ref_code": "DOMINANT_PLANET",
  "ref_type": "dominance",
  "metadata": {
    "value": "SATURN"
  }
}
```

### 6.7 Sect Refs

Source:

- `SECT_DAY_CHART`
- `SECT_NIGHT_CHART`

Rules:

- convert metric directly into a ref
- retain only one of the pair

### 6.8 Pattern Refs

Source:

- chart pattern recognition output

Format:

`PATTERN_{NAME}`

Examples:

- `PATTERN_STELLIUM`
- `PATTERN_BOWL`
- `PATTERN_T_SQUARE`

Recommended v1 priority:

- `stellium`
- `bowl`
- `bucket`
- `locomotive`
- `seesaw`
- `t_square`

## 7. Event Fact Rules

### 7.1 Transit Refs

Format:

`TRANSIT_{TRANSIT_POINT}_TO_{TARGET_POINT}`

Examples:

- `TRANSIT_JUPITER_TO_ASC`
- `TRANSIT_SATURN_TO_MC`
- `TRANSIT_URANUS_TO_SUN`

Default conditions:

- transit point forms a major aspect to the natal target point
- event thresholds pass

Metadata should include:

- `aspect_type`
- `orb_deg`

### 7.2 Saturn Return

Format:

- `SATURN_RETURN`

Condition:

- transit Saturn conjunct natal Saturn
- `orb <= 3.0`

Optional future detail:

- `SATURN_RETURN_APPLYING`
- `SATURN_RETURN_EXACT`
- `SATURN_RETURN_SEPARATING`

v1 should emit only:

- `SATURN_RETURN`

### 7.3 Progression Refs

Examples:

- `PROGRESSION_NEW_MOON`
- `PROGRESSION_SUN_TO_ASC`
- `PROGRESSION_MOON_TO_MC`

v1 should keep this narrow and high-value.

### 7.4 Solar Return Refs

Examples:

- `SOLAR_RETURN_ANGULAR_SUN`
- `SOLAR_RETURN_SATURN_ANGULAR`
- `SOLAR_RETURN_JUPITER_10TH`

Rule:

- keep annual-theme refs separate from natal-default matching

## 8. Confidence Formula

Every `ref_code` should have its own `confidence`.

### 8.1 Formula

```text
ref_confidence =
base_fact_confidence
* source_confidence
* time_accuracy_factor
* derivation_factor
```

Suggested parameters:

#### A. `base_fact_confidence`

- point in sign: `0.98`
- aspect: use `ChartResult.confidence.aspects`, fallback `0.92`
- house-based fact: use `ChartResult.confidence.houses`, fallback `0.90`
- derived metric: use metric confidence if present
- ziwei palace/star fact: use system confidence, fallback `0.92`

#### B. `source_confidence`

- raw fact: `1.00`
- derived fact: `0.92`
- event fact: `0.90`

#### C. `time_accuracy_factor`

- exact: `1.00`
- approximate: `0.82`
- noon: `0.60`
- unknown: `0.35`

If the ref depends on houses or angles and `time_accuracy` is too weak, block rather than dilute.

#### D. `derivation_factor`

- direct mapping: `1.00`
- simple derived rule: `0.95`
- complex aggregation: `0.85`

## 9. `weight_hint` Guidance

`weight_hint` helps downstream ranking. It is not truth.

Suggested ranges:

- core personality points: `0.80 - 0.90`
- key aspects: `0.75 - 0.88`
- derived helper facts: `0.60 - 0.78`
- event triggers: `0.68 - 0.85`

Suggested defaults by `ref_type`:

| ref_type | default weight_hint |
|---|---:|
| point_sign | 0.76 |
| point_house | 0.78 |
| aspect | 0.82 |
| point_angularity | 0.74 |
| house_cusp_sign | 0.62 |
| house_cusp_element | 0.58 |
| emphasis | 0.66 |
| dominance | 0.70 |
| pattern | 0.72 |
| event_trigger | 0.80 |
| ziwei_palace | 0.76 |
| ziwei_star_position | 0.79 |
| ziwei_transformation | 0.81 |

## 10. Deduplication

### 10.1 Exact Duplicate

Keep only one entry per identical `ref_code`.

### 10.2 Mutually Exclusive Pairs

Examples:

- `SECT_DAY_CHART`
- `SECT_NIGHT_CHART`

Only one survives.

### 10.3 Derived Does Not Replace Raw

Do not collapse:

- `JUPITER_IN_HOUSE_10`
- `JUPITER_ANGULAR`

Both remain because they express different granularity.

## 11. Blocking Rules

### 11.1 Unknown Time

Block:

- all `*_IN_HOUSE_*`
- all `*_ANGULAR`
- all `HOUSE_*_CUSP_*`
- all ASC / MC dependent event refs

### 11.2 Low Confidence

If the relevant source confidence is below `0.60`:

- do not generate the ref

v1 recommendation:

- block below `0.60` rather than emit low-grade noise

## 12. Suggested Interface

### 12.1 Input

- `ChartResult`

### 12.2 Output

```json
{
  "chart_id": "uuid",
  "ref_version": "ref-rules-v1.0.0",
  "refs": [],
  "warnings": []
}
```

### 12.3 Suggested Module Layout

```text
interpretation_engine/
  ref_generation/
    point_sign.py
    point_house.py
    aspects.py
    derived_refs.py
    event_refs.py
    ziwei_refs.py
    confidence.py
    registry.py
```

## 13. v1 Delivery Priority

### P0

1. point in sign
2. point in house
3. aspects
4. house cusp in sign
5. `{POINT}_ANGULAR`
6. `HOUSE_{N}_CUSP_IN_{ELEMENT}_SIGN`
7. `ZIWEI_{PALACE}_MAIN_STAR`
8. `ZIWEI_{STAR}_IN_{PALACE}`

### P1

1. `{SIGN}_EMPHASIS`
2. `MC_STRONGLY_ASPECTED`
3. pattern refs
4. dominance refs
5. transformation refs

### P2

1. transit refs
2. solar return refs
3. progression refs

## 14. Example

Input facts:

- Sun in Sagittarius
- Sun in House 9
- Moon square Saturn
- Jupiter in House 10
- House 2 cusp in Taurus
- time accuracy exact

Output refs:

- `SUN_IN_SAGITTARIUS`
- `SUN_IN_HOUSE_9`
- `MOON_SQUARE_SATURN`
- `JUPITER_IN_HOUSE_10`
- `JUPITER_ANGULAR`
- `HOUSE_2_CUSP_IN_TAURUS`
- `HOUSE_2_CUSP_IN_EARTH_SIGN`
