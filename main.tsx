import './src/index.css'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // ✅ 스타일은 여기서 딱 한 번만 부르면 됩니다.

const rootElement = document.getElementById('root');

// 안전장치: 혹시라도 도화지가 없으면 에러를 띄움
if (!rootElement) {
  throw new Error("HTML 파일에 <div id='root'></div> 가 없습니다!");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);