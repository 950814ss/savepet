package com.savepet;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/budget")
@CrossOrigin(origins = "http://localhost:3000")
public class BudgetController {

    @Autowired
    private BudgetRepository budgetRepository;

    @GetMapping("/current")
    public Budget getCurrentBudget() {
        return budgetRepository.findById(1L).orElse(new Budget());
    }

    @PostMapping("/set")
    public Budget setBudget(@RequestParam BigDecimal amount) {
        Budget budget = budgetRepository.findById(1L).orElse(new Budget());
        budget.setTargetAmount(amount);
        return budgetRepository.save(budget);
    }
}