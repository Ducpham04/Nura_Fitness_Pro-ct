#!/bin/bash
# 1. Register
echo "Registering..."
REGISTER_RES=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test_onboard_user2@test.com", "password":"password", "fullName":"Test User"}')

# 2. Login
echo "Logging in..."
LOGIN_RES=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test_onboard_user2@test.com", "password":"password"}')

TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

# 3. Save body profile
echo "Saving body profile..."
curl -s -X POST http://localhost:8080/api/user/profile/body \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "height": 170,
    "weight": 70,
    "bodyFat": 15,
    "muscleMass": 35,
    "age": 25,
    "gender": "MALE",
    "experienceLevel": "intermediate",
    "goal": "muscle",
    "injuryNotes": "none"
  }' | tee response.json

