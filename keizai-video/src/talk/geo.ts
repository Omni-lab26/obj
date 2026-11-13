import { geoAlbers, geoEquirectangular, geoGraticule10, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import usTopo from "us-atlas/states-10m.json";
import worldTopo from "world-atlas/countries-50m.json";
import cityRows from "./cities.json";
import lakesJson from "./lakes.json";

// Shapes: Natural Earth (public domain) via world-atlas / us-atlas, plus its lakes and populated places.
const us = usTopo as unknown as Topology;
const world = worldTopo as unknown as Topology;
const states = feature(
  us,
  us.objects.states as GeometryCollection,
) as FeatureCollection<Geometry>;
const countries = feature(
  world,
  world.objects.countries as GeometryCollection,
) as FeatureCollection<Geometry>;
const lakes = lakesJson as unknown as FeatureCollection<Geometry>;
const graticule = geoGraticule10();

export type LonLat = [number, number];
export type XY = { x: number; y: number };
/** x, y on the unzoomed map, and a brightness weight */
export type Light = { x: number; y: number; w: number };

const OUTSIDE = new Set(["02", "15", "60", "66", "69", "72", "78"]);
const lower48: FeatureCollection<Geometry> = {
  type: "FeatureCollection",
  features: states.features.filter((f) => !OUTSIDE.has(String(f.id))),
};
const pick = (ids: string[]): FeatureCollection<Geometry> => ({
  type: "FeatureCollection",
  features: countries.features.filter((f) => ids.includes(String(f.id))),
});
const cities = cityRows as number[][];
const weight = (pop: number) => Math.min(1, Math.sqrt(pop / 9000000));

// --- North America, on the conic projection normally used for the United States ---
const usProjection = geoAlbers().fitExtent(
  [
    [190, 150],
    [1730, 900],
  ],
  lower48,
);
const usPath = geoPath(usProjection);
export const US = {
  graticule: usPath(graticule) ?? "",
  neighbours: usPath(pick(["124", "484", "192", "044"])) ?? "",
  land: usPath(lower48) ?? "",
  borders:
    usPath(
      mesh(us, us.objects.states as GeometryCollection, (a, b) => a !== b),
    ) ?? "",
  lakes: usPath(lakes) ?? "",
  ohio: usPath(states.features.find((f) => f.id === "39")!) ?? "",
  focus: "",
  lights: cities
    .filter(([lon, lat]) => lon < -60 && lon > -130 && lat > 22 && lat < 53)
    .map(([lon, lat, pop]): Light => {
      const p = usProjection([lon, lat])!;
      return { x: p[0], y: p[1], w: weight(pop) };
    }),
  labels: [
    { at: [-98, 55.5] as LonLat, text: "カナダ" },
    { at: [-103.5, 25.3] as LonLat, text: "メキシコ" },
    { at: [-70.5, 32.5] as LonLat, text: "大西洋" },
  ],
  point: ([lon, lat]: LonLat): XY => {
    const p = usProjection([lon, lat])!;
    return { x: p[0], y: p[1] };
  },
};

// --- North Pacific, centred on 152°W so America and Japan share one frame ---
const SCALE = 600;
const pacProjection = geoEquirectangular()
  .rotate([152, 0])
  .scale(SCALE)
  .translate([960, 500 + SCALE * ((38 * Math.PI) / 180)]);
const pacPath = geoPath(pacProjection);
export const PACIFIC = {
  graticule: pacPath(graticule) ?? "",
  neighbours: "",
  land: pacPath(feature(world, world.objects.land as GeometryCollection)) ?? "",
  borders:
    pacPath(
      mesh(
        world,
        world.objects.countries as GeometryCollection,
        (a, b) => a !== b,
      ),
    ) ?? "",
  lakes: pacPath(lakes) ?? "",
  ohio: "",
  focus: pacPath(pick(["840", "392"])) ?? "",
  lights: cities
    .filter(([, , pop]) => pop >= 60000)
    .map(([lon, lat, pop]): Light => {
      const p = pacProjection([lon, lat])!;
      return { x: p[0], y: p[1], w: weight(pop) * 0.8 };
    })
    .filter((l) => l.x > -50 && l.x < 1970 && l.y > -50 && l.y < 1130),
  labels: [
    { at: [-160, 22] as LonLat, text: "太平洋" },
    { at: [-101, 31.5] as LonLat, text: "アメリカ" },
    { at: [131, 28.5] as LonLat, text: "日本" },
  ],
  point: ([lon, lat]: LonLat): XY => {
    const p = pacProjection([lon, lat])!;
    return { x: p[0], y: p[1] };
  },
};

export const PLACES = {
  ohio: [-82.99, 39.96] as LonLat,
  washington: [-77.04, 38.9] as LonLat,
  newYork: [-74.0, 40.71] as LonLat,
  tokyo: [139.76, 35.68] as LonLat,
};
