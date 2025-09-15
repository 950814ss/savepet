package com.savepet;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.util.List;

@Service
public class CharacterService {

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private BudgetRepository budgetRepository;
    
    @Autowired
    private MissionService missionService;

    public Character getOrCreateCharacter() {
        Character character = characterRepository.findTopByOrderByCreatedAtDesc();
        if (character == null) {
            character = new Character("머니펫");
            character = characterRepository.save(character);
            missionService.initializeMissions(); // 미션 초기화
        }
        return character;
    }

    public Character checkWeeklySavings() {
        Character character = getOrCreateCharacter();
        Budget currentBudget = getCurrentWeekBudget();
        
        if (currentBudget == null) {
            return character;
        }

        BigDecimal weeklyExpenses = calculateWeeklyExpenses();
        BigDecimal savedAmount = currentBudget.getTargetAmount().subtract(weeklyExpenses);

        if (savedAmount.compareTo(BigDecimal.ZERO) > 0) {
            // 경험치 추가
            int expToAdd = savedAmount.intValue() / 1000;
            character.addExperience(expToAdd);
            
            // 미션 완료 체크
            checkAndCompleteMissions(character, savedAmount);
            
            // 진화 가능성 체크
            checkEvolution(character);
            
            return characterRepository.save(character);
        }

        return character;
    }
    
    private void checkAndCompleteMissions(Character character, BigDecimal savedAmount) {
        try {
            String currentStage = character.getStage();
            List<Mission> missions = missionService.getCurrentMissions(currentStage);
            
            for (Mission mission : missions) {
                if (!mission.getCompleted()) {
                    missionService.checkMissionCompletion(currentStage, mission.getMissionType(), savedAmount);
                }
            }
        } catch (Exception e) {
            // 미션 관련 오류가 발생해도 전체 프로세스는 계속 진행
            System.err.println("미션 체크 중 오류 발생: " + e.getMessage());
        }
    }
    
    private void checkEvolution(Character character) {
        try {
            int completedMissions = missionService.getCompletedMissionCount();
            
            if (character.canEvolve(completedMissions)) {
                character.evolve();
            }
        } catch (Exception e) {
            // 진화 체크 오류가 발생해도 전체 프로세스는 계속 진행
            System.err.println("진화 체크 중 오류 발생: " + e.getMessage());
        }
    }

    public Character checkDailySavings() {
        Character character = getOrCreateCharacter();
        Budget currentBudget = getCurrentWeekBudget();
        
        if (currentBudget == null) {
            return character;
        }

        BigDecimal dailyTarget = currentBudget.getTargetAmount().divide(BigDecimal.valueOf(7));
        BigDecimal todayExpenses = calculateTodayExpenses();
        BigDecimal dailySaved = dailyTarget.subtract(todayExpenses);

        if (dailySaved.compareTo(BigDecimal.ZERO) > 0) {
            int expToAdd = Math.max(1, dailySaved.intValue() / 5000);
            character.addExperience(expToAdd);
            
            checkEvolution(character);
            
            return characterRepository.save(character);
        }

        return character;
    }

