"use strict";
// CLI: manage admin accounts in the gitignored users.json.
//
//   npm run users -- list
//   npm run users -- keep-only admin@albatros.uz      удалить всех, кроме указанного
//   npm run users -- remove said@albatros.uz          удалить один аккаунт
//   npm run users -- passwd admin@albatros.uz         сменить пароль (+ выход везде)
//   npm run users -- revoke admin@albatros.uz         завершить все сессии аккаунта
//   npm run users -- revoke --all                     завершить сессии всех аккаунтов
//
// Destructive commands ask for confirmation (skip with --yes) and first save a
// backup next to users.json (users.json.bak-<время>, owner-only, gitignored).
// Changes apply to the running server immediately: every request re-reads
// users.json, so removed accounts and revoked sessions are rejected at once.
const fs = require("fs");
const bcrypt = require("bcrypt");
const {
  loadUsers,
  saveUsers,
  normEmail,
  sessionVersionOf,
  whyDisallowed,
  USERS_PATH,
} = require("../src/users");
const { ask, createRl, passwordProblem } = require("./prompt");

const args = process.argv.slice(2);
const yes = args.includes("--yes");
const all = args.includes("--all");
const [cmd, emailArg] = args.filter((a) => !a.startsWith("--"));

function fail(msg) {
  console.error("Ошибка: " + msg);
  process.exit(1);
}

function backup() {
  if (!fs.existsSync(USERS_PATH)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = `${USERS_PATH}.bak-${stamp}`;
  fs.copyFileSync(USERS_PATH, dest);
  try {
    fs.chmodSync(dest, 0o600);
  } catch {
    /* best effort */
  }
  return dest;
}

function fmt(u) {
  const why = whyDisallowed(u);
  const flag = why ? `  ⚠ ЗАБЛОКИРОВАН: ${why}` : "";
  return `${u.email}  —  ${u.name}  (создан ${u.createdAt || "?"}, id ${u.id})${flag}`;
}

async function confirm(question) {
  if (yes) return true;
  if (!process.stdin.isTTY) fail("нужно подтверждение: добавьте --yes.");
  const rl = createRl();
  const a = await ask(rl, `${question} Введите yes для подтверждения: `);
  rl.close();
  return a.toLowerCase() === "yes";
}

function requireUser(users, email) {
  if (!email) fail("укажите email.");
  const user = users.find((u) => normEmail(u.email) === normEmail(email));
  if (!user) fail(`пользователь ${email} не найден.`);
  return user;
}

async function main() {
  const users = loadUsers();

  switch (cmd) {
    case "list": {
      console.log(`${USERS_PATH}: ${users.length} аккаунт(ов)`);
      users.forEach((u) => console.log("  " + fmt(u)));
      return;
    }

    case "keep-only": {
      const keep = requireUser(users, emailArg);
      const removed = users.filter((u) => u !== keep);
      if (!removed.length) {
        console.log(`Кроме ${keep.email} аккаунтов нет, удалять нечего.`);
        return;
      }
      console.log("Будут удалены:");
      removed.forEach((u) => console.log("  - " + fmt(u)));
      console.log("Останется:\n  + " + fmt(keep));
      if (!(await confirm(`Удалить ${removed.length} аккаунт(ов)?`))) return console.log("Отменено.");
      const bak = backup();
      saveUsers([keep]);
      console.log(`Готово. Удалено: ${removed.length}. Резервная копия: ${bak}`);
      console.log("Сессии удалённых аккаунтов уже недействительны.");
      return;
    }

    case "remove": {
      const user = requireUser(users, emailArg);
      console.log("Будет удалён:\n  - " + fmt(user));
      if (!(await confirm("Удалить аккаунт?"))) return console.log("Отменено.");
      const bak = backup();
      saveUsers(users.filter((u) => u !== user));
      console.log(`Готово. Резервная копия: ${bak}`);
      return;
    }

    case "passwd": {
      const user = requireUser(users, emailArg);
      if (!process.stdin.isTTY) fail("смена пароля только в интерактивном терминале.");
      const rl = createRl();
      const p1 = await ask(rl, "Новый пароль: ", { silent: true });
      const p2 = await ask(rl, "Повторите пароль: ", { silent: true });
      rl.close();
      if (p1 !== p2) fail("пароли не совпадают.");
      const problem = passwordProblem(p1);
      if (problem) fail(problem);
      user.passwordHash = await bcrypt.hash(p1, 12);
      user.sessionVersion = sessionVersionOf(user) + 1;
      user.passwordChangedAt = new Date().toISOString();
      backup();
      saveUsers(users);
      console.log(`Пароль ${user.email} изменён. Все его сессии завершены.`);
      return;
    }

    case "revoke": {
      const targets = all ? users : [requireUser(users, emailArg)];
      targets.forEach((u) => {
        u.sessionVersion = sessionVersionOf(u) + 1;
      });
      saveUsers(users);
      console.log(`Сессии завершены: ${targets.map((u) => u.email).join(", ") || "нет аккаунтов"}.`);
      return;
    }

    default:
      console.log(
        [
          "Команды:",
          "  npm run users -- list",
          "  npm run users -- keep-only <email> [--yes]",
          "  npm run users -- remove <email> [--yes]",
          "  npm run users -- passwd <email>",
          "  npm run users -- revoke <email> | --all",
        ].join("\n")
      );
      if (cmd) process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
