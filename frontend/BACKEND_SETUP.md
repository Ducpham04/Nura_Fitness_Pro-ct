# Cấu Hình Kết Nối Java Backend

## 📋 Tóm Tắt

Đã tạo xong cấu hình để kết nối với **Java Spring Boot Backend** (`http://localhost:8080`)

---

## 📁 Files Đã Tạo

```
frontend/
├── src/
│   ├── config/
│   │   └── api.ts           ✅ API config + endpoints
│   ├── services/
│   │   ├── apiClient.ts     ✅ HTTP client với JWT
│   │   ├── authService.ts   ✅ Auth API (login/register/logout)
│   │   └── index.ts         ✅ Export services
│   ├── types/
│   │   ├── auth.ts          ✅ Auth types
│   │   └── index.ts         ✅ Common types
│   ├── hooks/
│   │   └── useAuth.ts       ✅ React hook cho auth
│   ├── context/
│   │   └── AuthContext.tsx  ✅ React context cho auth
│   └── vite-env.d.ts       ✅ Đã cập nhật types
└── .env.example            ✅ Mẫu file env
```

---

## 🚀 Bước 1: Cấu Hình Môi Trường

Tạo file `.env` (copy từ `.env.example`):

```bash
cp .env.example .env
```

Hoặc tạo thủ công file `.env`:
```env
VITE_API_URL=http://localhost:8080
VITE_APP_NAME=Fit Challenge
```

---

## 🚀 Bước 2: Cài Đặt Dependencies

```bash
npm install
```

---

## 🚀 Bước 3: Chạy App

```bash
npm run dev
```

App sẽ chạy ở `http://localhost:5173`

---

## 🔗 Cách Sử Dụng Trong Components

### 1. Dùng AuthContext (Khuyến nghị)

Bước 1: Wrap App với AuthProvider trong `main.tsx`:

```tsx
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

Bước 2: Sử dụng trong component:

```tsx
import { useAuthContext } from '../context/AuthContext';

function LoginPage() {
  const { login, isLoading, error } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login({
      email: 'user@example.com',
      password: 'password123'
    });
    if (success) {
      // Redirect to dashboard
      navigate('/dashboard');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Login'}
      </button>
    </form>
  );
}
```

### 2. Dùng AuthService Trực Tiếp

```tsx
import { authService } from '../services/authService';

async function handleLogin() {
  const success = await authService.login({
    email: 'user@example.com',
    password: 'password123'
  });
  
  if (success) {
    const user = authService.getStoredUser();
    console.log('Welcome', user?.fullName);
  }
}
```

### 3. Gọi API Khác

```tsx
import { apiClient } from '../services/apiClient';
import { API_ENDPOINTS } from '../config/api';

// GET request
const response = await apiClient.get(
  API_ENDPOINTS.TRAINING.USER_TRAINING(userId)
);

// POST request
const response = await apiClient.post(
  API_ENDPOINTS.CHALLENGES.SUBMIT,
  { challengeId: 1, videoUrl: '...' }
);

if (response.success) {
  console.log(response.data);
} else {
  console.error(response.error?.message);
}
```

---

## 📚 API Endpoints Đã Cấu Hình

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/auth/login` | POST | Đăng nhập |
| `/api/auth/register` | POST | Đăng ký |
| `/api/auth/logout` | POST | Đăng xuất |
| `/api/auth/refresh` | POST | Refresh token |
| `/api/auth/me` | GET | Lấy thông tin user |
| `/api/challenges` | GET | Danh sách challenges |
| `/api/training-plans` | GET | Danh sách training plans |
| `/api/nutrition-plans` | GET | Danh sách nutrition plans |

Xem đầy đủ trong `src/config/api.ts`

---

## 🔐 JWT Token Flow

```
1. User login → BE trả về accessToken + refreshToken
2. Token lưu trong localStorage
3. API client tự động thêm Bearer token vào headers
4. Khi 401 → tự động refresh token
5. Logout → xóa token khỏi localStorage
```

---

## ⚠️ Lưu Ý Quan Trọng

1. **CORS**: Backend phải enable CORS cho `http://localhost:5173`
2. **JWT Secret**: BE và FE phải cùng secret key
3. **HTTPS**: Production cần HTTPS cho cookie secure
4. **Token Expiry**: Refresh token khi hết hạn (đã implement trong authService)

---

## 🆘 Troubleshooting

| Lỗi | Cách Fix |
|-----|----------|
| `Cannot find module 'react'` | Chạy `npm install` |
| `Failed to fetch` | Kiểm tra BE chạy ở `localhost:8080` |
| `401 Unauthorized` | Kiểm tra token, có thể đã hết hạn |
| `CORS error` | Enable CORS trong BE config |

---

## 📖 Tài Liệu Tham Khảo

- Java BE API Report: `/docs/api-rest-controller-report.md`
- Backend: Chạy ở `http://localhost:8080`
- BE Swagger UI: `http://localhost:8080/swagger-ui.html` (nếu có)

---

**Sẵn sàng để chạy!** 🚀
