// Headless Chrome page that hosts the renderer at a given format/mode.
import {chromium} from "playwright-core";
import {serve} from "./serve.mjs";

const CANDIDATES = [
  process.env.CHROME_PATH,
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
].filter(Boolean);

export async function openRenderer({fmt = "16x9", mode = "normal", dir = "A", debug = false} = {}) {
  const {srv, url} = await serve();
  const fs = await import("node:fs");
  const exe = CANDIDATES.find((p) => fs.existsSync(p));
  const browser = await chromium.launch({executablePath: exe, args: ["--font-render-hinting=none", "--disable-lcd-text", "--force-color-profile=srgb"]});
  const sizes = {"16x9": [1920, 1080], "9x16": [1080, 1920], "1x1": [1080, 1080]};
  const [w, h] = sizes[fmt];
  const page = await browser.newPage({viewport: {width: w, height: h}, deviceScaleFactor: 1});
  page.on("pageerror", (e) => console.error("pageerror:", e.message));
  await page.goto(`${url}/index.html?fmt=${fmt}&mode=${mode}&dir=${dir}${debug ? "&debug=1" : ""}`);
  await page.evaluate(() => window.ready);
  const shot = async (t) => {
    await page.evaluate((tt) => window.seek(tt), t);
    return page.screenshot({clip: {x: 0, y: 0, width: w, height: h}, type: "png"});
  };
  const close = async () => { await browser.close(); srv.close(); };
  return {page, shot, close, w, h};
}
