import { Cloud, Sun, Droplets, CloudRain } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { motion } from 'framer-motion';

const ICONS = {
  sunny: { Icon: Sun, color: "#FFB300" },
  cloudy: { Icon: Cloud, color: "#78909C" },
  rainy: { Icon: CloudRain, color: "#2196F3" },
  partly_cloudy: { Icon: Cloud, color: "#90A4AE" },
};

export default function WeatherWidget({ districtId = 1 }) {
  const { data: weather } = useApi(`/weather/${districtId}`);

  if (!weather) return null;

  const { Icon, color } = ICONS[weather.condition] || ICONS.sunny;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "linear-gradient(135deg, rgba(76,175,80,0.1), rgba(33,150,243,0.08))",
        border: "1px solid rgba(76,175,80,0.2)",
        borderRadius: 16, padding: 14, marginBottom: 12,
        display: "flex", alignItems: "center", gap: 12,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={24} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
          <span style={{ color: "#e8f5e9", fontWeight: 700 }}>
            {weather.tempMax}°/{weather.tempMin}°
          </span>
          <span style={{ color: "#78909C" }}>
            <Droplets size={10} style={{ display: "inline", verticalAlign: "middle" }}/> {weather.humidity}%
          </span>
          {weather.rainfall > 0 && (
            <span style={{ color: "#2196F3", fontSize: 11 }}>🌧️ {weather.rainfall}mm</span>
          )}
        </div>
        {weather.advisory && (
          <div style={{ fontSize: 11, color: "#A5D6A7", marginTop: 4, fontStyle: "italic", lineHeight: 1.4 }}>
            💡 {weather.advisory}
          </div>
        )}
      </div>
    </motion.div>
  );
}
