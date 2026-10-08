import {loadFont} from "@remotion/fonts";
import {staticFile} from "remotion";

export const SERIF = "Shippori Mincho";

// scripts/subset_font.py が作品で使う文字だけに絞った TTF を public/fonts に置く
loadFont({
  family: SERIF,
  url: staticFile("fonts/ShipporiMincho-400-subset.ttf"),
  weight: "400",
});
loadFont({
  family: SERIF,
  url: staticFile("fonts/ShipporiMincho-500-subset.ttf"),
  weight: "500",
});
