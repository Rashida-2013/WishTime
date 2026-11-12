# WishTime

Production-style React/Vite frontend matching the supplied WishTime UI references.

## Stack

- React 19
- Vite
- JavaScript
- React Router DOM
- Axios
- Lucide React
- Plain CSS

## Run

```bash
npm install
npm run dev
```

Then open the Vite URL shown in the terminal, normally:

```text
http://localhost:5173
```

## Routes

- `/` — Home
- `/login` — Login
- `/signup` — Sign Up
- `/create-event` — Create New Event
- `/events` — My Events
- `/events/1` — Event Details
- `/profile` — Profile & Settings

The frontend is API-ready. `src/services/api.js` contains Axios functions with mock fallbacks so the UI works without a backend.

## Notes

The visual system is intentionally built from reusable React components and CSS rather than a generic dashboard template. The birthday/gift artwork is CSS/Lucide based so the project has no dependency on remote image URLs.
