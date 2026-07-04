# Component Catalog Reference Guide

This document is the authoritative reference for all visualization and scene components in this catalog. 

> [!IMPORTANT]
> **Enforcement Rule**: Any future session or agent that adds, extends, or modifies a scene component **MUST** update this reference file to keep it sync'd with the code implementation. Do not treat this as an afterthought.

---

## 1. Title Components

| Name | Category | What it visually shows | When to use it | When NOT to use it | Key Required Props | Key Optional Props | Constraints / Sizing | Scaling Hook? |
|---|---|---|---|---|---|---|---|---|
| `AnimatedTitle` | title | Large bold title, optional subtitle, sweeping accent-color underline | Initial scene 0 hook or final outro scene | Middle of video explanations (use `TypewriterText` instead) | `title` | `subtitle`, `accentColor`, `align` | Keep title under 6-8 words | No |
| `TypewriterText` | title | Character-by-character typewriter reveal with blinking cursor | Dramatic statement, CLI commands, or key takeaways | Structural titles (use `AnimatedTitle` instead) | `lines` | `accentColor`, `fontSize`, `charPerFrame`, `showCursor` | 2-3 short lines max | No |

---

## 2. List Components

| Name | Category | What it visually shows | When to use it | When NOT to use it | Key Required Props | Key Optional Props | Constraints / Sizing | Scaling Hook? |
|---|---|---|---|---|---|---|---|---|
| `BulletList` | list | Staggered reveal list of bullet items | Explaining 5-7 simple facts, lists of items | Sequences or ordered guides (use `NumberedList` or `StepFlow`) | `title`, `items` | `accentColor`, `numbered`, `align` | Best for 4-7 lines | No |
| `NumberedList` | list | Vertical/grid cards with large numbered badges | Steps, ranked guidelines, top-N principles | Horizontally oriented processes (use `StepFlow`) | `title`, `items` | `accentColor`, `layout` | Max 6 cards | No |
| `GlossaryCards` | list | Grid cards with colored icons for terms | Definition list, term dictionaries | Comparisons or plain facts (use `ComparisonCard` or `BulletList`) | `title`, `terms` | `accentColor` | Grid auto-reflows up to 6 cards | No |
| `StepFlow` | list | Vertical or horizontal connected step badges | Horizontally or vertically chaining workflow steps | History lists or system details (use `TimelineFlow` or `SequenceDiagram`) | `title`, `steps` | `accentColor`, `layout` (horizontal/vertical) | Max 5-6 steps to avoid compression | Yes |
| `ComparisonCard` | list | Side-by-side advantages vs limitations card | Standard binary pros/cons of one choice | Comparing N systems across multiple properties (use `TradeoffMatrix`) | `title`, `pros`, `cons` | `accentColor` | 3-5 bullets per list | No |
| `TwoColumnLayout` | list | Split comparison layout with divider | Comparing two systems side-by-side | Transformations or mappings (use `BeforeAfterTransform`) | `left`, `right` | `title`, `accentColor`, `dividerLabel` | 3-5 bullets | No |
| `BeforeAfterTransform` | list | Side-by-side panels connected by transform arrow | Encoding, compaction, compression, transformations | Side-by-side general pros/cons (use `TwoColumnLayout`) | `before`, `after` | `title`, `transformLabel`, `accentColor` | Best for text files/payload representations | Yes |
| `TradeoffMatrix` | list | Clean grid comparing systems vs criteria | CAP theorem, protocol/DB tradeoff grids | Simple comparison of a single database (use `ComparisonCard`) | `rows`, `columns`, `cells` | `title`, `accentColor` | Max 4x4 matrix for legibility | Yes |

---

## 3. Text Components

| Name | Category | What it visually shows | When to use it | When NOT to use it | Key Required Props | Key Optional Props | Constraints / Sizing | Scaling Hook? |
|---|---|---|---|---|---|---|---|---|
| `QuoteCard` | text | Centered verbatim pull quote, author badge | Citation, direct quote from author | General summaries (use `CalloutAnnotation` or `BulletList`) | `quote` | `author`, `role`, `accentColor`, `highlightWords` | Limit quote to 20-30 words | No |
| `CalloutAnnotation` | text | Border-bracketed callout box with header | Definition, warning, key insight | Full code snippets (use `CodeBlock`) | `title`, `description` | `accentColor` | Max 50 words | No |

