# 🚀 Intelligent Expense Management Backend - Production Ready

## 📋 Overview

This is a **production-grade, enterprise-level backend API** for an Intelligent Expense Management & Financial Analytics Platform with an integrated AI Financial Assistant Chatbot.

### ✨ Key Features

- ✅ **JWT Authentication** - Secure user authentication with bcrypt password hashing
- ✅ **Transaction Management** - Complete CRUD operations for income/expense tracking
- ✅ **Budget Tracking** - Monthly/yearly budgets with intelligent alerts
- ✅ **Category Management** - System and user-defined categories
- ✅ **Rule-Based Analytics Engine** - Comprehensive financial insights
- ✅ **AI Chatbot** - Natural language financial assistant (NO external APIs)
- ✅ **Spending Pattern Detection** - Identify unusual spending behaviors
- ✅ **Budget Alerts** - Overspending detection & warning system
- ✅ **Savings Recommendations** - Personalized financial advice

---

## 🏗 Architecture

### Tech Stack
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js  
- **Database**: SQLite3
- **Authentication**: JWT + bcrypt
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Winston + Morgan

### Project Structure
```
backend/
├── config/             # Configuration files
│   └── database.js     # Database config
├── controllers/        # Request handlers
│   ├── authController.js
│   ├── transactionController.js
│   ├── budgetController.js
│   ├── categoryController.js
│   ├── analyticsController.js
│   └── chatController.js
├── database/           # Database setup
│   ├── init.js         # Schema & initialization
│   └── seeders/        # Default data
├── middleware/         # Custom middleware
│   ├── authMiddleware.js
│   └── errorMiddleware.js
├── models/             # Data models
│   ├── userModel.js
│   ├── Transaction.js
│   ├── Budget.js
│   ├── Category.js
│   ├── ChatSession.js
│   └── ChatMessage.js
├── routes/             # API routes
│   ├── index.js
│   ├── authRoutes.js
│   ├── transactionRoutes.js
│   ├── budgetRoutes.js
│   ├── categoryRoutes.js
│   ├── analyticsRoutes.js
│   └── chatRoutes.js
├── services/           # Business logic
│   ├── AnalyticsService.js
│   ├── BudgetService.js
│   ├── ChatbotService.js
│   └── TransactionService.js
├── utils/              # Utilities
│   ├── logger.js
│   └── jwt.js
├── validators/         # Input validation
│   ├── transactionValidator.js
│   ├── budgetValidator.js
│   └── categoryValidator.js
├── app.js              # Express app setup
├── server.js           # Server entry point
└── package.json
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Setup
Create a `.env` file:
```env
NODE_ENV=development
PORT=5000
DATABASE_PATH=./database/expense_tracker.db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Security
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:5173
```

### 3. Initialize Database
```bash
npm run db:init
npm run db:seed
```

### 4. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

The server will run on `http://localhost:5000`

---

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "full_name": "John Doe"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

### Transaction Endpoints

#### Create Transaction
```http
POST /api/v1/transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "category_id": 1,
  "type": "expense",
  "amount": 500.00,
  "description": "Grocery shopping",
  "transaction_date": "2024-02-11",
  "payment_method": "credit_card"
}
```

#### Get All Transactions
```http
GET /api/v1/transactions?type=expense&start_date=2024-02-01&end_date=2024-02-28
Authorization: Bearer <token>
```

### Budget Endpoints

#### Create Budget
```http
POST /api/v1/budgets
Authorization: Bearer <token>
Content-Type: application/json

{
  "category_id": 1,
  "budget_type": "monthly",
  "amount": 5000.00,
  "start_date": "2024-02-01",
  "end_date": "2024-02-29",
  "alert_threshold": 80
}
```

#### Get Budget Status
```http
GET /api/v1/budgets/with-spending
Authorization: Bearer <token>
```

### Analytics Endpoints

#### Get Financial Summary
```http
GET /api/v1/analytics/summary?start_date=2024-02-01&end_date=2024-02-28
Authorization: Bearer <token>
```

#### Get All Insights
```http
GET /api/v1/analytics/insights?start_date=2024-02-01&end_date=2024-02-28
Authorization: Bearer <token>
```

#### Get Budget Alerts
```http
GET /api/v1/analytics/alerts/overspending
Authorization: Bearer <token>
```

