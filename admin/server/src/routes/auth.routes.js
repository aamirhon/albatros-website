"use strict";
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  loadUsers,
  saveUsers,
  findByEmail,
  normEmail,
  bumpSessionVersion,
  sessionVersionOf,
  whyDisallowed,
  passwordProblem,
} = require("../users");
const { issueToken, requireAuth, userFromRequest, cookieOptions, COOKIE_NAME } = require("../auth");
const { retryAfter, recordFailure, recordSuccess, logAuth } = require("../loginGuard");

const router = express.Router();

// Compared against when the email is unknown, so a wrong email takes as long
// as a wrong password and response timing doesn't reveal which accounts exist.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 12);

// POST /api/auth/login  { email, password } -> sets httpOnly cookie + returns user
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return res.status(400).json({ error: "Введите email и пароль." });
  }
  if (email.length > 254 || password.length > 256) {
    return res.status(400).json({ error: "Неверный email или пароль." });
  }
  const target = normEmail(email);

  const wait = retryAfter(req.ip, target);
  if (wait > 0) {
    logAuth("login_blocked", req, target, { retryAfter: wait });
    res.set("Retry-After", String(wait));
    return res.status(429).json({
      error: `Слишком много неудачных попыток. Повторите через ${Math.ceil(wait / 60)} мин.`,
    });
  }

  const user = findByEmail(target);
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  const disallowed = user && ok ? whyDisallowed(user) : null;
  if (!user || !ok || disallowed) {
    recordFailure(req.ip, target);
    const reason = !user ? "unknown_user" : !ok ? "bad_password" : `disallowed: ${disallowed}`;
    logAuth("login_failed", req, target, { reason });
    return res.status(401).json({ error: "Неверный email или пароль." });
  }

  recordSuccess(req.ip, target);
  logAuth("login_ok", req, target, { userId: user.id });
  const token = issueToken(user);
  const { exp } = jwt.decode(token);
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions(req),
    maxAge: Math.max(0, exp * 1000 - Date.now()),
  });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// POST /api/auth/logout -> clears the cookie and revokes the user's sessions
// server-side (a copied token stops working too, not just this browser's).
router.post("/logout", (req, res) => {
  const user = userFromRequest(req);
  if (user) {
    bumpSessionVersion(user.id);
    logAuth("logout", req, normEmail(user.email), { userId: user.id });
  }
  res.clearCookie(COOKIE_NAME, cookieOptions(req));
  res.json({ ok: true });
});

// POST /api/auth/password { currentPassword, newPassword }
// Changes the logged-in admin's password and ends all their other sessions
// (every other device/token is revoked); this browser gets a fresh session.
router.post("/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const users = loadUsers();
  const user = users.find((u) => u.id === req.user.sub);
  if (!user) return res.status(401).json({ error: "Требуется вход в систему." });

  const email = normEmail(user.email);
  const wait = retryAfter(req.ip, email);
  if (wait > 0) {
    res.set("Retry-After", String(wait));
    return res.status(429).json({ error: "Слишком много неудачных попыток. Повторите позже." });
  }
  const ok =
    typeof currentPassword === "string" &&
    currentPassword.length <= 256 &&
    (await bcrypt.compare(currentPassword, user.passwordHash));
  if (!ok) {
    recordFailure(req.ip, email);
    logAuth("password_change_failed", req, email, { userId: user.id });
    return res.status(400).json({ error: "Текущий пароль неверен." });
  }
  const problem = passwordProblem(newPassword);
  if (problem) return res.status(400).json({ error: "Новый " + problem });
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: "Новый пароль совпадает с текущим." });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.sessionVersion = sessionVersionOf(user) + 1;
  user.passwordChangedAt = new Date().toISOString();
  saveUsers(users);
  logAuth("password_changed", req, email, { userId: user.id });

  const token = issueToken(user);
  const { exp } = jwt.decode(token);
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions(req),
    maxAge: Math.max(0, exp * 1000 - Date.now()),
  });
  res.json({ ok: true });
});

// GET /api/auth/me -> current session (used by the UI to guard routes)
router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: { id: req.user.sub, name: req.user.name, email: req.user.email, role: req.user.role },
  });
});

module.exports = router;
