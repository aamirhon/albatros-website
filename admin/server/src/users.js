"use strict";
const fs = require("fs");
const path = require("path");
const { USERS_PATH, ADMIN_EMAILS } = require("./config");

// Users are stored in a gitignored JSON file so password hashes never enter git.
// Shape: [{ id, name, email, passwordHash, role, createdAt, sessionVersion }]
//
// sessionVersion is embedded in every issued token (`sv` claim). Bumping it
// invalidates all of that user's existing sessions immediately (logout,
// password change, "revoke sessions"). Deleting a user from this file also
// kills their sessions at once, because every request re-reads the user here.

function loadUsers() {
  if (!fs.existsSync(USERS_PATH)) return [];
  try {
    const raw = fs.readFileSync(USERS_PATH, "utf8").trim();
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("[users] failed to read users.json:", err.message);
    return [];
  }
}

// Atomic write (temp file + rename) with owner-only permissions: the file
// holds password hashes and must not be readable by other OS users.
function saveUsers(users) {
  const tmp = path.join(path.dirname(USERS_PATH), `.users.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(users, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, USERS_PATH);
  try {
    fs.chmodSync(USERS_PATH, 0o600);
  } catch {
    /* not supported on some filesystems (e.g. Windows); best effort */
  }
}

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return EMAIL_RE.test(normEmail(email));
}

// Why a stored account may not be used, or null if it may. Accounts that are
// not well-formed (e.g. an "email" without @) or not on the ADMIN_EMAILS
// allow-list are refused at login and on every request.
function whyDisallowed(user) {
  if (!user || typeof user.id !== "string" || typeof user.passwordHash !== "string") {
    return "повреждённая запись";
  }
  if (!isValidEmail(user.email)) return "email некорректен";
  if (ADMIN_EMAILS.length && !ADMIN_EMAILS.includes(normEmail(user.email))) {
    return "нет в ADMIN_EMAILS";
  }
  return null;
}

function findByEmail(email) {
  const target = normEmail(email);
  return loadUsers().find((u) => normEmail(u.email) === target);
}

function findById(id) {
  if (!id) return undefined;
  return loadUsers().find((u) => u.id === id);
}

function sessionVersionOf(user) {
  return Number.isInteger(user.sessionVersion) ? user.sessionVersion : 0;
}

// Invalidates every existing session of the given user. Returns true if found.
function bumpSessionVersion(id) {
  const users = loadUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return false;
  user.sessionVersion = sessionVersionOf(user) + 1;
  saveUsers(users);
  return true;
}

module.exports = {
  loadUsers,
  saveUsers,
  normEmail,
  isValidEmail,
  whyDisallowed,
  findByEmail,
  findById,
  sessionVersionOf,
  bumpSessionVersion,
  USERS_PATH,
};
