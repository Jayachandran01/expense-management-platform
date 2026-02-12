# 🚀 COMPLETE SETUP & INSTALLATION GUIDE

## Overview

This guide provides step-by-step instructions to set up and run the **Intelligent Expense Management & Financial Analytics Platform** on your local machine.

---

## Prerequisites

### Required Software

| Software    | Minimum Version | Download Link                          |
|-------------|-----------------|----------------------------------------|
| Node.js     | 18.0.0          | https://nodejs.org/                    |
| npm         | 9.0.0           | Included with Node.js                  |
| Git         | Latest          | https://git-scm.com/                   |
| VS Code     | Latest          | https://code.visualstudio.com/ (recommended) |

### Verify Installation

```bash
# Check Node.js version
node --version
# Should output: v18.x.x or higher

# Check npm version
npm --version
# Should output: 9.x.x or higher

# Check Git version
git --version
# Should output: git version 2.x.x or higher
```

---

## Installation Steps

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/expense-management-platform.git

# Navigate to project directory
cd expense-management-platform
```

---

### Step 2: Backend Setup

#### 2.1 Navigate to Backend Directory

```bash
cd backend
```

#### 2.2 Install Dependencies

```bash
npm install
```

This will install all required packages:
- express (web framework)
- bcrypt (password hashing)
- jsonwebtoken (JWT authentication)
- joi (validation)
- sqlite3 (database)
- cors, helmet, morgan (middleware)
- winston (logging)
- And more...

#### 2.3 Create Environment File

```bash
# Copy example environment file
cp .env.example .env
```

#### 2.4 Configure Environment Variables

Open `.env` file and update the following:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
DATABASE_PATH=./database/expense_tracker.db

# JWT Configuration (IMPORTANT: Change this!)
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Logging
LOG_LEVEL=debug

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:5173
```

**⚠️ IMPORTANT**: Generate a strong JWT secret:
```bash
# Generate random 32-character string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2.5 Initialize Database

```bash
npm run db:init
```

This will:
- Create the SQLite database file
- Create all tables (users, categories, transactions, budgets, insights, alerts, audit_logs)
- Create indexes for performance

#### 2.6 Seed Default Categories

```bash
npm run db:seed
```

This will populate the database with default expense and income categories.

#### 2.7 Start Backend Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

You should see:
```
🚀 Server running in development mode on port 5000
📊 API Documentation: http://localhost:5000/api/v1
🔒 JWT Authentication enabled
⏰ Server started at: 2026-02-11T11:48:35Z
```

#### 2.8 Verify Backend is Running

Open browser and navigate to: http://localhost:5000

You should see:
```json
{
  "success": true,
  "message": "Expense Management API",
  "version": "1.0.0",
  "endpoints": {
    "health": "/health",
    "auth": "/api/v1/auth",
    "transactions": "/api/v1/transactions",
    ...
  }
}
```

---

### Step 3: Frontend Setup

#### 3.1 Open New Terminal

Keep the backend server running and open a new terminal window.

#### 3.2 Navigate to Frontend Directory

```bash
cd frontend
```

#### 3.3 Install Dependencies

```bash
npm install
```

This will install:
- react, react-dom (UI library)
- react-router-dom (routing)
- axios (HTTP client)
- chart.js, react-chartjs-2 (charts)
- tailwindcss (CSS framework)
- And more...

#### 3.4 Create Environment File

```bash
# Copy example environment file
cp .env.example .env
```

#### 3.5 Configure Environment Variables

Open `.env` file and update:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api/v1

# Application Configuration
VITE_APP_NAME=Expense Tracker
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_EXPORT=true
```

#### 3.6 Start Frontend Development Server

```bash
npm run dev
```

You should see:
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

#### 3.7 Access the Application

Open your browser and navigate to: **http://localhost:5173**

You should see the login/register page.

---

## Verification Checklist

### Backend Verification

- [ ] Backend server running on port 5000
- [ ] Database file created at `backend/database/expense_tracker.db`
- [ ] Health check endpoint working: http://localhost:5000/health
- [ ] API documentation accessible: http://localhost:5000/api/v1
- [ ] No errors in terminal logs

### Frontend Verification

- [ ] Frontend running on port 5173
- [ ] Login page loads successfully
- [ ] No console errors in browser DevTools
- [ ] Tailwind CSS styles applied correctly

---

## Testing the Application

### 1. Register a New User

1. Navigate to http://localhost:5173
2. Click "Register" or "Sign Up"
3. Fill in the form:
   - Email: test@example.com
   - Password: Test123! (min 8 chars)
   - Full Name: Test User
4. Click "Register"
5. You should be automatically logged in and redirected to the dashboard

### 2. Test API with cURL

