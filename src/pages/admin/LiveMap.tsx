// Owner / manager: where field staff are right now, and any staff member's route for a day.
import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RefreshCw } from 'lucide-react';
import { trackingApi, type LiveAgent, type AgentRoute } from '@/api/collections';
import { usersApi } from '@/api/users';
import type { User } from '@/models/types';
import { todayInIndia } from '@/lib/subscription';
import { showError } from '@/utils/toast';
import { tr } from '@/lib/lt';

const DEFAULT_CENTER: L.LatLngTuple = [12.6921, 79.9762]; // Chengalpattu
const STALE_MINUTES = 15;
const REFRESH_SECONDS = 60;

const hhmm = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
const ago = (m: number | null) => (m == null ? tr('no location yet') : m < 1 ? tr('just now') : tr('{{m}} min ago', { m }));

const LiveMap = () => {
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const liveLayer = useRef<L.LayerGroup | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);

  const [agents, setAgents] = useState<LiveAgent[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [routeUser, setRouteUser] = useState<string>('');
  const [routeDate, setRouteDate] = useState(todayInIndia());
  const [route, setRoute] = useState<AgentRoute | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // Create the map once
  useEffect(() => {
    if (!mapEl.current || map.current) return;
    map.current = L.map(mapEl.current).setView(DEFAULT_CENTER, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current);
    liveLayer.current = L.layerGroup().addTo(map.current);
    routeLayer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const loadLive = useCallback(async () => {
    try {
      setAgents(await trackingApi.live());
      setUpdatedAt(new Date());
    } catch (err) {
      showError(err instanceof Error ? err.message : tr('Could not load live locations'));
    }
  }, []);

  useEffect(() => {
    loadLive();
    usersApi.getAll().then((u) => setStaff(u.filter((x) => x.role === 'employee'))).catch(() => undefined);
    const id = window.setInterval(loadLive, REFRESH_SECONDS * 1000);
    return () => window.clearInterval(id);
  }, [loadLive]);

  // Draw live markers
  useEffect(() => {
    const layer = liveLayer.current;
    if (!layer || !map.current) return;
    layer.clearLayers();
    const points: L.LatLngTuple[] = [];
    agents.forEach((a) => {
      if (a.latitude == null || a.longitude == null) return;
      const stale = (a.minutesSinceLastSeen ?? 999) > STALE_MINUTES;
      const p: L.LatLngTuple = [a.latitude, a.longitude];
      points.push(p);
      L.circleMarker(p, {
        radius: 10, weight: 3, color: '#fff', fillOpacity: 1, fillColor: stale ? '#9ca3af' : '#16a34a',
      })
        .bindTooltip(`${a.name} · ${ago(a.minutesSinceLastSeen)}`, { permanent: true, direction: 'top', offset: [0, -10] })
        .addTo(layer);
    });
    if (points.length && !fitted.current && !route) {
      map.current.fitBounds(L.latLngBounds(points).pad(0.3), { maxZoom: 16 });
      fitted.current = true;
    }
  }, [agents, route]);

  // Draw a route
  useEffect(() => {
    const layer = routeLayer.current;
    if (!layer || !map.current) return;
    layer.clearLayers();
    if (!route) return;
    const line: L.LatLngTuple[] = route.points.map((p) => [p.lat, p.lng]);
    if (line.length) {
      L.polyline(line, { color: '#2563eb', weight: 4, opacity: 0.8 }).addTo(layer);
      L.circleMarker(line[0], { radius: 6, color: '#2563eb', fillOpacity: 1 }).bindTooltip(`Start ${hhmm(route.points[0].at)}`).addTo(layer);
    }
    route.collections.forEach((c) => {
      if (c.lat == null || c.lng == null) return;
      L.circleMarker([c.lat, c.lng], { radius: 8, color: '#fff', weight: 2, fillOpacity: 1, fillColor: c.status === 'cancelled' ? '#9ca3af' : '#f59e0b' })
        .bindPopup(`<b>${c.customer}</b><br/>₹${Number(c.amount)} · ${c.method.toUpperCase()}<br/>${hhmm(c.at)} · ${c.receiptNo}`)
        .addTo(layer);
      line.push([c.lat, c.lng]);
    });
    if (line.length) map.current.fitBounds(L.latLngBounds(line).pad(0.2), { maxZoom: 17 });
  }, [route]);

  const showRoute = async () => {
    if (!routeUser) return;
    try {
      setRoute(await trackingApi.route(Number(routeUser), routeDate));
    } catch (err) {
      showError(err instanceof Error ? err.message : tr('Could not load the route'));
    }
  };

  const onDuty = agents.length;
  const total = route?.collections.filter((c) => c.status === 'valid').reduce((s, c) => s + Number(c.amount), 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">{tr('Live Map')}</h1>
          <p className="text-sm text-muted-foreground">
            {tr('{{n}} on duty', { n: onDuty })} · {tr('updated {{time}}', { time: updatedAt ? hhmm(updatedAt.toISOString()) : '—' })} · {tr('refreshes every minute')}
          </p>
        </div>
        <button type="button" onClick={loadLive} className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg border border-border">
          <RefreshCw className="w-4 h-4" /> {tr('Refresh')}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3">
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground mb-1">{tr('Staff')}</span>
          <select value={routeUser} onChange={(e) => setRouteUser(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm min-w-[160px]">
            <option value="">{tr('Choose…')}</option>
            {staff.map((u) => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground mb-1">{tr('Date')}</span>
          <input type="date" value={routeDate} max={todayInIndia()} onChange={(e) => setRouteDate(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm" />
        </label>
        <button type="button" onClick={showRoute} disabled={!routeUser}
          className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">{tr('Show route')}</button>
        {route && (
          <>
            <span className="text-sm text-muted-foreground">
              {tr('{{n}} points', { n: route.points.length })} · {tr('{{n}} collections', { n: route.collections.length })} · ₹{total.toLocaleString('en-IN')}
            </span>
            <button type="button" onClick={() => setRoute(null)} className="h-9 px-3 rounded-lg border border-border text-sm">{tr('Clear')}</button>
          </>
        )}
      </div>

      <div ref={mapEl} className="h-[60vh] min-h-[360px] w-full rounded-xl border border-border overflow-hidden z-0" />

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-600" /> Location in last {STALE_MINUTES} min</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400" /> Older (app closed or GPS off)</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500" /> {tr('Collection')}</span>
      </div>

      {agents.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border text-sm">
          {agents.map((a) => (
            <li key={a.userId} className="flex justify-between gap-2 px-3 py-2">
              <span>{a.name} <span className="text-xs text-muted-foreground">since {hhmm(a.onDutySince)}</span></span>
              <span className={(a.minutesSinceLastSeen ?? 999) > STALE_MINUTES ? 'text-muted-foreground' : 'text-green-700'}>
                {ago(a.minutesSinceLastSeen)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LiveMap;
