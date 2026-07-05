# Project State — Interactive Learning Module

Snapshot for handing off to another AI agent to plan next steps. This is a
factual state dump, not a design doc — the design is frozen in
`prompts/implementation_prompt.md` and should not be re-litigated without
the project owner's sign-off.

## What this project is

Part of a larger "generate educational videos from a topic" pipeline (see
`prompts/implementation_prompt.md` for the full upstream flow: topic →
lesson planning → script → visuals → narration → captions → MP4). After a
video finishes, the user can click "Try it yourself," which opens this
Interactive Learning module: exactly one auto-generated challenge that
reinforces the lesson, with deterministic validation and LLM-generated
hints.

The spec is spread across these top-level docs (there is no single
`interactive-learning/` folder — this is intentional, confirmed with the
project owner):

- `prompts/implementation_prompt.md` — the frozen spec, authoritative
- `prompts/skills.md` — challenge-type selection rules (duplicate/consistent
  with `configs/challenge_config.md`)
- `configs/challenge_config.md`, `configs/content_limits.md` — per-type
  min/max limits
- `hints/hint_generation_flow.md` — hint generation flow + example I/O
- `validation/validation_rules.md` — validation logic + example I/O
- `schemas/{common,arrange_steps,build_it_yourself,scenario_based,multiple_choice,match_items}/*.json` —
  authoritative field shapes for Challenge / Ground Truth / User Attempt
  JSON, per type

## Implementation status: all 8 steps from implementation_prompt.md done

