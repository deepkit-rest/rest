const fs = require("fs");
const pathLib = require("path");

function rename(dirPath, replaceFrom, replaceTo) {
  const names = fs.readdirSync(dirPath);
  names.forEach((name) => {
    const path = pathLib.join(dirPath, name);
    const stat = fs.statSync(path);
    const newPath = pathLib.join(dirPath, name.replace(replaceFrom, replaceTo));
    if (path == newPath) return;
    if (stat.isDirectory()) rename(path, replaceFrom, replaceTo);
    console.debug(`${path} -> ${newPath}`);
    fs.renameSync(path, newPath);
  });
}

const [, , ...args] = process.argv;

rename(...args);
