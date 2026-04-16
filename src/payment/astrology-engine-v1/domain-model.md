# Domain Model

> **v1 Technical Blueprint / Document 1 of 6**
> Companion documents: `chart-result.schema.json`, `semantic-interpretation.schema.json`, `narrative-output.schema.json`, `enum-and-naming-conventions.md`, `tag-code-seed.v1.json`

---

## 0. Document Metadata

| Field | Value |
|---|---|
| Document ID | DOC-DOM-001 |
| Version | 0.2.0 (DRAFT) |
| Last Updated | 2026-04-16 |
| Owner | Core Platform |
| Status | Draft, expected to stabilize after 2-3 review rounds |
| Downstream Consumers | Schemas, rulesets, engine code, product, content, advisors |

---

## 1. Purpose And Scope

### 1.1 What This Document Solves

Before schema design or implementation begins, this document fixes five things:

1. What core entities exist and how they relate.
2. What layers exist and where their responsibility boundaries stop.
3. Which rules may never be broken.
4. What naming space the interpretation layer is allowed to use.
5. How each layer versions and evolves independently.

### 1.2 What This Document Is Not

- API spec: handled by the JSON schemas.
- UI spec: handled by presentation work.
- prompt library or persona writing guide: handled by narrative/content assets.
- engine implementation ADR: handled separately by engineering.

### 1.3 Scope

This document defines the semantic boundary across:

- Calculation
- Semantic
- Narrative

Presentation appears only as a consumer contract and is not expanded here.

### 1.4 Product Direction Constraint

This blueprint is for a product whose interpretation core is built around:

- Western Astrology
- Zi Wei Dou Shu

It is explicitly not optimizing for BaZi compatibility in v1. Future expansion remains possible, but v1 design decisions should prefer a clean `western + ziwei` pairing over abstract multi-system generality that weakens implementation clarity.

---

## 2. Design Philosophy

### 2.1 Core Judgment

The common architecture in astrology products is:

`calculation -> LLM -> copy`

That makes the model responsible for both reasoning and expression, which creates four recurring failures:

- low explainability
- low determinism
- poor cacheability
- fragile cross-model behavior

This product uses four layers instead:

```text
+----------------------+
| Calculation          |  deterministic math / system computation
|                      |  input: birth event
+----------+-----------+  output: chart result
           |
+----------v-----------+
| Semantic             |  rule-based structured meaning
|                      |  input: chart result
+----------+-----------+  output: semantic interpretation
           |
+----------v-----------+
| Narrative            |  persona-aware expression
|                      |  input: semantic interpretation
+----------+-----------+  output: narrative output
           |
+----------v-----------+
| Presentation         |  app / web / push / voice
|                      |  outside blueprint depth
+----------------------+
```

### 2.2 Change-Frequency Model

Different layers change at different speeds, which is why they must be separated:

| Layer | Change Frequency | Typical Change Driver |
|---|---|---|
| Calculation | very low | ephemeris changes, system engine upgrades |
| Semantic | medium | ruleset tuning, advisor review, taxonomy growth |
| Narrative | medium-low | new block types, persona tuning, output modes |
| Presentation | high | copy tests, UI iteration, localization |

### 2.3 System-Parity Principle

The key product move is not merely "two systems side by side." The real move is:

- western and ziwei contribute into one shared semantic layer
- the semantic namespace is system-neutral
- narrative talks about convergence or tension, not raw engine trivia

If the semantic layer were to encode system internals directly, the product would degrade into two adjacent apps with a shared shell.

### 2.4 Why Ziwei Fits Better Than BaZi Here

For this product line, Zi Wei aligns more naturally with the existing chart-like worldview because:

- both western and ziwei produce highly structured positional systems
- both naturally support graph-like, palace/house-driven interpretation
- both can be rendered into comparable life-domain narratives

This does not mean the systems are philosophically identical. It means they compose more cleanly into a shared semantic and narrative architecture.

---

## 3. Glossary

All downstream documents must use these terms consistently.

### 3.1 Core Entities

