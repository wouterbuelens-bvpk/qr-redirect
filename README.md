# qr-redirect

Deze repository bevat een eenvoudige, statische "QR-code redirect" pagina. Het idee: je publiceert één enkele URL (via GitHub Pages), en voegt daar telkens een andere `?id=...` parameter aan toe voor elke QR-code die je afdrukt. Op basis van die `id` wordt de bezoeker automatisch doorgestuurd naar het juiste doel-adres, dat je centraal beheert in een Google Sheet — zonder dat je ooit de QR-codes zelf moet vervangen.

## Hoe het geheel werkt

1. **Eén statische pagina (`index.html`)**
   De repository bevat één enkel bestand, `index.html`. Dit is een volledig client-side (JavaScript) pagina: er draait geen server- of backend-code. Alles gebeurt in de browser van de bezoeker.

2. **Publicatie via GitHub Pages**
   GitHub Pages serveert de inhoud van deze repository (de `main` branch) als een gewone website, bijvoorbeeld op:
   ```
   https://wouterbuelens-bvpk.github.io/qr-redirect/
   ```
   Je hoeft hiervoor geen build-stap of server op te zetten — GitHub Pages toont `index.html` gewoon als startpagina.

3. **QR-codes verwijzen naar dezelfde pagina, met een unieke `id`**
   Voor elke fysieke QR-code gebruik je dezelfde basis-URL, maar met een eigen `id`-parameter, bijvoorbeeld:
   ```
   https://wouterbuelens-bvpk.github.io/qr-redirect/?id=oupygm
   ```
   Zo kun je tientallen of honderden QR-codes aanmaken die allemaal naar dezelfde pagina wijzen, maar elk een eigen bestemming kunnen krijgen.

4. **Een centrale Google Sheet als "database"**
   De bestemmingen (welke `id` naar welke echte URL moet leiden) worden bijgehouden in een Google Spreadsheet. Die spreadsheet wordt gepubliceerd als TSV (tab-gescheiden tekstbestand) via **Bestand → Publiceren op web**. De URL van dat gepubliceerde bestand staat hardgecodeerd in `index.html` als `tsvUrl`.

   De verwachte structuur van de spreadsheet is simpel, met een headerrij en daarna twee kolommen per rij:
   | id (kolom A) | url (kolom B) |
   |---|---|
   | oupygm | https://www.voorbeeld.be/pagina1 |
   | abc123 | www.voorbeeld.be/pagina2 |

5. **Wat er gebeurt bij het scannen van een QR-code (stap voor stap)**
   - De gebruiker scant de QR-code en komt terecht op `index.html?id=<code>`.
   - JavaScript in de pagina leest de `id`-parameter uit de URL via `URLSearchParams`.
   - Als er geen `id` werd meegegeven, verschijnt meteen een foutmelding ("Geen id-parameter gevonden...").
   - Is er wel een `id`, dan haalt de pagina via `fetch()` de gepubliceerde Google Sheet (TSV) op.
   - De opgehaalde tekst wordt regel per regel (`\n`) en kolom per kolom (`\t`) ontleed.
   - De header-rij (regel 0) wordt overgeslagen; vanaf rij 1 wordt gezocht naar een rij waarvan kolom A exact overeenkomt met de gevraagde `id` (spaties worden genegeerd).
   - Wordt er een match gevonden, dan wordt de URL uit kolom B genomen, eventuele aanhalingstekens (die Google Sheets soms toevoegt) worden verwijderd, en als er geen `http://` of `https://` voor staat, wordt `https://` automatisch toegevoegd.
   - De pagina verbergt de spinner, toont kort "Gevonden! Je wordt nu doorgestuurd..." en stuurt de browser onmiddellijk door met `window.location.replace(targetUrl)` (dit vervangt de huidige pagina in de browserhistorie, zodat de gebruiker niet per ongeluk terug kan naar de tussenpagina).
   - Wordt er **geen** match gevonden in de hele spreadsheet, dan verschijnt de foutmelding "De link is niet gevonden of niet meer actief in de spreadsheet."
   - Als het ophalen van de spreadsheet zelf mislukt (bv. geen internetverbinding, of de gepubliceerde link is ingetrokken), verschijnt de foutmelding "Fout bij het ophalen van de gegevens. Controleer je internetverbinding."

6. **Visuele weergave**
   Terwijl dit gebeurt, toont de pagina:
   - Het HBO Genk-logo.
   - Een draaiende laad-animatie (spinner).
   - Een kort statusbericht ("Je wordt doorgestuurd...").
   - Bij een fout: een rode foutmelding in plaats van de spinner/het bericht.

## Een nieuwe QR-bestemming toevoegen of wijzigen

Omdat alle logica en bestemmingen buiten de code zitten, hoef je voor een nieuwe of gewijzigde QR-code **niets aan te passen in deze repository**:

1. Open de gekoppelde Google Sheet.
2. Voeg een nieuwe rij toe (of pas een bestaande aan) met een unieke `id` in kolom A en de gewenste bestemmings-URL in kolom B.
3. Zorg dat de spreadsheet gepubliceerd blijft op web (Bestand → Publiceren op web).
4. Genereer een QR-code die verwijst naar:
   ```
   https://wouterbuelens-bvpk.github.io/qr-redirect/?id=<jouw-nieuwe-id>
   ```
5. Klaar — zodra iemand deze QR-code scant, wordt die automatisch doorgestuurd naar de ingevulde URL.

## Belangrijke aandachtspunten

- **Caching van Google Sheets**: Google publiceert wijzigingen meestal binnen enkele minuten, maar er kan vertraging optreden.
- **Geen backend/beveiliging**: de koppeling tussen `id` en URL is openbaar leesbaar (iedereen die de TSV-link kent kan de volledige lijst zien). Gebruik dit systeem dus niet voor gevoelige of geheime bestemmingen.
- **Exacte overeenkomst**: de `id` moet exact overeenkomen (spaties worden wel genegeerd, hoofdlettergevoeligheid niet apart behandeld) — zorg dus voor consistente, unieke ids in de spreadsheet.
- **GitHub Pages instellingen**: zorg dat GitHub Pages in de repository-instellingen is ingeschakeld en wijst naar de `main` branch (root), zodat `index.html` effectief als website wordt gepubliceerd.
