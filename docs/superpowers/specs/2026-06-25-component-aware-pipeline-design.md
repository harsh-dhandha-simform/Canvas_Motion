# Component-Aware Pipeline Design

**Date:** 2026-06-25  
**Status:** Approved  
**Scope:** backend/agents/, backend/graph/tools.py, backend/graph/nodes.py

---

## Problem

The two LangGraph tools (`get_component_catalog`, `get_remotion_skill`) are only called
inside the Assembler node. All four upstream agents (Director, Scriptwriter, Storyboard,
Sync) are blind to the 13 available Remotion components. This forces the Assembler to
make all creative component-selection decisions alone, producing diagram-heavy JSON
(too many ArchitectureDiagram scenes, missing BulletList / StepFlow / SplitScreen
textual scenes).

---

## Solution: Context Injection + Responsibility Distribution

### Core principle

Tool outputs are fetched once at pipeline start and injected as static text into every
agent's system prompt. Agents cannot call tools mid-generation (they are single-shot
LLM calls, not ReAct loops). This is the "context injection" pattern.

### New data flow

```
build_agent_context()           ← runs once, results cached in pipeline state
  → compact_catalog             compact reference: 13 component names + key fields
  → remotion_timing_rules       per-component frame budget rules

Director   → {brief, scene_titles[], scene_types[]}
                                  ↑ picks from the 13 exact component names
Scriptwriter → {scenes[{component_type, narration, data:{text fields}}]}
Storyboard   → {scenes[{visual_data:{diagram/chart fields}, transition}]}
Sync         → {scenes[{duration_frames, start_frame}]}
Assembler    → zip(script, storyboard, timing) → VideoScript JSON
               pure Python merge + Pydantic validation
               LLM fallback only if validation fails
```

---

## Agent Responsibilities

### tools.py — new exports

```python
def build_agent_context() -> dict[str, str]:
    """Returns compact_catalog and remotion_timing_rules as injectable strings."""
```

Compact catalog format (injected into ALL agent system prompts):
```
AVAILABLE COMPONENTS — use EXACT names:
AnimatedTitle    — Title card. data: {title, subtitle?, align?}
BulletList       — 3-7 bullets. data: {title, items[str]}
StepFlow         — Steps. data: {title, steps[str]}
ComparisonCard   — Pros/cons. data: {title, pros[str], cons[str]}
SplitScreen      — Left text + right. data: {title, bullets[str]?, codeSnippet?}
StatCallout      — Single metric. data: {title, value(float), suffix?, description?}
ArchitectureDiagram — Topology. data: {title, nodes[{id,type,x,y,label}], connections[{fromId,toId,type}]}
TypewriterText   — Reveal. data: {lines[str]}
TimelineFlow     — Events. data: {title?, events[{year,label,description?}]}
QuoteCard        — Quote. data: {quote, author?, role?}
CodeBlock        — Code. data: {code, language?, title?}
TwoColumnLayout  — Two cols. data: {left{heading,points[]}, right{heading,points[]}}
BarChart         — Chart. data: {title?, bars[{label,value,color?}]}
```

Remotion timing rules (compact, injected into Sync + Assembler):
```
fps = 30. total_frames = duration_seconds × 30.
AnimatedTitle:       120-150 frames
BulletList/StepFlow: 150-240 frames
SplitScreen:         180-270 frames
ComparisonCard:      180-270 frames
ArchitectureDiagram: 240-360 frames
StatCallout:         90-150 frames
CodeBlock:           150-270 frames
Transition overlay:  15 frames (inside scene duration, NOT additive)
```

### director.py — new output field: `scene_types[]`

Director now outputs `scene_types: list[str]` alongside `scene_titles`.

**Diversity rules (enforced in system prompt):**
- Narrative arc (6-12 scenes):
  - First scene → always `AnimatedTitle`
  - Last scene  → always `AnimatedTitle`
  - Max 2 consecutive `ArchitectureDiagram` scenes
  - At least 40% text-based components: `BulletList`, `StepFlow`, `SplitScreen`,
    `ComparisonCard`, `CodeBlock`, `TwoColumnLayout`, `TypewriterText`, `QuoteCard`
- Diagram-driven comparison (6 scenes — forced sequence):
  `AnimatedTitle → SplitScreen → ArchitectureDiagram → ArchitectureDiagram → ComparisonCard → AnimatedTitle`

