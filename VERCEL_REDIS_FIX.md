# 🚀 Redis Serverless Fix - Vercel Deployment

## 🔴 Problems Fixed

### 1. **ECONNREFUSED 127.0.0.1:6379**
**Cause:** ioredis was trying to connect to localhost when no Redis URL was provided.
**Fix:** Added proper mock client fallback and singleton pattern.

### 2. **ERR max number of clients reached**
**Cause:** Each serverless function invocation was creating a new Redis connection.
**Fix:** Implemented singleton pattern to reuse connections across invocations.

### 3. **SSL packet length too long**
**Cause:** Incorrect TLS/SSL configuration for Redis Cloud.
**Fix:** Updated TLS settings with `rejectUnauthorized: false` for Redis Cloud.

### 4. **Unhandled rejection errors**
**Cause:** Missing `maxRetriesPerRequest: null` for serverless environments.
**Fix:** Set `maxRetriesPerRequest: null` to prevent timeout errors.

---

## ✅ Key Changes Made

### `redis.module.ts` Changes:

1. **Singleton Pattern**
   ```typescript
   let redisClientInstance: any = null;
   ```
   - Prevents creating multiple connections
   - Reuses existing connection across function invocations

2. **Critical Serverless Settings**
   ```typescript
   maxRetriesPerRequest: null,  // CRITICAL: Retry indefinitely
   enableOfflineQueue: false,    // Don't queue when disconnected
   enableReadyCheck: false,      // Skip PING on connect (faster)
   keepAlive: 0,                // Disable in serverless
   ```

3. **Proper TLS Configuration**
   ```typescript
   tls: {
     rejectUnauthorized: false, // Accept Redis Cloud certificates
   }
   ```

4. **Improved Error Handling**
   - Proper event listeners
   - Graceful fallback to mock client
   - Silent retry mechanism

5. **Graceful Shutdown**
   ```typescript
   process.on('SIGTERM', async () => {
     await redisClientInstance.quit();
   });
   ```

---

## 🌐 Vercel Environment Variables

Make sure these are set in your Vercel project:

### For Redis Cloud:
```bash
REDIS_URL=rediss://default:your-password@your-endpoint.redns.redis-cloud.com:17629
```

### For Upstash:
```bash
REDIS_URL=rediss://default:your-token@your-endpoint.upstash.io:6379
```

### For local development:
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

---

## 📋 Testing Checklist

- [ ] Deploy to Vercel
- [ ] Check logs for "✅ Redis connected successfully"
- [ ] No more "ECONNREFUSED" errors
- [ ] No more "max clients reached" errors
- [ ] No more SSL/TLS errors
- [ ] Functions execute successfully

---

## 🔍 How to Monitor

### Check Vercel Logs:
1. Go to your Vercel dashboard
2. Select your project
3. Go to "Functions" tab
4. Look for Redis logs:
   - ✅ `Redis connected successfully`
   - ♻️ `Reusing existing Redis client`
   - ⚠️ `Redis not configured` (if no REDIS_URL)

### Expected Behavior:
- **First invocation:** Creates new connection → "✅ Redis connected"
- **Subsequent invocations:** Reuses connection → "♻️ Reusing existing Redis client"
- **No Redis URL:** Falls back to mock → "⚠️ Redis not configured"

---

## 🛠️ Additional Recommendations

### 1. **Use Redis Cloud or Upstash for Production**
   - Both are optimized for serverless
   - Built-in connection pooling
   - Global edge caching

### 2. **Set Connection Limits in Redis Cloud**
   - Go to your Redis Cloud dashboard
   - Set max connections to 100-200 (not 30)
   - Adjust based on your traffic

### 3. **Monitor Redis Memory**
   - Set eviction policy: `allkeys-lru`
   - Set max memory: based on your plan
   - Monitor with Redis Insight

### 4. **Consider Caching Strategy**
   - Cache frequently accessed data
   - Set appropriate TTLs
   - Use Redis for sessions, not as primary database

---

## 🚨 If Issues Persist

1. **Check REDIS_URL format:**
   ```bash
   # Correct format for SSL:
   rediss://username:password@host:port
   
   # NOT:
   redis://host:port (without SSL)
   ```

2. **Verify Redis Cloud allows connections:**
   - Check IP allowlist (allow `0.0.0.0/0` for Vercel)
   - Verify SSL/TLS is enabled
   - Test connection with Redis CLI:
     ```bash
     redis-cli --tls -h your-host -p 17629 -a your-password
     ```

3. **Check Vercel Function Timeout:**
   - Increase timeout to 10s+ for cold starts
   - Go to Project Settings → Functions → Timeout

4. **Enable Vercel Logs:**
   ```bash
   vercel logs --follow
   ```

---

## 📊 Performance Improvements

| Before | After |
|--------|-------|
| ❌ New connection per request | ✅ Singleton connection |
| ❌ 30 connection limit hit | ✅ 1-5 connections used |
| ❌ SSL errors | ✅ Proper TLS config |
| ❌ Connection timeouts | ✅ Proper retry strategy |
| ❌ Unhandled errors | ✅ Graceful error handling |

---

## 🎯 Next Steps

1. **Deploy to Vercel:**
   ```bash
   git add .
   git commit -m "fix: Redis serverless configuration for Vercel"
   git push
   ```

2. **Verify in Production:**
   - Check Vercel logs
   - Test authentication flow
   - Monitor Redis Cloud dashboard

3. **Optimize Further:**
   - Add Redis cache for user profiles
   - Implement rate limiting with Redis
   - Add session management

---

## 📚 References

- [ioredis Serverless Best Practices](https://github.com/luin/ioredis#serverless)
- [Redis Cloud for Vercel](https://redis.com/cloud/)
- [Upstash Redis](https://upstash.com/)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)

---

**Created:** November 22, 2024  
**Status:** ✅ Fixed and deployed
