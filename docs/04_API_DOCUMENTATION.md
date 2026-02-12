# 4️⃣ COMPLETE REST API DOCUMENTATION

## API Overview

**Base URL**: `http://localhost:5000/api/v1`  
**Authentication**: JWT Bearer Token  
**Content-Type**: `application/json`  
**API Version**: v1

---

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful",
  "timestamp": "2026-02-11T11:48:35Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [ /* validation errors if applicable */ ]
  },
  "timestamp": "2026-02-11T11:48:35Z",
  "requestId": "uuid-v4"
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## HTTP Status Codes

| Code | Meaning              | Usage                                      |
|------|----------------------|--------------------------------------------|
| 200  | OK                   | Successful GET, PUT, DELETE                |
| 201  | Created              | Successful POST (resource created)         |
| 400  | Bad Request          | Validation error, malformed request        |
| 401  | Unauthorized         | Missing or invalid authentication token    |
| 403  | Forbidden            | Authenticated but not authorized           |
| 404  | Not Found            | Resource does not exist                    |
| 409  | Conflict             | Duplicate resource, business rule violation|
| 422  | Unprocessable Entity | Business logic error                       |
| 429  | Too Many Requests    | Rate limit exceeded                        |
| 500  | Internal Server Error| Server-side error                          |

---

## Authentication APIs

### 1. Register User

**Endpoint**: `POST /auth/register`  
**Authentication**: Not required  
**Description**: Create a new user account

**Request Body**:
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "phone": "+919876543210",
  "currency": "INR"
}
```

**Validation Rules**:
- `email`: Valid email format, unique, max 255 chars
- `password`: Min 8 chars, must contain uppercase, lowercase, number, special char
- `full_name`: Required, 2-100 chars
- `phone`: Optional, valid phone format
- `currency`: Optional, ISO 4217 code (default: INR)

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "john.doe@example.com",
      "full_name": "John Doe",
      "currency": "INR",
      "created_at": "2026-02-11T11:48:35Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Registration successful"
}
```

**Error Responses**:
- **400**: Validation error
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid input data",
      "details": [
        { "field": "email", "message": "Email already exists" },
        { "field": "password", "message": "Password must be at least 8 characters" }
      ]
    }
  }
  ```

---

### 2. Login User

**Endpoint**: `POST /auth/login`  
**Authentication**: Not required  
**Description**: Authenticate user and receive JWT token

**Request Body**:
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Validation Rules**:
- `email`: Required, valid email format
- `password`: Required

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "john.doe@example.com",
      "full_name": "John Doe",
      "currency": "INR",
      "last_login_at": "2026-02-11T11:48:35Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "1h"
  },
  "message": "Login successful"
}
```

**Error Responses**:
- **401**: Invalid credentials
  ```json
  {
    "success": false,
    "error": {
      "code": "INVALID_CREDENTIALS",
      "message": "Invalid email or password"
    }
  }
  ```

---

### 3. Get Current User

**Endpoint**: `GET /auth/me`  
**Authentication**: Required (JWT)  
**Description**: Get authenticated user's profile

