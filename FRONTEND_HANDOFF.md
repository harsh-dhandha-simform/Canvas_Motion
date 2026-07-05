# Interactive Learning — Frontend Handoff

Everything a frontend engineer needs to build the "Try it yourself"
challenge UI. Self-contained — no need to read our backend code.

## The one rule that shapes everything

**The correct answer never reaches you.** You get a Challenge JSON, you
send back what the user did, the server tells you if it's right. You never
receive and never need the correct order/connections/option/matches.

## 1. Connection details

```
Base URL:  http://localhost:8080
API Key:   kvjabksjhlgflajkrfgwajbfsashrtahrt
```

Every request needs this header:
```
Authorization: Bearer kvjabksjhlgflajkrfgwajbfsashrtahrt
Content-Type: application/json
```

This is a shared demo key, fine for internal/local use. Not a real
per-user auth story — flag it if this ever ships beyond an internal demo.

If the backend isn't running on the same machine as your frontend, ask for
the actual reachable URL — `localhost` won't work across machines.

## 2. The challenges that exist right now

You can only build/test against these 11 `challenge_id`s — anything else
returns 404. Each one's full Challenge JSON is in section 5 below.

| challenge_id | challenge_type |
|---|---|
| `arr_001` | arrange_steps |
| `build_001` | build_it_yourself |
| `scenario_001` | scenario_based |
| `mcq_001` | multiple_choice |
| `match_001` | match_items |
| `ch1_arrange` | arrange_steps |
| `ch1_scenario` | scenario_based |
| `ch2_arrange` | arrange_steps |
| `ch2_scenario` | scenario_based |
| `ch3_arrange` | arrange_steps |
| `ch3_scenario` | scenario_based |

There is no `GET /challenge/{id}` endpoint yet — you can't fetch these
live. Copy the JSON you need from section 5 directly into your app (or ask
for more challenge_ids/content to be added).

## 3. Rendering a challenge (`data` shape per type)

| Type | `data` contains | What the user does |
|---|---|---|
| `arrange_steps` | `steps: [{id, label}, ...]` | Reorder the steps |
| `build_it_yourself` | `components: [{id, label}, ...]` | Draw directed connections between components |
| `scenario_based` | `scenario: string, options: [{id, label}, ...]` | Pick one option |
| `multiple_choice` | `question: string, options: [{id, label}, ...]` | Pick one option |
| `match_items` | `left: [{id, label}, ...], right: [{id, label}, ...]` | Pair each left item with a right item |

**Important:** for `arrange_steps`, `steps` arrives in the *correct* order.
Shuffle it yourself before displaying — showing it as-is gives the answer
away.

## 4. Submitting an attempt

```
POST /validate
Authorization: Bearer kvjabksjhlgflajkrfgwajbfsashrtahrt
Content-Type: application/json

{
  "challenge_id": "arr_001",
  "user_attempt": { ... shape below, based on challenge_type ... }
}
```

| Type | `user_attempt` shape |
|---|---|
| `arrange_steps` | `{"challenge_id": "...", "ordered_ids": ["s2","s1","s3"]}` |
| `build_it_yourself` | `{"challenge_id": "...", "connections": [["frontend","backend"], ...]}` — **direction matters**: `[a,b]` = user drew a line from a to b. Render an arrowhead. |
| `scenario_based` / `multiple_choice` | `{"challenge_id": "...", "selected_option": "op2"}` |
| `match_items` | `{"challenge_id": "...", "matches": [["l1","r2"], ...]}` |

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

- `correct` → green/red state.
- `score` → 0-100. Always `100` when `correct` is `true`, always `<100` when `false`.
- `mistakes` → use it to highlight what's wrong (color the bad connection, etc.), don't just dump it as JSON to the user.

`mistakes` shapes by type:

| Type | Keys |
|---|---|
| `arrange_steps` | `wrong_positions: [{step_id, expected_position, actual_position}]`, `missing_steps: [id, ...]`, `extra_steps: [id, ...]` |
| `build_it_yourself` | `missing_connections: [[a,b], ...]`, `wrong_connections: [[a,b], ...]` |
| `scenario_based` / `multiple_choice` | `selected: id, expected: id` |
| `match_items` | `missing_matches: [[l,r], ...]`, `wrong_matches: [[l,r], ...]` |

If `correct` is `true`: show success, stop — don't call `/hint`.

## 5. Getting a hint (only when `correct` is `false`)

```
POST /hint
Authorization: Bearer kvjabksjhlgflajkrfgwajbfsashrtahrt
Content-Type: application/json

{
  "challenge_id": "arr_001",
  "mistakes": { ... exactly the "mistakes" object from /validate, unmodified ... }
}
```

