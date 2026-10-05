# Talkamrater – publikt API för klassens status

Det här API:t låter en annan webbsida, till exempel klassens schema på `klass2.degerfalt.se`, visa hur det går för klassen och för en elev i Talkamrater. Alla texter kommer färdiga från servern, så sidan behöver inte känna till spelets regler. Den hämtar bara och visar.

## Förutsättningar (görs en gång)

1. **Slå på klassen.** På lärarsidan (`/admin.html`): kryssa i *Visa klassens status på en annan webbsida*. Utan det svarar API:t `404` för klassen.
2. **Tillåt sajten.** I `env/talkamrater.env` på servern, och kör sedan `./uppdatera.sh`:
   ```env
   ALLOWED_ORIGINS=https://klass2.degerfalt.se
   PUBLIC_URL=https://talkamrater.degerfalt.se/
   ```
   - `ALLOWED_ORIGINS` (kommaseparerad) styr både **CORS**, för `fetch` från sajten, och vilka sajter som får visa widgeten i en **iframe**.
   - `PUBLIC_URL` är spelets publika adress. Den används i `playUrl`.

> **Obs:** Sidan som anropar API:t måste ligga på en egen domän, som `klass2.degerfalt.se`. En sida som körs som artefakt i claude.ai får inte anropa andra servrar eller visa iframes från dem.

## Anrop

```
GET https://talkamrater.degerfalt.se/api/public/classes/{klasskod}?name={namn}&events={antal}
```

| Parameter | Var | Krävs | Beskrivning |
|---|---|---|---|
| `klasskod` | sökväg | ja | Klassens kod, t.ex. `SOL-4821`. Skiftläge och bindestreck spelar ingen roll (`sol4821` fungerar). |
| `name` | query | nej | Elevens namn precis som i spelet (skiftläge spelar ingen roll). Ger fältet `me`. |
| `events` | query | nej | Antal senaste händelser, 0–10. Standard 5. |

- Inga inloggningsuppgifter behövs.
- Svaret får cachas i 60 sekunder (`Cache-Control: public, max-age=60`).
- Begränsning: 30 anrop per minut och IP-adress.
- Hämta högst var femte minut, mer behövs inte.

## Svar

```json
{
  "class": {
    "name": "Klass 2", "code": "SOL-4821", "players": 24,
    "pet": {
      "name": "Klassplutten", "stage": 2, "stageName": "Liten", "icon": "🐾",
      "mood": "glad", "moodText": "Klassplutten mår bra. Fler kompisar får gärna spela.",
      "rounds": 180, "nextAt": 360, "percent": 33
    }
  },
  "mission": {
    "title": "Poppa 130 bubbelpar tillsammans",
    "unit": "bubbelpar",
    "goal": 130,
    "progress": 15,
    "percent": 12,
    "done": false,
    "endsAt": 1791158400000,
    "everyone": { "contributed": 17, "players": 24, "allIn": false }
  },
  "contest": {
    "title": "Skolans bubbelberg", "unit": "bubbelpar", "mountain": "bubbelberg",
    "ended": false, "endsAt": null, "total": 236,
    "classes": [
      { "name": "2A", "progress": 36, "goal": 200, "percent": 18, "mine": true },
      { "name": "2B", "progress": 140, "goal": 200, "percent": 70, "mine": false }
    ],
    "text": "2B har byggt 70 % av sitt bubbelberg. Nu kör vi! 🏔️"
  },
  "jar": { "total": 342, "goal": 400 },
  "me": {
    "name": "Edwin",
    "avatar": "🐰",
    "stars": 42,
    "stickers": 3,
    "steps": 3,
    "medals": 1,
    "medalIcons": "🏅",
    "experts": [],
    "dailyStreak": 3,
    "contribution": 15,
    "pet": {
      "name": "Plutt",
      "xp": 95,
      "stage": 2,
      "stageName": "Knatte",
      "icon": "🧸",
      "nextAt": 180,
      "mood": "glad",
      "moodText": "Plutt mår bra.",
      "wish": { "icon": "🍦", "treat": "en glass", "text": "poppa alla bubbelpar som blir 9", "have": 0, "need": 1 }
    },
    "nudge": { "kind": "wish", "text": "Kan du poppa alla bubbelpar som blir 9? Då får jag en glass 🍦" }
  },
  "nameNotFound": false,
  "events": [
    { "type": "daily", "at": 1791058821241, "name": "Edwin", "avatar": "🐰", "text": "Edwin har gjort dagens utmaning 7 dagar i rad 🔥" },
    { "type": "medal", "at": 1791058821231, "name": "Alva", "avatar": "🦄", "text": "Alva vann Kompisbyns medalj 🏅" }
  ],
  "playUrl": "https://talkamrater.degerfalt.se/?klass=SOL-4821"
}
```

