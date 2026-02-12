# Enterprise Expense Management Platform 🚀

A comprehensive financial analytics and expense tracking platform built with **React**, **Node.js**, **SQLite** (development), **PostgreSQL** (production), **Machine Learning** (planned future), and **Redis** (optional).

## 🌟 Key Features

*   **Expense Tracking**: Easily log transactions with categories, dates, and descriptions.
*   **Smart Categorization**: Automatically categorizes expenses based on keywords (AI-assisted).
*   **Budget Management**: Set monthly/budget limits and get alerts.
*   **Visual Analytics**: Interactive charts and graphs for spending analysis.
*   **Transaction Import**: Supports CSV imports for bulk data entry.
*   **OCR Receipt Scanning**: Extract data from receipt images (requires valid backend setup).
*   **Group Expenses**: Split bills with friends or colleagues.
*   **Secure Authentication**: JWT-based login (Currently **bypassed** for easier testing/development).

## 🛠 Tech Stack

*   **Frontend**: React, Vite, TailwindCSS, Chart.js, React Query, Zustand.
*   **Backend**: Node.js, Express, Knex (Query Builder), SQLite / PostgreSQL.
*   **Database**: SQLite (Development - pre-configured), PostgreSQL (Production).
*   **Caching/Queue**: Redis (Optional for background jobs like OCR/CSV import).

## 🚀 Getting Started

### Prerequisites

*   **Node.js** (v18 or higher)
*   **npm** (Node Package Manager)
*   **Git**

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/expense-management-platform.git
    cd expense-management-platform
    ```

2.  **Install dependencies**:
    Wait for `npm install` to complete in all directories.
    ```bash
    # Install root dependencies (concurrently)
    npm install

    # Install Backend dependencies
    cd backend
    npm install

    # Install Frontend dependencies
    cd ../frontend
    npm install
    ```

### 📋 Configuration

The project comes with default `.env.example` files. You can copy them to `.env` if needed, but the development setup uses sensible defaults.

**Backend Configuration (`backend/.env`):**
Create a `.env` file in the backend directory if one doesn't exist, or just use the defaults.
(Default uses `sqlite3` at `backend/database/expense_tracker.db` and port 5000).

**Frontend Configuration (`frontend/.env`):**
Generally not required for development as Vite proxies API calls to `http://localhost:5000`.

### 🗄 Database Setup (SQLite)

For development, the project uses SQLite to avoid complex setup. The database file is located at `backend/database/expense_tracker.db`.

To initialize the database tables:

```bash
cd backend
npm run db:init
```

> **Note:** This command creates the necessary tables (`users`, `transactions`, `budgets`, etc.).

### ▶️ Running the Application

You can run both frontend and backend concurrently from the root directory:

```bash
# Run from root directory
npm run dev
```

Alternatively, run them separately in two terminals:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

### 🧪 Verify Installation

1.  Open your browser and navigate to `http://localhost:5173`.
2.  You should see the Login page.
3.  Click "Sign Up" to create a new account.
4.  After registration, you will be redirected to the Dashboard.
5.  Try adding a transaction using the "Add Transaction" button.

### ⚠️ Troubleshooting

**Redis Connection Error:**
If you see errors related to Redis (`ECONNREFUSED 127.0.0.1:6379`), don't worry! The backend automatically switches to use mock queues for development, so basic features will still work. OCR and background CSV imports might be limited.

**Database Locked or Missing Tables:**
Run `npm run db:init` in the `backend` folder to reset/initialize the database schema.

**Port Conflicts:**
If port 5000 or 5173 is in use, modify `.env` files or kill the existing process.

## 🤝 Contributing

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