**Request Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "john.doe@example.com",
    "full_name": "John Doe",
    "phone": "+919876543210",
    "currency": "INR",
    "timezone": "Asia/Kolkata",
    "is_verified": false,
    "created_at": "2026-02-11T11:48:35Z"
  }
}
```

---

### 4. Logout User

**Endpoint**: `POST /auth/logout`  
**Authentication**: Required (JWT)  
**Description**: Invalidate user session (client-side token removal)

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## Transaction APIs

### 1. Create Transaction

**Endpoint**: `POST /transactions`  
**Authentication**: Required  
**Description**: Add a new income or expense transaction

**Request Body**:
```json
{
  "type": "expense",
  "amount": 450.50,
  "description": "Lunch at Starbucks",
  "merchant": "Starbucks",
  "category_id": 2,
  "payment_method": "card",
  "transaction_date": "2026-02-11",
  "tags": "food,coffee,work"
}
```

**Validation Rules**:
- `type`: Required, enum ('income', 'expense')
- `amount`: Required, positive number, max 2 decimal places
- `description`: Required, 1-500 chars
- `merchant`: Optional, max 100 chars
- `category_id`: Required, must exist in categories table
- `payment_method`: Optional, enum ('cash', 'card', 'upi', 'bank_transfer')
- `transaction_date`: Required, date format (YYYY-MM-DD), not in future
- `tags`: Optional, comma-separated string

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 123,
    "user_id": 1,
    "type": "expense",
    "amount": 450.50,
    "description": "Lunch at Starbucks",
    "merchant": "Starbucks",
    "category": {
      "id": 2,
      "name": "Food & Dining",
      "icon": "food-icon",
      "color": "#FF5733"
    },
    "payment_method": "card",
    "transaction_date": "2026-02-11",
    "tags": ["food", "coffee", "work"],
    "created_at": "2026-02-11T11:48:35Z"
  },
  "message": "Transaction created successfully"
}
```

**Error Responses**:
- **400**: Validation error
- **409**: Duplicate transaction detected
- **422**: Business rule violation (e.g., future date)

---

### 2. Get All Transactions

**Endpoint**: `GET /transactions`  
**Authentication**: Required  
**Description**: Retrieve user's transactions with filtering and pagination

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `type`: Filter by type ('income', 'expense')
- `category_id`: Filter by category
- `start_date`: Filter from date (YYYY-MM-DD)
- `end_date`: Filter to date (YYYY-MM-DD)
- `search`: Search in description and merchant
- `sort`: Sort field (default: 'transaction_date')
- `order`: Sort order ('asc', 'desc', default: 'desc')

**Example Request**:
```
GET /transactions?page=1&limit=20&type=expense&start_date=2026-02-01&end_date=2026-02-28&sort=amount&order=desc
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "type": "expense",
      "amount": 450.50,
      "description": "Lunch at Starbucks",
      "merchant": "Starbucks",
      "category": {
        "id": 2,
        "name": "Food & Dining",
        "color": "#FF5733"
      },
      "payment_method": "card",
      "transaction_date": "2026-02-11",
      "created_at": "2026-02-11T11:48:35Z"
    }
    // ... more transactions
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### 3. Get Transaction by ID

**Endpoint**: `GET /transactions/:id`  
**Authentication**: Required  
**Description**: Get detailed information about a specific transaction

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 123,
    "user_id": 1,
    "type": "expense",
    "amount": 450.50,
    "description": "Lunch at Starbucks",
    "merchant": "Starbucks",
    "category": {
      "id": 2,
      "name": "Food & Dining",
      "icon": "food-icon",
      "color": "#FF5733"
    },
    "payment_method": "card",
    "transaction_date": "2026-02-11",
    "tags": ["food", "coffee", "work"],
    "is_recurring": false,
    "created_at": "2026-02-11T11:48:35Z",
    "updated_at": "2026-02-11T11:48:35Z"
  }
}
```

**Error Responses**:
- **404**: Transaction not found
- **403**: Transaction belongs to another user

---

### 4. Update Transaction

**Endpoint**: `PUT /transactions/:id`  
**Authentication**: Required  
**Description**: Update an existing transaction

**Request Body** (all fields optional):
```json
{
  "amount": 500.00,
  "description": "Updated description",
  "category_id": 3,
  "merchant": "New Merchant"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 123,
    "amount": 500.00,
    "description": "Updated description",
    // ... updated fields
  },
  "message": "Transaction updated successfully"
}
```

**Error Responses**:
- **404**: Transaction not found
- **403**: Not authorized to update this transaction
- **400**: Validation error

---

### 5. Delete Transaction

