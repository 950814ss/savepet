import React, { useState, useEffect } from 'react';
import './App.css';

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

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [character, setCharacter] = useState<Character | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyTransactions, setDailyTransactions] = useState<Transaction[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchData = async () => {
    try {
      const [transactionsRes, characterRes, budgetRes] = await Promise.all([
        fetch('http://localhost:8080/api/transactions'),
        fetch('http://localhost:8080/api/character'),
        fetch('http://localhost:8080/api/character/budget')
      ]);

      setTransactions(await transactionsRes.json());
      setCharacter(await characterRes.json());
      setBudget(await budgetRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const fetchDailyTransactions = async (date: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/transactions/daily/${date}`);
      setDailyTransactions(await response.json());
    } catch (error) {
      console.error('Failed to fetch daily transactions:', error);
    }
  };

  const addTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await fetch('http://localhost:8080/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amount: parseFloat(amount),
          type
        }),
      });

      setDescription('');
      setAmount('');
      fetchData();
      fetchDailyTransactions(selectedDate);
    } catch (error) {
      console.error('Failed to add transaction:', error);
    }
  };

  const setBudgetGoal = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await fetch(`http://localhost:8080/api/character/budget?amount=${budgetAmount}`, {
        method: 'POST'
      });

      setBudgetAmount('');
      fetchData();
      alert('예산이 설정되었습니다!');
    } catch (error) {
      console.error('Failed to set budget:', error);
    }
  };

  const deleteTransaction = async (id: number) => {
    if (window.confirm('이 거래를 삭제하시겠습니까?')) {
      try {
        await fetch(`http://localhost:8080/api/transactions/${id}`, {
          method: 'DELETE'
        });
        fetchData();
        fetchDailyTransactions(selectedDate);
      } catch (error) {
        console.error('Failed to delete transaction:', error);
      }
    }
  };

  const getCurrentWeekExpenses = () => {
    if (!budget) return 0;

    const startDate = new Date(budget.startDate);
    const endDate = new Date(budget.endDate);

    return transactions
      .filter(t => t.type === 'expense')
      .filter(t => {
        const transactionDate = new Date(t.createdAt!);
        return transactionDate >= startDate && transactionDate <= endDate;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
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
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchDailyTransactions(selectedDate);
    }
  }, [selectedDate]);

  const weeklyExpenses = getCurrentWeekExpenses();
  const savedAmount = budget ? budget.targetAmount - weeklyExpenses : 0;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>💰 SavePet 절약 가계부</h1>

      {/* 주간 예산 설정 */}
      <div style={{ backgroundColor: '#e3f2fd', padding: '20px', marginBottom: '20px', borderRadius: '10px' }}>
        <h3>주간 예산 설정</h3>
        {budget && (
          <p>현재 예산: {budget.targetAmount.toLocaleString()}원</p>
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

      {/* 이번 주 절약 현황 */}
      {budget && (
        <div style={{
          backgroundColor: savedAmount >= 0 ? '#e8f5e8' : '#ffe8e8',
          padding: '20px',
          marginBottom: '20px',
          borderRadius: '10px'
        }}>
          <h3>이번 주 절약 현황</h3>
          <p>목표 지출: {budget.targetAmount.toLocaleString()}원</p>
          <p>실제 지출: {weeklyExpenses.toLocaleString()}원</p>
          <p style={{
            color: savedAmount >= 0 ? 'green' : 'red',
            fontWeight: 'bold',
            fontSize: '1.2rem'
          }}>
            {savedAmount >= 0 ? '절약액' : '초과액'}: {Math.abs(savedAmount).toLocaleString()}원
          </p>
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
            {character.name} (Lv.{character.level})
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
              <strong>경험치:</strong> {character.experience.toLocaleString()} / {getNextStageExp(character.stage).toLocaleString()}
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
              width: `${Math.min((character.experience / getNextStageExp(character.stage)) * 100, 100)}%`,
              transition: 'width 0.3s ease'
            }}></div>
          </div>
        </div>
      )}

      {/* 거래 입력 */}
      <form onSubmit={addTransaction} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="내역 설명"
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
      </form>

      {/* 달력 */}
      <div style={{ backgroundColor: '#fff3e0', padding: '20px', marginBottom: '20px', borderRadius: '10px' }}>
        <h3>월별 지출 달력</h3>

        {/* 월 네비게이션 */}
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

        {/* 달력 그리드 */}
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
                    {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toLocaleString()}원
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
              일일 지출 합계: {dailyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}원
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
                {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toLocaleString()}원
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
    </div>
  );
}

export default App;