# Interactive Learning Module — Claude Code Implementation Prompt

## Role

You are implementing the Interactive Learning module for an AI-powered educational video generation system.

Your task is implementation, not redesign.

Existing design decisions have already been finalized and should be treated as fixed unless implementation becomes impossible.

Do not introduce alternative architectures, new challenge types, or unrelated abstractions.

---

# Project Context

The overall system generates educational videos from user topics.

Current flow:

Topic/Input
↓
Lesson planning
↓
Educational script generation
↓
Visual generation
↓
Narration generation
↓
Captions/synchronization
↓
MP4 generation

After video completion:

User clicks:

**Try it yourself**

This opens an Interactive Learning screen.

The purpose of this screen is to reinforce understanding through a generated challenge.

---

# Final System Rules (Frozen)

## Challenge count

Exactly:

* 1 challenge per video

Never generate:

* challenge sets
* challenge sequences
* multiple challenges

---

## Allowed challenge types

Only these challenge types are allowed:

* arrange_steps
* build_it_yourself
* scenario_based
* multiple_choice
* match_items

Never:

* invent challenge types
* rename challenge types
* modify challenge names

---

# Challenge Selection Logic

Select exactly one challenge based on lesson content.

Rules:

### arrange_steps

Use when:

* process exists
* workflow exists
* sequence exists
* ordering matters

Examples:

* Neural network training
* HTTP request lifecycle
* Photosynthesis

Limits:

* min: 3 steps
* max: 7 steps

---

### build_it_yourself

Use when:

* components exist
* architecture exists
* relationships exist

Examples:

* frontend/backend/database
* ML architecture
* networking system

Limits:

* min: 3 components
* max: 8 components

---

### scenario_based

Use when:

* tradeoffs exist
* decision making exists
* constraints exist

Examples:

* model selection
* deployment choice

Limits:

* min: 3 options
* max: 4 options

---

### multiple_choice

Use when:

* definitions exist
* recall questions fit best
* concept understanding is direct

Limits:

* min: 3 options
* max: 4 options

---

### match_items

Use when:

* relationships exist
* associations exist
* pair mapping exists

Examples:

* CNN → Images
* RNN → Sequential Data

Limits:

* min: 2 pairs
* max: 6 pairs

---

# Three JSON Structure (Frozen)

The system uses three JSON objects.

## Challenge JSON

Purpose:

Frontend rendering only

Contains:

* challenge metadata
* UI data

Must not contain answers

---

## Ground Truth JSON

Purpose:

Hidden answer key

Used by:

* backend
* validation layer

Must never be sent to frontend

---

## User Attempt JSON

Purpose:

Store current user interaction

Used for:

* validation
* session state
* database storage later

---

# Common Challenge Envelope

All challenges must follow:

```json
{
 "challenge_id":"string",
 "challenge_type":"string",
 "title":"string",
 "description":"string",
 "difficulty":"easy|medium|hard",
 "learning_objective":"string",
 "data":{}
}
```

Only `data` changes depending on challenge type.

---

# Schema Location (Already Finalized)

Use these existing files:

```text
schemas/
├── common/
│   └── base_schema.json
│
├── arrange_steps/
│   ├── challenge_schema.json
│   ├── ground_truth_schema.json
│   └── user_attempt_schema.json
│
├── build_it_yourself/
│   ├── challenge_schema.json
│   ├── ground_truth_schema.json
│   └── user_attempt_schema.json
│
├── scenario_based/
│   ├── challenge_schema.json
│   ├── ground_truth_schema.json
│   └── user_attempt_schema.json
│
├── multiple_choice/
│   ├── challenge_schema.json
│   ├── ground_truth_schema.json
│   └── user_attempt_schema.json
│
└── match_items/
    ├── challenge_schema.json
    ├── ground_truth_schema.json
    └── user_attempt_schema.json
```

Do not modify structure without necessity.

---

# Validation Rules

Validation should be deterministic whenever possible.

## arrange_steps

Compare:

User:

```text
ordered_ids
```

against:

```text
correct_order
```

Check:

* wrong positions
* missing steps
* extra steps

---

## build_it_yourself

Compare:

```text
connections
```

against:

```text
correct_connections
```

Check:

* wrong connections
* missing connections
* extra connections

---

## scenario_based

Compare:

```text
selected_option
```

against:

```text
correct_option
```

LLM may explain mistakes but should not determine correctness.

---

## multiple_choice

Compare selected option with correct option.

---

## match_items

Compare:

```text
matches
```

against:

```text
correct_matches
```

Check:

* wrong matches
* missing matches
* extra matches

---

# Hint Flow (Frozen)

Use:

Ground Truth JSON

*

User Attempt JSON

↓

Mistake Analysis

↓

LLM Hint Generator

↓

Response

Rules:

* do not reveal full answer immediately
* provide a nudge first
* explain mistakes briefly
* remain educational
* keep output concise

Correct answer:

Return positive feedback.

---

# Session Rules

Current implementation:

Use:

* state
* session storage
* temporary storage

Later:

May move to database

Important:

State structure and future database structure should remain compatible.

Avoid unnecessary converters.

---

# Implementation Order

Follow this order exactly:

Step 1

Implement schema models

Step 2

Implement challenge selection logic

Step 3

Implement challenge generation

Step 4

Implement user interaction capture

Step 5

Implement validation logic

Step 6

Implement mistake analysis

Step 7

Implement hint generation

Step 8

Run one hardcoded end-to-end demo

---

# Hardcoded Demo Requirement

Initially hardcode one example.

Example:

Topic:

Neural Network Training

Expected flow:

Topic

↓

Challenge selected:

arrange_steps

↓

Challenge JSON generated

↓

Ground Truth JSON generated

↓

User interaction captured

↓

User Attempt JSON generated

↓

Validation

↓

Hint generation

↓

Result

Do not generalize heavily before proving the complete loop works.

---

# IMPORTANT: Missing Inputs / Credentials / Secrets

If implementation requires something only I can provide:

STOP.

Do not invent values.

Do not fake credentials.

Do not bypass the issue.

Do not create unreliable workarounds.

Examples:

* API key missing
* environment variable missing
* model endpoint missing
* token missing
* database credentials missing
* external service credentials missing
* authentication information missing

Required behavior:

1. Clearly state what is missing
2. Explain why it is needed
3. Ask me for the value
4. Add TODO placeholders if needed
5. Wait for my input

Never silently continue with fake values.

---

# Strict Do / Don't Rules

DO:

* keep implementation modular
* keep code readable
* follow existing schemas
* use stable contracts
* use deterministic validation
* keep things lightweight

DO NOT:

* redesign architecture
* create new challenge types
* modify finalized contracts
* create unnecessary abstractions
* add production deployment assumptions
* introduce speculative features

---

# Final Deliverables

Expected implementation output:

* challenge selection module
* challenge generation module
* validation module
* hint generation module
* session/state handling
* supporting configs/files
* working hardcoded demo flow

If any required information is missing, stop and request it.