### Fälten

**`class`**: klassens namn, kod och antal elever som gått med.

**`class.pet`**: Klassplutten, klassens gemensamma husdjur. Den växer av alla rundor i klassen (räknat per elev, så att små och stora klasser växer lika fort) och mår bra när många har spelat de senaste tre dagarna.
| Fält | Betydelse |
|---|---|
| `name` | Alltid "Klassplutten" |
| `stage`, `stageName`, `icon` | Stadium 0–5 (klassplutten har sex steg): Ägg 🥚, Bebis 🐣, Liten 🐾, Stor 💜, Jätte ✨, Kung 👑 |
| `mood`, `moodText` | `ägg`, `längtar`, `glad` eller `överlycklig`, plus en färdig mening |
| `rounds`, `nextAt` | Klassens rundor hittills och hur många som behövs till nästa stadium (`null` när den är kung) |
| `percent` | 0–100, hur långt det är kvar till nästa stadium |

**`mission`**: veckans gemensamma uppdrag. Det byts måndag 00:00 (serverns tidszon).
| Fält | Typ | Betydelse |
|---|---|---|
| `title` | text | Färdig rubrik, t.ex. "Poppa 130 bubbelpar tillsammans" |
| `unit` | text | Enheten: `bubbelpar`, `rätta svar`, `rundor` eller `stjärnor` |
| `goal`, `progress` | tal | Mål och hur långt klassen kommit |
| `percent` | tal 0–100 | Färdigräknat för en förloppsindikator |
| `done` | bool | `true` när målet är nått |
| `endsAt` | ms sedan 1970 | När veckan tar slut (för "3 dagar kvar") |
| `everyone` | objekt | **Alla med:** `contributed` = hur många elever som spelat minst en runda den här veckan, `players` = antal elever, `allIn` = `true` när alla har varit med (minst två elever). Visa t.ex. "17 av 24 har varit med". När alla är med får alla ett extra klistermärke i spelet. |

**`contest`**: klasskampen klassen är med i, eller `null`. Läraren startar den på lärarsidan och väljer vilka klasser på skolan som är med. Varje klass bygger sitt eget berg mot ett eget mål som beror på hur många elever klassen har. Klasserna kommer i bokstavsordning och ska visas så, aldrig som en placering.
| Fält | Betydelse |
|---|---|
| `title` | T.ex. "Skolans bubbelberg" |
| `unit`, `mountain` | Vad bergen byggs av (`bubbelpar`, `rätta svar`, `rundor`, `stjärnor`) och bergets namn |
| `ended`, `endsAt` | Om kampen är slut, och när den slutar (ms, eller `null` om den inte har något slutdatum). En avslutad kamp syns i en vecka till. |
| `total` | Hela skolans berg tillsammans |
| `classes[]` | `name`, `progress`, `goal`, `percent` (0–100) och `mine` (den egna klassen) |
| `text` | En färdig hejande mening om en annan klass, som "2B har byggt 70 % av sitt bubbelberg. Nu kör vi! 🏔️" |

**`jar`**: klassens stjärnburk: alla elevers stjärnor (`total`) mot lärarens mål (`goal`).

**`me`**: bara med när `name` matchar en elev. Annars `null`, och då är `nameNotFound` `true` om ett namn skickades.
| Fält | Betydelse |
|---|---|
| `name`, `avatar` | Elevens namn och figur (emoji) |
| `stars`, `stickers` | Insamlade stjärnor och antal olika klistermärken (av 30) |
| `steps` | Klarade steg på vägarna till expert (alla världar). Varje tal har tre moment (Lära, Öva, Kunna), och repetitioner och Kom ihåg-prov räknas också, så siffran växer stadigt. |
| `medals`, `medalIcons` | Antal medaljer och medaljerna som emojis |
| `experts` | Världar där eleven är expert: `plus`, `minus`, `dubbel` |
| `dailyStreak` | Dagens utmaning så många dagar i rad |
| `contribution` | Elevens bidrag till veckans uppdrag (samma enhet som `mission.unit`) |
| `pet` | Husdjuret, se nedan |
| `nudge` | **En enda mening från husdjuret** för en liten pratbubbla, se nedan |

