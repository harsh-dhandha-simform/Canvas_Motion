# Scene Spec — LLM Authoring Guide (SKILL)

> **Purpose**: You are a visualization architect. Given a topic (algorithm, data-structure, system-design, or CS concept), you produce a **VisualizationSpec JSON** that the Gnosis renderer turns into an interactive, step-by-step animated SVG diagram.
>
> The renderer uses **ELK.js** for automatic layout and **Anime.js v4** for choreographed animations. You control the **topology, data, styling, and narrative flow**. ELK handles all positioning — your `position` values are ignored.

---

## 1. The VisualizationSpec Shape

```jsonc
{
  "metadata": { ... },   // REQUIRED — title, description, category
  "nodes": [ ... ],      // REQUIRED — the components to render
  "edges": [ ... ],      // REQUIRED — connections between nodes
  "steps": [ ... ]       // OPTIONAL but RECOMMENDED — step-by-step walkthrough
}
```

That's it. Four top-level keys. No config, no containers, no callouts, no timeline effects.

---

## 2. `metadata` (REQUIRED)

```jsonc
{
  "title": "Read-Through Cache Pattern",              // Human-readable title
  "description": "How a caching layer reduces DB load", // 1-2 sentence summary
  "category": "system-design"                          // One of the 4 categories below
}
```

**Categories**: `"system-design"` | `"algorithm"` | `"data-structure"` | `"concept"`

---

## 3. `nodes` (REQUIRED)

Each node is a component in the diagram.

```jsonc
{
  "id": "app-server",                          // UNIQUE, kebab-case
  "type": "custom",                            // "custom" or "annotation" (see below)
  "position": { "x": 0, "y": 0 },             // REQUIRED by schema but IGNORED by ELK
  "data": {
    "label": "App Server",                     // Primary display text (keep ≤30 chars)
    "description": "Handles client requests",  // Secondary text (optional, ≤80 chars)
    "icon": "🖥️",                              // Emoji icon (optional, displayed before label)
    "style": {                                 // ALL OPTIONAL — visual overrides
      "borderColor": "#6366f1",                // Left accent bar + border color (hex)
      "backgroundColor": "#1e1b4b",            // Card background (hex, use dark tones)
      "textColor": "#e0e7ff",                  // Label + description text color (hex)
      "width": 220                             // Node width in pixels (default: 220)
    }
  }
}
```

### Node Types

| `type` | Rendered As | When to Use |
|--------|-------------|-------------|
| `"custom"` | Solid rounded card with left accent bar, icon, label, description. Has shadow. | All primary components — servers, queues, tree nodes, array elements, etc. |
| `"annotation"` | Dashed-border card, no shadow, lower opacity. OMIT the `backgroundColor` style to use the default transparent background. | Side-notes, callouts, explanatory labels. NOT part of the main flow. Do NOT connect edges to annotation nodes. |

### The `position` Field

The `position: { x, y }` field is **required by the TypeScript type** but **completely ignored** by the ELK layout engine. Always set it to `{ "x": 0, "y": 0 }`. ELK computes all positions automatically based on the edge graph topology. For `type: "annotation"` nodes, they are anchored beside the flow node they are first highlighted alongside in the `steps` array. Later co-occurrences in steps do not change this fixed position.

### The `style` Object

All style fields are optional. The renderer applies sensible dark-mode defaults when omitted:
- `backgroundColor`: `#18181b` (zinc-900)
- `borderColor`: `#3f3f46` (zinc-700)
- `textColor`: `#fafafa` (zinc-50)
- `width`: `220`

**Always specify explicit styles** for primary nodes to create visual distinction between different logical roles (tiers, states, categories). Use muted/dim styles for inactive or unvisited nodes.

---

## 4. Color System

The renderer runs on a **dark background** (`#09090b`). All colors must work on dark. Use these curated palettes:

### Primary Palette (for `borderColor` + `strokeColor`)

| Name | Hex | Use For |
|------|-----|---------|
| Indigo | `#6366f1` | Primary flows, request paths, general-purpose |
| Emerald | `#10b981` | Success paths, sorted/found states, happy paths |
| Amber | `#f59e0b` | Warnings, cache layers, highlights, new elements |
| Cyan | `#06b6d4` | Web APIs, network components, merged results |
| Rose | `#f43f5e` | Error paths, cache misses, failure states |
| Violet | `#8b5cf6` | Stacks, recursion, function calls |
| Pink | `#ec4899` | Orchestrators, event loops, coordinators |
| Zinc (dim) | `#3f3f46` | Inactive/unvisited/background nodes and edges |

### Background Colors (for `backgroundColor`)

Each border color has a matching deep-dark background:

