# Challenge Selection Rules

The LLM must choose only from predefined challenge types:

* arrange_steps
* build_it_yourself
* scenario_based
* multiple_choice
* match_items

Do not invent new challenge types.

---

## Challenge Selection Logic

### Arrange Steps

Choose when content contains:

* Sequential processes
* Workflows
* Ordered procedures
* Step-by-step explanations

Examples:

* Neural Network Training
* Photosynthesis Process
* HTTP Request Lifecycle
* Machine Learning Pipeline

Rules:

* Minimum steps: 3
* Maximum steps: 7
* Steps should represent meaningful actions
* Avoid trivial steps

---

### Build It Yourself

Choose when content contains:

* Components
* Systems
* Architecture
* Relationships between entities
* Data flow

Examples:

* Web Architecture
* ML System Design
* Database Relationships
* Computer Network Structure

Rules:

* Minimum components: 3
* Maximum components: 8
* Components must be connectable
* Connections should have a clear relationship

---

### Scenario Based

Choose when content contains:

* Decision making
* Tradeoffs
* Resource constraints
* Real-world situations

Examples:

* Model selection
* Infrastructure choices
* Algorithm selection
* Deployment decisions

Rules:

* Minimum options: 3
* Maximum options: 4
* One option should be strongest
* Avoid ambiguous choices

---

### Multiple Choice

Choose when content contains:

* Definitions
* Concept understanding
* Recall questions
* Direct factual learning

Examples:

* What is overfitting?
* Which function calculates loss?

Rules:

* Minimum options: 3
* Maximum options: 4
* Only one correct answer

---

### Match Items

Choose when content contains:

* Associations
* Relationships
* Term mappings
* Concept pairings

Examples:

* CNN → Images
* RNN → Sequential Data
* Algorithm → Use Case

Rules:

* Minimum pairs: 2
* Maximum pairs: 6
* Matches must be meaningful

---

## General Rules

* Select only one best challenge type
* Do not generate multiple challenge types simultaneously
* Prefer interactive understanding over memorization
* Keep challenge complexity proportional to lesson difficulty
* Generate output only in predefined schemas
* Never invent new schema structures