**Response:**
```json
{ "success": true, "hint": "Should the frontend really talk to the database directly, or is there a layer that usually sits in between?" }
```

**Implementation requirements:**
- Field is `challenge_id`, not `challenge_type`.
- Pass `mistakes` through exactly as received — don't reformat it.
- **This is a real AI call — 5 seconds to ~2 minutes.** Disable the button, show "Thinking...", don't block the rest of the page, don't time out early.
- On error: `{"success": false, "error": "..."}` — show it, re-enable the button.
- Only fire on explicit user click, never automatically.

## 6. The whole flow, start to finish

```
1. You have a Challenge JSON (section 5's list, or ask for more)
2. User interacts → you build user_attempt (section 4's table)
3. POST /validate → { correct, score, mistakes }
4. If correct: show success, done.
   If not: show mistakes, offer "Get Hint" → POST /hint → show hint text
5. Let user retry → back to step 2
```

## 7. The 11 Challenge JSONs

```json
[
  {
    "challenge_id": "arr_001",
    "challenge_type": "arrange_steps",
    "title": "Neural Network Training",
    "description": "Arrange the steps correctly",
    "difficulty": "easy",
    "learning_objective": "Understand training flow",
    "data": {
      "steps": [
        { "id": "s1", "label": "Forward Pass" },
        { "id": "s2", "label": "Compute Loss" },
        { "id": "s3", "label": "Backpropagation" },
        { "id": "s4", "label": "Update Weights" }
      ]
    }
  },
  {
    "challenge_id": "build_001",
    "challenge_type": "build_it_yourself",
    "title": "Build Web Architecture",
    "description": "Connect components",
    "difficulty": "medium",
    "learning_objective": "Understand architecture flow",
    "data": {
      "components": [
        { "id": "frontend", "label": "Frontend" },
        { "id": "backend", "label": "Backend" },
        { "id": "database", "label": "Database" }
      ]
    }
  },
  {
    "challenge_id": "scenario_001",
    "challenge_type": "scenario_based",
    "title": "Choose Best Model",
    "description": "Select best option",
    "difficulty": "medium",
    "learning_objective": "Model selection",
    "data": {
      "scenario": "500 images with limited GPU and high accuracy needed",
      "options": [
        { "id": "op1", "label": "CNN" },
        { "id": "op2", "label": "Transformer" },
        { "id": "op3", "label": "Logistic Regression" }
      ]
    }
  },
  {
    "challenge_id": "mcq_001",
    "challenge_type": "multiple_choice",
    "title": "Neural Networks",
    "description": "Choose the correct answer",
    "difficulty": "easy",
    "learning_objective": "Concept understanding",
    "data": {
      "question": "Which function calculates error?",
      "options": [
        { "id": "a", "label": "Loss Function" },
        { "id": "b", "label": "Optimizer" },
        { "id": "c", "label": "Activation Function" }
      ]
    }
  },
  {
    "challenge_id": "match_001",
    "challenge_type": "match_items",
    "title": "Match Terms",
    "description": "Connect related items",
    "difficulty": "easy",
    "learning_objective": "Concept association",
    "data": {
      "left": [
        { "id": "l1", "label": "CNN" },
        { "id": "l2", "label": "RNN" }
      ],
      "right": [
        { "id": "r1", "label": "Images" },
        { "id": "r2", "label": "Sequential Data" }
      ]
    }
  },
  {
    "challenge_id": "ch1_arrange",
    "challenge_type": "arrange_steps",
    "title": "Arrange the Web Request Lifecycle",
    "description": "Arrange the stages of a web request in the correct execution order.",
    "difficulty": "medium",
    "learning_objective": "Every request follows this order: the browser receives the URL, DNS finds the server's IP address, TCP establishes a reliable connection, TLS encrypts communication (HTTPS), the HTTP request is transmitted, the server executes application logic, the response is returned, and the browser renders the page.",
    "data": {
      "steps": [
        { "id": "c1", "label": "Render Page" },
        { "id": "c2", "label": "Send HTTP Request" },
        { "id": "c3", "label": "Resolve DNS" },
        { "id": "c4", "label": "Receive HTTP Response" },
        { "id": "c5", "label": "Establish TCP Connection" },
        { "id": "c6", "label": "Perform TLS Handshake" },
        { "id": "c7", "label": "User Enters URL" },
        { "id": "c8", "label": "Server Processes Request" }
      ]
    }
  },
  {
    "challenge_id": "ch1_scenario",
    "challenge_type": "scenario_based",
    "title": "Slow First Page Load",
    "description": "Identify which stage is contributing the most to a slow first-page load.",
    "difficulty": "medium",
    "learning_objective": "DNS resolution takes 320ms, the largest individual delay in the timeline. Because this is the user's first visit, the browser has no cached DNS entry and must perform a full lookup before connecting to the server.",
    "data": {
      "scenario": "You open www.shop.com for the first time. The page takes 1.8 seconds to load. Performance timeline: DNS Lookup 320ms, TCP Connection 90ms, TLS Handshake 110ms, Server Time 60ms, Download 70ms, Rendering 150ms. Which stage is contributing the most to the slow first-page load?",
      "options": [
        { "id": "op1", "label": "Server Processing" },
        { "id": "op2", "label": "DNS Lookup" },
        { "id": "op3", "label": "Download Time" },
        { "id": "op4", "label": "Rendering" }
      ]
    }
  },
  {
    "challenge_id": "ch2_arrange",
    "challenge_type": "arrange_steps",
    "title": "Arrange the Order Placement Flow",
    "description": "Arrange the steps involved when a user places an online order.",
    "difficulty": "medium",
    "learning_objective": "The order is processed synchronously until it is successfully stored. Once complete, an event is published to a message queue, allowing the Notification Service to process it asynchronously without delaying the user's response.",
    "data": {
      "steps": [
        { "id": "c1", "label": "Notification Service sends confirmation email" },
        { "id": "c2", "label": "Order Service stores the order" },
        { "id": "c3", "label": "Frontend sends POST /orders" },
        { "id": "c4", "label": "API Gateway routes the request" },
        { "id": "c5", "label": "Order Service publishes an OrderCreated event" },
        { "id": "c6", "label": "Message Queue receives the event" }
      ]
    }
  },
  {
    "challenge_id": "ch2_scenario",
    "challenge_type": "scenario_based",
    "title": "Choosing an API Technology",
    "description": "Pick the best-fit communication technology for a multi-client API.",
    "difficulty": "medium",
    "learning_objective": "GraphQL allows the client to request only the fields it needs in a single query. This reduces over-fetching, minimizes the number of network requests, and is especially useful for complex UIs with multiple frontend clients.",
    "data": {
      "scenario": "Your company is building a food delivery platform. Mobile app and web app both consume the API. The home screen needs user information, active orders, nearby restaurants, and personalized recommendations. Mobile users have limited bandwidth. The frontend should avoid making many API calls. Which communication technology is the best fit?",
      "options": [
        { "id": "op1", "label": "REST" },
        { "id": "op2", "label": "GraphQL" },
        { "id": "op3", "label": "gRPC" },
        { "id": "op4", "label": "Direct Database Access" }
      ]
    }
  },
  {
    "challenge_id": "ch3_arrange",
    "challenge_type": "arrange_steps",
    "title": "Arrange the Load-Balanced Request Flow",
    "description": "Arrange the sequence of events that occurs when a request reaches a horizontally scaled application.",
    "difficulty": "medium",
    "learning_objective": "A load balancer continuously monitors server health. When a request arrives, it selects a healthy server using its routing algorithm. The server processes the request and sends the response back to the client.",
    "data": {
      "steps": [
        { "id": "c1", "label": "Server processes the request" },
        { "id": "c2", "label": "Load Balancer selects a healthy server" },
        { "id": "c3", "label": "Health Check confirms server availability" },
        { "id": "c4", "label": "User sends request" },
        { "id": "c5", "label": "Response is returned to the user" }
      ]
    }
  },
  {
    "challenge_id": "ch3_scenario",
    "challenge_type": "scenario_based",
    "title": "Scaling Under Heavy Load",
    "description": "Pick the best scaling strategy for a rapidly growing, fault-tolerant service.",
    "difficulty": "medium",
    "learning_objective": "Horizontal scaling distributes traffic across multiple servers, improving capacity, fault tolerance, and availability. If one server fails, the load balancer can redirect traffic to healthy servers, ensuring uninterrupted service.",
    "data": {
      "scenario": "Your startup has grown rapidly. Current traffic: 150,000 concurrent users. CPU utilization on the server is consistently above 95%. Upgrading to a larger machine is becoming increasingly expensive. The application must remain available even if one server fails. What is the best solution?",
      "options": [
        { "id": "op1", "label": "Upgrade to a larger server (Vertical Scaling)" },
        { "id": "op2", "label": "Add multiple servers behind a Load Balancer (Horizontal Scaling)" },
        { "id": "op3", "label": "Increase RAM only" },
        { "id": "op4", "label": "Disable health checks to improve performance" }
      ]
    }
  }
]
```

## 8. What you'll never get, and shouldn't ask for

- Correct order/connections/option/matches — ground truth stays server-side.
- Anything beyond what's in `mistakes` (section 4) for describing an error.