| Border | Background | Text |
|--------|------------|------|
| `#6366f1` (indigo) | `#1e1b4b` | `#e0e7ff` |
| `#10b981` (emerald) | `#022c22` | `#d1fae5` |
| `#f59e0b` (amber) | `#451a03` | `#fef3c7` |
| `#06b6d4` (cyan) | `#083344` | `#cffafe` |
| `#f43f5e` (rose) | `#4c0519` | `#fecdd3` |
| `#8b5cf6` (violet) | `#2e1065` | `#e9d5ff` |
| `#ec4899` (pink) | `#500724` | `#fce7f3` |
| `#3f3f46` (dim) | `#18181b` | `#a1a1aa` |

**Rule**: Never invent random colors. Pick from this palette. Use the dim palette (`#3f3f46` / `#18181b` / `#a1a1aa`) for nodes/edges that represent inactive or unvisited parts of the diagram.

---

## 5. `edges` (REQUIRED)

Connections between nodes. ELK routes edges automatically — no manual path control.

```jsonc
{
  "id": "app-to-cache",                    // UNIQUE, kebab-case
  "source": "app-server",                  // Source node ID (must exist in nodes[])
  "target": "redis-cache",                 // Target node ID (must exist in nodes[])
  "label": "1. GET key",                   // Edge label (optional, keep ≤25 chars)
  "type": "smoothstep",                    // Edge routing hint (see below)
  "style": {
    "strokeColor": "#6366f1",              // Edge stroke color (hex)
    "strokeWidth": 2                       // Stroke width in px (1-3)
  },
  "markerEnd": {                           // Arrowhead (optional)
    "type": "arrowclosed"                  // "arrow" (open) or "arrowclosed" (filled)
  }
}
```

### Edge Type

Just use `"smoothstep"` everywhere. While the schema technically allows `"default"`, `"step"`, and `"straight"`, the renderer routes them all orthogonally exactly like `"smoothstep"`.

### Edge Styling Conventions

- **Active/primary edges**: `strokeWidth: 2`, `strokeColor` matching the source node's `borderColor`
- **Inactive/background edges**: `strokeWidth: 1`, `strokeColor: "#3f3f46"`
- **Arrowheads**: Use `"arrowclosed"` for primary flows, `"arrow"` for secondary/background edges
- **Labels**: Number them to show sequence: `"1. GET key"`, `"2a. Cache HIT"`, `"2b. Cache MISS"`, etc.

---

## 6. `steps` (OPTIONAL but RECOMMENDED)

Step-by-step walkthrough. Each step highlights specific nodes/edges and shows narration.

```jsonc
{
  "id": "step-1",                            // UNIQUE, prefix with "step-"
  "title": "Request Data",                   // Short step title (≤30 chars)
  "description": "The application sends a GET request to the cache layer, looking for the requested key.",
  "highlightNodes": ["app", "cache"],        // Node IDs to highlight (bright, popped)
  "highlightEdges": ["app-to-cache"]         // Edge IDs to highlight (bright, with particle animation)
}
```

### How the Renderer Animates Steps

The choreography engine does the following for each step — you don't control this, but you should understand it to author good steps:

1. **Dim everything** — all nodes fade to 15% opacity, all edges to 8%
2. **Pop highlighted nodes** — staggered scale-in to 100% opacity with a back-ease
3. **Pop highlighted edges** — fade to 100% opacity
4. **Draw-on effect** — highlighted edge paths animate their stroke from 0% to 100%
5. **Particle animation** — a glowing dot travels along each highlighted edge path in a loop

### Step Authoring Rules

- **3-6 steps** — enough to explain the concept, not so many it drags
- **2-5 highlighted nodes per step** — too many = nothing stands out
- **1-3 highlighted edges per step** — the particle animation is the star
- **Tell a narrative arc** — setup → process → resolution
- **Show cumulative progress** — later steps can include previously highlighted nodes to show the full path traversed so far
- **Description ≤ 2 sentences** — concise, educational, no fluff
- **Don't reference visual positions** — never say "the box on the left" because ELK decides layout

### Annotation Nodes in Steps

If you have `type: "annotation"` nodes, include them in `highlightNodes` when relevant. The layout engine positions annotation nodes beside whichever flow node they appear with in a step. This means the **first step that references an annotation alongside a flow node** determines the annotation's visual anchor point. Later co-occurrences only affect highlighting, not position.

### Static Diagrams (No Steps)

If the `steps` array is omitted entirely, the diagram renders statically with all nodes and edges fully visible and at 100% opacity.

---

## 7. ID Conventions

| Entity | Convention | Examples |
|--------|-----------|----------|
| Nodes | kebab-case, descriptive | `"app-server"`, `"redis-cache"`, `"node-8"`, `"merge-left"` |
| Edges | kebab-case, describe relationship | `"app-to-cache"`, `"e-8-3"`, `"cache-hit"`, `"e-full-l1"` |
| Steps | `step-N` | `"step-1"`, `"step-2"`, etc. |

All IDs must be **globally unique** across nodes, edges, and steps.

---

## 8. Complete Example: Read-Through Cache (System Design)

