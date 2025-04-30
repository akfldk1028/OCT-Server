import { createRoot } from 'react-dom/client';
import './tailwind.css'; // Tailwind CSS 임포트 (새로 추가)
import './App.css'; // 기존 스타일 유지
import App from './App';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);

// calling IPC exposed from preload script
window.electron.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);
});
window.electron.ipcRenderer.sendMessage('ipc-example', ['ping']);
