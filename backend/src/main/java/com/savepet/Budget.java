package com.savepet;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
public class Budget {
    @Id
    private Long id = 1L;

    private String period = "weekly";
    private BigDecimal targetAmount = BigDecimal.valueOf(100000);
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate updatedAt = LocalDate.now();

    public Budget() {
        LocalDate now = LocalDate.now();
        this.startDate = now.with(java.time.DayOfWeek.MONDAY);
        this.endDate = this.startDate.plusDays(6);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }

    public BigDecimal getTargetAmount() { return targetAmount; }
    public void setTargetAmount(BigDecimal targetAmount) {
        this.targetAmount = targetAmount;
        this.updatedAt = LocalDate.now();
    }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public LocalDate getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDate updatedAt) { this.updatedAt = updatedAt; }
}