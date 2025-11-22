# 🎯 Redis Cloud - Guía Rápida (5 Minutos)

## Paso 1: Crear Base de Datos
👉 https://cloud.redis.io/

```
1. Sign up / Log in
2. Click "New Database"
3. Selecciona:
   - Plan: FREE (30MB)
   - Provider: AWS
   - Region: us-east-1 (Virginia)
   - Name: bsk-mt-production
4. Click "Activate"
```

---

## Paso 2: Copiar Credenciales

En el dashboard de Redis Cloud verás:

```
Endpoint: redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com
Port: 12345
Password: Tu_Password_Aquí
```

---

## Paso 3: Construir URL

Combina la información así:

```
rediss://default:PASSWORD@ENDPOINT:PORT
```

**Ejemplo:**
```
rediss://default:AbC123@redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com:12345
```

> ⚠️ Usa `rediss://` (con doble 's') para SSL seguro

---

## Paso 4: Agregar a Vercel

1. Ve a tu proyecto en Vercel
2. **Settings → Environment Variables**
3. **Add New:**
   ```
   Name:  REDIS_URL
   Value: rediss://default:TU_PASSWORD@TU_ENDPOINT:TU_PORT
   ```
4. Selecciona: ✅ Production ✅ Preview ✅ Development
5. Click **Save**

---

## Paso 5: Redeploy

**Desde PowerShell:**
```powershell
git commit --allow-empty -m "feat: add Redis Cloud"
git push
```

**O desde Vercel Dashboard:**
- Deployments → ⋯ → Redeploy

---

## ✅ Verificar

**En logs de Vercel busca:**
```
✅ Redis connected successfully
```

**NOT:**
```
⚠️  Redis not configured - using in-memory fallback
```

---

## 🆘 ¿Problemas?

### Error de autenticación:
```powershell
# Verifica que la URL tenga este formato exacto:
rediss://default:PASSWORD@endpoint:port
#      ^^^^^ usuario siempre es "default"
#            ^^^^^^^^ tu password sin espacios
```

### Sigue sin conectar:
1. Verifica que `REDIS_URL` esté en Vercel
2. Haz redeploy DESPUÉS de agregar la variable
3. Revisa que la base de datos esté "Active" en Redis Cloud

---

## 📱 Contacto Redis Cloud

- **Dashboard:** https://cloud.redis.io/
- **Docs:** https://docs.redis.com/latest/
- **Status:** https://status.redislabs.com/

---

**¡Eso es todo!** Tu aplicación ya está configurada para usar Redis Cloud automáticamente. 🚀