#### Register User
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "full_name": "Test User"
  }'
```

#### Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

Save the token from the response.

#### Create Transaction
```bash
curl -X POST http://localhost:5000/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "type": "expense",
    "amount": 450.50,
    "description": "Lunch at restaurant",
    "category_id": 2,
    "transaction_date": "2026-02-11"
  }'
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Find process using port 5000
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # Mac/Linux

# Kill the process
taskkill /PID <PID> /F        # Windows
kill -9 <PID>                 # Mac/Linux

# Or change port in .env
PORT=5001
```

#### Issue 2: Database Initialization Fails

**Error**: `Error opening database`

**Solution**:
```bash
# Ensure database directory exists
mkdir -p backend/database

# Delete existing database and reinitialize
rm backend/database/expense_tracker.db
npm run db:init
```

#### Issue 3: JWT Secret Not Set

**Error**: `JWT_SECRET is not defined`

**Solution**:
```bash
# Generate and set JWT secret in .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output and paste in .env as JWT_SECRET
```

#### Issue 4: CORS Error in Frontend

**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**:
- Ensure backend `.env` has `CORS_ORIGIN=http://localhost:5173`
- Restart backend server after changing .env

#### Issue 5: Module Not Found

**Error**: `Cannot find module 'express'`

**Solution**:
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Development Workflow

### Backend Development

```bash
cd backend

# Start development server (auto-restart on file changes)
npm run dev

# Run tests
npm test

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix
```

### Frontend Development

```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run linter
npm run lint
```

---

## Project Structure Quick Reference

```
expense-management-platform/
│
├── backend/                 # Backend API
│   ├── config/             # Configuration files
│   ├── controllers/        # Request handlers
│   ├── services/           # Business logic
│   ├── routes/             # API routes
│   ├── models/             # Database models
│   ├── middleware/         # Express middleware
│   ├── validators/         # Input validation
│   ├── utils/              # Utility functions
│   ├── database/           # Database files
│   ├── app.js              # Express app
│   ├── server.js           # Server entry point
│   └── package.json        # Dependencies
│
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── layouts/        # Layout templates
│   │   ├── context/        # React Context
│   │   ├── services/       # API services
│   │   ├── hooks/          # Custom hooks
│   │   ├── utils/          # Utilities
│   │   ├── routes/         # Routing
│   │   ├── App.jsx         # Root component
│   │   └── main.jsx        # Entry point
│   ├── package.json        # Dependencies
│   └── vite.config.js      # Vite config
│
└── docs/                    # Documentation
    ├── 01_ENTERPRISE_ARCHITECTURE.md
    ├── 02_FOLDER_STRUCTURE.md
    ├── 03_DATABASE_DESIGN.md
    ├── 04_API_DOCUMENTATION.md
    └── ... (more docs)
```

---

## Next Steps

After successful installation:

1. **Explore the API**: Read `docs/04_API_DOCUMENTATION.md`
2. **Understand Architecture**: Read `docs/01_ENTERPRISE_ARCHITECTURE.md`
3. **Start Development**: Follow implementation patterns in `docs/IMPLEMENTATION_SUMMARY.md`
4. **Run Tests**: Ensure all tests pass before making changes
5. **Read Contributing Guide**: See `CONTRIBUTING.md` for development guidelines

---

## Production Deployment

### Backend Deployment

1. **Set Environment to Production**
   ```env
   NODE_ENV=production
   ```

2. **Use Strong JWT Secret**
   ```bash
   # Generate 64-character secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. **Configure PostgreSQL** (instead of SQLite)
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   ```

4. **Enable HTTPS**
   - Use reverse proxy (nginx, Apache)
   - Configure SSL certificates (Let's Encrypt)

5. **Set Up Process Manager**
   ```bash
   npm install -g pm2
   pm2 start server.js --name expense-tracker-api
   pm2 save
   pm2 startup
   ```

### Frontend Deployment

1. **Build Production Bundle**
   ```bash
   npm run build
   ```

2. **Deploy to Hosting**
   - **Vercel**: `vercel deploy`
   - **Netlify**: `netlify deploy --prod`
   - **AWS S3 + CloudFront**: Upload `dist/` folder

3. **Configure Environment**
   ```env
   VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
   ```

---

## Support

For issues or questions:

- **GitHub Issues**: https://github.com/yourusername/expense-management-platform/issues
- **Documentation**: See `/docs` folder
- **Email**: support@expensetracker.com

---

## Conclusion

You now have a fully functional expense management platform running locally!

**What's Next?**
- Add your first transaction
- Create a budget
- Explore analytics
- Customize categories
- Generate reports

Happy coding! 🚀

---

**Document Version**: 1.0  
**Last Updated**: February 11, 2026
