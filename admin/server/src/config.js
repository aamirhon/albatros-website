"use strict";
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Repo root: where src/data/catalog.json and public/images live.
// admin/server/src/config.js -> ../../../ = repo root.
const DEFAULT_SITE_ROOT = path.resolve(__dirname, "..", "..", "..");
const SITE_ROOT = process.env.SITE_ROOT
  ? path.resolve(process.env.SITE_ROOT)
  : DEFAULT_SITE_ROOT;

// Fail fast if the resolved root does not look like the site repo.
const CATALOG_PATH = path.join(SITE_ROOT, "src", "data", "catalog.json");
const BRANDS_PATH = path.join(SITE_ROOT, "src", "data", "brands.json");
const PRODUCT_IMAGES_DIR = path.join(SITE_ROOT, "public", "images", "products");

if (!fs.existsSync(CATALOG_PATH)) {
  console.error(
    `[config] catalog.json not found at ${CATALOG_PATH}.\n` +
      `Set SITE_ROOT in admin/server/.env to the albatros-website repo root.`
  );
}

// users.json (and the other security state below) lives outside the app
// directory in production (USERS_PATH), because hosting redeploys replace the
// app directory on every push. Everything that must survive a redeploy is kept
// next to it.
const USERS_PATH = process.env.USERS_PATH
  ? path.resolve(process.env.USERS_PATH)
  : path.join(__dirname, "..", "users.json");
const STATE_DIR = path.dirname(USERS_PATH);

// JWT_SECRET is the key that signs every session. Anyone who knows it can mint
// a valid admin session without a password. The values below are public
// (they are in this repo), so they count as leaked. If the configured secret
// is missing, public or short, a strong random one is generated once and kept
// in STATE_DIR/.admin-jwt-secret (owner-only) — secure without anyone having
// to log into the server, and stable across restarts/redeploys.
const KNOWN_PUBLIC_SECRETS = new Set([
  "dev-insecure-secret-change-me",
  "CHANGE_ME_please_replace_with_a_long_random_secret",
]);
const MIN_SECRET_LENGTH = 32;
const SECRET_FILE = path.join(STATE_DIR, ".admin-jwt-secret");

function weakSecretReason(s) {
  if (!s) return "JWT_SECRET не задан";
  if (KNOWN_PUBLIC_SECRETS.has(s) || /change[_-]?me/i.test(s))
    return "JWT_SECRET — это публичный пример из репозитория";
  if (s.length < MIN_SECRET_LENGTH) return `JWT_SECRET короче ${MIN_SECRET_LENGTH} символов`;
  return null;
}

let jwtSecret = null;
let jwtSecretSource = null;

// Resolved lazily (first sign/verify or server startup), so the CLIs that
// only touch users.json never create the secret file.
function getJwtSecret() {
  if (jwtSecret) return jwtSecret;
  const fromEnv = (process.env.JWT_SECRET || "").trim();
  const problem = weakSecretReason(fromEnv);
  if (!problem) {
    jwtSecret = fromEnv;
    jwtSecretSource = "env";
    return jwtSecret;
  }
  try {
    const stored = fs.existsSync(SECRET_FILE) ? fs.readFileSync(SECRET_FILE, "utf8").trim() : "";
    if (!weakSecretReason(stored)) {
      jwtSecret = stored;
      jwtSecretSource = `file (${problem})`;
      return jwtSecret;
    }
    const generated = crypto.randomBytes(48).toString("hex");
    fs.writeFileSync(SECRET_FILE, generated + "\n", { encoding: "utf8", mode: 0o600 });
    jwtSecret = generated;
    jwtSecretSource = `generated file (${problem})`;
  } catch (err) {
    // Can't persist: still never fall back to a known value. Sessions just
    // won't survive a restart.
    jwtSecret = crypto.randomBytes(48).toString("hex");
    jwtSecretSource = `in-memory (${problem}; не удалось записать ${SECRET_FILE}: ${err.message})`;
  }
  return jwtSecret;
}

function jwtSecretStatus() {
  getJwtSecret();
  return jwtSecretSource;
}

// Express "trust proxy": which hops may set X-Forwarded-For. Default 1 = trust
// the single reverse proxy the hosting puts in front of the app (Hostinger),
// so the login rate limiter and auth.log see real client IPs. Override with
// TRUST_PROXY (e.g. "loopback", "false", a hop count).
function readTrustProxy() {
  const v = (process.env.TRUST_PROXY || "1").trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  return v;
}

// Allow-list of admin emails. Only these accounts can log in or keep a
// session, whatever else ends up in users.json. Defaults to the single company
// admin account; override with ADMIN_EMAILS (comma-separated), or "*" to allow
// every well-formed account in users.json.
function readAdminEmails() {
  const raw = process.env.ADMIN_EMAILS === undefined ? "admin@albatros.uz" : process.env.ADMIN_EMAILS;
  if (raw.trim() === "*") return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

module.exports = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  getJwtSecret,
  jwtSecretStatus,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "12h",
  TRUST_PROXY: readTrustProxy(),
  // "auto" (default): Secure cookie whenever the request came over HTTPS
  // (directly or via a proxy's X-Forwarded-Proto). "true"/"false" force it.
  COOKIE_SECURE: (process.env.COOKIE_SECURE || "auto").trim(),
  ADMIN_EMAILS: readAdminEmails(),
  STATE_DIR,
  // Off by default so local development stays commit-only, as before.
  AUTO_PUSH: process.env.AUTO_PUSH === "true",
  DEPLOY_BRANCH: process.env.DEPLOY_BRANCH || "deploy-website",
  SITE_ROOT,
  CATALOG_PATH,
  BRANDS_PATH,
  PRODUCT_IMAGES_DIR,
  // Phase 2 content sources (all plain JSON arrays + their asset folders).
  CLIENTS_PATH: path.join(SITE_ROOT, "src", "data", "clients.json"),
  CERTIFICATES_PATH: path.join(SITE_ROOT, "src", "data", "certificates.json"),
  EVENTS_PATH: path.join(SITE_ROOT, "src", "data", "events.json"),
  BRAND_IMAGES_DIR: path.join(SITE_ROOT, "public", "images", "brands"),
  CLIENT_IMAGES_DIR: path.join(SITE_ROOT, "public", "images", "clients"),
  CERT_IMAGES_DIR: path.join(SITE_ROOT, "public", "images", "certificates"),
  CERT_FILES_DIR: path.join(SITE_ROOT, "public", "files", "certificates"),
  EVENT_IMAGES_DIR: path.join(SITE_ROOT, "public", "images", "events"),
  PRICE_LIST_PATH: path.join(SITE_ROOT, "public", "price-list.pdf"),
  USERS_PATH,
  UPLOADS_TMP: path.join(__dirname, "..", "uploads-tmp"),
};
