# Dirigenten-App

Web-App für die Dirigenten des Gemeindechors: Probenplanung, gesungene Lieder im Gottesdienst und Repertoire.

- **Adresse:** https://draonscode.github.io/dirigenten-app/
- **Auf dem Handy:** Adresse in Safari öffnen → Teilen → „Zum Home-Bildschirm“. Einmal anmelden, danach bleibt das Gerät angemeldet.

## Aufbau

| Teil | Wo | Wozu |
|---|---|---|
| App (dieser Code) | GitHub Pages | Oberfläche; wird bei jeder Änderung auf `main` automatisch gebaut und veröffentlicht (`.github/workflows/veroeffentlichen.yml`) |
| Daten | Supabase (Projekt `ogajbvuvehudedkdhadx`, Frankfurt) | Lieder, Kategorien, Einträge, Hinweise; Zugriff nur für angemeldete Konten |
| Noten | Supabase Storage, privater Speicher `noten` | eine PDF pro Lied |

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
