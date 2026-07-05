"""Hardcoded "chapter" challenges from tests/hardcore.md, per the lead's
request for a hardcoded demo set alongside the generated/demo ones.

Purely additive: does not modify demo_challenges.py, validation.py,
hints.py, session_store.py, or the existing visualizer. Uses the exact same
Challenge/Ground Truth JSON shapes as everything else (schemas/arrange_steps
and schemas/scenario_based) - no new schema, no new challenge types, no
changes to frozen contracts.

Each chapter has exactly 2 challenges (arrange_steps + scenario_based), per
tests/hardcore.md. The markdown's "Explanation" section is folded into
learning_objective (an existing field) rather than adding a new one - it
also gives hints.py richer context for free, since hints already use that
field.
"""

CHAPTERS = [
    {
        "chapter": 1,
        "title": "Chapter 1: The Web Request Lifecycle",
        "challenges": [
            (
                {
                    "challenge_id": "ch1_arrange",
                    "challenge_type": "arrange_steps",
                    "title": "Arrange the Web Request Lifecycle",
                    "description": "Arrange the stages of a web request in the correct execution order.",
                    "difficulty": "medium",
                    "learning_objective": (
                        "Every request follows this order: the browser receives the URL, "
                        "DNS finds the server's IP address, TCP establishes a reliable "
                        "connection, TLS encrypts communication (HTTPS), the HTTP request is "
                        "transmitted, the server executes application logic, the response is "
                        "returned, and the browser renders the page."
                    ),
                    "data": {
                        "steps": [
                            {"id": "c1", "label": "Render Page"},
                            {"id": "c2", "label": "Send HTTP Request"},
                            {"id": "c3", "label": "Resolve DNS"},
                            {"id": "c4", "label": "Receive HTTP Response"},
                            {"id": "c5", "label": "Establish TCP Connection"},
                            {"id": "c6", "label": "Perform TLS Handshake"},
                            {"id": "c7", "label": "User Enters URL"},
                            {"id": "c8", "label": "Server Processes Request"},
                        ]
                    },
                },
                {
                    "challenge_id": "ch1_arrange",
                    "correct_order": ["c7", "c3", "c5", "c6", "c2", "c8", "c4", "c1"],
                },
            ),
            (
                {
                    "challenge_id": "ch1_scenario",
                    "challenge_type": "scenario_based",
                    "title": "Slow First Page Load",
                    "description": "Identify which stage is contributing the most to a slow first-page load.",
                    "difficulty": "medium",
                    "learning_objective": (
                        "DNS resolution takes 320ms, the largest individual delay in the "
                        "timeline. Because this is the user's first visit, the browser has no "
                        "cached DNS entry and must perform a full lookup before connecting to "
                        "the server."
                    ),
                    "data": {
                        "scenario": (
                            "You open www.shop.com for the first time. The page takes 1.8 "
                            "seconds to load. Performance timeline: DNS Lookup 320ms, TCP "
                            "Connection 90ms, TLS Handshake 110ms, Server Time 60ms, Download "
                            "70ms, Rendering 150ms. Which stage is contributing the most to the "
                            "slow first-page load?"
                        ),
                        "options": [
                            {"id": "op1", "label": "Server Processing"},
                            {"id": "op2", "label": "DNS Lookup"},
                            {"id": "op3", "label": "Download Time"},
                            {"id": "op4", "label": "Rendering"},
                        ],
                    },
                },
                {"challenge_id": "ch1_scenario", "correct_option": "op2"},
            ),
        ],
    },
    {
        "chapter": 2,
        "title": "Chapter 2: Placing an Online Order",
        "challenges": [
            (
                {
                    "challenge_id": "ch2_arrange",
                    "challenge_type": "arrange_steps",
                    "title": "Arrange the Order Placement Flow",
                    "description": "Arrange the steps involved when a user places an online order.",
                    "difficulty": "medium",
                    "learning_objective": (
                        "The order is processed synchronously until it is successfully "
                        "stored. Once complete, an event is published to a message queue, "
                        "allowing the Notification Service to process it asynchronously "
                        "without delaying the user's response."
                    ),
                    "data": {
                        "steps": [
                            {"id": "c1", "label": "Notification Service sends confirmation email"},
                            {"id": "c2", "label": "Order Service stores the order"},
                            {"id": "c3", "label": "Frontend sends POST /orders"},
                            {"id": "c4", "label": "API Gateway routes the request"},
                            {"id": "c5", "label": "Order Service publishes an OrderCreated event"},
                            {"id": "c6", "label": "Message Queue receives the event"},
                        ]
                    },
                },
                {
                    "challenge_id": "ch2_arrange",
                    "correct_order": ["c3", "c4", "c2", "c5", "c6", "c1"],
                },
            ),
            (
                {
                    "challenge_id": "ch2_scenario",
                    "challenge_type": "scenario_based",
                    "title": "Choosing an API Technology",
                    "description": "Pick the best-fit communication technology for a multi-client API.",
                    "difficulty": "medium",
                    "learning_objective": (
                        "GraphQL allows the client to request only the fields it needs in a "
                        "single query. This reduces over-fetching, minimizes the number of "
                        "network requests, and is especially useful for complex UIs with "
                        "multiple frontend clients."
                    ),
                    "data": {
                        "scenario": (
                            "Your company is building a food delivery platform. Mobile app and "
                            "web app both consume the API. The home screen needs user "
                            "information, active orders, nearby restaurants, and personalized "
                            "recommendations. Mobile users have limited bandwidth. The frontend "
                            "should avoid making many API calls. Which communication technology "
                            "is the best fit?"
                        ),
                        "options": [
                            {"id": "op1", "label": "REST"},
                            {"id": "op2", "label": "GraphQL"},
                            {"id": "op3", "label": "gRPC"},
                            {"id": "op4", "label": "Direct Database Access"},
                        ],
                    },
                },
                {"challenge_id": "ch2_scenario", "correct_option": "op2"},
            ),
        ],
    },
    {
        "chapter": 3,
        "title": "Chapter 3: Scaling and Load Balancing",
        "challenges": [
            (
                {
                    "challenge_id": "ch3_arrange",
                    "challenge_type": "arrange_steps",
                    "title": "Arrange the Load-Balanced Request Flow",
                    "description": (
                        "Arrange the sequence of events that occurs when a request reaches a "
                        "horizontally scaled application."
                    ),
                    "difficulty": "medium",
                    "learning_objective": (
                        "A load balancer continuously monitors server health. When a request "
                        "arrives, it selects a healthy server using its routing algorithm. The "
                        "server processes the request and sends the response back to the "
                        "client."
                    ),
                    "data": {
                        "steps": [
                            {"id": "c1", "label": "Server processes the request"},
                            {"id": "c2", "label": "Load Balancer selects a healthy server"},
                            {"id": "c3", "label": "Health Check confirms server availability"},
                            {"id": "c4", "label": "User sends request"},
                            {"id": "c5", "label": "Response is returned to the user"},
                        ]
                    },
                },
                {
                    "challenge_id": "ch3_arrange",
                    "correct_order": ["c4", "c3", "c2", "c1", "c5"],
                },
            ),
            (
                {
                    "challenge_id": "ch3_scenario",
                    "challenge_type": "scenario_based",
                    "title": "Scaling Under Heavy Load",
                    "description": "Pick the best scaling strategy for a rapidly growing, fault-tolerant service.",
                    "difficulty": "medium",
                    "learning_objective": (
                        "Horizontal scaling distributes traffic across multiple servers, "
                        "improving capacity, fault tolerance, and availability. If one server "
                        "fails, the load balancer can redirect traffic to healthy servers, "
                        "ensuring uninterrupted service."
                    ),
                    "data": {
                        "scenario": (
                            "Your startup has grown rapidly. Current traffic: 150,000 "
                            "concurrent users. CPU utilization on the server is consistently "
                            "above 95%. Upgrading to a larger machine is becoming increasingly "
                            "expensive. The application must remain available even if one "
                            "server fails. What is the best solution?"
                        ),
                        "options": [
                            {"id": "op1", "label": "Upgrade to a larger server (Vertical Scaling)"},
                            {"id": "op2", "label": "Add multiple servers behind a Load Balancer (Horizontal Scaling)"},
                            {"id": "op3", "label": "Increase RAM only"},
                            {"id": "op4", "label": "Disable health checks to improve performance"},
                        ],
                    },
                },
                {"challenge_id": "ch3_scenario", "correct_option": "op2"},
            ),
        ],
    },
]

# Flat list of (challenge, ground_truth) tuples - convenient for seeding a
# session store without caring about chapter grouping.
CHAPTER_CHALLENGES = [pair for chapter in CHAPTERS for pair in chapter["challenges"]]
