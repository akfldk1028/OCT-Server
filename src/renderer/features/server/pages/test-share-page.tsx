import React from 'react';
import { useParams } from 'react-router';

export default function TestSharePage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      backgroundColor: '#f0f0f0',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>🎉 라우팅 성공!</h1>
      <p style={{ color: '#666', fontSize: '18px' }}>공유 토큰: <strong>{shareToken}</strong></p>
      <p style={{ color: '#999', fontSize: '14px', marginTop: '20px' }}>
        URL: {window.location.href}
      </p>
      <button 
        onClick={() => window.location.href = '/#/'}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        홈으로 돌아가기
      </button>
    </div>
  );
} 