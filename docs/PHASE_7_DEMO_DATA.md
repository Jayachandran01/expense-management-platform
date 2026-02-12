# PHASE 7 — DEMO DATA STRATEGY

## Overview

Enterprise demos require **realistic, believable data**. Random numbers look fake instantly. Our seeding strategy generates data that mirrors real Indian household/individual financial patterns.

---

## 1. Generating Realistic Financial Transactions

### Indian Salary Profiles (3 Demo Users)

```
User 1: "Priya Sharma" (Software Engineer, Bangalore)
  Monthly salary: ₹85,000 (credited 1st of each month)
  Freelance income: ₹10,000-25,000 (irregular, 2-3 months)
  
User 2: "Rahul Verma" (Marketing Manager, Mumbai)
  Monthly salary: ₹65,000 (credited 28th of each month)
  Side hustle: ₹5,000-8,000 (months with content creation)

User 3: "Anita Patel" (Student, Pune)
  Monthly allowance: ₹20,000 (from parents, 5th of each month)
  Part-time tutoring: ₹3,000-6,000 (weekends)
```

### Spending Category Distribution (Based on Indian Urban Averages)

```
Priya (₹85,000 income):
  ├── Housing/Rent:      ₹22,000  (26%) — fixed, same every month
  ├── Food & Dining:     ₹12,000  (14%) — variable ±30%
  ├── Transportation:     ₹5,500  (6.5%) — variable ±40%
  ├── Utilities:          ₹4,000  (4.7%) — seasonal (AC in summer)
  ├── Shopping:           ₹8,000  (9.4%) — spiky (sales seasons)
  ├── Entertainment:      ₹4,500  (5.3%) — weekends
  ├── Health & Fitness:   ₹3,000  (3.5%) — gym membership + occasional
  ├── Personal Care:      ₹2,500  (2.9%) — monthly
  ├── Education:          ₹3,500  (4.1%) — courses, books
  ├── Insurance:          ₹2,000  (2.4%) — quarterly
  ├── Subscriptions:      ₹1,500  (1.8%) — Netflix, Spotify, cloud
  ├── Gifts & Donations:  ₹2,000  (2.4%) — festivals
  ├── Savings/Investment: ₹14,500 (17%) — SIP, FD
  └── TOTAL EXPENSES:    ₹70,500 (83% of income)
```

---

## 2. Simulating Income Patterns

### Logic Approach

```
generateIncome(user, month):
  
  1. SALARY (fixed):
     amount = user.salary
     date = user.salary_day of month
     variation = ±0 (salary is exact every month)
     merchant = user.employer_name
     
     Special cases:
       - March: Annual bonus (1 month salary) with 50% probability
       - November: Diwali bonus (₹10,000-25,000) with 70% probability
  
  2. FREELANCE/SIDE INCOME (irregular):
     probability_this_month = 0.4  (40% chance of freelance income)
     if random() < probability:
       amount = randomBetween(user.freelance_min, user.freelance_max)
       date = randomDay(10, 25)  // Mid-month
       merchant = randomChoice(["Fiverr", "Upwork", "Direct Client", "Toptal"])
  
  3. OTHER INCOME (rare):
     probability = 0.1 (10% chance per month)
     types: ["Cashback", "Interest", "Gift", "Tax Refund", "Dividend"]
     amount = randomBetween(500, 5000)
```

---

## 3. Simulating Monthly Spending Cycles

### Transaction Generation Logic

```
generateMonthlyExpenses(user, month):

  For each category in user.spending_profile:
    
    base_amount = category.monthly_budget
    
    1. APPLY SEASONALITY:
       if category == "Utilities" and month in [4,5,6,7]:  // Summer
         base_amount *= 1.4  // AC electricity spike
       if category == "Shopping" and month in [10,11]:  // Festive
         base_amount *= 1.8  // Diwali/Dussehra shopping
       if category == "Gifts" and month == 12:
         base_amount *= 2.0  // Year-end gifts
    
    2. APPLY RANDOM VARIATION:
       variation = category.volatility  // e.g., 0.3 for 30%
       actual_amount = base_amount * randomBetween(1-variation, 1+variation)
    
    3. SPLIT INTO INDIVIDUAL TRANSACTIONS:
       num_transactions = category.frequency_per_month
       // Food: 15-25 transactions/month
       // Rent: 1 transaction/month
       // Shopping: 3-8 transactions/month
       
       For each transaction:
         amount = actual_amount / num_transactions * randomBetween(0.5, 1.5)
         date = randomWeightedDay(month)  // Weekends heavier for entertainment
         merchant = randomChoice(category.merchants)
         description = generateDescription(category, merchant)
    
    4. APPLY WEEKLY PATTERNS:
       Weekend transactions: +40% probability for dining, entertainment
       Weekday transactions: +30% probability for transportation, food delivery
       Month-start: Rent, insurance, subscriptions (1st-5th)
       Month-end: Lower spending (running low on budget)
```

