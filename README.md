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

Startsidan har en meny längst ner med fyra flikar. Överst hälsar alltid **talkamraterna** (de två figurerna som hjälper en genom spelet tillsammans med Plutt). I sidhuvudet syns jordgubbarna i Plutts korg (tryck för att gå till Plutt) och ⚙️ **Inställningar**. Har man ett konto är knappen i stället ens egen figur med ett litet kugghjul, som en profilbild. Där finns ljud, röst, vem som hejar, testa ljudet, namn eller konto och nollställ.


| Flik | Innehåll |
|---|---|
| 🏠 **Hem** | Titeln, nyheter, listan **Idag** (lärarens fokus alltid överst, nästa steg på vägen, Plutts önskan, kompisutmaning och obesvarade inbjudningar, Kom ihåg-prov, kluriga, klassens uppdrag, klasskampen, dubbletter, och ett tips om dagen om något man inte provat, t.ex. att utmana en kompis eller tallinjen), dagens utmaning och Plutt i litet format. |
| ✏️ **Träna** | Plus, minus och dubblor: vägen till expert (kortet visar tydligt vilket räknesätt den gäller), kluriga, fri träning med alla tal och hur många stjärnor av max man har, fler utmaningar och spela två. |
| Plutt (mini-Plutt som ikon) | Husdjuret och dess önskan, korgen med jordgubbar, garderoben med alla plagg (pris, låst eller ägt) och klistermärken per nivå. |
| 👥 **Klassen** | Veckans uppdrag, kompisutmaning och att gå med i en klass. |

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
  - Sist kommer slutprovet med **diplom**. Det öppnas först när allt är klart **och** man har ★★★ på alla Lära- och Öva-moment.
- **Dagens utmaning**: 8 frågor med ett tema per veckodag (Tiokamratmåndag, Minustisdag, Dubbelonsdag …).
  - Frågorna är samma för alla i klassen samma dag.
  - Den ger en svit 🔥 och ett extra klistermärke.
- **Husdjuret**: ett ägg som kläcks och sakta växer i tio steg: ägg 🥚, bebis 🐣 (20 🍓), knatte 🧸 (80), liten 🐾 (180), skolplutt 🎒 (350), stor 💜 (600), superplutt 🦸 (1000), jätte ✨ (1600), kung 👑 (2500) och legend 🌟 (4000).
  - Varje stjärna ger en jordgubbe 🍓. Det tar många hundra rundor att nå kung.
  - Varje steg har egen personlighet: bebisen gråter lite när den är hungrig, skolplutten har glasögon, superplutten mantel, kungen krona och solglasögon och säger "Jag, Kung Plutt, befaller: mer matte!", legenden glänser.
  - **Garderoben** 👕: köp keps (20 🍓), rosett, glasögon, hattar, supermantel (250 🍓), guldkrona och regnbågsmantel (600 🍓) med jordgubbar från korgen. Finare saker kräver också ett större husdjur.
  - Husdjuret har **önskningar**, till exempel *"Lös det här så får jag en glass! Poppa alla bubbelpar som blir 9."* Varje uppfylld önskan ger en godsak och extra tillväxt. Det blir högst en önskan om dagen, och inte alla dagar.
  - Har eleven inte spelat på några dagar blir husdjuret hungrigt, men det blir aldrig ledset på riktigt.
- **Spela två**: två spelare på samma skärm, i två lägen.
  - **Duell**: den som först svarar rätt får poängen, och den som svarar fel låses en kort stund. Först till 5/7/10.
  - **Tillsammans** (lagkamp): spelarna turas om och hjälps åt mot klockan, t.ex. 12 rätt på 90 sekunder. Den som väntar ser frågan och hejar. Ett fel visar rätt svar och turen går vidare.
  - Spelare 2 kan vändas upp och ner för att sitta mittemot.
  - Man väljer talkamrater, tiokamrater, minus eller dubblor.
