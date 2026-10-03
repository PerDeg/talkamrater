# Talkamrater

Ett mattespel för att öva talkamrater (6 + 2 = 8, 4 + 4 = 8 …) för talen 1–20. Gjort för Edwin, 8 år, och hans klasskompisar.

Spelet fungerar på två sätt:

- **Bara spelet** (`public/` som statiska filer): allt sparas i webbläsaren.
- **Med servern**: eleverna går med i sin klass, framstegen sparas i en databas och syns på alla enheter, och klassen får en gemensam sida.

## Innehåll

| Del | Var |
|---|---|
| Spelet | `public/index.html`, `public/game.js`, `public/style.css` |
| Lärarsidan | `public/admin.html` (+ `admin.js`, `admin.css`) |
| Server och API | `server/src/` (Node + Express) |
| Databaskopplingen | `server/src/db.js` |
| Tester | `server/test/` |
| Driftfiler | `Dockerfile`, `deploy/` |

## Spelet

- **Fri träning**: välj ett tal 1–20.
  - *Hitta kamraten* går igenom **alla** kamrater till talet, från 0 + n till n + 0 (talet 8 ger 9 frågor). Pärlorna hjälper till.
  - *Bubbelpoppen* har **alla** par som blir talet. Stora tal kommer i flera vågor.
  - *Blandat 1–10 / 1–20*.
- **Vägen till expert**: fyra områden (Kompisbyn 1–5, Tiokamratskogen 6–10, Bubbelsjön 11–15, Tjugotoppen 16–20).
  - Varje tal-steg är klart med minst ★★ i *Hitta kamraten*.
  - Varje område avslutas med ett **prov** utan pärlor, med ett svar per fråga och en medalj när man klarar det.
  - Två **utmaningar på tid** (60 sekunder).
  - Sist kommer **Expertprovet** (20 frågor, 18 rätt behövs) som ger ett **diplom**.
- **Kluriga kamrater**: spelet minns vilka par som varit svåra och låter eleven öva extra på dem. De försvinner när eleven svarar rätt.
- **Belöningar**:
  - Svenska hejarop, konfetti, ljud och en röst som hejar.
  - Bonus vid flera rätt i rad.
  - Stjärnor, 30 klistermärken, 5 medaljer och titlar.

## Klassen: inloggning utan lösenord

1. Läraren eller föräldern skapar en klass på `/admin.html` och får en **klasskod**, t.ex. `SOL-4821`.
2. Eleven trycker **Gå med i klassen**, skriver koden, väljer sitt namn (eller *Jag är ny*) och en **hemlig bildkod** med tre bilder av tolv.
3. Enheten kommer ihåg eleven. Om eleven glömmer bildkoden trycker läraren *Ny bildkod*, så väljer eleven en ny nästa gång.

Det här skyddar mot fusk:

- Klassnamnen syns bara för den som har klasskoden.
- Efter fem fel på bildkoden låses eleven i fem minuter.
- Anrop begränsas per IP-adress.
- Bildkoder och inloggningar sparas bara som hash.

Klassidan visar **klassens stjärnburk**, ett gemensamt mål som alla fyller tillsammans, och varje elevs stjärnor, klistermärken och medaljer. Listan är sorterad på namn, inte som en topplista.

Lärarsidan visar för varje elev: stjärnor, steg på vägen, medaljer, **vilka talkamrater som är kluriga** och de senaste rundorna.

**Personuppgifter:** bara förnamn (eller smeknamn), figur och spelresultat sparas. Inga e-postadresser och inga lösenord.

## Driftsätta på Unraid med nginx

### 1. Databasen (koppla till din befintliga)

Servern stöder **PostgreSQL**, **MySQL/MariaDB** och **SQLite**. Tabellerna skapas automatiskt vid första start och får prefixet `tk_` (ändras med `DB_TABLE_PREFIX`), så de kan ligga i en befintlig databas.

Skapa en användare och databas med `deploy/sql/skapa-databas.sql`. Fyll sedan i `.env` utifrån `.env.example`:

```env
ADMIN_KEY=en-lång-hemlig-sträng
DB_CLIENT=postgres          # eller mysql / mariadb / sqlite
DATABASE_URL=postgres://talkamrater:losenord@192.168.1.10:5432/talkamrater
DB_TABLE_PREFIX=tk_
```

### 2. Containern

```bash
docker build -t talkamrater .
docker run -d --name talkamrater --restart unless-stopped --env-file .env -p 3000:3000 talkamrater
```

Använder du Compose Manager på Unraid kan du utgå från `deploy/docker-compose.yml`.

Med `DB_CLIENT=sqlite` behöver du en volym för databasfilen, t.ex. `/mnt/user/appdata/talkamrater:/data`. Kör då containern med `--user 99:100` så att den får skriva i appdata.

### 3. nginx

Se `deploy/nginx-talkamrater.conf`. Där finns två alternativ: en egen subdomän, eller en sökväg som `/talkamrater/`. Med Nginx Proxy Manager eller SWAG räcker det att peka en proxy-host mot `http://<unraid-ip>:3000`.

### 4. Kom igång

1. Gå till `https://din-adress/admin.html` och logga in med `ADMIN_KEY`.
2. Skapa klassen.
3. Tryck *Kopiera* och skicka texten till föräldrarna i klassen.

## API

| Anrop | Vad |
|---|---|
| `GET /api/health` | Lever servern och databasen? |
| `GET /api/classes/:kod` | Klassens namn och elever (för inloggningen) |
| `POST /api/classes/:kod/players` | Ny elev `{name, avatar, pin:[a,b,c]}` |
| `POST /api/login` | `{code, playerId, pin}` → token |
| `GET /api/me` · `PATCH /api/me` | Eleven och framstegen · byt figur |
| `PUT /api/me/progress` | Spara framsteg (slås ihop med det som finns: det bästa från båda) |
| `POST /api/me/rounds` | Logga en spelad runda |
| `GET /api/me/class` | Klassidan |
| `POST /api/logout` | Logga ut |
| `/api/admin/...` | Klasser, elever, ny bildkod, radera (kräver headern `X-Admin-Key`) |

## Utveckling

```bash
cd server
npm install
ADMIN_KEY=test npm start           # SQLite i ./data, spelet på http://localhost:3000
npm test                           # tester mot SQLite
TEST_PG_URL=postgres://… npm test  # även mot PostgreSQL
TEST_MYSQL_URL=mysql://… npm test  # även mot MySQL/MariaDB
```
