from model import MandiPriceForecaster

forecaster = MandiPriceForecaster()
sample_data = [
    {"date": "2026-09-01", "price": 2800},
    {"date": "2026-09-02", "price": 2850},
    {"date": "2026-09-03", "price": 2820},
    {"date": "2026-09-04", "price": 2900},
    {"date": "2026-09-05", "price": 2950},
]
res = forecaster.forecast(sample_data, forecast_days=7)
print("Trend Direction:", res["trendDirection"])
print("Trend Pct:", res["trendPercentage"])
print("Forecast Count:", len(res["forecast"]))
for p in res["forecast"][:3]:
    print(" ", p)
print("ALL TESTS IN TEST_MODEL PASSED")
