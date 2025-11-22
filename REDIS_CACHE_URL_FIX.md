# ✅ REDIS FINAL FIX - Cache URL Parsing Issue

## 📋 Summary
**Date:** November 22, 2025  
**Issue:** Cache Redis module was trying to connect to `127.0.0.1:6379` (localhost) despite `REDIS_URL` being configured. Also had duplicate `expiresAt` index in `session.schema.ts`.

---

## 🐛 Root Causes

### 1. cache-manager-ioredis URL Parsing Bug
The `cache-manager-ioredis` library **does NOT parse URLs correctly** when you pass `url: redisUrl` directly.

**What was happening:**
```typescript
// ❌ WRONG: Library doesn't parse URL, falls back to 127.0.0.1:6379
return {
  store: redisStore,
  url: 'rediss://default:password@host:6379', // Library ignores this!
  tls: { ... },
}
```

**Error in logs:**
```
[ioredis] Unhandled error event: Error: connect ECONNREFUSED 127.0.0.1:6379
```

### 2. Duplicate Mongoose Index on expiresAt
The `session.schema.ts` had **two indexes on the same field**:
- Line 62: `SessionSchema.index({ expiresAt: 1 });`
- Line 66: `SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });` (TTL index)

**Warning in logs:**
```
[MONGOOSE] Warning: Duplicate schema index on {"expiresAt":1} found
```

---

## ✅ Solutions Implemented

### Fix 1: Parse Redis URL Manually for Cache Module
**File:** `Backend/src/config/redis/redis.module.ts`

**Before:**
```typescript
if (useSSL) {
  return {
    store: redisStore as any,
    url: redisUrl, // ❌ Library doesn't parse this!
    ttl: 60 * 5,
    tls: { ... },
  };
}
```

**After:**
```typescript
// Parse Redis URL to get connection details
// cache-manager-ioredis doesn't parse URLs correctly, so we must extract manually
const parsedUrl = new URL(redisUrl);
const cacheConfig: any = {
  store: redisStore as any,
  host: parsedUrl.hostname,        // ✅ Explicit host
  port: parseInt(parsedUrl.port) || (useSSL ? 6380 : 6379), // ✅ Explicit port
  ttl: 60 * 5,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  enableReadyCheck: false,
  lazyConnect: false,
  connectTimeout: 15000,
  retryStrategy: (times: number) => { ... },
};

// Add password if present
if (parsedUrl.password) {
  cacheConfig.password = parsedUrl.password;
}

// Add username if present (for ACL)
if (parsedUrl.username && parsedUrl.username !== 'default') {
  cacheConfig.username = parsedUrl.username;
}

// For SSL connections (Redis Cloud, Upstash)
if (useSSL) {
  cacheConfig.tls = {
    rejectUnauthorized: false,
    servername: parsedUrl.hostname,
  };
}

return cacheConfig;
```

**Key changes:**
- ✅ Manually extract `host`, `port`, `password`, `username` from URL
- ✅ Pass individual parameters instead of `url`
- ✅ Conditionally add `tls` config for SSL connections
- ✅ Keep `enableOfflineQueue: true` for queuing during connection

### Fix 2: Remove Duplicate expiresAt Index
**File:** `Backend/src/modules/auth/entities/session.schema.ts`

**Before:**
```typescript
SessionSchema.index({ userId: 1 });
SessionSchema.index({ accessToken: 1 });
SessionSchema.index({ refreshToken: 1 });
SessionSchema.index({ expiresAt: 1 }); // ❌ Duplicate!
SessionSchema.index({ isRevoked: 1 });

// TTL index
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // ❌ Also indexes expiresAt!
```

**After:**
```typescript
SessionSchema.index({ userId: 1 });
SessionSchema.index({ accessToken: 1 });
SessionSchema.index({ refreshToken: 1 });
// SessionSchema.index({ expiresAt: 1 }); // REMOVED: duplicate (TTL index below)
SessionSchema.index({ isRevoked: 1 });

// TTL index - MongoDB eliminará automáticamente las sesiones expiradas
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // ✅ Only this one needed
```

---

## 📊 Current Redis Architecture

Your application now has **3 separate Redis connections**:

### 1. Session Redis (src/modules/redis/)
- **Purpose:** User sessions, device tracking, login attempts
- **Pattern:** Singleton client
- **Config:** `enableOfflineQueue: false` (sessions need immediate response)
- **Serverless:** `maxRetriesPerRequest: null`

