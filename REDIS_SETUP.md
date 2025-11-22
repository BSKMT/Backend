# Redis Setup for Production on Vercel

## Problem
Your application is trying to connect to Redis at `127.0.0.1:6379` (localhost), which doesn't exist in Vercel's serverless environment. This causes the errors you're seeing.

## Solution Options

### Option 1: Redis Cloud (Redis Labs) ⭐ **TU PREFERENCIA**

Redis Cloud es la solución oficial de Redis Labs, robusta y confiable para producción.

**🚀 Guía Rápida:** Ver `REDIS_CLOUD_QUICK.md` para setup en 5 minutos
**📖 Guía Completa:** Ver `REDIS_CLOUD_SETUP.md` para detalles completos

#### Quick Setup:
1. Ve a https://cloud.redis.io/
2. Crea cuenta gratis
3. Crea base de datos (Free: 30MB)
4. Copia endpoint, port y password
5. Construye URL: `rediss://default:PASSWORD@ENDPOINT:PORT`
6. Agrega a Vercel como `REDIS_URL`

**Pricing:** Free tier con 30MB storage y 30 conexiones concurrentes

---

### Option 2: Upstash Redis (Alternativa para Vercel)

Upstash is a serverless Redis service that works perfectly with Vercel's edge/serverless environment.

#### Setup Steps:

1. **Create Upstash Account**
   - Go to https://upstash.com
   - Sign up for free account
   - Create a new Redis database

2. **Get Connection URL**
   - Copy the `UPSTASH_REDIS_REST_URL` from Upstash dashboard
   - Or use the regular Redis URL format

3. **Add to Vercel Environment Variables**
   ```bash
   REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
   ```

4. **Deploy**
   - Push changes to GitHub
   - Vercel will auto-deploy with new environment variables

**Pricing:** Free tier includes 10,000 commands/day

---

### Option 2: Redis Cloud (Redis Labs)

1. Go to https://redis.com/try-free/
2. Create a free account
3. Create a new database
4. Copy the connection string
5. Add to Vercel:
   ```bash
   REDIS_URL=redis://default:password@your-endpoint.redis.cloud:port
   ```

**Pricing:** Free tier with 30MB storage

---

### Option 3: Vercel KV (Native Vercel Solution)

Vercel has its own KV (Key-Value) storage powered by Upstash.

1. In Vercel dashboard, go to your project
2. Navigate to Storage → Create → KV Database
3. Vercel automatically injects environment variables
4. **Note:** You'll need to update code to use Vercel KV SDK instead of ioredis

**Pricing:** Hobby plan includes 256MB free

---

### Option 4: Disable Redis (Development/Testing Only)

If you don't need Redis features temporarily:

**In Vercel Environment Variables, set:**
```bash
# Leave REDIS_URL empty or unset
# The app will use in-memory fallback
```

**⚠️ Warning:** This means:
- No distributed rate limiting
- No session sharing across serverless instances
- Cache won't persist between deployments
- Not recommended for production

---

## Quick Fix for Vercel Deployment

### Step 1: Add Environment Variable in Vercel

1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add new variable:
   - **Name:** `REDIS_URL`
   - **Value:** (leave empty for now, or use one of the services above)
   - **Environments:** Production, Preview, Development

### Step 2: Redeploy

The updated code will now:
- ✅ Detect missing Redis configuration
- ✅ Use in-memory fallback gracefully
- ✅ Log warnings instead of crashing
- ✅ Continue working without Redis

---

## Recommended Setup for BSK Motorcycle Team

Given your application's needs, I recommend **Upstash Redis**:

1. **Sign up at Upstash:** https://upstash.com
2. **Create database:** 
   - Name: `bsk-mt-production`
   - Region: Choose closest to your users
   - Type: Regional (for better performance)

3. **Copy connection string** and add to Vercel:
   ```bash
   REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
   ```

4. **Verify connection** after deployment:
   - Check Vercel logs
   - Look for `✅ Redis connected successfully`

---

## Testing Redis Connection

After setup, test your connection:

```bash
# Check your API health endpoint
curl https://your-backend.vercel.app/api/v1/health

# Should show Redis status
```

---

## Environment Variables Checklist

Make sure these are set in Vercel:

- [ ] `REDIS_URL` - Connection string (or leave empty for fallback)
- [ ] `MONGODB_URI` - Your MongoDB connection
- [ ] `JWT_SECRET` - Your JWT secret
- [ ] Other required variables from your `.env.local`

---

## Support

- **Upstash Docs:** https://docs.upstash.com/redis
- **Vercel KV Docs:** https://vercel.com/docs/storage/vercel-kv
- **Redis Cloud:** https://docs.redis.com/latest/

---

## Current Status After This Fix

✅ Your app will now:
- Work without Redis (in-memory fallback)
- Not crash on deployment
- Log proper warnings
- Be ready to connect to Redis when you add `REDIS_URL`

🔧 Next step: Choose a Redis provider and add `REDIS_URL` to Vercel environment variables.
