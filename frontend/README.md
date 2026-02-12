# 🎨 AI Financial Intelligence Frontend

## Enterprise-Grade TypeScript React Application

This is the production-ready frontend for the Intelligent Expense Management & Financial Analytics Platform.

---

## ✨ Features

### ✅ **Implemented (Phase 1)**
- 🔐 JWT Authentication with auto-logout
- 📱 Responsive layout (sidebar + navbar)
- 🎨 Enterprise UI component library
- 🔄 Complete service layer for API integration
- 📊 TypeScript with strict typing
- 🎯 React Router v6 navigation
- 💅 Tailwind CSS styling
- ⚡ Vite build tool

### 🚧 **In Progress (Phase 2)**
- 📊 Chart.js visualizations
- 📸 OCR receipt scanning (Tesseract.js)
- 🎤 Voice expense logging (Web Speech API)
- 🤖 AI Chatbot widget
- 📈 Forecasting dashboard
- 👥 Group expense management
- 💰 Smart budget recommendations

---

## 🏗 Tech Stack

| Technology | Purpose |
|---|---|
| **React 18** | UI library |
| **TypeScript** | Type safety |
| **Vite** | Build tool |
| **Tailwind CSS** | Styling |
| **React Router v6** | Navigation |
| **Axios** | HTTP client |
| **Chart.js + react-chartjs-2** | Data visualization |
| **Tesseract.js** | OCR for receipts |
| **Web Speech API** | Voice input |
| **Lucide React** | Icons |
| **Context API** | State management |

---

## 📂 Project Structure

```
src/
├── assets/                    # Static assets
├── components/
│   ├── layout/               # Sidebar, Navbar, Layout ✅
│   ├── ui/                   # Reusable UI components ✅
│   ├── charts/               # Chart components ⏳
│   ├── chatbot/              # AI assistant ⏳
│   ├── ocr/                  # Receipt scanner ⏳
│   ├── voice/                # Voice input ⏳
│   ├── budgeting/            # Budget components ⏳
│   ├── forecasting/          # Forecast charts ⏳
│   └── groups/               # Group expense components ⏳
├── context/
│   └── AuthContext.tsx       # Auth state management ✅
├── hooks/                    # Custom hooks ⏳
├── pages/
│   ├── LoginPage.tsx         # Auth page ✅
│   ├── DashboardPage.tsx     # Main dashboard ⏳
│   ├── TransactionsPage.tsx  # Transaction management ⏳
│   ├── AnalyticsPage.tsx     # Advanced analytics ⏳
│   ├── BudgetsPage.tsx       # Budget tracking ⏳
│   ├── GroupsPage.tsx        # Shared expenses ⏳
│   └── AssistantPage.tsx     # AI chatbot ⏳
├── services/                 # API integration layer ✅
│   ├── authService.ts
│   ├── transactionService.ts
│   ├── analyticsService.ts
│   ├── budgetService.ts
│   ├── chatbotService.ts
│   └── groupService.ts
├── types/
│   └── index.ts              # TypeScript definitions ✅
├── utils/
│   ├── apiClient.ts          # Axios configuration ✅
│   └── helpers.ts            # Utility functions ✅
├── routes/
│   └── ProtectedRoute.tsx    # Auth guard ✅
├── App.tsx                   # Main app component ✅
├── main.tsx                  # Entry point ✅
└── index.css                 # Global styles ✅
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Environment Setup
The backend API proxy is already configured in `vite.config.ts`:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
}
```

### 3. Start Development Server
```bash
npm run dev
```

The app will run on `http://localhost:5173`

### 4. Build for Production
```bash
npm run build
```

---

## 🎯 Routes

| Route | Component | Description | Status |
|---|---|---|---|
| `/login` | LoginPage | Authentication | ✅ Working |
| `/dashboard` | DashboardPage | Overview | ⏳ Pending |
| `/transactions` | TransactionsPage | Manage transactions | ⏳ Pending |
| `/analytics` | AnalyticsPage | Financial insights | ⏳ Pending |
| `/budgets` | BudgetsPage | Budget tracking | ⏳ Pending |
| `/groups` | GroupsPage | Shared expenses | ⏳ Pending |
| `/assistant` | AssistantPage | AI chatbot | ⏳ Pending |

---

## 🎨 UI Components

All components are fully typed and reusable:

### **Layout**
- `<Sidebar />` - Responsive navigation
- `<Navbar />` - Top bar with profile dropdown
- `<Layout />` - Main wrapper

### **UI Components**
- `<Button />` - Variants: primary, secondary, danger, success
- `<Input />` - With label, error, icon support
- `<Card />` - Container with header/footer
- `<Modal />` - Overlay dialog
- `<Badge />` - Status indicators
- `<Loader />` - Loading spinner
- `<Alert />` - Notification messages
- `<Skeleton />` - Loading placeholders