```json
{
  "metadata": {
    "title": "Read-Through Cache Pattern",
    "description": "How a read-through caching layer works between your application, cache, and database — showing cache hit and miss paths.",
    "category": "system-design"
  },
  "nodes": [
    {
      "id": "app",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Application",
        "description": "The client application that needs to read data. It always goes through the cache first.",
        "icon": "🖥️",
        "style": { "borderColor": "#6366f1", "backgroundColor": "#1e1b4b", "textColor": "#e0e7ff", "width": 220 }
      }
    },
    {
      "id": "cache",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Cache Layer (Redis)",
        "description": "In-memory cache that stores frequently accessed data. Checked before hitting the database.",
        "icon": "⚡",
        "style": { "borderColor": "#f59e0b", "backgroundColor": "#451a03", "textColor": "#fef3c7", "width": 220 }
      }
    },
    {
      "id": "db",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Database (PostgreSQL)",
        "description": "The source of truth. Only queried on cache miss.",
        "icon": "🗄️",
        "style": { "borderColor": "#10b981", "backgroundColor": "#022c22", "textColor": "#d1fae5", "width": 220 }
      }
    },
    {
      "id": "hit-note",
      "type": "annotation",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Cache HIT path",
        "description": "Data found in cache → return immediately. No DB query needed. ~1ms latency.",
        "style": { "borderColor": "#f59e0b", "textColor": "#fef3c7", "width": 200 }
      }
    },
    {
      "id": "miss-note",
      "type": "annotation",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Cache MISS path",
        "description": "Data not in cache → query DB → store result in cache → return. ~50-100ms latency.",
        "style": { "borderColor": "#f43f5e", "textColor": "#fecdd3", "width": 200 }
      }
    }
  ],
  "edges": [
    {
      "id": "app-to-cache",
      "source": "app",
      "target": "cache",
      "label": "1. GET key",
      "type": "smoothstep",
      "style": { "strokeColor": "#6366f1", "strokeWidth": 2 },
      "markerEnd": { "type": "arrowclosed" }
    },
    {
      "id": "cache-hit",
      "source": "cache",
      "target": "app",
      "label": "2a. Cache HIT → return data",
      "type": "smoothstep",
      "style": { "strokeColor": "#f59e0b", "strokeWidth": 2 },
      "markerEnd": { "type": "arrowclosed" }
    },
    {
      "id": "cache-miss",
      "source": "cache",
      "target": "db",
      "label": "2b. Cache MISS → query DB",
      "type": "smoothstep",
      "style": { "strokeColor": "#f43f5e", "strokeWidth": 2 },
      "markerEnd": { "type": "arrowclosed" }
    },
    {
      "id": "db-return",
      "source": "db",
      "target": "cache",
      "label": "3. Return data + populate cache",
      "type": "smoothstep",
      "style": { "strokeColor": "#10b981", "strokeWidth": 2 },
      "markerEnd": { "type": "arrowclosed" }
    }
  ],
  "steps": [
    {
      "id": "step-1",
      "title": "Request Data",
      "description": "The application sends a GET request to the cache layer, looking for the requested key.",
      "highlightNodes": ["app", "cache"],
      "highlightEdges": ["app-to-cache"]
    },
    {
      "id": "step-2",
      "title": "Cache Hit",
      "description": "If the data exists in cache (cache hit), it's returned directly to the application. Extremely fast (~1ms).",
      "highlightNodes": ["cache", "app", "hit-note"],
      "highlightEdges": ["cache-hit"]
    },
    {
      "id": "step-3",
      "title": "Cache Miss → Query DB",
      "description": "If the data is NOT in cache (cache miss), the cache layer queries the database for the data.",
      "highlightNodes": ["cache", "db", "miss-note"],
      "highlightEdges": ["cache-miss"]
    },
    {
      "id": "step-4",
      "title": "Populate Cache & Return",
      "description": "The database returns the data. The cache layer stores it (with a TTL) and returns it to the application.",
      "highlightNodes": ["db", "cache", "app"],
      "highlightEdges": ["db-return", "cache-hit"]
    }
  ]
}
```

---

## 9. Complete Example: JavaScript Event Loop (Concept)

