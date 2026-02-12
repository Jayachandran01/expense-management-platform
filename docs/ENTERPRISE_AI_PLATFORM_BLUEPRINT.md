# 🚀 INTELLIGENCE EXPENSE MANAGEMENT & FINANCIAL ANALYTICS PLATFORM
## Enterprise Application Blueprint & AI Integration Guide

**Document Version:** 2.0  
**Status:** Implementation Ready  
**Target Audience:** Engineering Team, Academic Examiners, Industry Architects  

---

## 1️⃣ ENTERPRISE SYSTEM ARCHITECTURE

The system implements a **Safe, Scalable, and Intelligent 6-Tier Architecture**, designed to support high-volume financial transaction processing while interacting with a state-of-the-art AI Financial Assistant.

### high-Level Architecture Diagram
```mermaid
graph TD
    User[End User] -->|HTTPS/WSS| CDN[CDN / Load Balancer]
    CDN -->|Static Assets| FE[Frontend Presentation Layer]
    CDN -->|API Requests| GW[API Gateway / Firewall]
    
    subgraph "Application Core"
        GW -->|REST| API[API Layer (Express.js)]
        API -->|Auth/Validation| BL[Business Logic Layer]
        
        subgraph "Intelligence Engine"
            BL -->|Analysis| AL[Analytics Service]
            BL -->|Queries| CB[Chatbot Service - Rule/AI Engine]
            CB -->|Context| VM[Vector Memory (Future)]
        end
        
        BL -->|ORM| DAL[Data Access Layer]
    end
    
    subgraph "Data Persistence"
        DAL -->|Read/Write| DB[(Primary DB - SQLite/PostgreSQL)]
        DAL -->|Logs| Logs[(Audit & System Logs)]
    end
```

### Layer-by-Layer Breakdown

#### 1. Presentation Layer (Frontend)
- **Tech**: React 18, Vite, Tailwind CSS, Recharts.
- **Responsibility**: Renders UI, handles client state, manages WebSocket/Polling for chat.
- **Chat Integration**: 
  - Dedicated `ChatWidget` component floating globally.
  - Maintains local chat history state.
  - Securely transmits JWT with every message.

#### 2. API Layer (Backend Entry)
- **Tech**: Node.js, Express.js.
- **Responsibility**: Routing, Rate Limiting, Request Validation.
- **Chat Integration**: `POST /api/v1/chat/send` endpoint acts as the entry point for formatting user messages before passing to the bot service.

#### 3. Business Logic Layer
- **Tech**: Application Services.
- **Responsibility**: Core financial calculations, budget checks, transaction processing.

#### 4. Intelligence Layer & Chatbot Service
- **Responsibility**: The brain of the application.
- **Architecture**: 
  - **Hybrid Model**: Uses a **Rule-Based Engine** for deterministic financial queries ("Balance", "Spending") and prepares context for a **Generative Model** (future LLM) for advisory queries ("How to save more?").
  - **Separation of Concerns**: The Chatbot Service has *read-only* access to financial data APIs. It cannot directly mutate transaction records, preventing hallucinated deletions or edits.

#### 5. Data Layer
- **Tech**: SQLite (Dev) / PostgreSQL (Prod).
- **Responsibility**: ACID-compliant storage of Transactions, Users, and Chat History.

#### 6. Security & Logging Layer
- **Responsibility**: JWT verification, Input Sanitization (XSS/SQLi), Audit Logging.
- **Chat Security**: All chat inputs are sanitized. LLM prompts (future) are constructed server-side to prevent prompt injection.

---

## 2️⃣ FULL PROJECT FOLDER STRUCTURE

This structure enforces modularity and domain-driven design.

