# 🔑 Tus URLs de Redis Cloud para BSK MT

## Información de tu Base de Datos

```
Database name: database-BSKMT
Endpoint: redis-17307.c266.us-east-1-3.ec2.cloud.redislabs.com
Port: 17307
Password: FUc5mFiTNfq1clqnhLcD1yEQuH5IFt4V
```

---

## 🎯 USA ESTA URL ⭐ (Actualizado con SSL correcto)

```bash
rediss://default:FUc5mFiTNfq1clqnhLcD1yEQuH5IFt4V@redis-17307.c266.us-east-1-3.ec2.cloud.redislabs.com:17307
```

### ✅ Tu Redis Cloud tiene:
- **SSL/TLS habilitado** (rediss://)
- **Protocolo RESP3**
- **Versión 8.2**
- **Todas las capacidades avanzadas**

### 🔧 Actualización del código:
El código ya está actualizado para manejar correctamente los certificados TLS de Redis Cloud.

---

## 🔓 Opción 2: SIN SSL (Usa esto si la Opción 1 falla)

```bash
redis://default:FUc5mFiTNfq1clqnhLcD1yEQuH5IFt4V@redis-17307.c266.us-east-1-3.ec2.cloud.redislabs.com:17307
```

### ✅ Usar si:
- La Opción 1 da errores de SSL
- Tu plan FREE de Redis Cloud no incluye SSL
- Ves "✅ Redis connected successfully" con esta URL

---

## 📝 Pasos para Probar

### 1. Prueba Local (Recomendado)

**Crea `.env.local` en tu carpeta Backend:**

```env
# Prueba primero con SSL (rediss://)
REDIS_URL=rediss://default:FUc5mFiTNfq1clqnhLcD1yEQuH5IFt4V@redis-17307.c266.us-east-1-3.ec2.cloud.redislabs.com:17307
```

**Ejecuta:**
```powershell
cd "c:\Users\USUARIO.DESKTOP-64OMC89\Documents\Pagina\Backend"
npm run start:dev
```

**Resultado Esperado:**
```
✅ Redis connected successfully
```

**Si ves errores de SSL:**
Cambia a la Opción 2 (sin SSL) en `.env.local`:
```env
REDIS_URL=redis://default:FUc5mFiTNfq1clqnhLcD1yEQuH5IFt4V@redis-17307.c266.us-east-1-3.ec2.cloud.redislabs.com:17307
```

---

### 2. Deploy a Vercel

Una vez que funcione localmente:

1. **Vercel Dashboard → Settings → Environment Variables**
2. **Add New Variable:**
   - **Name:** `REDIS_URL`
   - **Value:** La URL que funcionó en local (con o sin SSL)
   - **Environments:** ✅ Production ✅ Preview ✅ Development
3. **Save**
4. **Redeploy:**
   ```powershell
   git add .
   git commit -m "fix: Redis Cloud connection with proper SSL handling"
   git push
   ```

---

## 🔍 Verificar SSL en Redis Cloud

1. Ve a tu dashboard: https://cloud.redis.io/
2. Selecciona tu database: `database-BSKMT`
3. Busca "Security" o "TLS/SSL" en la configuración
4. **Si dice "Disabled" o "Not Available":**
   - Usa Opción 2 (sin SSL): `redis://`
5. **Si dice "Enabled":**
   - Usa Opción 1 (con SSL): `rediss://`

---

## 🆘 Troubleshooting

### Error: "packet length too long"
**Causa:** Estás usando `rediss://` pero SSL no está habilitado
**Solución:** Usa `redis://` (sin SSL - Opción 2)

### Error: "ECONNREFUSED 127.0.0.1:6379"
**Causa:** Redis no está configurado o URL incorrecta
**Solución:** 
1. Verifica que `REDIS_URL` esté en `.env.local` o Vercel
2. Verifica que la URL esté correcta (copia/pega de aquí)
3. Redeploy/restart

### Error: "Authentication failed"
**Causa:** Password incorrecto
**Solución:** Copia exactamente: `FUc5mFiTNfq1clqnhLcD1yEQuH5IFt4V`

### Funciona local pero no en Vercel
**Causa:** Variable no está en Vercel o está mal escrita
**Solución:** 
1. Verifica que `REDIS_URL` esté en Vercel (exactamente ese nombre)
2. Redeploy DESPUÉS de agregar la variable
3. Verifica los logs de Vercel

---

## ✅ Checklist Final

- [ ] Código actualizado (con soporte SSL mejorado)
- [ ] Probado localmente con `.env.local`
- [ ] URL correcta identificada (con o sin SSL)
- [ ] Variable agregada en Vercel
- [ ] Deployed y verificado en logs

---

## 📊 Resultado Esperado en Logs

**✅ Éxito:**
```
✅ Redis module initialized
✅ Redis connected successfully
✅ Application started on port 3000
```

**❌ Todavía sin Redis (pero funcionando):**
```
⚠️  Redis not configured - using in-memory fallback
✅ Application started on port 3000
```

---

**Siguiente paso:** Prueba localmente primero para determinar cuál URL usar (con o sin SSL) 🚀
