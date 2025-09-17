package com.savepet;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/character")
@CrossOrigin(origins = "http://localhost:3000")
public class CharacterController {

    @Autowired
    private BudgetRepository budgetRepository;
    
    @Autowired
    private TransactionRepository transactionRepository;
    
    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private CharacterService characterService;

    @GetMapping
    public Character getCharacter() {
        return characterService.getOrCreateCharacter();
    }

    @GetMapping("/saving-status")
    public Map<String, Object> getSavingStatus() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // 예산 조회
            Budget budget = budgetRepository.findById(1L).orElse(null);
            BigDecimal weeklyTarget = (budget != null) ? budget.getTargetAmount() : BigDecimal.valueOf(100000);
            
            // 주간 지출 계산
            LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);
            LocalDate weekEnd = weekStart.plusDays(6);
            
            List<Transaction> allTransactions = transactionRepository.findByOrderByCreatedAtDesc();
            
            BigDecimal weeklyExpenses = allTransactions.stream()
                .filter(t -> "expense".equals(t.getType()))
                .filter(t -> {
                    LocalDate transDate = t.getCreatedAt().toLocalDate();
                    return !transDate.isBefore(weekStart) && !transDate.isAfter(weekEnd);
                })
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            BigDecimal weeklySaved = weeklyTarget.subtract(weeklyExpenses);
            
            // 일일 계산
            BigDecimal dailyTarget = weeklyTarget.divide(BigDecimal.valueOf(7), 2, RoundingMode.HALF_UP);
            
            LocalDate today = LocalDate.now();
            BigDecimal todayExpenses = allTransactions.stream()
                .filter(t -> "expense".equals(t.getType()))
                .filter(t -> t.getCreatedAt().toLocalDate().equals(today))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            BigDecimal todaySaved = dailyTarget.subtract(todayExpenses);
            
            // 커피 관련 지출
            BigDecimal coffeeExpenses = allTransactions.stream()
                .filter(t -> "expense".equals(t.getType()))
                .filter(t -> !t.getCreatedAt().toLocalDate().isBefore(weekStart))
                .filter(t -> {
                    String desc = t.getDescription().toLowerCase();
                    return desc.contains("커피") || desc.contains("카페") || desc.contains("스타벅스");
                })
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            BigDecimal coffeeTarget = weeklyTarget.multiply(BigDecimal.valueOf(0.15));
            BigDecimal coffeeSavings = coffeeTarget.subtract(coffeeExpenses);
            if (coffeeSavings.compareTo(BigDecimal.ZERO) < 0) {
                coffeeSavings = BigDecimal.ZERO;
            }
            
            // 결과 구성
            result.put("weeklyTarget", weeklyTarget);
            result.put("weeklyExpenses", weeklyExpenses);
            result.put("weeklySaved", weeklySaved);
            result.put("dailyTarget", dailyTarget);
            result.put("todayExpenses", todayExpenses);
            result.put("todaySaved", todaySaved);
            
            Map<String, Object> missionProgress = new HashMap<>();
            missionProgress.put("description", "커피값 절약하기");
            missionProgress.put("type", "COFFEE");
            missionProgress.put("target", BigDecimal.valueOf(50000));
            missionProgress.put("current", coffeeSavings);
            missionProgress.put("completed", false);
            
            result.put("missionProgress", missionProgress);
            
            // 디버그 로그
            System.out.println("=== Saving Status Debug ===");
            System.out.println("예산: " + weeklyTarget);
            System.out.println("주간 지출: " + weeklyExpenses);
            System.out.println("주간 절약: " + weeklySaved);
            System.out.println("오늘 지출: " + todayExpenses);
            System.out.println("오늘 절약: " + todaySaved);
            System.out.println("커피 지출: " + coffeeExpenses);
            System.out.println("==========================");
            
        } catch (Exception e) {
            System.err.println("SavingStatus 계산 오류: " + e.getMessage());
            e.printStackTrace();
            
            // 기본값
            result.put("weeklyTarget", BigDecimal.valueOf(100000));
            result.put("weeklyExpenses", BigDecimal.ZERO);
            result.put("weeklySaved", BigDecimal.valueOf(100000));
            result.put("dailyTarget", BigDecimal.valueOf(14285));
            result.put("todayExpenses", BigDecimal.ZERO);
            result.put("todaySaved", BigDecimal.valueOf(14285));
            
            Map<String, Object> missionProgress = new HashMap<>();
            missionProgress.put("description", "미션 로딩 실패");
            missionProgress.put("type", "COFFEE");
            missionProgress.put("target", BigDecimal.valueOf(50000));
            missionProgress.put("current", BigDecimal.ZERO);
            missionProgress.put("completed", false);
            
            result.put("missionProgress", missionProgress);
        }
        
        return result;
    }

    @GetMapping("/budget")
    public Budget getCurrentBudget() {
        return budgetRepository.findById(1L).orElse(new Budget());
    }

    @PostMapping("/budget")
    public Budget setBudget(@RequestParam BigDecimal amount) {
        Budget budget = budgetRepository.findById(1L).orElse(new Budget());
        budget.setTargetAmount(amount);
        Budget saved = budgetRepository.save(budget);
        System.out.println("예산 설정됨: " + amount);
        return saved;
    }

    @PostMapping("/add-experience")
    public Character addSavingExperience(@RequestParam Integer amount) {
        return characterService.addSavingExperience(BigDecimal.valueOf(amount));
    }

    @DeleteMapping("/reset")
    public String resetCharacter() {
        characterRepository.deleteAll();
        return "캐릭터가 초기화되었습니다.";
    }

    @PostMapping("/check-saving")
    public Character checkSaving() {
        return characterService.checkSavingAchievement();
    }

    @PostMapping("/check-weekly-savings")
    public Character checkWeeklySavings() {
        System.out.println("=== 주간 절약 체크 시작 ===");
        Character result = characterService.checkWeeklySavings();
        System.out.println("=== 주간 절약 체크 완료 ===");
        return result;
    }
    
    @PostMapping("/check-daily-savings")
    public Character checkDailySavings() {
        System.out.println("=== 일일 절약 체크 시작 ===");
        Character result = characterService.checkDailySavings();
        System.out.println("=== 일일 절약 체크 완료 ===");
        return result;
    }
}