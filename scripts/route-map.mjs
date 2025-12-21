import fs from "fs";
import path from "path";

const APP_DIR = path.join(process.cwd(), "src", "app");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let out = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(full));
    if (e.isFile() && e.name === "page.tsx") out.push(full);
  }
  return out;
}

function toRoute(pageFile) {
  const relDir = path.relative(APP_DIR, path.dirname(pageFile));
  const parts = relDir
    .split(path.sep)
    .filter(Boolean)
    // (group) segmentleri URL’e girmez
    .filter(p => !(p.startsWith("(") && p.endsWith(")")));
  const url = "/" + parts.join("/");
  return url === "/" ? "/" : url;
}

const routes = walk(APP_DIR).map(toRoute).sort();

let md = `# QRStock Route Map\n\nToplam: ${routes.length}\n\n`;
for (const r of routes) md += `- \`${r}\`\n`;

fs.writeFileSync("ROUTE_MAP.md", md, "utf-8");
console.log("✅ ROUTE_MAP.md created");
