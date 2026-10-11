import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Market } from "../../types/market";

interface MarketFinderMapProps {
  markets: Market[];
  userLocation: { lat: number; lng: number } | null;
  selectedMarket: Market | null;
  onSelectMarket: (market: Market) => void;
  height?: string;
}

export const MarketFinderMap: React.FC<MarketFinderMapProps> = ({
  markets,
  userLocation,
  selectedMarket,
  onSelectMarket,
  height = "520px",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center: Pune / Western Maharashtra center [18.5204, 73.8567]
    const initialLat = userLocation?.lat ?? 18.5204;
    const initialLng = userLocation?.lng ?? 73.8567;
    const initialZoom = userLocation ? 10 : 8;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // OpenStreetMap standard tile layer (free, no API key needed, privacy friendly)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update user location pin
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userLocation) {
      const userIcon = L.divIcon({
        className: "custom-user-pin",
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 28px; height: 28px; background: rgba(59, 130, 246, 0.35); border-radius: 50%; animation: pulse 2s infinite;"></div>
            <div style="width: 14px; height: 14px; background: #2563eb; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3); z-index: 2;"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; text-align: center; padding: 4px;">
          <strong style="color: #1e3a8a;">📍 Your Current Location</strong>
        </div>
      `);

      userMarkerRef.current = marker;
    }
  }, [userLocation]);

  // Update market pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const bounds = L.latLngBounds([]);

    if (userLocation) {
      bounds.extend([userLocation.lat, userLocation.lng]);
    }

    markets.forEach((market) => {
      const [lng, lat] = market.location.coordinates;
      bounds.extend([lat, lng]);

      const isSelected = selectedMarket?.id === market.id;

      // Pin Color according to market type
      let pinColor = "#059669"; // Emerald for APMC
      let badgeEmoji = "🏛️";

      if (market.marketType === "sub_yard") {
        pinColor = "#d97706"; // Amber
        badgeEmoji = "🏬";
      } else if (market.marketType === "weekly_haat") {
        pinColor = "#ea580c"; // Orange
        badgeEmoji = "🧺";
      } else if (market.marketType === "fpo_collection_center") {
        pinColor = "#4f46e5"; // Indigo
        badgeEmoji = "🌾";
      }

      const size = isSelected ? 38 : 30;
      const border = isSelected ? "3px solid #facc15" : "2px solid white";
      const shadow = isSelected
        ? "0 4px 12px rgba(0,0,0,0.4)"
        : "0 2px 6px rgba(0,0,0,0.25)";

      const markerIcon = L.divIcon({
        className: "custom-market-pin",
        html: `
          <div style="
            width: ${size}px;
            height: ${size}px;
            background: ${pinColor};
            border: ${border};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${isSelected ? 18 : 14}px;
            box-shadow: ${shadow};
            transform: translate(-50%, -50%);
            cursor: pointer;
            transition: transform 0.2s ease;
          ">
            ${badgeEmoji}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([lat, lng], {
        icon: markerIcon,
        zIndexOffset: isSelected ? 500 : 100,
      });

      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const enamBadge = market.enamEnabled
        ? `<span style="background: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; border: 1px solid #bfdbfe;">⚡ e-NAM</span>`
        : "";
      const distanceLabel =
        market.distanceKm !== undefined
          ? `<div style="color: #065f46; font-weight: 700; font-size: 11px; margin-top: 2px;">📍 ${market.distanceKm} km away</div>`
          : "";

      const cropsList = market.majorCommodities?.slice(0, 4).join(", ") || "";

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; min-width: 220px; line-height: 1.4;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; color: ${pinColor};">
              ${market.marketType.replace(/_/g, " ")}
            </span>
            ${enamBadge}
          </div>
          <strong style="font-size: 13px; color: #1c1917; display: block; margin-bottom: 2px;">
            ${market.name}
          </strong>
          <div style="color: #78716c; font-size: 11px;">
            ${market.district}, ${market.state}
          </div>
          ${distanceLabel}
          ${
            cropsList
              ? `<div style="margin-top: 6px; font-size: 11px; color: #44403c;"><strong>Crops:</strong> ${cropsList}</div>`
              : ""
          }
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e7e5e4; display: flex; gap: 6px;">
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="
              display: inline-block;
              background: #047857;
              color: white;
              padding: 4px 8px;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 600;
              text-decoration: none;
              text-align: center;
              flex: 1;
            ">
              🧭 Directions
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on("click", () => {
        onSelectMarket(market);
      });

      markersLayer.addLayer(marker);

      if (isSelected) {
        marker.openPopup();
      }
    });

    if (markets.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [markets, selectedMarket, userLocation]);

  // Pan to selected market if changed
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedMarket) return;

    const [lng, lat] = selectedMarket.location.coordinates;
    map.flyTo([lat, lng], 13, { duration: 1.2 });
  }, [selectedMarket]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-stone-200 shadow-sm bg-stone-100">
      <div ref={mapContainerRef} style={{ width: "100%", height }} />

      {/* Map Legend Floating Tag */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-stone-200/80 shadow-md text-xs flex flex-wrap items-center gap-3">
        <span className="font-semibold text-stone-700">Legend:</span>
        <span className="flex items-center gap-1 text-stone-600">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
          <span>APMC Mandi</span>
        </span>
        <span className="flex items-center gap-1 text-stone-600">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
          <span>Sub-Yard</span>
        </span>
        <span className="flex items-center gap-1 text-stone-600">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" />
          <span>Weekly Haat</span>
        </span>
        <span className="flex items-center gap-1 text-stone-600">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
          <span>FPO Hub</span>
        </span>
      </div>
    </div>
  );
};

export default MarketFinderMap;