```text
expense-management-platform/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chatbot/          # 🤖 Chatbot specific UI
│   │   │   │   ├── ChatWidget.jsx
│   │   │   │   ├── ChatWindow.jsx
│   │   │   │   ├── MessageBubble.jsx
│   │   │   │   └── TypingIndicator.jsx
│   │   │   ├── dashboard/        # Dashboard widgets
│   │   │   ├── common/           # Buttons, Inputs, Cards
│   │   │   └── layout/           # Sidebar, Navbar
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ChatContext.jsx   # 🤖 Global chat state
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── chatService.js    # 🤖 Frontend chat API calls
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
│
├── backend/
│   ├── config/              # App configuration
│   ├── controllers/         # Request handlers
│   │   ├── chatController.js # 🤖 Handle chat endpoints
│   │   └── ...
│   ├── services/            # Business Logic
│   │   ├── analyticsService.js
│   │   ├── ruleEngine.js
│   │   ├── chatbotService.js # 🤖 Core bot logic + NLP
│   │   └── ...
│   ├── routes/
│   │   ├── chatRoutes.js     # 🤖 Route definitions
│   │   └── ...
│   ├── models/              # Database Models
│   │   ├── ChatSession.js
│   │   ├── ChatMessage.js
│   │   └── ...
│   ├── middleware/          # Auth, Validation
│   ├── database/
│   │   ├── seeders/
│   │   └── migrations/
│   ├── utils/               # Helpers (Logger, Formatting)
│   ├── logs/                # System logs
│   └── server.js
│
├── docs/                    # Architecture Documentation
└── README.md
```

---

## 3️⃣ DATABASE DESIGN (INCLUDING CHATBOT TABLES)

In addition to core financial tables (Users, Transactions, Budgets), we introduce:

### `chat_sessions`
| Field | Type | Description |
|-------|------|-------------|
| id | PK | Unique Session ID |
| user_id | FK | Owner of the session |
| title | VARCHAR | Auto-generated summary of chat |
| created_at | TIMESTAMP | Session start |
| last_active | TIMESTAMP | Session expiry tracking |

### `chat_messages`
| Field | Type | Description |
|-------|------|-------------|
| id | PK | Unique Message ID |
| session_id | FK | Linked session |
| sender | ENUM | 'user', 'bot', 'system' |
| content | TEXT | The message text |
| message_type | ENUM | 'text', 'chart_request', 'alert' |
| metadata | JSON | Stores query params or chart data references |
| created_at | TIMESTAMP | Message time |

### Security Considerations:
- **Indexes**: `user_id` and `created_at` are indexed for fast history retrieval.
- **Privacy**: Chat logs are strictly scoped to `user_id`. Admin access (if any) requires specific audit logging.

---

## 4️⃣ CHATBOT SYSTEM DESIGN & WORKFLOW

### Chatbot Architecture
The chatbot operates on a **Retrieval-Augmented Generation (RAG) Lite** architecture, preparing for full LLM integration.

1.  **Intent Recognition (Parser)**:
    - Analyzes user input for keywords and patterns (e.g., "spent", "budget", "last month").
    - **Intents**: `GET_BALANCE`, `GET_SPENDING`, `CHECK_BUDGET`, `ADVICE`, `UNKNOWN`.

2.  **Context Aggregator**:
    - If intent is `GET_SPENDING`, the service fetches relevant transaction data from `TransactionService` for the requested date range.
    - Aggregates raw data into a summary (e.g., "Total: $500, Top Category: Food").

3.  **Response Generator**:
    - **Rule-Based**: Formats the aggregated data into a natural language string template.
    - **LLM-Mode (Future)**: Feeds the aggregated summary + user prompt to an LLM (OpenAI/Claude) to generate a conversational response.

### 5️⃣ REST API DESIGN (CHATBOT)

#### `POST /api/v1/chat/send`
- **Auth**: Required (JWT)
- **Body**: `{ "message": "How much did I spend on food?", "sessionId": "optional-uuid" }`
- **Response**:
    ```json
    {
      "success": true,
      "data": {
        "reply": "You spent $450 on Food & Dining this month.",
        "intent": "GET_SPENDING_CATEGORY",
        "visuals": { "type": "bar_chart", "data": [...] }
      }
    }
    ```

