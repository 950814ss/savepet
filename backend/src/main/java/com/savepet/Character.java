package com.savepet;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Character {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private Integer level = 1;
    private Integer experience = 0;
    private String stage = "EGG"; // EGG, BABY, ADULT, RICH, BILLIONAIRE
    private Integer savingGoal = 10000; // 현재 단계 절약 목표
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime lastEvolution;
    
    public Character() {}
    
    public Character(String name) {
        this.name = name;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public Integer getLevel() { return level; }
    public void setLevel(Integer level) { this.level = level; }
    
    public Integer getExperience() { return experience; }
    public void setExperience(Integer experience) { this.experience = experience; }
    
    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }
    
    public Integer getSavingGoal() { return savingGoal; }
    public void setSavingGoal(Integer savingGoal) { this.savingGoal = savingGoal; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getLastEvolution() { return lastEvolution; }
    public void setLastEvolution(LocalDateTime lastEvolution) { this.lastEvolution = lastEvolution; }
    
    // 경험치 추가 메서드
    public void addExperience(int exp) {
        this.experience += exp;
        checkEvolution();
    }
    
    // 진화 체크
    private void checkEvolution() {
        String newStage = stage;
        int newGoal = savingGoal;
        
        if (experience >= 100 && "EGG".equals(stage)) {
            newStage = "BABY";
            newGoal = 50000;
        } else if (experience >= 500 && "BABY".equals(stage)) {
            newStage = "ADULT";
            newGoal = 200000;
        } else if (experience >= 2000 && "ADULT".equals(stage)) {
            newStage = "RICH";
            newGoal = 1000000;
        } else if (experience >= 10000 && "RICH".equals(stage)) {
            newStage = "BILLIONAIRE";
            newGoal = 5000000;
        }
        
        if (!stage.equals(newStage)) {
            this.stage = newStage;
            this.savingGoal = newGoal;
            this.lastEvolution = LocalDateTime.now();
            this.level++;
        }
    }
}