| Term | Chinese | Definition |
|---|---|---|
| Subject | 主体 | The person being interpreted, linked to one normalized birth event in v1 |
| Birth Event | 出生事件 | Birth timestamp, location, timezone, and uncertainty metadata |
| Chart | 命盘 / 图盘 | A per-system computational snapshot derived from a birth event |
| Chart Result | 计算结果 | Persisted structured output from the calculation layer |
| System | 体系 | An independent interpretive system such as `western` or `ziwei` |
| Signal | 信号 | A system-specific interpretable condition recognized from chart facts |
| Ruleset | 规则�?| Versioned mapping logic from signals to semantic items |
| Semantic Item | 语义条目 | A structured interpretation unit: tag, strength, polarity, confidence, provenance |
| Tag | 标签 | System-neutral semantic identifier in the shared taxonomy |
| Theme | 主题 | Higher-level grouping over related semantic items |
| Provenance | 溯源 | Trace from a semantic item back to chart facts and rules |
| Polarity | 极�?| Interpretive direction of a semantic item |
| Strength | 强度 | Magnitude or salience of a semantic item on a 0-1 scale |
| Confidence | 置信�?| Trust level of a computed result or semantic claim on a 0-1 scale |
| Cross-System Agreement | 跨体系一�?| Same tag supported by both western and ziwei |
| Cross-System Conflict | 跨体系张�?| Same domain or storyline shows meaningful tension across systems |
| Narrative Block | 叙事�?| Structured render unit such as summary, paragraph, card, comparison |
| Narrative Output | 叙事产出 | A full render package for a specific persona, locale, and output mode |
| Persona | 人格 | Narrative style package controlling tone and voice, not facts |
| Template Set | 模板�?| Versioned set of narrative composition rules |
| Locale | 区域 | Language and region code, for example `zh-CN` or `en-US` |
| Presentation | 表现�?| The final client rendering layer |

### 3.2 Western Terms

| Term | Chinese | Definition |
|---|---|---|
| Body | 天体 | Sun, Moon, planets, nodes, or other supported points |
| House | 宫位 | One of twelve houses under a selected house system |
| House System | 宫位系统 | Placidus, Whole Sign, Equal, and future variants |
| Sign | 星座 | One of twelve zodiac signs |
| Aspect | 相位 | Angular relation between two bodies or points |
| Angle | 四轴 | Ascendant, Midheaven, Descendant, Imum Coeli |
| Orb | 容许�?| Allowed deviation from exact aspect |
| Retrograde | 逆行 | Apparent reverse motion state |

### 3.3 Ziwei Terms

| Term | Chinese | Definition |
|---|---|---|
| Palace | �?| One of the 12 Ziwei palaces |
| Main Star | 主星 | One of the core Ziwei stars driving palace interpretation |
| Auxiliary Star | 辅星 | Supporting star contributing to nuance or modifiers |
| Transformation | 四化 | `hua_lu`, `hua_quan`, `hua_ke`, `hua_ji` |
| Life Palace | 命宫 | Core palace for self-structure and life orientation |
| Career Palace | 官禄�?| Palace related to work, standing, and professional role |
| Fortune Palace | 福德�?| Palace related to inner state, blessing, accumulation, and mental atmosphere |
| Travel Palace | 迁移�?| Palace related to movement, external world, and outward expression |

### 3.4 Controlled Language

The following wording is disallowed or tightly constrained:

| Term | Problem | Preferred Replacement |
|---|---|---|
| destiny / fated | over-deterministic | pattern / trajectory / tendency |
| prediction | overstates certainty | outlook / timing window / forecast |
| diagnosis | medical compliance risk | tendency / stress pattern / vitality note |
| investment advice | legal risk | financial tendency / caution with disclaimer |
| accurate / inaccurate as system metric | not operationally useful | strength / confidence / agreement |

---

## 4. Entity Model

### 4.1 Relationship Overview

```text
+----------+   1 -> 1   +-------------+   1 -> *   +------------------+
| Subject  |----------->| Birth Event |----------->| Chart Result     |
+----------+            +-------------+            | (per request)     |
                                                   +--------+---------+
                                                            |
                                                            | 1 -> *
                                                            v
                                                   +------------------+
                                                   | System Facts     |
                                                   +--------+---------+
                                                            |
                                                            | via rulesets
                                                            v
                                                   +------------------+
                                                   | Semantic Items   |
                                                   +--------+---------+
                                                            |
                                                            v
                                                   +------------------+
                                                   | Interpretation   |
                                                   +--------+---------+
                                                            |
                                                            v
                                                   +------------------+
                                                   | Narrative Blocks |
                                                   +--------+---------+
                                                            |
                                                            v
                                                   +------------------+
                                                   | Narrative Output |
                                                   +------------------+
```

