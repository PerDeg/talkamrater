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
- **Pärlorna anpassar sig**: den som svarar rätt många gånger i rad får svagare pärlor och sedan inga alls. Det gäller för hela spelet, inte bara ett tal, så hjälpen nollställs inte när man byter uppgift. Vid fel kommer pärlorna tillbaka.
- **Vägen till expert**:
  - Varje tal har tre moment: **Lära** (hitta kamraten med pärlor, minst ★★), **Öva** (bubbelpoppen i plus, minus åt båda hållen, halvor i dubblor) och **Kunna** (ett kort talprov utan pärlor). Kan eleven redan talet hoppas Lära över.
  - Efter vartannat tal kommer en **repetition** med blandade frågor från talen man lärt sig.
  - Varje område avslutas med ett **prov** utan pärlor, med ett svar per fråga och en medalj för den som klarar det. Provet öppnas först när allt i området är klart.
  - En vecka efter ett prov dyker ett frivilligt **Kom ihåg-prov** upp. Klarar man det börjar medaljen glänsa ✨. Det stoppar aldrig vägen.
  - Längs vägen finns **utmaningar på tid** (60 s).
  - Sist kommer slutprovet med **diplom**.
- **Dagens utmaning**: 8 frågor med ett tema per veckodag (Tiokamratmåndag, Minustisdag, Dubbelonsdag …).
  - Frågorna är samma för alla i klassen samma dag.
  - Den ger en svit 🔥 och ett extra klistermärke.
- **Husdjuret**: ett ägg som kläcks och sakta växer (bebis → liten → stor → jätte → kung 👑).
  - Varje stjärna ger en stjärnfrukt 🍓. Det tar omkring 150 rundor att nå kung.
  - Husdjuret har **önskningar**, till exempel *"Lös det här så får jag en glass! Poppa alla bubbelpar som blir 9."* Varje uppfylld önskan ger en godsak och extra tillväxt. Det blir högst en önskan om dagen, och inte alla dagar.
  - Har eleven inte spelat på några dagar blir husdjuret hungrigt, men det blir aldrig ledset på riktigt.
- **Spela två**: två spelare på samma skärm, i två lägen.
  - **Duell**: den som först svarar rätt får poängen, och den som svarar fel låses en kort stund. Först till 5/7/10.
  - **Tillsammans** (lagkamp): spelarna turas om och hjälps åt mot klockan, t.ex. 12 rätt på 90 sekunder. Den som väntar ser frågan och hejar. Ett fel visar rätt svar och turen går vidare.
  - Spelare 2 kan vändas upp och ner för att sitta mittemot.
  - Man väljer talkamrater, tiokamrater, minus eller dubblor.
- **Kluriga kamrater**: spelet minns svåra uppgifter i alla världar och låter eleven öva extra på dem.
- **Belöningar**:
  - Svenska hejarop, konfetti, ljud och röst.
  - Bonus vid flera rätt i rad.
  - Stjärnor, titlar, 30 klistermärken och 13 medaljer.

- **Första gången** väljer man mellan att gå med i sin klass, skapa ett eget konto eller bara skriva sitt namn och spela på enheten. Inget namn är förvalt.

### Rösten

Spelet läser upp hejarop och frågor på svenska.

