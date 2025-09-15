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
    private String stage = "EGG";
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime lastEvolution;
    
    public Character() {}
    
    public Character(String name) {
        this.name = name;
    }
    
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
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getLastEvolution() { return lastEvolution; }
    public void setLastEvolution(LocalDateTime lastEvolution) { this.lastEvolution = lastEvolution; }
    
    public void addExperience(int exp) {
        this.experience += exp;
    }
    
    public boolean canEvolve(int completedMissions) {
        switch (stage) {
            case "EGG": return experience >= 100 && completedMissions >= 1;
            case "BABY": return experience >= 500 && completedMissions >= 2;
            case "ADULT": return experience >= 2000 && completedMissions >= 3;
            case "RICH": return experience >= 10000 && completedMissions >= 4;
            default: return false;
        }
    }
    
    public void evolve() {
        String newStage = getNextStage();
        if (!stage.equals(newStage)) {
            this.stage = newStage;
            this.level++;
            this.lastEvolution = LocalDateTime.now();
        }
    }
    
    private String getNextStage() {
        switch (stage) {
            case "EGG": return "BABY";
            case "BABY": return "ADULT";
            case "ADULT": return "RICH";
            case "RICH": return "BILLIONAIRE";
            default: return stage;
        }
    }
}