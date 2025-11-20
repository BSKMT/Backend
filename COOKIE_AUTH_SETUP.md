# Configuración de Autenticación con Cookies HttpOnly

## ✅ Cambios Implementados

Este proyecto ahora usa **cookies httpOnly** para la autenticación en lugar de localStorage, proporcionando mayor seguridad contra ataques XSS.

### Backend (NestJS)
- ✅ Los tokens se envían como cookies httpOnly en lugar de JSON
- ✅ JWT Strategy actualizado para leer tokens desde cookies
- ✅ Endpoints actualizados: `/auth/login`, `/auth/refresh`, `/auth/logout`
- ✅ Cookies configuradas con `secure: true` y `sameSite: 'none'` en producción

### Frontend (Next.js)
- ✅ Eliminado uso de localStorage completamente
- ✅ Todas las peticiones usan `credentials: 'include'`
- ✅ Hooks de autenticación actualizados (useAuth.tsx, useAuth-nestjs.tsx)
- ✅ API client simplificado sin manejo manual de tokens

## 🔧 Configuración Requerida

### Backend - Variables de Entorno

Las siguientes variables ya están configuradas en el backend:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=15m

# CORS Configuration  
CORS_ORIGIN=https://bskmt.com,http://localhost:3000

# Node Environment
NODE_ENV=production
```

### Configuración de Cookies

Las cookies se configuran automáticamente con:

**Access Token Cookie:**
- Nombre: `accessToken`
- Duración: 15 minutos
- httpOnly: true
- secure: true (producción)
- sameSite: 'none' (producción)
- path: '/'

**Refresh Token Cookie:**
- Nombre: `refreshToken`
- Duración: 7 días
- httpOnly: true
- secure: true (producción)
- sameSite: 'none' (producción)
- path: '/'

## 🚀 Deployment

### Vercel Backend

1. Asegúrate que las variables de entorno estén configuradas:
   ```bash
   NODE_ENV=production
   CORS_ORIGIN=https://bskmt.com
   ```

2. Deploy normalmente:
   ```bash
   cd Backend
   git push
   ```

### Vercel Frontend

El frontend ya está configurado para trabajar con cookies. Solo asegúrate que:

1. `NEXT_PUBLIC_API_URL` apunte al backend:
   ```bash
   NEXT_PUBLIC_API_URL=https://api.bskmt.com/api/v1
   ```

2. Deploy:
   ```bash
   cd LandingPage
   git push
   ```

## 🔒 Seguridad

### Ventajas sobre localStorage:

1. **Protección XSS**: Las cookies httpOnly no son accesibles desde JavaScript
2. **CSRF Protection**: sameSite='none' con secure=true previene ataques CSRF
3. **Auto-gestión**: Las cookies se envían/reciben automáticamente
4. **Expiración**: Las cookies expiran automáticamente del lado del cliente

### Configuración CORS

El backend ya tiene configurado:
- `credentials: true` - Permite envío de cookies
- `origin: ['https://bskmt.com']` - Dominio permitido
- Headers permitidos para CSRF tokens si se implementan en el futuro

## 📝 Flujo de Autenticación

### 1. Login
```typescript
// Frontend
await apiClient.post('/auth/login', { email, password });

// Backend responde con:
// - Set-Cookie: accessToken=...
// - Set-Cookie: refreshToken=...
// - Body: { success: true, user: {...} }
```

### 2. Peticiones Autenticadas
```typescript
// Frontend (cookies enviadas automáticamente)
await apiClient.get('/auth/me');

// Backend lee el accessToken de req.cookies.accessToken
```

### 3. Refresh Token
```typescript
// Frontend (si accessToken expiró, backend lo maneja)
// El JwtStrategy lee automáticamente las cookies

// Si es necesario refresh manual:
await apiClient.post('/auth/refresh');

// Backend responde con nuevas cookies
```

### 4. Logout
```typescript
// Frontend
await apiClient.post('/auth/logout');

// Backend limpia las cookies:
// - res.clearCookie('accessToken')
// - res.clearCookie('refreshToken')
```

## 🧪 Testing

### Local Development

1. Inicia el backend:
   ```bash
   cd Backend
   npm run start:dev
   ```

2. Inicia el frontend:
   ```bash
   cd LandingPage
   npm run dev
   ```

3. Prueba el flujo completo:
   - Registro
   - Login
   - Peticiones autenticadas
   - Logout

### Production Testing

1. Verifica que las cookies se estén enviando:
   - Abre DevTools → Application → Cookies
   - Deberías ver `accessToken` y `refreshToken` con el flag httpOnly

2. Verifica CORS:
   - Todas las peticiones deben incluir el header `credentials: 'include'`
   - El backend debe responder con `Access-Control-Allow-Credentials: true`

## ⚠️ Notas Importantes

1. **NO uses localStorage para tokens** - Ya está eliminado del código
2. **sameSite='none' requiere secure=true** - Solo funciona en HTTPS
3. **CORS debe estar correctamente configurado** - Ya está hecho
4. **Las cookies expiran automáticamente** - No requiere limpieza manual

## 🔄 Migración Completada

- ❌ localStorage (Inseguro)
- ✅ httpOnly Cookies (Seguro)

Todos los archivos han sido actualizados para usar exclusivamente cookies httpOnly.
