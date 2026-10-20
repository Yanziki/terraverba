// Where a language is mainly spoken, for the map question: the outlines of its
// main countries (data/build_data.py, from CLDR) and its own Glottolog point.
// A click inside one of those countries is exactly right; otherwise the answer
// is as far off as the nearest edge of one, or the point, whichever is closer.
import { feature } from 'topojson-client';
import { geoContains, geoDistance } from 'd3-geo';
import { NUMERIC } from '../../content/iso-numeric.js';
import { EARTH_KM } from '../../data.js';

let outlines = null;
async function load() {
  if (!outlines) {
    const topo = (await import('world-atlas/countries-50m.json')).default;
    // several outlines can share a code (Australia and the Ashmore and Cartier
    // Islands are both 036), so a country is all of its outlines together
    outlines = new Map();
    for (const f of feature(topo, topo.objects.countries).features) {
      const key = f.id ?? f.properties.name;
      const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      const seen = outlines.get(key);
      if (seen) seen.geometry.coordinates.push(...polygons);
      else outlines.set(key, { type: 'Feature', id: key, geometry: { type: 'MultiPolygon', coordinates: [...polygons] } });
    }
  }
  return outlines;
}

// every outline vertex, to measure the distance to a country from outside it
function vertices(f) {
  const out = [];
  for (const polygon of f.geometry.coordinates) for (const ring of polygon) for (const p of ring) out.push(p);
  return out;
}

// which country a point is in (for "languages near me"), or null at sea
const A2 = {};
for (const [a2, n] of Object.entries(NUMERIC)) A2[n] ??= a2;
export async function countryAt(lat, lon) {
  const all = await load();
  for (const [key, f] of all) if (geoContains(f, [lon, lat])) return key === 'Kosovo' ? 'XK' : A2[key] ?? null;
  return null;
}

export async function areaOf(lang) {
  if (!lang.main?.length) return [];
  const all = await load();
  return lang.main
    .map((a2) => ({ a2, f: all.get(a2 === 'XK' ? 'Kosovo' : NUMERIC[a2]) }))
    .filter((x) => x.f)
    .map((x) => ({ ...x, pts: vertices(x.f) }));
}

// how far [lat, lon] is from the language: { km, to: [lat, lon], a2 }
export function measure(area, lang, [lat, lon]) {
  const at = [lon, lat];
  const inside = area.find((x) => geoContains(x.f, at));
  if (inside) return { km: 0, to: [lat, lon], a2: inside.a2 };
  let best = { km: geoDistance(at, [lang.lon, lang.lat]) * EARTH_KM, to: [lang.lat, lang.lon], a2: null };
  for (const x of area) {
    for (const p of x.pts) {
      const km = geoDistance(at, p) * EARTH_KM;
      if (km < best.km) best = { km, to: [p[1], p[0]], a2: x.a2 };
    }
  }
  return best;
}
