import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Loader2, Wind, CloudFog } from 'lucide-react';
import { Coordinates } from '../types';

interface WeatherWidgetProps {
  location: Coordinates;
}

interface WeatherData {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ location }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=celsius`
        );
        if (!res.ok) throw new Error('Failed to fetch weather');
        const data = await res.json();
        
        if (isMounted) {
          setWeather({
            temperature: data.current.temperature_2m,
            weatherCode: data.current.weather_code,
            windSpeed: data.current.wind_speed_10m
          });
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Debounce to prevent fetching on every drag pixel
    const timer = setTimeout(fetchWeather, 1000);
    
    return () => {
      clearTimeout(timer);
      isMounted = false;
    };
  }, [location.lat, location.lng]);

  const getWeatherInfo = (code: number) => {
    if (code === 0) return { icon: Sun, label: 'Clear' };
    if (code >= 1 && code <= 3) return { icon: Cloud, label: 'Cloudy' };
    if (code >= 45 && code <= 48) return { icon: CloudFog, label: 'Fog' };
    if (code >= 51 && code <= 67) return { icon: CloudRain, label: 'Rain' };
    if (code >= 71 && code <= 86) return { icon: CloudSnow, label: 'Snow' };
    if (code >= 95) return { icon: CloudLightning, label: 'Storm' };
    return { icon: Sun, label: 'Clear' };
  };

  if (error || (!weather && !loading)) return null;

  const { icon: Icon, label } = weather ? getWeatherInfo(weather.weatherCode) : { icon: Loader2, label: 'Loading' };

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-lg rounded-xl p-3 border border-gray-200 dark:border-gray-700 flex items-center gap-3 min-w-[140px] transition-all duration-300">
      {loading && !weather ? (
        <div className="flex w-full items-center gap-2 justify-center py-1">
           <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
           <span className="text-xs text-slate-500">Loading Weather...</span>
        </div>
      ) : weather ? (
        <>
          <div className="bg-blue-100 dark:bg-slate-800 p-2 rounded-lg text-blue-600 dark:text-blue-400">
            <Icon size={20} />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-none">
              {Math.round(weather.temperature)}°C
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-1">
              <span>{label}</span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="flex items-center">
                <Wind size={10} className="mr-0.5" />
                {Math.round(weather.windSpeed)} km/h
              </span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};