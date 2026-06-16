// src/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface OutfitRecommendation {
  weather_summary: string;
  outfit_emojis: string;
  description: string;
  styling_tip: string;
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// 🌍 1. 지역 이름을 기반으로 실시간 날씨를 가져오는 함수 (Open-Meteo 무료 API 사용)
export async function fetchWeather(region: string) {
  // 1-1. 지역명으로 위도/경도 조회
  const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(region)}&language=ko&count=1`);
  const geoData = await geoRes.json();
  
  if (!geoData.results || geoData.results.length === 0) {
    throw new Error(`'${region}' 지역을 찾을 수 없습니다. 시/군/구 이름을 정확히 입력해 주세요.`);
  }

  const { latitude, longitude, name } = geoData.results[0];

  // 1-2. 위도/경도로 현재 날씨 및 기온 조회
  const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`);
  const weatherData = await weatherRes.json();
  
  const temp = weatherData.current.temperature_2m;
  const code = weatherData.current.weather_code;

  // 1-3. WMO 날씨 코드를 읽기 쉬운 텍스트로 변환
  let condition = "맑음 ☀️";
  if (code >= 1 && code <= 3) condition = "구름 많음 ☁️";
  else if (code >= 45 && code <= 48) condition = "안개 🌫️";
  else if (code >= 51 && code <= 67) condition = "비 ☔";
  else if (code >= 71 && code <= 77) condition = "눈 ❄️";
  else if (code >= 80 && code <= 82) condition = "소나기 🌧️";
  else if (code >= 95) condition = "천둥번개 ⛈️";

  return { 
    name, 
    temp, 
    condition, 
    fullWeatherText: `${condition}, 기온은 ${temp}°C` 
  };
}

// 🤖 2. 날씨 정보와 사용자 정보를 취합해 Gemini에게 패션 추천을 요청하는 함수
export async function getOutfitRecommendation(region: string, gender: string, weatherInfo: string): Promise<OutfitRecommendation> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      너는 날씨와 패션에 아주 민감한 전문 스타일리스트야. 
      현재 사용자는 '${region}'에 있으며, 성별은 '${gender}'야.
      이 지역의 현재 실시간 날씨는 '${weatherInfo}'야. 
      이 실시간 날씨(기온 및 상태)를 철저히 반영해서, 지금 당장 입고 나가기 가장 실용적이고 센스 있는 옷차림을 추천해줘.

      분석 결과를 반드시 아래 JSON 형식으로만 대답해. 마크다운 기호(\`\`\`json 등)는 절대 넣지 마.
      {
        "weather_summary": "현재 날씨 브리핑 (예: 서울은 현재 비가 오고 15°C로 쌀쌀합니다.)",
        "outfit_emojis": "추천 옷차림을 시각적으로 보여줄 이모지 3~4개 조합 (예: 🧥 + 👕 + 👖 + 🌂)",
        "description": "추천하는 옷차림에 대한 상세한 설명과 기온에 맞춘 이유 (한국어, 2~3문장)",
        "styling_tip": "센스 있는 포인트 스타일링 팁 1줄"
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanJsonString);

  } catch (error: any) {
    console.error("Gemini API 호출 에러 상세:", error);
    let errorMessage = "날씨에 맞는 옷차림을 분석하는 중 오류가 발생했어요. 😢";

    if (error.message?.includes("429") || error.message?.includes("Quota")) {
      errorMessage = "너무 많은 요청이 발생했습니다! 약 1분 정도 기다리신 후에 다시 시도해 주세요.";
    }
    throw new Error(errorMessage);
  }
}