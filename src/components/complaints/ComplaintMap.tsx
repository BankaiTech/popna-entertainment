// Maps for complaints: one closing point (with its GPS accuracy circle), or many fixed complaints.
// Labels are set as plain text (textContent), never as HTML, so names cannot inject markup.
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const googleMapsUrl = (lat: number | string, lng: number | string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${Number(lat)},${Number(lng)}`)}`;

/** A small text-only label for a tooltip. */
function textLabel(text: string): HTMLElement {
  const el = document.createElement('span');
  el.textContent = text;
  return el;
}

function useLeaflet(ref: React.RefObject<HTMLDivElement>) {
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    if (!ref.current || map.current) return;
    map.current = L.map(ref.current, { zoomControl: true, attributionControl: true }).setView([11.0, 78.5], 7);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    // The map may be drawn inside a dialog that is still animating open.
    const t = window.setTimeout(() => map.current?.invalidateSize(), 250);
    return () => {
      window.clearTimeout(t);
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, [ref]);
  return { map, layer };
}

export function PointMap({ lat, lng, accuracy, label, className = 'h-48' }: {
  lat: number; lng: number; accuracy?: number | null; label?: string; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { map, layer } = useLeaflet(ref);

  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    const p: L.LatLngTuple = [lat, lng];
    if (accuracy && accuracy > 0 && accuracy < 5000) {
      L.circle(p, { radius: accuracy, color: '#2563eb', weight: 1, fillOpacity: 0.12 }).addTo(layer.current);
    }
    const m = L.circleMarker(p, { radius: 9, weight: 3, color: '#fff', fillColor: '#16a34a', fillOpacity: 1 })
      .addTo(layer.current);
    if (label) m.bindTooltip(textLabel(label), { permanent: true, direction: 'top', offset: [0, -10] });
    map.current.setView(p, accuracy && accuracy > 300 ? 15 : 17);
  }, [lat, lng, accuracy, label, map, layer]);

  return <div ref={ref} className={`w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 z-0 ${className}`} />;
}

export interface MapPoint { id: number; lat: number; lng: number; label: string; color?: string }

export function PointsMap({ points, onPick, className = 'h-[60vh]' }: {
  points: MapPoint[]; onPick?: (id: number) => void; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { map, layer } = useLeaflet(ref);

  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    const all: L.LatLngTuple[] = [];
    points.forEach((pt) => {
      const p: L.LatLngTuple = [pt.lat, pt.lng];
      all.push(p);
      const m = L.circleMarker(p, { radius: 8, weight: 2, color: '#fff', fillColor: pt.color ?? '#16a34a', fillOpacity: 1 })
        .bindTooltip(textLabel(pt.label), { direction: 'top', offset: [0, -8] })
        .addTo(layer.current as L.LayerGroup);
      if (onPick) m.on('click', () => onPick(pt.id));
    });
    if (all.length) map.current.fitBounds(L.latLngBounds(all).pad(0.25), { maxZoom: 17 });
  }, [points, onPick, map, layer]);

  return <div ref={ref} className={`w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 z-0 ${className}`} />;
}
