# Talkamrater – arbetsregler

- **Uppdatera alltid API-dokumentationen vid förändringar** som påverkar det publika API:t
  (`/api/public/...`), widgeten eller texterna den visar:
  - `docs/API.md` i repot
  - den delade dokumentationen "Talkamrater – API för klassens schema"
    (https://claude.ai/code/artifact/07759ddd-2ffd-4dd4-9325-a3dcf5e2ffa3)
- Spelets konstanter (husdjursstadier, önskningar, medaljer) finns både i `public/game.js`
  och `server/src/display.js` – håll dem i synk.
- All text i spelet är på svenska. Hejarop bara på svenska (talsyntesen).
- Ingen topplista eller rangordning av elever. Fokus är att hjälpas åt.
- Kör `npm test` i `server/` (gärna med `TEST_PG_URL`/`TEST_MYSQL_URL`) före push.
