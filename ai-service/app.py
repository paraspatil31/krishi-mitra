import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from model import MandiPriceForecaster

load_dotenv()

app = FastAPI(
    title="Farmer Marketplace AI Price-Trend Service",
    description="Microservice providing machine-learning price trend forecasting for Indian APMC agricultural commodities.",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

forecaster = MandiPriceForecaster(regularization=1.0)


class PriceObservation(BaseModel):
    date: str
    price: Optional[float] = None
    avgModalPrice: Optional[float] = None
    modalPrice: Optional[float] = None
    minPrice: Optional[float] = None
    maxPrice: Optional[float] = None


class ForecastPoint(BaseModel):
    date: str
    predictedPrice: float
    confidenceMin: float
    confidenceMax: float
    dayName: str


class PredictionRequest(BaseModel):
    crop: str = Field(..., min_length=1, max_length=100)
    district: Optional[str] = None
    historicalPoints: List[PriceObservation] = []
    days: int = Field(default=7, ge=1, le=14)


class PredictionResponse(BaseModel):
    crop: str
    district: Optional[str] = None
    forecastDays: int
    trendDirection: str
    trendPercentage: float
    confidenceScore: float
    latestPrice: Optional[float] = None
    historicalObservations: int
    model: str
    forecast: List[ForecastPoint]
    disclaimer: str = "Estimated projection based on historical APMC modal trading patterns. Not a guaranteed future purchase or sale rate."


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
    }


@app.post("/predict", response_model=PredictionResponse)
def predict_trend(req: PredictionRequest):
    try:
        dict_records = [p.model_dump() for p in req.historicalPoints]
        result = forecaster.forecast(dict_records, forecast_days=req.days)

        return PredictionResponse(
            crop=req.crop,
            district=req.district,
            forecastDays=req.days,
            trendDirection=result.get("trendDirection", "stable"),
            trendPercentage=result.get("trendPercentage", 0.0),
            confidenceScore=result.get("confidenceScore", 0.70),
            latestPrice=result.get("latestPrice"),
            historicalObservations=result.get("historicalObservations", 0),
            model=result.get("model", "Ridge Regression"),
            forecast=result.get("forecast", []),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Forecasting calculation error: {str(exc)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
