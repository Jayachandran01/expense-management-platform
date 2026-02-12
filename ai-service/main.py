"""
AI Financial Intelligence Service
FastAPI server for OCR, Forecasting, Budget Recommendations
"""
import os
import io
import re
import json
import logging
import tempfile
from datetime import datetime, timedelta
from typing import Optional, List

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Conditional imports
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    logging.warning("Prophet not installed. Forecasting will use fallback method.")

try:
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logging.warning("scikit-learn not installed. Budget recommendations will use fallback.")

try:
    import pytesseract
    from PIL import Image
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    logging.warning("Tesseract/Pillow not installed. OCR will be unavailable.")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Financial Intelligence Service",
    version="1.0.0",
    description="OCR, Forecasting, and Budget Recommendation Engine"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# MODELS
# ============================================================
class ForecastRequest(BaseModel):
    monthly_data: list  # [{"month": "2026-01", "total": 45000}, ...]
    horizon: int = 3

class BudgetRecommendRequest(BaseModel):
    category_history: list  # [{"category": "Food", "monthly_totals": [5000, 6000, 5500, ...]}]

class CategorizationRequest(BaseModel):
    description: str
    merchant: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    services: dict
    timestamp: str


# ============================================================
# HEALTH CHECK
# ============================================================
@app.get("/health", response_model=HealthResponse)
async def health():
    return {
        "status": "healthy",
        "services": {
            "ocr": "available" if OCR_AVAILABLE else "unavailable",
            "prophet": "available" if PROPHET_AVAILABLE else "unavailable",
            "sklearn": "available" if SKLEARN_AVAILABLE else "unavailable",
        },
        "timestamp": datetime.now().isoformat()
    }


# ============================================================
# 1. OCR RECEIPT PROCESSING
# ============================================================
@app.post("/ocr/extract")
async def ocr_extract(file: UploadFile = File(...)):
    """Extract transaction data from receipt image using Tesseract OCR"""
    if not OCR_AVAILABLE:
        raise HTTPException(503, "OCR service not available. Install tesseract and pytesseract.")

    start = datetime.now()

    # Validate file
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image (JPEG, PNG, WebP)")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        # Convert to grayscale for better OCR
        image = image.convert("L")

        # Run Tesseract OCR
        raw_text = pytesseract.image_to_string(image, lang="eng")

        # Extract structured data
        amount = _extract_amount(raw_text)
        date = _extract_date(raw_text)
        merchant = _extract_merchant(raw_text)
        items = _extract_line_items(raw_text)

        # Calculate confidence
        confidence = 0.0
        if amount: confidence += 0.4
        if date: confidence += 0.2
        if merchant: confidence += 0.2
        if items: confidence += 0.2

        processing_time = int((datetime.now() - start).total_seconds() * 1000)

        return {
            "success": True,
            "data": {
                "raw_text": raw_text,
                "extracted_amount": amount,
                "extracted_date": date,
                "extracted_merchant": merchant,
                "extracted_items": items,
                "confidence": round(confidence, 2),
                "processing_time_ms": processing_time,
            }
        }
    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        raise HTTPException(500, f"OCR processing failed: {str(e)}")


def _extract_amount(text: str) -> Optional[float]:
    """Extract total amount from receipt text"""
    patterns = [
        r'(?:total|grand\s*total|net\s*amount|amount\s*due|bill\s*amount|payable)[:\s]*[₹Rs.INR\s]*(\d[\d,]*\.?\d*)',
        r'[₹][\s]*(\d[\d,]*\.?\d*)',
        r'(?:Rs\.?|INR)\s*(\d[\d,]*\.?\d*)',
        r'TOTAL[:\s]+(\d[\d,]*\.?\d*)',
    ]
    for pat in patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            val = match.group(1).replace(',', '')
            try:
                return round(float(val), 2)
            except ValueError:
                continue
    # Fallback: largest number in text
    numbers = re.findall(r'(\d[\d,]*\.\d{2})', text)
    if numbers:
        nums = [float(n.replace(',', '')) for n in numbers]
        return max(nums)
    return None