### scriptwriter.py — major rewrite: component-aware data generation

For each scene, outputs both narration AND component-specific `data{}`:

```json
{
  "scene_index": 1,
  "component_type": "BulletList",
  "narration": "...",
  "data": {
    "title": "Why Vertical Scaling Fails",
    "items": ["Single point of failure", "Hardware caps growth", "Downtime for upgrades"]
  }
}
```

**Data field ownership by component (Scriptwriter):**
| Component | Fields Scriptwriter generates |
|-----------|-------------------------------|
| AnimatedTitle | `title`, `subtitle?` |
| BulletList | `title`, `items[]` |
| StepFlow | `title`, `steps[]` |
| ComparisonCard | `title`, `pros[]`, `cons[]` |
| SplitScreen | `title`, `bullets[]?`, `codeSnippet?` |
| TypewriterText | `lines[]` |
| QuoteCard | `quote`, `author?`, `role?` |
| CodeBlock | `code`, `language`, `title?` |
| StatCallout | `title`, `value`, `suffix?`, `description?` |
| TwoColumnLayout | `title?`, `left{heading,points[]}`, `right{heading,points[]}` |
| ArchitectureDiagram | `title` only — visual data from Storyboard |
| BarChart | `title` only — visual data from Storyboard |
| TimelineFlow | `title` only — visual data from Storyboard |

### storyboard.py — rewrite: visual data + transitions only

Storyboard no longer writes SVG prose descriptions. It outputs:

```json
{
  "scene_index": 2,
  "component_type": "ArchitectureDiagram",
  "transition": "slideLeft",
  "background_variant": "grid",
  "visual_data": {
    "nodes": [
      {"id": "client", "type": "client", "x": 10, "y": 50, "label": "Client"},
      {"id": "server", "type": "server", "x": 50, "y": 50, "label": "App Server"},
      {"id": "db", "type": "database", "x": 85, "y": 50, "label": "PostgreSQL"}
    ],
    "connections": [
      {"fromId": "client", "toId": "server", "type": "arrow"},
      {"fromId": "server", "toId": "db", "type": "arrow"}
    ]
  }
}
```

For non-visual components (BulletList, AnimatedTitle, etc.), `visual_data` is `{}`.

**Visual data by component (Storyboard):**
| Component | Fields Storyboard generates |
|-----------|------------------------------|
| ArchitectureDiagram | `nodes[]`, `connections[]` |
| BarChart | `bars[]` |
| TimelineFlow | `events[]` |
| All others | `{}` (empty — Scriptwriter provides all data) |

Every scene also gets `transition` and `background_variant` from Storyboard.

### sync.py — component-aware timing

Reads `component_type` from script scenes to set frame budgets:
- ArchitectureDiagram → 240-360 frames minimum
- AnimatedTitle → 120-150 frames
- BulletList / StepFlow → 150-240 frames

### nodes.py assembler — pure merge + Pydantic validation

No heavy LLM call for structure. Steps:
1. Zip `script.scenes` + `storyboard.scenes` + `timing.scenes` by `scene_index`
2. Merge `script.data` (text fields) + `storyboard.visual_data` (visual fields) → `data{}`
3. Ensure `title` present (fall back to `script.title` if missing)
4. Build VideoScript dict and validate with `VideoScript.model_validate()`
5. On `ValidationError`: LLM fix-pass with a tight prompt (only if needed)

---

## Files Changed

| File | Type of change |
|------|---------------|
| `backend/graph/tools.py` | Add `build_agent_context()` with `compact_catalog` + `remotion_timing_rules` |
| `backend/agents/director.py` | Inject catalog context; add `scene_types[]` to output |
| `backend/agents/scriptwriter.py` | Major rewrite — component-aware `data{}` per scene |
| `backend/agents/storyboard.py` | Rewrite — `visual_data{}` + `transition` per scene |
| `backend/agents/sync.py` | Add component-aware frame budgets |
| `backend/graph/nodes.py` | Replace heavy Assembler LLM call with Python merge + Pydantic |

---

## Success Criteria

1. Generated JSON has a mix of text-based and diagram scenes (≥40% text-based for narrative arc)
2. No `null` in array fields (already fixed by `_NullSafeBase`)
3. No LLM call needed in Assembler for well-formed upstream output
4. All 5 agents' system prompts reference the component catalog
5. `npm run register-examples` → Remotion studio shows all scenes without TypeError
