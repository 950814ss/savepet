import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface WeeklyAnalysis {
  weeklyExpenses: Record<string, number>;
}

interface CategoryAnalysis {
  categoryExpenses: Record<string, number>;
}

interface SavingTrend {
  weeklyExpenses: Record<string, number>;
  improving: boolean;
  averageTarget: number;
}

interface AnalyticsProps {
  isVisible: boolean;
  onClose: () => void;
}

const Analytics: React.FC<AnalyticsProps> = ({ isVisible, onClose }) => {
  const [weeklyData, setWeeklyData] = useState<WeeklyAnalysis | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryAnalysis | null>(null);
  const [trendData, setTrendData] = useState<SavingTrend | null>(null);

  useEffect(() => {
    if (isVisible) {
      fetchAnalytics();
    }
  }, [isVisible]);

  const fetchAnalytics = async () => {
    try {
      const [weeklyRes, categoryRes, trendRes] = await Promise.all([
        fetch('http://localhost:8080/api/analytics/weekly'),
        fetch('http://localhost:8080/api/analytics/category'),
        fetch('http://localhost:8080/api/analytics/trend')
      ]);

      setWeeklyData(await weeklyRes.json());
      setCategoryData(await categoryRes.json());
      setTrendData(await trendRes.json());
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  if (!isVisible) return null;

  const weeklyChartData = weeklyData ? {
    labels: Object.keys(weeklyData.weeklyExpenses),
    datasets: [
      {
        label: '주간 지출액',
        data: Object.values(weeklyData.weeklyExpenses),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  } : null;

  const categoryChartData = categoryData ? {
    labels: Object.keys(categoryData.categoryExpenses),
    datasets: [
      {
        data: Object.values(categoryData.categoryExpenses),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
        ],
        hoverBackgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
        ],
      },
    ],
  } : null;

  const trendChartData = trendData ? {
    labels: Object.keys(trendData.weeklyExpenses),
    datasets: [
      {
        label: '실제 지출',
        data: Object.values(trendData.weeklyExpenses),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
      },
      {
        label: '목표 지출',
        data: Array(Object.keys(trendData.weeklyExpenses).length).fill(trendData.averageTarget),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderDash: [5, 5],
        tension: 0.1,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '15px',
        width: '90%',
        maxWidth: '1000px',
        maxHeight: '90%',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>📊 절약 분석 리포트</h2>
          <button 
            onClick={onClose}
            style={{ 
              padding: '10px 15px', 
              backgroundColor: '#f44336', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            닫기
          </button>
        </div>

        {trendData && (
          <div style={{ 
            backgroundColor: trendData.improving ? '#e8f5e8' : '#ffe8e8', 
            padding: '15px', 
            borderRadius: '10px', 
            marginBottom: '20px' 
          }}>
            <h3>절약 트렌드</h3>
            <p style={{ 
              color: trendData.improving ? 'green' : 'red',
              fontWeight: 'bold'
            }}>
              {trendData.improving ? '📈 절약이 개선되고 있어요!' : '📉 지출이 증가하고 있어요. 더 노력해보세요!'}
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          {/* 주간 지출 차트 */}
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '10px' }}>
            <h3>주간 지출 현황</h3>
            {weeklyChartData && <Bar data={weeklyChartData} options={chartOptions} />}
          </div>

          {/* 카테고리별 지출 차트 */}
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '10px' }}>
            <h3>카테고리별 지출</h3>
            {categoryChartData && <Doughnut data={categoryChartData} options={chartOptions} />}
          </div>

          {/* 절약 트렌드 차트 */}
          <div style={{ 
            backgroundColor: '#f9f9f9', 
            padding: '20px', 
            borderRadius: '10px',
            gridColumn: 'span 2'
          }}>
            <h3>8주간 절약 트렌드</h3>
            {trendChartData && <Line data={trendChartData} options={chartOptions} />}
          </div>
        </div>

        {/* 절약 팁 */}
        <div style={{ 
          backgroundColor: '#fff3e0', 
          padding: '20px', 
          borderRadius: '10px', 
          marginTop: '20px' 
        }}>
          <h3>💡 절약 팁</h3>
          <ul>
            <li>가장 많이 지출하는 카테고리를 확인하고 해당 분야의 지출을 줄여보세요</li>
            <li>주간 지출 패턴을 분석해서 지출이 많은 요일을 파악해보세요</li>
            <li>목표선과 실제 지출을 비교해서 절약 목표를 조정해보세요</li>
            <li>절약 트렌드가 개선되고 있다면 현재 방법을 지속하세요!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Analytics;