package com.example.fitchallenge.DTO.goalsDTO;

import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class goalsDTOpayload {
    private Long id;
    private String imageLink ;
    private String name;
    private String description ;
    
    // Manual getters/setters for Lombok compatibility
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getImageLink() {
        return imageLink;
    }
    
    public void setImageLink(String imageLink) {
        this.imageLink = imageLink;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
}
