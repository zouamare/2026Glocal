// src/App.tsx
import { useState, useRef, useEffect } from 'react';
import { analyzeFood } from './gemini';
import './App.css';

export interface NutritionData {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  evaluation: string;
}

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  imageUrl?: string;
  nutrition?: NutritionData;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-msg',
      text: '안녕하세요! 오늘의 급식 사진이나 메뉴를 입력하시면 AI가 영양소를 분석해 드립니다. 🍱',
      isUser: false,
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() && !selectedFile) return;

    // 1. 내 메시지 화면에 띄우기
    const userMsgId = Date.now().toString();
    const imageUrl = selectedFile ? URL.createObjectURL(selectedFile) : undefined;
    
    const newUserMsg: Message = {
      id: userMsgId,
      text: inputText,
      isUser: true,
      imageUrl: imageUrl,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    const currentText = inputText;
    const currentFile = selectedFile;
    setInputText('');
    setSelectedFile(null);

    // ★ 예외 처리 구조 (try-catch-finally) 추가
    try {
      // API 호출 시도
      const aiResult = await analyzeFood(currentText, currentFile);

      // 성공 시: 정상적인 결과 메시지 추가
      const aiResponseMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: '분석이 완료되었습니다!',
        isUser: false,
        nutrition: aiResult,
      };
      setMessages((prev) => [...prev, aiResponseMsg]);

    } catch (error: any) {
      // 실패 시: gemini.ts에서 던진 상세 에러 메시지를 채팅으로 출력
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: error.message || '죄송합니다. 오류가 발생했어요.',
        isUser: false,
      };
      setMessages((prev) => [...prev, errorMsg]);

    } finally {
      // 성공하든 실패하든 마지막에 로딩 상태 해제
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="chat-header">
        📸 AI 급식 영양 분석기
      </header>

      <div className="chat-window">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.isUser ? 'user' : 'ai'}`}>
            <div className="bubble">
              {msg.imageUrl && (
                <img src={msg.imageUrl} alt="uploaded food" className="chat-image" />
              )}
              
              {msg.nutrition && (
                <div className="nutrition-dashboard">
                  <div className="total-cal">{msg.nutrition.calories} kcal</div>
                  <div className="macro-nutrients">
                    <div>탄수화물 <span>{msg.nutrition.carbs}%</span></div>
                    <div>단백질 <span>{msg.nutrition.protein}%</span></div>
                    <div>지방 <span>{msg.nutrition.fat}%</span></div>
                  </div>
                </div>
              )}
              
              <div className="ai-evaluation">
                {msg.nutrition ? msg.nutrition.evaluation : msg.text}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message ai">
            <div className="bubble">AI가 메뉴를 꼼꼼히 분석하고 있어요... 🤖🔍</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <label className="file-upload-label" title="사진 첨부">
          📎
          <input 
            type="file" 
            accept="image/*" 
            style={{ display: 'none' }} 
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
        </label>
        
        <input 
          type="text" 
          placeholder={selectedFile ? `사진 첨부됨 (${selectedFile.name})` : "메뉴를 입력하세요..."}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          disabled={isLoading}
        />
        
        <button onClick={handleSendMessage} disabled={isLoading}>
          전송
        </button>
      </div>
    </div>
  );
}

export default App;