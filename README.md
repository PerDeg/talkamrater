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

**Tre världar**, var och en med fri träning, en egen väg till expert, egna medaljer och ett eget diplom:

| Värld | Vad | Väg till expert |
|---|---|---|
| **Plus** (talkamrater) | `6 + ? = 8` | Kompisbyn, Tiokamratskogen, Bubbelsjön, Tjugotoppen → Expertprovet 🎓 |
| **Minus** | `8 − 6 = ?`, `8 − ? = 2` | Svampbyn, Igelkottsskogen, Grottsjön, Isberget → Minusprovet 🧙 |
| **Dubblor** | `6 + 6 = ?`, `? + ? = 12`, hälften av 12 | Dubbeldalen, Spegelslottet → Dubbelprovet 👯 |

- **Fri träning** går igenom **alla** kamrater på nivån, t.ex. talet 8 ger 0 + 8 … 8 + 0. Pärlorna hjälper till.
  - Minus visar borttagna pärlor med kryss, och fel svar förklaras med plus ("Kolla med plus: 5 + 2 = 7, inte 8").
  - *Bubbelpoppen* (plus) har alla par, och stora tal kommer i flera vågor.
- **Vägen till expert**:
  - Ett tal-steg är klart med minst ★★.
  - Varje område avslutas med ett **prov** utan pärlor, med ett svar per fråga och en medalj för den som klarar det.
  - Längs vägen finns **utmaningar på tid** (60 s).
  - Sist kommer slutprovet med **diplom**.
- **Dagens utmaning**: 8 frågor med ett tema per veckodag (Tiokamratmåndag, Minustisdag, Dubbelonsdag …).
  - Frågorna är samma för alla i klassen samma dag.
  - Den ger en svit 🔥 och ett extra klistermärke.
- **Husdjuret**: ett ägg som kläcks och växer (bebis → liten → stor → jätte → kung 👑) när eleven spelar.
  - Varje runda ger stjärnfrukter 🍓.
  - Har eleven inte spelat på några dagar blir husdjuret hungrigt men aldrig ledset på riktigt.
  - Eleven kan döpa det.
- **Kompisduell**: två spelare på samma skärm.
  - Den som först svarar rätt får poängen, och den som svarar fel låses en kort stund.
  - Spelare 2 kan vändas upp och ner för att sitta mittemot.
  - Man väljer talkamrater, tiokamrater, minus eller dubblor, först till 5/7/10.
- **Kluriga kamrater**: spelet minns svåra uppgifter i alla världar och låter eleven öva extra på dem.
- **Belöningar**:
  - Svenska hejarop, konfetti, ljud och röst.
  - Bonus vid flera rätt i rad.
  - Stjärnor, titlar, 30 klistermärken och 13 medaljer.

## Klassen: inloggning utan lösenord

1. Läraren eller föräldern skapar en klass på `/admin.html` och får en **klasskod**, t.ex. `SOL-4821`.
2. Eleven trycker **Gå med i klassen**, skriver koden, väljer sitt namn (eller *Jag är ny*) och en **hemlig bildkod** med tre bilder av tolv.
3. Enheten kommer ihåg eleven. Om eleven glömmer bildkoden trycker läraren *Ny bildkod*, så väljer eleven en ny nästa gång.

Det här skyddar mot fusk:

- Klassnamnen syns bara för den som har klasskoden.
- Efter fem fel på bildkoden låses eleven i fem minuter.
- Anrop begränsas per IP-adress.
- Bildkoder och inloggningar sparas bara som hash.

Klassidan visar:

- **Veckans uppdrag**: ett gemensamt mål som byts varje måndag, t.ex. "Poppa 130 bubbelpar tillsammans". Målet anpassas efter klassens storlek.
- **Händer i klassen**: ett flöde med medaljer, nya experter, titlar, sviter, husdjur som växer och rekord. Kompisarna kan **heja** 👏, och den som får hejarop ser det nästa gång spelet öppnas. Bara fasta händelsetyper finns, inga fritexter.
- **Klassens stjärnburk**, ett gemensamt mål som alla fyller tillsammans, och varje elevs stjärnor, klistermärken och medaljer. Listan är sorterad på namn, inte som en topplista.

Lärarsidan visar för varje elev: stjärnor, steg på vägen, medaljer, **vilka talkamrater som är kluriga** och de senaste rundorna.

**Personuppgifter:** bara förnamn (eller smeknamn), figur och spelresultat sparas. Inga e-postadresser och inga lösenord.

## Driftsätta på Unraid med nginx

Spelet körs som en egen container i stacken **mina-appar**, där alla egna appar samlas, skilda från containrar som installerats via Community Apps. Mallen finns i `deploy/mina-appar/`.

Så här ser det ut på Unraid:

```
/mnt/user/appdata/mina-appar/
  docker-compose.yml        ← alla egna appar
  uppdatera.sh              ← hämtar koden, bygger om och startar om
  env/talkamrater.env       ← hemligheter (ADMIN_KEY, databas)
  src/talkamrater/          ← git clone av det här repot
```

### 1. Lägg upp stacken

```bash
mkdir -p /mnt/user/appdata/mina-appar/src
cd /mnt/user/appdata/mina-appar
git clone https://github.com/PerDeg/talkamrater.git src/talkamrater
cp -r src/talkamrater/deploy/mina-appar/. .
cp env/talkamrater.env.example env/talkamrater.env
openssl rand -hex 24          # klistra in som ADMIN_KEY
nano env/talkamrater.env      # databasuppgifter
nano docker-compose.yml       # byt 192.168.1.10 i ikon-adressen till Unraid-IP:n
```

### 2. Databasen

Servern stöder **PostgreSQL**, **MySQL/MariaDB** och **SQLite**. Tabellerna skapas automatiskt vid första start och får prefixet `tk_`. Skapa en användare och databas med `deploy/sql/skapa-databas.sql`, till exempel:

```bash
docker exec -it postgresql psql -U postgres -c "CREATE USER talkamrater WITH PASSWORD 'byt-losenord';" -c "CREATE DATABASE talkamrater OWNER talkamrater;"
```

### 3. Starta

```bash
./uppdatera.sh
curl http://localhost:3080/api/health
```

Med pluginen **Docker Compose Manager** kan stacken också startas, stoppas och uppdateras från Docker-fliken.

### 4. nginx

Peka en proxy-host mot `http://<unraid-ip>:3080`. Konfigurationsexempel finns i `deploy/nginx-talkamrater.conf`.

### 5. Kom igång

1. Gå till `https://din-adress/admin.html` och logga in med `ADMIN_KEY`.
2. Skapa klassen.
3. Tryck *Kopiera* och skicka texten till föräldrarna.

### Uppdatera

```bash
/mnt/user/appdata/mina-appar/uppdatera.sh
```

All data finns i databasen, och nya tabeller läggs till automatiskt.

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
| `GET /api/me/class` | Klassidan: elever, stjärnburk, veckans uppdrag, händelser |
| `POST /api/me/events` | Ny händelse i flödet `{type, detail}` |
| `POST /api/events/:id/cheer` | Heja på en klasskompis |
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
