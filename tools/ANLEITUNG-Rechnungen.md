# Rechnungs-Import per Mail einrichten

Ziel: Du leitest Rechnungen (z.B. von Onlineshops) an ein eigenes Postfach weiter. Sie erscheinen
automatisch in der App unter **Finanzen → Rechnungen** und werden im Monat der Fälligkeit als
offene Ausgabe eingeplant. Kosten: keine.

## 1. Rechnungs-Postfach anlegen
Neues Gmail-Konto erstellen, z.B. `zuhause.rechnungen@gmail.com` (mit starkem Passwort und 2-Faktor-Anmeldung).

## 2. Zugriff auf die Datenbank erlauben (nur Datenbank, nichts anderes)
Google Cloud Console → Projekt **mein-pdf-plan-manager** → **IAM und Verwaltung → IAM** → **Zugriff gewähren**
- Neues Hauptkonto: die Rechnungs-Adresse
- Rolle: **Cloud Datastore-Nutzer**

## 3. Skript einrichten (im Rechnungs-Postfach angemeldet)
1. https://script.google.com → **Neues Projekt**, Name „Zuhause Rechnungen“
2. Inhalt von `rechnungen-import.gs` in `Code.gs` einfügen
3. Zahnrad **Projekteinstellungen** → „Manifestdatei appsscript.json im Editor anzeigen“ aktivieren → Inhalt von `appsscript.json` einfügen
4. In `ALLOWED_FROM` eure privaten Mail-Adressen eintragen (nur deren Mails werden importiert)
5. Funktion **setup** auswählen → **Ausführen** → Berechtigungen erlauben

Fertig – das Skript prüft nun alle 10 Minuten das Postfach.

## 4. In der App
Finanzen → Rechnungen → Stift-Symbol → Rechnungs-Adresse eintragen.

## Gut zu wissen
- Erkannt werden Betrag in CHF, Fälligkeit („zahlbar bis …“, „innert 30 Tagen“), Rechnungsnummer und IBAN – auch aus PDF-Anhängen und QR-Einzahlungsscheinen.
- Wenn kein Betrag erkannt wird, erscheint die Rechnung unter „Bitte prüfen“.
- Bezahlt markierst du direkt in der Rechnungsliste oder im Monat (Haken).
- Anhänge werden im Safe unter „Belege“ abgelegt.
