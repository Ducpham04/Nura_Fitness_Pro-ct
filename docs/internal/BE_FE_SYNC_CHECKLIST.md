# 🔄 **BE-FE Data Sync Checklist**

## 📋 **Authentication Flow**

### ✅ **Login/Register**
- [ ] BE endpoint `/api/auth/login` hoạt động
- [ ] BE endpoint `/api/auth/register` hoạt động  
- [ ] FE gọi đúng API endpoint
- [ ] BE trả về `JwtResponse` với `token`, `refreshToken`, `user`
- [ ] FE map BE response → FE format (`token` → `accessToken`)
- [ ] Token được lưu vào localStorage
- [ ] User data được lưu vào AuthContext
- [ ] Dashboard nhận đúng user info sau login

### ✅ **Token Management**
- [ ] FE gửi `Bearer {token}` trong Authorization header
- [ ] BE validate JWT token thành công
- [ ] Token refresh hoạt động khi hết hạn
- [ ] Logout xóa token khỏi localStorage

---

## 📊 **User Data Loading**

### ✅ **User Profile**
- [ ] BE endpoint `/api/v1/users/{id}/profile/full` hoạt động
- [ ] FE gọi `userService.getFullProfile()` đúng
- [ ] BE trả về `FullUserProfileDTO` với:
  - `userId`, `fullName`, `email`, `avatarUrl`
  - `stats`: `aiScore`, `challengesCompleted`, `totalWorkouts`, `currentStreak`
  - `activitySummary`: `totalCaloriesBurned`, `totalMinutes`, `favoriteWorkout`
- [ ] FE map BE response → `DashboardData` format
- [ ] Dashboard hiển thị stats thật từ BE

### ✅ **Dashboard Stats**
- [ ] Total Workouts: `stats.totalWorkouts` từ BE
- [ ] Challenges Completed: `stats.challengesCompleted` từ BE  
- [ ] Current Streak: `stats.currentStreak` từ BE
- [ ] Points: `stats.aiScore` từ BE
- [ ] Calories Burned: `activitySummary.totalCaloriesBurned` từ BE

---

## 🔌 **API Endpoints Status**

| Endpoint | BE Status | FE Status | Test Result |
|---------|-----------|-----------|-------------|
| `POST /api/auth/login` | ✅ Working | ✅ Implemented | ✅ Pass |
| `POST /api/auth/register` | ✅ Working | ✅ Implemented | ✅ Pass |
| `GET /api/v1/users/{id}/profile/full` | ✅ Working | ✅ Implemented | 🔄 Test |
| `GET /api/auth/me` | ✅ Working | ❌ Not used | ❌ Skip |
| `POST /api/auth/refresh` | ✅ Working | ✅ Implemented | 🔄 Test |
| `POST /api/auth/logout` | ✅ Working | ✅ Implemented | 🔄 Test |

---

## 🧪 **Testing Steps**

### **1. Login Test**
```bash
# 1. Start BE
cd backend && ./mvnw spring-boot:run

# 2. Start FE  
cd frontend && npm run dev

# 3. Test login
# Email: user1@example.com
# Password: 123456

# 4. Check browser console:
# - [API] /auth/login - Token: present
# - [API] /users/57 - Token: present  
# - [API] /users/57/stats - Token: present
```

### **2. Data Verification**
```bash
# Check localStorage after login:
localStorage.getItem('accessToken') # Should have token
localStorage.getItem('user') # Should have user data

# Check network tab:
# /api/auth/login → 200 OK
# /api/v1/users/57/profile/full → 200 OK
```

### **3. Dashboard Display**
- [ ] User name hiển thị đúng từ BE
- [ ] Stats cards hiển thị số thật từ BE
- [ ] Không có lỗi 401 Unauthorized
- [ ] Không có fallback data khi BE hoạt động

---

## 🚨 **Common Issues & Solutions**

| Issue | Cause | Solution |
|-------|-------|----------|
| **401 Unauthorized** | Token không được gửi | Kiểmtra `apiClient.ts` Authorization header |
| **User data undefined** | Mapping sai | Kiểmtra `authService.mapBEToFE()` |
| **Stats showing 0** | BE endpoint sai | Kiểmtra `/api/v1/users/{id}/profile/full` |
| **CORS error** | BE CORS config | Kiểmtra `WebMvcConfig.java` |
| **Token expired** | JWT timeout | Implement refresh token flow |

---

## 📈 **Performance Metrics**

### **Expected Response Times**
- Login: < 500ms
- User Profile: < 300ms  
- Dashboard Load: < 1s total

### **Data Size**
- User Profile: ~2KB
- Dashboard Stats: ~1KB
- Total per session: < 5KB

---

## ✅ **Final Validation**

### **Before Production**
- [ ] All endpoints return 200 OK
- [ ] No console errors in browser
- [ ] Data displays correctly in UI
- [ ] Fallback data works when BE down
- [ ] Token refresh works automatically
- [ ] Logout clears all data

### **Ready Checklist**
- [ ] Login flow complete ✅
- [ ] User data synced ✅  
- [ ] Dashboard stats real ✅
- [ ] Error handling ✅
- [ ] Token management ✅

---

**🎯 Target: FE displays 100% real data from BE with proper fallbacks**