---

## 4. Code Components

| Name | Category | What it visually shows | When to use it | When NOT to use it | Key Required Props | Key Optional Props | Constraints / Sizing | Scaling Hook? |
|---|---|---|---|---|---|---|---|---|
| `CodeBlock` | code | macOS window with code highlighting | Production-grade code files (YAML, JSON, Python, etc.) | Explaining request/response wires (use `HttpExchange` or `BeforeAfterTransform`) | `code` | `title`, `language`, `accentColor`, `highlightLines` | Max 15 lines for font size legibility | No |
| `SplitScreen` | code | Two-panel layout: list/text left, code right | Hybrid text and code descriptions | Pure code displays (use `CodeBlock`) | `title` | `bullets`, `codeSnippet`, `mediaUrl` | Half-panel width layout | No |
| `TerminalCLI` | code | Simulated command line typing and stream | Console outputs, installing packages, logs | Showing API responses (use `HttpExchange`) | `command`, `output` | `theme`, `accentColor`, `cursorSpeed` | Max 12 lines of output | No |
| `HttpExchange` | code | Left request, right response wire viewer | HTTP request/response exchanges | Multi-hop RPC flows (use `SequenceDiagram` or `TimelineFlow`) | `path`, `requestHeaders`, `responseHeaders` | `title`, `method`, `statusCode`, `requestBody` | Best in full-panel layouts | No |

---

## 5. Chart Components

| Name | Category | What it visually shows | When to use it | When NOT to use it | Key Required Props | Key Optional Props | Constraints / Sizing | Scaling Hook? |
|---|---|---|---|---|---|---|---|---|
| `StatCallout` | chart | Massively scaled counting statistic | Simple numerical benchmark callouts | Multiple values comparisons (use `BarChart`) | `title`, `value` | `suffix`, `description`, `accentColor` | Single value only | No |
| `BarChart` | chart | Staggered vertical or horizontal bar sizes | Benchmarks, throughput ratios, latencies | Time-series trends (use `LineChart` or `LoadPattern`) | `bars` | `title`, `accentColor`, `layout` | 3-6 bars max | No |
| `LineChart` | chart | Animated trend line series | Time-series, growth trajectories | Real-world incident load patterns (use `LoadPattern`) | `xLabels`, `series` | `title`, `yLabel`, `xLabel`, `highlightIndex` | 4-8 data points | Yes |
| `PieChart` | chart | Sweeping donut/pie chart proportions | Breakdown percentages, shares, splits | Multi-metric timelines (use `LineChart`) | `slices` | `title`, `centerLabel`, `centerValue`, `showLegend` | 3-6 slices max | Yes |
| `LoadPattern` | chart | Time-series line chart with timeline markers | Capacity planning, traffic spikes, incident spikes | Clean clean benchmark trend comparisons (use `LineChart`) | `series` | `title`, `annotations`, `yLabel`, `xLabel` | Max 4 series and 5 annotations | Yes |

---

## 6. Network Diagram Components

