import React, { useEffect, useState } from 'react';

declare global {
  interface Window {
    Kakao: any;
  }
}

interface KakaoUser {
  id: number;
  nickname: string;
  email?: string;
  profileImage?: string;
}

interface KakaoLoginProps {
  onLogin: (user: KakaoUser) => void;
  onLogout: () => void;
  currentUser: KakaoUser | null;
}

const KakaoLogin: React.FC<KakaoLoginProps> = ({ onLogin, onLogout, currentUser }) => {
  const [isKakaoLoaded, setIsKakaoLoaded] = useState(false);

  useEffect(() => {
  // 이미 로드된 스크립트가 있는지 확인
  if (window.Kakao && window.Kakao.isInitialized()) {
    setIsKakaoLoaded(true);
    return;
  }

  // 기존 스크립트 확인
  const existingScript = document.querySelector('script[src="https://developers.kakao.com/sdk/js/kakao.js"]');
  
  if (existingScript) {
    if (window.Kakao) {
      const KAKAO_JS_KEY = '96b5bc4d04389034da3944a3e9f6b459';
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(KAKAO_JS_KEY);
      }
      setIsKakaoLoaded(true);
    }
    return;
  }

  // 새 스크립트 생성
  const script = document.createElement('script');
  script.src = 'https://developers.kakao.com/sdk/js/kakao.js';
  script.async = true;
  script.onload = () => {
    if (window.Kakao) {
      const KAKAO_JS_KEY = '96b5bc4d04389034da3944a3e9f6b459';
      
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(KAKAO_JS_KEY);
      }
      setIsKakaoLoaded(true);
    }
  };
  document.head.appendChild(script);

  return () => {
    // cleanup 시 스크립트 제거하지 않음 (다른 컴포넌트에서 사용할 수 있음)
  };
}, []);

  const getUserInfo = () => {
    window.Kakao.API.request({
      url: '/v2/user/me',
      success: (response: any) => {
        const user: KakaoUser = {
          id: response.id,
          nickname: response.kakao_account?.profile?.nickname || '사용자',
          email: response.kakao_account?.email,
          profileImage: response.kakao_account?.profile?.profile_image_url
        };
        onLogin(user);
      },
      fail: (error: any) => {
        console.error('사용자 정보 가져오기 실패:', error);
      }
    });
  };

  const handleLogin = () => {
    if (!isKakaoLoaded) {
      alert('카카오 SDK가 로드되지 않았습니다.');
      return;
    }

    window.Kakao.Auth.login({
  scope: 'profile_nickname',  // account_email 제거
  success: () => {
    getUserInfo();
  },
  fail: (error: any) => {
    console.error('카카오 로그인 실패:', error);
    alert('로그인에 실패했습니다.');
  }
});
  };

  const handleLogout = () => {
    if (!isKakaoLoaded) return;

    window.Kakao.Auth.logout()
      .then(() => {
        onLogout();
      })
      .catch((error: any) => {
        console.error('로그아웃 실패:', error);
      });
  };

  if (!isKakaoLoaded) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        카카오 SDK 로딩 중...
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '15px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '10px',
      marginBottom: '20px'
    }}>
      {currentUser ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            {currentUser.profileImage && (
              <img 
                src={currentUser.profileImage} 
                alt="프로필" 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%' 
                }}
              />
            )}
            <div>
              <div style={{ fontWeight: 'bold' }}>{currentUser.nickname}님</div>
              {currentUser.email && (
                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                  {currentUser.email}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            로그아웃
          </button>
        </>
      ) : (
        <>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              카카오 계정으로 로그인하세요
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              개인별 가계부 데이터를 관리할 수 있습니다
            </div>
          </div>
          <button
            onClick={handleLogin}
            style={{
              padding: '10px 20px',
              backgroundColor: '#FEE500',
              color: '#191919',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>💬</span>
            카카오 로그인
          </button>
        </>
      )}
    </div>
  );
};

export default KakaoLogin;