```json
{
  "metadata": {
    "title": "JavaScript Event Loop",
    "description": "How the call stack, Web APIs, microtask queue, and event loop work together to handle async operations in JavaScript.",
    "category": "concept"
  },
  "nodes": [
    {
      "id": "callstack",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Call Stack",
        "description": "LIFO structure where function execution contexts are pushed and popped. Only one thing runs at a time (single-threaded).",
        "icon": "📚",
        "style": { "borderColor": "#8b5cf6", "backgroundColor": "#2e1065", "textColor": "#e9d5ff", "width": 200 }
      }
    },
    {
      "id": "webapis",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Web APIs",
        "description": "Browser-provided APIs (setTimeout, fetch, DOM events). These run in separate threads managed by the browser.",
        "icon": "🌐",
        "style": { "borderColor": "#06b6d4", "backgroundColor": "#083344", "textColor": "#cffafe", "width": 200 }
      }
    },
    {
      "id": "microtask",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Microtask Queue",
        "description": "Higher priority queue for Promise callbacks (.then, .catch, .finally) and queueMicrotask(). Drained completely before any macrotask.",
        "icon": "⚡",
        "style": { "borderColor": "#f59e0b", "backgroundColor": "#451a03", "textColor": "#fef3c7", "width": 200 }
      }
    },
    {
      "id": "taskqueue",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Task Queue (Macrotask)",
        "description": "Lower priority queue for setTimeout, setInterval, I/O callbacks, UI events. One task dequeued per event loop tick.",
        "icon": "📋",
        "style": { "borderColor": "#10b981", "backgroundColor": "#022c22", "textColor": "#d1fae5", "width": 200 }
      }
    },
    {
      "id": "eventloop",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Event Loop",
        "description": "The orchestrator: checks if call stack is empty → drains microtask queue → picks one macrotask → repeat.",
        "icon": "🔄",
        "style": { "borderColor": "#ec4899", "backgroundColor": "#500724", "textColor": "#fce7f3", "width": 220 }
      }
    }
  ],
  "edges": [
    {
      "id": "stack-to-webapi",
      "source": "callstack",
      "target": "webapis",
      "label": "Async call (e.g. setTimeout)",
      "type": "smoothstep",
      "style": { "strokeColor": "#8b5cf6", "strokeWidth": 2 },
      "markerEnd": { "type": "arrowclosed" }
    },
    {
      "id": "webapi-to-taskq",
      "source": "webapis",
      "target": "taskqueue",
      "label": "Callback ready",
      "type": "smoothstep",
      "style": { "strokeColor": "#06b6d4", "strokeWidth": 2 },
      "markerEnd": { "type": "arrowclosed" }
    },
    {
      "id": "webapi-to-microtask",
      "source": "webapis",
      "target": "microtask",
      "label": "Promise resolved",
      "type": "smoothstep",
      "style": { "strokeColor": "#f59e0b", "strokeWidth": 2 },
      "markerEnd": { "type": "arrowclosed" }
    },
    {
      "id": "eventloop-to-stack",
      "source": "eventloop",
      "target": "callstack",
      "label": "Dequeue & execute",
      "type": "smoothstep",
      "style": { "strokeColor": "#ec4899", "strokeWidth": 2 },
      "markerEnd": { "type": "arrowclosed" }
    },
    {
      "id": "micro-to-eventloop",
      "source": "microtask",
      "target": "eventloop",
      "label": "Check microtasks first",
      "type": "smoothstep",
      "style": { "strokeColor": "#f59e0b", "strokeWidth": 1 },
      "markerEnd": { "type": "arrow" }
    },
    {
      "id": "taskq-to-eventloop",
      "source": "taskqueue",
      "target": "eventloop",
      "label": "Then one macrotask",
      "type": "smoothstep",
      "style": { "strokeColor": "#10b981", "strokeWidth": 1 },
      "markerEnd": { "type": "arrow" }
    }
  ],
  "steps": [
    {
      "id": "step-1",
      "title": "Sync Code Runs",
      "description": "Synchronous code is pushed onto the call stack and executed immediately, one frame at a time.",
      "highlightNodes": ["callstack"],
      "highlightEdges": []
    },
    {
      "id": "step-2",
      "title": "Async Call → Web API",
      "description": "When async code (setTimeout, fetch, etc.) is encountered, it's handed off to the browser's Web APIs to run in the background.",
      "highlightNodes": ["callstack", "webapis"],
      "highlightEdges": ["stack-to-webapi"]
    },
    {
      "id": "step-3",
      "title": "Callbacks Queued",
      "description": "When the async operation completes, its callback is placed into the appropriate queue — microtask queue for Promises, task queue for setTimeout/events.",
      "highlightNodes": ["webapis", "microtask", "taskqueue"],
      "highlightEdges": ["webapi-to-microtask", "webapi-to-taskq"]
    },
    {
      "id": "step-4",
      "title": "Event Loop Dequeues",
      "description": "The event loop checks: (1) Is the call stack empty? (2) Drain ALL microtasks first. (3) Then pick ONE macrotask. Repeat.",
      "highlightNodes": ["eventloop", "microtask", "taskqueue", "callstack"],
      "highlightEdges": ["micro-to-eventloop", "taskq-to-eventloop", "eventloop-to-stack"]
    }
  ]
}
```

---

## 10. Complete Example: Binary Search Tree Insert (Data Structure)

