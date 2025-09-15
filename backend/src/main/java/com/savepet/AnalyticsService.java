package com.savepet;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {
    
    @Autowired
    private TransactionRepository transactionRepository;
    
    public WeeklyAnalysis getWeeklyAnalysis() {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusWeeks(4);
        
        List<Transaction> transactions = transactionRepository.findByOrderByCreatedAtDesc()
            .stream()
            .filter(t -> {
                LocalDate transDate = t.getCreatedAt().toLocalDate();
                return !transDate.isBefore(startDate) && !transDate.isAfter(endDate);
            })
            .collect(Collectors.toList());
        
        Map<String, BigDecimal> weeklyData = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/dd");
        
        for (int i = 0; i < 4; i++) {
            LocalDate weekStart = endDate.minusWeeks(3 - i).with(java.time.DayOfWeek.MONDAY);
            LocalDate weekEnd = weekStart.plusDays(6);
            
            BigDecimal weekExpenses = transactions.stream()
                .filter(t -> "expense".equals(t.getType()))
                .filter(t -> {
                    LocalDate transDate = t.getCreatedAt().toLocalDate();
                    return !transDate.isBefore(weekStart) && !transDate.isAfter(weekEnd);
                })
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            weeklyData.put(weekStart.format(formatter) + "~" + weekEnd.format(formatter), weekExpenses);
        }
        
        return new WeeklyAnalysis(weeklyData);
    }
    
    public CategoryAnalysis getCategoryAnalysis() {
        LocalDate startDate = LocalDate.now().minusWeeks(4);
        
        List<Transaction> expenses = transactionRepository.findByOrderByCreatedAtDesc()
            .stream()
            .filter(t -> "expense".equals(t.getType()))
            .filter(t -> !t.getCreatedAt().toLocalDate().isBefore(startDate))
            .collect(Collectors.toList());
        
        Map<String, BigDecimal> categoryData = new HashMap<>();
        categoryData.put("커피/카페", BigDecimal.ZERO);
        categoryData.put("간식", BigDecimal.ZERO);
        categoryData.put("배달음식", BigDecimal.ZERO);
        categoryData.put("쇼핑", BigDecimal.ZERO);
        categoryData.put("교통", BigDecimal.ZERO);
        categoryData.put("기타", BigDecimal.ZERO);
        
        for (Transaction transaction : expenses) {
            String category = categorizeTransaction(transaction.getDescription());
            categoryData.put(category, categoryData.get(category).add(transaction.getAmount()));
        }
        
        return new CategoryAnalysis(categoryData);
    }
    
    public SavingTrend getSavingTrend() {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusWeeks(8);
        
        List<Transaction> transactions = transactionRepository.findByOrderByCreatedAtDesc()
            .stream()
            .filter(t -> {
                LocalDate transDate = t.getCreatedAt().toLocalDate();
                return !transDate.isBefore(startDate) && !transDate.isAfter(endDate);
            })
            .collect(Collectors.toList());
        
        Map<String, BigDecimal> weeklyExpenses = new LinkedHashMap<>();
        BigDecimal averageTarget = BigDecimal.valueOf(100000); // 기본 목표
        
        for (int i = 0; i < 8; i++) {
            LocalDate weekStart = endDate.minusWeeks(7 - i).with(java.time.DayOfWeek.MONDAY);
            LocalDate weekEnd = weekStart.plusDays(6);
            
            BigDecimal weekExpense = transactions.stream()
                .filter(t -> "expense".equals(t.getType()))
                .filter(t -> {
                    LocalDate transDate = t.getCreatedAt().toLocalDate();
                    return !transDate.isBefore(weekStart) && !transDate.isAfter(weekEnd);
                })
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            weeklyExpenses.put(weekStart.format(DateTimeFormatter.ofPattern("MM/dd")), weekExpense);
        }
        
        // 절약 트렌드 계산
        List<BigDecimal> expenseList = new ArrayList<>(weeklyExpenses.values());
        boolean isImproving = false;
        
        if (expenseList.size() >= 4) {
            BigDecimal recentAvg = expenseList.subList(expenseList.size() - 2, expenseList.size())
                .stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(2));
            BigDecimal pastAvg = expenseList.subList(0, 2)
                .stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(2));
            
            isImproving = recentAvg.compareTo(pastAvg) < 0;
        }
        
        return new SavingTrend(weeklyExpenses, isImproving, averageTarget);
    }
    
    private String categorizeTransaction(String description) {
        String desc = description.toLowerCase();
        
        if (desc.contains("커피") || desc.contains("카페") || desc.contains("스타벅스")) {
            return "커피/카페";
        } else if (desc.contains("간식") || desc.contains("과자") || desc.contains("디저트")) {
            return "간식";
        } else if (desc.contains("배달") || desc.contains("주문") || desc.contains("치킨") || desc.contains("피자")) {
            return "배달음식";
        } else if (desc.contains("쇼핑") || desc.contains("옷") || desc.contains("신발") || desc.contains("화장품")) {
            return "쇼핑";
        } else if (desc.contains("버스") || desc.contains("지하철") || desc.contains("택시") || desc.contains("교통")) {
            return "교통";
        } else {
            return "기타";
        }
    }
    
    public static class WeeklyAnalysis {
        private Map<String, BigDecimal> weeklyExpenses;
        
        public WeeklyAnalysis(Map<String, BigDecimal> weeklyExpenses) {
            this.weeklyExpenses = weeklyExpenses;
        }
        
        public Map<String, BigDecimal> getWeeklyExpenses() { return weeklyExpenses; }
    }
    
    public static class CategoryAnalysis {
        private Map<String, BigDecimal> categoryExpenses;
        
        public CategoryAnalysis(Map<String, BigDecimal> categoryExpenses) {
            this.categoryExpenses = categoryExpenses;
        }
        
        public Map<String, BigDecimal> getCategoryExpenses() { return categoryExpenses; }
    }
    
    public static class SavingTrend {
        private Map<String, BigDecimal> weeklyExpenses;
        private Boolean improving;
        private BigDecimal averageTarget;
        
        public SavingTrend(Map<String, BigDecimal> weeklyExpenses, Boolean improving, BigDecimal averageTarget) {
            this.weeklyExpenses = weeklyExpenses;
            this.improving = improving;
            this.averageTarget = averageTarget;
        }
        
        public Map<String, BigDecimal> getWeeklyExpenses() { return weeklyExpenses; }
        public Boolean getImproving() { return improving; }
        public BigDecimal getAverageTarget() { return averageTarget; }
    }
}