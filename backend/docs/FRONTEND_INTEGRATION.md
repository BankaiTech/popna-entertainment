# Connecting the React app (LCO Desk frontend)

## 0. Environment
```
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://127.0.0.1:8000/api      # production: https://api.lcodesk.in/api
VITE_APP_NAME=LCO Desk
```

## 1. Works with no code change
- `POST /auth/login` → `{access, refresh}` and `GET /auth/me` → `role` is mapped to what the app expects
  (`superadmin` / `admin` / `employee`). The precise role is in `lco_role`.
- `GET/POST/PATCH /contacts` → same field names as `mapContactToCustomer` (`connection_type`, `package`,
  `status: "Active"`, nested `address`, `payment_status`, `balance_amount`, `collected_by_username`).
  Creating a customer accepts either `plan_id` or `connection_type` + `package`.

## 2. Must change

### 2.1 Payments (replace "update customer payment fields")
Payment status is no longer stored on the customer. Each collection is its own record.

```ts
// src/api/payments.ts
export async function collectPayment(customerId: number, amount: number, method: 'cash' | 'upi') {
  const pos = await getPosition();                       // see 2.3
  const res = await apiClient.post('/payments', {
    customer_id: customerId, amount, method,
    latitude: pos?.lat, longitude: pos?.lng, accuracy: pos?.accuracy,
  });
  return res.data;   // { receipt_no, collected_at, collected_by_name, ... }
}
```
Errors come back as `{ duty: [...] }`, `{ location: [...] }` or `{ amount: [...] }` — show them as toasts.

### 2.2 Agent duty screen (new)
- Buttons: **Start duty** → `POST /tracking/check-in`, **End duty** → `POST /tracking/check-out`
  (both need `latitude`, `longitude`, `accuracy`).
- On load: `GET /tracking/status` to show the right button.
- While on duty and the app is open, send a ping every 2 minutes:

```ts
// src/hooks/useDutyTracking.ts
import { useEffect } from 'react';
import apiClient from '@/lib/apiClient';

export function useDutyTracking(onDuty: boolean) {
  useEffect(() => {
    if (!onDuty || !('geolocation' in navigator)) return;
    const send = () => navigator.geolocation.getCurrentPosition(
      (p) => apiClient.post('/tracking/ping', {
        latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy,
      }).catch(() => {}),
      () => {}, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
    send();
    const id = window.setInterval(send, 120_000);
    return () => window.clearInterval(id);
  }, [onDuty]);
}
```
Limit: browsers pause this when the app is closed or the screen is off. Every payment still saves GPS, which
is the strongest proof. For true background tracking later: wrap the app with Capacitor for Android.

### 2.3 Getting GPS once
```ts
export function getPosition(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null), { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}
```

### 2.4 Owner live map (new page)
- `GET /tracking/live` every 60 seconds → markers with name + "last seen X min ago".
- `GET /tracking/route?user_id=5&date=2026-11-02` → polyline from `points`, pins from `collections`.
- Use **Leaflet + OpenStreetMap** (free). Avoid Google Maps until you need it (paid after free usage).

### 2.5 Settings
- **Remove the SMS API key / URL form** from `SmsTemplates.tsx`. The key now lives only on the server.
- Operator SMS & reminder options: `GET/PATCH /organizations/{organization_id}` with the fields listed in the
  backend README (section 8).
- SMS history: `GET /sms-logs`.

### 2.6 Dashboard
`GET /dashboard/stats` returns `customers`, `by_provider`, `this_month`, `today`, `today_by_agent`.
Map it into the existing KPI widgets.

### 2.7 Scope for v1
Hide non-cable/ISP modules (restaurant, gym, salon, healthcare...) by keeping them out of
`organizations.allowed_modules`. Don't delete the code; just don't enable it.

### 2.8 Rename
Replace user-visible "Popna" with "LCO Desk" in `manifest.json`, `index.html`, `package.json` name,
`public/locales/*.json` and the logo images.
