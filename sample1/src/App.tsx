import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. 환경변수에서 API 키 불러오기
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// 2. 이미지 파일을 Gemini가 읽을 수 있는 base64 형태로 변환하는 유틸리티 함수
async function fileToGenerativePart(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        inlineData: {
          data: reader.result.split(',')[1],
          mimeType: file.type || 'image/jpeg'
        }
      });
    };
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [history, setHistory] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // async 함수로 변경됨
  const handleImageUpload = async (e) => { 
    const file = e.target.files[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    const newItemId = Date.now();

    // 분석 중 상태 UI 업데이트
    setHistory((prev) => [
      ...prev,
      { id: newItemId, image: imageUrl, status: 'loading', result: null }
    ]);

    try {
      // 3. Gemini API 호출 준비 (멀티모달에 최적화된 flash 모델 사용)
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const imagePart = await fileToGenerativePart(file);
      
      // 프롬프트 엔지니어링: 화면에 뿌리기 좋게 JSON 형식으로 답변을 요구합니다.
      const prompt = `이 사진 속 쓰레기가 무엇인지 인식하고, 한국의 분리수거 규정에 맞게 올바른 배출 방법을 3단계로 요약해줘.
      반드시 아래 JSON 형식으로만 대답하고, 마크다운 코드 블록(\`\`\`json 등)은 절대 쓰지 마.
      { "name": "물건이름(예: 투명 페트병)", "guides": ["1단계 설명", "2단계 설명", "3단계 설명"] }`;

      // 4. API 요청 전송 및 응답 수신
      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();
      
      // 불필요한 마크다운 기호가 섞여 올 경우를 대비해 텍스트 정제 후 JSON 파싱
      const cleanedText = responseText.replace(/```json|```/g, '').trim();
      const parsedResult = JSON.parse(cleanedText);

      // 5. 완료 상태로 UI 업데이트
      setHistory((prev) =>
        prev.map((item) =>
          item.id === newItemId
            ? { ...item, status: 'completed', result: parsedResult }
            : item
        )
      );

    } catch (error) {
      console.error("Gemini 연동 에러:", error);
      
      let errorTitle = '분석 실패 ⚠️';
      let errorMessage = '사진을 분석하는 중 알 수 없는 문제가 발생했습니다. 네트워크 상태나 API 키를 확인해주세요.';

      // 에러 객체를 문자열로 변환하여 특정 상태 코드가 포함되어 있는지 검사합니다.
      const errString = error.toString();
      
      // 1. 503 서버 과부하 에러 처리
      if (errString.includes('503') || errString.includes('high demand')) {
        errorTitle = '서버 혼잡 🚦';
        errorMessage = '현재 구글 AI 서버에 사용자가 몰려 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.';
      } 
      // 2. 429 요청 한도 초과 에러 처리 (단기간 내 과도한 호출 방지)
      else if (errString.includes('429') || errString.includes('quota')) {
        errorTitle = '요청 한도 초과 ⏳';
        errorMessage = '너무 짧은 시간에 많은 요청을 보냈습니다. 잠시 쉬었다가 천천히 다시 시도해 주세요.';
      }

      // 3. 채팅 UI에 에러 상태 업데이트
      setHistory((prev) =>
        prev.map((item) =>
          item.id === newItemId
            ? { 
                ...item, 
                status: 'completed', 
                result: { 
                  name: errorTitle, 
                  guides: [errorMessage] 
                } 
              }
            : item
        )
      );
    }
    
    e.target.value = '';
  };

  // --------------------------------------------------------
  // 하단 return 영역은 기존 채팅 레이아웃과 100% 동일합니다.
  // --------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-4 font-sans text-gray-800">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl flex flex-col overflow-hidden h-[85vh]">
        
        <div className="bg-white p-5 border-b border-gray-100 flex-shrink-0 z-10 shadow-sm">
          <h1 className="text-2xl font-extrabold flex items-center justify-center gap-2">
            <span className="text-green-500">♻️</span> 찰칵! 재활용
          </h1>
          <p className="text-center text-xs text-gray-400 mt-1">분리수거 방법을 물어보세요</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gray-50">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-70">
              <span className="text-5xl mb-4">📸</span>
              <p>아래 버튼을 눌러 쓰레기 사진을 올려주세요!</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="space-y-3 animate-fade-in">
                <div className="flex justify-end">
                  <img src={item.image} alt="uploaded" className="w-48 h-48 object-cover rounded-2xl rounded-tr-sm shadow-sm border border-gray-200" />
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-white p-4 rounded-2xl rounded-tl-sm shadow-md border border-gray-100">
                    {item.status === 'loading' ? (
                      <div className="flex items-center gap-3 text-gray-500 font-medium">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
                        AI 분석 중...
                      </div>
                    ) : (
                      <div>
                        <div className="font-bold text-green-700 mb-2 flex items-center gap-1">
                          🏷️ 인식 결과: {item.result?.name}
                        </div>
                        <ul className="text-sm text-gray-600 space-y-2">
                          {item.result?.guides.map((guide, index) => (
                            <li key={index} className="flex gap-2 leading-relaxed">
                              <span className="font-bold text-green-500">{index + 1}.</span>
                              {guide}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
          <label className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl cursor-pointer transition-colors font-bold shadow-lg active:scale-95 duration-200">
            <span className="text-xl">📷</span>
            사진 찍기 / 갤러리 선택
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>

      </div>
    </div>
  );
}