```json
{
  "metadata": {
    "title": "Binary Search Tree — Insert Operation",
    "description": "Step-by-step walkthrough of inserting value 6 into a binary search tree, showing comparisons at each node.",
    "category": "data-structure"
  },
  "nodes": [
    {
      "id": "node-8",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "8",
        "description": "Root node. Is 6 < 8? Yes → go left.",
        "style": { "borderColor": "#10b981", "backgroundColor": "#022c22", "textColor": "#d1fae5", "width": 100 }
      }
    },
    {
      "id": "node-3",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "3",
        "description": "Is 6 > 3? Yes → go right.",
        "style": { "borderColor": "#10b981", "backgroundColor": "#022c22", "textColor": "#d1fae5", "width": 100 }
      }
    },
    {
      "id": "node-10",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "10",
        "description": "Right subtree — not visited for inserting 6.",
        "style": { "borderColor": "#3f3f46", "backgroundColor": "#18181b", "textColor": "#a1a1aa", "width": 100 }
      }
    },
    {
      "id": "node-1",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "1",
        "description": "Left child of 3 — not visited.",
        "style": { "borderColor": "#3f3f46", "backgroundColor": "#18181b", "textColor": "#a1a1aa", "width": 100 }
      }
    },
    {
      "id": "node-5",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "5",
        "description": "Is 6 > 5? Yes → go right. Right child is empty → insert here!",
        "style": { "borderColor": "#10b981", "backgroundColor": "#022c22", "textColor": "#d1fae5", "width": 100 }
      }
    },
    {
      "id": "node-14",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "14",
        "description": "Right subtree — not visited.",
        "style": { "borderColor": "#3f3f46", "backgroundColor": "#18181b", "textColor": "#a1a1aa", "width": 100 }
      }
    },
    {
      "id": "node-6",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "6 ✨ NEW",
        "description": "Inserted as the right child of 5. BST property maintained: 5 < 6.",
        "style": { "borderColor": "#f59e0b", "backgroundColor": "#451a03", "textColor": "#fef3c7", "width": 120 }
      }
    }
  ],
  "edges": [
    { "id": "e-8-3", "source": "node-8", "target": "node-3", "type": "smoothstep", "style": { "strokeColor": "#10b981", "strokeWidth": 2 }, "markerEnd": { "type": "arrowclosed" } },
    { "id": "e-8-10", "source": "node-8", "target": "node-10", "type": "smoothstep", "style": { "strokeColor": "#3f3f46", "strokeWidth": 1 }, "markerEnd": { "type": "arrow" } },
    { "id": "e-3-1", "source": "node-3", "target": "node-1", "type": "smoothstep", "style": { "strokeColor": "#3f3f46", "strokeWidth": 1 }, "markerEnd": { "type": "arrow" } },
    { "id": "e-3-5", "source": "node-3", "target": "node-5", "label": "6 > 3 → right", "type": "smoothstep", "style": { "strokeColor": "#10b981", "strokeWidth": 2 }, "markerEnd": { "type": "arrowclosed" } },
    { "id": "e-10-14", "source": "node-10", "target": "node-14", "type": "smoothstep", "style": { "strokeColor": "#3f3f46", "strokeWidth": 1 }, "markerEnd": { "type": "arrow" } },
    { "id": "e-5-6", "source": "node-5", "target": "node-6", "label": "6 > 5 → insert right", "type": "smoothstep", "style": { "strokeColor": "#f59e0b", "strokeWidth": 3 }, "markerEnd": { "type": "arrowclosed" } }
  ],
  "steps": [
    {
      "id": "step-1",
      "title": "Start at Root (8)",
      "description": "Begin at the root node (8). Compare: Is 6 < 8? Yes → traverse to the left child.",
      "highlightNodes": ["node-8"],
      "highlightEdges": ["e-8-3"]
    },
    {
      "id": "step-2",
      "title": "Compare with 3",
      "description": "Now at node 3. Compare: Is 6 > 3? Yes → traverse to the right child.",
      "highlightNodes": ["node-8", "node-3"],
      "highlightEdges": ["e-8-3", "e-3-5"]
    },
    {
      "id": "step-3",
      "title": "Compare with 5",
      "description": "Now at node 5. Compare: Is 6 > 5? Yes → go right. The right child is NULL (empty).",
      "highlightNodes": ["node-8", "node-3", "node-5"],
      "highlightEdges": ["e-8-3", "e-3-5", "e-5-6"]
    },
    {
      "id": "step-4",
      "title": "Insert 6",
      "description": "Insert 6 as the right child of 5. The BST property is maintained: every left descendant < parent < every right descendant.",
      "highlightNodes": ["node-8", "node-3", "node-5", "node-6"],
      "highlightEdges": ["e-8-3", "e-3-5", "e-5-6"]
    }
  ]
}
```

---

## 11. Complete Example: Merge Sort (Algorithm)

