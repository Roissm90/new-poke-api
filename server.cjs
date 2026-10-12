const express = require("express");
const path = require("node:path");
const { readFile } = require("node:fs/promises");
const { addSharePreview } = require("./scripts/share-preview.cjs");

const app = express();
const port = Number(process.env.PORT || 3000);
app.get(/^\/(?:index\.html|pages\/[a-z]+\.html)?$/, async (req, res, next) => {
  try {
    const filename = req.path === "/" ? "index.html" : req.path.slice(1);
    const html = await readFile(path.join(__dirname, filename), "utf8");
    const origin = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
    res.set("Cache-Control", "no-store").type("html").send(addSharePreview(html, { origin, pathname: req.path }));
  } catch (error) {
    if (error.code === "ENOENT") return next();
    next(error);
  }
});
app.use(express.static(path.join(__dirname), { dotfiles: "deny" }));
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Pokemon Atlas: http://localhost:${port}`);
});
server.on("error", (error) => {
  console.error(error.code === "EADDRINUSE"
    ? `Port ${port} is occupied. Use PORT=3001 npm run dev.`
    : error.message);
  process.exitCode = 1;
});