**`me.pet`**: elevens husdjur.
| Fält | Betydelse |
|---|---|
| `name` | Husdjurets namn (standard "Plutt") |
| `stage`, `stageName`, `icon` | Stadium 0–9: Ägg 🥚 (0), Bebis 🐣 (20), Knatte 🧸 (80), Liten 🐾 (180), Skolplutt 🎒 (350), Stor 💜 (600), Superplutt 🦸 (1000), Jätte ✨ (1600), Kung 👑 (2500), Legend 🌟 (4000). Talet inom parentes är hur många jordgubbar (`xp`) som behövs. |
| `xp`, `nextAt` | Jordgubbar (stjärnfrukter) och hur många som krävs för nästa stadium (`null` för legend) |
| `mood`, `moodText` | `ägg`, `glad`, `hungrig` eller `överlycklig`, plus en färdig mening |
| `wish` | Dagens önskan, eller `null`. `text` passar efter "Kan du …?". `have`/`need` visar hur långt eleven kommit. |

**`me.nudge`**: det viktigaste husdjuret vill säga just nu, som en färdig mening (`text`) och en typ (`kind`). Ägg, en hemlig present, hunger, en inbjudan till kompisutmaning och en önskan går först. Husdjuret har högst en önskan om dagen, och inte alla dagar. Annars växlar bubblan varannan timme mellan lärarens fokus, dagens utmaning, klassens uppdrag, klasskampen, en pågående kompisutmaning, "alla med" och ett minnestips.

| `kind` | Exempel på `text` |
|---|---|
| `egg` | Ägget väntar på dig. Spela en runda så kläcks det! 🥚 |
| `gift` | Någon i klassen gav mig 🍦 Kom och se! 🎁 · Någon i klassen har gett dig ett klistermärke! Kom och se 🎁 (en hemlig present väntar, försvinner när eleven öppnar spelet) |
| `hungry` | Jag är hungrig! Spelar vi en runda? 🍓 (bebisen: "Bu-hu! Jag är så hungrig 😢 …", kungen: "Kungen är hungrig! …") |
| `buddy` | Alva vill göra en kompisutmaning med dig! 🤝 (en inbjudan går före önskan) · Du och Alva har 25 av 40 rätta svar. Kör! 🤝 (pågående, i växlingen) |
| `wish` | Kan du poppa alla bubbelpar som blir 9? Då får jag en glass 🍦 |
| `daily` | Dagens utmaning väntar! Håll sviten på 3 dagar 🔥 |
| `focus` | Den här veckan tränar vi talkamraterna till 7 ✏️ · Den här veckan tränar vi talkamraterna till 7 och minus från 10 ✏️ (läraren kan välja flera fokus) |
| `mission` | Klassen har 15 av 130 bubbelpar. Hjälper du till? 🤝 |
| `tip` | Kom ihåg: 3 och 5 är kompisar till 8 🧠 |
| `done` | Klassen klarade veckans uppdrag! 🎉 |
| `allin` | Alla 24 i klassen har varit med den här veckan! 🌟 |
| `contest` | 2B har byggt 70 % av sitt bubbelberg. Nu kör vi! 🏔️ (när klassen är med i en klasskamp) |
| `happy` | Plutt mår toppen idag 💜 |

**`events`**: klassens senaste stora händelser, nyast först. Använd `text` direkt. `type` är `medal`, `expert`, `daily`, `book`, `pet`, `mission`, `allin` (alla i klassen har varit med den här veckan), `buddy` (två elever klarade en kompisutmaning, t.ex. "Edwin och Alva klarade en kompisutmaning 🤝") eller `contest` (en klass i klasskampen har nått 25, 50, 75 eller 100 % av sitt berg), och kan användas för egna ikoner. `at` är en tidpunkt i ms.

**`playUrl`**: länk till spelet. Den öppnar *Gå med i klassen* med koden ifylld.

### Fel

| Status | När |
|---|---|
| `404` | Klassen finns inte, eller läraren har inte slagit på publik visning |
| `429` | För många anrop. Vänta en minut. |

Felsvar har formen `{ "error": "Läsbar förklaring på svenska" }`.

## Exempel: hämta och visa (vanilla JS)

