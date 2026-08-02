# GYMMI

Ein mobiler Workout-Tracker als schlanker Frontend-Prototyp im Windows-98-Look.

## Lokal starten

Es gibt keine Build-Abhängigkeiten. Im Projektordner reicht ein kleiner statischer Server:

```bash
python3 -m http.server 8080
```

Danach `http://localhost:8080` öffnen. Übungen, laufende Workouts und Verlauf werden nur im `localStorage` des Browsers gespeichert. Der Service Worker hält die App nach dem ersten Aufruf offline verfügbar.

## Neue Version veröffentlichen

Die sichtbare App-Version steht ausschließlich in `version.json`. Für ein neues Release dort die Versionsnummer ändern, einen Eintrag oben in `changelog.json` ergänzen und alles gemeinsam pushen. Installierte Apps laden das Release erst, wenn unter Einstellungen ausdrücklich nach Updates gesucht und der Download bestätigt wird.

## Lokale Daten und Backups

Einstellungen, Übungen, Vorlagen, laufende Workouts und Verlauf liegen nur im `localStorage` des Browsers. Unter Einstellungen kann der komplette Stand im aktuellen Backupformat als JSON exportiert und wieder importiert werden. Beim Import wird die Datei zuerst geprüft und erst nach einer Bestätigung anstelle der aktuellen lokalen Daten gespeichert.

Seit Version 1.2.0 verwendet der Export Backup-Schema 2. Der Import akzeptiert bewusst nur dieses aktuelle, vollständige Format. Ältere, unvollständige oder beschädigte Daten werden weder migriert noch automatisch repariert. Kann der lokale Stand nicht sicher gelesen werden, bewahrt GYMMI die Rohdaten für einen Notfallexport auf und überschreibt sie nicht.

Der sichtbare Versionsverlauf wird in `changelog.json` gepflegt. Neue Einträge stehen oben und enthalten Versionsnummer, Veröffentlichungsdatum sowie deutsche und englische Texte. Die Datei ist Teil des Offline-Caches und kann unter Einstellungen geöffnet werden. Dort zeigt die Datenverwaltung außerdem die Größe der im `localStorage` gespeicherten GYMMI-Daten an.

## Tests

Die Daten- und Backupprüfung lässt sich ohne zusätzliche Abhängigkeiten testen:

```bash
node --test tests/*.test.js
```