- **Serverns röst (standard):** servern har talsyntesen [Piper](https://github.com/rhasspy/piper) med en svensk röst. Spelet hämtar färdiga ljudfiler (`GET /api/tts?t=…`) och spelar dem som vanligt ljud. Det fungerar på iPhone, i hemskärmsappen och även när telefonen står på ljudlöst. Varje mening räknas bara fram en gång, sedan sparas den på servern och i telefonen.
- **Telefonens röst (reserv):** saknas Piper, eller går servern inte att nå, används webbläsarens egen talsyntes. Den är opålitlig på mobiler.
- **Testa ljudet** längst ner på startsidan spelar en ton och säger en mening, och visar vad som fungerar. Bra att trycka på om det är tyst.
- Piper och rösten (`sv_SE-nst-medium`, ca 60 MB) laddas ner när Docker-avbildningen byggs. Bygg utan med `--build-arg PIPER=0`, byt röst med `--build-arg PIPER_VOICE=…`, eller stäng av med `TTS=off` i env-filen.

## Eget konto utan klass

Den som spelar hemma kan skapa ett **eget konto**: namn, figur och en hemlig bildkod. Eleven får en **egen kod**, t.ex. `BUBBLA-3155`, som visas på startsidan. Med koden och bildkoden kommer eleven åt sina stjärnor, sitt husdjur och sin väg på alla enheter.

- Inloggningen sker på samma ställe som för klassen: skriv koden, tryck bildkoden.
- Ett eget konto kan senare **gå med i en klass** med klasskoden. Allt följer med, och den egna koden slutar gälla.
- Läraren ser egna konton i en egen lista på lärarsidan och kan ge en ny bildkod eller radera.

## Skolor och klasskamp

- **Skolor:** huvudadmin (den med `ADMIN_KEY`) skapar skolor på lärarsidan. Varje skola får en **lärarnyckel** som visas en gång. Med den loggar skolans lärare in på `/admin.html` och ser bara sin skolas klasser. En ny nyckel kan skapas när som helst, och då slutar den gamla gälla.
- **Klasskamp:** skolans lärare startar en kamp, t.ex. *Skolans bubbelberg*, väljer vilka klasser som är med och kan pausa, avsluta eller ta bort den. Kampen kan byggas av bubbelpar, rätta svar, rundor eller stjärnor.
  - Varje klass bygger sitt **eget berg mot ett eget mål** efter hur många elever klassen har, så att små och stora klasser har samma chans.
  - Bergen visas i bokstavsordning, aldrig som en placering. Hejaropen handlar om de andra klasserna: *"2B har byggt 70 % av sitt bubbelberg. Nu kör vi!"*
  - När en klass når 25, 50, 75 och 100 % syns det i alla klassers flöde, och klassen firar.
  - Hela skolans berg tillsammans visas också.

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
- **Alla med**: hur många i klassen som spelat den här veckan ("17 av 24"). När alla har varit med får alla ett extra klistermärke.
- **Klassplutten**: klassens gemensamma husdjur. Den växer av allas rundor och är gladast när många har spelat de senaste dagarna.
- **Kunskapsväggen**: för varje tal, hur många i klassen som kan det. Inga namn, bara en bild av vad klassen kan och var man kan hjälpa varandra.
- **Hemliga presenter**: den som klarar dagens utmaning skickar en godsak till en slumpad klasskompis husdjur. Mottagaren får aldrig veta vem den kom från.
- **Klassens stjärnburk**, ett gemensamt mål som alla fyller tillsammans, och varje elevs stjärnor, klistermärken och medaljer. Listan är sorterad på namn, inte som en topplista.

Lärarsidan visar för varje elev vad den kan bra, vad den behöver träna på, hur mycket den tränat och bidragit, och läraren kan sätta ett fokustal. För klassen visas "alla med", Klassplutten och kunskapsväggen.

**Personuppgifter:** bara förnamn (eller smeknamn), figur och spelresultat sparas. Inga e-postadresser och inga lösenord.

## Klassens status på en annan webbsida

Klassens status kan visas på t.ex. klassens schema: veckans uppdrag, elevens stjärnor och bidrag, husdjurets önskan och en länk till spelet. Det finns två sätt:

- **Eget utseende:** hämta JSON från `GET /api/public/classes/<kod>?name=<namn>`. Alla texter kommer färdiga.
- **Färdig widget:** en iframe mot `widget.html?klass=<kod>&namn=<namn>`. Plutt säger en mening i en liten pratbubbla och syns bara när eleven finns. Med `stil=kort` blir det ett kompakt kort. Färger och tema styrs med parametrar.

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
| `POST /api/accounts` | Eget konto utan klass `{name, avatar, pin}` → token och egen kod |
| `POST /api/me/join` | Eget konto går med i en klass `{code, name?}` |
| `GET /api/tts?t=` | Talsyntes: en WAV-fil med texten uppläst (om Piper finns) |
| `POST /api/login` | `{code, playerId, pin}` → token |
| `GET /api/me` · `PATCH /api/me` | Eleven och framstegen · byt figur |
| `PUT /api/me/progress` | Spara framsteg (slås ihop med det som finns: det bästa från båda) |
| `POST /api/me/rounds` | Logga en spelad runda |
| `GET /api/public/classes/:kod?name=` | Publik klassstatus för widgeten (bara om läraren slagit på det) |
| `GET /api/me/class` | Klassidan: elever, stjärnburk, veckans uppdrag, händelser |
| `POST /api/me/events` | Ny händelse i flödet `{type, detail}` |
| `POST /api/events/:id/cheer` | Heja på en klasskompis |
| `POST /api/me/gift` · `POST /api/me/gifts/seen` | Hemlig present till en klasskompis · markera fått presenter som sedda |
| `POST /api/logout` | Logga ut |
| `/api/admin/...` | Klasser, elever, skolor, klasskamper, ny bildkod, radera. Kräver headern `X-Admin-Key` med adminnyckeln eller en skolas lärarnyckel. |

## Utveckling

```bash
cd server
npm install
ADMIN_KEY=test npm start           # SQLite i ./data, spelet på http://localhost:3000
npm test                           # tester mot SQLite
TEST_PG_URL=postgres://… npm test  # även mot PostgreSQL
TEST_MYSQL_URL=mysql://… npm test  # även mot MySQL/MariaDB
```
