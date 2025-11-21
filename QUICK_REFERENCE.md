# Guía Rápida - Fase 2 Seguridad Avanzada

## 🚀 Inicio Rápido

### 1. Configurar Variables de Entorno
```env
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
FRONTEND_URL=http://localhost:3000

# SMTP (opcional para desarrollo)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-password
EMAIL_FROM=noreply@bsk-mt.com
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Generar Llaves RSA (si no existen)
```bash
npm run generate:keys
```

### 4. Compilar y Ejecutar
```bash
npm run build
npm run start:dev
```

---

## 📋 Uso de Rate Limiting

### Aplicar a Endpoint
```typescript
import { ThrottleLogin, ThrottleRegister, ThrottleResetPassword } from '@common/decorators/throttle.decorator';

@Controller('auth')
export class AuthController {
  @ThrottleLogin() // 5 intentos / 15 minutos
  @Post('login')
  async login() { }

  @ThrottleRegister() // 3 intentos / 1 hora
  @Post('register')
  async register() { }

  @ThrottleResetPassword() // 3 intentos / 1 hora
  @Post('forgot-password')
  async forgotPassword() { }
}
```

### Decoradores Disponibles
- `@ThrottleLogin()` → 5 intentos / 15 min
- `@ThrottleRegister()` → 3 intentos / 1 hora
- `@ThrottleResetPassword()` → 3 intentos / 1 hora
- `@ThrottleResendVerification()` → 2 intentos / 1 hora
- `@ThrottlePublic()` → 30 intentos / 1 min
- `@ThrottleAuthenticated()` → 300 intentos / 1 min

---

## 📧 Uso de Email Queue

### Inyectar Service
```typescript
import { EmailQueueService } from '@modules/queue/email-queue.service';

constructor(private emailQueueService: EmailQueueService) {}
```

### Enviar Emails
```typescript
// Verificación de email
await this.emailQueueService.sendVerificationEmail(
  'user@example.com',
  'token123',
  'Juan Pérez'
);

// Reset de contraseña
await this.emailQueueService.sendPasswordResetEmail(
  'user@example.com',
  'token456',
  'Juan Pérez'
);

// Notificación de cambio de contraseña
await this.emailQueueService.sendPasswordChangedEmail(
  'user@example.com',
  'Juan Pérez',
  '192.168.1.1'
);

// Email de bienvenida
await this.emailQueueService.sendWelcomeEmail(
  'user@example.com',
  'Juan Pérez'
);

// Alerta de seguridad
await this.emailQueueService.sendSecurityAlert(
  'user@example.com',
  'Juan Pérez',
  'Login desde nueva ubicación',
  { location: 'Madrid, España', ip: '1.2.3.4' }
);
```

### Monitorear Cola
```typescript
const stats = await this.emailQueueService.getQueueStats();
console.log(stats);
// {
//   waiting: 5,
//   active: 2,
//   completed: 1230,
//   failed: 12,
//   delayed: 0,
//   total: 7
// }
```

---

## ✅ Uso de Email Verification Guard

### Proteger Ruta (requiere email verificado)
```typescript
import { EmailVerifiedGuard } from '@common/guards/email-verified.guard';

@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
@Get('profile')
async getProfile() {
  // Solo usuarios con email verificado
}
```

### Saltar Verificación (opcional)
```typescript
import { SkipEmailVerification } from '@common/decorators/skip-email-verification.decorator';

@SkipEmailVerification()
@UseGuards(JwtAuthGuard)
@Get('settings')
async getSettings() {
  // Accesible sin email verificado
}
```

### Endpoint de Reenvío
```http
POST /auth/resend-verification
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "message": "Email de verificación enviado. Revisa tu bandeja de entrada."
}
```

---

## 📊 Uso de Audit Logging

### Inyectar Service
```typescript
import { AuditService } from '@modules/audit/audit.service';

constructor(private auditService: AuditService) {}
```

### Registrar Eventos
```typescript
// Login exitoso
await this.auditService.logLoginSuccess(
  userId,
  email,
  ipAddress,
  userAgent,
  sessionId
);

// Login fallido
await this.auditService.logLoginFailure(
  email,
  ipAddress,
  userAgent,
  'Invalid password'
);

// Registro de usuario
await this.auditService.logRegister(
  userId,
  email,
  ipAddress,
  userAgent
);

// Cambio de contraseña
await this.auditService.logPasswordChange(
  userId,
  email,
  ipAddress,
  userAgent,
  'reset' // o 'change'
);

// Solicitud de reset
await this.auditService.logPasswordResetRequest(
  userId,
  email,
  ipAddress,
  userAgent
);

// Verificación de email
await this.auditService.logEmailVerification(
  userId,
  email,
  ipAddress,
  userAgent
);

// Logout
await this.auditService.logLogout(
  userId,
  email,
  ipAddress,
  userAgent,
  sessionId
);

// Evento personalizado
await this.auditService.log({
  userId,
  email,
  action: 'custom-action',
  status: 'success',
  ipAddress,
  userAgent,
  metadata: { custom: 'data' }
});
```

### Consultar Logs (Solo Admins)
```typescript
// Logs de un usuario
const userLogs = await this.auditService.getUserLogs(userId, 50);

// Logs por acción
const loginLogs = await this.auditService.getLogsByAction('login', 100);

// Login fallidos recientes
const failedLogins = await this.auditService.getRecentFailedLogins(24);

