import './index.css'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // 혹시 css 파일이 없다면 이 줄은 지워도 됩니다.

const rootElement = document.getElementById('root');

// 안전장치: 도화지가 없으면 에러를 띄움
if (!rootElement) {
  throw new Error("HTML 파일에 <div id='root'></div> 가 없습니다!");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);