import { geoAlbersUsa, geoEquirectangular, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import usTopo from "us-atlas/states-10m.json";
import worldTopo from "world-atlas/countries-50m.json";

// Map shapes: Natural Earth (public domain) via world-atlas and us-atlas.
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

export type LonLat = [number, number];
export type XY = { x: number; y: number };

// --- United States (Albers), fitted to the frame ---
const usProjection = geoAlbersUsa().fitExtent(
  [
    [170, 120],
    [1750, 900],
  ],
  states,
);
const usPath = geoPath(usProjection);
export const US = {
  land: usPath(feature(us, us.objects.nation as GeometryCollection)) ?? "",
  borders:
    usPath(
      mesh(us, us.objects.states as GeometryCollection, (a, b) => a !== b),
    ) ?? "",
  ohio: usPath(states.features.find((f) => f.id === "39")!) ?? "",
  point: ([lon, lat]: LonLat): XY => {
    const p = usProjection([lon, lat]);
    if (!p) throw new Error(`Outside the US map: ${lon}, ${lat}`);
    return { x: p[0], y: p[1] };
  },
};

// --- North Pacific, centred on 150°W so America and Japan share one frame ---
const SCALE = 600;
const pacProjection = geoEquirectangular()
  .rotate([152, 0])
  .scale(SCALE)
  .translate([960, 500 + SCALE * ((38 * Math.PI) / 180)]);
const pacPath = geoPath(pacProjection);
const country = (id: string) =>
  pacPath(countries.features.find((f) => f.id === id)!) ?? "";
export const PACIFIC = {
  land: pacPath(feature(world, world.objects.land as GeometryCollection)) ?? "",
  borders:
    pacPath(
      mesh(
        world,
        world.objects.countries as GeometryCollection,
        (a, b) => a !== b,
      ),
    ) ?? "",
  usa: country("840"),
  japan: country("392"),
  point: ([lon, lat]: LonLat): XY => {
    const p = pacProjection([lon, lat]);
    if (!p) throw new Error(`Outside the Pacific map: ${lon}, ${lat}`);
    return { x: p[0], y: p[1] };
  },
};

export const PLACES = {
  ohio: [-82.99, 39.96] as LonLat,
  washington: [-77.04, 38.9] as LonLat,
  newYork: [-74.0, 40.71] as LonLat,
  tokyo: [139.76, 35.68] as LonLat,
};