### Merchant Lists (Per Category)

```
merchants = {
  "Food & Dining": {
    dining_out: ["Swiggy", "Zomato", "Domino's", "McDonald's", "Subway",
                 "Barbeque Nation", "Haldiram's", "Saravana Bhavan"],
    groceries: ["BigBazaar", "DMart", "More Supermarket", "Reliance Fresh",
                "BigBasket", "JioMart", "Zepto"],
    beverages: ["Starbucks", "CCD", "Chai Point", "Chaayos"]
  },
  "Transportation": {
    ride: ["Uber", "Ola", "Rapido", "Auto Rickshaw"],
    fuel: ["HP Petrol Pump", "Indian Oil", "Bharat Petroleum"],
    public: ["Metro Card Recharge", "BMTC Bus", "Local Train"]
  },
  "Shopping": {
    online: ["Amazon", "Flipkart", "Myntra", "Ajio", "Nykaa"],
    offline: ["Reliance Digital", "Croma", "Lifestyle", "Shoppers Stop"]
  },
  "Utilities": {
    bills: ["BESCOM Electricity", "BWSSB Water", "Airtel Broadband",
            "Jio Recharge", "Piped Gas Bill", "DTH Recharge"]
  },
  "Entertainment": {
    streaming: ["Netflix", "Amazon Prime", "Disney+ Hotstar", "Spotify"],
    activities: ["PVR Cinemas", "BookMyShow", "Timezone Gaming"]
  },
  "Subscriptions": {
    services: ["Netflix", "Spotify Premium", "YouTube Premium", "iCloud Storage",
               "LinkedIn Premium", "Notion", "Figma"]
  }
}
```

---

## 4. Generating Budget Distribution

```
generateBudgets(user, currentMonth):

  // Create budgets based on spending profile
  For each category in user.top_spending_categories:
    
    // Budget = average spending * 1.1 (10% buffer)
    avgSpending = average of last 3 months spending in this category
    budgetAmount = Math.ceil(avgSpending * 1.1 / 100) * 100  // Round to nearest 100
    
    budget = {
      category_id: category.id,
      budget_type: 'monthly',
      amount: budgetAmount,
      start_date: firstDayOfMonth,
      end_date: lastDayOfMonth,
      alert_threshold: 80,
      is_active: true
    }
  
  // Overall monthly budget
  overallBudget = {
    category_id: null,  // applies to all categories
    budget_type: 'monthly',
    amount: user.salary * 0.85,  // 85% of income (target 15% savings)
    alert_threshold: 90
  }
  
  // Create one budget that's already exceeded (for demo alerts)
  exceededBudget = budgets[2]  // e.g., Shopping
  exceededBudget.amount = exceededBudget.amount * 0.7  // Set budget low so it's exceeded
  
  // Create one budget at warning level
  warningBudget = budgets[1]  // e.g., Dining
  warningBudget.amount = warningBudget.amount * 0.95  // Just barely over threshold
```

---

## 5. Seeding Group Expenses

```
generateGroupExpenses():

  Group 1: "Bangalore Roommates" (Priya + 2 others)
    Members: Priya(admin), Rahul(member), Anita(member)
    
    Monthly shared expenses:
      - Rent: ₹45,000 (split equal: ₹15,000 each)
      - Electricity: ₹3,000-5,000 (split equal)
      - Internet: ₹1,500 (split equal)
      - Groceries: ₹6,000-8,000 (split equal, multiple transactions)
      - Cooking gas: ₹900 (split equal)
    
    Generate 3 months of group transactions:
      paid_by rotates (realistic — different person pays each time)
      settlement: Generate partial settlements at month-end
      Leave some amounts unsettled (shows balance in demo)
    
  Group 2: "Goa Trip - Jan 2026" (Priya + 3 friends)
    Members: Priya, Rahul, Anita, Guest1
    
    Trip expenses (one-time):
      - Flight tickets: ₹8,000 each (Priya booked all, ₹32,000)
      - Hotel 3 nights: ₹12,000 (Rahul paid)
      - Scooter rental: ₹2,400 (Anita paid)
      - Meals: 8 transactions, ₹500-2,000 each (various payers)
      - Activities: 4 transactions, ₹1,000-3,000 (various payers)
    
    Settlement status: 
      Priya is owed ₹18,500
      Rahul is owed ₹4,200
      Anita owes ₹7,800
      Guest1 owes ₹14,900
```

