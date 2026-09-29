"use strict";
// CLI: create an admin user (bcrypt-hashed) in the gitignored users.json.
// Usage (interactive, recommended): npm run adduser
// Usage (args):                     npm run adduser -- "Said" said@albatros.uz "mypassword"
// Passing the password as an argument leaves it in shell history — prefer the
// interactive prompt.
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { loadUsers, saveUsers, normEmail, USERS_PATH } = require("../src/users");
const { ask, createRl, passwordProblem } = require("./prompt");

async function main() {
  const [argName, argEmail, argPassword] = process.argv.slice(2);
  const rl = createRl();

  const name = argName || (await ask(rl, "Имя: "));
  const email = normEmail(argEmail || (await ask(rl, "Email: ")));
  const password = argPassword || (await ask(rl, "Пароль: ", { silent: true }));
  rl.close();

  if (!name || !email || !password) {
    console.error("Ошибка: имя, email и пароль обязательны.");
    process.exit(1);
  }
  const problem = passwordProblem(password);
  if (problem) {
    console.error("Ошибка: " + problem);
    process.exit(1);
  }
  if (argPassword) {
    console.warn("Внимание: пароль передан аргументом и остался в истории команд shell.");
  }

  const users = loadUsers();
  if (users.some((u) => normEmail(u.email) === email)) {
    console.error(`Ошибка: пользователь с email ${email} уже существует.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  users.push({
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash,
    role: "admin",
    createdAt: new Date().toISOString(),
    sessionVersion: 0,
  });
  saveUsers(users);

  console.log(`\nПользователь создан: ${name} <${email}>`);
  console.log(`Хранится в: ${USERS_PATH} (в .gitignore, в git не попадает).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