### **Usage Example**
```tsx
import { Button, Card, Input } from '@/components/ui';

<Card title="Create Transaction">
  <Input label="Amount" type="number" />
  <Button variant="primary">Submit</Button>
</Card>
```

---

## 🔌 Service Layer

All API calls go through typed service modules:

```typescript
import transactionService from '@/services/transactionService';

// Get transactions
const transactions = await transactionService.getTransactions({
  type: 'expense',
  start_date: '2024-02-01',
  end_date: '2024-02-28'
});

// Create transaction
const newTransaction = await transactionService.createTransaction({
  category_id: 1,
  type: 'expense',
  amount: 500,
  description: 'Grocery shopping',
  transaction_date: '2024-02-11',
  payment_method: 'credit_card'
});
```

---

## 🔐 Authentication

Using Context API for global auth state:

```tsx
import { useAuth } from '@/context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  const handleLogin = async () => {
    await login({ email: 'user@example.com', password: 'password' });
  };

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.full_name}</p>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

---

## 📊 Data Visualization

Using Chart.js for all visualizations:

```tsx
import { Bar } from 'react-chartjs-2';

const data = {
  labels: ['Jan', 'Feb', 'Mar'],
  datasets: [{
    label: 'Expenses',
    data: [5000, 6000, 5500],
    backgroundColor: '#4f46e5',
  }]
};

<Bar data={data} />
```

---

## 🎤 Voice Input Integration

Web Speech API for voice expense logging:

```tsx
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';
recognition.start();

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  // Process voice input
};
```

---

## 📸 OCR Integration

Tesseract.js for receipt scanning:

```tsx
import Tesseract from 'tesseract.js';

const result = await Tesseract.recognize(image, 'eng');
const amount = parseAmountFromText(result.data.text);
const date = parseDateFromText(result.data.text);
```

---

## 🛠 Utility Functions

20+ helper functions available in `utils/helpers.ts`:

```typescript
import { formatCurrency, formatDate, calculatePercentage } from '@/utils/helpers';

formatCurrency(5000);              // "₹5,000"
formatDate(new Date());            // "Feb 11, 2024"
calculatePercentage(300, 1000);    // 30
```

---

## 📱 Responsive Design

Mobile-first approach with Tailwind CSS:

```tsx
// Desktop: 3 columns, Tablet: 2 columns, Mobile: 1 column
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card>...</Card>
</div>
```

---

## 🧪 TypeScript Types

All entities are fully typed in `types/index.ts`:

```typescript
interface Transaction {
  id: number;
  user_id: number;
  category_id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  transaction_date: string;
  // ... more fields
}
```

---

## 🎯 File Naming Conventions

- **Components**: PascalCase with `.tsx` extension
- **Services**: camelCase with `.ts` extension
- **Utils**: camelCase with `.ts` extension
- **Types**: PascalCase interfaces/types

---

## 🔄 API Proxy

Vite automatically proxies `/api` requests to backend:

```
Frontend: http://localhost:5173/api/v1/transactions
   ↓
Backend:  http://localhost:5000/api/v1/transactions
```

---

## 📦 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

---

## 🎨 Theme Configuration

Enterprise color palette in `tailwind.config.js`:

```javascript
colors: {
  primary: {...},    // Indigo shades
  success: {...},    // Green shades
  danger: {...},     // Red shades
}
```

---

## 🚧 Development Status

**Phase 1 Complete (55%)**:
- ✅ Project setup & configuration
- ✅ Type system & utilities
- ✅ Service layer (all 6 services)
- ✅ Authentication
- ✅ Layout & navigation
- ✅ UI component library
- ✅ Routing

**Phase 2 In Progress (45%)**:
- ⏳ Page implementations
- ⏳ Chart components
- ⏳ OCR integration
- ⏳ Voice input
- ⏳ Chatbot widget
- ⏳ Custom hooks

---

## 🔮 Future Enhancements

- PWA support
- Offline mode
- Push notifications
- Dark mode toggle
- Multi-language support
- Export to PDF/Excel

---

## 📝 Code Quality

- ✅ TypeScript strict mode
- ✅ ESLint configuration
- ✅ Consistent code style
- ✅ Component documentation
- ✅ Proper error handling
- ✅ Loading states
- ✅ Responsive design

---

## 🤝 Contributing

This is an academic/demonstration project showcasing enterprise frontend development.

---

## 📄 License

MIT License

---

**Status: Phase 1 Complete - Production Ready Foundation**

Built with React + TypeScript + Tailwind CSS
