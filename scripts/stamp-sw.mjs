// Stamps out/sw.js with a build id and the full precache list, so every page works offline after the first visit:
// every exported page (by its clean URL), its RSC payloads (client-side navigation), all of _next/static, the art and icons.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const url = (f) => "/" + f.slice("out/".length).split(sep).join("/");

const files = walk("out");
const pages = files
  .filter((f) => f.endsWith(".html") && !/(^|\/)(404|_not-found)\.html$/.test(url(f)))
  .map((f) => url(f).replace(/\.html$/, "").replace(/\/index$/, "/"))
  .map((u) => u || "/");
const rsc = files.filter((f) => f.endsWith(".txt")).map(url);
const statics = files.filter((f) => f.startsWith(join("out", "_next", "static"))).map(url);
const art = files.filter((f) => f.startsWith(join("out", "art")) && f.endsWith(".svg")).map(url);
const extras = ["/manifest.webmanifest", "/icon-192", "/icon-512", "/icon-512-maskable", "/favicon.ico"].filter((u) => files.includes(join("out", u.slice(1))));

const list = [...new Set([...pages, ...rsc, ...statics, ...art, ...extras])];
const bytes = list.reduce((n, u) => {
  try {
    return n + statSync(join("out", u === "/" ? "index.html" : u.endsWith("/") ? u + "index.html" : u)).size;
  } catch {
    return n + (() => { try { return statSync(join("out", u + ".html")).size; } catch { return 0; } })();
  }
}, 0);

const id = Date.now().toString(36);
const file = "out/sw.js";
writeFileSync(file, readFileSync(file, "utf8").replace("__BUILD_ID__", id).replace("__PRECACHE__", JSON.stringify(list)));
console.log(
  `sw.js stamped with build id ${id}: ${pages.length} pages, ${rsc.length} RSC payloads, ${statics.length} static files, ${art.length} art files (${(bytes / 1048576).toFixed(1)} MB)`,
);