### Chatbot Endpoints

#### Send Message to Chatbot
```http
POST /api/v1/chat/message
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "What's my spending this month?",
  "session_id": "optional-session-id"
}
```

---

## 🤖 AI Chatbot Capabilities

The chatbot understands natural language queries and provides intelligent responses:

### Supported Queries

**Financial Overview**
- "What's my balance?"
- "Show me my financial summary"

**Spending Analysis**
- "How much did I spend this month?"
- "What are my top spending categories?"
- "Show recent transactions"

**Budget Management**
- "How are my budgets doing?"
- "Am I over budget?"

**Insights & Advice**
- "Give me savings advice"
- "Show spending trends"
- "Any alerts or warnings?"

### Intent Detection
The chatbot uses **rule-based NLP** with pattern matching to detect:
- GREETING
- HELP
- GET_BALANCE
- GET_SPENDING_SUMMARY
- GET_TOP_CATEGORIES
- GET_BUDGET_STATUS
- GET_RECENT_TRANSACTIONS
- GET_SAVINGS_ADVICE
- GET_MONTHLY_TREND
- GET_ALERTS
- GET_INSIGHTS

---

## 🔐 Security Features

- **JWT Authentication** with secure token generation
- **Password Hashing** using bcrypt (12 rounds)
- **Helmet.js** for HTTP header security
- **CORS** with configurable origins
- **Rate Limiting** to prevent abuse
- **Input Validation** using Joi schemas
- **SQL Injection Protection** via parameterized queries
- **Error Handling** with sanitized error messages

---

## 📊 Analytics Engine

### Rule-Based Intelligence

1. **Overspending Detection**
   - Detects when budgets are exceeded
   - Severity: CRITICAL

2. **Budget Warning Alerts**
   - Triggers at 80% threshold (configurable)
   - Severity: WARNING

3. **Spending Spike Detection**
   - Compares daily spending against 30-day average
   - Detects increases ≥50% (configurable)
   - Severity: CRITICAL (≥100%) or WARNING (50-100%)

4. **Savings Recommendations**
   - Low savings rate detection (<20%)
   - High category spending analysis (>30%)
   - Negative cash flow alerts

---

## 🗄️ Database Schema

### Main Tables
- **users** - User accounts
- **categories** - Expense/income categories
- **transactions** - Financial transactions
- **budgets** - Budget definitions
- **alerts** - System alerts
- **insights** - Generated insights
- **chat_sessions** - Chatbot sessions
- **chat_messages** - Chatbot messages
- **audit_logs** - Activity tracking

---

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📝 Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run db:init    # Initialize database
npm run db:seed    # Seed default categories
npm test           # Run tests
npm run lint       # Run ESLint
npm run lint:fix   # Fix linting issues
```

---

## 🌟 Key Highlights

### ✅ Production-Ready
- Complete error handling
- Structured logging
- Input validation
- Security best practices

### ✅ No Pseudo-Code
- Every function is fully implemented
- All business logic is complete
- Ready to run immediately

### ✅ Enterprise-Grade
- MVC architecture
- Separation of concerns
- Scalable design
- Well-documented

### ✅ AI-Powered
- Rule-based chatbot (no external APIs)
- Intent detection
- Context-aware responses
- Financial intelligence

---

## 📦 Dependencies

### Core
- express v4.18.2
- sqlite3 v5.1.6
- bcrypt v5.1.1
- jsonwebtoken v9.0.2

### Security
- helmet v7.1.0
- cors v2.8.5
- express-rate-limit v7.1.5

### Validation & Logging
- joi v17.11.0
- winston v3.11.0
- morgan v1.10.0

---

## 🔮 Future Enhancements

- [ ] Machine Learning integration for advanced predictions
- [ ] Recurring transaction automation
- [ ] Multi-currency support
- [ ] Export to PDF/Excel
- [ ] Email notifications
- [ ] Mobile app integration
- [ ] Webhook support

---

## 🤝 Contributing

This is an academic project built for demonstration purposes.

---

## 📄 License

MIT License

---

## 👨‍💻 Author

Built with ❤️ as a production-ready demonstration of enterprise backend development.

---

**Status: ✅ PRODUCTION READY**

All endpoints are functional. No placeholders. No pseudo-code.
