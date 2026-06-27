# Ăn Gì? 🍜

> **Ăn Gì?** is a mobile-first, Tinder-style food picker web app that helps you decide what to eat in under 10 seconds — all in Vietnamese.

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5a67d8?style=flat-square)](https://web.dev/progressive-web-apps/)
[![No Build Step](https://img.shields.io/badge/Build%20Step-None-38a169?style=flat-square)](.)

---

## ✨ Features

| Feature | Details |
|---|---|
| 🕐 Time-aware greeting | Morning / Lunch / Dinner / Late-night messages |
| 🍚 4 food categories | Ăn no · Ăn nhẹ · Ăn vặt · Đồ uống |
| ⚡ Fast question flow | Each category asks up to 2 quick questions before loading cards |
| 👆 Tinder-style swipe | Swipe right to ❤️ like, swipe left to ✕ skip |
| 🗂 Better stack & history | Reused 3-card stack, restart/shuffle controls, liked/history screens |
| 📖 Food detail sheet | Ingredients, calories, price in a bottom sheet |
| 🌙 Dark / Light mode | Follows system preference, manually toggleable |
| 💾 Persistence | Liked foods, history, current category and filter answers restore after refresh |
| ♿ Accessible | ARIA labels, keyboard navigation, large touch targets |
| 📱 PWA ready | Installable, offline-capable icon, manifest included |
| 🚀 No build step | Plain HTML + CSS + Vanilla JS ES6 modules |

---

## 📁 Folder Structure

```
/
├── index.html          ← Single-page application shell
├── manifest.json       ← PWA manifest
├── README.md
├── .gitignore
│
├── css/
│   └── style.css       ← All styles (glassmorphism, dark mode, animations)
│
├── js/
│   ├── app.js          ← Main orchestrator, screen routing, deck state
│   ├── foodData.js     ← ~100 Vietnamese food objects (API-ready)
│   ├── filter.js       ← Question config + isolated filtering logic
│   ├── foodVisuals.js  ← SVG card artwork + image preloading
│   ├── tinder.js       ← Pointer/touch swipe mechanics
│   └── storage.js      ← LocalStorage persistence layer
│
└── assets/
    ├── logo.svg        ← App icon (SVG, works as PWA icon)
    └── images/         ← (reserved for future local images)
```

---

## 🚀 How to Run Locally

No build step required. Just serve the files over HTTP:

```bash
# Option A – Python (built-in)
python3 -m http.server 8080
# then open http://localhost:8080

# Option B – Node.js npx
npx serve .
# then open the URL printed in the terminal

# Option C – VS Code
# Install the "Live Server" extension, right-click index.html → Open with Live Server
```

> ⚠️ ES6 modules require an HTTP server. Opening `index.html` directly as a `file://` URL will not work in most browsers.

---

## 🌐 Deploy on GitHub Pages

1. Push the repository to GitHub.
2. Go to **Settings → Pages**.
3. Under *Branch*, select `main` (or `master`) and `/ (root)`.
4. Click **Save**.
5. Your app will be live at `https://<username>.github.io/<repo-name>/` in ~60 seconds.

No CI/CD or build pipeline is needed.

---

## 🔌 Replacing Local Food Data with an API

All food data is isolated in `js/foodData.js`. The module exports both a static array **and** an async getter:

```js
// js/foodData.js (current)
export const foods = [ /* ... */ ];

export async function getFoods() {
  return Promise.resolve(foods);   // ← swap this
}
```

To connect a real API, replace `getFoods` with a `fetch` call:

```js
export async function getFoods() {
  const res = await fetch('https://api.example.com/foods');
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

`app.js` already calls `await getFoods()` on startup — no other changes required.

---

## 🗺 Future Roadmap

- [ ] Real food photos via a Vietnamese food API
- [ ] Service Worker for full offline support
- [ ] Share a liked food card via Web Share API
- [ ] "Nearby restaurants" via a maps/places API
- [ ] Personalised recommendations based on history
- [ ] Multi-language support (EN / VI)
- [ ] Animated onboarding for first-time users

---

## 🛠 Tech Stack

- **HTML5** – Semantic markup, ARIA accessibility
- **CSS3** – Custom properties, glassmorphism, `@media`, `@keyframes`
- **Vanilla JS (ES6 Modules)** – No framework, no bundler
- **LocalStorage** – Client-side persistence

---

## 📄 License

MIT © 2025 noho501