### 4.2 Cardinality Rules

- one `Subject` maps to one active `Birth Event` in v1
- one `Birth Event` may generate multiple per-system fact sets inside one `Chart Result`
- one `Chart Result` plus one ruleset bundle produces one `Semantic Interpretation`
- one `Semantic Interpretation` plus one persona plus one template set plus one locale produces one `Narrative Output`

### 4.3 Identity And Cache Keys

| Object | Recommended Hash Basis |
|---|---|
| `subject_id` | external account id or anonymous UUID |
| `chart_hash` | `sha256(normalized_birth_event + chart_type + engine_version + active_systems)` |
| `interpretation_hash` | `sha256(chart_hash + semantic_version + ruleset_bundle)` |
| `narrative_hash` | `sha256(interpretation_hash + persona_id + template_set_version + locale + output_type)` |

### 4.4 Canonical Data Flow

`Birth Event -> Chart Result -> Semantic Interpretation -> Narrative Output`

Each stage must be reproducible from its upstream artifact plus version metadata.

---

## 5. Layer Contracts

### 5.1 Calculation Layer

Responsibility:

- transform a normalized birth event into deterministic structured chart facts

Must:

- behave as a pure function apart from read-only engine assets
- emit version metadata
- produce stable numeric formatting and field structure
- degrade gracefully when birth time is uncertain

Must not:

- call an LLM
- produce semantic tags
- produce human-facing advice
- read semantic or narrative artifacts

### 5.2 Semantic Layer

Responsibility:

- map chart facts into structured meaning

Must:

- emit only valid shared tags
- attach provenance to every semantic item
- preserve rule references and fact references
- express agreement and conflict explicitly

May:

- use deterministic rules
- use scored aggregation
- use constrained low-temperature assistance only for non-core helper tasks, never as an untraceable source of truth

Must not:

- invent chart facts
- put prose or marketing copy into semantic items
- encode system names inside tags

### 5.3 Narrative Layer

Responsibility:

- render semantic interpretation into user-facing structured output

Must:

- read only semantic interpretation and approved style inputs
- remain faithful to semantic items
- respect confidence and guardrails
- use disclaimers where required

May:

- reorganize order, emphasis, and tone
- combine multiple semantic items into one block
- adapt style by persona and locale

Must not:

- read raw chart facts for new claims
- invent factual statements absent from semantics
- let persona alter semantic truth values

### 5.4 Presentation Layer

Responsibility:

- render narrative output in app, web, push, or voice surfaces

Constraint:

- presentation must not bypass narrative to read semantic or chart data directly for user-facing claims

---

## 6. Invariants

These rules may never be violated.

| ID | Name | Rule |
|---|---|---|
| I-1 | Chart Determinism | Same normalized birth event, same active systems, same engine version, same chart type must produce the same chart result |
| I-2 | Semantic Traceability | Every semantic item must contain at least one provenance entry, and each provenance entry must point to existing fact ids |
| I-3 | Narrative Fidelity | Narrative output must not introduce factual claims absent from semantic interpretation |
| I-4 | System-Neutral Tags | Tags must not contain system names or raw system mechanics like `saturn`, `zi_wei`, `house_10`, or `life_palace` |
| I-5 | One-Way Dependencies | Dependency direction is Calculation -> Semantic -> Narrative -> Presentation only |
| I-6 | Version Reproducibility | Every persisted artifact must carry enough version data to reproduce it |
| I-7 | Persona Orthogonality | Changing persona may change expression, never tag, strength, polarity, or confidence |
| I-8 | Shared Tag Stability | A given tag keeps the same semantic meaning no matter which system contributes to it |
| I-9 | Compliance Routing | Sensitive domains such as health and finance must route through advisory wording and disclaimers |
| I-10 | Privacy Boundary | Semantic and narrative artifacts must not embed directly identifying PII |

---

## 7. Tag Taxonomy

### 7.1 Design Principles

- system-neutral
- stable across persona or copy changes
- primarily three levels: `domain.subdomain.specific`
- lowercase, dot-separated, underscore allowed inside a segment
- additive over time; deprecate instead of delete

### 7.2 v1 Primary Domains

v1 locks eight first-level domains:

