package com.savepet;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reset")
@CrossOrigin(origins = "http://localhost:3000")
public class ResetController {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private CharacterRepository characterRepository;

    /**
     * 모든 데이터를 초기화하는 API
     * DELETE /api/reset/all
     */
    @DeleteMapping("/all")
    public ResetResponse resetAll() {
        // 1. 모든 거래 내역 삭제
        long transactionCount = transactionRepository.count();
        transactionRepository.deleteAll();

        // 2. 모든 캐릭터 데이터 삭제
        long characterCount = characterRepository.count();
        characterRepository.deleteAll();

        // 3. 결과 반환
        return new ResetResponse(
                "모든 데이터가 초기화되었습니다! 🔄",
                transactionCount,
                characterCount
        );
    }

    /**
     * 초기화 결과를 담는 응답 클래스
     */
    public static class ResetResponse {
        private String message;
        private long deletedTransactions;
        private long deletedCharacters;

        public ResetResponse(String message, long deletedTransactions, long deletedCharacters) {
            this.message = message;
            this.deletedTransactions = deletedTransactions;
            this.deletedCharacters = deletedCharacters;
        }

        // Getters
        public String getMessage() { return message; }
        public long getDeletedTransactions() { return deletedTransactions; }
        public long getDeletedCharacters() { return deletedCharacters; }
    }
}