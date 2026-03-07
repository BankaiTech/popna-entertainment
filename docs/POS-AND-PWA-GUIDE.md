# POS Machine Connection & PWA on Mobile — Guide

This document explains **how to connect a POS machine** to this project and **how to use the PWA effectively on mobile**.

---

## Part 1: Connecting a POS Machine to This Project

Your app has a **software POS** at `/admin/pos` (cart, checkout, on-screen receipt). To use **physical hardware** (receipt printer, barcode scanner, cash drawer, card reader), you need a way for the browser to talk to the device. Browsers don’t allow direct USB/Serial access from normal web pages except through specific Web APIs or a local bridge.

### Option A: **Browser + supported Web APIs (no extra server)**

| Device type        | How it can connect | What you need in the app |
|--------------------|--------------------|---------------------------|
| **Barcode scanner** | Often acts as a **keyboard** (USB HID). You plug it in, focus an input, scan → characters appear. | A focused `<input>` (e.g. in POS) to capture scan data. No special API. |
| **Receipt printer** | Not directly supported in browser. Use **Web Serial API** (Chrome/Edge) for serial/ESC-POS, or a **local bridge** (see Option B). | Either a small local app that exposes an HTTP endpoint and talks to the printer, or a browser extension / Electron app using Web Serial. |
| **Cash drawer**     | Usually opens via printer (kick command) or serial. | Same as printer: local bridge or Web Serial in supported environment. |
| **Card reader**     | Often HID keyboard (card number typed) or a dedicated SDK. | For “keyboard” type: capture in input. For SDK: use vendor’s JS SDK if they provide one for web. |

- **Barcode scanner (keyboard wedge):**  
  - Add a search/scan input on the POS page.  
  - On scan, parse the value (e.g. product code), find product, add to cart.  
  - No “connection” step; device just types into the page.

- **Receipt printer (ESC/POS) from browser:**  
  - **Web Serial API** (Chrome/Edge): possible only in a **secure context** (HTTPS or localhost).  
  - Flow: user clicks “Print receipt” → you request a serial port → send ESC/POS bytes to the selected port.  
  - You’d add a small module that builds the receipt (text/ESC/POS) and sends it over the chosen port.  
  - Not all printers are serial; many are USB-only and may need a **local bridge** (see Option B).

### Option B: **Local bridge (recommended for thermal printers / cash drawer)**

Run a small **local server** on the same machine as the POS device that:

1. Listens for HTTP (e.g. `POST /print`) from your web app.
2. Talks to the printer/drawer via:
   - **USB/Serial** (e.g. Node.js `serialport`), or  
   - **Network** (if the printer has an IP and supports raw TCP/ESC-POS).

**Example flow:**

```
[Your PWA in browser]  --HTTP POST (receipt JSON)-->  [Local bridge :3333]
                                                              |
                                                              v
                                                    [USB/Serial or Network]
                                                              |
                                                              v
                                                    [Thermal printer / cash drawer]
```

**In this project:**

1. **POS page:** After “Confirm checkout”, in addition to showing the on-screen receipt, call your backend or a **configurable “POS bridge” URL** (e.g. `http://localhost:3333/print` in dev, or a URL set in admin settings for the branch).
2. **Bridge** (separate repo or small Node app):
   - Receives `POST /print` with body like `{ "lines": ["..."], "openDrawer": true }`.
   - Converts to ESC/POS and sends to the printer; optionally sends kick command to open drawer.
   - Only runs on the machine where the printer is connected; your React app stays unchanged except for the one “print” request.

This way, **one codebase** (this project) works everywhere; only the machine that has the printer needs the bridge.

### Option C: **Network (TCP) printer**

If the printer has an **IP address** and supports **raw TCP** (port 9100 or similar):

- Browsers **cannot** open raw TCP sockets from the page.
- So you still need a **backend or local bridge** that:
  - Receives “print” from the PWA (e.g. API or bridge URL).
  - Opens a TCP socket to the printer IP and sends ESC/POS.

Your project would only call that backend/bridge; no direct “connection” from the React app to the printer.

### Option D: **Third‑party “web print” services**

Some services (e.g. **Star Micronics Star Web Print**, or cloud print APIs) expose an HTTP API. You’d:

- Register the printer with their service.
- From your POS, send receipt data to their API (from your backend or via CORS-allowed client).
- They deliver to the printer.

Integration is then “call an API” from this project; no local bridge if you don’t want one.

### Summary: what to do in this project

| Goal                         | What to do in this project |
|-----------------------------|----------------------------|
| **Barcode scanner (keyboard)** | Add a scan input on POS; on submit/scan, resolve product and add to cart. |
| **Receipt printer**        | Add “Print receipt” that sends receipt payload to your backend or a configurable **POS bridge URL**; bridge (or backend) talks to printer via USB/Serial or network. |
| **Cash drawer**             | Same as printer: bridge or backend sends kick command (often via same printer port). |
| **Card reader (keyboard)**  | Capture in a secure input; process via your payment API. |

