import axios from "axios";
import WeatherAlert, { IWeatherAlert, WeatherAlertType, AlertSeverity } from "../models/WeatherAlert";
import { notificationService } from "./notification.service";

interface DistrictCoordinate {
  district: string;
  lat: number;
  lng: number;
}

// Major agricultural districts in Maharashtra with representative geographical coordinates
export const AGRICULTURAL_DISTRICTS: DistrictCoordinate[] = [
  { district: "Nashik", lat: 19.9975, lng: 73.7898 },
  { district: "Pune", lat: 18.5204, lng: 73.8567 },
  { district: "Nagpur", lat: 21.1458, lng: 79.0882 },
  { district: "Kolhapur", lat: 16.705, lng: 74.2433 },
  { district: "Solapur", lat: 17.6599, lng: 75.9064 },
  { district: "Ahmednagar", lat: 19.0952, lng: 74.7496 },
  { district: "Ahilyanagar", lat: 19.0952, lng: 74.7496 },
  { district: "Amarawati", lat: 20.932, lng: 77.7523 },
  { district: "Akola", lat: 20.7002, lng: 77.0082 },
  { district: "Chhatrapati Sambhajinagar", lat: 19.8762, lng: 75.3433 },
  { district: "Aurangabad", lat: 19.8762, lng: 75.3433 },
  { district: "Jalgaon", lat: 21.0077, lng: 75.5626 },
  { district: "Satara", lat: 17.6805, lng: 74.0183 },
  { district: "Sangli", lat: 16.8524, lng: 74.5815 },
  { district: "Latur", lat: 18.4088, lng: 76.5604 },
  { district: "Thane", lat: 19.2183, lng: 72.9781 },
];

interface WeatherCacheEntry {
  data: any;
  timestamp: number;
}

export class WeatherService {
  private static forecastCache = new Map<string, WeatherCacheEntry>();
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache per coordinate

