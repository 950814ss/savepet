package com.savepet;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class MissionService {
    
    @Autowired
    private MissionRepository missionRepository;
    
    @Autowired
    private TransactionRepository transactionRepository;
    
    @Autowired
    private BudgetRepository budgetRepository;
    
    public void initializeMissions() {
        if (missionRepository.count() > 0) {
            return; // 이미 초기화됨
        }
        
        // 단계별 미션 생성
        missionRepository.save(new Mission("EGG", "COFFEE", "커피값 절약하기", BigDecimal.valueOf(50000)));
        missionRepository.save(new Mission("BABY", "SNACK", "간식비 절약하기", BigDecimal.valueOf(100000)));
        missionRepository.save(new Mission("ADULT", "DELIVERY", "배달음식비 절약하기", BigDecimal.valueOf(200000)));
        missionRepository.save(new Mission("RICH", "SHOPPING", "쇼핑비 절약하기", BigDecimal.valueOf(500000)));
        missionRepository.save(new Mission("BILLIONAIRE", "LUXURY", "사치품 절약하기", BigDecimal.valueOf(1000000)));
    }
    
    public List<Mission> getCurrentMissions(String characterStage) {
        return missionRepository.findByStageOrderByIdAsc(characterStage);
    }
    
    public Mission checkMissionCompletion(String stage, String missionType, BigDecimal savedAmount) {
        Mission mission = missionRepository.findByStageAndMissionType(stage, missionType);
        
        if (mission != null && !mission.getCompleted()) {
            // 실제 절약액을 계산하여 미션 완료 체크
            BigDecimal actualSavings = calculateActualSavings(missionType);
            
            if (actualSavings.compareTo(mission.getTargetAmount()) >= 0) {
                mission.setCompleted(true);
                mission.setCompletedAt(LocalDateTime.now());
                return missionRepository.save(mission);
            }
        }
        
        return mission;
    }
    
    public int getCompletedMissionCount() {
        return missionRepository.findByCompletedTrue().size();
    }
    
    public MissionProgress getMissionProgress(String characterStage) {
        try {
            List<Mission> missions = getCurrentMissions(characterStage);
            if (missions == null || missions.isEmpty()) {
                return new MissionProgress("미션을 준비 중입니다", "", BigDecimal.ZERO, BigDecimal.ZERO, false);
            }
            
            Mission currentMission = missions.get(0);
            if (currentMission == null) {
                return new MissionProgress("미션을 준비 중입니다", "", BigDecimal.ZERO, BigDecimal.ZERO, false);
            }
            
            BigDecimal currentSavings = BigDecimal.ZERO;
            try {
                currentSavings = calculateActualSavings(currentMission.getMissionType());
            } catch (Exception e) {
                System.err.println("절약액 계산 중 오류: " + e.getMessage());
            }
            
            return new MissionProgress(
                currentMission.getDescription() != null ? currentMission.getDescription() : "기본 미션",
                currentMission.getMissionType() != null ? currentMission.getMissionType() : "",
                currentMission.getTargetAmount() != null ? currentMission.getTargetAmount() : BigDecimal.ZERO,
                currentSavings,
                currentMission.getCompleted() != null ? currentMission.getCompleted() : false
            );
        } catch (Exception e) {
            System.err.println("MissionProgress 조회 중 오류: " + e.getMessage());
            return new MissionProgress("미션 로딩 실패", "", BigDecimal.ZERO, BigDecimal.ZERO, false);
        }
    }
    
    /**
     * 실제 절약액을 계산하는 메서드
     * 목표 예산 대비 해당 카테고리의 실제 지출 차이를 계산
     */
    private BigDecimal calculateActualSavings(String category) {
        LocalDate startDate = LocalDate.now().minusWeeks(4);
        
        // 현재 예산 정보 가져오기
        Budget currentBudget = budgetRepository.findById(1L).orElse(new Budget());
        
        // 전체 예산에서 해당 카테고리의 예상 비율 계산 (간단한 예시)
        BigDecimal categoryBudgetRatio = getCategoryBudgetRatio(category);
        BigDecimal categoryTargetAmount = currentBudget.getTargetAmount().multiply(categoryBudgetRatio);
        
        // 해당 카테고리의 실제 지출 계산
        BigDecimal actualExpenses = transactionRepository.findByOrderByCreatedAtDesc()
            .stream()
            .filter(t -> "expense".equals(t.getType()))
            .filter(t -> !t.getCreatedAt().toLocalDate().isBefore(startDate))
            .filter(t -> isMatchingCategory(t.getDescription(), category))
            .map(Transaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // 절약액 = 목표 지출 - 실제 지출 (양수면 절약, 음수면 초과)
        BigDecimal savings = categoryTargetAmount.subtract(actualExpenses);
        
        // 음수인 경우 0으로 반환 (절약하지 못한 경우)
        return savings.compareTo(BigDecimal.ZERO) > 0 ? savings : BigDecimal.ZERO;
    }
    
    /**
     * 카테고리별 예산 비율 반환
     * 실제 앱에서는 사용자가 설정하거나 통계 기반으로 계산할 수 있음
     */
    private BigDecimal getCategoryBudgetRatio(String category) {
        switch (category) {
            case "COFFEE": return BigDecimal.valueOf(0.15); // 15%
            case "SNACK": return BigDecimal.valueOf(0.10);  // 10%
            case "DELIVERY": return BigDecimal.valueOf(0.25); // 25%
            case "SHOPPING": return BigDecimal.valueOf(0.20); // 20%
            case "LUXURY": return BigDecimal.valueOf(0.05);   // 5%
            default: return BigDecimal.valueOf(0.10);         // 기본 10%
        }
    }
    
    private boolean isMatchingCategory(String description, String category) {
        String desc = description.toLowerCase();
        switch (category) {
            case "COFFEE": 
                return desc.contains("커피") || desc.contains("카페") || 
                       desc.contains("스타벅스") || desc.contains("아메리카노") ||
                       desc.contains("라떼") || desc.contains("coffee");
            case "SNACK": 
                return desc.contains("간식") || desc.contains("과자") || 
                       desc.contains("디저트") || desc.contains("아이스크림") ||
                       desc.contains("쿠키") || desc.contains("초콜릿");
            case "DELIVERY": 
                return desc.contains("배달") || desc.contains("주문") || 
                       desc.contains("치킨") || desc.contains("피자") ||
                       desc.contains("햄버거") || desc.contains("족발") ||
                       desc.contains("중국집") || desc.contains("배민") ||
                       desc.contains("요기요");
            case "SHOPPING": 
                return desc.contains("쇼핑") || desc.contains("옷") || 
                       desc.contains("신발") || desc.contains("화장품") ||
                       desc.contains("가방") || desc.contains("액세서리") ||
                       desc.contains("쿠팡") || desc.contains("11번가");
            case "LUXURY": 
                return desc.contains("명품") || desc.contains("럭셔리") ||
                       desc.contains("브랜드") || desc.contains("고급") ||
                       desc.contains("시계") || desc.contains("보석");
            default: 
                return false;
        }
    }
    
    /**
     * 특정 카테고리의 미션을 강제로 완료 처리하는 메서드 (테스트용)
     */
    public Mission completeMission(String stage, String missionType) {
        Mission mission = missionRepository.findByStageAndMissionType(stage, missionType);
        if (mission != null && !mission.getCompleted()) {
            mission.setCompleted(true);
            mission.setCompletedAt(LocalDateTime.now());
            return missionRepository.save(mission);
        }
        return mission;
    }
    
    /**
     * 모든 미션 진행 상황을 확인하는 메서드
     */
    public void checkAllMissions(String characterStage) {
        List<Mission> missions = getCurrentMissions(characterStage);
        
        for (Mission mission : missions) {
            if (!mission.getCompleted()) {
                BigDecimal actualSavings = calculateActualSavings(mission.getMissionType());
                
                if (actualSavings.compareTo(mission.getTargetAmount()) >= 0) {
                    mission.setCompleted(true);
                    mission.setCompletedAt(LocalDateTime.now());
                    missionRepository.save(mission);
                }
            }
        }
    }
    
    public static class MissionProgress {
        private String description;
        private String type;
        private BigDecimal target;
        private BigDecimal current;
        private Boolean completed;
        
        public MissionProgress(String description, String type, BigDecimal target, 
                              BigDecimal current, Boolean completed) {
            this.description = description;
            this.type = type;
            this.target = target;
            this.current = current;
            this.completed = completed;
        }
        
        public String getDescription() { return description; }
        public String getType() { return type; }
        public BigDecimal getTarget() { return target; }
        public BigDecimal getCurrent() { return current; }
        public Boolean getCompleted() { return completed; }
    }
}