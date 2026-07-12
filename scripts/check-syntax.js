const { execFileSync } = require("node:child_process");
const { readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");

const roots = ["src"];
const standaloneFiles = ["migrations.js", "create-admin-profile.js", "ecosystem.config.js"];

function javascriptFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? javascriptFiles(path) : path.endsWith(".js") ? [path] : [];
  });
}

const files = [...roots.flatMap(javascriptFiles), ...standaloneFiles];

for (const file of files) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

console.log(`Sintaxe validada em ${files.length} arquivos.`);