| Name | Category | What it visually shows | When to use it | When NOT to use it | Key Required Props | Key Optional Props | Constraints / Sizing | Scaling Hook? |
|---|---|---|---|---|---|---|---|---|
| `ArchitectureDiagram` | network-diagram | Servers, databases, load balancers grid layout | Multi-tier app components deployment topology | Request routes or sharding rings (use `PacketFlow` or `HashRing`) | `title`, `nodes`, `connections` | `accentColor` | Coordinates normalized (0..100) | No |
| `PacketFlow` | network-diagram | Nodes connected by edges with animated packets | Protocol handshakes, routing tables, node overlays | Queue-based messaging topologies (use `QueueFlow`) | `nodes`, `edges` | `title`, `accentColor`, `packetInterval` | Supports `"queue"` and `"broker"` node types | Yes |
| `HashRing` | network-diagram | Circle with virtual node dots and lookup arrows | CDN cache routing, sharding rings | Generic database topology layouts (use `ArchitectureDiagram`) | `servers` | `virtualNodesPerServer`, `ticks`, `centerLabel` | Ring centered automatically (`cx=960`) | Yes |
| `QueueFlow` | network-diagram | Producers, middle queue buffer box, consumers | Producers-Consumers queues, Kafka, RabbitMQ | Direct peer-to-peer routing (use `PacketFlow`) | `producers`, `queueLabel`, `consumers` | `title`, `messages`, `accentColor` | Auto-fits up to 3 producers/consumers | Yes |

---

## 7. State & Tree Components

| Name | Category | What it visually shows | When to use it | When NOT to use it | Key Required Props | Key Optional Props | Constraints / Sizing | Scaling Hook? |
|---|---|---|---|---|---|---|---|---|
| `StateMachine` | state-tree | Finite state boxes with conditional arrows | FSM transitions (Raft, TCP States, MESI) | Standard flowchart decision workflows (use `FlowDiagram`) | `states`, `transitions` | `title`, `activeStateId`, `accentColor` | Transitions support `guard` and `action` annotations | Yes |
| `TreeHierarchy` | state-tree | Top-down node structure layout | B-trees, DNS, recursion stacks | Arbitrary loops or workflow steps (use `FlowDiagram`) | `nodes`, `edges` | `title`, `accentColor` | Dynamic viewBox, scale-resilient | No |
| `FlowDiagram` | state-tree | Branching layout with decisions (diamonds) | Algorithm workflows, branching code checks | Formal FSM state protocols (use `StateMachine`) | `nodes`, `edges` | `title`, `accentColor` | Dynamic sizing with coordinate math | Yes |

---

## 8. Sequence Components

| Name | Category | What it visually shows | When to use it | When NOT to use it | Key Required Props | Key Optional Props | Constraints / Sizing | Scaling Hook? |
|---|---|---|---|---|---|---|---|---|
| `SequenceDiagram` | sequence | Lifelines with time-staggered arrow messages | API call hierarchies, auth exchanges, RPCs | History events (use `TimelineFlow`) | `actors`, `messages` | `title`, `activations`, `accentColor` | Messages support custom `delayMs` proportional gaps | Yes |
| `RetrySequence` | sequence | Exponential delay line with retry outcome markers | Retry loops, backoff triggers, network handshakes | Multicast service calls (use `SequenceDiagram`) | `attempts` | `title`, `maxAttempts`, `accentColor` | Proportional delay spacing | Yes |

---

## 9. Timeline Components

| Name | Category | What it visually shows | When to use it | When NOT to use it | Key Required Props | Key Optional Props | Constraints / Sizing | Scaling Hook? |
|---|---|---|---|---|---|---|---|---|
| `TimelineFlow` | timeline | Spine layout with events staggered | Project milestones, software history | Timing of network requests (use `SequenceDiagram` or `RetrySequence`) | `events` | `title`, `accentColor`, `direction` | Best vertical layout | No |

---

## Interaction Components (Browser Sandbox)

These components are used directly in the browser-side player/sidebar context (not inside Remotion rendering pipeline).

* **`QuizInteraction`**: Multiple choice questionnaire for quick checking of understanding.
* **`SendRequestInteraction`**: Sandbox allowing choice of client network payloads to test server response states.
* **`SimulateMutationInteraction`**: Interactive variables viewer demonstrating state transitions.

> [!NOTE]
> All three interaction components integrate with `ThemeContext` via the `useTheme()` hook to dynamically match the production application design token colors.

---

## Layout Sizing Hook (`useContainerScale`)

The shared hook `useContainerScale` dynamically monitors the parent container's dimensions via `ResizeObserver` and outputs coordinate multipliers and scaling indicators. SVG viewboxes can utilize `transform: scale(scale)` to render legibly on half-panels (split-screens) without clipping.