    private BigDecimal calculateWeeklyExpenses() {
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        LocalDate weekEnd = weekStart.plusDays(6);
        
        List<Transaction> transactions = transactionRepository.findByOrderByCreatedAtDesc();
        
        return transactions.stream()
            .filter(t -> "expense".equals(t.getType()))
            .filter(t -> {
                LocalDate transactionDate = t.getCreatedAt().toLocalDate();
                return !transactionDate.isBefore(weekStart) && !transactionDate.isAfter(weekEnd);
            })
            .map(Transaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateTodayExpenses() {
        LocalDate today = LocalDate.now();
        
        List<Transaction> transactions = transactionRepository.findByOrderByCreatedAtDesc();
        
        return transactions.stream()
            .filter(t -> "expense".equals(t.getType()))
            .filter(t -> t.getCreatedAt().toLocalDate().equals(today))
            .map(Transaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Budget getCurrentWeekBudget() {
        return budgetRepository.findById(1L).orElse(new Budget());
    }

    public String getStageDescription(String stage) {
        switch (stage) {
            case "EGG": return "🥚 알";
            case "BABY": return "🐣 새끼";
            case "ADULT": return "🦆 성체";
            case "RICH": return "💎 부자";
            case "BILLIONAIRE": return "👑 재벌";
            default: return "🥚 알";
        }
    }

    public String resetCharacterData() {
        long count = characterRepository.count();
        characterRepository.deleteAll();
        return String.format("캐릭터 %d개가 초기화되었습니다.", count);
    }

    public SavingStatus getCurrentSavingStatus() {
        try {
            Budget budget = getCurrentWeekBudget();
            BigDecimal weeklyExpenses = calculateWeeklyExpenses();
            BigDecimal savedAmount = budget.getTargetAmount().subtract(weeklyExpenses);
            
            BigDecimal dailyTarget = budget.getTargetAmount().divide(BigDecimal.valueOf(7));
            BigDecimal todayExpenses = calculateTodayExpenses();
            BigDecimal todaySaved = dailyTarget.subtract(todayExpenses);

            Character character = getOrCreateCharacter();
            
            // 미션 진행 상황을 안전하게 가져오기
            MissionService.MissionProgress missionProgress = null;
            try {
                missionProgress = missionService.getMissionProgress(character.getStage());
            } catch (Exception e) {
                System.err.println("미션 진행 상황 조회 중 오류 발생: " + e.getMessage());
                // 기본 미션 진행 상황 생성
                missionProgress = new MissionService.MissionProgress(
                    "미션 로딩 중...", 
                    "", 
                    BigDecimal.ZERO, 
                    BigDecimal.ZERO, 
                    false
                );
            }

            return new SavingStatus(
                budget.getTargetAmount(), 
                weeklyExpenses, 
                savedAmount, 
                dailyTarget, 
                todayExpenses, 
                todaySaved, 
                missionProgress
            );
        } catch (Exception e) {
            System.err.println("SavingStatus 조회 중 오류 발생: " + e.getMessage());
            e.printStackTrace();
            
            // 기본값으로 SavingStatus 반환
            Budget defaultBudget = new Budget();
            MissionService.MissionProgress defaultMission = new MissionService.MissionProgress(
                "기본 미션", 
                "", 
                BigDecimal.valueOf(50000), 
                BigDecimal.ZERO, 
                false
            );
            
            return new SavingStatus(
                defaultBudget.getTargetAmount(),
                BigDecimal.ZERO,
                defaultBudget.getTargetAmount(),
                defaultBudget.getTargetAmount().divide(BigDecimal.valueOf(7)),
                BigDecimal.ZERO,
                defaultBudget.getTargetAmount().divide(BigDecimal.valueOf(7)),
                defaultMission
            );
        }
    }

    public Character addSavingExperience(BigDecimal amount) {
        Character character = getOrCreateCharacter();
        
        // 절약 금액에 따른 경험치 계산 (1000원당 1경험치)
        int expToAdd = amount.intValue() / 1000;
        character.addExperience(expToAdd);
        
        // 진화 가능성 체크
        checkEvolution(character);
        
        return characterRepository.save(character);
    }

    public Character checkSavingAchievement() {
        Character character = getOrCreateCharacter();
        Budget currentBudget = getCurrentWeekBudget();
        
        if (currentBudget == null) {
            return character;
        }

        // 주간 절약 목표 달성 체크
        BigDecimal weeklyExpenses = calculateWeeklyExpenses();
        BigDecimal savedAmount = currentBudget.getTargetAmount().subtract(weeklyExpenses);

        if (savedAmount.compareTo(BigDecimal.ZERO) > 0) {
            // 목표 달성시 보너스 경험치
            int bonusExp = savedAmount.intValue() / 5000; // 5000원당 1경험치
            character.addExperience(bonusExp);
            
            // 미션 완료 체크
            checkAndCompleteMissions(character, savedAmount);
            
            // 진화 가능성 체크
            checkEvolution(character);
            
            return characterRepository.save(character);
        }

        return character;
    }

    public static class SavingStatus {
        private BigDecimal weeklyTarget;
        private BigDecimal weeklyExpenses;
        private BigDecimal weeklySaved;
        private BigDecimal dailyTarget;
        private BigDecimal todayExpenses;
        private BigDecimal todaySaved;
        private MissionService.MissionProgress missionProgress;

        public SavingStatus(BigDecimal weeklyTarget, BigDecimal weeklyExpenses, BigDecimal weeklySaved,
                           BigDecimal dailyTarget, BigDecimal todayExpenses, BigDecimal todaySaved,
                           MissionService.MissionProgress missionProgress) {
            this.weeklyTarget = weeklyTarget;
            this.weeklyExpenses = weeklyExpenses;
            this.weeklySaved = weeklySaved;
            this.dailyTarget = dailyTarget;
            this.todayExpenses = todayExpenses;
            this.todaySaved = todaySaved;
            this.missionProgress = missionProgress;
        }

        public BigDecimal getWeeklyTarget() { return weeklyTarget; }
        public BigDecimal getWeeklyExpenses() { return weeklyExpenses; }
        public BigDecimal getWeeklySaved() { return weeklySaved; }
        public BigDecimal getDailyTarget() { return dailyTarget; }
        public BigDecimal getTodayExpenses() { return todayExpenses; }
        public BigDecimal getTodaySaved() { return todaySaved; }
        public MissionService.MissionProgress getMissionProgress() { return missionProgress; }
    }
}