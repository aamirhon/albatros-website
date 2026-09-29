"use strict";
const jwt = require("jsonwebtoken");
const { getJwtSecret, JWT_EXPIRES_IN, COOKIE_SECURE } = require("./config");
const { findById, sessionVersionOf, whyDisallowed } = require("./users");

const COOKIE_NAME = "alba_admin_token";

function issueToken(user) {
  // Only the user id and session version go in the token; name/email/role are
  // always re-read from users.json, so a deleted or changed account can't
  // keep acting on stale claims.
  return jwt.sign({ sub: user.id, sv: sessionVersionOf(user) }, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: JWT_EXPIRES_IN,
  });
}

// Accept the token from an httpOnly cookie (preferred) or a Bearer header.
function extractToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return null;
}

// Returns the live user record for a request's token, or null. A token is
// only honoured while its user still exists in users.json and its `sv` matches
// the user's current sessionVersion — so deleting a user, logging out, changing
// a password or revoking sessions takes effect on the very next request.
function userFromRequest(req) {
  const token = extractToken(req);
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
  } catch {
    return null;
  }
  if (typeof payload.sub !== "string" || !Number.isInteger(payload.sv)) return null;
  const user = findById(payload.sub);
  if (!user || sessionVersionOf(user) !== payload.sv) return null;
  if (whyDisallowed(user)) return null;
  return user;
}

function requireAuth(req, res, next) {
  const user = userFromRequest(req);
  if (!user) {
    res.clearCookie(COOKIE_NAME, cookieOptions(req));
    return res.status(401).json({ error: "Требуется вход в систему." });
  }
  // Same shape routes already use (req.user.sub/name/email/role).
  req.user = { sub: user.id, name: user.name, email: user.email, role: user.role };
  next();
}

function isSecureRequest(req) {
  if (COOKIE_SECURE === "true") return true;
  if (COOKIE_SECURE === "false") return false;
  return req.secure || req.headers["x-forwarded-proto"] === "https";
}

function cookieOptions(req) {
  return {
    httpOnly: true,
    // Admin UI and API share one origin in production; strict means the cookie
    // is never sent on cross-site requests (CSRF).
    sameSite: "strict",
    secure: isSecureRequest(req),
    path: "/",
  };
}

module.exports = {
  issueToken,
  requireAuth,
  userFromRequest,
  cookieOptions,
  isSecureRequest,
  COOKIE_NAME,
};
