# PrivatDashboard – Unser Zuhause

Private Familien-App (PWA) mit Kalender, Finanzen, Einkauf, Hausbau-Planer und Safe.

- **Web-App:** https://privatdashboard.web.app
- **Backend:** Firebase-Projekt `mein-pdf-plan-manager` (Anzeigename „PrivatDashboard“)
- **Hosting:** Firebase Hosting, Site `privatdashboard`

## Aufbau

```
public/            Web-App (wird ausgeliefert)
  index.html       Layout + Styles
  app.js           App-Logik (alle Module)
  fb.js            Firebase-Initialisierung (Auth + Firestore)
  sw.js            Service Worker (offline)
  manifest.webmanifest, icons/
firestore.rules    Sicherheitsregeln der Datenbank
firebase.json      Hosting inkl. Sicherheits-Header (CSP usw.)
```

## Sicherheit

- Anmeldung nur per E-Mail/Passwort, **Selbstregistrierung deaktiviert** (Konten werden in der Konsole angelegt)
- Passwortrichtlinie: mind. 12 Zeichen, Gross-/Kleinbuchstaben, Zahl, Sonderzeichen
- Zugriff auf Daten nur mit **bestätigter E-Mail** und Eintrag in der Freigabeliste `allowlist`
- Firestore-Regeln: nur bekannte Sammlungen, alles andere gesperrt; Freigabeliste nur über die Konsole änderbar
- Strenge Content-Security-Policy, kein Einbetten in fremde Seiten (X-Frame-Options/frame-ancestors)
- Beim Abmelden werden lokale Zwischenspeicher gelöscht
- Optionale Safe-PIN pro Gerät

## Neue Person freischalten

1. Firebase-Konsole → Authentication → Nutzer → **Nutzer hinzufügen** (E-Mail + vorläufiges Passwort)
2. Firestore → Daten → Sammlung **`allowlist`** → Dokument mit der **E-Mail in Kleinbuchstaben als Dokument-ID** (Feld z.B. `name`)
3. Die Person meldet sich an, bestätigt ihre E-Mail und setzt über „Passwort vergessen?“ ein eigenes Passwort.

## Deploy

```bash
firebase deploy --only hosting,firestore:rules
```
