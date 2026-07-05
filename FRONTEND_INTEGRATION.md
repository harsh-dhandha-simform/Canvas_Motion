# Interactive Learning — Frontend Integration Guide

This is everything you need to build the "Try it yourself" challenge UI in
whatever framework you're using. You do **not** need our D3/vanilla-JS
implementation (`interactive_learning/visualizer/`) — that's just our
reference/test harness. Build it however makes sense for your stack.

## The rule that shapes everything

**The correct answer (ground truth) never leaves the server.** You will
never receive it, and you should never need it. You send the user's
attempt to the backend; the backend tells you if it's right, how close it
was, and (on request) a hint. That's the entire contract.

## Step 1: Render the challenge

You'll receive one **Challenge JSON** object. Same envelope for all 5
types — only `data` changes shape:

```json
{
  "challenge_id": "arr_001",
  "challenge_type": "arrange_steps",
  "title": "Neural Network Training",
  "description": "Arrange the steps correctly",
  "difficulty": "easy",
  "learning_objective": "Understand training flow",
  "data": { }
}
```

`data` per type (see `schemas/*/challenge_schema.json` for the exact, live
examples):

| Type | `data` contains | What the user does |
|---|---|---|
| `arrange_steps` | `steps: [{id, label}, ...]` | Reorder the steps (drag, up/down buttons, whatever) |
| `build_it_yourself` | `components: [{id, label}, ...]` | Draw directed connections between components |
| `scenario_based` | `scenario: string, options: [{id, label}, ...]` | Pick one option |
| `multiple_choice` | `question: string, options: [{id, label}, ...]` | Pick one option |
| `match_items` | `left: [{id, label}, ...], right: [{id, label}, ...]` | Pair each left item with a right item |

**Tip:** For `arrange_steps`, shuffle `steps` yourself before showing them —
the array arrives in the correct order, so showing it as-is gives the
answer away for free.

## Step 2: Build the "attempt" and submit it

When the user hits "Check answer," build one of these based on
`challenge_type`, and POST it:

```
POST /validate
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "challenge_id": "arr_001",
  "user_attempt": { ... one of the shapes below ... }
}
```

| Type | `user_attempt` shape |
|---|---|
| `arrange_steps` | `{"challenge_id": "...", "ordered_ids": ["s2","s1","s3"]}` — the step ids in the order the user put them |
| `build_it_yourself` | `{"challenge_id": "...", "connections": [["frontend","backend"], ...]}` — **direction matters**: `[a, b]` means "user drew a line from a to b," not "a and b are connected." Render an arrowhead so the user can see which way they drew it. |
| `scenario_based` / `multiple_choice` | `{"challenge_id": "...", "selected_option": "op2"}` |
| `match_items` | `{"challenge_id": "...", "matches": [["l1","r2"], ...]}` — `[left_id, right_id]` pairs |

**Response:**

```json
{
  "success": true,
  "result": {
    "correct": false,
    "score": 67,
    "mistakes": { "wrong_connections": [["frontend","database"]] }
  },
  "attempt_number": 1
}
```

- `correct` — show a green/red state.
- `score` — 0-100, show as a percentage/progress bar. `100` if and only if `correct` is `true`.
- `mistakes` — structured diff, shape depends on type (below). Use it to highlight the wrong parts (e.g. color the wrong connection red), not to show raw JSON to the user.

`mistakes` shapes:

| Type | Keys you might see |
|---|---|
| `arrange_steps` | `wrong_positions: [{step_id, expected_position, actual_position}]`, `missing_steps: [id, ...]`, `extra_steps: [id, ...]` |
| `build_it_yourself` | `missing_connections: [[a,b], ...]`, `wrong_connections: [[a,b], ...]` |
| `scenario_based` / `multiple_choice` | `selected: id, expected: id` |
| `match_items` | `missing_matches: [[l,r], ...]`, `wrong_matches: [[l,r], ...]` |

If `correct` is `true`, just show a success state — don't call `/hint`.

## Step 3: "Get a hint" (only if incorrect)

```
POST /hint
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "challenge_id": "arr_001",
  "mistakes": { ... exactly the "mistakes" object from /validate ... }
}
```

Response: `{"success": true, "hint": "Should the frontend really talk to the database directly...?"}`

This is a real LLM call — **it can take anywhere from a few seconds to ~2
minutes.** Show a loading/spinner state on the button, don't block the
whole UI, and let the user keep working while it loads if your UX allows
it.

## Quick reference: the whole flow

```
1. Backend gives you: Challenge JSON  (Step 1's table)
2. User interacts, you build: user_attempt  (Step 2's table)
3. POST /validate  ->  { correct, score, mistakes }
4. If not correct and user wants help: POST /hint (send mistakes back)  ->  { hint }
5. Repeat 2-4 until correct
```

## What you will never receive, and shouldn't ask for

- The correct order/connections/option/matches (ground truth) — it stays
  server-side, by design.
- Raw validation internals beyond what's in `mistakes` above.

## Auth (current state — flag if this needs to be production-hardened)

Every request needs `Authorization: Bearer <API_KEY>`. Right now this is a
single shared demo key (same one in `claude_api.py`/`.env`) — fine for
internal/local use, **not** a real per-user auth story. If this ships
beyond an internal demo, that needs to change before frontend ships it
publicly.
