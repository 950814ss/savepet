package com.savepet;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MissionRepository extends JpaRepository<Mission, Long> {
    List<Mission> findByStageOrderByIdAsc(String stage);
    List<Mission> findByCompletedTrue();
    Mission findByStageAndMissionType(String stage, String missionType);
}