"use strict";
const fs = require("fs");
const path = require("path");
const { USERS_PATH } = require("./config");

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
  findByEmail,
  findById,
  sessionVersionOf,
  bumpSessionVersion,
  USERS_PATH,
};
