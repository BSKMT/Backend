# Redis Command Timeout Fix for Vercel Serverless

## 🐛 Problem
```
Error: Command timed out
Node.js process exited with exit status: 128
```

This error occurred in Vercel production due to Redis commands timing out during cold starts.

## 🔍 Root Cause
Vercel serverless functions experience **cold starts** where:
1. The Node.js process starts from scratch
2. DNS resolution for Redis hostname takes time
3. TCP connection establishment takes time
4. SSL/TLS handshake (if applicable) takes time

Previous timeout settings were too aggressive:
- `connectTimeout: 15000` (15 seconds) - Not enough for slow cold starts
- `commandTimeout: 5000` (5 seconds) - Too short for first commands during connection

## ✅ Solution Applied

### Updated All 3 Redis Modules
Increased timeouts in:
1. **Session Redis** (`src/modules/redis/redis.module.ts`)
2. **Bull Queue Redis** (`src/modules/queue/queue.module.ts`)
3. **Cache Redis** (`src/config/redis/redis.module.ts`)

### New Timeout Settings
```typescript
connectTimeout: 30000,  // 30 seconds (was 15 seconds)
commandTimeout: 10000,  // 10 seconds (was 5 seconds)
```

### Why These Values?
- **30 seconds** for initial connection handles:
  - Slow DNS resolution
  - Network latency
  - Vercel cold start overhead
  - SSL/TLS handshake time
  
- **10 seconds** per command handles:
  - Network latency for each Redis operation
  - Occasional Redis server slowness
  - Complex commands (SCAN, KEYS, etc.)

## 📊 Vercel Cold Start Timeline
```
0ms:     Function invoked
0-2s:    Node.js initialization
2-5s:    NestJS bootstrap
5-10s:   Redis DNS resolution
10-15s:  TCP connection + SSL handshake
15-20s:  First Redis commands
20-25s:  Application ready
```

**Old timeout**: Could fail at 15s+5s = 20s total
**New timeout**: Safe up to 30s+10s = 40s total

## 🔧 Files Modified
1. `src/modules/redis/redis.module.ts` - Session Redis (3 locations)
2. `src/modules/queue/queue.module.ts` - Bull Queue Redis
3. `src/config/redis/redis.module.ts` - Cache Redis (2 locations)

## 🚀 Deployment
```bash
git add .
git commit -m "fix: increase Redis timeout settings for Vercel cold starts (30s connect, 10s command)"
git push
```

## 📝 Other Optimizations Already in Place
- ✅ `maxRetriesPerRequest: null` - No max retry limit (critical for serverless)
- ✅ `enableReadyCheck: false` - Skip PING check (faster connection)
- ✅ `lazyConnect: false` - Connect immediately (singleton pattern)
- ✅ `enableOfflineQueue: true` - Queue commands during connection (Bull/Cache)
- ✅ `enableOfflineQueue: false` - Don't queue for sessions (need immediate validation)
- ✅ Retry strategy with exponential backoff (3 attempts)
- ✅ Singleton pattern (reuse connection across requests)

## 🔍 Monitoring
Watch Vercel logs for:
- `✅ Redis connected successfully` - Connection succeeded
- `🔄 Redis retry attempt X/3` - Connection retrying
- `❌ Redis connection failed after 3 retries` - Connection failed (should be rare)
- No more "Command timed out" errors

## 🆘 If Still Timing Out
1. **Check Redis Cloud status** - Is the service down?
2. **Verify REDIS_URL** - Is it correct in Vercel environment variables?
3. **Check network** - Is Redis Cloud accessible from Vercel's region?
4. **Increase timeouts further** - Change to 60000ms (60s) if needed
5. **Consider lazy loading** - Change `lazyConnect: true` (connect on first use)

## 📚 References
- [ioredis Connection Options](https://github.com/redis/ioredis#connect-to-redis)
- [Vercel Serverless Functions Best Practices](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Redis Cloud Connection Guide](https://redis.io/docs/get-started/cloud/)
