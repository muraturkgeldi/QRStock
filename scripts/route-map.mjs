
import fs from "fs";
import path from "path";

const APP_DIR = path.join(process.cwd(), "src", "app");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let results = [];

  for (const e of entries) {
    const full = path.join(dir, e.name);

    // route group ve private klasörleri dahil edebilirsin; burada filtre yok
    if (e.isDirectory()) results = results.concat(walk(full));

    if (e.isFile() && e.name === "page.tsx") results.push(full);
  }
  return results;
}

function toRoute(file) {
  const rel = path.relative(APP_DIR, path.dirname(file));
  // route group (parantez) segmentleri URL'e girmez
  const parts = rel.split(path.sep).filter(Boolean).filter(p => !(p.startsWith("(") && p.endsWith(")")));
  const url = "/" + parts.join("/");
  return url === "/" ? "/" : url;
}

const pages = walk(APP_DIR).map(toRoute).sort();

let md = `# QRStock Route Map\n\nToplam: ${pages.length} route\n\n`;
for (const r of pages) md += `- \`${r}\`\n`;

fs.writeFileSync("ROUTE_MAP.md", md, "utf-8");
console.log("✅ ROUTE_MAP.md oluşturuldu");