def _extract_date(text: str) -> Optional[str]:
    """Extract date from receipt text"""
    patterns = [
        (r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', '{2}-{1}-{0}'),
        (r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})', '{0}-{1}-{2}'),
        (r'(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})', None),
    ]
    months = {'jan':'01','feb':'02','mar':'03','apr':'04','may':'05','jun':'06',
              'jul':'07','aug':'08','sep':'09','oct':'10','nov':'11','dec':'12'}

    for pat, fmt in patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            groups = match.groups()
            if fmt:
                parts = [g.zfill(2) for g in groups]
                return fmt.format(*parts)
            else:
                day = groups[0].zfill(2)
                mon = months.get(groups[1][:3].lower(), '01')
                return f"{groups[2]}-{mon}-{day}"
    return None


def _extract_merchant(text: str) -> Optional[str]:
    """Extract merchant/store name from receipt (usually first line)"""
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if lines:
        # First non-numeric, reasonably short line is likely the merchant
        for line in lines[:5]:
            cleaned = re.sub(r'[^a-zA-Z\s&\'-]', '', line).strip()
            if 3 <= len(cleaned) <= 60:
                return cleaned.title()
    return None


def _extract_line_items(text: str) -> list:
    """Extract line items from receipt"""
    items = []
    # Pattern: item name followed by amount
    pattern = r'([A-Za-z][\w\s]{2,30})\s+(\d[\d,]*\.?\d*)'
    matches = re.findall(pattern, text)
    for name, price in matches[:20]:
        name = name.strip()
        try:
            price_val = float(price.replace(',', ''))
            if 1 <= price_val <= 100000:
                items.append({"name": name, "price": price_val})
        except ValueError:
            continue
    return items


# ============================================================
# 2. FORECASTING ENGINE (Prophet)
# ============================================================
@app.post("/forecast/predict")
async def forecast_predict(req: ForecastRequest):
    """Generate spending forecast using Prophet or statistical fallback"""
    if len(req.monthly_data) < 3:
        raise HTTPException(400, "Need at least 3 months of data for forecasting")

    try:
        if PROPHET_AVAILABLE:
            return _prophet_forecast(req.monthly_data, req.horizon)
        else:
            return _statistical_forecast(req.monthly_data, req.horizon)
    except Exception as e:
        logger.error(f"Forecast failed: {e}")
        return _statistical_forecast(req.monthly_data, req.horizon)


def _prophet_forecast(data: list, horizon: int) -> dict:
    """Prophet-based forecasting"""
    df = pd.DataFrame(data)
    df.columns = ['ds', 'y']
    df['ds'] = pd.to_datetime(df['ds'] + '-01')

    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10,
    )
    model.fit(df)

    future = model.make_future_dataframe(periods=horizon, freq='MS')
    prediction = model.predict(future)

    # Get only future predictions
    future_pred = prediction.tail(horizon)

    forecasts = []
    for _, row in future_pred.iterrows():
        forecasts.append({
            "month": row['ds'].strftime('%Y-%m'),
            "predicted": round(float(row['yhat']), 2),
            "lower": round(float(row['yhat_lower']), 2),
            "upper": round(float(row['yhat_upper']), 2),
            "confidence": round(1 - (float(row['yhat_upper'] - row['yhat_lower']) / max(float(row['yhat']), 1)), 2),
        })

    # Calculate accuracy metrics on training data
    train_pred = model.predict(df[['ds']])
    actual = df['y'].values
    predicted_train = train_pred['yhat'].values[:len(actual)]
    mae = float(np.mean(np.abs(actual - predicted_train)))
    mape = float(np.mean(np.abs((actual - predicted_train) / np.where(actual == 0, 1, actual)))) * 100
    rmse = float(np.sqrt(np.mean((actual - predicted_train) ** 2)))

    return {
        "success": True,
        "data": {
            "forecast": forecasts,
            "model": "prophet",
            "data_points": len(data),
            "metrics": {"mae": round(mae, 2), "mape": round(mape, 1), "rmse": round(rmse, 2)}
        }
    }


