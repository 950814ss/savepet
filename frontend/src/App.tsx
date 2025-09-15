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

  const handleKakaoLogin = (user: KakaoUser) => {
    setCurrentUser(user);
    fetchData();
  };

  const handleKakaoLogout = () => {
    setCurrentUser(null);
    setTransactions([]);
    setCharacter(null);
    setBudget(null);
    setSavingStatus(null);
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
        alert('예산이 설정되었습니다!');
      }
    } catch (error) {
      console.error('Failed to set budget:', error);
    }
  };

  const checkWeeklySavings = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/character/check-weekly-savings', {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchData();
        alert('주간 절약 달성 체크가 완료되었습니다!');
      }
    } catch (error) {
      console.error('Failed to check weekly savings:', error);
    }
  };

  const checkDailySavings = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/character/check-daily-savings', {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchData();
        alert('일일 절약 달성 체크가 완료되었습니다!');
      }
    } catch (error) {
      console.error('Failed to check daily savings:', error);
    }
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

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>💰 SavePet 절약 가계부</h1>
      
      {/* 카카오 로그인 */}
      <KakaoLogin 
        onLogin={handleKakaoLogin}
        onLogout={handleKakaoLogout}
        currentUser={currentUser}
      />
      
      {/* 로그인하지 않은 경우 */}
      {!currentUser && (
        <div style={{
          textAlign: 'center',
          padding: '50px',
          backgroundColor: '#f8f9fa',
          borderRadius: '15px',
          margin: '20px 0'
        }}>
          <h2>SavePet에 오신 것을 환영합니다!</h2>
          <p>카카오 로그인을 통해 개인별 가계부를 시작하세요.</p>
          <p>절약하며 귀여운 펫을 키워보세요!</p>
        </div>
      )}
      
      {/* 로딩 상태 (로그인한 경우에만) */}
      {currentUser && loading && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '200px',
          fontSize: '18px'
        }}>
          로딩 중...
        </div>
      )}

      {/* 에러 상태 (로그인한 경우에만) */}
      {currentUser && error && (
        <div style={{ 
          padding: '20px', 
          maxWidth: '600px', 
          margin: '20px auto',
          textAlign: 'center',
          backgroundColor: '#ffe8e8',
          borderRadius: '10px',
          border: '2px solid #ff5555'
        }}>
          <h3>오류 발생</h3>
          <p>{error}</p>
          <button 
            onClick={() => fetchData()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 메인 앱 내용 (로그인하고 로딩/에러가 없을 때만) */}
      {currentUser && !loading && !error && (
        <>
          {/* 주간 예산 설정 */}
          <div style={{ backgroundColor: '#e3f2fd', padding: '20px', marginBottom: '20px', borderRadius: '10px' }}>
            <h3>주간 예산 설정</h3>
            {budget && (
              <p>현재 예산: {(budget.targetAmount || 0).toLocaleString()}원</p>
            )}
            <form onSubmit={setBudgetGoal} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="number"
                placeholder="주간 예산 금액"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                required
                style={{ padding: '10px', flex: '1' }}
              />
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '5px' }}>
                예산 설정
              </button>
            </form>
          </div>

          {/* 절약 현황 및 미션 */}
          {savingStatus && (
            <div style={{ 
              backgroundColor: (savingStatus.weeklySaved || 0) >= 0 ? '#e8f5e8' : '#ffe8e8', 
              padding: '20px', 
              marginBottom: '20px', 
              borderRadius: '10px' 
            }}>
              <h3>절약 현황 및 미션</h3>
              
              {/* 주간 절약 현황 */}
              <div style={{ marginBottom: '15px' }}>
                <h4>주간 절약</h4>
                <p>목표 지출: {(savingStatus.weeklyTarget || 0).toLocaleString()}원</p>
                <p>실제 지출: {(savingStatus.weeklyExpenses || 0).toLocaleString()}원</p>
                <p style={{ 
                  color: (savingStatus.weeklySaved || 0) >= 0 ? 'green' : 'red',
                  fontWeight: 'bold'
                }}>
                  {(savingStatus.weeklySaved || 0) >= 0 ? '절약액' : '초과액'}: {Math.abs(savingStatus.weeklySaved || 0).toLocaleString()}원
                </p>
                <button 
                  onClick={checkWeeklySavings}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#4caf50', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '5px',
                    marginRight: '10px'
                  }}
                >
                  주간 절약 체크
                </button>
              </div>

              {/* 일일 절약 현황 */}
              <div style={{ marginBottom: '15px' }}>
                <h4>오늘 절약</h4>
                <p>일일 목표: {(savingStatus.dailyTarget || 0).toLocaleString()}원</p>
                <p>오늘 지출: {(savingStatus.todayExpenses || 0).toLocaleString()}원</p>
                <p style={{ 
                  color: (savingStatus.todaySaved || 0) >= 0 ? 'green' : 'red',
                  fontWeight: 'bold'
                }}>
                  {(savingStatus.todaySaved || 0) >= 0 ? '절약액' : '초과액'}: {Math.abs(savingStatus.todaySaved || 0).toLocaleString()}원
                </p>
                <button 
                  onClick={checkDailySavings}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#ff9800', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '5px'
                  }}
                >
                  일일 절약 체크
                </button>
              </div>

              {/* 현재 미션 */}
              {savingStatus.missionProgress && savingStatus.missionProgress.description && (
                <div style={{ 
                  backgroundColor: 'rgba(255,255,255,0.7)', 
                  padding: '15px', 
                  borderRadius: '8px',
                  marginTop: '15px'
                }}>
                  <h4>🎯 현재 미션</h4>
                  <p><strong>{savingStatus.missionProgress.description}</strong></p>
                  <div style={{ 
                    backgroundColor: '#e0e0e0', 
                    height: '20px', 
                    borderRadius: '10px', 
                    overflow: 'hidden',
                    marginBottom: '10px'
                  }}>
                    <div style={{
                      backgroundColor: savingStatus.missionProgress.completed ? '#4caf50' : '#2196f3',
                      height: '100%',
                      width: `${Math.min(((savingStatus.missionProgress.current || 0) / (savingStatus.missionProgress.target || 1)) * 100, 100)}%`,
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                  <p>
                    진행률: {(savingStatus.missionProgress.current || 0).toLocaleString()}원 / {(savingStatus.missionProgress.target || 0).toLocaleString()}원
                    {savingStatus.missionProgress.completed && <span style={{ color: 'green', fontWeight: 'bold' }}> ✅ 완료!</span>}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 캐릭터 정보 */}
          {character && (
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '30px', 
              marginBottom: '20px', 
              borderRadius: '15px',
              textAlign: 'center',
              border: '2px solid #e9ecef'
            }}>
              <h2 style={{ marginBottom: '15px' }}>🎮 내 캐릭터</h2>
              
              <div style={{ fontSize: '4rem', marginBottom: '10px' }}>
                {getStageEmoji(character.stage)}
              </div>
              
              <h3 style={{ margin: '10px 0', color: '#495057' }}>
                {character.name} (Lv.{character.level || 1})
              </h3>
              
              <div style={{ 
                backgroundColor: 'white', 
                padding: '15px', 
                borderRadius: '10px',
                margin: '15px 0'
              }}>
                <p style={{ margin: '5px 0', fontSize: '1.1rem' }}>
                  <strong>현재 단계:</strong> {getStageKorean(character.stage)}
                </p>
                <p style={{ margin: '5px 0', fontSize: '1.1rem' }}>
                  <strong>경험치:</strong> {(character.experience || 0).toLocaleString()} / {getNextStageExp(character.stage).toLocaleString()}
                </p>
              </div>
              
              {/* 경험치 프로그레스 바 */}
              <div style={{ 
                backgroundColor: '#e9ecef', 
                height: '20px', 
                borderRadius: '10px', 
                overflow: 'hidden',
                margin: '10px 0'
              }}>
                <div style={{
                  backgroundColor: character.stage === 'BILLIONAIRE' ? '#28a745' : '#007bff',
                  height: '100%',
                  width: `${Math.min(((character.experience || 0) / getNextStageExp(character.stage)) * 100, 100)}%`,
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
              
              <p style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                💡 절약을 달성하고 미션을 완료하면 캐릭터가 진화해요!
              </p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <button 
              onClick={() => setShowAnalytics(true)}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#9c27b0', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              📊 절약 분석 보기
            </button>
          </div>

          {/* 거래 입력 */}
          <form onSubmit={addTransaction} style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="내역 설명 (커피, 간식, 배달음식 등)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                style={{ padding: '10px', flex: '2', minWidth: '200px' }}
              />
              <input
                type="number"
                placeholder="금액"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{ padding: '10px', flex: '1', minWidth: '100px' }}
              />
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                style={{ padding: '10px' }}
              >
                <option value="expense">지출</option>
                <option value="income">수입</option>
              </select>
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '5px' }}>
                추가
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
              💡 미션 달성을 위해 거래 설명에 '커피', '간식', '배달' 등의 키워드를 포함해주세요!
            </p>
          </form>

          {/* 달력 */}
          <div style={{ backgroundColor: '#fff3e0', padding: '20px', marginBottom: '20px', borderRadius: '10px' }}>
            <h3>월별 지출 달력</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                style={{ padding: '10px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '5px' }}
              >
                이전 달
              </button>
              <h4>{currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월</h4>
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                style={{ padding: '10px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '5px' }}
              >
                다음 달
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: '#ddd' }}>
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} style={{ padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'center', fontWeight: 'bold' }}>
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
                    style={{
                      padding: '8px',
                      backgroundColor: isSelected ? '#2196f3' : isCurrentMonth ? 'white' : '#f0f0f0',
                      color: isSelected ? 'white' : isCurrentMonth ? 'black' : '#999',
                      cursor: 'pointer',
                      textAlign: 'center',
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{date.getDate()}</div>
                    {dayExpenses > 0 && (
                      <div style={{ fontSize: '10px', color: isSelected ? 'white' : 'red', marginBottom: '2px' }}>
                        -{dayExpenses.toLocaleString()}원
                      </div>
                    )}
                    {dayTransactions.slice(0, 2).map((transaction, idx) => (
                      <div key={idx} style={{ 
                        fontSize: '9px', 
                        color: isSelected ? 'white' : '#666',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap'
                      }}>
                        {transaction.description}
                      </div>
                    ))}
                    {dayTransactions.length > 2 && (
                      <div style={{ fontSize: '8px', color: isSelected ? 'white' : '#999' }}>
                        +{dayTransactions.length - 2}개
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Analytics isVisible={showAnalytics} onClose={() => setShowAnalytics(false)} />

          {/* 선택된 날짜의 거래 내역 */}
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', marginBottom: '20px', borderRadius: '10px' }}>
            <h3>{selectedDate} 거래 내역</h3>
            {dailyTransactions.length > 0 ? (
              <>
                {dailyTransactions.map(transaction => (
                  <div key={transaction.id} style={{
                    padding: '10px',
                    margin: '5px 0',
                    backgroundColor: transaction.type === 'income' ? '#e8f5e8' : '#ffe8e8',
                    borderRadius: '5px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{transaction.description}</span>
                    <div>
                      <span style={{ color: transaction.type === 'income' ? 'green' : 'red', marginRight: '10px' }}>
                        {transaction.type === 'income' ? '+' : '-'}{(transaction.amount || 0).toLocaleString()}원
                      </span>
                      <button 
                        onClick={() => deleteTransaction(transaction.id!)}
                        style={{ 
                          padding: '3px 8px', 
                          backgroundColor: '#f44336', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '3px',
                          fontSize: '12px'
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
                <p style={{ marginTop: '10px', fontWeight: 'bold' }}>
                  일일 지출 합계: {dailyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}원
                </p>
              </>
            ) : (
              <p>해당 날짜에 거래 내역이 없습니다.</p>
            )}
          </div>

          {/* 최근 거래 내역 */}
          <h3>최근 거래 내역</h3>
          <div>
            {transactions.slice(0, 5).map(transaction => (
              <div key={transaction.id} style={{
                padding: '15px',
                margin: '10px 0',
                backgroundColor: transaction.type === 'income' ? '#e8f5e8' : '#ffe8e8',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong>{transaction.description}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>
                    {transaction.createdAt && new Date(transaction.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ 
  color: transaction.type === 'income' ? 'green' : 'red',
  fontWeight: 'bold'
}}>
  {transaction.type === 'income' ? '+' : '-'}{(transaction.amount || 0).toLocaleString()}원
</span>
<button 
  onClick={() => deleteTransaction(transaction.id!)}
  style={{ 
    padding: '5px 10px', 
    backgroundColor: '#f44336', 
    color: 'white', 
    border: 'none', 
    borderRadius: '3px',
    cursor: 'pointer'
  }}
>
  삭제
</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;