// Replaces the build id placeholder in out/sw.js so each deploy gets a fresh cache name.
import { readFileSync, writeFileSync } from "node:fs";

const file = "out/sw.js";
const id = Date.now().toString(36);
writeFileSync(file, readFileSync(file, "utf8").replace("__BUILD_ID__", id));
console.log(`sw.js stamped with build id ${id}`);
