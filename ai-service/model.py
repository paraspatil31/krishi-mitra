import math
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import numpy as np
from sklearn.linear_model import Ridge


class MandiPriceForecaster:
    """
    Lightweight, robust time-series forecaster for APMC Mandi commodity rates.
    Uses regularized Ridge regression with calendar harmonics and momentum features,
    paired with residual variance confidence estimation.
    """

    def __init__(self, regularization: float = 1.0):
        self.regularization = regularization

    def forecast(
        self,
        historical_records: List[Dict[str, Any]],
        forecast_days: int = 7,
    ) -> Dict[str, Any]:
        """
        Takes sorted historical price points:
        [{ "date": "2026-09-01", "price": 2800, "minPrice": 2600, "maxPrice": 3000 }, ...]
        Returns forward daily predictions with confidence intervals and trend direction.
        """
        forecast_days = max(1, min(14, int(forecast_days)))

        if not historical_records:
            return {
                "forecast": [],
                "trendDirection": "stable",
                "trendPercentage": 0.0,
                "confidenceScore": 0.0,
                "message": "No historical observations available for forecasting.",
            }

        # Sort chronologically by date
        sorted_points = sorted(historical_records, key=lambda x: str(x.get("date", "")))

        # Clean and extract series
        dates = []
        prices = []
        for p in sorted_points:
            raw_p = p.get("price") or p.get("avgModalPrice") or p.get("modalPrice")
            if raw_p is not None:
                try:
                    val = float(raw_p)
                    if val > 0:
                        prices.append(val)
                        dates.append(str(p.get("date", "")))
                except (ValueError, TypeError):
                    continue

        if not prices:
            return {
                "forecast": [],
                "trendDirection": "stable",
                "trendPercentage": 0.0,
                "confidenceScore": 0.0,
                "message": "Valid numerical prices were not found in input series.",
            }

        latest_price = prices[-1]
        try:
            last_date = datetime.strptime(dates[-1], "%Y-%m-%d")
        except Exception:
            last_date = datetime.now()

        # If very few points (1 or 2), apply moving average with gentle momentum
        if len(prices) < 3:
            return self._fallback_sparse_forecast(prices, last_date, forecast_days)

        # ── Feature Engineering ───────────────────────────────────────────
        n = len(prices)
        X = []
        y = np.array(prices)

        for i, d_str in enumerate(dates):
            try:
                dt = datetime.strptime(d_str, "%Y-%m-%d")
                dow = dt.weekday()
            except Exception:
                dow = (i % 7)

            # Features: [day_index, dow_sin, dow_cos, momentum_3d]
            dow_sin = math.sin(2 * math.pi * dow / 7)
            dow_cos = math.cos(2 * math.pi * dow / 7)
            momentum_3d = prices[i] - prices[max(0, i - 3)] if i > 0 else 0.0

            X.append([float(i), dow_sin, dow_cos, momentum_3d])

        X = np.array(X)

        # Fit Ridge model with regularized penalty to prevent extreme extrapolation
        model = Ridge(alpha=self.regularization)
        model.fit(X, y)

        fitted = model.predict(X)
        residuals = y - fitted
        std_err = float(np.std(residuals)) if len(residuals) > 1 else (latest_price * 0.05)
        std_err = max(std_err, latest_price * 0.03)  # minimum 3% volatility buffer

        # Forecast forward days
        forecast_points = []
        last_pred = latest_price

        for step in range(1, forecast_days + 1):
            future_date = last_date + timedelta(days=step)
            dow = future_date.weekday()
            dow_sin = math.sin(2 * math.pi * dow / 7)
            dow_cos = math.cos(2 * math.pi * dow / 7)
            momentum = last_pred - prices[max(0, n - 3)]

            features = np.array([[float(n - 1 + step), dow_sin, dow_cos, momentum]])
            raw_pred = float(model.predict(features)[0])

            # Dampen extreme divergence: blend 70% model with 30% latest price
            dampened_pred = round(0.75 * raw_pred + 0.25 * latest_price, 2)
            dampened_pred = max(1.0, dampened_pred)

            # Confidence expands with time horizon sqrt(step)
            horizon_spread = std_err * (1.0 + 0.15 * math.sqrt(step))
            conf_min = max(1.0, round(dampened_pred - 1.645 * horizon_spread, 2))
            conf_max = round(dampened_pred + 1.645 * horizon_spread, 2)

            forecast_points.append({
                "date": future_date.strftime("%Y-%m-%d"),
                "predictedPrice": round(dampened_pred, 2),
                "confidenceMin": conf_min,
                "confidenceMax": conf_max,
                "dayName": future_date.strftime("%a"),
            })
            last_pred = dampened_pred

        # Overall trend calculation
        final_pred = forecast_points[-1]["predictedPrice"]
        pct_change = round(((final_pred - latest_price) / latest_price) * 100, 2)

        if pct_change > 2.0:
            trend_dir = "bullish"
        elif pct_change < -2.0:
            trend_dir = "bearish"
        else:
            trend_dir = "stable"

        # R-squared confidence score bounded in [0.5, 0.95]
        var_y = np.var(y)
        if var_y > 0:
            r2 = max(0.0, 1.0 - (np.var(residuals) / var_y))
            conf_score = round(min(0.95, max(0.55, r2 * 0.9)), 2)
        else:
            conf_score = 0.70

        return {
            "forecast": forecast_points,
            "trendDirection": trend_dir,
            "trendPercentage": pct_change,
            "confidenceScore": conf_score,
            "latestPrice": latest_price,
            "historicalObservations": n,
            "model": "Ridge Regression with Temporal Harmonics",
        }

    def _fallback_sparse_forecast(
        self,
        prices: List[float],
        last_date: datetime,
        forecast_days: int,
    ) -> Dict[str, Any]:
        """Handles scenarios where only 1 or 2 historical data points exist."""
        latest_price = prices[-1]
        drift = 0.0
        if len(prices) == 2:
            drift = (prices[1] - prices[0]) * 0.3  # dampened slope

        forecast_points = []
        spread = latest_price * 0.06

        for step in range(1, forecast_days + 1):
            future_date = last_date + timedelta(days=step)
            pred = round(max(1.0, latest_price + (drift * step * 0.5)), 2)
            horizon_spread = spread * (1.0 + 0.1 * step)

            forecast_points.append({
                "date": future_date.strftime("%Y-%m-%d"),
                "predictedPrice": pred,
                "confidenceMin": max(1.0, round(pred - horizon_spread, 2)),
                "confidenceMax": round(pred + horizon_spread, 2),
                "dayName": future_date.strftime("%a"),
            })

        pct_change = round(((forecast_points[-1]["predictedPrice"] - latest_price) / latest_price) * 100, 2)
        trend_dir = "bullish" if pct_change > 2.0 else ("bearish" if pct_change < -2.0 else "stable")

        return {
            "forecast": forecast_points,
            "trendDirection": trend_dir,
            "trendPercentage": pct_change,
            "confidenceScore": 0.60,
            "latestPrice": latest_price,
            "historicalObservations": len(prices),
            "model": "Sparse Moving Average Fallback",
        }