| Domain | Chinese | Meaning |
|---|---|---|
| `self` | 自我 | identity, temperament, decision style, shadow, growth style |
| `career` | 事业 | trajectory, strengths, challenges, role, visibility, timing |
| `relationship` | 关系 | partnership, attachment, social mode, family dynamics |
| `wealth` | 财富 | earning style, risk profile, accumulation pattern, timing |
| `health` | 健康 | vitality and stress tendencies only, no diagnosis |
| `timing` | 时运 | cycles, phases, windows, momentum, consolidation |
| `purpose` | 志向 | direction, gifts, lessons, calling |
| `spirit` | 心�?| symbolic and inner-life themes, archetypes, sensibilities |

### 7.3 v1 Second-Level Examples

```text
self.*
|- temperament
|- values
|- shadow
|- growth_pattern
|- communication_style
`- decision_style

career.*
|- trajectory
|- strengths
|- challenges
|- timing
|- leadership_style
`- domain_affinity

relationship.*
|- attachment_style
|- family_patterns
|- partnership_dynamics
|- compatibility_signals
`- social_mode

wealth.*
|- earning_style
|- spending_pattern
|- risk_profile
`- timing

health.*
|- vitality
|- stress_patterns
`- constitution_tendencies

timing.*
|- current_season
|- upcoming_cycle
|- critical_windows
`- long_wave

purpose.*
|- direction
|- gifts
|- lessons
`- calling_signals

spirit.*
|- archetypes
|- inner_lessons
|- sensibilities
`- symbolic_themes
```

### 7.4 Naming Rules

- use English identifiers only
- use noun phrases, not sentences
- avoid evaluative terms like `bad_luck`
- narrative labels live outside the tag id

Good:

- `career.trajectory.late_bloomer`
- `relationship.attachment_style.slow_to_trust`

Bad:

- `western.saturn.delay`
- `ziwei.life_palace.strong`
- `this_person_has_bad_luck`

### 7.5 Tag Governance

New tags outside an existing second-level namespace require review:

1. proposed definition
2. at least one western mapping example
3. at least one ziwei mapping example when feasible
4. approval from product, advisor, and engineering

---

## 8. System Mapping Principles

### 8.1 Signal-To-Tag Responsibility

Each system owns its own ruleset package and maps system-specific signals into the shared tag taxonomy.

Examples:

- western signal: `western.aspect.saturn_mc_concentration`
- ziwei signal: `ziwei.palace.life_palace_zi_wei_presence`

Both may contribute to shared tags, but never by changing the meaning of the tag itself.

### 8.2 Cross-System Aggregation

When the same tag is supported by both systems, semantic aggregation must:

- set `cross_system_agreement: true`
- retain both provenance chains
- compute combined strength through a documented aggregation formula
- preserve confidence separately from strength

When signals imply tension rather than agreement, the semantic layer must:

- set `cross_system_conflict: true`
- preserve each provenance entry independently
- avoid collapsing conflict into fake certainty

### 8.3 v1 System Scope

| System | v1 Status |
|---|---|
| Western Astrology | active |
| Zi Wei Dou Shu | active |
| BaZi | out of scope for this blueprint |
| Human Design | reserved for future consideration |

### 8.4 Why Shared Semantics Matter

The semantic layer is the only place where "two independent systems support the same life-domain pattern" can become a first-class product feature. This is a major trust and differentiation lever.

---

## 9. Version Strategy

### 9.1 Independent Versioning

The following artifacts version independently:

| Artifact | Example | Major Trigger |
|---|---|---|
| `domain-model` | `0.2.0` | invariant or contract change |
| `chart-result.schema` | `0.1.0` | required field change or semantic field change |
| `semantic-interpretation.schema` | `0.1.0` | required field change or semantic field change |
| `narrative-output.schema` | `0.1.0` | required field change or semantic field change |
| `western ruleset` | `western-core@0.1.0` | mapping semantics change |
| `ziwei ruleset` | `ziwei-core@0.1.0` | mapping semantics change |
| `persona` | `mingme_mentor@1.0.0` | style or voice contract change |
| `template_set` | `v1-default@1.0.0` | block composition change |

### 9.2 Compatibility Rules

- tags are additive; do not delete, only deprecate
- schema field removals require deprecation first
- ruleset upgrades must pass regression review
- historical outputs remain reproducible under their original version bundle

### 9.3 Required Version Bundle

