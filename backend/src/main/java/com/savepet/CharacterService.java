package com.savepet;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class CharacterService {

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private BudgetRepository budgetRepository;

    public Character getOrCreateCharacter() {
        Character character = characterRepository.findTopByOrderByCreatedAtDesc();
        if (character == null) {
            character = new Character("머니펫");
            return characterRepository.save(character);
        }
        return character;
    }

    public Character addSavingExperience(BigDecimal savedAmount) {
        Character character = getOrCreateCharacter();

        int expToAdd = savedAmount.intValue() / 100;
        character.addExperience(expToAdd);

        return characterRepository.save(character);
    }

    public Character checkSavingAchievement() {
        Character character = getOrCreateCharacter();
        Budget currentBudget = getCurrentWeekBudget();

        if (currentBudget != null) {
            BigDecimal weeklyExpenses = getWeeklyExpenses(currentBudget.getStartDate(), currentBudget.getEndDate());
            BigDecimal savedAmount = currentBudget.getTargetAmount().subtract(weeklyExpenses);

            if (savedAmount.compareTo(BigDecimal.ZERO) > 0) {
                int expToAdd = savedAmount.intValue() / 1000;
                character.addExperience(expToAdd);
                return characterRepository.save(character);
            }
        }

        return character;
    }

    private Budget getCurrentWeekBudget() {
        return budgetRepository.findById(1L).orElse(new Budget());
    }

    private BigDecimal getWeeklyExpenses(LocalDate startDate, LocalDate endDate) {
        List<Transaction> transactions = transactionRepository.findByOrderByCreatedAtDesc();

        return transactions.stream()
                .filter(t -> "expense".equals(t.getType()))
                .filter(t -> {
                    LocalDate transactionDate = t.getCreatedAt().toLocalDate();
                    return !transactionDate.isBefore(startDate) && !transactionDate.isAfter(endDate);
                })
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
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
        Budget budget = getCurrentWeekBudget();
        BigDecimal weeklyExpenses = getWeeklyExpenses(budget.getStartDate(), budget.getEndDate());
        BigDecimal savedAmount = budget.getTargetAmount().subtract(weeklyExpenses);

        return new SavingStatus(budget.getTargetAmount(), weeklyExpenses, savedAmount);
    }

    public static class SavingStatus {
        private BigDecimal targetAmount;
        private BigDecimal actualExpenses;
        private BigDecimal savedAmount;

        public SavingStatus(BigDecimal targetAmount, BigDecimal actualExpenses, BigDecimal savedAmount) {
            this.targetAmount = targetAmount;
            this.actualExpenses = actualExpenses;
            this.savedAmount = savedAmount;
        }

        public BigDecimal getTargetAmount() { return targetAmount; }
        public BigDecimal getActualExpenses() { return actualExpenses; }
        public BigDecimal getSavedAmount() { return savedAmount; }
    }
}