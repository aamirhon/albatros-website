"use strict";
// Shared readline prompts for the user-management CLIs.
const readline = require("readline");
const { passwordProblem, MIN_PASSWORD_LENGTH } = require("../src/users");

function ask(rl, question, { silent = false } = {}) {
  return new Promise((resolve) => {
    if (!silent) return rl.question(question, (a) => resolve(a.trim()));
    // Masked input for the password.
    process.stdout.write(question);
    const stdin = process.stdin;
    const onData = (char) => {
      const s = char.toString("utf8");
      if (s === "\n" || s === "\r" || s === "") {
        stdin.removeListener("data", onData);
      }
    };
    stdin.on("data", onData);
    rl._writeToOutput = () => process.stdout.write("*");
    rl.question("", (a) => {
      rl._writeToOutput = (str) => process.stdout.write(str);
      process.stdout.write("\n");
      resolve(a.trim());
    });
  });
}

function createRl() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

module.exports = { ask, createRl, passwordProblem, MIN_PASSWORD_LENGTH };
