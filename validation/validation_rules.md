# Validation Rules

## Arrange Steps

Validation Method:

* Deterministic comparison

Logic:

1. Compare `ordered_ids` from User Attempt JSON with `correct_order` from Ground Truth JSON
2. Check:

   * Missing steps
   * Wrong positions
   * Extra steps

Output:

```json
{
  "correct":false,
  "score":75,
  "mistakes":{
      "wrong_positions":[
          {
              "step_id":"s3",
              "expected_position":3,
              "actual_position":2
          }
      ]
  }
}
```

---

## Build It Yourself

Validation Method:

* Graph / connection comparison

Logic:

1. Compare `connections` with `correct_connections`
2. Check:

   * Missing connections
   * Incorrect connections
   * Extra connections

Output:

```json
{
  "correct":false,
  "score":50,
  "mistakes":{
      "missing_connections":[
          ["frontend","backend"]
      ],
      "wrong_connections":[
          ["frontend","database"]
      ]
  }
}
```

---

## Scenario Based

Validation Method:

* Option comparison

Logic:

1. Compare `selected_option` with `correct_option`

Output:

```json
{
  "correct":false,
  "score":0,
  "mistakes":{
      "selected":"op2",
      "expected":"op1"
  }
}
```

Optional future:

* LLM explanation for why choice is weak

---

## Multiple Choice

Validation Method:

* Deterministic option comparison

Logic:

1. Compare selected option with correct option

Output:

```json
{
  "correct":true,
  "score":100
}
```

---

## Match Items

Validation Method:

* Pair comparison

Logic:

1. Compare `matches` with `correct_matches`
2. Check:

   * Missing matches
   * Wrong matches
   * Extra matches

Output:

```json
{
  "correct":false,
  "score":50,
  "mistakes":{
      "wrong_matches":[
          ["l1","r2"]
      ]
  }
}
```

---

## Hint Generation Flow

Ground Truth JSON
+
User Attempt JSON
+
Validation Result
↓
Send structured mistake data to LLM
↓
Generate:

* Hint
* Explanation
* Encouragement message

Validation should remain deterministic wherever possible.
LLM should generate explanations and hints, not determine correctness.