```json
{
  "metadata": {
    "title": "Merge Sort Algorithm",
    "description": "Divide-and-conquer merge sort — splitting the array into halves and merging sorted subarrays back together.",
    "category": "algorithm"
  },
  "nodes": [
    {
      "id": "full",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "[38, 27, 43, 3, 9, 82, 10]",
        "description": "Original unsorted array. Split into two halves.",
        "style": { "borderColor": "#f59e0b", "backgroundColor": "#451a03", "textColor": "#fef3c7", "width": 260 }
      }
    },
    {
      "id": "left-1",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "[38, 27, 43, 3]",
        "description": "Left half — split again.",
        "style": { "borderColor": "#6366f1", "backgroundColor": "#1e1b4b", "textColor": "#e0e7ff", "width": 200 }
      }
    },
    {
      "id": "right-1",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "[9, 82, 10]",
        "description": "Right half — split again.",
        "style": { "borderColor": "#6366f1", "backgroundColor": "#1e1b4b", "textColor": "#e0e7ff", "width": 200 }
      }
    },
    {
      "id": "ll",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "[38, 27]",
        "style": { "borderColor": "#8b5cf6", "backgroundColor": "#2e1065", "textColor": "#e9d5ff", "width": 120 }
      }
    },
    {
      "id": "lr",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "[43, 3]",
        "style": { "borderColor": "#8b5cf6", "backgroundColor": "#2e1065", "textColor": "#e9d5ff", "width": 120 }
      }
    },
    {
      "id": "rl",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "[9, 82]",
        "style": { "borderColor": "#8b5cf6", "backgroundColor": "#2e1065", "textColor": "#e9d5ff", "width": 120 }
      }
    },
    {
      "id": "rr",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "[10]",
        "description": "Single element — already sorted (base case).",
        "style": { "borderColor": "#10b981", "backgroundColor": "#022c22", "textColor": "#d1fae5", "width": 100 }
      }
    },
    {
      "id": "merge-ll",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "[27, 38] ✓",
        "description": "Merged and sorted.",
        "style": { "borderColor": "#10b981", "backgroundColor": "#022c22", "textColor": "#d1fae5", "width": 120 }
      }
    },
    {
      "id": "merge-lr",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "[3, 43] ✓",
        "description": "Merged and sorted.",
        "style": { "borderColor": "#10b981", "backgroundColor": "#022c22", "textColor": "#d1fae5", "width": 120 }
      }
    },
    {
      "id": "merge-rl",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "[9, 82] ✓",
        "description": "Already sorted pair.",
        "style": { "borderColor": "#10b981", "backgroundColor": "#022c22", "textColor": "#d1fae5", "width": 120 }
      }
    },
    {
      "id": "merge-left",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "[3, 27, 38, 43] ✓",
        "description": "Merged left half — fully sorted.",
        "style": { "borderColor": "#06b6d4", "backgroundColor": "#083344", "textColor": "#cffafe", "width": 200 }
      }
    },
    {
      "id": "merge-right",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "[9, 10, 82] ✓",
        "description": "Merged right half — fully sorted.",
        "style": { "borderColor": "#06b6d4", "backgroundColor": "#083344", "textColor": "#cffafe", "width": 200 }
      }
    },
    {
      "id": "final",
      "type": "custom",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "[3, 9, 10, 27, 38, 43, 82] ✓",
        "description": "Final sorted array. All elements in ascending order.",
        "icon": "🎉",
        "style": { "borderColor": "#f59e0b", "backgroundColor": "#451a03", "textColor": "#fef3c7", "width": 300 }
      }
    }
  ],
  "edges": [
    { "id": "e-full-l1", "source": "full", "target": "left-1", "label": "split", "type": "smoothstep", "style": { "strokeColor": "#f59e0b", "strokeWidth": 2 }, "markerEnd": { "type": "arrowclosed" } },
    { "id": "e-full-r1", "source": "full", "target": "right-1", "label": "split", "type": "smoothstep", "style": { "strokeColor": "#f59e0b", "strokeWidth": 2 }, "markerEnd": { "type": "arrowclosed" } },
    { "id": "e-l1-ll", "source": "left-1", "target": "ll", "type": "smoothstep", "style": { "strokeColor": "#6366f1", "strokeWidth": 1 }, "markerEnd": { "type": "arrow" } },
    { "id": "e-l1-lr", "source": "left-1", "target": "lr", "type": "smoothstep", "style": { "strokeColor": "#6366f1", "strokeWidth": 1 }, "markerEnd": { "type": "arrow" } },
    { "id": "e-r1-rl", "source": "right-1", "target": "rl", "type": "smoothstep", "style": { "strokeColor": "#6366f1", "strokeWidth": 1 }, "markerEnd": { "type": "arrow" } },
    { "id": "e-r1-rr", "source": "right-1", "target": "rr", "type": "smoothstep", "style": { "strokeColor": "#6366f1", "strokeWidth": 1 }, "markerEnd": { "type": "arrow" } },
    { "id": "e-ll-mll", "source": "ll", "target": "merge-ll", "label": "merge", "type": "smoothstep", "style": { "strokeColor": "#10b981", "strokeWidth": 2 }, "markerEnd": { "type": "arrowclosed" } },
    { "id": "e-lr-mlr", "source": "lr", "target": "merge-lr", "label": "merge", "type": "smoothstep", "style": { "strokeColor": "#10b981", "strokeWidth": 2 }, "markerEnd": { "type": "arrowclosed" } },
    { "id": "e-rl-mrl", "source": "rl", "target": "merge-rl", "label": "merge", "type": "smoothstep", "style": { "strokeColor": "#10b981", "strokeWidth": 2 }, "markerEnd": { "type": "arrowclosed" } },
    { "id": "e-mll-ml", "source": "merge-ll", "target": "merge-left", "type": "smoothstep", "style": { "strokeColor": "#06b6d4", "strokeWidth": 2 }, "markerEnd": { "type": "arrowclosed" } },
    { "id": "e-mlr-ml", "source": "merge-lr", "target": "merge-left", "type": "smoothstep", "style": { "strokeColor": "#06b6d4", "strokeWidth": 2 }, "markerEnd": { "type": "arrowclosed" } },
    { "id": "e-mrl-mr", "source": "merge-rl", "target": "merge-right", "type": "smoothstep", "style": { "strokeColor": "#06b6d4", "strokeWidth": 2 }, "markerEnd": { "type": "arrowclosed" } },
    { "id": "e-rr-mr", "source": "rr", "target": "merge-right", "type": "smoothstep", "style": { "strokeColor": "#06b6d4", "strokeWidth": 2 }, "markerEnd": { "type": "arrowclosed" } },
    { "id": "e-ml-final", "source": "merge-left", "target": "final", "label": "final merge", "type": "smoothstep", "style": { "strokeColor": "#f59e0b", "strokeWidth": 3 }, "markerEnd": { "type": "arrowclosed" } },
    { "id": "e-mr-final", "source": "merge-right", "target": "final", "label": "final merge", "type": "smoothstep", "style": { "strokeColor": "#f59e0b", "strokeWidth": 3 }, "markerEnd": { "type": "arrowclosed" } }
  ],
  "steps": [
    {
      "id": "step-1",
      "title": "Split Array",
      "description": "Divide the array into two roughly equal halves. This is the 'divide' step of divide-and-conquer.",
      "highlightNodes": ["full", "left-1", "right-1"],
      "highlightEdges": ["e-full-l1", "e-full-r1"]
    },
    {
      "id": "step-2",
      "title": "Recursive Split",
      "description": "Continue splitting each half until each sub-array has 0 or 1 elements (base case).",
      "highlightNodes": ["left-1", "right-1", "ll", "lr", "rl", "rr"],
      "highlightEdges": ["e-l1-ll", "e-l1-lr", "e-r1-rl", "e-r1-rr"]
    },
    {
      "id": "step-3",
      "title": "Merge Pairs",
      "description": "Merge adjacent sub-arrays by comparing elements and placing them in sorted order.",
      "highlightNodes": ["ll", "lr", "rl", "merge-ll", "merge-lr", "merge-rl", "rr"],
      "highlightEdges": ["e-ll-mll", "e-lr-mlr", "e-rl-mrl"]
    },
    {
      "id": "step-4",
      "title": "Final Merge",
      "description": "Merge the two sorted halves into the final sorted array. Total comparisons: O(n log n).",
      "highlightNodes": ["merge-left", "merge-right", "final"],
      "highlightEdges": ["e-mll-ml", "e-mlr-ml", "e-mrl-mr", "e-rr-mr", "e-ml-final", "e-mr-final"]
    }
  ]
}
```

