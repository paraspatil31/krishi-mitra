import { Request, Response, NextFunction } from "express";
import { WeatherService } from "../services/weather.service";

/**
 * GET /api/weather
 * Query parameters: lat, lng, or district
 * Returns current meteorological conditions, 7-day forecast, and active district alerts.
 */
export async function forecast(req: Request, res: Response, next: NextFunction) {
  try {
    let lat = Number(req.query.lat);
    let lng = Number(req.query.lng);
    const district = typeof req.query.district === "string" ? req.query.district.trim() : undefined;

    if (district && (isNaN(lat) || isNaN(lng))) {
      const coords = WeatherService.getCoordinatesForDistrict(district);
      lat = coords.lat;
      lng = coords.lng;
    } else if (isNaN(lat) || isNaN(lng)) {
      // Default fallback: Central Maharashtra agricultural coordinates (Pune)
      lat = 18.5204;
      lng = 73.8567;
    }

    const [forecastData, activeAlerts] = await Promise.all([
      WeatherService.getForecast(lat, lng),
      WeatherService.getActiveAlerts(district),
    ]);

    res.json({
      data: forecastData,
      district: district || "Maharashtra Central",
      activeAlerts,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/weather/alerts
 * Query parameter: district (optional)
 * Returns active WeatherAlert records scoped to the farmer's district.
 */
export async function getAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const userDistrict = (req as any).user?.district;
    const queryDistrict = typeof req.query.district === "string" ? req.query.district.trim() : undefined;
    const targetDistrict = queryDistrict || userDistrict;

    const alerts = await WeatherService.getActiveAlerts(targetDistrict);

    res.json({
      data: alerts,
      district: targetDistrict || "All Districts",
      count: alerts.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/weather/scan
 * Triggers on-demand evaluation of weather alert thresholds across all monitored districts.
 */
export async function triggerAlertScan(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await WeatherService.runScheduledAlertScan();
    res.json({
      success: true,
      message: "Weather alert scan completed across agricultural districts.",
      result,
    });
  } catch (err) {
    next(err);
  }
}
