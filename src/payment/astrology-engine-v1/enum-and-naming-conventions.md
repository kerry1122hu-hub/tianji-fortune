# Enum And Naming Conventions v1
Version: 0.1.0
Status: Draft
Owner: Core Platform

## 1. Goal

This document freezes the naming and enum strategy for v1 of the engine.

Scope:

- western astrology
- zi wei dou shu
- shared semantic layer
- narrative rendering contracts

Out of scope for v1:

- ba zi specific enums
- user-authored custom taxonomies
- localized display copy

The purpose of this file is to stop naming drift before code starts.

## 2. Naming Principles

### 2.1 General Rules

1. Use ASCII only.
2. Store identifiers in English.
3. Treat display labels as content, not identifiers.
4. Prefer stable semantic names over school-specific prose.
5. Do not encode UI wording into engine identifiers.

### 2.2 Case Rules

- schema file names: `kebab-case`
- markdown spec files: `kebab-case`
- JSON top-level keys: `snake_case`
- enum values: `snake_case`
- semantic tags: `dot.namespace_style`
- constants in code: `SCREAMING_SNAKE_CASE`

### 2.3 Version Rules

Use semver strings for all versioned artifacts:

- `0.1.0`
- `1.0.0`
- `1.2.3-beta.1`

## 3. Identifier Prefixes

Use these prefixes for object ids where opaque ids are not enough.

| Field Type | Prefix Example |
|---|---|
| chart id | `chart_01...` |
| interpretation id | `interp_01...` |
| narrative id | `narr_01...` |
| semantic item id | `sem_01...` |
| evidence id | `ev_01...` |
| rule ref | `rule_zwds_...` |
| link id | `link_01...` |

Opaque UUIDs are still allowed where schemas require them, but internal tracing ids should keep readable prefixes where practical.

## 4. System Enums

### 4.1 `system_code`

Allowed values in v1:

- `western`
- `ziwei`

Reserved for later:

- `bazi`
- `human_design`
- `other`

Rule:

- v1 code and docs should not assume `bazi` exists as an active engine module.

### 4.2 `chart_type`

Allowed values in v1:

- `natal`
- `transit`
- `synastry`

Reserved but not required in v1:

- `composite`
- `solar_return`
- `lunar_return`
- `secondary_progression`

Rule:

- `ziwei` v1 should focus on natal first even if the shared enum allows future expansion.

## 5. Subject Enums

### 5.1 `role`

Allowed values:

- `native`
- `partner`
- `counterpart`
- `event`
- `transit_target`

Rule:

- use `native` for the primary subject in every personal chart flow
- use `partner` only in relationship comparison flows

## 6. Input Enums

### 6.1 `time_accuracy`

Allowed values:

- `exact`
- `approximate`
- `unknown`

Rule:

- `exact`: user supplied reliable birth time
- `approximate`: user supplied fuzzy time such as "around 8pm"
- `unknown`: no usable time

### 6.2 `calendar`

Allowed values:

- `gregorian`

Rule:

- normalized storage uses Gregorian even when source UX later supports lunar input

## 7. Chart Fact Naming

### 7.1 `fact_id`

Pattern:

- opaque id or prefixed id
- recommended internal pattern: `fact_<system>_<short_code>_<index>`

Examples:

- `fact_western_sun_sign_001`
- `fact_ziwei_ming_gong_001`

### 7.2 `fact_code`

Pattern:

- `<system>.<domain>.<detail>`

Examples:

- `western.point.sun.sign`
- `western.aspect.sun_moon.square`
- `western.house.house_10.ruler`
- `ziwei.palace.life.main_star`
- `ziwei.palace.career.main_star`
- `ziwei.star.zi_wei.palace`
- `ziwei.pattern.kong_jie_overlap`

Rule:

- `fact_code` is system-specific and descriptive
- `tag_code` is system-agnostic

### 7.3 `fact_type`

Active values for v1:

- `point`
- `house`
- `aspect`
- `palace`
- `star`
- `transformation`
- `auxiliary_star`
- `pattern`
- `derived_metric`
- `other`

Deprecated for this product direction:

- `pillar`
- `ten_god`
- `hidden_stem`
- `phase`
- `luck_cycle`

## 8. Western Naming Conventions

### 8.1 `point_code`

Allowed starter set:

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
- `ASC`
- `MC`
- `NORTH_NODE`
- `SOUTH_NODE`

Rule:

- uppercase with underscores
- no abbreviations except widely standardized forms like `ASC` and `MC`

### 8.2 `aspect_type`

Allowed values:

- `conjunction`
- `sextile`
- `square`
- `trine`
- `opposition`
- `quincunx`

Optional later:

- `semisextile`
- `semisquare`
- `sesquiquadrate`
- `quintile`
- `biquintile`