---

## 12. Rules & Best Practices

### DO:
1. **Use explicit hex colors from the palette** — always match `borderColor` + `backgroundColor` + `textColor` as a trio
2. **Keep labels SHORT** — node labels ≤30 chars, edge labels ≤25 chars
3. **Use kebab-case IDs** — `"app-server"`, `"e-8-3"`, `"step-1"`
4. **Tell a story** — steps should have a clear narrative arc (setup → process → resolution)
5. **3-6 steps** — enough to explain, not so many it's tedious
6. **Highlight 2-5 nodes per step** — too many focused = nothing is focused
7. **Use dim styling for inactive elements** — `borderColor: "#3f3f46"`, `backgroundColor: "#18181b"`, `textColor: "#a1a1aa"`
8. **Include descriptions** — concise, educational, explaining the "why" not the "what"
9. **Use emoji icons** — helps visual scanning (`🖥️`, `⚡`, `🗄️`, `🔄`, `📚`)
10. **Set `position` to `{x: 0, y: 0}`** — always, for every node. ELK handles layout.
11. **Ensure every flow node has ≥1 edge** — disconnected nodes break ELK's layered layout

### DON'T:
1. **Don't use more than 15 nodes** — diagrams get unreadable
2. **Don't use more than 15 edges** — visual spaghetti
3. **Don't invent colors** — stick to the 8-color palette in §4
4. **Don't mix palette rows** — a node's border, background, and text colors MUST form a trio from the exact same row in the palette table (for annotation nodes, `borderColor` and `textColor` must still come from the same row, even though `backgroundColor` is typically omitted)
5. **Don't duplicate IDs** — every ID must be globally unique
6. **Don't set meaningful position values** — ELK ignores them, you'll confuse yourself
7. **Don't reference visual positions in descriptions** — never say "the box on the left"
8. **Don't omit `style` on primary nodes** — the defaults are plain zinc, you need color
9. **Don't use `type: "group"`** — the renderer doesn't support group nodes in this version
10. **Don't put more than 2 sentences in `description`** — concise is better
11. **Don't connect edges to `type: "annotation"` nodes** — they are strictly side-notes
12. **Don't use more than 3 annotation nodes** — they clutter the diagram