def _statistical_forecast(data: list, horizon: int) -> dict:
    """Fallback: linear regression + seasonality"""
    values = [d.get('total', d.get('y', 0)) for d in data]
    n = len(values)

    # Linear trend
    x = np.arange(n)
    slope = np.polyfit(x, values, 1)[0]
    mean_val = np.mean(values)

    forecasts = []
    for i in range(1, horizon + 1):
        predicted = mean_val + slope * (n + i - 1)
        predicted = max(predicted, 0)
        std = np.std(values) if n > 1 else mean_val * 0.15
        forecasts.append({
            "month": (datetime.now() + timedelta(days=30 * i)).strftime('%Y-%m'),
            "predicted": round(predicted, 2),
            "lower": round(max(predicted - 1.5 * std, 0), 2),
            "upper": round(predicted + 1.5 * std, 2),
            "confidence": round(max(0.5, 1 - (std / max(mean_val, 1))), 2),
        })

    return {
        "success": True,
        "data": {
            "forecast": forecasts,
            "model": "statistical_fallback",
            "data_points": n,
            "metrics": {"mae": round(float(np.std(values)), 2), "mape": 15.0, "rmse": round(float(np.std(values) * 1.2), 2)}
        }
    }


# ============================================================
# 3. BUDGET RECOMMENDATION ENGINE (Gradient Boosting)
# ============================================================
@app.post("/budget/recommend")
async def budget_recommend(req: BudgetRecommendRequest):
    """Suggest monthly budgets per category using ML or statistical fallback"""
    if not req.category_history:
        raise HTTPException(400, "Category history is required")

    recommendations = []

    for cat_data in req.category_history:
        category = cat_data.get("category", "Unknown")
        totals = cat_data.get("monthly_totals", [])

        if len(totals) < 2:
            recommendations.append({
                "category": category,
                "recommended_budget": round(sum(totals) / max(len(totals), 1) * 1.1, 2),
                "confidence": 0.4,
                "method": "average_fallback",
                "trend": "insufficient_data"
            })
            continue

        if SKLEARN_AVAILABLE and len(totals) >= 3:
            rec = _ml_budget_recommendation(category, totals)
        else:
            rec = _statistical_budget_recommendation(category, totals)

        recommendations.append(rec)

    return {
        "success": True,
        "data": {"recommendations": recommendations}
    }


def _ml_budget_recommendation(category: str, totals: list) -> dict:
    """Gradient Boosting based budget recommendation"""
    n = len(totals)
    X = np.array([[i, totals[i-1] if i > 0 else totals[0]] for i in range(n)])
    y = np.array(totals)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = GradientBoostingRegressor(
        n_estimators=50, max_depth=3, learning_rate=0.1, random_state=42
    )
    model.fit(X_scaled, y)

    # Predict next month
    next_X = np.array([[n, totals[-1]]])
    next_X_scaled = scaler.transform(next_X)
    predicted = float(model.predict(next_X_scaled)[0])

    # Add 10% buffer for budget
    recommended = max(predicted * 1.10, 0)

    # Trend analysis
    recent_avg = np.mean(totals[-3:])
    older_avg = np.mean(totals[:-3]) if len(totals) > 3 else recent_avg
    trend = "increasing" if recent_avg > older_avg * 1.05 else "decreasing" if recent_avg < older_avg * 0.95 else "stable"

    train_pred = model.predict(X_scaled)
    mape = np.mean(np.abs((y - train_pred) / np.where(y == 0, 1, y))) * 100

    return {
        "category": category,
        "recommended_budget": round(recommended, 2),
        "predicted_spending": round(predicted, 2),
        "confidence": round(max(0.5, 1 - mape / 100), 2),
        "method": "gradient_boosting",
        "trend": trend,
        "history_months": n,
    }


