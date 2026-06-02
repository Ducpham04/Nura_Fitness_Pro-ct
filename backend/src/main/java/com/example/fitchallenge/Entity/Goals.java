package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name="goals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Goals {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="goal_id")
    private Long id ;
    @Column(name="Image_Link")
    private String imageLink ;
    @Column(name="Name")
    private String name;
    @Column(name="Descriptions")
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