So: **connection** to the POS machine is either **browser input** (scanner/reader as keyboard), or **HTTP to a local bridge/backend** that owns the real device connection (USB/Serial/Network).

---

## Part 2: Using the PWA Effectively on Mobile

Your app is already set up as a PWA (Vite PWA plugin, `manifest.json`, service worker). Below is how to **use and rely on it** on mobile.

### 2.1 Install the app on the phone

- **Android (Chrome/Edge):**  
  - Open your deployed site (HTTPS).  
  - Use “Add to Home screen” / “Install app” from the browser menu.  
  - The app will open in **standalone** (no browser UI) and use your `manifest.json` (name, icons, theme_color).

- **iOS (Safari):**  
  - Open the site in Safari.  
  - Tap Share → “Add to Home Screen”.  
  - Name and icon come from `manifest` / apple meta tags (you already have `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-touch-icon` in `index.html`).

Using the **installed** icon gives a full-screen, app-like experience and avoids the browser chrome.

### 2.2 What your PWA already does

- **Precache:** Workbox precaches JS, CSS, HTML, and assets (up to 10 MiB per file) so repeat visits load from cache.
- **Offline:** Cached routes work offline; API calls will fail unless you add offline handling (e.g. queue + sync later).
- **manifest.json:**  
  - `display: "standalone"` → app-like window.  
  - `start_url`, `theme_color`, `icons`, `shortcuts` (Contacts, Catalog, Invoices) → good for mobile.
- **index.html:**  
  - `viewport-fit=cover`, `theme-color`, `apple-mobile-web-app-*` → better on notched devices and when “installed”.

So **using the PWA effectively** = **install it**, then use the **shortcuts** and **standalone** window.

### 2.3 Making the PWA more effective on mobile *(implemented)*

1. **Install prompt (optional)** ✅  
   - Listen for `beforeinstallprompt`, store the event, and show your own “Install NexLink” button (e.g. in header or after login).  
   - On tap, call `prompt()` and then `userChoice` to track install.  
   - Improves install rate on Android.

2. **Offline feedback** ✅  
   - Use `navigator.onLine` and/or the service worker’s state to show a small “You’re offline” banner.  
   - For POS/invoices: disable or queue actions when offline and show a clear message.

3. **Cache API responses for key screens** ✅  
   - Your `runtimeCaching` already has a `NetworkFirst` rule for `localhost:3001`.  
   - For production, add a similar rule for your real API origin so list/data pages (e.g. products, contacts) can be shown from cache when offline, with a “Data may be outdated” note.

4. **Update prompt** ✅  
   - With `registerType: 'autoUpdate'`, the SW updates in the background.  
   - You can use the Vite PWA virtual module (`virtual:pwa-register`) to get an `onNewVersion` callback and show “New version available. Reload?” so users get updates without confusion.

5. **Mobile UX** ✅  
   - **Touch targets:** Buttons and links at least 44×44 px (you already use min-heights in places).  
   - **Safe area:** You use `viewport-fit=cover`; use `env(safe-area-inset-*)` in CSS for padding so content isn’t under the notch or home indicator.  
   - **Orientation:** `manifest` has `orientation: "portrait-primary"`; keep critical flows (e.g. POS) usable in portrait.

6. **Shortcuts** ✅  
   - Your manifest already defines shortcuts (Contacts, Catalog, Invoices).  
   - On Android, long-press the app icon to see them; users can jump straight to POS or key screens if you add a “POS” shortcut.

7. **Background sync (advanced)** *(POS shows offline notice and disables checkout when offline; full queue/sync can be added later)*  
   - For offline POS: queue sale payloads in IndexedDB; when back online, use Workbox Background Sync to POST them to your API.  
   - Requires registering a sync event in the SW and handling it; only needed if you want “offline sales that sync later”.

### 2.4 Quick checklist for “effective PWA on mobile”

- [ ] Deploy on **HTTPS** so install and SW work everywhere.
- [ ] **Install** the app from browser (Add to Home screen / Install).
- [ ] Use **shortcuts** (long-press icon) for frequent sections.
- [ ] Optionally: **install prompt** + **update prompt** in the UI.
- [ ] Show **offline** state and, if needed, **queue and sync** for critical actions (e.g. POS).
- [ ] Use **safe-area** and **touch-friendly** layout; keep **portrait** in mind for POS.

---

## Summary

- **POS machine:**  
  - **Scanners/readers (keyboard):** Use a dedicated input on the POS page; no “connection” logic.  
  - **Printers/drawers:** Add a “Print receipt” (and optional open drawer) that sends data to a **local bridge** or **backend**; the bridge/backend connects to the device via USB/Serial/Network. Your React app only does HTTP.

- **PWA on mobile:**  
  - **Install** the app from the browser, use **standalone** and **shortcuts**.  
  - Optionally add **install prompt**, **update prompt**, **offline banner**, and **API runtime caching** so the PWA feels reliable and up to date on mobile.

If you tell me your target (e.g. “thermal printer + scanner on one Android tablet”), I can outline the exact steps and code hooks (e.g. POS “Print” button → bridge URL, and scan input) inside this repo.
