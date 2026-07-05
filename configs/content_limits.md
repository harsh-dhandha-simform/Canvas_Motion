# Content Limits

These limits ensure generated challenges remain simple, readable, and suitable for frontend rendering.

---

## Arrange Steps

Limits:

* Minimum steps: 3
* Maximum steps: 7

Rules:

* Steps should represent meaningful actions
* Avoid extremely small substeps
* Avoid combining multiple actions into one step
* Maintain logical order

Example:

Valid:

1. Forward Pass
2. Compute Loss
3. Backpropagation
4. Update Weights

Invalid:

1. Start
2. Forward Pass
3. Forward Pass Details
4. Forward Pass More Details
5. Continue
6. Finish

---

## Build It Yourself

Limits:

* Minimum components: 3
* Maximum components: 8
* Minimum connections: 2
* Maximum connections: 10

Rules:

* Components should represent real entities
* Components must be connectable
* Avoid excessive graph complexity

---

## Scenario Based

Limits:

* Minimum options: 3
* Maximum options: 4

Rules:

* One option should be clearly strongest
* Avoid multiple equally correct choices
* Scenario should include realistic constraints

---

## Multiple Choice

Limits:

* Minimum options: 3
* Maximum options: 4

Rules:

* Exactly one correct answer
* Avoid ambiguous wording
* Distractors should be realistic

---

## Match Items

Limits:

* Minimum pairs: 2
* Maximum pairs: 6

Rules:

* Pairs must have meaningful relationships
* Avoid repetitive mappings

---

## Global Limits

Rules:

* Maximum challenge generation time: lightweight
* Keep challenge understandable in under 30–60 seconds
* Avoid overcrowding frontend screens
* Prefer simplicity over complexity
* Do not exceed limits unless explicitly overridden
