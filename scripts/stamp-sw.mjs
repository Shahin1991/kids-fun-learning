// Stamps out/sw.js with a build id and the list of artwork files to precache.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

const art = walk("out/art").filter((f) => f.endsWith(".svg")).map((f) => "/" + f.slice("out/".length));
const id = Date.now().toString(36);
const file = "out/sw.js";
writeFileSync(file, readFileSync(file, "utf8").replace("__BUILD_ID__", id).replace("__PRECACHE_ART__", JSON.stringify(art)));
console.log(`sw.js stamped with build id ${id} and ${art.length} art files`);
