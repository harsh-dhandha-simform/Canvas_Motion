# 🚀 Chapter 1 Challenge

# Challenge 2: Arrange Steps

## Objective

Arrange the stages of a web request in the correct execution order.

### Shuffled Cards

- Render Page
- Send HTTP Request
- Resolve DNS
- Receive HTTP Response
- Establish TCP Connection
- Perform TLS Handshake
- User Enters URL
- Server Processes Request

---

### Correct Order

1. User Enters URL
2. Resolve DNS
3. Establish TCP Connection
4. Perform TLS Handshake
5. Send HTTP Request
6. Server Processes Request
7. Receive HTTP Response
8. Render Page

---

### AI Evaluation

The AI should identify:

- First incorrect step
- Missing steps
- Steps placed too early or too late
- Overall accuracy score

---

### Explanation

Every request follows this order:

1. Browser receives the URL.
2. DNS finds the server's IP address.
3. TCP establishes a reliable connection.
4. TLS encrypts communication (HTTPS).
5. HTTP request is transmitted.
6. Server executes application logic.
7. Response is returned.
8. Browser renders the page.

---

# Challenge 3: Scenario Based

## Scenario

You open **www.shop.com** for the first time.

The page takes **1.8 seconds** to load.

The performance timeline shows:

```
DNS Lookup       320 ms
TCP Connection    90 ms
TLS Handshake    110 ms
Server Time       60 ms
Download          70 ms
Rendering        150 ms
```

### Question

Which stage is contributing the most to the slow first-page load?

### Options

A. Server Processing

B. DNS Lookup

C. Download Time

D. Rendering

---

### Correct Answer

✅ **B. DNS Lookup**

---

### Explanation

DNS resolution takes **320 ms**, which is the largest individual delay in the timeline. Because this is the user's first visit, the browser has no cached DNS entry and must perform a full lookup before connecting to the server.
=======================================================================
🚀 Chapter 2 Challenge
# Challenge 2: Arrange Steps

## Objective

Arrange the steps involved when a user places an online order.

### Shuffled Cards

- Notification Service sends confirmation email
- Order Service stores the order
- Frontend sends POST `/orders`
- API Gateway routes the request
- Order Service publishes an OrderCreated event
- Message Queue receives the event

---

### Correct Order

1. Frontend sends POST `/orders`
2. API Gateway routes the request
3. Order Service stores the order
4. Order Service publishes an OrderCreated event
5. Message Queue receives the event
6. Notification Service sends confirmation email

---

### AI Evaluation

The AI should detect:

- Incorrect ordering
- Missing steps
- Misplaced asynchronous communication
- Overall completion score

---

### Explanation

The order is processed synchronously until it is successfully stored. Once complete, an event is published to a message queue, allowing the Notification Service to process it asynchronously without delaying the user's response.

---

# Challenge 3: Scenario Based

## Scenario

Your company is building a food delivery platform.

Requirements:

- Mobile app and web app both consume the API.
- The home screen needs user information, active orders, nearby restaurants, and personalized recommendations.
- Mobile users have limited bandwidth.
- The frontend should avoid making many API calls.

Which communication technology is the best fit?

### Options

A. REST

B. GraphQL

C. gRPC

D. Direct Database Access

---

### Correct Answer

✅ **B. GraphQL**

---

### Explanation

GraphQL allows the client to request only the fields it needs in a single query. This reduces over-fetching, minimizes the number of network requests, and is especially useful for complex UIs with multiple frontend clients.
====================================================================
🚀 Chapter 3 Challenge
# Challenge 2: Arrange Steps

## Objective

Arrange the sequence of events that occurs when a request reaches a horizontally scaled application.

### Shuffled Cards

- Server processes the request
- Load Balancer selects a healthy server
- Health Check confirms server availability
- User sends request
- Response is returned to the user

---

### Correct Order

1. User sends request
2. Health Check confirms server availability
3. Load Balancer selects a healthy server
4. Server processes the request
5. Response is returned to the user

---

### AI Evaluation

The AI should identify:

- Incorrect ordering
- Missing steps
- Whether the learner understands the role of health checks
- Overall completion score

---

### Explanation

A load balancer continuously monitors server health. When a request arrives, it selects a healthy server using its routing algorithm. The server processes the request and sends the response back to the client.

---

# Challenge 3: Scenario Based

## Scenario

Your startup has grown rapidly.

Current traffic:

- 150,000 concurrent users
- CPU utilization on the server is consistently above 95%
- Upgrading to a larger machine is becoming increasingly expensive
- The application must remain available even if one server fails

What is the best solution?

### Options

A. Upgrade to a larger server (Vertical Scaling)

B. Add multiple servers behind a Load Balancer (Horizontal Scaling)

C. Increase RAM only

D. Disable health checks to improve performance

---

### Correct Answer

✅ **B. Add multiple servers behind a Load Balancer**

---

### Explanation

Horizontal scaling distributes traffic across multiple servers, improving capacity, fault tolerance, and availability. If one server fails, the load balancer can redirect traffic to healthy servers, ensuring uninterrupted service.
