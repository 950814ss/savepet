package com.savepet;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "http://localhost:3000")
public class AnalyticsController {
    
    @Autowired
    private AnalyticsService analyticsService;
    
    @GetMapping("/weekly")
    public AnalyticsService.WeeklyAnalysis getWeeklyAnalysis() {
        return analyticsService.getWeeklyAnalysis();
    }
    
    @GetMapping("/category")
    public AnalyticsService.CategoryAnalysis getCategoryAnalysis() {
        return analyticsService.getCategoryAnalysis();
    }
    
    @GetMapping("/trend")
    public AnalyticsService.SavingTrend getSavingTrend() {
        return analyticsService.getSavingTrend();
    }
}