# PrivatDashboard – Unser Zuhause

Private Familien-App (PWA) mit Kalender, Finanzen, Einkauf, Hausbau-Planer und Safe.

- **Web-App:** https://ajdoo11.github.io/PrivatDashboard/
- **Backend:** Firebase-Projekt `mein-pdf-plan-manager` (Anzeigename „PrivatDashboard“)
- **Hosting:** GitHub Pages aus dem Ordner `docs/` (alternativ Firebase Hosting, Site `privatdashboard`)

Der Code ist öffentlich, die **Daten nicht**: Sie liegen in Firestore und sind nur für angemeldete, bestätigte und freigeschaltete Konten lesbar. Die Firebase-Web-Konfiguration ist kein Geheimnis – der Schutz erfolgt über Login und Sicherheitsregeln.

## Aufbau

```
docs/              Web-App (wird ausgeliefert)
  index.html       Layout + Styles
  app.js           App-Logik (alle Module)
  fb.js            Firebase-Initialisierung (Auth + Firestore)
  sw.js            Service Worker (offline)
  manifest.webmanifest, icons/
firestore.rules    Sicherheitsregeln der Datenbank
firebase.json      Firebase Hosting inkl. Sicherheits-Header
```

## Sicherheit

- Anmeldung nur per E-Mail/Passwort, **Selbstregistrierung deaktiviert** (Konten werden in der Konsole angelegt)
- Passwortrichtlinie: mind. 12 Zeichen, Gross-/Kleinbuchstaben, Zahl, Sonderzeichen
- Zugriff auf Daten nur mit **bestätigter E-Mail** und Eintrag in der Freigabeliste `allowlist`
- Firestore-Regeln: nur bekannte Sammlungen, alles andere gesperrt; Freigabeliste nur über die Konsole änderbar
- Content-Security-Policy, beim Abmelden werden lokale Zwischenspeicher gelöscht
- Optionale Safe-PIN pro Gerät

## Neue Person freischalten

1. Firebase-Konsole → Authentication → Nutzer → **Nutzer hinzufügen** (E-Mail + vorläufiges Passwort)
2. Firestore → Daten → Sammlung **`allowlist`** → Dokument mit der **E-Mail in Kleinbuchstaben als Dokument-ID** (Feld z.B. `name`)
3. Die Person meldet sich an, bestätigt ihre E-Mail und setzt über „Passwort vergessen?“ ein eigenes Passwort.

## Änderungen veröffentlichen

Push auf `main` → GitHub Pages aktualisiert die App automatisch nach ca. 1 Minute.
Firestore-Regeln: in der Firebase-Konsole (Firestore → Regeln) oder `firebase deploy --only firestore:rules`.
