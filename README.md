# The Poisoning of Lord Harrington · 3D AI Murder Mystery

A 3D detective interrogation game built with **Three.js** and integrated into the **start.ng** gaming platform.

## Features
- **3D Victorian Crime Scene:** Built entirely with Three.js (interactive lighting, fireplace flicker, mahogany desk, poisoned wine glass evidence, and camera focus transitions).
- **start.ng Central Character Integration:** The 3D Detective model dynamically synchronizes in real time with the player's central start.ng profile avatar and colors (`skinColor`, `primaryColor`, `secondaryColor`, `hairColor`, `hair`, `hat`, `accessory`, `body`).
- **Reactive AI Suspects:** 
  - **Arthur Pendelton (The Nervous Butler):** Fidgety, formal, hides seeing Dr. Sterling sneak out with a vial at 10:00 PM.
  - **Marcus Vance (The Envious Business Partner):** Haughty, defensive, reveals an alibi verified by the estate gatekeeper at 9:40 PM.
  - **Dr. Evelyn Sterling (The Quiet Doctor - The Killer):** Clinically composed, slips up on medical details regarding potassium cyanide and almond odor before toxicology results.
- **Dual AI Engine:** Runs out of the box using an intelligent local heuristic NLP engine, with optional live Google Gemini LLM API integration.
- **start.ng Platform Leaderboard:** Custom metrics tracked in `startng.json` (`score` and `turns_left`).

## Tech Stack
- Frontend: Vanilla JavaScript (ES Modules), Three.js (via jsDelivr CDN), HTML5, CSS3.
- Platform: start.ng Connect iframe & REST API (`https://start.ng/docs.md`).
- Assets: Procedural 3D geometries and 16:10 cover graphic (`cover.png`).

## Local Development
To preview locally:
```bash
npx serve .
# or
python -m http.server 8080
```
Then visit `http://localhost:8080`.
