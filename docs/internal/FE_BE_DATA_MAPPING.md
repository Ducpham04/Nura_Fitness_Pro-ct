# FE vs BE Data Mapping Analysis

## 📊 **Login API Response Structure**

### **BE Response (JwtResponse.java)**
```java
{
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here", 
  "type": "Bearer",
  "user": {
    "id": 57,
    "email": "user@example.com",
    "fullName": "User Name",
    "role": "USER"
  }
}
```

### **FE Expected (AuthResponse)**
```typescript
{
  "accessToken": "jwt_token_here",
  "refreshToken": "refresh_token_here",
  "expiresIn": 3600,
  "user": {
    "id": 57,
    "email": "user@example.com", 
    "fullName": "User Name",
    "avatarUrl": "optional_url",
    "role": "USER' | 'ADMIN'",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

## 🔄 **Mapping Issues Found**

| Field | BE | FE | Status | Action |
|-------|----|----|--------|--------|
| **Token** | `token` | `accessToken` | ❌ Mismatch | Map token→accessToken |
| **Expires In** | Missing | `expiresIn` | ❌ Missing | Add default 3600s |
| **User Role** | String | Union type | ❌ Mismatch | Convert to union |
| **Avatar** | Missing | `avatarUrl` | ❌ Missing | Map from profileImage |
| **Active** | `status` | `isActive` | ❌ Mismatch | Map status→isActive |
| **Timestamps** | `ZonedDateTime` | ISO string | ❌ Mismatch | Convert format |
| **Profile Image** | `linkImage`/`profileImage` | `avatarUrl` | ❌ Mismatch | Map linkImage→avatarUrl |

## 📋 **Complete User Data Fields**

### **BE UserDTO Fields**
```java
- id (Long)
- email (String)  
- fullName (String)
- role (String)
- linkImage (String)
- profileImage (String) // Alias
- createdAt (ZonedDateTime)
- updatedAt (ZonedDateTime) 
- lastLoginAt (ZonedDateTime)
- status (String)
```

### **FE User Fields**
```typescript
- id (number)
- email (string)
- fullName (string)
- avatarUrl (string?)
- role ('USER' | 'ADMIN')
- isActive (boolean)
- createdAt (string)
- updatedAt (string)
```

## 🎯 **Required Actions**

1. **Fix authService mapping** - Convert BE response to FE format
2. **Update User type** - Add missing fields from BE
3. **Handle timestamps** - Convert ZonedDateTime to ISO strings
4. **Map avatar** - linkImage → avatarUrl
5. **Map status** - status string → isActive boolean
