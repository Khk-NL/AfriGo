function createRateLimiter({ windowMs = 60_000, max = 120, prefix = 'api' } = {}) {
  const buckets = new Map();
  return function rateLimit(req, res, next) {
    const now = Date.now();
    const identity = req.user ? `user:${req.user.id}` : `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    const key = `${prefix}:${identity}`;
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    if (bucket.count > max) {
      res.status(429).json({ ok: false, message: '请求过于频繁，请稍后重试' });
      return;
    }
    if (buckets.size > 5000) {
      for (const [entryKey, entry] of buckets) if (entry.resetAt <= now) buckets.delete(entryKey);
    }
    next();
  };
}

module.exports = { createRateLimiter };