- **Fler utmaningar** (nästa steg efter plus, minus och dubblor), var och en med nivåer som låses upp med minst ★★:
  - 📏 **Tallinjen:** Plutt-pilen pekar på ett streck. Vilket tal är det? Eller tryck på strecket där talet bor, t.ex. 46 mellan 40 och 60. Sex nivåer från 0–10 till tallinjer där bara några tal står ut.
  - **Plutts hopp:** hur stora är hoppen mellan strecken? De två första nivåerna har ett tal i mitten som hjälp. Egna nivåer: blandade hopp om 1, 2 och 5, hopp om 3 och 4, stora hopp om 20, 25 och 50, och linjer där Plutt börjar mitt i. Rätt svar och Plutt studsar hela vägen till flaggan. Fel svar och han räknar fel, märker att det inte stämmer med talet som står där och ramlar ner.
  - 🔤 **Hemliga ordet:** räkna ut talet, leta upp det i kodnyckeln och tryck på bokstaven. Bokstäverna blir ett ord, t.ex. KATT 🐱. Nivåer från plus upp till 10 till tiotal utan minnessiffra.
- **Kluriga kamrater**: spelet minns svåra uppgifter i alla världar och låter eleven öva extra på dem.
- **Belöningar**:
  - Svenska hejarop, konfetti, ljud och röst.
  - Bonus vid flera rätt i rad.
  - Stjärnor, titlar i nio nivåer (badgen på Hem har nivåns nummer i stjärnan och visar "Nivå 4 av 9", titeln, en mätare och "211 ★ · 89 kvar", och ett tryck visar hela resan som en slingrande stig med ett eget märke för varje nivå), 60 klistermärken och 13 medaljer. Tryck på en medalj i boken så står det vad som krävs, med en knapp dit.
- **Glänsande klistermärken** ✨: ungefär vart trettionde klistermärke kommer i en glänsande variant som samlas för sig och är värd tre gånger så många jordgubbar.
- **Dela med klassen** 🎁: en dubblett kan delas. Den går anonymt till någon i klassen som saknar just det klistermärket (helst någon med få), aldrig till en utvald kompis. Högst fem om dagen.
- **Klistermärken** ges inte varje runda: 10 % chans med en stjärna, 20 % med två och 35 % med tre. Medaljer, utmaningar och dagens utmaning ger alltid ett. De har fyra nivåer: vanliga (72 %), ovanliga (21 %), sällsynta (6 %) och legendariska (1 %, t.ex. 👑 Krona och 💎 Diamant). Boken är uppdelad per nivå, och ett tryck på ett klistermärke visar stora knappar för att byta eller dela. **Dubbletter byts mot jordgubbar** 🍓 till **Plutts korg**: 1 för en vanlig, 2 ovanlig, 5 sällsynt och 12 legendarisk. Korgens jordgubbar används till **kläder i garderoben** eller som **mat** så att Plutt växer. Det sista exemplaret av ett klistermärke går aldrig att byta bort. Byten sparas i framstegen (`swapped`) och räknas bara uppåt, så att de inte kommer tillbaka när framstegen slås ihop mellan enheter.

- **Första gången** väljer man mellan att gå med i sin klass, skapa ett eget konto eller bara skriva sitt namn och spela på enheten. Inget namn är förvalt.

### Nyheter

När något nytt kommer till spelet visas en ruta högst upp på startsidan, t.ex. *"Nytt! Nu kan du träna på tallinjen"*, och när klassen får ett nytt veckouppdrag. Rutan försvinner när eleven har sett den, och det sparas med elevens framsteg. Nya nyheter läggs i listan `NEWS` i `public/game.js`.

### Klappa Plutt

Husdjuret går att klappa både på Hem och i Plutt-fliken, och säger då något som passar dess nivå. Petar man mer än fem gånger på sex sekunder blir det trött på det: *"Aj aj!"*, *"Nu räcker det faktiskt!"*, *"Jag säger till fröken!"* … och till slut *"Okej, nu tar jag en tupplur. Zzz …"*. Då sover det i 15 sekunder innan det vill prata igen.

### Ändringslogg

Under ⚙️ Inställningar står versionsnumret och **Vad är nytt?**, med alla versioner och vad som ändrats. Listan finns i `CHANGELOG` i `public/game.js`. Lägg till en ny version överst när något ändras i spelet.

### Testläge för vuxna

På `/test/` (länk under ⚙️ Inställningar) finns ett **testläge** med en randig gul rad överst. Det kör samma spel och samma serverkod, men mot en **egen databas i minnet**, så riktiga elever och klasser påverkas aldrig. Varje testare får en påhittad klass med Alva och Sam, en grannklass och en klasskamp. Knappen **Testa…** skapar en viss situation:

