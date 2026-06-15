// src/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface NutritionResult {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  evaluation: string;
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type
    },
  };
}

export async function analyzeFood(text: string, file: File | null): Promise<NutritionResult> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      너는 학교 급식을 전문으로 분석하는 AI 영양사야. 
      사용자가 제공한 급식 사진이나 텍스트(메뉴 이름)를 보고 영양소를 분석해줘.
      사용자 입력 텍스트: "${text || '사진만 제공됨'}"

      분석 결과를 반드시 아래 JSON 형식으로만 대답해. 마크다운 기호(\`\`\`json 등)나 다른 설명은 절대 넣지 마.
      {
        "calories": 총 칼로리 숫자,
        "carbs": 탄수화물 비율 숫자(%),
        "protein": 단백질 비율 숫자(%),
        "fat": 지방 비율 숫자(%),
        "evaluation": "친절하고 다정한 영양 평가 및 조언 (한국어, 2~3문장)"
      }
    `;

    let result;
    if (file) {
      const imagePart = await fileToGenerativePart(file);
      result = await model.generateContent([prompt, imagePart]);
    } else {
      result = await model.generateContent(prompt);
    }

    const responseText = result.response.text();
    const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanJsonString);

  } catch (error: any) {
    console.error("Gemini API 호출 에러 상세:", error);
    
    // ★ 에러 종류에 따른 예외 처리 메시지 세분화
    let errorMessage = "이미지나 텍스트를 분석하는 중에 알 수 없는 오류가 발생했어요. 😢";

    if (error.message?.includes("429") || error.message?.includes("Quota")) {
      errorMessage = "너무 많은 요청이 발생했습니다! 🚦 약 1분 정도 기다리신 후에 다시 전송해 주세요.";
    } else if (error.message?.includes("400") || error.message?.includes("API_KEY_INVALID")) {
      errorMessage = "API 키 설정에 문제가 있습니다. (.env 파일의 값을 확인해 주세요) 🔑";
    } else if (error.message?.includes("404")) {
      errorMessage = "AI 모델 버전을 찾을 수 없습니다. 코드의 모델 이름을 확인해 주세요. 🔎";
    } else if (error.message?.includes("JSON")) {
      errorMessage = "AI가 올바른 형식으로 답변하지 못했습니다. 다시 시도해 주세요. 🔄";
    }

    // 세분화된 에러 메시지를 밖으로 던집니다!
    throw new Error(errorMessage);
  }
}