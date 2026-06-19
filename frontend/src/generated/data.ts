import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadCodeFont } from "@remotion/google-fonts/FiraCode";

export const FONT = loadFont();
export const CODE_FONT = loadCodeFont();

export const FPS = 30;
export const TOTAL_FRAMES = 3600;

export const SCENES = [
  {
    "sceneIndex": 0,
    "title": "The Ticketing Nightmare: Lost Sales During Peak Demand",
    "narration": "When a popular event goes on sale, ticketing systems face a sudden surge in requests, often leading to lost sales and frustrated customers. This is due to the inherent limitations of traditional single-server architectures, which struggle to scale under extreme loads. To mitigate this, systems can employ load balancing techniques, such as round-robin or least connections, to distribute incoming traffic across multiple servers. However, this alone is insufficient, as it does not address the underlying issue of resource contention. As a result, ticketing systems must be designed with scalability and concurrency in mind from the outset. For instance, Netflix's architecture is designed to handle massive traffic spikes during new releases, utilizing a combination of load balancing, caching, and distributed databases.",
    "keyPoints": [
      "Scalability",
      "Concurrency",
      "Load Balancing",
      "Distributed Databases"
    ],
    "technicalTerms": [
      "Load Balancing",
      "Round-Robin",
      "Least Connections"
    ],
    "codeSnippet": null,
    "timing": {
      "startFrame": 0,
      "durationFrames": 420,
      "introHoldFrames": 30,
      "outroHoldFrames": 20,
      "subtitleChunks": [
        {
          "text": "Ticketing systems face a sudden surge",
          "startFrame": 30,
          "durationFrames": 120
        },
        {
          "text": "in requests, often leading to lost sales",
          "startFrame": 150,
          "durationFrames": 120
        },
        {
          "text": "and frustrated customers due to limitations",
          "startFrame": 270,
          "durationFrames": 120
        }
      ]
    }
  },
  {
    "sceneIndex": 1,
    "title": "Na\u00efve Single-Server Booking: Why It Crashes Under Load",
    "narration": "A naive single-server booking system, where all requests are processed sequentially, will inevitably crash under high load due to the fundamental limitations of sequential processing. As the request queue grows, the system becomes increasingly unresponsive, leading to timeouts and failed transactions. This is because the system is unable to process requests concurrently, resulting in a bottleneck. In contrast, distributed systems, such as those employed by Ticketmaster, can process multiple requests in parallel, significantly improving throughput and reducing the likelihood of crashes. To achieve this, systems can utilize message queues, such as Apache Kafka or RabbitMQ, to handle incoming requests and distribute them across multiple worker nodes.",
    "keyPoints": [
      "Sequential Processing",
      "Concurrency",
      "Distributed Systems"
    ],
    "technicalTerms": [
      "Message Queues",
      "Worker Nodes"
    ],
    "codeSnippet": null,
    "timing": {
      "startFrame": 420,
      "durationFrames": 540,
      "introHoldFrames": 30,
      "outroHoldFrames": 20,
      "subtitleChunks": [
        {
          "text": "A naive single-server booking system",
          "startFrame": 30,
          "durationFrames": 120
        },
        {
          "text": "will inevitably crash under high load",
          "startFrame": 150,
          "durationFrames": 120
        },
        {
          "text": "due to the fundamental limitations of sequential processing",
          "startFrame": 270,
          "durationFrames": 120
        }
      ]
    }
  },
  {
    "sceneIndex": 2,
    "title": "Atomic Seat Allocation with Distributed Locks",
    "narration": "To ensure atomicity in seat allocation, distributed locks can be employed to prevent concurrent modifications to the same resource. This is achieved through the use of lock tokens, which are acquired by a node before modifying the resource. If a node fails to acquire the lock, it must retry or abort the operation. Distributed locks, such as RedLock or ZAB, provide a mechanism for nodes to agree on a single value, ensuring that only one node can modify the resource at a time. For example, in a distributed database like Cassandra, distributed locks are used to ensure that only one node can update a particular row, preventing inconsistencies and ensuring data integrity.",
    "keyPoints": [
      "Atomicity",
      "Distributed Locks",
      "Lock Tokens"
    ],
    "technicalTerms": [
      "RedLock",
      "ZAB"
    ],
    "codeSnippet": "lock_token = acquire_lock('seat_123')\nif lock_token:\n    # modify seat allocation\n    release_lock('seat_123', lock_token)",
    "timing": {
      "startFrame": 960,
      "durationFrames": 630,
      "introHoldFrames": 45,
      "outroHoldFrames": 20,
      "subtitleChunks": [
        {
          "text": "To ensure atomicity in seat allocation",
          "startFrame": 45,
          "durationFrames": 120
        },
        {
          "text": "distributed locks can be employed to prevent",
          "startFrame": 165,
          "durationFrames": 120
        },
        {
          "text": "concurrent modifications to the same resource",
          "startFrame": 285,
          "durationFrames": 120
        }
      ]
    }
  },
  {
    "sceneIndex": 3,
    "title": "Inventory Management via Optimistic Concurrency",
    "narration": "Optimistic concurrency control is a strategy for managing inventory, where multiple nodes can read the current state of the inventory, but only one node can successfully update it. This is achieved through the use of version numbers or timestamps, which are checked before updating the inventory. If a node detects a conflict, it must retry or abort the operation. Optimistic concurrency control is particularly useful in systems where read operations outnumber write operations, such as in a ticketing system where seats are frequently queried but rarely updated. For instance, Eventbrite's system utilizes optimistic concurrency control to manage inventory, ensuring that only one node can update the availability of a particular seat.",
    "keyPoints": [
      "Optimistic Concurrency",
      "Version Numbers",
      "Timestamps"
    ],
    "technicalTerms": [
      "Version Numbers",
      "Timestamps"
    ],
    "codeSnippet": "version = get_version('seat_123')\nif version == expected_version:\n    # update seat allocation\n    update_version('seat_123', version + 1)",
    "timing": {
      "startFrame": 1590,
      "durationFrames": 450,
      "introHoldFrames": 20,
      "outroHoldFrames": 20,
      "subtitleChunks": [
        {
          "text": "Optimistic concurrency control is a strategy",
          "startFrame": 20,
          "durationFrames": 120
        },
        {
          "text": "for managing inventory where multiple nodes",
          "startFrame": 140,
          "durationFrames": 120
        },
        {
          "text": "can read the current state of the inventory",
          "startFrame": 260,
          "durationFrames": 120
        }
      ]
    }
  },
  {
    "sceneIndex": 4,
    "title": "Eventual Consistency vs Strong Consistency in Seat Availability",
    "narration": "Eventual consistency and strong consistency are two fundamentally different approaches to ensuring data consistency in a distributed system. Eventual consistency allows nodes to temporarily disagree on the state of the system, while strong consistency requires all nodes to agree on the state before proceeding. In a ticketing system, eventual consistency may be acceptable for read-heavy operations, such as querying seat availability, but strong consistency is necessary for write-heavy operations, such as updating seat allocation. For example, a system like Amazon's DynamoDB may employ eventual consistency for read operations, but use strong consistency for write operations to ensure data integrity.",
    "keyPoints": [
      "Eventual Consistency",
      "Strong Consistency",
      "Data Integrity"
    ],
    "technicalTerms": [
      "Eventual Consistency",
      "Strong Consistency"
    ],
    "codeSnippet": null,
    "timing": {
      "startFrame": 2040,
      "durationFrames": 540,
      "introHoldFrames": 20,
      "outroHoldFrames": 20,
      "subtitleChunks": [
        {
          "text": "Eventual consistency and strong consistency",
          "startFrame": 20,
          "durationFrames": 120
        },
        {
          "text": "are two fundamentally different approaches",
          "startFrame": 140,
          "durationFrames": 120
        },
        {
          "text": "to ensuring data consistency in a distributed system",
          "startFrame": 260,
          "durationFrames": 120
        }
      ]
    }
  },
  {
    "sceneIndex": 5,
    "title": "Queue-Based Reservation Pipeline and Back\u2011Pressure",
    "narration": "A queue-based reservation pipeline is a design pattern that allows for the decoupling of request processing from response generation. This is achieved through the use of message queues, such as Apache Kafka or RabbitMQ, which handle incoming requests and distribute them across multiple worker nodes. However, if the queue grows too large, back-pressure can occur, causing the system to become unresponsive. To mitigate this, systems can employ techniques such as flow control or load shedding to prevent the queue from growing too large. For instance, a system like Ticketmaster's may utilize a queue-based pipeline to handle incoming requests, but also employ flow control to prevent back-pressure and ensure responsive performance.",
    "keyPoints": [
      "Queue-Based Pipeline",
      "Back-Pressure",
      "Flow Control"
    ],
    "technicalTerms": [
      "Message Queues",
      "Flow Control"
    ],
    "codeSnippet": "queue = create_queue('reservations')\nwhile True:\n    request = queue.get()\n    # process request\n    queue.ack(request)",
    "timing": {
      "startFrame": 2580,
      "durationFrames": 630,
      "introHoldFrames": 30,
      "outroHoldFrames": 20,
      "subtitleChunks": [
        {
          "text": "A queue-based reservation pipeline is a design",
          "startFrame": 30,
          "durationFrames": 120
        },
        {
          "text": "pattern that allows for the decoupling of request",
          "startFrame": 150,
          "durationFrames": 120
        },
        {
          "text": "processing from response generation",
          "startFrame": 270,
          "durationFrames": 120
        }
      ]
    }
  },
  {
    "sceneIndex": 6,
    "title": "Idempotent Reservation API and Idempotency Keys",
    "narration": "An idempotent reservation API is one that can be safely retried without causing unintended side effects. This is achieved through the use of idempotency keys, which uniquely identify each request and prevent duplicate processing. Idempotency keys can be implemented using techniques such as token-based idempotence or request-based idempotence. For example, a system like Eventbrite's may employ idempotent APIs to handle reservation requests, using idempotency keys to prevent duplicate processing and ensure data integrity.",
    "keyPoints": [
      "Idempotent API",
      "Idempotency Keys",
      "Token-Based Idempotence"
    ],
    "technicalTerms": [
      "Idempotency Keys",
      "Token-Based Idempotence"
    ],
    "codeSnippet": "idempotency_key = generate_idempotency_key()\nrequest = create_request('reservation', idempotency_key)\n# send request",
    "timing": {
      "startFrame": 3210,
      "durationFrames": 450,
      "introHoldFrames": 20,
      "outroHoldFrames": 20,
      "subtitleChunks": [
        {
          "text": "An idempotent reservation API is one that can",
          "startFrame": 20,
          "durationFrames": 120
        },
        {
          "text": "be safely retried without causing unintended",
          "startFrame": 140,
          "durationFrames": 120
        },
        {
          "text": "side effects through the use of idempotency keys",
          "startFrame": 260,
          "durationFrames": 120
        }
      ]
    }
  },
  {
    "sceneIndex": 7,
    "title": "Caching Strategies for Read\u2011Heavy Ticket Queries",
    "narration": "Caching is a technique used to improve the performance of read-heavy systems by storing frequently accessed data in a fast, in-memory cache. In a ticketing system, caching can be used to store seat availability, pricing, and other frequently queried data. However, caching introduces complexities such as cache invalidation and consistency, which must be carefully managed to ensure data integrity. For example, a system like Netflix's may employ caching to improve performance, using techniques such as time-to-live (TTL) or least-recently-used (LRU) to manage cache invalidation.",
    "keyPoints": [
      "Caching",
      "Cache Invalidation",
      "Consistency"
    ],
    "technicalTerms": [
      "Cache Invalidation",
      "TTL",
      "LRU"
    ],
    "codeSnippet": "cache = create_cache('seat_availability')\n# store data in cache\n# set TTL or LRU policy",
    "timing": {
      "startFrame": 3660,
      "durationFrames": 540,
      "introHoldFrames": 20,
      "outroHoldFrames": 20,
      "subtitleChunks": [
        {
          "text": "Caching is a technique used to improve the",
          "startFrame": 20,
          "durationFrames": 120
        },
        {
          "text": "performance of read-heavy systems by storing",
          "startFrame": 140,
          "durationFrames": 120
        },
        {
          "text": "frequently accessed data in a fast, in-memory cache",
          "startFrame": 260,
          "durationFrames": 120
        }
      ]
    }
  },
  {
    "sceneIndex": 8,
    "title": "Trade\u2011offs: Latency, Consistency, Availability, and Cost",
    "narration": "When designing a distributed system, trade-offs must be made between latency, consistency, availability, and cost. The CAP theorem states that it is impossible to achieve all three of consistency, availability, and partition tolerance simultaneously. As a result, system designers must carefully evaluate the requirements of their system and make trade-offs accordingly. For example, a system like Amazon's may prioritize consistency and availability over latency, while a system like Google's may prioritize latency and availability over consistency. Ultimately, the choice of trade-offs will depend on the specific use case and requirements of the system.",
    "keyPoints": [
      "Latency",
      "Consistency",
      "Availability",
      "Cost"
    ],
    "technicalTerms": [
      "CAP Theorem",
      "Partition Tolerance"
    ],
    "codeSnippet": null,
    "timing": {
      "startFrame": 4200,
      "durationFrames": 630,
      "introHoldFrames": 30,
      "outroHoldFrames": 20,
      "subtitleChunks": [
        {
          "text": "When designing a distributed system, trade-offs",
          "startFrame": 30,
          "durationFrames": 120
        },
        {
          "text": "must be made between latency, consistency,",
          "startFrame": 150,
          "durationFrames": 120
        },
        {
          "text": "availability, and cost",
          "startFrame": 270,
          "durationFrames": 120
        }
      ]
    }
  },
  {
    "sceneIndex": 9,
    "title": "Real\u2011World Implementations: Netflix, Ticketmaster, and Eventbrite",
    "narration": "Real-world systems such as Netflix, Ticketmaster, and Eventbrite have implemented various design patterns and trade-offs to achieve high performance, scalability, and reliability. For example, Netflix's architecture is designed to handle massive traffic spikes during new releases, utilizing a combination of load balancing, caching, and distributed databases. Ticketmaster's system, on the other hand, employs a queue-based pipeline to handle incoming requests, while Eventbrite's system utilizes optimistic concurrency control to manage inventory. By studying these real-world implementations, system designers can gain valuable insights and lessons for designing their own distributed systems.",
    "keyPoints": [
      "Netflix",
      "Ticketmaster",
      "Eventbrite",
      "Real-World Implementations"
    ],
    "technicalTerms": [
      "Load Balancing",
      "Caching",
      "Distributed Databases"
    ],
    "codeSnippet": null,
    "timing": {
      "startFrame": 4830,
      "durationFrames": 450,
      "introHoldFrames": 20,
      "outroHoldFrames": 20,
      "subtitleChunks": [
        {
          "text": "Real-world systems such as Netflix, Ticketmaster,",
          "startFrame": 20,
          "durationFrames": 120
        },
        {
          "text": "and Eventbrite have implemented various design",
          "startFrame": 140,
          "durationFrames": 120
        },
        {
          "text": "patterns and trade-offs to achieve high performance",
          "startFrame": 260,
          "durationFrames": 120
        }
      ]
    }
  }
];
