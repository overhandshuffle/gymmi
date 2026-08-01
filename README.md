# GYMMI

Ein mobiler Workout-Tracker als schlanker Frontend-Prototyp im Windows-98-Look.

## Lokal starten

Es gibt keine Build-Abhängigkeiten. Im Projektordner reicht ein kleiner statischer Server:

```bash
python3 -m http.server 8080
```

Danach `http://localhost:8080` öffnen. Übungen, laufende Workouts und Verlauf werden nur im `localStorage` des Browsers gespeichert. Der Service Worker hält die App nach dem ersten Aufruf offline verfügbar.

## Neue Version veröffentlichen

Die sichtbare App-Version steht ausschließlich in `version.json`. Für ein neues Release dort beispielsweise `1.0.1` auf `1.1.0` ändern, die gewünschten Dateien anpassen und alles gemeinsam pushen. Installierte Apps laden das Release erst, wenn im Info-Tab ausdrücklich nach Updates gesucht und der Download bestätigt wird.