  /**
   * Get weather forecast for coordinates from Open-Meteo with 1-hour in-memory cache.
   */
  public static async getForecast(lat: number, lng: number): Promise<any> {
    const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
    const cached = this.forecastCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

    try {
      const response = await axios.get(url, {
        timeout: 8000,
        headers: { "User-Agent": "FarmerMarketplace/1.0" },
      });

      const data = response.data;
      this.forecastCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (err: any) {
      if (cached) {
        console.warn("[WeatherService] Live API failed, returning stale cached weather:", err.message);
        return cached.data;
      }
      throw new Error(`Weather service unavailable: ${err.message}`);
    }
  }

  /**
   * Find coordinates for a given district name.
   */
  public static getCoordinatesForDistrict(districtName: string): { lat: number; lng: number } {
    const clean = districtName.trim().toLowerCase();
    const match = AGRICULTURAL_DISTRICTS.find(
      (d) => d.district.toLowerCase() === clean || clean.includes(d.district.toLowerCase())
    );

    if (match) {
      return { lat: match.lat, lng: match.lng };
    }

    // Default to central Maharashtra (Pune) if district not explicitly mapped
    return { lat: 18.5204, lng: 73.8567 };
  }

  /**
   * Evaluate a district's 3-day forecast against agronomic alert thresholds.
   */
  public static async evaluateDistrictAlerts(districtObj: DistrictCoordinate): Promise<IWeatherAlert[]> {
    const { district, lat, lng } = districtObj;
    const triggered: IWeatherAlert[] = [];

    try {
      const forecast = await this.getForecast(lat, lng);
      const daily = forecast.daily;

      if (!daily || !daily.time || daily.time.length === 0) {
        return [];
      }

      // Check the next 48-72 hours (indices 0, 1, 2)
      for (let i = 0; i < Math.min(3, daily.time.length); i++) {
        const dateStr = daily.time[i];
        const maxTemp = daily.temperature_2m_max?.[i] ?? 0;
        const minTemp = daily.temperature_2m_min?.[i] ?? 25;
        const rainSum = daily.precipitation_sum?.[i] ?? 0;
        const rainProb = daily.precipitation_probability_max?.[i] ?? 0;
        const maxWind = daily.wind_speed_10m_max?.[i] ?? 0;

        const validUntil = new Date(dateStr);
        validUntil.setHours(23, 59, 59, 999);

        // 1. Heavy Rain Threshold (>= 30mm or >=20mm with >80% prob)
        if (rainSum >= 30 || (rainProb >= 80 && rainSum >= 20)) {
          const alert = await this.recordAlertIfNotExists({
            district,
            alertType: "heavy_rain",
            severity: rainSum >= 50 ? "critical" : "warning",
            headline: `Heavy Rain Alert (${rainSum}mm expected on ${dateStr})`,
            message: `Forecasting ${rainSum}mm precipitation with ${rainProb}% rain probability in ${district} district.`,
            advisory:
              "Postpone pesticide spraying and chemical fertilizer top-dressing. Open drainage furrows immediately in low-lying plots to avoid waterlogging and root asphyxiation. Move harvested produce to covered dry storage.",
            metricValue: rainSum,
            validUntil,
          });
          if (alert) triggered.push(alert);
        }

        // 2. Heatwave Threshold (>= 40°C)
        if (maxTemp >= 40) {
          const alert = await this.recordAlertIfNotExists({
            district,
            alertType: "heatwave",
            severity: maxTemp >= 43 ? "critical" : "warning",
            headline: `Extreme Heatwave Advisory (${maxTemp}°C on ${dateStr})`,
            message: `Maximum daytime temperature projected to reach ${maxTemp}°C in ${district} district.`,
            advisory:
              "Apply irrigation strictly during late evening or pre-dawn hours to minimize evaporation losses. Use organic mulch around crops to suppress soil heating and conserve moisture. Provide shade nets for sensitive seedlings and nursery stock.",
            metricValue: maxTemp,
            validUntil,
          });
          if (alert) triggered.push(alert);
        }

        // 3. Frost / Cold Wave Threshold (<= 5°C)
        if (minTemp <= 5) {
          const alert = await this.recordAlertIfNotExists({
            district,
            alertType: "frost",
            severity: minTemp <= 2 ? "critical" : "warning",
            headline: `Frost & Chilling Injury Warning (${minTemp}°C on ${dateStr})`,
            message: `Night temperatures expected to plunge to ${minTemp}°C in ${district} district.`,
            advisory:
              "Administer light micro-irrigation at dusk to elevate latent heat capacity around crop foliage. Cover tender vegetable nurseries and grape vineyards with protective straw or thermal sheets to prevent chilling damage.",
            metricValue: minTemp,
            validUntil,
          });
          if (alert) triggered.push(alert);
        }

        // 4. Strong Wind / Gale Threshold (>= 35 km/h)
        if (maxWind >= 35) {
          const alert = await this.recordAlertIfNotExists({
            district,
            alertType: "strong_wind",
            severity: maxWind >= 50 ? "critical" : "warning",
            headline: `High Wind & Gale Warning (${maxWind} km/h gusts)`,
            message: `Surface wind velocities expected to reach ${maxWind} km/h in ${district} district.`,
            advisory:
              "Erect bamboo propping or staking for banana pseudostems, papaya trees, and tall sugarcane. Suspend aerial foliar spraying to prevent spray drift and chemical waste.",
            metricValue: maxWind,
            validUntil,
          });
          if (alert) triggered.push(alert);
        }
      }

      return triggered;
    } catch (err: any) {
      console.warn(`[WeatherService] Could not evaluate alerts for district '${district}':`, err.message);
      return [];
    }
  }

  /**
   * Check if an active alert already exists for the same district and alertType on this date.
   * If not, create and return the new WeatherAlert document.
   */
  private static async recordAlertIfNotExists(payload: {
    district: string;
    alertType: WeatherAlertType;
    severity: AlertSeverity;
    headline: string;
    message: string;
    advisory: string;
    metricValue: number;
    validUntil: Date;
  }): Promise<IWeatherAlert | null> {
    const existing = await WeatherAlert.findOne({
      district: payload.district,
      alertType: payload.alertType,
      active: true,
      validUntil: { $gte: new Date() },
    });

    if (existing) {
      // Alert already active for this condition in this district
      return null;
    }

    const newAlert = await WeatherAlert.create({
      ...payload,
      sentAt: new Date(),
      active: true,
    });

    console.log(
      `[WeatherAlert] Triggered ${payload.severity.toUpperCase()} alert for ${payload.district}: ${payload.headline}`
    );

    // Asynchronously dispatch weather notifications to registered farmers in this district
    if (payload.severity === "warning" || payload.severity === "critical") {
      notificationService.notifyWeatherEmergency({
        district: payload.district,
        alertType: payload.alertType,
        severity: payload.severity,
        headline: payload.headline,
      }).catch((e) => {
        console.warn("[WeatherService] Weather notification dispatch warning:", e);
      });
    }

    return newAlert;
  }

  /**
   * Run evaluation across all monitored agricultural districts and retire expired alerts.
   */
  public static async runScheduledAlertScan(): Promise<{
    districtsChecked: number;
    alertsTriggered: number;
    expiredDeactivated: number;
  }> {
    // 1. Deactivate expired alerts
    const now = new Date();
    const deactRes = await WeatherAlert.updateMany(
      { active: true, validUntil: { $lt: now } },
      { $set: { active: false } }
    );

    // 2. Scan all agricultural districts
    let totalTriggered = 0;
    for (const districtObj of AGRICULTURAL_DISTRICTS) {
      const triggered = await this.evaluateDistrictAlerts(districtObj);
      totalTriggered += triggered.length;
    }

    console.log(
      `[WeatherService] Scheduled scan complete. Districts: ${AGRICULTURAL_DISTRICTS.length}, Triggered: ${totalTriggered}, Retired: ${deactRes.modifiedCount}`
    );

    return {
      districtsChecked: AGRICULTURAL_DISTRICTS.length,
      alertsTriggered: totalTriggered,
      expiredDeactivated: deactRes.modifiedCount,
    };
  }

  /**
   * Retrieve active alerts for a farmer's district (or all active alerts if district is not specified).
   */
  public static async getActiveAlerts(district?: string): Promise<IWeatherAlert[]> {
    const query: any = {
      active: true,
      validUntil: { $gte: new Date() },
    };

    if (district && district.trim()) {
      const clean = district.trim();
      query.district = new RegExp(`^${clean}`, "i");
    }

    return WeatherAlert.find(query).sort({ severity: -1, sentAt: -1 });
  }
}