---

## 6. Generating Forecast Data

```
generateForecastData(user):

  // Generate 6 months of historical daily spending data
  history = []
  for month in range(6_months_ago, today):
    for day in month:
      dailySpend = generateDailySpending(user, day)
      history.push({ ds: day, y: dailySpend })
  
  // Pre-compute forecast results (simulating Prophet output)
  // Use simple trend + seasonality for seeding
  for month in range(next_3_months):
    avgMonthlySpend = average(last 3 months spending)
    trend = 0.02  // 2% monthly increase (inflation)
    seasonality = getSeasonalFactor(month)  // Higher in festive months
    
    predicted = avgMonthlySpend * (1 + trend) * seasonality
    lower = predicted * 0.85
    upper = predicted * 1.15
    
    forecast_results.push({
      user_id: user.id,
      forecast_type: 'spending',
      forecast_data: [
        { date: month, predicted, lower, upper }
      ],
      model_used: 'prophet',
      accuracy_metrics: { mae: predicted*0.08, mape: 8.5, rmse: predicted*0.1 },
      valid_until: NOW() + '7 days'
    })

  // Generate AI insights based on seeded data
  insights = [
    {
      type: 'spending_spike',
      title: 'Shopping spike detected',
      description: 'Your shopping expenses this month are 45% higher than your 3-month average',
      severity: 'warning',
      metric_value: 11600,
      metric_context: { current: 11600, average: 8000, increase_pct: 45 }
    },
    {
      type: 'savings_milestone',
      title: 'Great savings rate!',
      description: 'You saved 22% of your income this month. Keep it up!',
      severity: 'info'
    },
    {
      type: 'recurring_detected',
      title: 'Recurring expense detected',
      description: 'Netflix (₹649) appears every month. Track as subscription?',
      severity: 'info',
      action_type: 'convert_to_recurring'
    }
  ]
```

---

## Seeding Execution Plan

```
Seed script: npm run db:seed

Execution order (respects foreign key constraints):
  1. Seed categories (system defaults) — 20 categories
  2. Seed users (3 demo users with hashed passwords) — password: "Demo@2026"
  3. Seed transactions (6 months × 3 users × ~60-100 txn/month) — ~1,500 transactions
  4. Seed budgets (current month, per user) — ~18 budgets
  5. Seed groups + members — 2 groups
  6. Seed group_transactions — ~30 group transactions
  7. Seed voice_logs (sample entries) — 5 entries
  8. Seed ocr_receipts (sample entries) — 3 entries  
  9. Seed csv_import_logs (sample completed import) — 1 entry
  10. Seed forecast_results (pre-computed) — 6 forecast records
  11. Seed ai_insights (sample insights) — 10 insight records
  12. Seed audit_logs (sample activity) — 50 audit entries

Total seeded records: ~1,700+
Execution time: <10 seconds
```

---

## Data Verification Queries

```sql
-- After seeding, verify data quality:

-- 1. Check transaction distribution
SELECT type, COUNT(*), SUM(amount), AVG(amount)
FROM transactions GROUP BY type;

-- 2. Check monthly spending pattern (should show realistic variation)
SELECT DATE_TRUNC('month', transaction_date) as month,
       COUNT(*), SUM(amount)
FROM transactions WHERE type = 'expense'
GROUP BY month ORDER BY month;

-- 3. Check category distribution
SELECT c.name, COUNT(t.id), SUM(t.amount)
FROM transactions t JOIN categories c ON t.category_id = c.id
WHERE t.type = 'expense'
GROUP BY c.name ORDER BY SUM(t.amount) DESC;

-- 4. Verify budget status (should have mix of on-track, warning, exceeded)
SELECT b.id, c.name, b.amount as budget,
       COALESCE(SUM(t.amount), 0) as spent,
       CASE WHEN SUM(t.amount) > b.amount THEN 'EXCEEDED'
            WHEN SUM(t.amount) > b.amount * 0.8 THEN 'WARNING'
            ELSE 'ON_TRACK' END as status
FROM budgets b
LEFT JOIN categories c ON b.category_id = c.id
LEFT JOIN transactions t ON t.category_id = b.category_id 
  AND t.user_id = b.user_id AND t.type = 'expense'
  AND t.transaction_date BETWEEN b.start_date AND b.end_date
GROUP BY b.id, c.name, b.amount;
```
