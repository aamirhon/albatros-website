"use strict";
const path = require("path");
const fs = require("fs");
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

// JWT_SECRET is the key that signs every session. Anyone who knows it can mint
// a valid admin session without a password, so a missing, placeholder or short
// secret is a hard startup error rather than a silent insecure fallback. The
// placeholders below are public (they are in this repo), so they count as
// leaked.
const KNOWN_PUBLIC_SECRETS = new Set([
  "dev-insecure-secret-change-me",
  "CHANGE_ME_please_replace_with_a_long_random_secret",
]);
const MIN_SECRET_LENGTH = 32;

const JWT_SECRET = (process.env.JWT_SECRET || "").trim();

// Called by the server at startup (not at require time, so the user-management
// CLIs still work while .env is being fixed). With an empty secret
// jsonwebtoken refuses to sign/verify anyway, so auth fails closed regardless.
function assertStrongJwtSecret() {
  const s = JWT_SECRET;
  let problem = null;
  if (!s) problem = "JWT_SECRET не задан";
  else if (KNOWN_PUBLIC_SECRETS.has(s) || /change[_-]?me/i.test(s))
    problem = "JWT_SECRET — это публичный пример из репозитория";
  else if (s.length < MIN_SECRET_LENGTH)
    problem = `JWT_SECRET короче ${MIN_SECRET_LENGTH} символов`;
  if (problem) {
    console.error(
      `\n!!! [config] ${problem}. Сервер не запущен.\n` +
        "!!! Сгенерируйте секрет и впишите его в admin/server/.env:\n" +
        `!!!   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"\n`
    );
    process.exit(1);
  }
}

// Express "trust proxy": which hops may set X-Forwarded-For. The default
// "loopback" is right for a reverse proxy (nginx etc.) on the same machine and
// harmless without one (direct clients can't spoof their IP). Needed so the
// login rate limiter sees real client IPs instead of the proxy's.
function readTrustProxy() {
  const v = (process.env.TRUST_PROXY || "loopback").trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  return v;
}

module.exports = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  JWT_SECRET,
  assertStrongJwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "12h",
  TRUST_PROXY: readTrustProxy(),
  // "auto" (default): Secure cookie whenever the request came over HTTPS
  // (directly or via a proxy's X-Forwarded-Proto). "true"/"false" force it.
  COOKIE_SECURE: (process.env.COOKIE_SECURE || "auto").trim(),
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
  USERS_PATH: process.env.USERS_PATH
    ? path.resolve(process.env.USERS_PATH)
    : path.join(__dirname, "..", "users.json"),
  UPLOADS_TMP: path.join(__dirname, "..", "uploads-tmp"),
};
