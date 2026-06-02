package com.example.fitchallenge.DTO.InventoryDTO;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryItemDTO {
    private Long itemId;
    private String itemName;
    private String description;
    private Integer quantity;
    private Double price;
    private String category;
    private Long userId;
    private String createdAt;
    private String updatedAt;
}