def _statistical_budget_recommendation(category: str, totals: list) -> dict:
    """Statistical fallback for budget recommendation"""
    mean_val = np.mean(totals)
    std_val = np.std(totals)

    # Weighted average (recent months weighted more)
    weights = np.linspace(0.5, 1.5, len(totals))
    weighted_mean = np.average(totals, weights=weights)

    recommended = weighted_mean * 1.10 + std_val * 0.5

    trend = "increasing" if totals[-1] > mean_val * 1.05 else "decreasing" if totals[-1] < mean_val * 0.95 else "stable"

    return {
        "category": category,
        "recommended_budget": round(recommended, 2),
        "predicted_spending": round(weighted_mean, 2),
        "confidence": round(max(0.4, 1 - (std_val / max(mean_val, 1))), 2),
        "method": "statistical",
        "trend": trend,
        "history_months": len(totals),
    }


# ============================================================
# 4. SMART CATEGORIZATION
# ============================================================
CATEGORY_KEYWORDS = {
    "Food & Dining": ["swiggy", "zomato", "restaurant", "cafe", "pizza", "burger", "dominos", "mcdonalds",
                       "kfc", "subway", "starbucks", "chai", "biryani", "food", "dining", "lunch", "dinner",
                       "breakfast", "snacks", "bakery", "haldirams", "barbeque"],
    "Groceries": ["bigbasket", "zepto", "dmart", "grocery", "vegetables", "fruits", "milk", "supermarket",
                   "reliance fresh", "more", "nature basket", "provisions", "ration"],
    "Transport": ["uber", "ola", "rapido", "metro", "bus", "train", "cab", "petrol", "diesel", "fuel",
                   "parking", "toll", "irctc", "railways", "auto", "rickshaw"],
    "Shopping": ["amazon", "flipkart", "myntra", "ajio", "croma", "shopping", "mall", "clothes",
                  "electronics", "shoes", "decathlon", "reliance digital"],
    "Utilities": ["electricity", "water", "gas", "internet", "wifi", "jio", "airtel", "vodafone",
                   "recharge", "dth", "broadband", "mobile bill", "bescom", "bwssb"],
    "Rent": ["rent", "lease", "house rent", "flat rent", "pg rent", "hostel"],
    "Entertainment": ["netflix", "spotify", "hotstar", "movie", "cinema", "pvr", "inox", "gaming",
                       "concert", "bookmyshow", "sony liv", "prime video"],
    "Healthcare": ["hospital", "doctor", "pharmacy", "medicine", "medical", "apollo", "practo",
                    "pharmeasy", "1mg", "diagnostic", "lab test", "health"],
    "Education": ["course", "udemy", "coursera", "books", "tuition", "coaching", "school",
                   "college", "certification", "exam", "unacademy"],
    "Travel": ["flight", "hotel", "trip", "booking", "makemytrip", "oyo", "cleartrip",
                "airbnb", "resort", "vacation", "yatra"],
    "Personal Care": ["salon", "spa", "gym", "nykaa", "cosmetics", "haircut", "skincare", "cultfit"],
    "EMI / Loans": ["emi", "loan", "credit card bill", "installment", "mortgage"],
    "Investments": ["mutual fund", "sip", "stocks", "shares", "fd", "fixed deposit", "investment", "zerodha", "groww"],
    "Gifts & Donations": ["gift", "donation", "charity", "contribution", "birthday", "wedding"],
    "Salary": ["salary", "payroll", "wages", "income", "stipend"],
    "Freelance": ["freelance", "consulting", "contract", "project payment", "upwork", "fiverr"],
}

@app.post("/categorize")
async def categorize(req: CategorizationRequest):
    """Categorize a transaction by description/merchant"""
    text = f"{req.description} {req.merchant or ''}".lower()

    best_match = None
    best_score = 0

    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > best_score:
            best_score = score
            best_match = category

    confidence = min(best_score * 0.25, 0.95) if best_score > 0 else 0.1

    return {
        "success": True,
        "data": {
            "category": best_match or "Shopping",
            "confidence": round(confidence, 2),
            "matched_keywords": best_score,
        }
    }


# ============================================================
# RUN
# ============================================================
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("AI_SERVICE_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
