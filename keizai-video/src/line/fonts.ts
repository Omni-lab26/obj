import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

loadFont({
  family: "Shippori Mincho",
  url: staticFile("fonts/ShipporiMincho-Medium.ttf"),
  weight: "500",
});
loadFont({
  family: "Shippori Mincho",
  url: staticFile("fonts/ShipporiMincho-ExtraBold.ttf"),
  weight: "800",
});
loadFont({
  family: "Noto Sans JP",
  url: staticFile("fonts/NotoSansJP.ttf"),
  weight: "100 900",
});
