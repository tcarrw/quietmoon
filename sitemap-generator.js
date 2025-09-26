/*!
 * sitemap-generator.js
 * MIT License — generate a simple sitemap.xml for a static site
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const OUTFILE = path.join(ROOT, "sitemap.xml");
const BASE_URL = (process.env.BASE_URL || "https://quietmoon.plnt.earth").replace(/\/+$/,"");

const EXCLUDE_DIRS = new Set([".git", "node_modules", ".dist", "dist", "build", ".github"]);
const INCLUDE_EXT = new Set([".html"]);

// crawl filesystem for .html paths
function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    if (e.name.startsWith(".")) {
      // still allow .well-known under root
      if (e.name !== ".well-known") continue;
    }
    const full = path.join(dir, e.name);
    const rel = path.relative(ROOT, full);
    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name)) continue;
      files = files.concat(walk(full));
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (INCLUDE_EXT.has(ext)) files.push(rel);
    }
  }
  return files;
}

function toUrl(relPath) {
  let webPath = relPath.split(path.sep).join("/");
  if (webPath.toLowerCase() === "index.html") return `${BASE_URL}/`;
  // normalize index files in subfolders to folder URL as well, but include the file URL too
  return `${BASE_URL}/${encodeURI(webPath)}`;
}

function priorityFor(url) {
  return url === `${BASE_URL}/` ? "1.0" : "0.7";
}

function sitemap(urls) {
  const rows = urls.map(u => {
    return `  <url>
    <loc>${u}</loc>
    <changefreq>weekly</changefreq>
    <priority>${priorityFor(u)}</priority>
  </url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
}

(function main(){
  const files = walk(ROOT);
  // include both folder URL (for /index.html) and file URL (for subpage .html)
  const urls = new Set();
  for (const rel of files) {
    const url = toUrl(rel);
    urls.add(url);
    // add folder URL for .../index.html
    if (rel.toLowerCase().endsWith("/index.html")) {
      const folder = url.replace(/index\.html$/i,"");
      const clean = folder.endsWith("/") ? folder : folder + "/";
      urls.add(clean);
    }
  }
  const xml = sitemap(Array.from(urls).sort());
  fs.writeFileSync(OUTFILE, xml, "utf8");
})();
