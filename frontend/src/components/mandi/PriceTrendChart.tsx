import { useState, useMemo } from "react";
import type { PriceTrendPoint, PricePredictionPoint, TrendDirection } from "@/types/mandi";

interface PriceTrendChartProps {
  data: PriceTrendPoint[];
  cropName: string;
  unit?: string;
  height?: number;
  daysRequested?: number;
  daysAvailable?: number;
  forecast?: PricePredictionPoint[];
  trendDirection?: TrendDirection;
  isAiForecast?: boolean;
  modelName?: string;
  disclaimer?: string;
}

export default function PriceTrendChart({
  data,
  cropName,
  unit = "quintal",
  height = 270,
  daysRequested = 14,
  daysAvailable,
  forecast,
  trendDirection,
  isAiForecast = true,
  modelName,
  disclaimer = "AI-Estimated Trend — Not a Price Guarantee",
}: PriceTrendChartProps) {
  // hovered item can be historical (index 0..N-1) or forecast (index N..N+M-1)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data;
  }, [data]);

  const forecastPoints = useMemo(() => {
    if (!forecast || forecast.length === 0) return [];
    return forecast;
  }, [forecast]);

  const effectiveAvailable = daysAvailable !== undefined ? daysAvailable : points.length;
  const isPartial = effectiveAvailable > 0 && effectiveAvailable < daysRequested;
  const hasForecast = forecastPoints.length > 0 && points.length > 0;

  // 1. Zero data points: Clean empty state
  if (points.length === 0 || effectiveAvailable === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50/70 p-6 text-center text-xs text-gray-500 shadow-xs">
        <div className="max-w-sm">
          <span className="text-3xl mb-2 inline-block">📊</span>
          <p className="font-bold text-gray-800 text-sm">No Historical Records Yet</p>
          <p className="mt-1 text-gray-500">
            No real APMC market trade sessions recorded in the requested {daysRequested}-day window for{" "}
            <strong className="text-gray-700">{cropName}</strong>. Data accumulates as official daily bulletins are published.
          </p>
        </div>
      </div>
    );
  }

  // 2. Single data point: Benchmark summary card (when no forecast)
  if (points.length === 1 && !hasForecast) {
    const singlePoint = points[0];
    return (
      <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              APMC Price Intelligence
            </span>
            <h3 className="text-lg font-black text-gray-900">{cropName} Market Benchmark</h3>
          </div>
          <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800 flex items-center gap-1">
            <span>⚠️</span>
            <span>1 of {daysRequested} days available</span>
          </span>
        </div>
        <div className="text-center py-6">
          <span className="text-3xl font-black text-emerald-800">
            ₹{singlePoint.avgModalPrice.toLocaleString("en-IN")}
          </span>
          <p className="text-xs text-gray-500 mt-1">
            per {unit} &bull; Recorded Date: {singlePoint.date}
          </p>
          <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500">
            <span>Range: <strong>₹{singlePoint.minPrice} – ₹{singlePoint.maxPrice}</strong></span>
            <span>Markets: <strong>{singlePoint.marketsCount} APMC yards</strong></span>
          </div>
          <p className="text-xs text-gray-400 mt-4 max-w-sm mx-auto">
            Full trajectory curve will automatically plot as additional daily market trade sessions are recorded.
          </p>
        </div>
        <div className="border-t border-gray-100 pt-3 flex justify-between text-[11px] text-gray-400">
          <span>Source: Data.gov.in / Agmarknet</span>
          <span>1 trading day recorded</span>
        </div>
      </div>
    );
  }

  // Calculate scales across both historical and forecast points
  const historicalPrices = points.flatMap((p) => [p.minPrice, p.maxPrice, p.avgModalPrice]);
  const forecastPrices = forecastPoints.flatMap((f) => [f.predictedPrice, f.confidenceMin, f.confidenceMax]);
  const allPrices = [...historicalPrices, ...forecastPrices];

  const minVal = Math.floor(Math.min(...allPrices) * 0.95);
  const maxVal = Math.ceil(Math.max(...allPrices) * 1.05);
  const range = maxVal - minVal || 1;

  const width = 680;
  const padding = { top: 25, right: 35, bottom: 42, left: 55 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Total indices across timeline:
  // historical: 0 .. points.length - 1
  // forecast: points.length .. points.length + forecastPoints.length - 1
  const totalSteps = hasForecast
    ? points.length + forecastPoints.length - 1
    : points.length - 1;

  const getX = (timelineIdx: number) => {
    if (totalSteps <= 0) return padding.left;
    return padding.left + (timelineIdx / totalSteps) * chartWidth;
  };

  const getY = (val: number) => padding.top + chartHeight - ((val - minVal) / range) * chartHeight;

  // Path for the historical modal price line
  const modalPath = points.reduce((acc, pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.avgModalPrice);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, "");

  // Gradient area below historical line
  const historicalLastIdx = points.length - 1;
  const areaPath = `${modalPath} L ${getX(historicalLastIdx)} ${padding.top + chartHeight} L ${getX(
    0
  )} ${padding.top + chartHeight} Z`;

  // Historical min-max spread band
  const topBand = points.map((pt, idx) => `${idx === 0 ? "M" : "L"} ${getX(idx)} ${getY(pt.maxPrice)}`).join(" ");
  const bottomBand = [...points]
    .reverse()
    .map((pt, idx) => `L ${getX(historicalLastIdx - idx)} ${getY(pt.minPrice)}`)
    .join(" ");
  const bandPath = `${topBand} ${bottomBand} Z`;

  // Forecast paths (connects seamlessly from latest historical point)
  let forecastLinePath = "";
  let forecastConfidencePath = "";
  const lastHistoricalPoint = points[historicalLastIdx];
  const forecastStartIndex = historicalLastIdx;

  if (hasForecast && lastHistoricalPoint) {
    // 1. Forecast prediction line starting at last historical modal point
    forecastLinePath = `M ${getX(forecastStartIndex)} ${getY(lastHistoricalPoint.avgModalPrice)} ` +
      forecastPoints
        .map((fp, i) => `L ${getX(forecastStartIndex + 1 + i)} ${getY(fp.predictedPrice)}`)
        .join(" ");

    // 2. Forecast confidence corridor (shaded polygon)
    const topForecast = `M ${getX(forecastStartIndex)} ${getY(lastHistoricalPoint.avgModalPrice)} ` +
      forecastPoints
        .map((fp, i) => `L ${getX(forecastStartIndex + 1 + i)} ${getY(fp.confidenceMax)}`)
        .join(" ");

    const bottomForecast = [...forecastPoints]
      .reverse()
      .map((fp, i) => `L ${getX(forecastStartIndex + forecastPoints.length - i)} ${getY(fp.confidenceMin)}`)
      .join(" ") + ` L ${getX(forecastStartIndex)} ${getY(lastHistoricalPoint.avgModalPrice)} Z`;

    forecastConfidencePath = `${topForecast} ${bottomForecast}`;
  }

  // Horizontal guide grid lines
  const gridTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => {
    const val = Math.round(minVal + pct * range);
    const y = getY(val);
    return { val, y };
  });

  // Calculate active hovered item (could be historical or forecast)
  const isHoveringForecast = hoveredIdx !== null && hoveredIdx >= points.length;
  const hoveredHistoricalPt = hoveredIdx !== null && hoveredIdx < points.length ? points[hoveredIdx] : null;
  const hoveredForecastPt =
    isHoveringForecast && hoveredIdx !== null ? forecastPoints[hoveredIdx - points.length] : null;

  const defaultActiveHistorical = points[points.length - 1];
  const activeX = hoveredIdx !== null
    ? (isHoveringForecast
      ? getX(forecastStartIndex + 1 + (hoveredIdx - points.length))
      : getX(hoveredIdx))
    : getX(historicalLastIdx);

  const activeY = hoveredForecastPt
    ? getY(hoveredForecastPt.predictedPrice)
    : hoveredHistoricalPt
    ? getY(hoveredHistoricalPt.avgModalPrice)
    : getY(defaultActiveHistorical.avgModalPrice);

  // Day-over-day historical trend
  const firstPrice = points[0].avgModalPrice;
  const latestPrice = points[points.length - 1].avgModalPrice;
  const diff = latestPrice - firstPrice;
  const pctChange = ((diff / firstPrice) * 100).toFixed(1);
  const isUp = diff >= 0;

  return (
    <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              APMC Price Intelligence
            </span>
            {hasForecast ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200 animate-pulse">
                <span>✨</span>
                <span>AI 7-Day Forecast Active</span>
              </span>
            ) : isPartial ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                <span>⚠️</span>
                <span>{effectiveAvailable} of {daysRequested} days available</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                <span>✓</span>
                <span>Full {daysRequested}-day trend</span>
              </span>
            )}

            {hasForecast && trendDirection && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  trendDirection === "bullish"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : trendDirection === "bearish"
                    ? "bg-red-100 text-red-800 border border-red-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {trendDirection === "bullish" && "Bullish ↗"}
                {trendDirection === "bearish" && "Bearish ↘"}
                {trendDirection === "stable" && "Stable →"}
              </span>
            )}
          </div>
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 flex-wrap">
            <span>{cropName} Market Trajectory</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                isUp ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
              }`}
            >
              {isUp ? "↗ +" : "↘ "}
              {pctChange}% ({diff >= 0 ? `+₹${diff}` : `-₹${Math.abs(diff)}`})
            </span>
          </h3>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black text-gray-900">
            ₹{(hoveredForecastPt
              ? hoveredForecastPt.predictedPrice
              : hoveredHistoricalPt
              ? hoveredHistoricalPt.avgModalPrice
              : defaultActiveHistorical.avgModalPrice
            ).toLocaleString("en-IN")}
          </span>
          <p className="text-[11px] text-gray-500 font-medium">
            per {unit} &bull; {hoveredForecastPt ? "Projected AI Benchmark" : "Modal Mandi Rate"}
          </p>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none overflow-visible"
        >
          <defs>
            <linearGradient id="mandiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="forecastBandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={width - padding.right}
                y2={tick.y}
                stroke="#f3f4f6"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-gray-400 font-mono text-[10px]"
              >
                ₹{tick.val}
              </text>
            </g>
          ))}

          {/* Forecast Transition Boundary Line */}
          {hasForecast && (
            <g>
              <line
                x1={getX(forecastStartIndex)}
                y1={padding.top - 5}
                x2={getX(forecastStartIndex)}
                y2={padding.top + chartHeight}
                stroke="#818cf8"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.8"
              />
              <text
                x={getX(forecastStartIndex)}
                y={padding.top - 8}
                textAnchor="middle"
                className="fill-indigo-600 font-bold text-[9px] uppercase tracking-wider"
              >
                Forecast ➜
              </text>
            </g>
          )}

          {/* Historical: Shaded Price Spread Band (Min to Max Range) */}
          <path d={bandPath} fill="url(#bandGradient)" />

          {/* Historical: Shaded Area Below Modal Line */}
          <path d={areaPath} fill="url(#mandiGradient)" />

          {/* Historical: Modal Average Line */}
          <path
            d={modalPath}
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Forecast: Shaded Confidence Corridor */}
          {hasForecast && forecastConfidencePath && (
            <path d={forecastConfidencePath} fill="url(#forecastBandGradient)" />
          )}

          {/* Forecast: Projected Dashed Curve */}
          {hasForecast && forecastLinePath && (
            <path
              d={forecastLinePath}
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.5"
              strokeDasharray="5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Forecast Points Dots */}
          {hasForecast &&
            forecastPoints.map((fp, i) => {
              const cx = getX(forecastStartIndex + 1 + i);
              const cy = getY(fp.predictedPrice);
              const isSelected = hoveredIdx === points.length + i;
              return (
                <g key={`fp-dot-${i}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? "5" : "3.5"}
                    fill="#4f46e5"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}

          {/* Date labels on X-axis */}
          {points.map((pt, idx) => {
            const stepRatio = hasForecast ? Math.ceil(totalSteps / 6) : Math.ceil(points.length / 5);
            const showLabel = idx === 0 || idx === points.length - 1 || idx % stepRatio === 0;
            if (!showLabel) return null;

            const dateLabel = new Date(pt.date).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
            });

            return (
              <text
                key={`hist-lbl-${idx}`}
                x={getX(idx)}
                y={height - 12}
                textAnchor="middle"
                className="fill-gray-400 text-[10px] font-medium"
              >
                {dateLabel}
              </text>
            );
          })}

          {/* Forecast Date labels on X-axis */}
          {hasForecast &&
            forecastPoints.map((fp, i) => {
              const show = i === 0 || i === forecastPoints.length - 1 || i % 2 === 0;
              if (!show) return null;
              const dateLabel = new Date(fp.date).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
              });
              return (
                <text
                  key={`fc-lbl-${i}`}
                  x={getX(forecastStartIndex + 1 + i)}
                  y={height - 12}
                  textAnchor="middle"
                  className="fill-indigo-600 font-bold text-[10px]"
                >
                  +{i + 1}d ({dateLabel})
                </text>
              );
            })}

          {/* Active Hover Crosshair & Dot */}
          <line
            x1={activeX}
            y1={padding.top}
            x2={activeX}
            y2={padding.top + chartHeight}
            stroke={isHoveringForecast ? "#6366f1" : "#10b981"}
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          <circle
            cx={activeX}
            cy={activeY}
            r="6"
            fill={isHoveringForecast ? "#4f46e5" : "#059669"}
            stroke="#ffffff"
            strokeWidth="2.5"
            className="shadow-sm"
          />

          {/* Transparent interactive trigger columns for hover: Historical */}
          {points.map((_, idx) => {
            const colWidth = chartWidth / totalSteps;
            return (
              <rect
                key={`trig-h-${idx}`}
                x={getX(idx) - colWidth / 2}
                y={padding.top}
                width={colWidth}
                height={chartHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}

          {/* Transparent interactive trigger columns for hover: Forecast */}
          {hasForecast &&
            forecastPoints.map((_, i) => {
              const colWidth = chartWidth / totalSteps;
              const globalIdx = points.length + i;
              const xPos = getX(forecastStartIndex + 1 + i);
              return (
                <rect
                  key={`trig-f-${i}`}
                  x={xPos - colWidth / 2}
                  y={padding.top}
                  width={colWidth}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(globalIdx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
        </svg>

        {/* Tooltip for Historical Point */}
        {hoveredHistoricalPt && (
          <div
            className="absolute top-1 pointer-events-none rounded-xl bg-gray-900 text-white p-2.5 shadow-xl text-xs space-y-1 transition-all duration-100 z-10"
            style={{
              left: `${Math.min(Math.max(8, (activeX / width) * 100), 72)}%`,
            }}
          >
            <div className="font-bold text-gray-200 border-b border-gray-700 pb-1 flex justify-between gap-4">
              <span>{new Date(hoveredHistoricalPt.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
              <span className="text-emerald-400 font-mono">₹{hoveredHistoricalPt.avgModalPrice}</span>
            </div>
            <div className="flex justify-between gap-3 text-[11px] text-gray-400">
              <span>APMC Low: <strong className="text-amber-300">₹{hoveredHistoricalPt.minPrice}</strong></span>
              <span>High: <strong className="text-amber-300">₹{hoveredHistoricalPt.maxPrice}</strong></span>
            </div>
            <div className="text-[10px] text-emerald-400/80">
              Aggregated from {hoveredHistoricalPt.marketsCount} active APMC yard{hoveredHistoricalPt.marketsCount > 1 ? "s" : ""}
            </div>
          </div>
        )}

        {/* Tooltip for Forecast Point */}
        {hoveredForecastPt && (
          <div
            className="absolute top-1 pointer-events-none rounded-xl bg-indigo-950 text-white p-3 shadow-2xl text-xs space-y-1.5 transition-all duration-100 z-10 border border-indigo-500/40"
            style={{
              left: `${Math.min(Math.max(8, (activeX / width) * 100), 72)}%`,
            }}
          >
            <div className="font-bold text-indigo-200 border-b border-indigo-800/80 pb-1 flex items-center justify-between gap-4">
              <span>{hoveredForecastPt.dayName}, {new Date(hoveredForecastPt.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
              <span className="rounded bg-indigo-500/30 px-1.5 py-0.2 text-[10px] text-indigo-300 font-medium">AI Forecast</span>
            </div>
            <div className="text-sm font-black text-indigo-100 font-mono">
              ₹{hoveredForecastPt.predictedPrice}{" "}
              <span className="text-[11px] font-normal text-indigo-300">per {unit}</span>
            </div>
            <div className="flex justify-between gap-3 text-[11px] text-indigo-300">
              <span>Confidence Corridor:</span>
              <strong className="text-indigo-100 font-mono">₹{hoveredForecastPt.confidenceMin} – ₹{hoveredForecastPt.confidenceMax}</strong>
            </div>
            <div className="text-[9px] text-indigo-400 italic">
              {modelName || (isAiForecast ? "Ridge Regression (Temporal Harmonics)" : "Statistical Moving Average")}
            </div>
          </div>
        )}
      </div>

      {/* Chart Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-[11px] text-gray-500">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            <strong className="text-gray-700">Historical Modal Rate</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-400/40 border border-amber-500" />
            <span>APMC Yard Spread</span>
          </span>
          {hasForecast && (
            <>
              <span className="flex items-center gap-1.5 text-indigo-700 font-bold">
                <span className="h-0.5 w-4 border-t-2 border-dashed border-indigo-600" />
                <span>AI Projected Trend</span>
              </span>
              <span className="flex items-center gap-1.5 text-indigo-700">
                <span className="h-2.5 w-2.5 rounded-sm bg-indigo-400/30 border border-indigo-400" />
                <span>Confidence Corridor</span>
              </span>
            </>
          )}
        </div>
        <span className="text-gray-400">Source: Agmarknet Live &bull; AI Forecast</span>
      </div>

      {/* Mandatory Disclaimer Badge */}
      {hasForecast && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50/70 border border-amber-200/80 p-2.5 text-[11px] text-amber-900 leading-snug">
          <span className="text-sm">⚠️</span>
          <div>
            <strong className="font-bold">{disclaimer}.</strong> Projections are econometric estimates based on APMC market momentum and weekly seasonality. Actual market prices may vary based on weather, supply shocks, and local trade volumes.
          </div>
        </div>
      )}
    </div>
  );
}
