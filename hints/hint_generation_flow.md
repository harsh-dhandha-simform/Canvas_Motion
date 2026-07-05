# Hint Generation Flow

## Flow

Ground Truth JSON
+
User Attempt JSON
↓
Validation Engine
↓
Mistake Analysis
↓
LLM Hint Generator
↓
Return:

* Hint
* Explanation
* Success/encouragement message

---

## Step 1: Compare Ground Truth with User Attempt

Inputs:

Ground Truth:

```json
{
  "correct_order":["s1","s2","s3","s4"]
}
```

User Attempt:

```json
{
  "ordered_ids":["s1","s3","s2","s4"]
}
```

---

## Step 2: Generate Structured Mistake Object

Example:

```json
{
  "wrong_positions":[
    {
      "step_id":"s3",
      "expected_position":3,
      "actual_position":2
    }
  ]
}
```

or

```json
{
  "wrong_connections":[
      ["frontend","database"]
  ],

  "missing_connections":[
      ["frontend","backend"]
  ]
}
```

---

## Step 3: Send Mistake Object to LLM

Prompt structure:

System:

"You are an educational assistant generating hints."

Rules:

* Do not directly reveal the answer
* Give a small nudge first
* Explain concept if needed
* Mention likely mistake area only
* Keep hints concise

Input:

```json
{
  "challenge_type":"arrange_steps",
  "mistakes":{}
}
```

---

## Step 4: Return Response

Example:

Attempt 1:

"Think about what happens immediately after loss calculation."

Attempt 2:

"Two middle steps appear to be swapped."

Attempt 3:

"Backpropagation occurs before updating weights."

---

## Success Response

If correct:

```json
{
   "correct":true,
   "message":"Great job! You correctly completed the challenge."
}
```