```html
<div id="talkamrater"></div>
<script>
  const API = 'https://talkamrater.degerfalt.se/api/public/classes/';
  async function visaTalkamrater(kod, namn) {
    const r = await fetch(`${API}${encodeURIComponent(kod)}?name=${encodeURIComponent(namn)}&events=2`);
    if (!r.ok) return;
    const d = await r.json();
    const m = d.mission, me = d.me;
    document.getElementById('talkamrater').innerHTML = `
      <a href="${d.playUrl}">Talkamrater</a>
      <p>${m.title}: ${m.progress}/${m.goal}</p>
      <progress max="100" value="${m.percent}"></progress>
      ${me ? `<p>${me.avatar} ${me.name} ★ ${me.stars} · bidrag ${me.contribution} ${m.unit}</p>
              <p>${me.pet.icon} ${me.pet.wish ? `${me.pet.name} önskar ${me.pet.wish.icon} om du ${me.pet.wish.text}` : me.pet.moodText}</p>` : ''}`;
  }
  visaTalkamrater('SOL-4821', 'Edwin');
  setInterval(() => visaTalkamrater('SOL-4821', 'Edwin'), 5 * 60 * 1000);
</script>
```

Escapa texterna om de sätts med `innerHTML` på en sida där andra kan skriva namn. Servern tillåter inte `<` eller `>` i namn, men det skadar inte.

## Färdig widget i en iframe

### Pratbubblan (standard, rekommenderas för schemat)

Plutt, elevens husdjur, säger en mening (`me.nudge`) i en liten pratbubbla, och ett klick öppnar spelet. Den är ungefär 40 px hög och tar ingen plats från schemat. **Om eleven inte finns, eller något går fel, visas ingenting alls**, och iframen får höjden 0.

```html
<iframe src="https://talkamrater.degerfalt.se/widget.html?klass=SOL-4821&namn=Edwin"
        title="Talkamrater" style="width:100%;max-width:420px;height:0;border:0;color-scheme:normal"></iframe>
<script>
  // Visar iframen först när Plutt har något att säga, och i rätt höjd
  addEventListener('message', e => {
    if (e.data && e.data.type === 'talkamrater-height')
      document.querySelectorAll('iframe[title="Talkamrater"]').forEach(f => { if (f.contentWindow === e.source) f.style.height = e.data.height + 'px'; });
  });
</script>
```

Placera den gärna i schemats sidhuvud, till höger om rubriken, med `sida=hoger`.

### Kortet (`stil=kort`)

Ett kompakt kort med veckans uppdrag, elevens rad, husdjurets önskan och eventuellt de senaste händelserna. Utan `klass` visas ett litet formulär.

### Parametrar

| Parameter | Exempel | Betydelse |
|---|---|---|
| `klass` | `SOL-4821` | Klasskod |
| `namn` | `Edwin` | Eleven (krävs för bubblan) |
| `stil` | `bubbla` / `kort` | Bubbla är standard |
| `sida` | `hoger` | Bubbla: Plutt till höger om texten |
| `tema` | `ljus`, `mork`, `auto` | Färgläge (standard `auto` = följer enheten) |
| `accent` | `2f6bff` | Accentfärg (hex utan #). Bubblans ram vid hovring, kortets länk och stapel. |
| `husdjur` | `7a5cff` | Plutts färg |
| `bakgrund` | `ffffff` / `transparent` | Bubblans/kortets bakgrund |
| `text` | `1d2433` | Textfärg |
| `rund` | `12` | Hörnradie i px |
| `kant` | `0` | Ta bort ramen |
| `flode` | `3` | Kort: visa de 0–5 senaste händelserna |

## Integritet

Klasskod plus förnamn räcker för att se en elevs status. Därför är funktionen avstängd tills läraren slår på den per klass. Endast förnamn, figur och spelresultat visas, aldrig något annat. Klassplutten och "alla med" visar bara antal, aldrig vem som har eller inte har spelat. Hemliga presenter visar aldrig vem de kom från.

## Be Claude bygga in det i schemat

Klistra in det här i konversationen om klassens schema:

> Lägg till en diskret pratbubbla från Talkamrater i schemats sidhuvud. Hämta `GET https://talkamrater.degerfalt.se/api/public/classes/<KLASSKOD>?name=<NAMN>&events=0` (CORS är öppet för klass2.degerfalt.se). Om svaret har `me.nudge`: visa en liten figur (`me.pet.icon`, eller Talkamraters logga) och en pratbubbla med `me.nudge.text`, och gör hela bubblan till en länk till `playUrl`. Om `me` saknas eller anropet misslyckas: visa ingenting. Bubblan ska följa schemats färger och typsnitt, vara en rad hög och inte ta fokus från schemat. Hämta om var femte minut. Hela API-beskrivningen finns i docs/API.md i repot PerDeg/talkamrater.
>
> Alternativt kan schemat bädda in den färdiga bubblan: `<iframe src="https://talkamrater.degerfalt.se/widget.html?klass=<KLASSKOD>&namn=<NAMN>&sida=hoger">` med höjdskriptet från docs/API.md.
