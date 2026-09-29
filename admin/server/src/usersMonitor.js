"use strict";
const fs = require("fs");
const { loadUsers, normEmail, whyDisallowed, USERS_PATH } = require("./users");
const { logEvent } = require("./loginGuard");

// Accounts can only be created by editing users.json on the server (there is
// no HTTP route for it). This makes any such change visible: the account list
// is logged at startup and every later change to the file is logged to
// auth.log with the added/removed emails, so an account that "appears" out of
// nowhere leaves a timestamped trace.

function snapshot() {
  return new Map(loadUsers().map((u) => [u.id, normEmail(u.email)]));
}

function describe(users) {
  return users.map((u) => {
    const why = whyDisallowed(u);
    return why ? `${u.email} (ЗАБЛОКИРОВАН: ${why})` : u.email;
  });
}

function checkPermissions() {
  try {
    const mode = fs.statSync(USERS_PATH).mode & 0o777;
    if (mode & 0o077) {
      console.warn(
        `[users] ВНИМАНИЕ: users.json доступен другим пользователям ОС (права ${mode.toString(8)}). ` +
          `Исправьте: chmod 600 "${USERS_PATH}"`
      );
    }
  } catch {
    /* file may not exist yet */
  }
}

function startUsersMonitor() {
  const users = loadUsers();
  logEvent("users_at_startup", { count: users.length, accounts: describe(users) });
  checkPermissions();

  let prev = snapshot();
  fs.watchFile(USERS_PATH, { interval: 5000 }, () => {
    const next = snapshot();
    const added = [...next].filter(([id]) => !prev.has(id)).map(([, e]) => e);
    const removed = [...prev].filter(([id]) => !next.has(id)).map(([, e]) => e);
    prev = next;
    logEvent("users_changed", {
      added,
      removed,
      accounts: describe(loadUsers()),
    });
    if (added.length) {
      console.warn(`[users] ВНИМАНИЕ: в users.json добавлены аккаунты: ${added.join(", ")}`);
    }
    checkPermissions();
  });
}

module.exports = { startUsersMonitor };
