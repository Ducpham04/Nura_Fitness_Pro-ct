-- Master-data meal lines: persisted food FKs + grams; totals computed by Java from foods.*

CREATE TABLE IF NOT EXISTS personalized_meal_items (
    pmi_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    pmd_id BIGINT NOT NULL COMMENT 'FK personalized_meal_details',
    food_id BIGINT NOT NULL COMMENT 'FK foods',
    quantity_grams DECIMAL(10, 2) NOT NULL COMMENT 'Portion grams; macros/prices scaled from per-100g master',
    from_inventory BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Matched user fridge tag to catalog → 0đ line',
    CONSTRAINT fk_pmi_pmd FOREIGN KEY (pmd_id) REFERENCES personalized_meal_details (pmd_id) ON DELETE CASCADE,
    CONSTRAINT fk_pmi_food FOREIGN KEY (food_id) REFERENCES foods (food_id),
    INDEX idx_pmi_pmd (pmd_id),
    INDEX idx_pmi_food (food_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Normalized meal composition; no raw AI nutrition JSON';
