package com.savepet;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/character")
@CrossOrigin(origins = "http://localhost:3000")
public class CharacterController {

    @Autowired
    private CharacterService characterService;

    @Autowired
    private BudgetRepository budgetRepository;

    @GetMapping
    public Character getCharacter() {
        return characterService.getOrCreateCharacter();
    }

    @PostMapping("/add-experience")
    public Character addSavingExperience(@RequestParam Integer amount) {
        return characterService.addSavingExperience(BigDecimal.valueOf(amount));
    }

    @DeleteMapping("/reset")
    public String resetCharacter() {
        return characterService.resetCharacterData();
    }

    @GetMapping("/saving-status")
    public CharacterService.SavingStatus getSavingStatus() {
        return characterService.getCurrentSavingStatus();
    }

    @PostMapping("/check-saving")
    public Character checkSaving() {
        return characterService.checkSavingAchievement();
    }

    @GetMapping("/budget")
    public Budget getCurrentBudget() {
        return budgetRepository.findById(1L).orElse(new Budget());
    }

    @PostMapping("/budget")
    public Budget setBudget(@RequestParam BigDecimal amount) {
        Budget budget = budgetRepository.findById(1L).orElse(new Budget());
        budget.setTargetAmount(amount);
        return budgetRepository.save(budget);
    }
}