**Endpoint**: `DELETE /transactions/:id`  
**Authentication**: Required  
**Description**: Delete a transaction

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Transaction deleted successfully"
}
```

**Error Responses**:
- **404**: Transaction not found
- **403**: Not authorized to delete this transaction

---

## Budget APIs

### 1. Create Budget

**Endpoint**: `POST /budgets`  
**Authentication**: Required  
**Description**: Create a new budget limit

**Request Body**:
```json
{
  "category_id": 2,
  "budget_type": "monthly",
  "amount": 5000.00,
  "start_date": "2026-02-01",
  "end_date": "2026-02-28",
  "alert_threshold": 80
}
```

**Validation Rules**:
- `category_id`: Optional (null for overall budget), must exist
- `budget_type`: Required, enum ('monthly', 'yearly')
- `amount`: Required, positive number
- `start_date`: Required, date format
- `end_date`: Required, must be after start_date
- `alert_threshold`: Optional, integer 1-100 (default: 80)

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 10,
    "user_id": 1,
    "category": {
      "id": 2,
      "name": "Food & Dining"
    },
    "budget_type": "monthly",
    "amount": 5000.00,
    "start_date": "2026-02-01",
    "end_date": "2026-02-28",
    "alert_threshold": 80,
    "is_active": true,
    "created_at": "2026-02-11T11:48:35Z"
  },
  "message": "Budget created successfully"
}
```

**Error Responses**:
- **409**: Overlapping budget exists for this category and period

---

### 2. Get All Budgets

**Endpoint**: `GET /budgets`  
**Authentication**: Required  
**Description**: Get all budgets with current consumption

**Query Parameters**:
- `is_active`: Filter by active status (true/false)
- `budget_type`: Filter by type ('monthly', 'yearly')

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "category": {
        "id": 2,
        "name": "Food & Dining",
        "color": "#FF5733"
      },
      "budget_type": "monthly",
      "amount": 5000.00,
      "spent": 4600.00,
      "remaining": 400.00,
      "utilization_percentage": 92,
      "start_date": "2026-02-01",
      "end_date": "2026-02-28",
      "alert_threshold": 80,
      "is_exceeded": false,
      "is_alert_triggered": true,
      "days_remaining": 17,
      "is_active": true
    }
    // ... more budgets
  ]
}
```

---

### 3. Get Budget by ID

**Endpoint**: `GET /budgets/:id`  
**Authentication**: Required  
**Description**: Get detailed budget information with spending breakdown

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 10,
    "category": {
      "id": 2,
      "name": "Food & Dining"
    },
    "budget_type": "monthly",
    "amount": 5000.00,
    "spent": 4600.00,
    "remaining": 400.00,
    "utilization_percentage": 92,
    "start_date": "2026-02-01",
    "end_date": "2026-02-28",
    "alert_threshold": 80,
    "spending_by_day": [
      { "date": "2026-02-01", "amount": 450.00 },
      { "date": "2026-02-02", "amount": 320.00 }
      // ... daily breakdown
    ],
    "predicted_total": 5200.00,
    "predicted_overspend": 200.00
  }
}
```

---

### 4. Update Budget

**Endpoint**: `PUT /budgets/:id`  
**Authentication**: Required  
**Description**: Update budget details

**Request Body**:
```json
{
  "amount": 6000.00,
  "alert_threshold": 85
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": { /* updated budget */ },
  "message": "Budget updated successfully"
}
```

---

### 5. Delete Budget

**Endpoint**: `DELETE /budgets/:id`  
**Authentication**: Required  
**Description**: Delete a budget

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Budget deleted successfully"
}
```

---

## Category APIs

### 1. Get All Categories

**Endpoint**: `GET /categories`  
**Authentication**: Required  
**Description**: Get all categories (system + user custom)

**Query Parameters**:
- `type`: Filter by type ('income', 'expense')

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Salary",
      "type": "income",
      "icon": "salary-icon",
      "color": "#4CAF50",
      "is_system": true
    },
    {
      "id": 2,
      "name": "Food & Dining",
      "type": "expense",
      "icon": "food-icon",
      "color": "#FF5733",
      "is_system": true
    }
    // ... more categories
  ]
}
```