- **Kompisutmaning:** Alva bjuder in dig, du väntar på svar från Sam, en pågående utmaning, en som nästan är klar (spela en runda så firar ni) och Alva spelar en runda.
- **Läraren:** fokus på talkamraterna till 7, på minus från 10, tre fokus på en gång, eller inget fokus.
- **Klassen:** klassens berg strax under 75 %, en hemlig present till Plutt och kompisar som hejar.

Testläget sparar sina uppgifter i egna nycklar i webbläsaren och allt försvinner när servern startar om. Databasen är helst en SQLite i minnet. Finns inte SQLite i avbildningen används den vanliga databasen men med egna tabeller (`tk_demo_…`), som töms vid varje start. Kan testläget inte starta körs spelet ändå, utan det. Stäng av det med `DEMO=off` i env-filen.

### Rösten

Spelet läser upp hejarop och frågor på svenska.

- **Serverns röst (standard):** servern har talsyntesen [Piper](https://github.com/rhasspy/piper) med en svensk röst. Spelet hämtar färdiga ljudfiler (`GET /api/tts?t=…`) och spelar dem som vanligt ljud. Det fungerar på iPhone, i hemskärmsappen och även när telefonen står på ljudlöst. Varje mening räknas bara fram en gång, sedan sparas den på servern och i telefonen.
- **Telefonens röst (reserv):** saknas Piper, eller går servern inte att nå, används webbläsarens egen talsyntes. Den är opålitlig på mobiler.
- **Testa ljudet** längst ner på startsidan spelar en ton och säger en mening, och visar vad som fungerar. Bra att trycka på om det är tyst.
- **Röstfigurer:** under *Vem ska heja på dig?* på startsidan väljer eleven 💜 **Plutt** (standard, en ljus och glad röst), 👩 **Lisa**, 👨 **Nils** eller 🤖 **Robot**. Servern har två riktiga röster, `lisa` och `nst`. Plutt är Lisa uppspelad lite fortare och ljusare, och Robot får sin metalliska ton i telefonen.
- Piper och rösterna (ca 60 MB styck) laddas ner när Docker-avbildningen byggs. Bygg utan med `--build-arg PIPER=0`, välj röster med `--build-arg PIPER_VOICES="lisa"`, byt standardröst med `TTS_VOICE=nst` eller stäng av med `TTS=off` i env-filen.

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
- **Kompisutmaning**: bjud in en kompis på skolan (eller i klassen om den inte hör till en skola) till ett mål, t.ex. *Svara rätt på 40 frågor tillsammans* på tre dagar. En utmaning åt gången. En obesvarad inbjudan kan tas tillbaka och gäller i två dagar. Klarar de målet får båda en **kompisbricka** 🤝 (syns i klistermärkesboken), extra mat till husdjuret och en rad i klassflödet.
- **Alla med**: hur många i klassen som spelat den här veckan ("17 av 24"). När alla har varit med får alla ett extra klistermärke.
- **Klassplutten**: klassens gemensamma husdjur. Den växer av allas rundor och är gladast när många har spelat de senaste dagarna.
- **Kunskapsväggen**: för varje tal, hur många i klassen som kan det. Inga namn, bara en bild av vad klassen kan och var man kan hjälpa varandra.
- **Hemliga presenter**: den som klarar dagens utmaning skickar en godsak till en slumpad klasskompis husdjur. Mottagaren får aldrig veta vem den kom från.
- **Klassens stjärnburk**, ett gemensamt mål som alla fyller tillsammans, och varje elevs stjärnor, klistermärken och medaljer. Listan är sorterad på namn, inte som en topplista.

Lärarsidan visar för varje elev vad den kan bra, vad den behöver träna på, hur mycket den tränat och bidragit, och läraren kan sätta **fokus**: ett eller flera tal (högst sex) för hela klassen eller en elev. Fokus står alltid överst i elevens lista Idag, en rad per tal, och kommer oftare i blandade rundor. I kolumnen Fokus ser läraren för varje tal om eleven tränat på det sedan fokuset sattes (✅ 3 rundor, 27 rätt, eller ⏳ inte än), och för klassen hur många som tränat. För klassen visas "alla med", Klassplutten och kunskapsväggen.

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
| `GET /api/me/buddies` · `POST /api/me/challenge` · `POST /api/me/challenge/:id/{accept,decline,cancel,seen,claim}` | Kompisutmaning: kompisar och aktuell utmaning, bjud in, svara, avbryt, hämta bricka |
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