### 8.3 `house_system`

Allowed values:

- `placidus`
- `whole_sign`
- `equal`

Reserved later:

- `koch`
- `porphyry`
- `regiomontanus`
- `campanus`
- `morinus`

## 9. Zi Wei Naming Conventions

### 9.1 `ziwei_palace_code`

Allowed values:

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

Rule:

- store engine code in English
- map to Chinese labels only in content or localization layers

### 9.2 `ziwei_star_code`

Core major star set for v1:

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

Starter auxiliary set for v1:

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

Rule:

- use pinyin with underscores
- do not mix Wade-Giles, Chinese characters, and English in ids

### 9.3 `ziwei_transformation_code`

Allowed values:

- `hua_lu`
- `hua_quan`
- `hua_ke`
- `hua_ji`

### 9.4 `ziwei_pattern_code`

Pattern:

- `zwds.<domain>.<detail>`

Examples:

- `zwds.life_palace.main_star_strength`
- `zwds.career_palace.authority_focus`
- `zwds.money_palace.volatile_accumulation`
- `zwds.transformations.hua_ji_on_life_axis`

## 10. Semantic Tag Naming

### 10.1 `tag_code`

Pattern:

- `<level1>.<level2>.<level3>`
- optional fourth level only when necessary

Examples:

- `identity.core.self_definition`
- `emotion.regulation.internal_pressure`
- `relationship.boundary.high_selectivity`
- `career.trajectory.late_bloomer`
- `money.pattern.volatile_growth`

Rules:

1. Tags must be system-agnostic.
2. Tags must describe meaning, not mechanism.
3. Tags must survive copy rewrites and model changes.
4. Tags must not include star names, planet names, or palace names.

Bad:

- `ziwei.life_palace.strong`
- `western.saturn.10h.delay`

Good:

- `career.authority.earned_respect`
- `growth.path.delayed_maturation`

### 10.2 `category`

Allowed values:

- `identity`
- `emotion`
- `mind`
- `relationship`
- `career`
- `money`
- `family`
- `social`
- `health`
- `growth`
- `timing`
- `shadow`
- `other`

### 10.3 `polarity`

Allowed values:

- `supportive`
- `challenging`
- `mixed`
- `neutral`
- `neutral_positive`
- `neutral_negative`

Rule:

- polarity describes interpretive direction, not moral judgment

## 11. Evidence And Provenance Naming

### 11.1 `signal_code`

Pattern:

- `<system>.<rule_family>.<signal_name>`

Examples:

- `western.aspect.saturn_mc_concentration`
- `western.house_tone.scorpio_rising_intensity`
- `ziwei.palace.life_palace_zi_wei_presence`
- `ziwei.transform.hua_ji_on_career_axis`

### 11.2 `rule_ref`

Pattern:

- `rule_<system>_<topic>_<version>_<index>`

Examples:

- `rule_western_career_0_1_0_001`
- `rule_ziwei_identity_0_1_0_004`
- `rule_crosssystem_growth_0_1_0_002`

### 11.3 `fact_refs`

Rule:

- always reference `fact_id`, not free text
- never use human-readable prose as evidence pointers

## 12. Narrative Naming

### 12.1 `output_type`

Allowed values:

- `preview`
- `full_report`
- `chat_seed`
- `paywall_preview`
- `push_snippet`

### 12.2 `section.type`

Allowed values:

- `summary`
- `personality`
- `relationships`
- `career`
- `money`
- `family`
- `growth`
- `timing`
- `shadow`
- `faq`
- `comparison`

### 12.3 `card_type`

Allowed values:

- `highlight`
- `strength`
- `tension`
- `opportunity`
- `timing`
- `comparison`
- `cta`

## 13. Localization Rule

Identifiers never localize.

Examples:

- store `zi_wei`, not `紫微`
- store `career.trajectory.late_bloomer`, not translated variants
- render localized labels through content dictionaries

## 14. Deprecation Rule

When renaming identifiers:

1. add the new identifier
2. mark the old one deprecated in the seed dictionary
3. keep a compatibility map
4. remove only in a major version

## 15. Immediate Freeze List

Freeze these before coding engine modules:

1. `system_code`
2. `chart_type`
3. `role`
4. `time_accuracy`
5. `fact_type`
6. `point_code`
7. `aspect_type`
8. `house_system`
9. `ziwei_palace_code`
10. `ziwei_star_code`
11. `ziwei_transformation_code`
12. `category`
13. `polarity`
14. `output_type`
15. `section.type`
16. `card_type`

## 16. Next Spec

Next file should translate this naming system into:

- a seed `tag_code` dictionary
- example fixtures with exact and unknown birth time
- rule examples that map western and ziwei signals into shared semantic tags
