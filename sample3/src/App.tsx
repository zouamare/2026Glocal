// src/App.tsx
import { useState, useEffect } from 'react';
import { fetchWeather, getOutfitRecommendation } from './gemini';

export interface OutfitRecommendation {
  weather_summary: string;
  outfit_emojis: string;
  description: string;
  styling_tip: string;
}

interface HistoryItem {
  id: string;
  region: string;
  gender: string;
  outfit?: OutfitRecommendation;
  error?: string;
}

// 🇰🇷 대한민국 주요 지역 리스트
const REGIONS = [
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", 
  "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원특별자치도", 
  "충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도", 
  "경상남도", "제주특별자치도"
];

export default function App() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // 입력 상태 관리
  const [region, setRegion] = useState('인천광역시'); // 기본값
  const [gender, setGender] = useState('여성'); 
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  // 스크롤을 최상단으로 올리기 위한 처리 (최신 결과가 위에 쌓일 경우 대비, 이번엔 기본 스크롤 유지)
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, [history]);

  const handleSearch = async () => {
    const currentId = Date.now().toString();
    const currentRegion = region;
    const currentGender = gender;

    setIsLoading(true);

    try {
      setLoadingStatus('🌍 지역 날씨를 조회하고 있습니다...');
      const weatherData = await fetchWeather(currentRegion);

      setLoadingStatus(`🤖 ${weatherData.condition} (${weatherData.temp}°C) 맞춤 코디 분석 중...`);
      const aiResult = await getOutfitRecommendation(currentRegion, currentGender, weatherData.fullWeatherText);

      // 결과를 history 배열에 추가 (가장 아래에 쌓이도록)
      setHistory((prev) => [
        ...prev,
        {
          id: currentId,
          region: currentRegion,
          gender: currentGender,
          outfit: aiResult,
        }
      ]);
    } catch (error: any) {
      setHistory((prev) => [
        ...prev,
        { 
          id: currentId, 
          region: currentRegion, 
          gender: currentGender, 
          error: error.message 
        }
      ]);
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* 📌 상단 네비게이션 바 (Header) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⛅</span>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
              OOTD <span className="text-sky-500">Caster</span>
            </h1>
          </div>
          <div className="text-sm font-medium text-slate-500 hidden sm:block">
            AI 기반 실시간 날씨 맞춤 스타일리스트
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 md:py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* 📌 좌측 메인 영역 (검색 폼 및 결과 피드) */}
        <div className="md:col-span-8 flex flex-col gap-8">
          
          {/* 1. 검색 폼 (Form Area) */}
          <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-5">오늘의 외출 정보를 선택해주세요</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              
              {/* 지역 드롭다운 */}
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">지역 (Region)</label>
                <div className="relative">
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 appearance-none font-medium text-slate-700 outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all cursor-pointer"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    disabled={isLoading}
                  >
                    {REGIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  {/* 드롭다운 화살표 아이콘 */}
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>

              {/* 성별 드롭다운 */}
              <div className="w-full sm:w-40">
                <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">성별 (Gender)</label>
                <div className="relative">
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 appearance-none font-medium text-slate-700 outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all cursor-pointer"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="여성">여성</option>
                    <option value="남성">남성</option>
                  </select>
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>

            </div>

            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="mt-6 w-full bg-sky-500 hover:bg-sky-600 text-white py-4 rounded-2xl font-bold shadow-md disabled:bg-slate-300 transition-colors text-lg flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div>
                  분석 중...
                </>
              ) : (
                '날씨 및 코디 검색'
              )}
            </button>
          </section>

          {/* 2. 로딩 상태창 */}
          {isLoading && (
            <div className="bg-sky-50 border border-sky-100 p-5 rounded-2xl flex items-center gap-4 text-sky-700 font-medium message-animate">
              <span className="text-2xl animate-pulse">☁️</span>
              {loadingStatus}
            </div>
          )}

          {/* 3. 검색 결과 피드 (리포트 카드 형태) */}
          <section className="space-y-6">
            {history.length === 0 && !isLoading ? (
              <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                <span className="text-5xl block mb-4">👕</span>
                상단에서 지역을 선택하고 검색을 시작해보세요!
              </div>
            ) : (
              history.map((item) => (
                <article key={item.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all message-animate">
                  
                  {/* 카드 헤더 (검색 조건) */}
                  <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-lg">
                        {item.region}
                      </span>
                      <span className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-lg">
                        {item.gender}
                      </span>
                    </div>
                  </div>

                  {/* 카드 본문 (에러 처리 및 AI 결과) */}
                  <div className="p-6 md:p-8">
                    {item.error ? (
                      <div className="text-red-500 font-medium flex items-center gap-2">
                        ⚠️ {item.error}
                      </div>
                    ) : item.outfit ? (
                      <div className="space-y-8">
                        {/* 날씨 요약 */}
                        <div className="text-center">
                          <h3 className="text-xl md:text-2xl font-bold text-slate-800">
                            {item.outfit.weather_summary}
                          </h3>
                        </div>

                        {/* 시각적 이모지 뷰 */}
                        <div className="bg-sky-50 py-12 rounded-2xl flex justify-center items-center text-6xl md:text-7xl shadow-inner border border-sky-100">
                          {item.outfit.outfit_emojis}
                        </div>

                        {/* 설명 및 팁 */}
                        <div className="space-y-4">
                          <p className="text-slate-700 leading-relaxed text-base md:text-lg">
                            {item.outfit.description}
                          </p>
                          <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex gap-3 items-start">
                            <span className="text-2xl">💡</span>
                            <div>
                              <span className="block text-slate-500 text-xs font-bold mb-1 tracking-wider">STYLING TIP</span>
                              <p className="text-slate-800 font-medium leading-relaxed">{item.outfit.styling_tip}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </section>
        </div>

        {/* 📌 우측 사이드바 (최근 검색 내역 요약) */}
        <aside className="md:col-span-4">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 sticky top-24">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span>🕒</span> 최근 검색 기록
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 bg-slate-50 p-4 rounded-xl text-center">
                기록이 없습니다.
              </p>
            ) : (
              <ul className="space-y-3">
                {history.map((item) => (
                  <li key={item.id} className="text-sm p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-600 truncate message-animate">
                    <strong>{item.region}</strong> · {item.gender}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

      </main>
    </div>
  );
}