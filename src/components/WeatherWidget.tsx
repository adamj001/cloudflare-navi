// src/components/WeatherWidget.tsx
import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Tooltip, IconButton } from '@mui/material';
import { 
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, 
  CloudDrizzle, CloudFog, Wind, Snowflake 
} from 'lucide-react';

// WMO 天气代码映射到 Lucide 图标
const getWeatherIcon = (code: number, isDay: number) => {
  // 0: 晴天
  if (code === 0) return isDay ? <Sun className="weather-icon-anim" /> : <Sun className="weather-icon-anim" style={{ opacity: 0.8 }} />;
  // 1-3: 多云
  if (code >= 1 && code <= 3) return <Cloud className="weather-icon-anim" />;
  // 45, 48: 雾
  if (code === 45 || code === 48) return <CloudFog className="weather-icon-anim" />;
  // 51-67:不仅是雨，还有冻雨等
  if (code >= 51 && code <= 67) return <CloudDrizzle className="weather-icon-anim" />;
  // 71-77: 雪
  if (code >= 71 && code <= 77) return <CloudSnow className="weather-icon-anim" />;
  // 80-82: 阵雨
  if (code >= 80 && code <= 82) return <CloudRain className="weather-icon-anim" />;
  // 85-86: 阵雪
  if (code >= 85 && code <= 86) return <Snowflake className="weather-icon-anim" />;
  // 95-99: 雷雨
  if (code >= 95 && code <= 99) return <CloudLightning className="weather-icon-anim" />;
  
  return <Sun />; // 默认
};

const getWeatherDesc = (code: number) => {
  const codes: Record<number, string> = {
    0: '晴朗', 1: '晴间多云', 2: '多云', 3: '阴',
    45: '有雾', 48: '白霜雾', 51: '毛毛雨', 53: '中雨',
    55: '密雨', 61: '小雨', 63: '中雨', 65: '大雨',
    71: '小雪', 73: '中雪', 75: '大雪', 95: '雷雨',
  };
  return codes[code] || '未知天气';
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError(true);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // 使用 Open-Meteo 免费 API (无需 Key)
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
          );
          const data = await res.json();
          setWeather(data.current_weather);
        } catch (e) {
          console.error(e);
          setError(true);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError(true); // 用户拒绝定位
        setLoading(false);
      }
    );
  }, []);

  if (error) return null; // 如果获取失败，直接不显示，不影响美观

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.5,
        borderRadius: '20px',
        // 磨砂玻璃效果，适配深色/浅色模式
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        backdropFilter: 'blur(8px)',
        border: '1px solid',
        borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        transition: 'all 0.3s',
        '&:hover': {
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
        }
      }}
    >
      {loading ? (
        <CircularProgress size={16} thickness={5} />
      ) : (
        <>
          <Tooltip title={`${getWeatherDesc(weather.weathercode)} - 风速 ${weather.windspeed} km/h`}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: (theme) => theme.palette.mode === 'dark' ? '#fb8c00' : '#f57c00', // 图标用暖橙色
              '& svg': { width: 20, height: 20 }
            }}>
              {getWeatherIcon(weather.weathercode, weather.is_day)}
            </Box>
          </Tooltip>
          
          <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>
            {Math.round(weather.temperature)}°
          </Typography>
        </>
      )}
      
      {/* 添加一个简单的呼吸动画样式 */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
          100% { transform: translateY(0px); }
        }
        .weather-icon-anim {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </Box>
  );
}
