package com.savepet;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "http://localhost:3000")
public class TransactionController {

    @Autowired
    private TransactionRepository repository;

    @Autowired
    private CharacterService characterService;

    @GetMapping
    public List<Transaction> getAllTransactions() {
        return repository.findByOrderByCreatedAtDesc();
    }

    @PostMapping
    public Transaction createTransaction(@RequestBody Transaction transaction) {
        return repository.save(transaction);
    }

    @DeleteMapping("/{id}")
    public String deleteTransaction(@PathVariable Long id) {
        repository.deleteById(id);
        return "거래가 삭제되었습니다.";
    }

    @DeleteMapping("/reset")
    public String resetTransactions() {
        repository.deleteAll();
        return "거래 내역이 초기화되었습니다.";
    }

    @GetMapping("/daily/{date}")
    public List<Transaction> getDailyTransactions(@PathVariable String date) {
        LocalDate targetDate = LocalDate.parse(date);
        LocalDateTime startOfDay = targetDate.atStartOfDay();
        LocalDateTime endOfDay = targetDate.atTime(23, 59, 59);

        return repository.findByDateRange(startOfDay, endOfDay);
    }
}