"use strict";
const express = require("express");
const { requireAuth } = require("../auth");
const { loadUsers, saveUsers, whyDisallowed, backupUsers } = require("../users");
const { readAuthLog, logAuth } = require("../loginGuard");
const { ADMIN_EMAILS, jwtSecretStatus } = require("../config");

// Security page: who has an account, which accounts are blocked, and the
// recent login/account-change log — so the panel owner can review access
// without shell access to the server.

const router = express.Router();

// GET /api/security -> accounts + recent auth events + protection status
router.get("/", requireAuth, (req, res) => {
  const accounts = loadUsers().map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt || null,
    passwordChangedAt: u.passwordChangedAt || null,
    blocked: whyDisallowed(u),
    you: u.id === req.user.sub,
  }));
  res.json({
    accounts,
    events: readAuthLog(300),
    status: {
      allowList: ADMIN_EMAILS,
      jwtSecret: jwtSecretStatus().startsWith("env") ? "env" : "generated",
    },
  });
});

// POST /api/security/prune -> delete every blocked account from users.json
// (backup first). The caller's own account is allowed by definition, so it
// can never be removed here.
router.post("/prune", requireAuth, (req, res) => {
  const users = loadUsers();
  const removed = users.filter((u) => whyDisallowed(u) && u.id !== req.user.sub);
  if (!removed.length) return res.json({ removed: [] });
  const backup = backupUsers();
  saveUsers(users.filter((u) => !removed.includes(u)));
  const emails = removed.map((u) => u.email);
  logAuth("users_pruned", req, req.user.email, { removed: emails, backup });
  res.json({ removed: emails });
});

module.exports = router;
