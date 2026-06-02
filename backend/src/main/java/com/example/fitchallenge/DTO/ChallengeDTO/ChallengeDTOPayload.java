package com.example.fitchallenge.DTO.ChallengeDTO;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class  ChallengeDTOPayload {

        private Long goalId;
    private String title;
    private String description;
    private Integer durationDays;
    private Integer rewardPoints;
    private String reward;
    private String aiRulesJson;
    private String status;
    private java.util.List<Long> exerciseIds;
    

}