// Estadísticas
const stats = await this.auditService.getSecurityStats(24);
```

### Endpoints de Admin
```http
GET /audit/user/:userId?limit=50
GET /audit/action/:action?limit=100
GET /audit/failed-logins?hours=24
GET /audit/stats?hours=24
Authorization: Bearer <admin_jwt>
```

---

## 🔐 Reset de Contraseña Seguro

### Solicitar Reset
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "message": "Si el email existe, recibirás instrucciones"
}
```

### Resetear Contraseña
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "64_character_hex_token",
  "newPassword": "NewSecurePass123!"
}

Response:
{
  "success": true,
  "message": "Contraseña actualizada exitosamente"
}
```

### Características
- ✅ Token de 32 bytes (256 bits)
- ✅ Expira en 1 hora
- ✅ Uso único (marcado como usado)
- ✅ Revoca todas las sesiones
- ✅ Email de notificación enviado

---

## 🚫 Revocación de Sesiones

### Revocar Todas las Sesiones de un Usuario
```typescript
await this.authService.revokeAllUserSessions(userId);
```

### Uso Automático
- ✅ Al cambiar contraseña (reset o change)
- ✅ Al detectar actividad sospechosa (manual)
- ✅ Al cerrar sesión en todos los dispositivos (manual)

### Verificación
```typescript
// En JwtStrategy, se valida automáticamente:
const session = await this.sessionModel.findOne({
  accessToken: payload.jti,
  isRevoked: false
});

if (!session) {
  throw new UnauthorizedException('Session revoked');
}
```

---

## 🧪 Testing

### Test Rate Limiting
```bash
# Probar límite de login (5 intentos / 15 min)
for i in {1..6}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# El 6to intento debe retornar 429
```

### Test Email Queue
```bash
# Registrar usuario y verificar que se encola el email
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"new@test.com",
    "password":"SecurePass123!",
    "firstName":"Test",
    "lastName":"User"
  }'

# Verificar logs del processor
# [Nest] ... Email sent successfully to new@test.com using template verification
```

### Test Email Verification
```bash
# Intentar acceder a ruta protegida sin verificar
curl -X GET http://localhost:3000/profile \
  -H "Authorization: Bearer <jwt_sin_verificar>"
# Debe retornar 403 Forbidden

# Verificar email
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"<verification_token>"}'

# Ahora debe permitir acceso
curl -X GET http://localhost:3000/profile \
  -H "Authorization: Bearer <jwt_verificado>"
```

### Test Password Reset
```bash
# Solicitar reset
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com"}'

# Usar token para resetear
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token":"<reset_token>",
    "newPassword":"NewSecure123!"
  }'

# Intentar usar un JWT antiguo (debe fallar)
curl -X GET http://localhost:3000/profile \
  -H "Authorization: Bearer <jwt_antiguo>"
# Debe retornar 401 Unauthorized (sesión revocada)
```

### Test Audit Logs
```bash
# Ver login fallidos (requiere admin)
curl -X GET "http://localhost:3000/audit/failed-logins?hours=24" \
  -H "Authorization: Bearer <admin_jwt>"

# Ver estadísticas
curl -X GET "http://localhost:3000/audit/stats?hours=24" \
  -H "Authorization: Bearer <admin_jwt>"
```

---

## 🐛 Debugging

### Verificar Redis
```bash
# Conectar a Redis
redis-cli

# Ver todas las keys
KEYS *

# Ver sesiones
KEYS session:*

# Ver rate limits
KEYS rl:*

# Ver jobs de Bull
KEYS bull:email:*

# Limpiar todas las keys (CUIDADO en producción!)
FLUSHALL
```

### Logs de Bull Processor
```bash
# En development, el processor logea todos los emails
[Nest] ... Processing email job 12345 for user@example.com
[Nest] ... [MOCK] Email sent to user@example.com - Subject: Verifica tu cuenta
```

### Verificar Auditoría
```bash
# Conectar a MongoDB
mongosh

# Usar base de datos
use bsk_mt

# Ver logs de auditoría
db.audit_logs.find().sort({timestamp: -1}).limit(10).pretty()

# Contar login fallidos en última hora
db.audit_logs.countDocuments({
  action: 'login',
  status: 'failure',
  timestamp: { $gte: new Date(Date.now() - 60*60*1000) }
})
```

---

## 📚 Referencias

- **Documentación completa**: [FASE_2_COMPLETED.md](./FASE_2_COMPLETED.md)
- **Setup inicial**: [COOKIE_AUTH_SETUP.md](./COOKIE_AUTH_SETUP.md)
- **Bull Queue**: https://docs.nestjs.com/techniques/queues
- **Throttler**: https://docs.nestjs.com/security/rate-limiting

---

## ⚡ Comandos Útiles

```bash
# Compilar
npm run build

# Desarrollo
npm run start:dev

# Producción
npm run start:prod

# Generar llaves RSA
npm run generate:keys

# Tests
npm run test
npm run test:e2e

# Linter
npm run lint
npm run format
```

---

## 🎯 Checklist de Producción

Antes de deploying a producción:

- [ ] Configurar SMTP real (no usar MOCK)
- [ ] Configurar variables de entorno en servidor
- [ ] Redis en servidor dedicado (no localhost)
- [ ] MongoDB con réplicas
- [ ] Configurar HTTPS (cookies secure: true)
- [ ] Configurar CORS correctamente
- [ ] Rate limiting ajustado a tráfico esperado
- [ ] Logs de auditoría con retención apropiada
- [ ] Monitoreo de Bull Dashboard
- [ ] Alertas para login fallidos masivos
- [ ] Backup de base de datos
- [ ] Certificados SSL válidos
- [ ] DNS configurado para FRONTEND_URL
- [ ] Health checks configurados

---

**¡Listo para usar!** 🚀
