/**
 * Remotion の CLI 設定。
 * All configuration options: https://remotion.dev/docs/config
 */
import fs from "node:fs";
import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setPublicDir("./public");

// この制作環境（クラウドコンテナ）には Chrome Headless Shell が同梱されている。
// 手元の PC では Remotion が自動でダウンロードするので、この分岐は使われない。
const localHeadless =
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
if (fs.existsSync(localHeadless)) {
  Config.setBrowserExecutable(localHeadless);
}
