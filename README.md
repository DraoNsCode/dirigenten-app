# Dirigenten-App

Web-App für die Dirigenten des Gemeindechors: Probenplanung, gesungene Lieder im Gottesdienst, Repertoire und Übungen.

- **Adresse:** https://draonscode.github.io/dirigenten-app/
- **Auf dem Handy:** Adresse in Safari öffnen → Teilen → „Zum Home-Bildschirm“. Einmal anmelden, danach bleibt das Gerät angemeldet.

## Aufbau

| Teil | Wo | Wozu |
|---|---|---|
| App (dieser Code) | GitHub Pages | Oberfläche; wird bei jeder Änderung auf `main` automatisch gebaut und veröffentlicht (`.github/workflows/veroeffentlichen.yml`) |
| Daten | Supabase (Projekt `ogajbvuvehudedkdhadx`, Frankfurt) | Lieder, Kategorien, Einträge, Hinweise; Zugriff nur für angemeldete Konten |
| Noten | Supabase Storage, privater Speicher `noten` | eine PDF pro Lied |
| Übungen | Supabase Storage, privater Speicher `uebungen` | `uebungen.json` und `grafiken.json` aus dem privaten Repo `chor-uebungen`; dessen Ablauf „In die Dirigenten-App laden“ baut und lädt sie bei jeder Änderung auf `main` hoch. Die App liest nur. |
| Einsingen und Themen | Supabase Storage, privater Speicher `uebungen` | `dirigenten-uebungen.json` (Reiter „Einsingen“) und `dirigenten-inhalt.json` (Reiter „Themen“, neuer Aufbau mit Themenseiten und Familien) aus dem privaten Repo `dirigenten-app-uebungen`. Die App liest nur. |

Im Code stehen nur die Projektadresse und der **öffentliche** Schlüssel von Supabase. Der geheime Schlüssel gehört nie in dieses Repo.

## Konten

Neue Konten nur im Supabase-Dashboard anlegen: Authentication → Users → „Add user“ → „Create new user“, mit „Auto Confirm User“. Die freie Registrierung ist abgeschaltet.

## Entwickeln

```sh
npm install
npm run dev      # lokal starten
npm run build    # Typprüfung und Bauen nach dist/
```

Technik: React, TypeScript, Vite, `@supabase/supabase-js`. Datentypen der Datenbank: `src/datenbank.types.ts`.