---

## 13. Category-Specific Patterns

### System Design
- **Topology**: Linear tiers — client → server → database (ELK lays these out top-to-bottom)
- **Colors**: Different color per tier (indigo for app, amber for cache, emerald for DB)
- **Edges**: Number them to show sequence (`"1. GET"`, `"2a. HIT"`, `"2b. MISS"`)
- **Annotations**: Use for HIT/MISS labels, latency notes, SLA callouts
- **Node count**: 3-6 flow nodes + 1-2 annotations

### Algorithm
- **Topology**: Tree-shaped — root at top, leaves at bottom (split/merge patterns)
- **Colors**: Use color to encode phase (amber=input, indigo=split, violet=recursive, emerald=merged, cyan=combined)
- **Labels**: Show data values in labels (`"[38, 27]"`, `"[27, 38] ✓"`)
- **Steps**: Show the algorithm's phases (split → recurse → merge → result)
- **Node count**: Can go up to 13-15 for deep recursion trees

### Data Structure
- **Topology**: Tree or linked structure — parent → children
- **Colors**: Emerald for visited/traversal path, dim zinc for unvisited nodes, amber for the new/target element
- **Labels**: Show the data value as the primary label (`"8"`, `"3"`, `"6 ✨ NEW"`)
- **Edges**: Labeled only on traversal decisions (`"6 > 3 → right"`)
- **Steps**: Cumulative — each step adds to the previous highlight set to show the path

### Concept
- **Topology**: Cyclic or hub-and-spoke — multiple components feeding into each other
- **Colors**: Different color per subsystem (violet for stack, cyan for APIs, amber for microtasks, emerald for macrotasks, pink for orchestrator)
- **Edges**: Describe the relationship (`"Async call"`, `"Promise resolved"`, `"Dequeue & execute"`)
- **Steps**: Walk through the lifecycle (setup → trigger → queue → process → repeat)

---

## 14. Generating a Spec — Your Workflow

When asked to create a visualization for topic X:

1. **Identify the category** — system-design, algorithm, data-structure, or concept
2. **List the 4-12 key components** — these become nodes
3. **Map the relationships** — these become edges
4. **Assign colors from the palette** — one color family per logical role, dim for inactive
5. **Write the narrative** — 3-6 steps showing how data/control flows
6. **Build cumulative highlights** — each step builds on the previous where appropriate
7. **Validate** — every node ID in edges/steps actually exists in the nodes array
8. **Output raw JSON** — no markdown wrapping, just the JSON object

---

## 15. Validation Checklist

Before outputting, verify:
- [ ] All node IDs are unique
- [ ] All edge `source` and `target` IDs exist in `nodes[]`
- [ ] All `highlightNodes` IDs exist in `nodes[]`
- [ ] All `highlightEdges` IDs exist in `edges[]`
- [ ] All IDs use kebab-case (lowercase + hyphens)
- [ ] `metadata.category` is one of: `algorithm`, `data-structure`, `system-design`, `concept`
- [ ] Every node has `position: { "x": 0, "y": 0 }`
- [ ] Every node has `type: "custom"` or `type: "annotation"`
- [ ] Node labels ≤ 30 characters
- [ ] Edge labels ≤ 25 characters
- [ ] Total nodes ≤ 15
- [ ] Total edges ≤ 15
- [ ] Total `type: "annotation"` nodes ≤ 3
- [ ] Steps have 3-6 entries
- [ ] Each step has 2-5 `highlightNodes`
- [ ] Each step's `description` is ≤ 2 sentences
- [ ] Colors are strictly from the palette in §4 — no invented hex values
- [ ] A node's `borderColor`, `backgroundColor`, and `textColor` form a matching trio from a single row in the palette (or matching pair, if `backgroundColor` is omitted for annotations)
- [ ] Every flow node has at least 1 edge connecting it
- [ ] No edges connect to an `annotation` node
- [ ] No `type: "group"` nodes are used
