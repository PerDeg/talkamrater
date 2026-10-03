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
- **Husdjuret**: ett ägg som kläcks och sakta växer (bebis → liten → stor → jätte → kung 👑).
  - Varje stjärna ger en stjärnfrukt 🍓. Det tar omkring 150 rundor att nå kung.
  - Husdjuret har **önskningar**, till exempel *"Lös det här så får jag en glass! Poppa alla bubbelpar som blir 9."* Varje uppfylld önskan ger en godsak och extra tillväxt. Det blir högst tre önskningar per dag.
  - Har eleven inte spelat på några dagar blir husdjuret hungrigt, men det blir aldrig ledset på riktigt.
- **Kompisduell**: två spelare på samma skärm.
  - Den som först svarar rätt får poängen, och den som svarar fel låses en kort stund.
  - Spelare 2 kan vändas upp och ner för att sitta mittemot.
  - Man väljer talkamrater, tiokamrater, minus eller dubblor, först till 5/7/10.
- **Kluriga kamrater**: spelet minns svåra uppgifter i alla världar och låter eleven öva extra på dem.
- **Belöningar**:
  - Svenska hejarop, konfetti, ljud och röst.
  - Bonus vid flera rätt i rad.
  - Stjärnor, titlar, 30 klistermärken och 13 medaljer.

- **Första gången** väljer man mellan att gå med i sin klass och att skriva sitt namn och spela själv. Inget namn är förvalt.

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

## Klassens status på en annan webbsida

Klassens status kan visas på t.ex. klassens schema: veckans uppdrag, elevens stjärnor och bidrag, husdjurets önskan och en länk till spelet. Det finns två sätt:

- **Eget utseende:** hämta JSON från `GET /api/public/classes/<kod>?name=<namn>`. Alla texter kommer färdiga.
- **Färdig kompakt widget:** en iframe mot `widget.html?klass=<kod>&namn=<namn>`. Färger, tema och ram styrs med parametrar.

Båda kräver två saker: att läraren slagit på *Visa klassens status på en annan webbsida* för klassen, och att sajten står i `ALLOWED_ORIGINS`.

**Fullständig beskrivning med fält, exempel och parametrar finns i [docs/API.md](docs/API.md).**

## Installera som app (PWA)

Spelet kan installeras på hemskärmen och startar då som en egen app, även utan internet.

- **iPhone/iPad:** öppna spelet i Safari, tryck *Dela* → *Lägg till på hemskärmen*.
- **Android och dator (Chrome/Edge):** spelet visar en knapp *Installera*. Den finns också i webbläsarens meny.

På iPhone har den installerade appen egen lagring. Den som spelar med klassen loggar därför in en gång till med klasskoden och bildkoden.

## Driftsätta på Unraid med nginx

Spelet körs i stacken **mina-appar**, där alla egna appar samlas, skilda från containrar som installerats via Community Apps. I stacken finns också en **gemensam Postgres** för alla egna appar, med en egen databas och en egen användare per app. Mallen finns i `deploy/mina-appar/`.

Så här ser det ut på Unraid:

```
/mnt/user/appdata/mina-appar/
  docker-compose.yml        ← databasen + alla egna appar
  uppdatera.sh              ← backup, hämta kod, bygg om, starta om
  ny-databas.sh             ← skapar databas + användare för en app
  backup.sh                 ← säkerhetskopierar alla databaser
  env/db.env                ← databasens adminlösenord
  env/talkamrater.env       ← appens inställningar
  src/talkamrater/          ← git clone av det här repot
  data/postgres/            ← databasfilerna
  backup/                   ← dagliga backuper (sparas i 14 dagar)
```

### Första installationen

```bash
mkdir -p /mnt/user/appdata/mina-appar/src
cd /mnt/user/appdata/mina-appar
git clone https://github.com/PerDeg/talkamrater.git src/talkamrater
cp -r src/talkamrater/deploy/mina-appar/. .

# 1. Lösenord och nycklar (slumpas fram)
cp env/db.env.example env/db.env
cp env/talkamrater.env.example env/talkamrater.env
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" env/db.env
sed -i "s/^ADMIN_KEY=.*/ADMIN_KEY=$(openssl rand -hex 24)/" env/talkamrater.env
grep ADMIN_KEY env/talkamrater.env   # spara nyckeln, den behövs för lärarsidan

# 2. Databasen för spelet (startar Postgres och fyller i env/talkamrater.env)
./ny-databas.sh talkamrater
```

Byt sedan `192.168.1.10` i ikon-adressen till din Unraid-IP med `nano docker-compose.yml`. Gör det som ett eget steg, inte i samma inklistring som kommandona ovan och nedan.

```bash
# 3. Bygg och starta
./uppdatera.sh
curl http://localhost:3080/api/health
```

Databasen har ingen port mot nätverket. Apparna når den som `db:5432` inne i stacken.

### nginx

Peka en proxy-host mot `http://<unraid-ip>:3080`. Konfigurationsexempel finns i `deploy/nginx-talkamrater.conf`.

### Kom igång

1. Gå till `https://din-adress/admin.html` och logga in med `ADMIN_KEY`.
2. Skapa klassen.
3. Tryck *Kopiera* och skicka texten till föräldrarna.

### Uppdatera

```bash
/mnt/user/appdata/mina-appar/uppdatera.sh
```

Skriptet tar en backup först. Nya tabeller läggs till automatiskt.

### Backup varje natt

Installera pluginen **User Scripts** och lägg till ett skript som körs *Daily*:

```bash
#!/bin/bash
/mnt/user/appdata/mina-appar/backup.sh
```

Så här återställer du en backup:

```bash
cd /mnt/user/appdata/mina-appar
zcat backup/postgres-ÅÅÅÅ-MM-DD-TTMM.sql.gz | docker compose exec -T db psql -U postgres
```

### Ny egen app i samma stack

1. `git clone <repo> src/<namn>`
2. `./ny-databas.sh <namn>` om appen behöver en databas.
3. Kopiera det bortkommenterade blocket `nasta-app` i `docker-compose.yml` och byt namn och port.
4. `./uppdatera.sh`

### Uppgradera Postgres till ny huvudversion

Huvudversionen är låst (`postgres:17-alpine`). Så här byter du till en ny:

1. Kör `./backup.sh`.
2. `docker compose down`.
3. Flytta `data/postgres` åt sidan.
4. Ändra versionen i compose-filen.
5. `docker compose up -d db`.
6. Återställ backupen enligt ovan.
7. `./uppdatera.sh`.

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
| `GET /api/public/classes/:kod?name=` | Publik klassstatus för widgeten (bara om läraren slagit på det) |
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
