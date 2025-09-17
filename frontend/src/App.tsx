import React, { useState, useEffect } from 'react';
import './App.css';
import Analytics from './Analytics';
import KakaoLogin from './KakaoLogin';

interface KakaoUser {
  id: number;
  nickname: string;
  email?: string;
  profileImage?: string;
}

interface Transaction {
  id?: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  createdAt?: string;
}

interface Character {
  id: number;
  name: string;
  level: number;
  experience: number;
  stage: string;
}

interface Budget {
  id: number;
  targetAmount: number;
  startDate: string;
  endDate: string;
}

interface MissionProgress {
  description: string;
  type: string;
  target: number;
  current: number;
  completed: boolean;
}

interface SavingStatus {
  weeklyTarget: number;
  weeklyExpenses: number;
  weeklySaved: number;
  dailyTarget: number;
  todayExpenses: number;
  todaySaved: number;
  missionProgress: MissionProgress;
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [character, setCharacter] = useState<Character | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [savingStatus, setSavingStatus] = useState<SavingStatus | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyTransactions, setDailyTransactions] = useState<Transaction[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<KakaoUser | null>(null);
  
  // 애니메이션 상태
  const [expGainAnimation, setExpGainAnimation] = useState<number | null>(null);
  const [evolutionAnimation, setEvolutionAnimation] = useState(false);
  const [missionCompleteAnimation, setMissionCompleteAnimation] = useState(false);
  const [rewardAnimation, setRewardAnimation] = useState(false);
  
  // UI 상태
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'calendar' | 'transactions'>('dashboard');
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleKakaoLogin = (user: KakaoUser) => {
    setCurrentUser(user);
    fetchData();
    showSuccessMessage(`${user.nickname}님 환영합니다!`);
  };

  const handleKakaoLogout = () => {
    setCurrentUser(null);
    setTransactions([]);
    setCharacter(null);
    setBudget(null);
    setSavingStatus(null);
    showSuccessMessage('로그아웃되었습니다');
  };

  const showSuccessMessage = (message: string) => {
    setShowSuccess(message);
    setTimeout(() => setShowSuccess(null), 3000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const healthCheck = await fetch('http://localhost:8080/api/character');
      if (!healthCheck.ok) {
        throw new Error('백엔드 서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
      }

      const [transactionsRes, characterRes, budgetRes, savingRes] = await Promise.all([
        fetch('http://localhost:8080/api/transactions'),
        fetch('http://localhost:8080/api/character'),
        fetch('http://localhost:8080/api/character/budget'),
        fetch('http://localhost:8080/api/character/saving-status')
      ]);

      if (!transactionsRes.ok || !characterRes.ok || !budgetRes.ok || !savingRes.ok) {
        throw new Error('데이터를 가져오는 중 오류가 발생했습니다.');
      }

      const transactionsData = await transactionsRes.json();
      const characterData = await characterRes.json();
      const budgetData = await budgetRes.json();
      const savingData = await savingRes.json();

      setTransactions(transactionsData || []);
      setCharacter(characterData);
      setBudget(budgetData);
      setSavingStatus(savingData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError(error instanceof Error ? error.message : '데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyTransactions = async (date: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/transactions/daily/${date}`);
      if (response.ok) {
        const data = await response.json();
        setDailyTransactions(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch daily transactions:', error);
    }
  };

  const addTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:8080/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amount: parseFloat(amount),
          type
        }),
      });

      if (response.ok) {
        setDescription('');
        setAmount('');
        await fetchData();
        await fetchDailyTransactions(selectedDate);
        
        showSuccessMessage(`${type === 'income' ? '수입' : '지출'}이 추가되었습니다`);
      }
    } catch (error) {
      console.error('Failed to add transaction:', error);
    }
  };

  const setBudgetGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`http://localhost:8080/api/character/budget?amount=${budgetAmount}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setBudgetAmount('');
        await fetchData();
        triggerRewardAnimation();
        showSuccessMessage('예산이 설정되었습니다!');
      }
    } catch (error) {
      console.error('Failed to set budget:', error);
    }
  };

  const checkWeeklySavings = async () => {
    try {
      // 현재 캐릭터 정보 저장
      const oldExp = character?.experience || 0;
      const oldStage = character?.stage || 'EGG';
      
      const response = await fetch('http://localhost:8080/api/character/check-weekly-savings', {
        method: 'POST'
      });
      
      if (response.ok) {
        // 데이터 새로고침
        await fetchData();
        
        // 새로운 캐릭터 정보 직접 가져오기
        const updatedCharacterRes = await fetch('http://localhost:8080/api/character');
        if (updatedCharacterRes.ok) {
          const updatedCharacter = await updatedCharacterRes.json();
          
          const expGained = updatedCharacter.experience - oldExp;
          console.log('경험치 변화:', oldExp, '->', updatedCharacter.experience, '(+' + expGained + ')');
          
          if (expGained > 0) {
            triggerExpGainAnimation(expGained);
          }
          
          if (updatedCharacter.stage !== oldStage) {
            triggerEvolutionAnimation();
          }
        }
        
        triggerRewardAnimation();
        showSuccessMessage('주간 절약 달성 체크가 완료되었습니다!');
      }
    } catch (error) {
      console.error('Failed to check weekly savings:', error);
    }
  };

  const checkDailySavings = async () => {
    try {
      // 현재 캐릭터 정보 저장
      const oldExp = character?.experience || 0;
      const oldStage = character?.stage || 'EGG';
      
      const response = await fetch('http://localhost:8080/api/character/check-daily-savings', {
        method: 'POST'
      });
      
      if (response.ok) {
        // 데이터 새로고침
        await fetchData();
        
        // 새로운 캐릭터 정보 직접 가져오기
        const updatedCharacterRes = await fetch('http://localhost:8080/api/character');
        if (updatedCharacterRes.ok) {
          const updatedCharacter = await updatedCharacterRes.json();
          
          const expGained = updatedCharacter.experience - oldExp;
          console.log('경험치 변화:', oldExp, '->', updatedCharacter.experience, '(+' + expGained + ')');
          
          if (expGained > 0) {
            triggerExpGainAnimation(expGained);
          }
          
          if (updatedCharacter.stage !== oldStage) {
            triggerEvolutionAnimation();
          }
        }
        
        triggerRewardAnimation();
        showSuccessMessage('일일 절약 달성 체크가 완료되었습니다!');
      }
    } catch (error) {
      console.error('Failed to check daily savings:', error);
    }
  };

  // 애니메이션 트리거 함수들
  const triggerExpGainAnimation = (expAmount: number) => {
    setExpGainAnimation(expAmount);
    setTimeout(() => setExpGainAnimation(null), 2000);
  };

  const triggerEvolutionAnimation = () => {
    setEvolutionAnimation(true);
    setTimeout(() => setEvolutionAnimation(false), 3000);
  };

  const triggerMissionCompleteAnimation = () => {
    setMissionCompleteAnimation(true);
    setTimeout(() => setMissionCompleteAnimation(false), 2000);
  };

  const triggerRewardAnimation = () => {
    setRewardAnimation(true);
    setTimeout(() => setRewardAnimation(false), 1500);
  };

  const deleteTransaction = async (id: number) => {
    if (window.confirm('이 거래를 삭제하시겠습니까?')) {
      try {
        const response = await fetch(`http://localhost:8080/api/transactions/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          fetchData();
          fetchDailyTransactions(selectedDate);
          showSuccessMessage('거래가 삭제되었습니다');
        }
      } catch (error) {
        console.error('Failed to delete transaction:', error);
      }
    }
  };

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getDayTransactions = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return transactions.filter(t => t.createdAt?.startsWith(dateStr));
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getStageEmoji = (stage: string) => {
    switch (stage) {
      case 'EGG': return '🥚';
      case 'BABY': return '🐣';
      case 'ADULT': return '🦆';
      case 'RICH': return '💎';
      case 'BILLIONAIRE': return '👑';
      default: return '🥚';
    }
  };

  const getStageKorean = (stage: string) => {
    switch (stage) {
      case 'EGG': return '알';
      case 'BABY': return '새끼';
      case 'ADULT': return '성체';
      case 'RICH': return '부자';
      case 'BILLIONAIRE': return '재벌';
      default: return '알';
    }
  };

  const getNextStageExp = (stage: string) => {
    switch (stage) {
      case 'EGG': return 100;
      case 'BABY': return 500;
      case 'ADULT': return 2000;
      case 'RICH': return 10000;
      case 'BILLIONAIRE': return 10000;
      default: return 100;
    }
  };

  useEffect(() => {
    if (selectedDate && currentUser) {
      fetchDailyTransactions(selectedDate);
    }
  }, [selectedDate, currentUser]);

  // 미션 완료 체크 (savingStatus 변경 감지)
  useEffect(() => {
    if (savingStatus?.missionProgress?.completed && !missionCompleteAnimation) {
      triggerMissionCompleteAnimation();
    }
  }, [savingStatus?.missionProgress?.completed]);

  // 네비게이션 바 렌더링
  const renderNavigationBar = () => (
    <div className="nav-bar">
      <button 
        className={`nav-button ${viewMode === 'dashboard' ? 'active' : ''}`}
        onClick={() => setViewMode('dashboard')}
      >
        📊 대시보드
      </button>
      <button 
        className={`nav-button ${viewMode === 'calendar' ? 'active' : ''}`}
        onClick={() => setViewMode('calendar')}
      >
        📅 달력
      </button>
      <button 
        className={`nav-button ${viewMode === 'transactions' ? 'active' : ''}`}
        onClick={() => setViewMode('transactions')}
      >
        💳 거래내역
      </button>
    </div>
  );

  // 대시보드 뷰 렌더링
  const renderDashboard = () => (
    <div className="dashboard-view">
      {/* 빠른 거래 입력 */}
      <div className="quick-transaction-form">
        <h3>💳 빠른 거래 입력</h3>
        <form onSubmit={addTransaction} className="compact-form">
          <div className="compact-form-grid">
            <input
              type="text"
              placeholder="내역 (커피, 간식, 배달음식 등)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="compact-input"
            />
            <input
              type="number"
              placeholder="금액"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="compact-input"
            />
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value as 'income' | 'expense')}
              className="compact-select"
            >
              <option value="expense">지출</option>
              <option value="income">수입</option>
            </select>
            <button type="submit" className="compact-submit">
              추가
            </button>
          </div>
        </form>
      </div>

      {/* 캐릭터 정보 */}
      {character && (
        <div className="character-card enhanced">
          <h2>🎮 내 캐릭터</h2>
          
          <div className="character-avatar">
            {getStageEmoji(character.stage)}
          </div>
          
          <h3>{character.name} (Lv.{character.level || 1})</h3>
          
          <div className="character-stats">
            <div className="stat-item">
              <span className="stat-label">현재 단계:</span>
              <span className="stat-value">{getStageKorean(character.stage)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">경험치:</span>
              <span className="stat-value">
                {(character.experience || 0).toLocaleString()} / {getNextStageExp(character.stage).toLocaleString()}
              </span>
            </div>
          </div>
          
          {/* 경험치 프로그레스 바 */}
          <div className="exp-bar-container">
            <div className="exp-bar">
              <div 
                className="exp-fill"
                style={{
                  width: `${Math.min(((character.experience || 0) / getNextStageExp(character.stage)) * 100, 100)}%`
                }}
              ></div>
              
              {/* 경험치 파티클 효과 */}
              {expGainAnimation && (
                <div className="exp-particle">
                  +{expGainAnimation}
                </div>
              )}
            </div>
          </div>
          
          <p className="character-hint">
            💡 절약을 달성하고 미션을 완료하면 캐릭터가 진화해요!
          </p>
        </div>
      )}

      {/* 절약 현황 요약 */}
      {savingStatus && (
        <div className={`saving-summary ${(savingStatus.weeklySaved || 0) >= 0 ? 'positive' : 'negative'}`}>
          <h3>이번 주 절약 현황</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">목표 지출</span>
              <span className="summary-value">{(savingStatus.weeklyTarget || 0).toLocaleString()}원</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">실제 지출</span>
              <span className="summary-value">{(savingStatus.weeklyExpenses || 0).toLocaleString()}원</span>
            </div>
            <div className="summary-item highlight">
              <span className="summary-label">
                {(savingStatus.weeklySaved || 0) >= 0 ? '절약액' : '초과액'}
              </span>
              <span className="summary-value">
                {Math.abs(savingStatus.weeklySaved || 0).toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 빠른 액션 버튼들 */}
      <div className="quick-actions">
        <button 
          className="action-btn primary"
          onClick={checkWeeklySavings}
        >
          🎯 주간 절약 체크
        </button>
        <button 
          className="action-btn secondary"
          onClick={checkDailySavings}
        >
          📅 일일 절약 체크
        </button>
        <button 
          className="action-btn accent"
          onClick={() => setShowAnalytics(true)}
        >
          📊 분석 보기
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      {/* 헤더 */}
      <header className="app-header">
        <h1>💰 SavePet</h1>
        {isMobile && currentUser && renderNavigationBar()}
      </header>

      {/* 성공 메시지 */}
      {showSuccess && (
        <div className="success-message">
          {showSuccess}
        </div>
      )}

      {/* 애니메이션들 */}
      {expGainAnimation && (
        <div className="exp-gain-animation">
          +{expGainAnimation} EXP!
        </div>
      )}

      {evolutionAnimation && (
        <div className="evolution-animation">
          <div className="evolution-sparkles">✨🦋✨</div>
          <h1>축하합니다! 캐릭터가 진화했습니다!</h1>
          <div className="evolved-character">
            {character && getStageEmoji(character.stage)}
          </div>
        </div>
      )}

      {missionCompleteAnimation && (
        <div className="mission-complete-animation">
          🎯 미션 완료!
        </div>
      )}

      {rewardAnimation && (
        <div className="reward-animation">
          🎉💰🎉
        </div>
      )}
      
      {/* 카카오 로그인 */}
      <KakaoLogin 
        onLogin={handleKakaoLogin}
        onLogout={handleKakaoLogout}
        currentUser={currentUser}
      />
      
      {/* 로그인하지 않은 경우 */}
      {!currentUser && (
        <div className="welcome-screen">
          <h2>SavePet에 오신 것을 환영합니다!</h2>
          <p>카카오 로그인을 통해 개인별 가계부를 시작하세요.</p>
          <p>절약하며 귀여운 펫을 키워보세요!</p>
        </div>
      )}
      
      {/* 로딩 상태 */}
      {currentUser && loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>로딩 중...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {currentUser && error && (
        <div className="error-container">
          <h3>오류 발생</h3>
          <p>{error}</p>
          <button 
            onClick={() => fetchData()}
            className="retry-btn"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      {currentUser && !loading && !error && (
        <main className="main-content">
          {/* 데스크톱 네비게이션 */}
          {!isMobile && renderNavigationBar()}
          
          {/* 뷰 모드에 따른 컨텐츠 */}
          {viewMode === 'dashboard' && renderDashboard()}
          
          {viewMode === 'calendar' && (
            <div className="calendar-view">
              <div className="calendar-header">
                <button 
                  className="calendar-nav-btn"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                >
                  ‹
                </button>
                <h3>{currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월</h3>
                <button 
                  className="calendar-nav-btn"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                >
                  ›
                </button>
              </div>

              <div className="calendar-grid">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                  <div key={day} className="calendar-header-day">
                    {day}
                  </div>
                ))}
                
                {getCalendarDays().map((date, index) => {
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  const isSelected = formatDate(date) === selectedDate;
                  const dayTransactions = getDayTransactions(date);
                  const dayExpenses = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                  
                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedDate(formatDate(date))}
                      className={`calendar-day ${isSelected ? 'selected' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
                    >
                      <div className="day-number">{date.getDate()}</div>
                      {dayExpenses > 0 && (
                        <div className="day-expense">
                          -{dayExpenses.toLocaleString()}원
                        </div>
                      )}
                      <div className="day-transactions">
                        {dayTransactions.slice(0, 2).map((transaction, idx) => (
                          <div key={idx} className="transaction-preview">
                            {transaction.description}
                          </div>
                        ))}
                        {dayTransactions.length > 2 && (
                          <div className="more-indicator">
                            +{dayTransactions.length - 2}개
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 선택된 날짜의 거래 내역 */}
              <div className="selected-date-transactions">
                <h3>{selectedDate} 거래 내역</h3>
                {dailyTransactions.length > 0 ? (
                  <>
                    {dailyTransactions.map(transaction => (
                      <div key={transaction.id} className={`transaction-item ${transaction.type}`}>
                        <div className="transaction-info">
                          <span className="transaction-desc">{transaction.description}</span>
                          <span className="transaction-amount">
                            {transaction.type === 'income' ? '+' : '-'}{(transaction.amount || 0).toLocaleString()}원
                          </span>
                        </div>
                        <button 
                          onClick={() => deleteTransaction(transaction.id!)}
                          className="delete-btn"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                    <div className="daily-summary">
                      일일 지출 합계: {dailyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}원
                    </div>
                  </>
                ) : (
                  <p className="no-transactions">해당 날짜에 거래 내역이 없습니다.</p>
                )}
              </div>
            </div>
          )}
          
          {viewMode === 'transactions' && (
            <div className="transactions-view">
              {/* 거래 입력 폼 */}
              <form onSubmit={addTransaction} className="transaction-form enhanced">
                <h3>💳 새 거래 추가</h3>
                <div className="form-grid">
                  <input
                    type="text"
                    placeholder="내역 설명 (커피, 간식, 배달음식 등)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="form-input"
                  />
                  <input
                    type="number"
                    placeholder="금액"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="form-input"
                  />
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                    className="form-select"
                  >
                    <option value="expense">지출</option>
                    <option value="income">수입</option>
                  </select>
                  <button type="submit" className="form-submit">
                    추가
                  </button>
                </div>
                <p className="form-hint">
                  💡 미션 달성을 위해 거래 설명에 '커피', '간식', '배달' 등의 키워드를 포함해주세요!
                </p>
              </form>

              {/* 최근 거래 내역 */}
              <div className="recent-transactions">
                <h3>최근 거래 내역</h3>
                {transactions.slice(0, 10).map(transaction => (
                  <div key={transaction.id} className={`transaction-item ${transaction.type}`}>
                    <div className="transaction-details">
                      <strong className="transaction-desc">{transaction.description}</strong>
                      <div className="transaction-date">
                        {transaction.createdAt && new Date(transaction.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="transaction-actions">
                      <span className="transaction-amount">
                        {transaction.type === 'income' ? '+' : '-'}{(transaction.amount || 0).toLocaleString()}원
                      </span>
                      <button 
                        onClick={() => deleteTransaction(transaction.id!)}
                        className="delete-btn"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 고정 섹션들 (모든 뷰에서 표시) */}
          {viewMode === 'dashboard' && (
            <>
              {/* 주간 예산 설정 */}
              <div className="budget-section">
                <h3>📊 주간 예산 설정</h3>
                {budget && (
                  <p className="current-budget">현재 예산: {(budget.targetAmount || 0).toLocaleString()}원</p>
                )}
                <form onSubmit={setBudgetGoal} className="budget-form">
                  <input
                    type="number"
                    placeholder="주간 예산 금액"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    required
                    className="budget-input"
                  />
                  <button type="submit" className="budget-submit">
                    예산 설정
                  </button>
                </form>
              </div>

              {/* 절약 현황 및 미션 */}
              {savingStatus && (
                <div className={`saving-status-section ${(savingStatus.weeklySaved || 0) >= 0 ? 'positive' : 'negative'}`}>
                  <h3>🎯 절약 현황 및 미션</h3>
                  
                  {/* 주간 절약 현황 */}
                  <div className="saving-category">
                    <h4>주간 절약</h4>
                    <div className="saving-stats">
                      <p>목표 지출: {(savingStatus.weeklyTarget || 0).toLocaleString()}원</p>
                      <p>실제 지출: {(savingStatus.weeklyExpenses || 0).toLocaleString()}원</p>
                      <p className="saving-amount">
                        {(savingStatus.weeklySaved || 0) >= 0 ? '절약액' : '초과액'}: 
                        <span>{Math.abs(savingStatus.weeklySaved || 0).toLocaleString()}원</span>
                      </p>
                    </div>
                    <button 
                      onClick={checkWeeklySavings}
                      className="check-btn weekly"
                    >
                      주간 절약 체크
                    </button>
                  </div>

                  {/* 일일 절약 현황 */}
                  <div className="saving-category">
                    <h4>오늘 절약</h4>
                    <div className="saving-stats">
                      <p>일일 목표: {(savingStatus.dailyTarget || 0).toLocaleString()}원</p>
                      <p>오늘 지출: {(savingStatus.todayExpenses || 0).toLocaleString()}원</p>
                      <p className="saving-amount">
                        {(savingStatus.todaySaved || 0) >= 0 ? '절약액' : '초과액'}: 
                        <span>{Math.abs(savingStatus.todaySaved || 0).toLocaleString()}원</span>
                      </p>
                    </div>
                    <button 
                      onClick={checkDailySavings}
                      className="check-btn daily"
                    >
                      일일 절약 체크
                    </button>
                  </div>

                  {/* 현재 미션 */}
                  {savingStatus.missionProgress && savingStatus.missionProgress.description && (
                    <div className={`mission-section ${savingStatus.missionProgress.completed ? 'completed' : ''}`}>
                      <h4>🎯 현재 미션</h4>
                      <p className="mission-description">
                        <strong>{savingStatus.missionProgress.description}</strong>
                      </p>
                      <div className="mission-progress-bar">
                        <div 
                          className="mission-progress-fill"
                          style={{
                            width: `${Math.min(((savingStatus.missionProgress.current || 0) / (savingStatus.missionProgress.target || 1)) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                      <p className="mission-stats">
                        진행률: {(savingStatus.missionProgress.current || 0).toLocaleString()}원 / {(savingStatus.missionProgress.target || 0).toLocaleString()}원
                        {savingStatus.missionProgress.completed && <span className="completed-badge"> ✅ 완료!</span>}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      )}

      <Analytics isVisible={showAnalytics} onClose={() => setShowAnalytics(false)} />
    </div>
  );
}

export default App;