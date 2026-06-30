package com.example.fitchallenge.service;

/**
 * Hằng số chi phí AI credit cho từng hành động.
 * Chỉnh tại đây nếu muốn thay đổi weight.
 */
public final class AiCreditCost {

    private AiCreditCost() {}

    /** Tạo meal plan / workout plan / sinh tuần kế */
    public static final int PLAN_GENERATE = 5;

    /** Quét ảnh món ăn hoặc kho nguyên liệu */
    public static final int SCAN_IMAGE = 2;

    /** Chat AI Coach hoặc log thực phẩm bằng ngôn ngữ tự nhiên */
    public static final int CHAT = 1;

    /** MediaPipe pose analysis — miễn phí */
    public static final int POSE = 0;
}
