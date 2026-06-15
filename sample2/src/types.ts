// src/types.ts

// AI가 분석해 줄 영양소 데이터 구조
export interface NutritionData {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  evaluation: string;
}

// 💡 여기에 export가 잘 붙어있는지 확인!
export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  imageUrl?: string;
  nutrition?: NutritionData;
}