### 2. Bull Queue Redis (src/modules/queue/)
- **Purpose:** Async email jobs (welcome, verification, security alerts)
- **Pattern:** Bull job queue
- **Config:** `enableOfflineQueue: true` (can queue jobs while connecting)
- **Serverless:** `maxRetriesPerRequest: null`
- **URL Parsing:** ✅ Properly extracts host/port/password from REDIS_URL

### 3. Cache Redis (src/config/redis/)
- **Purpose:** General application caching
- **Pattern:** NestJS Cache Manager with cache-manager-ioredis
- **Config:** `enableOfflineQueue: true` (can queue ops while connecting)
- **Serverless:** `maxRetriesPerRequest: null`
- **URL Parsing:** ✅ **NOW FIXED** - Properly extracts host/port/password from REDIS_URL

---

## 🧪 Testing Steps

### 1. Local Testing
```bash
# Make sure REDIS_URL is set in .env
npm run start:dev
```

**Expected logs (SUCCESS):**
```
✅ Database module initialized
✅ Redis module initialized
✅ Redis cache enabled - using REDIS_URL (SSL: true)
🔌 Connecting to Redis (SSL: enabled)...
✅ Bull Queue enabled - using REDIS_URL (SSL: true)
✅ Redis connected successfully
[No ECONNREFUSED 127.0.0.1:6379 errors]
[No Mongoose duplicate index warnings for expiresAt]
```

### 2. Test User Login (Triggers All 3 Redis Modules)
```bash
# POST /api/v1/auth/login
# Expected:
# - Session Redis: Stores session
# - Bull Queue: Queues security alert email
# - Cache Redis: Caches user data (if implemented)
# - No "Stream isn't writeable" errors
# - No "ECONNREFUSED" errors
```

### 3. Deploy to Vercel
```bash
git add .
git commit -m "fix: parse Redis URL manually for cache-manager-ioredis, remove duplicate expiresAt index"
git push
```

### 4. Check Vercel Logs
**Success indicators:**
- ✅ `Redis cache enabled - using REDIS_URL (SSL: true)`
- ✅ `Redis connected successfully`
- ✅ `Bull Queue enabled - using REDIS_URL (SSL: true)`
- ✅ No `ECONNREFUSED 127.0.0.1:6379`
- ✅ No `SSL packet length too long`
- ✅ No Mongoose duplicate index warnings

---

## 🔑 Key Learnings

### 1. cache-manager-ioredis Quirk
The library **does NOT parse URLs** when you pass `url` parameter. You **MUST** extract and pass individual connection parameters (`host`, `port`, `password`, `username`, `tls`).

### 2. Different Redis Use Cases Need Different Config
- **Sessions:** `enableOfflineQueue: false` (need immediate response)
- **Job Queues:** `enableOfflineQueue: true` (can wait, queue jobs)
- **Cache:** `enableOfflineQueue: true` (can wait, queue operations)

### 3. Serverless Requirement
ALL Redis connections need `maxRetriesPerRequest: null` for Vercel serverless functions.

### 4. TTL Indexes Include Regular Index
When you create a TTL index like `{ expiresAt: 1 }, { expireAfterSeconds: 0 }`, MongoDB automatically creates a regular index on that field. Don't duplicate it!

---

## 📚 Related Documentation
- `VERCEL_REDIS_FIX.md` - Initial Redis connection fixes
- `REDIS_QUEUE_FIX.md` - Bull Queue SSL configuration
- `MONGOOSE_REDIS_FIX.md` - Mongoose duplicate index fixes
- `REDIS_EXPLICACION.md` - Redis usage explanation

---

## ✅ Checklist
- [x] Fixed cache-manager-ioredis URL parsing (manual extraction)
- [x] Removed duplicate `expiresAt` index in `session.schema.ts`
- [x] Verified build compiles successfully
- [ ] Test locally with `npm run start:dev`
- [ ] Test user login (triggers all 3 Redis modules)
- [ ] Deploy to Vercel
- [ ] Verify no `ECONNREFUSED` or `SSL packet length` errors in production logs

---

## 🎯 Expected Outcome
After this fix:
1. ✅ **No more `ECONNREFUSED 127.0.0.1:6379`** - Cache module uses correct host/port from REDIS_URL
2. ✅ **No more SSL packet errors** - All modules properly configure TLS for Redis Cloud
3. ✅ **No duplicate Mongoose warnings** - Only one `expiresAt` index per schema
4. ✅ **All 3 Redis modules connect successfully** to remote Redis Cloud instance
5. ✅ **Email queueing works** without "Stream isn't writeable" errors

---

**Status:** ✅ READY FOR TESTING