---

### 2. Create Custom Category

**Endpoint**: `POST /categories`  
**Authentication**: Required  
**Description**: Create a user-specific custom category

**Request Body**:
```json
{
  "name": "Freelance Income",
  "type": "income",
  "icon": "freelance-icon",
  "color": "#2ECC71"
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 15,
    "name": "Freelance Income",
    "type": "income",
    "icon": "freelance-icon",
    "color": "#2ECC71",
    "is_system": false,
    "user_id": 1
  },
  "message": "Category created successfully"
}
```

---

### 3. Update Category

**Endpoint**: `PUT /categories/:id`  
**Authentication**: Required  
**Description**: Update custom category (system categories cannot be updated)

**Request Body**:
```json
{
  "name": "Updated Name",
  "color": "#3498DB"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": { /* updated category */ },
  "message": "Category updated successfully"
}
```

**Error Responses**:
- **403**: Cannot update system category

---

### 4. Delete Category

**Endpoint**: `DELETE /categories/:id`  
**Authentication**: Required  
**Description**: Delete custom category

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

**Error Responses**:
- **403**: Cannot delete system category
- **409**: Category has associated transactions or budgets

---

## Analytics APIs

### 1. Get Dashboard Summary

**Endpoint**: `GET /analytics/dashboard`  
**Authentication**: Required  
**Description**: Get overview statistics for dashboard

**Query Parameters**:
- `period`: Time period ('week', 'month', 'year', default: 'month')

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "period": "month",
    "start_date": "2026-02-01",
    "end_date": "2026-02-28",
    "summary": {
      "total_income": 50000.00,
      "total_expense": 32450.00,
      "net_savings": 17550.00,
      "savings_rate": 35.1,
      "transaction_count": 87,
      "average_transaction": 373.00
    },
    "budget_summary": {
      "total_budget": 30000.00,
      "total_spent": 32450.00,
      "utilization_percentage": 108.2,
      "budgets_exceeded": 2,
      "budgets_on_track": 3
    },
    "top_categories": [
      {
        "category": "Food & Dining",
        "amount": 8500.00,
        "percentage": 26.2,
        "transaction_count": 35
      },
      {
        "category": "Transportation",
        "amount": 6200.00,
        "percentage": 19.1,
        "transaction_count": 22
      }
      // ... top 5 categories
    ],
    "spending_trend": [
      { "date": "2026-02-01", "income": 50000.00, "expense": 1200.00 },
      { "date": "2026-02-02", "income": 0.00, "expense": 850.00 }
      // ... daily data
    ]
  }
}
```

---

### 2. Get Spending Analysis

**Endpoint**: `GET /analytics/spending`  
**Authentication**: Required  
**Description**: Detailed spending analysis

**Query Parameters**:
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)
- `group_by`: Grouping ('day', 'week', 'month', 'category')

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "total_expense": 32450.00,
    "average_daily_expense": 1169.64,
    "category_breakdown": [
      {
        "category_id": 2,
        "category_name": "Food & Dining",
        "amount": 8500.00,
        "percentage": 26.2,
        "transaction_count": 35,
        "average_transaction": 242.86
      }
      // ... all categories
    ],
    "payment_method_breakdown": [
      { "method": "card", "amount": 18000.00, "percentage": 55.5 },
      { "method": "upi", "amount": 12000.00, "percentage": 37.0 },
      { "method": "cash", "amount": 2450.00, "percentage": 7.5 }
    ],
    "time_series": [
      { "period": "2026-02-01", "amount": 1200.00 },
      { "period": "2026-02-02", "amount": 850.00 }
      // ... grouped data
    ]
  }
}
```

---

### 3. Get Trend Analysis

**Endpoint**: `GET /analytics/trends`  
**Authentication**: Required  
**Description**: Analyze spending trends and patterns