#### `GET /api/v1/chat/history`
- **Auth**: Required
- **Query**: `?limit=50&offset=0`
- **Response**: List of past messages.

---

## 6️⃣ CHATBOT BUSINESS LOGIC FLOW

1.  **User**: Sends "Show me my huge expenses."
2.  **Middleware**: Verifies JWT.
3.  **Controller**: Passes text to `ChatbotService`.
4.  **Service (Intent)**:
    - Detects keyword "huge" -> Intent: `FIND_ANOMALIES` or `HIGH_VALUE_TRANSACTIONS`.
    - Detects "expenses" -> Scope: `Transactions`.
5.  **Service (Data Fetch)**:
    - Calls `TransactionRepository` with `{ minAmount: 500, userId: 123 }`.
6.  **Service (Reasoning)**:
    - Found 3 transactions > $500.
7.  **Service (Response)**:
    - Constructs: "I found 3 large transactions totaling $1800. The largest was $900 at Apple Store."
8.  **Controller**: Returns JSON response.
9.  **Frontend**: Displays text message.

---

## 7️⃣ FRONTEND CHATBOT IMPLEMENTATION

- **Global Context**: The chat widget persists across page navigation using a React Context provider.
- **State Management**:
    - `messages`: Array of message objects.
    - `isTyping`: Boolean for UI feedback.
    - `isOpen`: Toggles the chat window.
- **UI Components**:
    - **Floating Action Button (FAB)**: Bottom-right corner trigger.
    - **Auto-scroll**: A `useEffect` hook triggers `scrollIntoView` on the defined "end of list" ref whenever `messages` array changes.

---

## 8️⃣ SECURITY FOR CHATBOT

1.  **User Scoping**: Every database query triggered by the bot **MUST** include `WHERE user_id = req.user.id`. This is non-negotiable to prevent data leakage.
2.  **Input Sanitization**: All user inputs are stripped of executable code/SQL before processing.
3.  **Rate Limiting**: Chat endpoints are limited to 10 requests/minute per user to prevent abuse/spam.
4.  **No Raw SQL**: The chatbot never executes raw SQL generated from user input. It only maps intents to predefined, safe query builders.

---

## 9️⃣ ANALYTICS + CHATBOT INTEGRATION

The chatbot is the "Voice" of the Analytics Engine.

- **Scenario**: User asks "Why is my budget red?"
- **Flow**:
    1.  Bot checks `BudgetService`.
    2.  Service returns `utilization: 105%`.
    3.  Bot looks up "Top Categories" in that budget.
    4.  Analysis shows "Dining" is 60% of spend.
    5.  **Bot Response**: "You have exceeded your monthly budget by 5%. This is primarily driven by Dining expenses, which account for 60% of your total spending."

---

## 🔟 SETUP GUIDE

### Backend
1.  Navigate to `backend/`.
2.  `npm install`
3.  Ensure `.env` has `JWT_SECRET`.
4.  `npm run dev`

### Frontend
1.  Navigate to `frontend/`.
2.  `npm install`
3.  `npm run dev`

### Chatbot Configuration
- Currently runs in **Rule-Based Mode** (No API Key required).
- To enable advanced NLP (Future), add `OPENAI_API_KEY` to backend `.env`.

---

## 1️⃣1️⃣ FUTURE AI ROADMAP

1.  **Phase 1 (Current)**: Rule-based intent mapping and template responses.
2.  **Phase 2 (NLP)**: Integration of a local NLP model (e.g., node-nlp) for fuzzy intent matching.
3.  **Phase 3 (LLM)**: Integration with OpenAI GPT-4o-mini or Claude 3.5 Haiku for fully conversational financial advice.
4.  **Phase 4 (Voice)**: WebSpeech API integration for "Talk to your Finance Assistant".

---

**This Blueprint is Implementation-Ready.**
