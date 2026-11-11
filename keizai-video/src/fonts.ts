import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Variable font: one file covers weights 100-900.
loadFont({
  family: "Noto Sans JP",
  url: staticFile("fonts/NotoSansJP.ttf"),
  weight: "100 900",
});