**Query Parameters**:
- `months`: Number of months to analyze (default: 6)

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "monthly_trends": [
      {
        "month": "2026-02",
        "income": 50000.00,
        "expense": 32450.00,
        "savings": 17550.00,
        "savings_rate": 35.1
      },
      {
        "month": "2026-01",
        "income": 50000.00,
        "expense": 28900.00,
        "savings": 21100.00,
        "savings_rate": 42.2
      }
      // ... previous months
    ],
    "category_trends": [
      {
        "category": "Food & Dining",
        "current_month": 8500.00,
        "previous_month": 6200.00,
        "change_percentage": 37.1,
        "trend": "increasing"
      }
      // ... all categories
    ],
    "insights": [
      {
        "type": "trend",
        "message": "Your food expenses increased by 37% compared to last month",
        "severity": "warning"
      }
    ]
  }
}
```

---

### 4. Get Category Comparison

**Endpoint**: `GET /analytics/categories/compare`  
**Authentication**: Required  
**Description**: Compare spending across categories

**Query Parameters**:
- `start_date`: Start date
- `end_date`: End date
- `compare_with`: Comparison period ('previous_period', 'previous_year')

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "current_period": {
      "start_date": "2026-02-01",
      "end_date": "2026-02-28",
      "total": 32450.00
    },
    "comparison_period": {
      "start_date": "2026-01-01",
      "end_date": "2026-01-31",
      "total": 28900.00
    },
    "categories": [
      {
        "category": "Food & Dining",
        "current": 8500.00,
        "previous": 6200.00,
        "change": 2300.00,
        "change_percentage": 37.1
      }
      // ... all categories
    ]
  }
}
```

---

## Insights APIs

### 1. Get All Insights

**Endpoint**: `GET /insights`  
**Authentication**: Required  
**Description**: Get generated financial insights

**Query Parameters**:
- `is_read`: Filter by read status (true/false)
- `priority`: Filter by priority ('low', 'medium', 'high')
- `limit`: Number of insights (default: 10)

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "insight_type": "budget_alert",
      "title": "Food Budget Almost Exhausted",
      "description": "You have used 92% of your food budget for February. Consider reducing dining expenses to stay within budget.",
      "category": {
        "id": 2,
        "name": "Food & Dining"
      },
      "priority": "high",
      "metric_value": 4600.00,
      "is_read": false,
      "generated_at": "2026-02-11T11:48:35Z"
    }
    // ... more insights
  ]
}
```

---

### 2. Mark Insight as Read

**Endpoint**: `PUT /insights/:id/read`  
**Authentication**: Required  
**Description**: Mark an insight as read

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Insight marked as read"
}
```

---

### 3. Generate New Insights

**Endpoint**: `POST /insights/generate`  
**Authentication**: Required  
**Description**: Trigger insight generation (manual)

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "insights_generated": 3,
    "insights": [ /* newly generated insights */ ]
  },
  "message": "Insights generated successfully"
}
```

---

## Report APIs

### 1. Get Monthly Report

**Endpoint**: `GET /reports/monthly`  
**Authentication**: Required  
**Description**: Generate comprehensive monthly report

**Query Parameters**:
- `month`: Month (YYYY-MM, default: current month)

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "month": "2026-02",
    "summary": {
      "total_income": 50000.00,
      "total_expense": 32450.00,
      "net_savings": 17550.00,
      "savings_rate": 35.1
    },
    "category_breakdown": [ /* category-wise data */ ],
    "daily_breakdown": [ /* day-wise data */ ],
    "budget_performance": [ /* budget vs actual */ ],
    "top_transactions": [ /* highest transactions */ ],
    "insights": [ /* key insights */ ]
  }
}
```

---

### 2. Export Transactions

**Endpoint**: `GET /reports/export`  
**Authentication**: Required  
**Description**: Export transactions to CSV or JSON