Every persisted artifact should carry a version bundle structurally equivalent to:

```json
{
  "versions": {
    "domain_model": "0.2.0",
    "engine": "engine-name@x.y.z",
    "rulesets": [
      "western-core@0.1.0",
      "ziwei-core@0.1.0"
    ],
    "schemas": {
      "chart_result": "0.1.0",
      "semantic_interpretation": "0.1.0",
      "narrative_output": "0.1.0"
    },
    "persona": "mingme_mentor@1.0.0",
    "template_set": "v1-default@1.0.0",
    "locale": "zh-CN"
  }
}
```

---

## 10. End-To-End Flow Example

Input:

- Subject with birth event `1990-05-15 15:30 Australia/Perth`

Step 1 - Calculation:

- western engine computes points, houses, and aspects
- ziwei engine computes palaces, stars, and transformations
- one chart result stores both systems under one request context

Step 2 - Semantic:

- western ruleset emits system signals and semantic items
- ziwei ruleset emits system signals and semantic items
- aggregation marks agreements or conflicts and preserves provenance

Step 3 - Narrative:

- persona and locale shape tone and composition
- semantic items are selected by strength, confidence, and theme coverage
- output is emitted as blocks such as summary, section, comparison, and CTA

Step 4 - Presentation:

- app renders narrative blocks
- "why am I seeing this?" can resolve through semantic provenance back to chart facts

---

## 11. Non-Goals For v1

The following are intentionally out of scope:

- real-time push forecasting
- full synastry and composite support
- user-authored persona creation
- public external API productization
- birth-time rectification
- direct health or financial recommendations

---

## 12. Open Questions

| ID | Question | Owner | Due |
|---|---|---|---|
| Q1 | default western house system for v1: Placidus, Whole Sign, or Equal? | advisors | before blueprint freeze |
| Q2 | exact aggregation formula for cross-system strength? | engineering | before semantic rules freeze |
| Q3 | how should cross-system conflict surface in narrative blocks by default? | product + engineering | before narrative freeze |
| Q4 | should `health.*` stay active in v1 or wait for compliance review? | product + legal | before launch work |
| Q5 | should version metadata be normalized into a shared top-level object across all three schemas? | engineering | before schema freeze |
| Q6 | how do we encode timezone-db provenance inside calculation version bundles? | engineering | before implementation |
| Q7 | what is the minimum regression fixture count per ruleset before promotion? | engineering + advisors | before ruleset release process |

---

## 13. Appendices

### 13.1 Change Log Template

```text
## [X.Y.Z] - YYYY-MM-DD
### Added
- ...
### Changed
- ...
### Deprecated
- ...
### Invariants Added / Modified
- ...
### Taxonomy Changes
- ...
```

### 13.2 Ruleset Regression Expectations

Each ruleset upgrade should be tested against:

- at least 50 fixed birth-event fixtures
- diff review of semantic outputs
- explicit review of added, removed, or changed semantic items
- explicit review of agreement/conflict changes

### 13.3 Review Checklist

- [ ] glossary terms are used consistently
- [ ] every invariant maps to schema validation and/or tests
- [ ] taxonomy examples are compatible with western and ziwei rulesets
- [ ] end-to-end flow is understandable to a new engineer in under 30 minutes
- [ ] non-goals are product-approved
- [ ] open questions have owners before blueprint freeze

### 13.4 Downstream Reference Map

| Downstream Document | Depends On |
|---|---|
| `chart-result.schema.json` | glossary, entity model, calculation contract, invariants, version strategy |
| `semantic-interpretation.schema.json` | glossary, semantic contract, invariants, taxonomy, system mapping |
| `narrative-output.schema.json` | glossary, narrative contract, invariants, version strategy |
| `enum-and-naming-conventions.md` | taxonomy, system mapping, versioning assumptions |
| `tag-code-seed.v1.json` | taxonomy and governance rules |

### 13.5 Alphabetical Term Index

Angle · Aspect · Birth Event · Body · Career Palace · Chart · Chart Result · Confidence · Cross-System Agreement · Cross-System Conflict · House · House System · Locale · Main Star · Narrative Block · Narrative Output · Persona · Polarity · Presentation · Provenance · Retrograde · Ruleset · Semantic Item · Signal · Sign · Strength · Subject · System · Tag · Template Set · Transformation

---

**End Of Document**