Code lives in `interactive_learning/` (Python package; underscore, not
hyphen, since `interactive-learning` isn't a valid Python identifier).

| File | Step | Purpose |
|---|---|---|
| `constants.py` | — | Allowed challenge types + per-type limits, mirrors `configs/content_limits.md` |
| `models.py` | 1 | Dataclasses matching `schemas/*/*.json` exactly (flat fields, not the old `contracts/` envelope — see Decisions below) |
| `selection.py` | 2 | LLM picks one of the 5 allowed challenge types; rejects anything else |
| `generation.py` | 3 | LLM generates Challenge + Ground Truth JSON per type; validates against `constants.LIMITS`; raises (never fabricates) on bad/out-of-limit output |
| `validation.py` | 5 | Deterministic per-type validators; output shape matches `validation/validation_rules.md` exactly |
| `mistake_analysis.py` | 6 | Thin formatter: wraps validation mistakes into `{challenge_type, mistakes}` for the hint prompt |
| `hints.py` | 7 | LLM hint generator (nudge only, never reveals answer) + fixed success message |
| `session_store.py` | — | In-memory session/attempt store, keyed by `challenge_id`, DB-migration-shaped |
| `llm_client.py` | — | Wraps `claude_api.ask_claude()` (see Known Issues — this contract has changed once already) |
| `demo.py` | 8 | Hardcoded end-to-end demo: Neural Network Training → arrange_steps, using the exact example from `schemas/arrange_steps/*.json` and the wrong-attempt example from `hints/hint_generation_flow.md` |
| `demo_challenges.py` | — | Phase 4: single source of truth for the 5 demo challenge/ground-truth pairs (verbatim from `schemas/*/`), shared by `claude_api.py` (server-side seeding) and `generate_visualizer_data.py` (browser-facing, ground-truth-free) |
| `generate_visualizer_data.py` | — | Bakes challenge-only JSON (no ground truth) into `visualizer/data.js` from `demo_challenges.py` |
| `visualizer/` | — | Static D3.js page (no build step), real drag/click interaction for all 5 challenge types, live-validated via `claude_api.py`'s `/validate`/`/hint` |

`tests/` — 22 tests total: `test_validation.py`, `test_llm_client.py`,
`test_generation.py`, `test_selection.py`, `test_hints.py`,
`test_session_store.py`. All mocked, no live LLM calls, run in
milliseconds. No test file for `claude_api.py`, `demo_challenges.py`,
`session_store.py`'s use inside `claude_api.py`, or the visualizer's JS —
those were verified live/manually (see Phase log) rather than with
committed automated tests.

## What is NOT implemented yet

- **Only 2 of 5 challenge types have visualizations** (arrange_steps,
  build_it_yourself). scenario_based, multiple_choice, match_items have no
  visual, only validated by `tests/test_validation.py`'s sibling assertions
  (ad hoc, run manually — see conversation history, not committed as a
  formal test).
- **No persistence beyond `InMemorySessionStore`.** Per spec this is
  intentional for now ("Session Rules" section), but there's no database
  wiring at all yet.
- **No integration with the actual video-generation pipeline** (lesson
  planning/script/etc. mentioned in the spec's "Project Context" aren't
  in this repo/session at all — this module has no caller yet).
- ~~No test coverage for `selection.py`, `hints.py`, `session_store.py`~~ —
  **done, Phase 3.** All non-visualizer, non-`claude_api.py` modules now
  have test coverage (22 tests total, all mocked).
- **`demo.py` still bypasses `selection.py`/`generation.py` entirely**
  (hardcodes the Challenge/Ground Truth JSON). This is intentional per the
  spec's "Hardcoded Demo Requirement" and hasn't been changed.

## Known issues / gotchas for whoever works on this next

1. **`claude_api.py`'s `ask_claude()` contract has changed/broken twice now
   — `llm_client.py` is tested against it, but `claude_api.py` itself still
   has no test.** `answer` comes back as `{"raw_output": <str>}` for
   plain-text CLI replies, or as the bare parsed object when the LLM
   returns valid JSON directly (e.g. `generation.py`'s structured prompts).
   `llm_client.ask()` now handles both (fixed in Phase 1; regression-tested
   in `tests/test_llm_client.py`), but **if `claude_api.py`'s parsing logic
   changes again, re-check this contract** — nothing in `claude_api.py`
   itself guards it.
2. ~~`claude_api.py` had the entire previous version commented out at the
   bottom of the file~~ — **deleted in Phase 2** (confirmed with project
   owner first).
3. **LLM calls in this module shell out to `claude -p` via `subprocess`,
   which recursively invokes the Claude Code CLI itself** (there's no
   separate Anthropic API key — `.env`'s `API_KEY` and the hardcoded
   `API_KEY` in `claude_api.py` only authenticate requests *to*
   `claude_api.py`'s own HTTP bridge, not to Claude itself). This is slow
   (observed 13s-120s+ per call, one real timeout at the 120s cap) and its
   reliability inside a sandboxed/nested session is unproven at scale.
   Anything that calls `selection.py`/`generation.py`/`hints.py` in a loop
   (e.g. batch-generating challenges for many videos) will be slow and
   should probably raise the timeout or run outside a nested Claude
   session.
4. **Port 8080 is `claude_api.py`'s own bridge server** (`PORT = 8080` at
   module level). Don't try to serve anything else on 8080 while it's
   running — checked with `ss -ltnp`, confirmed occupied by a running
   `python3` process during this session.
5. **`contracts/*.json` was deleted** (present earlier in the session, gone
   now). It used to define a generic `{challenge_id, data}` envelope for
   ground truth/user attempt that conflicted with the flat, type-specific
   fields in `schemas/*/ground_truth_schema.json` /
   `user_attempt_schema.json`. `models.py` follows `schemas/` (the one
   `implementation_prompt.md` names as authoritative). If `contracts/`
   reappears, re-check for the same conflict.
6. **`ask_server.log` grows unbounded** (390KB+ already this session,
   `logging.FileHandler` with no rotation). Not addressed — flag if disk
   usage matters.

## Fixed bugs (for context, not action items)

- **Off-by-one in arrange_steps position reporting.** `validation.py`'s
  `_validate_arrange_steps` reported 0-based array indices as
  `expected_position`/`actual_position` instead of 1-based human-readable
  positions. Fixed; regression test in `tests/test_validation.py`.
- **`llm_client.py` `.strip()` on a dict (plain-text case).** Fixed in an
  earlier pass; regression-tested.
- **`llm_client.py` rejected valid structured-JSON LLM output.** Found in
  Phase 1: `generation.py` calls succeeded at the LLM level (4/4 captured
  payloads were valid, schema/limit-compliant JSON) but `llm_client.ask()`
  raised anyway, because a bare parsed-JSON dict (no `raw_output` wrapper)
  wasn't a shape it recognized. Fixed by re-serializing any non-`raw_output`
  dict back to a JSON string. Regression-tested in
  `tests/test_llm_client.py` and `tests/test_generation.py` using the real
  captured payloads.

## Phase log

- **Phase 1 (done):** Ran `selection.py` + `generation.py` on 5 real,
  non-hardcoded topics — one per challenge type. Selection: 5/5 correct.
  Generation: found + fixed the `llm_client.py` bug above; all 5 types
  verified end-to-end afterward (one live re-run on a 6th brand-new topic,
  Photosynthesis → arrange_steps). Added `tests/test_llm_client.py` and
  `tests/test_generation.py` (9 tests total across the repo, all passing,
  all mocked except the demo/manual live checks).
- **Phase 2 (done):** Deleted the dead duplicate block in `claude_api.py`
  (confirmed with project owner). Added `POST /validate` and `POST /hint`
  routes to `claude_api.py`'s existing server, wrapping
  `validation.validate()` / `hints.generate_hint()` as-is, reusing the
  existing Bearer-auth/CORS scaffolding. `/hint` returns the fixed success
  response directly (no LLM call) when `mistakes` is empty. Tested live
  against a throwaway server on a different port (did not touch the user's
  already-running `claude_api.py` process on 8080): auth failure (401),
  missing fields (400), a real wrong-attempt validation, a real
  correct-attempt validation, the no-LLM success shortcut, a real `/hint`
  LLM call, and confirmed `/ask` behavior is unchanged. Full test suite
  re-run clean after the edit.
- **Phase 3 (done):** Added `tests/test_selection.py` (5 tests: all 5
  allowed types accepted, whitespace/case tolerance, disallowed/empty
  answers raise `SelectionError`, prompt includes topic/summary),
  `tests/test_hints.py` (4 tests: success-response shape + fresh-copy
  semantics, hint text stripped, prompt includes challenge_type/mistakes),
  `tests/test_session_store.py` (4 tests: create/get round-trip, ordered
  attempt recording, no cross-challenge_id collision, unknown id raises
  `KeyError`). All mocked, no live LLM calls. Full suite now 22 tests,
  all green.
- **Phase 4 (done):** Real drag-and-drop interaction across all 5 challenge
  types, wired live to `/validate`/`/hint`.
  - **Spec-compliance fix found during scoping**: Phase 2's `/validate`
    took `ground_truth` straight from the request body, which is fine for
    a display-only debug view but violates the frozen rule "Ground Truth
    JSON must never be sent to frontend" once the client is a real
    interactive UI. Fixed: `claude_api.py` now seeds an
    `InMemorySessionStore` (from `session_store.py`) with the 5 demo
    challenges at import time, keyed by `challenge_id`; `/validate` now
    takes `{challenge_id, user_attempt}` only and looks up ground truth +
    `challenge_type` server-side. Added `interactive_learning/
    demo_challenges.py` as the single source of truth for the 5 demo
    challenge/ground-truth pairs (sourced verbatim from the schema example
    files) so `claude_api.py`'s seeding and the visualizer's challenge-only
    display data can't drift apart. `generate_visualizer_data.py` now
    emits challenge JSON only (no ground truth, no precomputed
    validation/hint — those are live now).
  - **Interactions built**: arrange_steps (drag-to-reorder, swap-on-drop),
    build_it_yourself (drag a wire from a node's port to another node,
    click an edge to remove it), match_items (same wire-drag, constrained
    to one outgoing match per left item), scenario_based and
    multiple_choice (click-select — no drag forced onto types that don't
    need it).
  - **Verified with real simulated mouse events**, not just static
    rendering: no chromium-cli/playwright available in this environment,
    so drove headless Chrome directly over the raw CDP WebSocket protocol
    (Node 22+'s built-in `fetch`/`WebSocket`, no extra packages) —
    `Input.dispatchMouseEvent` for actual mousePressed/mouseMoved/
    mouseReleased sequences, `Runtime.evaluate` to read DOM/result state.
    All 5 types confirmed end-to-end against a live (throwaway, not the
    user's running 8080 process) `claude_api.py` instance: arrange_steps
    swap-drag → live incorrect result; build_it_yourself two wire-drags →
    live 100/correct; match_items one right one wrong wire-drag → live
    50/incorrect with exact expected mistake keys; multiple_choice and
    scenario_based click-select → live correct/incorrect results matching
    ground truth; and a live "Get Hint" button click → real LLM hint
    rendered in-page.
  - **Found + fixed a real rendering bug via this testing**: `style.css`'s
    `.option-label { text-anchor: middle }` overrode script.js's
    `.attr("text-anchor", "start")` (CSS beats SVG presentation
    attributes), so long option labels ("Transformer", "Logistic
    Regression") rendered centered on their anchor point and bled off the
    left edge of the scrollable container — visually clipped to
    "ransformer" / "tic Regression". Fixed by changing the CSS rule to
    `text-anchor: start`; re-verified via screenshot.
  - **Known tradeoff, not fixed**: the visualizer's `API_KEY` is a
    hardcoded client-side JS constant (same demo key already in
    `claude_api.py`/`.env`). Fine for local use; this bridge has no real
    end-user auth story if it's ever exposed beyond localhost.
- **Post-Phase-4 bug fixes (done), reported directly by the project owner
  from using the live visualizer:**
  1. **Score/correct inconsistency in build_it_yourself and match_items.**
     `score` was `correct_count / len(correct)` - this ignores extra/wrong
     items entirely, so a fully-correct set plus one extra wrong connection
     scored 100 while `correct: false`. Fixed to a Jaccard-style score
     (`intersection / union`), which is 100 iff the sets are exactly equal.
     `arrange_steps` had the same gap for `extra_steps` (not subtracted from
     the score) - fixed too. Regression tests in
     `tests/test_score_consistency.py`.
  2. **Hints sometimes refused, verbatim, e.g. "I need more context to
     generate a meaningful hint... What do op1 and op2 represent?"** Root
     cause: `mistake_analysis.build_llm_input()` only sent the challenge
     type and bare mistake ids (e.g. `"selected": "op2"`) to the LLM - no
     labels, no challenge text, nothing to reason about. Fixed:
     `build_llm_input()` now enriches every id in the mistakes object with
     its real label (`"op2 (Transformer)"`) and includes the challenge's
     title/description/learning_objective. `hints.py` also now detects a
     refusal-shaped response (substring markers like "need more context",
     "please provide"), retries once with a stronger prompt, and falls back
     to a deterministic (non-LLM) label-aware hint if it refuses twice -
     the raw refusal text can never reach the user.
  3. **Hints were too generic/mechanical** ("steps 2 and 3 appear
     reversed") instead of explaining the underlying concept. Same root
     cause and same fix as #2 - with real labels/context available, the
     LLM now explains *why* (e.g. "Backpropagation needs the loss value,
     so compute the loss first"). Verified live with real LLM calls for
     arrange_steps, build_it_yourself, and scenario_based.
  - This changed the `/hint` request contract: clients now send
    `{challenge_id, mistakes}` instead of `{challenge_type, mistakes}` -
    `claude_api.py` looks up the full challenge (for labels/context) from
    `_SESSION_STORE` the same way `/validate` already did.
    `hints.generate_hint()`'s signature changed from
    `(challenge_type, mistakes)` to `(challenge, mistakes)` - updated in
    `demo.py`, `claude_api.py`, `script.js`, and `tests/test_hints.py`.
- **Phase 5 (not started, blocked on project owner):** Wiring this module
  into the actual video-generation pipeline. No caller exists in this repo.
  Per project owner: **explicitly stop here** — do not start Phase 5
  without the video-generation output this module is meant to hang off of.

## Decisions made without further design input (flag if wrong)

- Followed `schemas/` over `contracts/` for ground truth/user attempt shape
  (contracts/ has since been deleted anyway, but note in case it comes
  back with the same conflict).
- Package named `interactive_learning` (underscore) since no literal
  `interactive-learning/` directory exists and hyphens aren't valid in
  Python module names.
- Reused `claude_api.ask_claude()` as-is for all LLM calls rather than
  introducing a second LLM client — kept per user's "no workarounds,
  reuse what exists" instruction.
- ~~D3.js visualizer only covers arrange_steps and build_it_yourself~~ —
  superseded in Phase 4: now covers all 5 types with real interaction.
- scenario_based and multiple_choice are click-select, not drag — a
  deliberate choice (confirmed with project owner during Phase 4 scoping),
  not scope-cutting. arrange_steps/build_it_yourself/match_items got
  genuine drag semantics matching their natural interaction.

## How to run things

```bash
# Hardcoded end-to-end demo (arrange_steps, real LLM hint call)
python3 -m interactive_learning.demo

# Regenerate visualizer's challenge-only data.js (no LLM calls now, instant)
python3 -m interactive_learning.generate_visualizer_data

# Run claude_api.py's server (POST /ask, /validate, /hint) - required for
# the visualizer to work now, seeds 5 demo sessions with server-side ground
# truth at startup
python3 claude_api.py

# In another terminal: serve + view the visualizer
python3 -m http.server 8081 --directory interactive_learning/visualizer
# then open http://localhost:8081/index.html
# (add ?api_base=http://host:port to point at a different claude_api.py instance)

# Run the full test suite (22 tests, all mocked, ~milliseconds)
python3 -m unittest discover -s tests -v
```

## Suggested next steps (for the planning agent to evaluate, not commit to)

1. ~~Exercise `selection.py` + `generation.py` on real topics~~ — **done,
   Phase 1.** Selection 5/5 correct; generation bug found and fixed.
2. ~~Add real drag-and-drop interaction across all 5 challenge types~~ —
   **done, Phase 4.** Verified with real simulated mouse events via raw
   CDP (no chromium-cli/playwright available). One rendering bug found and
   fixed in the process (see Phase log).
3. ~~Decide on `claude_api.py`'s duplicate block + confirm the
   `answer`-as-dict contract~~ — **done, Phase 2.** Block deleted, contract
   confirmed stable and now regression-tested from the `llm_client.py`
   side (still no test on `claude_api.py` itself).
4. ~~Add test coverage for `selection.py`, `hints.py`, `session_store.py`~~
   — **done, Phase 3.**
5. Clarify how/when this module gets wired into the actual video pipeline
   (no caller exists yet in this repo). **Explicitly on hold per project
   owner** — the video-generation output this hangs off of doesn't exist
   yet. Do not start this without it.