**Query Parameters**:
- `format`: Export format ('csv', 'json', default: 'csv')
- `start_date`: Start date
- `end_date`: End date
- `type`: Filter by type ('income', 'expense')

**Success Response** (200 OK):
- **Content-Type**: `text/csv` or `application/json`
- **Content-Disposition**: `attachment; filename="transactions_2026-02.csv"`

**CSV Format**:
```csv
Date,Type,Category,Description,Merchant,Amount,Payment Method
2026-02-11,expense,Food & Dining,Lunch at Starbucks,Starbucks,450.50,card
2026-02-10,expense,Transportation,Uber ride,Uber,200.00,upi
```

---

### 3. Get Custom Report

**Endpoint**: `POST /reports/custom`  
**Authentication**: Required  
**Description**: Generate custom report with specific parameters

**Request Body**:
```json
{
  "start_date": "2026-01-01",
  "end_date": "2026-02-28",
  "categories": [2, 3, 4],
  "group_by": "category",
  "include_charts": true
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "report_id": "custom_20260211_123456",
    "parameters": { /* request parameters */ },
    "summary": { /* aggregated data */ },
    "details": [ /* detailed breakdown */ ],
    "charts": {
      "spending_by_category": { /* chart data */ },
      "trend_over_time": { /* chart data */ }
    }
  }
}
```

---

## User APIs

### 1. Update Profile

**Endpoint**: `PUT /users/profile`  
**Authentication**: Required  
**Description**: Update user profile information

**Request Body**:
```json
{
  "full_name": "John Updated Doe",
  "phone": "+919876543210",
  "currency": "USD",
  "timezone": "America/New_York"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": { /* updated user profile */ },
  "message": "Profile updated successfully"
}
```

---

### 2. Change Password

**Endpoint**: `PUT /users/password`  
**Authentication**: Required  
**Description**: Change user password

**Request Body**:
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewSecurePass456!",
  "confirm_password": "NewSecurePass456!"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses**:
- **401**: Current password incorrect
- **400**: New password doesn't meet requirements

---

## Rate Limiting

**Limits**:
- Authentication endpoints: 5 requests per minute
- General API endpoints: 100 requests per minute
- Export endpoints: 10 requests per hour

**Rate Limit Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1644580715
```

**Rate Limit Exceeded Response** (429):
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 60
  }
}
```

---

## Error Codes Reference

| Code                      | HTTP Status | Description                          |
|---------------------------|-------------|--------------------------------------|
| VALIDATION_ERROR          | 400         | Input validation failed              |
| INVALID_CREDENTIALS       | 401         | Wrong email or password              |
| UNAUTHORIZED              | 401         | Missing or invalid token             |
| FORBIDDEN                 | 403         | Not authorized for this resource     |
| NOT_FOUND                 | 404         | Resource not found                   |
| DUPLICATE_RESOURCE        | 409         | Resource already exists              |
| DUPLICATE_TRANSACTION     | 409         | Duplicate transaction detected       |
| BUSINESS_RULE_VIOLATION   | 422         | Business logic constraint violated   |
| RATE_LIMIT_EXCEEDED       | 429         | Too many requests                    |
| INTERNAL_SERVER_ERROR     | 500         | Unexpected server error              |

---

## Testing with cURL

### Register User
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "full_name": "Test User"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

### Create Transaction (with token)
```bash
curl -X POST http://localhost:5000/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "expense",
    "amount": 450.50,
    "description": "Test transaction",
    "category_id": 2,
    "transaction_date": "2026-02-11"
  }'
```

---

## Conclusion

This API documentation provides:
✅ **Complete Endpoint Coverage**: All CRUD operations  
✅ **Request/Response Examples**: Production-ready formats  
✅ **Validation Rules**: Clear input requirements  
✅ **Error Handling**: Comprehensive error responses  
✅ **Authentication**: JWT-based security  
✅ **Testing Examples**: cURL commands for testing  

**Document Version**: 1.0  
**Last Updated**: February 11, 2026
