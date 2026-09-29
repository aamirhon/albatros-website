"use strict";
const fs = require("fs");
const path = require("path");

// Brute-force protection for POST /api/auth/login plus an append-only log of
// every login attempt. In-memory counters are enough for a single-process
// admin panel; a restart simply resets them.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_IP = 10; // per client IP per window
const MAX_FAILS_PER_EMAIL = 30; // per target account per window (distributed guessing)

const fails = new Map(); // key -> { count, first }

function entry(key) {
  const now = Date.now();
  const e = fails.get(key);
  if (!e || now - e.first > WINDOW_MS) return null;
  return e;
}

// Returns seconds until the caller may try again, or 0 if allowed.
function retryAfter(ip, email) {
  const now = Date.now();
  let wait = 0;
  for (const [key, max] of [
    [`ip:${ip}`, MAX_FAILS_PER_IP],
    [`email:${email}`, MAX_FAILS_PER_EMAIL],
  ]) {
    const e = entry(key);
    if (e && e.count >= max) wait = Math.max(wait, Math.ceil((e.first + WINDOW_MS - now) / 1000));
  }
  return wait;
}

function recordFailure(ip, email) {
  const now = Date.now();
  for (const key of [`ip:${ip}`, `email:${email}`]) {
    const e = entry(key);
    if (e) e.count += 1;
    else fails.set(key, { count: 1, first: now });
  }
}

function recordSuccess(ip, email) {
  fails.delete(`ip:${ip}`);
  fails.delete(`email:${email}`);
}

setInterval(() => {
  const now = Date.now();
  for (const [key, e] of fails) if (now - e.first > WINDOW_MS) fails.delete(key);
}, 60 * 1000).unref();

// ── auth log ──
// One JSON line per attempt in admin/server/auth.log (gitignored via *.log,
// owner-only permissions). Useful to see who logged in, when and from where.
const LOG_PATH = path.join(__dirname, "..", "auth.log");

function logAuth(event, req, email, extra = {}) {
  const line = {
    time: new Date().toISOString(),
    event,
    email,
    ip: req.ip,
    ua: String(req.headers["user-agent"] || "").slice(0, 200),
    ...extra,
  };
  const text = JSON.stringify(line);
  console.log(`[auth] ${text}`);
  try {
    fs.appendFileSync(LOG_PATH, text + "\n", { encoding: "utf8", mode: 0o600 });
  } catch (err) {
    console.error("[auth] failed to write auth.log:", err.message);
  }
}

module.exports = { retryAfter, recordFailure, recordSuccess, logAuth };
