# GYMMI

Ein mobiler Workout-Tracker als schlanker Frontend-Prototyp im Windows-98-Look.

## Lokal starten

Es gibt keine Build-Abhängigkeiten. Im Projektordner reicht ein kleiner statischer Server:

```bash
python3 -m http.server 8080
```

Danach `http://localhost:8080` öffnen. Übungen, laufende Workouts und Verlauf werden nur im `localStorage` des Browsers gespeichert. Der Service Worker hält die App nach dem ersten Aufruf offline verfügbar.
