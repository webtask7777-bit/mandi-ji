import { Cloud, Sun, Droplets, CloudRain } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { Card } from "@/components/ui/card";

const ICONS = {
  sunny: { Icon: Sun, color: "#f59e0b" },
  cloudy: { Icon: Cloud, color: "#71717a" },
  rainy: { Icon: CloudRain, color: "#3b82f6" },
  partly_cloudy: { Icon: Cloud, color: "#a1a1aa" },
};

export default function WeatherWidget({ districtId = 1 }) {
  const { data: weather } = useApi(`/weather/${districtId}`);
  if (!weather) return null;

  const { Icon, color } = ICONS[weather.condition] || ICONS.sunny;

  return (
    <Card className="bg-zinc-900 border-zinc-800 p-3 flex items-center gap-3">
      <div className="w-11 h-11 rounded-lg shrink-0 flex items-center justify-center"
        style={{ backgroundColor: color }}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1">
        <div className="flex gap-3 text-xs">
          <span className="text-foreground font-bold">
            {weather.tempMax}/{weather.tempMin}
          </span>
          <span className="text-muted-foreground">
            <Droplets size={10} className="inline align-middle"/> {weather.humidity}%
          </span>
          {weather.rainfall > 0 && (
            <span className="text-blue-500 text-[11px]">{weather.rainfall}mm</span>
          )}
        </div>
        {weather.advisory && (
          <div className="text-[11px] text-green-500 mt-1 leading-snug">
            {weather.advisory}
          </div>
        )}
      </div>
    </Card>
  );
}
