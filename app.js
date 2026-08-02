"use strict";

const STORAGE_KEY = "gymmi-state-v1";
const BACKUP_REMINDER_KEY = "gymmi-backup-reminder-v1";
const BACKUP_REMINDER_INTERVAL = 7 * 24 * 60 * 60 * 1000;
const {
  BACKUP_SCHEMA_VERSION,
  GROUPS,
  SUPPORTED_LANGUAGES,
  SUPPORTED_UNITS,
  TRACKING_MODES,
  StateValidationError,
  createBackupReminderMeta,
  createInitialState,
  validateBackup,
  validateBackupReminderMeta,
  validateState,
} = globalThis.GymmiData;
const KG_TO_LBS = 2.2046226218;

const TRANSLATIONS = {
  de: {
    "nav.main": "Hauptnavigation", "nav.workout": "Workout", "nav.exercises": "Übungen", "nav.history": "Verlauf", "nav.settings": "Einstellungen",
    "status.local": "LOKAL GESPEICHERT", "status.saved": "GESPEICHERT ✓", "status.saveFailed": "NICHT GESPEICHERT !",
    "group.all": "Alle", "group.Brust": "Brust", "group.Rücken": "Rücken", "group.Beine": "Beine", "group.Schultern": "Schultern", "group.Arme": "Arme", "group.Core": "Core",
    "exercise.benchPress": "Bankdrücken", "exercise.inclineBenchPress": "Schrägbankdrücken", "exercise.chestPress": "Brustpresse", "exercise.pullUps": "Klimmzüge", "exercise.latPulldown": "Latziehen", "exercise.row": "Rudern", "exercise.squats": "Kniebeugen", "exercise.legPress": "Beinpresse", "exercise.legCurl": "Beinbeuger", "exercise.shoulderPress": "Schulterdrücken", "exercise.lateralRaises": "Seitheben", "exercise.reverseFlys": "Reverse Flys", "exercise.bicepsCurls": "Bizeps Curls", "exercise.hammerCurls": "Hammer Curls", "exercise.tricepsPushdown": "Trizepsdrücken", "exercise.plank": "Plank", "exercise.crunches": "Crunches", "exercise.legRaises": "Beinheben",
    "common.cancel": "Abbrechen", "common.save": "Speichern", "common.delete": "Löschen", "common.confirm": "Bestätigen", "common.closeWindow": "Fenster schließen", "common.closeApp": "GYMMI schließen", "common.error": "FEHLER", "common.unknown": "unbekannt",
    "bsod.title": "Windows", "bsod.error": "Der schwere Ausnahmefehler 0E ist an Adresse 0028:C0011E36 in der VXD-Datei VMM(01) + 00010E36 aufgetreten. Die aktuelle Anwendung wird beendet.", "bsod.terminate": "Drücken Sie eine beliebige Taste, um die aktuelle Anwendung zu beenden.", "bsod.restart": "Drücken Sie STRG+ALT+ENTF erneut, um den Computer neu zu starten. Nicht gespeicherte Daten gehen dabei verloren.", "bsod.return": "Tippe auf den Bildschirm oder drücke eine beliebige Taste, um zu GYMMI zurückzukehren.",
    "picker.title": "Übung hinzufügen", "picker.search": "Suchen:", "picker.filter": "Nach Muskelgruppe filtern", "picker.create": "+ Eigene Übung erstellen", "picker.add": "+ Hinzufügen", "picker.empty": "Keine Übung gefunden.",
    "newExercise.title": "Neue Übung", "newExercise.name": "Name", "newExercise.placeholder": "z. B. Liegestütze", "newExercise.group": "Muskelgruppe", "newExercise.tracking": "Eingaben pro Satz", "newExercise.weighted": "Wiederholungen und Gewicht", "newExercise.repsOnly": "Nur Wiederholungen", "newExercise.exists": "Diese Übung gibt es bereits", "newExercise.saved": "Übung gespeichert", "editExercise.title": "Eigene Übung bearbeiten", "editExercise.saved": "Übung geändert", "editExercise.hint": "Die Änderung gilt für die Bibliothek und gespeicherte Vorlagen. Verlauf und laufendes Workout bleiben unverändert.",
    "finish.title": "Workout abschließen", "finish.message": "Workout speichern und beenden?", "finish.yes": "Ja, speichern",
    "update.title": "Update gefunden", "update.available": "Eine neue Version ist verfügbar.", "update.later": "Später", "update.download": "Herunterladen", "update.downloading": "Wird geladen…",
    "template.dialogTitle": "Workout-Vorlage speichern", "template.name": "Name der Vorlage", "template.placeholder": "z. B. Push Day", "template.hint": "Übungen und Satzanzahl werden übernommen. Gewichte und Wiederholungen bleiben im neuen Workout leer.", "template.save": "Vorlage speichern",
    "history.editTitle": "Workout bearbeiten", "history.saveChanges": "Änderungen speichern", "history.dateTime": "Datum und Uhrzeit", "history.repsShort": "Wdh.",
    "import.title": "Backup importieren", "import.defaultMessage": "Die lokalen Daten werden durch das Backup ersetzt.", "import.now": "Jetzt importieren",
    "confirm.title": "Aktion bestätigen", "confirm.defaultMessage": "Soll diese Aktion wirklich ausgeführt werden?",
    "changelog.title": "GYMMI – Versionsverlauf", "changelog.loading": "CHANGELOG WIRD GELADEN…", "changelog.empty": "Noch keine Versionseinträge vorhanden.", "changelog.retry": "Bitte prüfe deine Verbindung und versuche es erneut.", "changelog.unknownDate": "Datum unbekannt", "changelog.update": "Update",
    "workout.none": "KEIN WORKOUT AKTIV", "workout.noneHint": "Starte ein leeres Training oder verwende eine deiner Vorlagen.", "workout.startEmpty": "Leeres Workout starten", "workout.savedRoutines": "GESPEICHERTE ROUTINEN", "workout.templates": "Workout-Vorlagen", "workout.noTemplate": "Noch keine Vorlage. Starte ein Workout und speichere die Übungsauswahl als Vorlage.", "workout.current": "AKTUELLES WORKOUT", "workout.running": "Training läuft", "workout.asTemplate": "Als Vorlage", "workout.discard": "Verwerfen", "workout.time": "ZEIT", "workout.done": "ERLEDIGT", "workout.setsUpper": "SÄTZE", "workout.noExercise": "Noch keine Übung im Workout.", "workout.addExercise": "+ Übung", "workout.finish": "Workout fertig", "workout.start": "Start", "workout.exercises": "Übungen", "workout.singular": "Workout", "workout.plural": "Workouts", "workout.reps": "Wdh.", "workout.weight": "Gewicht", "workout.history": "Historie", "workout.removeSet": "− Satz", "workout.addSet": "+ Satz", "workout.removeExercise": "Übung entfernen", "workout.set": "Satz", "workout.markOpen": "als offen markieren", "workout.complete": "abschließen",
    "exerciseHistory.title": "Übungshistorie", "exerciseHistory.empty": "Für diese Übung gibt es noch keine gespeicherten Trainings.", "exerciseHistory.sets": "Sätze",
    "library.title": "ÜBUNGSBIBLIOTHEK", "library.new": "+ Neu", "library.chooseGroup": "Muskelgruppe wählen", "library.empty": "Keine Übung in dieser Gruppe.", "library.custom": "EIGEN", "library.repsOnly": "NUR WDHL.", "library.quickAdd": "+ Workout", "library.edit": "Bearbeiten",
    "history.log": "TRAININGSLOG", "history.clearAll": "Alle löschen", "history.noEntries": "NOCH KEINE EINTRÄGE", "history.emptyHint": "Abgeschlossene Workouts erscheinen hier.", "history.noCompleted": "Keine abgeschlossenen Sätze", "history.noExercises": "Keine Übungen gespeichert.", "history.edit": "Bearbeiten",
    "settings.controlPanel": "SYSTEMSTEUERUNG", "settings.title": "Einstellungen", "settings.general": "Allgemein", "settings.language": "Sprache", "settings.unit": "Gewichtseinheit", "settings.german": "Deutsch", "settings.english": "English", "settings.kg": "Kilogramm (KG)", "settings.lbs": "Pfund (LBS)", "settings.unitHint": "Gespeicherte Gewichte werden bei einem Wechsel automatisch umgerechnet angezeigt.",
    "settings.tagline": "Minimaler Workout-Tracker<br />für maximale Gains.", "settings.softwareUpdate": "Software-Update", "settings.updateHint": "Prüft nur auf deinen ausdrücklichen Wunsch, ob auf GitHub Pages eine neuere Version liegt.", "settings.checkUpdates": "Auf Updates prüfen", "settings.versionHistory": "Versionsverlauf", "settings.changelogHint": "Zeigt Veröffentlichungsdatum und Änderungen aller bisherigen GYMMI-Versionen.", "settings.openChangelog": "Changelog öffnen", "settings.dataManagement": "Datenverwaltung", "settings.localData": "LOKALE GYMMI-DATEN", "settings.storageNote": "Gemessen werden deine gespeicherten Trainingsdaten. Die installierten App-Dateien zählen nicht dazu.", "settings.backupHint": "Sichert oder ersetzt Einstellungen, Übungen, Vorlagen, laufendes Workout und Trainingsverlauf.", "settings.export": "JSON-Backup exportieren", "settings.import": "JSON-Backup importieren", "settings.backupSchedule": "Backup-Erinnerung", "settings.backupEverySevenDays": "GYMMI erinnert dich alle 7 Tage lokal an ein neues Backup.", "settings.lastBackup": "Letztes Backup", "settings.nextReminder": "Nächste Erinnerung", "settings.noBackup": "Noch keines", "settings.reminderDue": "Jetzt fällig", "settings.privacy": "DATENSCHUTZ", "settings.privacyLocal": "Workouts bleiben auf diesem Gerät.", "settings.privacyNoTracking": "Keine Anmeldung und kein Tracking.", "settings.privacyUpdate": "Die Updateprüfung lädt nur die Versionsnummer.",
    "backupReminder.title": "Backup-Erinnerung", "backupReminder.message": "Dein letztes Backup ist mindestens 7 Tage her. Möchtest du jetzt eine neue lokale JSON-Sicherung erstellen?", "backupReminder.later": "In 7 Tagen erinnern", "backupReminder.now": "Jetzt sichern",
    "toast.workoutStarted": "Workout gestartet", "toast.templateStarted": "„{name}“ gestartet", "toast.templateSaved": "Vorlage gespeichert", "toast.templateExists": "Eine Vorlage mit diesem Namen existiert schon", "toast.templateDeleted": "Vorlage gelöscht", "toast.added": "{name} hinzugefügt", "toast.workoutDiscarded": "Workout verworfen", "toast.workoutSaved": "Workout gespeichert", "toast.workoutChanged": "Workout geändert", "toast.workoutDeleted": "Workout gelöscht", "toast.historyDeleted": "Verlauf gelöscht", "toast.exerciseDeleted": "Übung gelöscht", "toast.dateRequired": "Bitte Datum und Uhrzeit angeben", "toast.limitReached": "Das Größenlimit für diesen Bereich ist erreicht", "toast.backupShared": "Backup zum Teilen bereit", "toast.backupDownloaded": "JSON-Backup heruntergeladen", "toast.exportFailed": "Export fehlgeschlagen", "toast.tooLarge": "Backup ist größer als 5 MB", "toast.invalidJson": "Ungültige JSON-Datei", "toast.backupImported": "Backup importiert", "toast.updateInstalled": "Update installiert – Neustart…",
    "dialog.deleteTemplateTitle": "Vorlage löschen", "dialog.deleteTemplateMessage": "Soll die Vorlage „{name}“ wirklich gelöscht werden?", "dialog.discardTitle": "Workout verwerfen", "dialog.discardMessage": "Soll das aktuelle Workout wirklich verworfen werden? Alle noch nicht gespeicherten Sätze gehen verloren.", "dialog.deleteWorkoutTitle": "Workout löschen", "dialog.deleteWorkoutMessage": "Soll das Workout vom {date} wirklich aus dem Verlauf gelöscht werden?", "dialog.clearHistoryTitle": "Verlauf löschen", "dialog.clearHistoryMessage": "Sollen wirklich alle {count} Workouts aus dem Verlauf gelöscht werden? Übungen und Vorlagen bleiben erhalten.", "dialog.deleteExerciseTitle": "Übung löschen", "dialog.deleteExerciseMessage": "Soll die Übung „{name}“ wirklich aus der Bibliothek gelöscht werden? Bereits gespeicherte Workouts bleiben erhalten.",
    "backup.invalid": "Diese Datei ist kein aktuelles GYMMI-Backup.", "backup.invalidField": "Das Backup ist bei „{path}“ ungültig. Es wurde nichts importiert.", "backup.active": "1 laufendes Workout", "backup.replace": "Deine aktuellen lokalen Daten werden ersetzt.",
    "storage.failed": "Die lokalen Daten konnten nicht gespeichert werden.", "recovery.title": "Lokale Daten beschädigt", "recovery.message": "GYMMI kann die gespeicherten Daten nicht sicher lesen. Die Rohdaten bleiben unverändert, bis du sie exportierst oder bewusst zurücksetzt.", "recovery.export": "Rohdaten exportieren", "recovery.reset": "Daten zurücksetzen", "recovery.exported": "Rohdaten exportiert", "recovery.resetTitle": "Lokale Daten zurücksetzen", "recovery.resetMessage": "Sollen die nicht lesbaren lokalen Daten wirklich gelöscht und ein neuer leerer Stand angelegt werden?",
    "update.searching": "Suche nach Updates…", "update.current": "Version {version} ist aktuell.", "update.serverVersion": "Installiert: {installed} · Server: {remote}", "update.found": "Neue Version {version} gefunden.", "update.ask": "Version {version} ist verfügbar. Möchtest du das Update jetzt herunterladen und installieren?", "update.failed": "Prüfung fehlgeschlagen: {message}", "update.offline": "Keine Internetverbindung. Bitte später erneut versuchen.", "update.loaded": "Version {version} wurde geladen. Neustart…", "update.installFailed": "Installation fehlgeschlagen: {message}",
  },
  en: {
    "nav.main": "Main navigation", "nav.workout": "Workout", "nav.exercises": "Exercises", "nav.history": "History", "nav.settings": "Settings",
    "status.local": "SAVED LOCALLY", "status.saved": "SAVED ✓", "status.saveFailed": "NOT SAVED !",
    "group.all": "All", "group.Brust": "Chest", "group.Rücken": "Back", "group.Beine": "Legs", "group.Schultern": "Shoulders", "group.Arme": "Arms", "group.Core": "Core",
    "exercise.benchPress": "Bench Press", "exercise.inclineBenchPress": "Incline Bench Press", "exercise.chestPress": "Chest Press", "exercise.pullUps": "Pull-ups", "exercise.latPulldown": "Lat Pulldown", "exercise.row": "Rows", "exercise.squats": "Squats", "exercise.legPress": "Leg Press", "exercise.legCurl": "Leg Curl", "exercise.shoulderPress": "Shoulder Press", "exercise.lateralRaises": "Lateral Raises", "exercise.reverseFlys": "Reverse Flys", "exercise.bicepsCurls": "Biceps Curls", "exercise.hammerCurls": "Hammer Curls", "exercise.tricepsPushdown": "Triceps Pushdown", "exercise.plank": "Plank", "exercise.crunches": "Crunches", "exercise.legRaises": "Leg Raises",
    "common.cancel": "Cancel", "common.save": "Save", "common.delete": "Delete", "common.confirm": "Confirm", "common.closeWindow": "Close window", "common.closeApp": "Close GYMMI", "common.error": "ERROR", "common.unknown": "unknown",
    "bsod.title": "Windows", "bsod.error": "A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) + 00010E36. The current application will be terminated.", "bsod.terminate": "Press any key to terminate the current application.", "bsod.restart": "Press CTRL+ALT+DEL again to restart your computer. You will lose any unsaved information in all applications.", "bsod.return": "Tap the screen or press any key to return to GYMMI.",
    "picker.title": "Add exercise", "picker.search": "Search:", "picker.filter": "Filter by muscle group", "picker.create": "+ Create custom exercise", "picker.add": "+ Add", "picker.empty": "No exercise found.",
    "newExercise.title": "New exercise", "newExercise.name": "Name", "newExercise.placeholder": "e.g. Push-ups", "newExercise.group": "Muscle group", "newExercise.tracking": "Inputs per set", "newExercise.weighted": "Repetitions and weight", "newExercise.repsOnly": "Repetitions only", "newExercise.exists": "This exercise already exists", "newExercise.saved": "Exercise saved", "editExercise.title": "Edit custom exercise", "editExercise.saved": "Exercise updated", "editExercise.hint": "The change applies to the library and saved templates. History and the active workout remain unchanged.",
    "finish.title": "Finish workout", "finish.message": "Save and finish this workout?", "finish.yes": "Yes, save",
    "update.title": "Update found", "update.available": "A new version is available.", "update.later": "Later", "update.download": "Download", "update.downloading": "Downloading…",
    "template.dialogTitle": "Save workout template", "template.name": "Template name", "template.placeholder": "e.g. Push Day", "template.hint": "Exercises and set counts will be copied. Weights and repetitions start empty in a new workout.", "template.save": "Save template",
    "history.editTitle": "Edit workout", "history.saveChanges": "Save changes", "history.dateTime": "Date and time", "history.repsShort": "Reps",
    "import.title": "Import backup", "import.defaultMessage": "Your local data will be replaced by this backup.", "import.now": "Import now",
    "confirm.title": "Confirm action", "confirm.defaultMessage": "Do you really want to perform this action?",
    "changelog.title": "GYMMI – Version history", "changelog.loading": "LOADING CHANGELOG…", "changelog.empty": "No version entries yet.", "changelog.retry": "Check your connection and try again.", "changelog.unknownDate": "Unknown date", "changelog.update": "Update",
    "workout.none": "NO ACTIVE WORKOUT", "workout.noneHint": "Start an empty workout or use one of your templates.", "workout.startEmpty": "Start empty workout", "workout.savedRoutines": "SAVED ROUTINES", "workout.templates": "Workout templates", "workout.noTemplate": "No templates yet. Start a workout and save its exercise selection as a template.", "workout.current": "CURRENT WORKOUT", "workout.running": "Workout in progress", "workout.asTemplate": "Save template", "workout.discard": "Discard", "workout.time": "TIME", "workout.done": "COMPLETED", "workout.setsUpper": "SETS", "workout.noExercise": "No exercises in this workout yet.", "workout.addExercise": "+ Exercise", "workout.finish": "Finish workout", "workout.start": "Start", "workout.exercises": "Exercises", "workout.singular": "Workout", "workout.plural": "Workouts", "workout.reps": "Reps", "workout.weight": "Weight", "workout.history": "History", "workout.removeSet": "− Set", "workout.addSet": "+ Set", "workout.removeExercise": "Remove exercise", "workout.set": "Set", "workout.markOpen": "mark as open", "workout.complete": "complete",
    "exerciseHistory.title": "Exercise history", "exerciseHistory.empty": "There are no saved workouts for this exercise yet.", "exerciseHistory.sets": "Sets",
    "library.title": "EXERCISE LIBRARY", "library.new": "+ New", "library.chooseGroup": "Choose muscle group", "library.empty": "No exercise in this group.", "library.custom": "CUSTOM", "library.repsOnly": "REPS ONLY", "library.quickAdd": "+ Workout", "library.edit": "Edit",
    "history.log": "WORKOUT LOG", "history.clearAll": "Delete all", "history.noEntries": "NO ENTRIES YET", "history.emptyHint": "Completed workouts will appear here.", "history.noCompleted": "No completed sets", "history.noExercises": "No exercises saved.", "history.edit": "Edit",
    "settings.controlPanel": "CONTROL PANEL", "settings.title": "Settings", "settings.general": "General", "settings.language": "Language", "settings.unit": "Weight unit", "settings.german": "Deutsch", "settings.english": "English", "settings.kg": "Kilograms (KG)", "settings.lbs": "Pounds (LBS)", "settings.unitHint": "Saved weights are automatically converted for display when you switch units.",
    "settings.tagline": "Minimal workout tracker<br />for maximum gains.", "settings.softwareUpdate": "Software update", "settings.updateHint": "Only checks GitHub Pages for a newer version when you explicitly ask it to.", "settings.checkUpdates": "Check for updates", "settings.versionHistory": "Version history", "settings.changelogHint": "Shows release dates and changes for all GYMMI versions.", "settings.openChangelog": "Open changelog", "settings.dataManagement": "Data management", "settings.localData": "LOCAL GYMMI DATA", "settings.storageNote": "This measures your saved workout data. Installed app files are not included.", "settings.backupHint": "Backs up or replaces settings, exercises, templates, the active workout and workout history.", "settings.export": "Export JSON backup", "settings.import": "Import JSON backup", "settings.backupSchedule": "Backup reminder", "settings.backupEverySevenDays": "GYMMI reminds you locally to create a new backup every 7 days.", "settings.lastBackup": "Last backup", "settings.nextReminder": "Next reminder", "settings.noBackup": "None yet", "settings.reminderDue": "Due now", "settings.privacy": "PRIVACY", "settings.privacyLocal": "Workouts stay on this device.", "settings.privacyNoTracking": "No account and no tracking.", "settings.privacyUpdate": "The update check only downloads the version number.",
    "backupReminder.title": "Backup reminder", "backupReminder.message": "Your last backup was at least 7 days ago. Would you like to create a new local JSON backup now?", "backupReminder.later": "Remind me in 7 days", "backupReminder.now": "Back up now",
    "toast.workoutStarted": "Workout started", "toast.templateStarted": "“{name}” started", "toast.templateSaved": "Template saved", "toast.templateExists": "A template with this name already exists", "toast.templateDeleted": "Template deleted", "toast.added": "{name} added", "toast.workoutDiscarded": "Workout discarded", "toast.workoutSaved": "Workout saved", "toast.workoutChanged": "Workout updated", "toast.workoutDeleted": "Workout deleted", "toast.historyDeleted": "History deleted", "toast.exerciseDeleted": "Exercise deleted", "toast.dateRequired": "Please enter a date and time", "toast.limitReached": "The size limit for this section has been reached", "toast.backupShared": "Backup ready to share", "toast.backupDownloaded": "JSON backup downloaded", "toast.exportFailed": "Export failed", "toast.tooLarge": "Backup is larger than 5 MB", "toast.invalidJson": "Invalid JSON file", "toast.backupImported": "Backup imported", "toast.updateInstalled": "Update installed – restarting…",
    "dialog.deleteTemplateTitle": "Delete template", "dialog.deleteTemplateMessage": "Do you really want to delete the template “{name}”?", "dialog.discardTitle": "Discard workout", "dialog.discardMessage": "Do you really want to discard this workout? All unsaved sets will be lost.", "dialog.deleteWorkoutTitle": "Delete workout", "dialog.deleteWorkoutMessage": "Do you really want to delete the workout from {date}?", "dialog.clearHistoryTitle": "Delete history", "dialog.clearHistoryMessage": "Do you really want to delete all {count} workouts from history? Exercises and templates will remain.", "dialog.deleteExerciseTitle": "Delete exercise", "dialog.deleteExerciseMessage": "Do you really want to delete “{name}” from the library? Saved workouts will remain.",
    "backup.invalid": "This file is not a current GYMMI backup.", "backup.invalidField": "The backup is invalid at “{path}”. Nothing was imported.", "backup.active": "1 active workout", "backup.replace": "Your current local data will be replaced.",
    "storage.failed": "The local data could not be saved.", "recovery.title": "Local data corrupted", "recovery.message": "GYMMI cannot safely read the saved data. The raw data stays unchanged until you export or deliberately reset it.", "recovery.export": "Export raw data", "recovery.reset": "Reset data", "recovery.exported": "Raw data exported", "recovery.resetTitle": "Reset local data", "recovery.resetMessage": "Do you really want to delete the unreadable local data and create a new empty state?",
    "update.searching": "Checking for updates…", "update.current": "Version {version} is up to date.", "update.serverVersion": "Installed: {installed} · Server: {remote}", "update.found": "New version {version} found.", "update.ask": "Version {version} is available. Do you want to download and install it now?", "update.failed": "Update check failed: {message}", "update.offline": "No internet connection. Please try again later.", "update.loaded": "Version {version} downloaded. Restarting…", "update.installFailed": "Installation failed: {message}",
  },
};

function language() {
  return state.settings.language;
}

function t(key, variables = {}) {
  const template = TRANSLATIONS[language()]?.[key] ?? TRANSLATIONS.de[key] ?? key;
  return String(template).replace(/\{(\w+)\}/g, (_, name) => variables[name] ?? "");
}

function groupLabel(group) {
  return t(group === "Alle" ? "group.all" : `group.${group}`);
}

const STARTER_EXERCISES = [
  ["Bankdrücken", "Brust"],
  ["Schrägbankdrücken", "Brust"],
  ["Brustpresse", "Brust"],
  ["Klimmzüge", "Rücken"],
  ["Latziehen", "Rücken"],
  ["Rudern", "Rücken"],
  ["Kniebeugen", "Beine"],
  ["Beinpresse", "Beine"],
  ["Beinbeuger", "Beine"],
  ["Schulterdrücken", "Schultern"],
  ["Seitheben", "Schultern"],
  ["Reverse Flys", "Schultern"],
  ["Bizeps Curls", "Arme"],
  ["Hammer Curls", "Arme"],
  ["Trizepsdrücken", "Arme"],
  ["Plank", "Core"],
  ["Crunches", "Core"],
  ["Beinheben", "Core"],
];
const STARTER_NAME_KEYS = [
  "benchPress", "inclineBenchPress", "chestPress", "pullUps", "latPulldown", "row",
  "squats", "legPress", "legCurl", "shoulderPress", "lateralRaises", "reverseFlys",
  "bicepsCurls", "hammerCurls", "tricepsPushdown", "plank", "crunches", "legRaises",
];
const STARTER_EXERCISE_DATA = STARTER_EXERCISES.map(([name, group], index) => ({
  id: `starter-${index + 1}`,
  name,
  group,
  custom: false,
  trackingMode: "weighted",
}));

function exerciseDisplayName(exercise) {
  const id = exercise.libraryId || exercise.id;
  const starterIndex = /^starter-(\d+)$/.exec(id)?.[1];
  const key = starterIndex ? STARTER_NAME_KEYS[Number(starterIndex) - 1] : null;
  return key ? t(`exercise.${key}`) : exercise.name;
}

let recoveryRawData = null;
let storageLocked = false;
let storageStatusKey = "status.local";
let storageStatusTimer;
let pendingStateSaveTimer;
let saveFailureActive = false;
let state = loadState();
let backupReminderMeta = loadBackupReminderMeta();
let currentView = "workout";
let pickerGroup = "Alle";
let addNewExerciseToWorkout = false;
let toastTimer;
let appVersion = null;
let pendingVersion = null;
let updateStatus = "";
let updateCheckInProgress = false;
let pendingImportState = null;
let editingHistoryId = null;
let pickerViewportHeight = 0;
let pickerBottom = 0;
let changelogEntries = null;
let lastInteractionWasKeyboard = false;
let editingLibraryExerciseId = null;

const app = document.querySelector("#app");
const desktop = document.querySelector(".desktop");
const appCloseButton = document.querySelector("#app-close-button");
const bsod = document.querySelector("#bsod");
const picker = document.querySelector("#exercise-picker");
const newExerciseDialog = document.querySelector("#new-exercise-dialog");
const finishDialog = document.querySelector("#finish-dialog");
const searchInput = document.querySelector("#exercise-search");
const importInput = document.querySelector("#json-import-input");
const importDialog = document.querySelector("#import-dialog");
const templateDialog = document.querySelector("#template-dialog");
const historyEditDialog = document.querySelector("#history-edit-dialog");
const exerciseHistoryDialog = document.querySelector("#exercise-history-dialog");
const changelogDialog = document.querySelector("#changelog-dialog");
const confirmationDialog = document.querySelector("#confirmation-dialog");
const recoveryDialog = document.querySelector("#recovery-dialog");
const backupReminderDialog = document.querySelector("#backup-reminder-dialog");
let confirmationResolver = null;

function showCrashScreen() {
  if (!bsod.hidden) return;
  document.body.classList.add("is-crashed");
  desktop.inert = true;
  bsod.hidden = false;
  bsod.focus({ preventScroll: true });
}

function hideCrashScreen() {
  if (bsod.hidden) return;
  bsod.hidden = true;
  desktop.inert = false;
  document.body.classList.remove("is-crashed");
  appCloseButton.focus({ preventScroll: true });
}

function makeId(prefix) {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}-${randomPart}`;
}

function cleanText(value, maxLength = 80) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function loadState() {
  let savedData;
  try {
    savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData === null) return createInitialState(STARTER_EXERCISE_DATA);
    return validateState(JSON.parse(savedData));
  } catch (error) {
    recoveryRawData = savedData ?? "";
    storageLocked = true;
    console.error("GYMMI could not read local data safely.", error);
    return createInitialState(STARTER_EXERCISE_DATA);
  }
}

function loadBackupReminderMeta() {
  try {
    const savedData = localStorage.getItem(BACKUP_REMINDER_KEY);
    return savedData === null
      ? createBackupReminderMeta()
      : validateBackupReminderMeta(JSON.parse(savedData));
  } catch (error) {
    console.warn("GYMMI could not read backup reminder metadata.", error);
    return createBackupReminderMeta();
  }
}

function saveBackupReminderMeta() {
  try {
    backupReminderMeta = validateBackupReminderMeta(backupReminderMeta);
    localStorage.setItem(BACKUP_REMINDER_KEY, JSON.stringify(backupReminderMeta));
    return true;
  } catch (error) {
    console.warn("GYMMI could not save backup reminder metadata.", error);
    return false;
  }
}

function nextBackupReminderAt() {
  return Math.max(
    backupReminderMeta.trackingStartedAt,
    backupReminderMeta.lastBackupAt || 0,
    backupReminderMeta.lastReminderAt || 0,
  ) + BACKUP_REMINDER_INTERVAL;
}

function markBackupCreated() {
  backupReminderMeta.lastBackupAt = Date.now();
  saveBackupReminderMeta();
  refreshInfoView();
}

function maybeShowBackupReminder() {
  if (storageLocked || Date.now() < nextBackupReminderAt() || document.querySelector("dialog[open]")) return;
  backupReminderMeta.lastReminderAt = Date.now();
  saveBackupReminderMeta();
  backupReminderDialog.showModal();
}

function updateStorageStatus() {
  const status = document.querySelector("#storage-status");
  if (status) status.textContent = t(storageStatusKey);
}

function saveState() {
  if (storageLocked) return false;
  window.clearTimeout(pendingStateSaveTimer);
  pendingStateSaveTimer = null;
  try {
    state = validateState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    saveFailureActive = false;
    storageStatusKey = "status.saved";
    updateStorageStatus();
    window.clearTimeout(storageStatusTimer);
    storageStatusTimer = window.setTimeout(() => {
      storageStatusKey = "status.local";
      updateStorageStatus();
    }, 900);
    return true;
  } catch (error) {
    storageStatusKey = "status.saveFailed";
    saveFailureActive = true;
    updateStorageStatus();
    showToast(t("storage.failed"), true);
    console.error("GYMMI could not save local data.", error);
    return false;
  }
}

function scheduleStateSave() {
  window.clearTimeout(pendingStateSaveTimer);
  pendingStateSaveTimer = window.setTimeout(saveState, 250);
}

function flushStateSave() {
  if (pendingStateSaveTimer) saveState();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pixelIcon(name) {
  return `<svg class="pixel-icon" aria-hidden="true"><use href="icons.svg#${name}"></use></svg>`;
}

function currentUnit() {
  return state.settings.unit;
}

function displayWeight(weightInKg) {
  if (weightInKg === "" || weightInKg === null || weightInKg === undefined) return "";
  const numeric = Number(String(weightInKg).replace(",", "."));
  if (!Number.isFinite(numeric)) return "";
  const converted = currentUnit() === "lbs" ? numeric * KG_TO_LBS : numeric;
  return String(Math.round(converted * 100) / 100);
}

function storeWeight(displayedWeight) {
  if (displayedWeight === "") return "";
  const numeric = Number(String(displayedWeight).replace(",", "."));
  if (!Number.isFinite(numeric)) return "";
  const kilograms = currentUnit() === "lbs" ? numeric / KG_TO_LBS : numeric;
  return String(Math.round(kilograms * 10000) / 10000);
}

function storeReps(displayedReps) {
  if (displayedReps === "") return "";
  const numeric = Number(displayedReps);
  return Number.isInteger(numeric) && numeric >= 0 && numeric <= 999 ? String(numeric) : "";
}

function weightUnitLabel() {
  return currentUnit().toUpperCase();
}

function formatSetValue(exercise, set) {
  if (exercise.trackingMode === "reps") return `${set.reps || "–"}×`;
  const weight = displayWeight(set.weight);
  return `${set.reps || "–"}× ${weight || "–"} ${currentUnit()}`;
}

function applyStaticTranslations() {
  document.documentElement.lang = language();
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
}

function formatDuration(start, end = Date.now()) {
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat(language() === "en" ? "en-GB" : "de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(timestamp);
}

function completedSets(workout) {
  return workout.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.filter((set) => set.done).length,
    0,
  );
}

function render() {
  applyStaticTranslations();
  updateStorageStatus();
  document.querySelectorAll(".tab").forEach((tab) => {
    const selected = tab.dataset.view === currentView;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-current", selected ? "page" : "false");
  });

  if (currentView === "workout") renderWorkout();
  if (currentView === "exercises") renderExercises();
  if (currentView === "history") renderHistory();
  if (currentView === "info") renderInfo();
}

function renderWorkout() {
  const workout = state.activeWorkout;
  if (!workout) {
    const templates = [...state.templates].sort((a, b) => b.createdAt - a.createdAt);
    app.innerHTML = `
      <section>
        <div class="empty-state">
          <div class="empty-state__icon" aria-hidden="true"><span class="empty-state__bar"></span></div>
          <h1>${t("workout.none")}</h1>
          <p>${t("workout.noneHint")}</p>
          <button class="win-button win-button--primary" type="button" data-action="start-workout">
            ${t("workout.startEmpty")}
          </button>
        </div>
        <div class="template-section">
          <div class="section-heading">
            <div>
              <p class="eyebrow">${t("workout.savedRoutines")}</p>
              <h2>${t("workout.templates")}</h2>
            </div>
            <span class="counter-badge">${templates.length}</span>
          </div>
          <div class="template-list">
            ${templates.length ? templates.map(templateItem).join("") : `
              <p class="empty-list">${t("workout.noTemplate")}</p>
            `}
          </div>
        </div>
      </section>
    `;
    return;
  }

  const cards = workout.exercises.map((exercise) => exerciseCard(exercise)).join("");
  app.innerHTML = `
    <section>
      <div class="view-header">
        <div>
          <p class="eyebrow">${t("workout.current")}</p>
          <h1 class="view-title">${t("workout.running")}</h1>
        </div>
        <div class="header-actions">
          ${workout.exercises.length ? `<button class="win-button" type="button" data-action="open-template-dialog">${t("workout.asTemplate")}</button>` : ""}
          <button class="win-button win-button--danger" type="button" data-action="discard-workout">${t("workout.discard")}</button>
        </div>
      </div>
      <div class="workout-meta">
        <div class="metric"><span>${t("workout.time")}</span><strong id="workout-timer">${formatDuration(workout.startedAt)}</strong></div>
        <div class="metric"><span>${t("workout.done")}</span><strong>${completedSets(workout)} ${t("workout.setsUpper")}</strong></div>
      </div>
      <div id="workout-exercises">
        ${cards || `<div class="panel empty-list">${t("workout.noExercise")}</div>`}
      </div>
      <div class="workout-actions">
        <button class="win-button" type="button" data-action="open-picker">${t("workout.addExercise")}</button>
        <button class="win-button win-button--primary" type="button" data-action="finish-workout">${t("workout.finish")}</button>
      </div>
    </section>
  `;
}

function templateItem(template) {
  const names = template.exercises.map(exerciseDisplayName).join(" · ");
  return `
    <div class="template-item">
      <div class="template-item__text">
        <strong>${escapeHtml(template.name)}</strong>
        <span class="muted">${template.exercises.length} ${t("workout.exercises")}${names ? ` · ${escapeHtml(names)}` : ""}</span>
      </div>
      <div class="template-item__actions">
        <button class="win-button win-button--primary" type="button" data-action="start-template" data-template-id="${escapeHtml(template.id)}">${t("workout.start")}</button>
        <button class="icon-button" type="button" data-action="delete-template" data-template-id="${escapeHtml(template.id)}" aria-label="${escapeHtml(t("dialog.deleteTemplateTitle"))}: ${escapeHtml(template.name)}">×</button>
      </div>
    </div>
  `;
}

function exerciseMatches(candidate, reference) {
  const referenceLibraryId = reference.libraryId || reference.id;
  if (referenceLibraryId && candidate.libraryId === referenceLibraryId) return true;
  return candidate.name.toLocaleLowerCase(language()) === reference.name.toLocaleLowerCase(language());
}

function exerciseHistory(exercise) {
  const workouts = [...state.history].sort((a, b) => b.startedAt - a.startedAt);
  const entries = [];
  for (const workout of workouts) {
    const match = workout.exercises.find((item) => exerciseMatches(item, exercise));
    if (match) entries.push({ workout, exercise: match });
  }
  return entries;
}

function setsFromLastWorkout(exercise) {
  const previous = exerciseHistory(exercise)
    .find(({ exercise: historicalExercise }) => (
      historicalExercise.sets.some((set) => set.done || set.reps !== "" || set.weight !== "")
    ))?.exercise;
  if (!previous?.sets.length) return [makeSet()];
  return previous.sets.map((set) => ({
    id: makeId("set"),
    reps: set.reps,
    weight: exercise.trackingMode === "weighted" ? set.weight : "",
    done: false,
  }));
}

function exerciseCard(exercise) {
  const rows = exercise.sets.map((set, index) => `
    <div class="set-row ${exercise.trackingMode === "reps" ? "is-reps-only" : ""} ${set.done ? "is-done" : ""}">
      <span class="set-row__number">${index + 1}</span>
      <div class="set-field">
        <label for="reps-${escapeHtml(set.id)}">${t("workout.reps")}</label>
        <input
          class="win-input"
          id="reps-${escapeHtml(set.id)}"
          inputmode="numeric"
          min="0"
          max="999"
          type="number"
          value="${escapeHtml(set.reps)}"
          data-field="reps"
          data-exercise-id="${escapeHtml(exercise.id)}"
          data-set-id="${escapeHtml(set.id)}"
          aria-label="${escapeHtml(t("workout.reps"))} · ${escapeHtml(t("workout.set"))} ${index + 1}"
        />
      </div>
      ${exercise.trackingMode === "weighted" ? `<div class="set-field">
        <label for="weight-${escapeHtml(set.id)}">${weightUnitLabel()}</label>
        <input
          class="win-input"
          id="weight-${escapeHtml(set.id)}"
          inputmode="decimal"
          min="0"
          max="9999"
          step="0.5"
          type="number"
          value="${escapeHtml(displayWeight(set.weight))}"
          data-field="weight"
          data-exercise-id="${escapeHtml(exercise.id)}"
          data-set-id="${escapeHtml(set.id)}"
          aria-label="${escapeHtml(t("workout.weight"))} · ${escapeHtml(t("workout.set"))} ${index + 1}"
        />
      </div>` : ""}
      <button
        class="set-check ${set.done ? "is-done" : ""}"
        type="button"
        data-action="toggle-set"
        data-exercise-id="${escapeHtml(exercise.id)}"
        data-set-id="${escapeHtml(set.id)}"
        aria-label="${escapeHtml(t("workout.set"))} ${index + 1} ${escapeHtml(set.done ? t("workout.markOpen") : t("workout.complete"))}"
        aria-pressed="${set.done}"
      >✓</button>
    </div>
  `).join("");

  return `
    <article class="exercise-card">
      <header class="exercise-card__header">
        <div>
          <h2>${escapeHtml(exerciseDisplayName(exercise))}</h2>
          <span class="group-label">${escapeHtml(groupLabel(exercise.group))}</span>
        </div>
        <button
          class="icon-button"
          type="button"
          data-action="remove-exercise"
          data-exercise-id="${escapeHtml(exercise.id)}"
          aria-label="${escapeHtml(exerciseDisplayName(exercise))}: ${escapeHtml(t("workout.removeExercise"))}"
          title="${escapeHtml(t("workout.removeExercise"))}"
        >×</button>
      </header>
      <div class="sets">${rows}</div>
      <div class="card-footer">
        <button class="win-button" type="button" data-action="remove-set" data-exercise-id="${escapeHtml(exercise.id)}" ${exercise.sets.length <= 1 ? "disabled" : ""}>${t("workout.removeSet")}</button>
        <button class="win-button" type="button" data-action="open-exercise-history" data-exercise-id="${escapeHtml(exercise.id)}">${t("workout.history")}</button>
        <button class="win-button" type="button" data-action="add-set" data-exercise-id="${escapeHtml(exercise.id)}" ${exercise.sets.length >= 99 ? "disabled" : ""}>${t("workout.addSet")}</button>
      </div>
    </article>
  `;
}

function formatExerciseHistoryDate(timestamp) {
  return new Intl.DateTimeFormat(language() === "en" ? "en-GB" : "de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function openExerciseHistory(exerciseId) {
  const exercise = findWorkoutExercise(exerciseId);
  if (!exercise) return;
  const entries = exerciseHistory(exercise);
  document.querySelector("#exercise-history-title").textContent =
    `${exerciseDisplayName(exercise)} – ${t("exerciseHistory.title")}`;
  document.querySelector("#exercise-history-content").innerHTML = entries.length
    ? entries.map(({ workout, exercise: historicalExercise }) => `
      <article class="exercise-history-entry">
        <header>
          <time datetime="${new Date(workout.startedAt).toISOString()}">${escapeHtml(formatExerciseHistoryDate(workout.startedAt))}</time>
          <span>${historicalExercise.sets.length} ${t("exerciseHistory.sets")}</span>
        </header>
        <div class="exercise-history-sets">
          ${historicalExercise.sets.map((set, index) => `
            <div class="exercise-history-set ${historicalExercise.trackingMode === "reps" ? "is-reps-only" : ""}">
              <strong>${index + 1}.</strong>
              <span><small>${t("workout.reps")}</small>${escapeHtml(set.reps || "–")}</span>
              ${historicalExercise.trackingMode === "weighted" ? `<span><small>${weightUnitLabel()}</small>${escapeHtml(displayWeight(set.weight) || "–")}</span>` : ""}
            </div>
          `).join("")}
        </div>
      </article>
    `).join("")
    : `<p class="empty-list">${t("exerciseHistory.empty")}</p>`;
  exerciseHistoryDialog.showModal();
}

function renderExercises() {
  const selected = state.selectedGroup;
  const exercises = state.exercises
    .filter((exercise) => selected === "Alle" || exercise.group === selected)
    .sort((a, b) => exerciseDisplayName(a).localeCompare(exerciseDisplayName(b), language()));

  app.innerHTML = `
    <section>
      <div class="view-header">
        <div>
          <p class="eyebrow">${t("library.title")}</p>
          <h1 class="view-title">${state.exercises.length} ${t("workout.exercises")}</h1>
        </div>
        <button class="win-button win-button--primary" type="button" data-action="new-exercise">${t("library.new")}</button>
      </div>
      <div class="filter-row" aria-label="${t("library.chooseGroup")}">
        ${groupButtons(selected, "select-library-group")}
      </div>
      <div class="library-list">
        ${exercises.length ? exercises.map(libraryItem).join("") : `<p class="empty-list">${t("library.empty")}</p>`}
      </div>
    </section>
  `;
}

function groupButtons(selected, action) {
  return ["Alle", ...GROUPS].map((group) => `
    <button
      class="win-button ${selected === group ? "is-selected" : ""}"
      type="button"
      data-action="${action}"
      data-group="${escapeHtml(group)}"
      aria-pressed="${selected === group}"
    >${escapeHtml(groupLabel(group))}</button>
  `).join("");
}

function libraryItem(exercise) {
  return `
    <div class="library-item">
      <div>
        <strong>${escapeHtml(exerciseDisplayName(exercise))}</strong>
        <span class="muted">${escapeHtml(groupLabel(exercise.group))}${exercise.custom ? ` · ${t("library.custom")}` : ""}${exercise.trackingMode === "reps" ? ` · ${t("library.repsOnly")}` : ""}</span>
      </div>
      <div class="library-item__actions">
        ${state.activeWorkout ? `<button class="win-button" type="button" data-action="quick-add" data-library-id="${escapeHtml(exercise.id)}">${t("library.quickAdd")}</button>` : ""}
        ${exercise.custom ? `<button class="icon-button pixel-icon-button" type="button" data-action="edit-library-exercise" data-library-id="${escapeHtml(exercise.id)}" aria-label="${escapeHtml(exerciseDisplayName(exercise))}: ${escapeHtml(t("library.edit"))}" title="${escapeHtml(t("library.edit"))}">${pixelIcon("edit")}</button>` : ""}
        ${exercise.custom ? `<button class="icon-button" type="button" data-action="delete-library-exercise" data-library-id="${escapeHtml(exercise.id)}" aria-label="${escapeHtml(exerciseDisplayName(exercise))}: ${escapeHtml(t("common.delete"))}">×</button>` : ""}
      </div>
    </div>
  `;
}

function renderHistory() {
  const workouts = [...state.history].sort((a, b) => b.startedAt - a.startedAt);
  app.innerHTML = `
    <section>
      <div class="view-header">
        <div>
          <p class="eyebrow">${t("history.log")}</p>
          <h1 class="view-title">${workouts.length} ${t(workouts.length === 1 ? "workout.singular" : "workout.plural")}</h1>
        </div>
        ${workouts.length ? `<button class="win-button win-button--danger" type="button" data-action="clear-history">${t("history.clearAll")}</button>` : ""}
      </div>
      <div class="history-list">
        ${workouts.length ? workouts.map(historyItem).join("") : `
          <div class="empty-list">
            <p><strong>${t("history.noEntries")}</strong></p>
            <p>${t("history.emptyHint")}</p>
          </div>
        `}
      </div>
    </section>
  `;
}

function historyItem(workout) {
  const exerciseDetails = workout.exercises.map((exercise) => {
    const sets = exercise.sets.filter((set) => set.done);
    const summary = sets.length
      ? sets.map((set) => formatSetValue(exercise, set)).join(" · ")
      : t("history.noCompleted");
    return `<p><strong>${escapeHtml(exerciseDisplayName(exercise))}:</strong> ${escapeHtml(summary)}</p>`;
  }).join("");

  return `
    <details class="history-item">
      <summary>
        <strong>${formatDate(workout.startedAt)}</strong>
        <span class="muted">${workout.exercises.length} ${t("workout.exercises")} · ${completedSets(workout)} ${t("workout.setsUpper")}</span>
        <span class="history-duration">${formatDuration(workout.startedAt, workout.endedAt)}</span>
      </summary>
      <div class="history-details">
        ${exerciseDetails || t("history.noExercises")}
        <div class="history-actions">
          <button class="win-button" type="button" data-action="edit-history" data-workout-id="${escapeHtml(workout.id)}">${t("history.edit")}</button>
          <button class="win-button win-button--danger" type="button" data-action="delete-history" data-workout-id="${escapeHtml(workout.id)}">${t("common.delete")}</button>
        </div>
      </div>
    </details>
  `;
}

function localDataSize() {
  const savedData = (localStorage.getItem(STORAGE_KEY) || "")
    + (localStorage.getItem(BACKUP_REMINDER_KEY) || "");
  return new TextEncoder().encode(savedData).byteLength;
}

function formatDataSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const formatted = new Intl.NumberFormat(language() === "en" ? "en-GB" : "de-DE", {
    minimumFractionDigits: value < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(value);
  return `${formatted} ${units[unitIndex]}`;
}

function formatBackupDate(timestamp) {
  return new Intl.DateTimeFormat(language() === "en" ? "en-GB" : "de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(timestamp);
}

function renderInfo() {
  const storageBytes = localDataSize();
  const reminderAt = nextBackupReminderAt();
  const lastBackupText = backupReminderMeta.lastBackupAt
    ? formatBackupDate(backupReminderMeta.lastBackupAt)
    : t("settings.noBackup");
  const nextReminderText = reminderAt <= Date.now()
    ? t("settings.reminderDue")
    : formatBackupDate(reminderAt);
  app.innerHTML = `
    <section>
      <div class="view-header">
        <div>
          <p class="eyebrow">${t("settings.controlPanel")}</p>
          <h1 class="view-title">${t("settings.title")}</h1>
        </div>
      </div>
      <div class="info-grid">
        <div class="panel about-panel">
          <div class="about-logo" aria-hidden="true">G</div>
          <h2>GYMMI.EXE</h2>
          <span class="version-number">VERSION ${escapeHtml(appVersion || t("common.unknown"))}</span>
          <p class="muted">${t("settings.tagline")}</p>
        </div>
        <fieldset class="panel settings-panel win-group-box">
          <legend>${pixelIcon("controls")}<span>${t("settings.general")}</span></legend>
          <div class="settings-fields">
            <label>
              <span class="field-label">${t("settings.language")}</span>
              <select class="win-input" data-setting="language">
                <option value="de" ${language() === "de" ? "selected" : ""}>${t("settings.german")}</option>
                <option value="en" ${language() === "en" ? "selected" : ""}>${t("settings.english")}</option>
              </select>
            </label>
            <label>
              <span class="field-label">${t("settings.unit")}</span>
              <select class="win-input" data-setting="unit">
                <option value="kg" ${currentUnit() === "kg" ? "selected" : ""}>${t("settings.kg")}</option>
                <option value="lbs" ${currentUnit() === "lbs" ? "selected" : ""}>${t("settings.lbs")}</option>
              </select>
            </label>
          </div>
          <p class="muted settings-hint">${t("settings.unitHint")}</p>
        </fieldset>
        <fieldset class="panel update-panel win-group-box">
          <legend>${pixelIcon("download")}<span>${t("settings.softwareUpdate")}</span></legend>
          <p class="muted">${t("settings.updateHint")}</p>
          <button class="win-button win-button--wide win-button--primary win-button--icon-text" type="button" data-action="check-update" ${updateCheckInProgress ? "disabled" : ""}>
            ${pixelIcon("download")}<span>${t("settings.checkUpdates")}</span>
          </button>
          <div class="update-status" id="update-status" role="status" aria-live="polite">${escapeHtml(updateStatus)}</div>
        </fieldset>
        <fieldset class="panel changelog-panel win-group-box">
          <legend>${pixelIcon("chart")}<span>${t("settings.versionHistory")}</span></legend>
          <p class="muted">${t("settings.changelogHint")}</p>
          <button class="win-button win-button--wide win-button--icon-text" type="button" data-action="open-changelog">
            ${pixelIcon("chart")}<span>${t("settings.openChangelog")}</span>
          </button>
        </fieldset>
        <fieldset class="panel data-panel win-group-box">
          <legend>${pixelIcon("floppy")}<span>${t("settings.dataManagement")}</span></legend>
          <div class="storage-readout" title="${storageBytes} Byte">
            <span>${t("settings.localData")}</span>
            <strong data-storage-size>${formatDataSize(storageBytes)}</strong>
            <small>${state.exercises.length} ${t("workout.exercises")} · ${state.templates.length} ${t("workout.templates")} · ${state.history.length} ${t(state.history.length === 1 ? "workout.singular" : "workout.plural")}</small>
          </div>
          <p class="storage-note">${t("settings.storageNote")}</p>
          <p class="muted">${t("settings.backupHint")}</p>
          <div class="backup-schedule ${reminderAt <= Date.now() ? "is-due" : ""}">
            <div class="backup-schedule__title">${pixelIcon("clock")}<strong>${t("settings.backupSchedule")}</strong></div>
            <dl>
              <div><dt>${t("settings.lastBackup")}</dt><dd>${escapeHtml(lastBackupText)}</dd></div>
              <div><dt>${t("settings.nextReminder")}</dt><dd>${escapeHtml(nextReminderText)}</dd></div>
            </dl>
            <p>${t("settings.backupEverySevenDays")}</p>
          </div>
          <div class="data-actions">
            <button class="win-button win-button--wide win-button--icon-text" type="button" data-action="export-json">
              ${pixelIcon("floppy")}<span>${t("settings.export")}</span>
            </button>
            <button class="win-button win-button--wide win-button--icon-text" type="button" data-action="import-json">
              ${pixelIcon("import")}<span>${t("settings.import")}</span>
            </button>
          </div>
        </fieldset>
        <fieldset class="panel win-group-box">
          <legend>${pixelIcon("shield")}<span>${t("settings.privacy")}</span></legend>
          <ul class="privacy-list">
            <li>${t("settings.privacyLocal")}</li>
            <li>${t("settings.privacyNoTracking")}</li>
            <li>${t("settings.privacyUpdate")}</li>
          </ul>
        </fieldset>
      </div>
    </section>
  `;
}

function formatChangelogDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) return cleanText(value, 20) || t("changelog.unknownDate");
  return language() === "en"
    ? `${match[3]}/${match[2]}/${match[1]}`
    : `${match[3]}.${match[2]}.${match[1]}`;
}

function validateChangelog(data) {
  const hasExactKeys = (value, keys) => (
    value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).sort().join("|") === [...keys].sort().join("|")
  );
  const isLocalizedText = (value, maxLength) => (
    hasExactKeys(value, ["de", "en"])
    && [value.de, value.en].every((text) => (
      typeof text === "string" && text.length > 0 && text.length <= maxLength && text === text.trim()
    ))
  );
  if (!hasExactKeys(data, ["schemaVersion", "entries"]) || data.schemaVersion !== 2 || !Array.isArray(data.entries)) {
    throw new Error(language() === "en" ? "Invalid changelog" : "Changelog ist ungültig");
  }
  data.entries.forEach((entry) => {
    if (
      !hasExactKeys(entry, ["version", "date", "title", "changes"])
      || typeof entry.version !== "string"
      || !/^\d+\.\d+\.\d+$/.test(entry.version)
      || typeof entry.date !== "string"
      || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)
      || !isLocalizedText(entry.title, 80)
      || !Array.isArray(entry.changes)
      || entry.changes.length > 30
      || !entry.changes.every((change) => isLocalizedText(change, 240))
    ) throw new Error(language() === "en" ? "Invalid changelog" : "Changelog ist ungültig");
  });
  return data.entries;
}

function localizedChangelogValue(value) {
  return value[language()];
}

function renderChangelogEntries(entries) {
  return entries.map((entry) => {
    const version = entry.version;
    const title = localizedChangelogValue(entry.title);
    const changes = entry.changes;
    return `
      <article class="changelog-entry ${version === appVersion ? "is-current" : ""}">
        <header class="changelog-entry__header">
          <span class="changelog-version">v${escapeHtml(version)}</span>
          <time datetime="${escapeHtml(entry.date)}">${escapeHtml(formatChangelogDate(entry.date))}</time>
        </header>
        <h3>${escapeHtml(title)}</h3>
        <ul>
          ${changes.map((change) => `<li>${escapeHtml(localizedChangelogValue(change))}</li>`).join("")}
        </ul>
      </article>
    `;
  }).join("");
}

async function openChangelog() {
  const content = document.querySelector("#changelog-content");
  content.innerHTML = `<div class="changelog-loading">${t("changelog.loading")}</div>`;
  changelogDialog.showModal();

  try {
    if (!changelogEntries) {
      const response = await fetch("changelog.json");
      if (!response.ok) throw new Error(language() === "en" ? "Changelog unavailable" : "Changelog nicht erreichbar");
      changelogEntries = validateChangelog(await response.json());
    }
    content.innerHTML = changelogEntries.length
      ? renderChangelogEntries(changelogEntries)
      : `<p class="empty-list">${t("changelog.empty")}</p>`;
  } catch (error) {
    content.innerHTML = `
      <div class="changelog-error">
        <strong>${t("common.error")}</strong>
        <p>${escapeHtml(error.message)}</p>
        <p>${t("changelog.retry")}</p>
      </div>
    `;
  }
}

function refreshInfoView() {
  if (currentView === "info") renderInfo();
}

async function exportJsonBackup() {
  const date = new Date().toISOString().slice(0, 10);
  const filename = `gymmi-backup-${date}.json`;
  const backup = {
    format: "gymmi-backup",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: appVersion || "0.0.0",
    exportedAt: new Date().toISOString(),
    data: state,
  };
  const file = new File(
    [JSON.stringify(backup, null, 2)],
    filename,
    { type: "application/json" },
  );

  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "GYMMI Backup",
        text: language() === "en" ? "Backup of my GYMMI workout data" : "Backup meiner GYMMI-Trainingsdaten",
      });
      markBackupCreated();
      showToast(t("toast.backupShared"));
      return;
    }

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    markBackupCreated();
    showToast(t("toast.backupDownloaded"));
  } catch (error) {
    if (error.name !== "AbortError") showToast(t("toast.exportFailed"));
  }
}

async function readJsonBackup(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast(t("toast.tooLarge"));
    return;
  }

  try {
    const backup = validateBackup(JSON.parse(await file.text()));
    pendingImportState = backup.data;
    const activeText = pendingImportState.activeWorkout ? ` · ${t("backup.active")}` : "";
    document.querySelector("#import-message").textContent =
      `${pendingImportState.exercises.length} ${t("workout.exercises")} · ${pendingImportState.templates.length} ${t("workout.templates")} · ${pendingImportState.history.length} ${t(pendingImportState.history.length === 1 ? "workout.singular" : "workout.plural")}${activeText}. ${t("backup.replace")}`;
    importDialog.showModal();
  } catch (error) {
    pendingImportState = null;
    const message = error instanceof SyntaxError
      ? t("toast.invalidJson")
      : error instanceof StateValidationError
        ? t("backup.invalidField", { path: error.path })
        : t("backup.invalid");
    showToast(message);
  } finally {
    importInput.value = "";
  }
}

function confirmJsonImport() {
  if (!pendingImportState) return;
  state = pendingImportState;
  pendingImportState = null;
  saveState();
  importDialog.close();
  currentView = "info";
  render();
  showToast(t("toast.backupImported"));
}

function parseVersionData(data) {
  if (
    !data || typeof data !== "object" || Array.isArray(data)
    || Object.keys(data).length !== 1
    || typeof data.version !== "string"
    || !/^\d+\.\d+\.\d+$/.test(data.version)
  ) throw new Error(language() === "en" ? "Invalid version number" : "Ungültige Versionsnummer");
  return data.version;
}

async function loadInstalledVersion() {
  try {
    const response = await fetch("version.json");
    if (!response.ok) throw new Error("Versionsdatei fehlt");
    const data = await response.json();
    appVersion = parseVersionData(data);
  } catch {
    appVersion = null;
  }
}

function compareVersions(first, second) {
  const left = String(first).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const right = String(second).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if ((left[index] || 0) > (right[index] || 0)) return 1;
    if ((left[index] || 0) < (right[index] || 0)) return -1;
  }
  return 0;
}

async function checkForUpdates() {
  if (updateCheckInProgress) return;
  updateCheckInProgress = true;
  pendingVersion = null;
  updateStatus = t("update.searching");
  refreshInfoView();

  try {
    const controller = new AbortController();
    const requestTimeout = window.setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch(`version.json?check=${Date.now()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(requestTimeout);
    }
    if (!response.ok) throw new Error(language() === "en" ? "Version server unavailable" : "Versionsserver nicht erreichbar");
    const remoteVersion = parseVersionData(await response.json());

    const comparison = compareVersions(remoteVersion, appVersion);
    if (comparison === 0) {
      updateStatus = t("update.current", { version: appVersion });
      return;
    }
    if (comparison < 0) {
      updateStatus = t("update.serverVersion", { installed: appVersion, remote: remoteVersion });
      return;
    }

    pendingVersion = remoteVersion;
    updateStatus = t("update.found", { version: remoteVersion });
    refreshInfoView();
    document.querySelector("#update-message").textContent =
      t("update.ask", { version: remoteVersion });
    document.querySelector("#update-dialog").showModal();
  } catch (error) {
    updateStatus = navigator.onLine
      ? t("update.failed", { message: error.message })
      : t("update.offline");
  } finally {
    updateCheckInProgress = false;
    refreshInfoView();
  }
}

function withTimeout(promise, milliseconds, message) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = window.setTimeout(() => reject(new Error(message)), milliseconds);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => window.clearTimeout(timeout));
}

async function refreshAppShell() {
  if (!("serviceWorker" in navigator)) throw new Error(language() === "en" ? "Offline updates are not supported" : "Offline-Updates werden nicht unterstützt");
  const timeoutMessage = language() === "en" ? "Update timed out" : "Update-Zeitüberschreitung";
  const registration = await withTimeout(navigator.serviceWorker.ready, 20000, timeoutMessage);
  const worker = navigator.serviceWorker.controller || registration.active;
  if (!worker) throw new Error(language() === "en" ? "Offline service is not ready" : "Offline-Dienst ist noch nicht bereit");

  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => reject(new Error(timeoutMessage)), 20000);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeout);
      if (event.data?.ok) resolve();
      else reject(new Error(event.data?.error || (language() === "en" ? "Update failed" : "Update fehlgeschlagen")));
    };
    worker.postMessage({ type: "REFRESH_APP_SHELL" }, [channel.port2]);
  });
}

async function installPendingUpdate() {
  if (!pendingVersion) return;
  const targetVersion = pendingVersion;
  const confirmButton = document.querySelector("#confirm-update");
  confirmButton.disabled = true;
  confirmButton.textContent = t("update.downloading");

  try {
    await refreshAppShell();
    updateStatus = t("update.loaded", { version: targetVersion });
    document.querySelector("#update-dialog").close();
    showToast(t("toast.updateInstalled"));
    window.setTimeout(() => location.reload(), 450);
  } catch (error) {
    document.querySelector("#update-dialog").close();
    updateStatus = t("update.installFailed", { message: error.message });
    pendingVersion = null;
    refreshInfoView();
  } finally {
    confirmButton.disabled = false;
    confirmButton.textContent = t("update.download");
  }
}

function startWorkout() {
  state.activeWorkout = {
    id: makeId("workout"),
    startedAt: Date.now(),
    exercises: [],
  };
  saveState();
  render();
  showToast(t("toast.workoutStarted"));
}

function startWorkoutFromTemplate(templateId) {
  const template = state.templates.find((item) => item.id === templateId);
  if (!template) return;
  state.activeWorkout = {
    id: makeId("workout"),
    startedAt: Date.now(),
    exercises: template.exercises.map((exercise) => ({
      id: makeId("workout-exercise"),
      libraryId: exercise.libraryId,
      name: exercise.name,
      group: exercise.group,
      trackingMode: exercise.trackingMode,
      sets: Array.from({ length: exercise.setCount }, makeSet),
    })),
  };
  saveState();
  render();
  showToast(t("toast.templateStarted", { name: template.name }));
}

function openTemplateDialog() {
  if (!state.activeWorkout?.exercises.length) return;
  document.querySelector("#template-form").reset();
  templateDialog.showModal();
  window.setTimeout(() => document.querySelector("#template-name").focus(), 0);
}

function saveWorkoutTemplate(event) {
  event.preventDefault();
  if (state.templates.length >= 500) {
    showToast(t("toast.limitReached"));
    return;
  }
  const name = cleanText(new FormData(event.currentTarget).get("name"), 42);
  if (!name || !state.activeWorkout?.exercises.length) return;
  const duplicate = state.templates.some(
    (template) => template.name.toLocaleLowerCase(language()) === name.toLocaleLowerCase(language()),
  );
  if (duplicate) {
    showToast(t("toast.templateExists"));
    return;
  }
  state.templates.push({
    id: makeId("template"),
    name,
    createdAt: Date.now(),
    exercises: state.activeWorkout.exercises.map((exercise) => ({
      libraryId: exercise.libraryId,
      name: exercise.name,
      group: exercise.group,
      trackingMode: exercise.trackingMode,
      setCount: exercise.sets.length,
    })),
  });
  saveState();
  templateDialog.close();
  render();
  showToast(t("toast.templateSaved"));
}

async function deleteTemplate(templateId) {
  const template = state.templates.find((item) => item.id === templateId);
  if (!template) return;
  const confirmed = await askForConfirmation({
    title: t("dialog.deleteTemplateTitle"),
    message: t("dialog.deleteTemplateMessage", { name: template.name }),
    confirmLabel: t("common.delete"),
    danger: true,
  });
  if (!confirmed) return;
  state.templates = state.templates.filter((item) => item.id !== templateId);
  saveState();
  render();
  showToast(t("toast.templateDeleted"));
}

function makeSet() {
  return { id: makeId("set"), reps: "", weight: "", done: false };
}

function addExerciseToWorkout(libraryId) {
  if (!state.activeWorkout) {
    state.activeWorkout = {
      id: makeId("workout"),
      startedAt: Date.now(),
      exercises: [],
    };
  }
  const source = state.exercises.find((exercise) => exercise.id === libraryId);
  if (!source) return;
  if (state.activeWorkout.exercises.length >= 100) {
    showToast(t("toast.limitReached"));
    return;
  }

  state.activeWorkout.exercises.push({
    id: makeId("workout-exercise"),
    libraryId: source.id,
    name: source.name,
    group: source.group,
    trackingMode: source.trackingMode,
    sets: setsFromLastWorkout(source),
  });
  saveState();
  render();
  if (picker.open) picker.close();
  showToast(t("toast.added", { name: exerciseDisplayName(source) }));
}

function openPicker() {
  pickerGroup = "Alle";
  searchInput.value = "";
  renderPicker();
  pickerViewportHeight = window.visualViewport?.height || window.innerHeight;
  const pickerHeight = Math.min(620, Math.max(360, pickerViewportHeight - 20));
  const pickerTop = Math.max(10, (pickerViewportHeight - pickerHeight) / 2);
  pickerBottom = pickerTop + pickerHeight;
  picker.style.setProperty("--picker-height", `${pickerHeight}px`);
  picker.style.setProperty("--picker-top", `${pickerTop}px`);
  picker.style.setProperty("--picker-keyboard-space", "0px");
  picker.showModal();
  window.setTimeout(() => searchInput.focus(), 0);
}

function updatePickerKeyboardSpace() {
  if (!picker.open || !pickerViewportHeight) return;
  const viewport = window.visualViewport;
  const currentHeight = viewport?.height || window.innerHeight;
  const visibleBottom = (viewport?.offsetTop || 0) + currentHeight;
  const keyboardIsOpen = pickerViewportHeight - currentHeight > 100;
  const keyboardSpace = keyboardIsOpen ? Math.max(0, pickerBottom - visibleBottom + 10) : 0;
  picker.style.setProperty("--picker-keyboard-space", `${keyboardSpace}px`);
  picker.classList.toggle("has-keyboard", keyboardIsOpen);
}

function renderPicker() {
  const term = searchInput.value.trim().toLocaleLowerCase(language());
  const matches = state.exercises
    .filter((exercise) => pickerGroup === "Alle" || exercise.group === pickerGroup)
    .filter((exercise) => exerciseDisplayName(exercise).toLocaleLowerCase(language()).includes(term))
    .sort((a, b) => exerciseDisplayName(a).localeCompare(exerciseDisplayName(b), language()));

  document.querySelector("#picker-groups").innerHTML = groupButtons(pickerGroup, "select-picker-group");
  document.querySelector("#picker-list").innerHTML = matches.length
    ? matches.map((exercise) => `
      <div class="picker-item">
        <div><strong>${escapeHtml(exerciseDisplayName(exercise))}</strong><br /><span class="muted">${escapeHtml(groupLabel(exercise.group))}${exercise.trackingMode === "reps" ? ` · ${t("library.repsOnly")}` : ""}</span></div>
        <button class="win-button" type="button" data-picker-add="${escapeHtml(exercise.id)}">${t("picker.add")}</button>
      </div>
    `).join("")
    : `<p class="empty-list">${t("picker.empty")}</p>`;
}

function openNewExercise(fromPicker = false) {
  addNewExerciseToWorkout = fromPicker;
  editingLibraryExerciseId = null;
  if (picker.open) picker.close();
  const select = document.querySelector("#new-exercise-group");
  select.innerHTML = GROUPS.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(groupLabel(group))}</option>`).join("");
  document.querySelector("#new-exercise-form").reset();
  document.querySelector("#new-exercise-title").textContent = t("newExercise.title");
  document.querySelector("#exercise-form-hint").hidden = true;
  newExerciseDialog.showModal();
  window.setTimeout(() => document.querySelector("#new-exercise-name").focus(), 0);
}

function openExerciseEditor(exerciseId) {
  const exercise = state.exercises.find((item) => item.id === exerciseId);
  if (!exercise?.custom) return;
  addNewExerciseToWorkout = false;
  editingLibraryExerciseId = exercise.id;
  const select = document.querySelector("#new-exercise-group");
  select.innerHTML = GROUPS.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(groupLabel(group))}</option>`).join("");
  document.querySelector("#new-exercise-name").value = exercise.name;
  select.value = exercise.group;
  document.querySelector("#new-exercise-tracking").value = exercise.trackingMode;
  document.querySelector("#new-exercise-title").textContent = t("editExercise.title");
  const hint = document.querySelector("#exercise-form-hint");
  hint.textContent = t("editExercise.hint");
  hint.hidden = false;
  newExerciseDialog.showModal();
  window.setTimeout(() => document.querySelector("#new-exercise-name").focus(), 0);
}

function submitExercise(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const name = cleanText(formData.get("name"), 42);
  const group = String(formData.get("group") || "");
  const trackingMode = String(formData.get("trackingMode") || "weighted");
  if (!name || !GROUPS.includes(group) || !TRACKING_MODES.includes(trackingMode)) return;
  if (!editingLibraryExerciseId && state.exercises.length >= 1000) {
    showToast(t("toast.limitReached"));
    return;
  }

  const duplicate = state.exercises.some(
    (exercise) => exercise.id !== editingLibraryExerciseId
      && exerciseDisplayName(exercise).toLocaleLowerCase(language()) === name.toLocaleLowerCase(language()),
  );
  if (duplicate) {
    showToast(t("newExercise.exists"));
    return;
  }

  if (editingLibraryExerciseId) {
    const exercise = state.exercises.find((item) => item.id === editingLibraryExerciseId);
    if (!exercise?.custom) return;
    exercise.name = name;
    exercise.group = group;
    exercise.trackingMode = trackingMode;
    state.templates.forEach((template) => {
      template.exercises.forEach((templateExercise) => {
        if (templateExercise.libraryId !== exercise.id) return;
        templateExercise.name = name;
        templateExercise.group = group;
        templateExercise.trackingMode = trackingMode;
      });
    });
    editingLibraryExerciseId = null;
    state.selectedGroup = group;
    saveState();
    newExerciseDialog.close();
    render();
    showToast(t("editExercise.saved"));
    return;
  }

  const exercise = { id: makeId("custom"), name, group, custom: true, trackingMode };
  state.exercises.push(exercise);
  newExerciseDialog.close();

  if (addNewExerciseToWorkout) {
    currentView = "workout";
    addExerciseToWorkout(exercise.id);
  } else {
    state.selectedGroup = group;
    saveState();
    render();
    showToast(t("newExercise.saved"));
  }
}

function findWorkoutExercise(id) {
  return state.activeWorkout?.exercises.find((exercise) => exercise.id === id);
}

async function handleWorkoutAction(button) {
  const action = button.dataset.action;
  const exerciseId = button.dataset.exerciseId;
  const exercise = exerciseId ? findWorkoutExercise(exerciseId) : null;

  switch (action) {
    case "start-workout":
      startWorkout();
      return;
    case "open-picker":
      openPicker();
      return;
    case "finish-workout":
      finishDialog.showModal();
      return;
    case "discard-workout": {
      const confirmed = await askForConfirmation({
        title: t("dialog.discardTitle"),
        message: t("dialog.discardMessage"),
        confirmLabel: t("workout.discard"),
        danger: true,
      });
      if (!confirmed) return;
      state.activeWorkout = null;
      saveState();
      render();
      showToast(t("toast.workoutDiscarded"));
      return;
    }
    case "add-set":
      if (exercise?.sets.length < 99) exercise.sets.push(makeSet());
      break;
    case "remove-set":
      if (exercise?.sets.length > 1) exercise.sets.pop();
      break;
    case "remove-exercise":
      if (exercise) {
        state.activeWorkout.exercises = state.activeWorkout.exercises.filter((item) => item.id !== exerciseId);
      }
      break;
    case "toggle-set": {
      const set = exercise?.sets.find((item) => item.id === button.dataset.setId);
      if (set) set.done = !set.done;
      break;
    }
    default:
      return;
  }
  saveState();
  render();
}

function finishWorkout() {
  if (!state.activeWorkout) return;
  if (state.history.length >= 5000) {
    finishDialog.close();
    showToast(t("toast.limitReached"));
    return;
  }
  state.activeWorkout.endedAt = Date.now();
  state.history.push(state.activeWorkout);
  state.activeWorkout = null;
  saveState();
  finishDialog.close();
  currentView = "history";
  render();
  showToast(t("toast.workoutSaved"));
}

function toDateTimeLocal(timestamp) {
  const date = new Date(timestamp);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function openHistoryEditor(workoutId) {
  const workout = state.history.find((item) => item.id === workoutId);
  if (!workout) return;
  editingHistoryId = workoutId;
  const exercises = workout.exercises.map((exercise) => `
    <fieldset class="edit-exercise">
      <legend>${escapeHtml(exerciseDisplayName(exercise))}</legend>
      ${exercise.sets.map((set, index) => `
        <div class="edit-set-row ${exercise.trackingMode === "reps" ? "is-reps-only" : ""}">
          <span>${index + 1}.</span>
          <label>${t("history.repsShort")}<input class="win-input" type="number" inputmode="numeric" min="0" max="999" value="${escapeHtml(set.reps)}" data-edit-field="reps" data-exercise-id="${escapeHtml(exercise.id)}" data-set-id="${escapeHtml(set.id)}" /></label>
          ${exercise.trackingMode === "weighted" ? `<label>${weightUnitLabel()}<input class="win-input" type="number" inputmode="decimal" min="0" max="9999" step="0.5" value="${escapeHtml(displayWeight(set.weight))}" data-edit-field="weight" data-exercise-id="${escapeHtml(exercise.id)}" data-set-id="${escapeHtml(set.id)}" /></label>` : ""}
          <label class="edit-done"><input type="checkbox" data-edit-field="done" data-exercise-id="${escapeHtml(exercise.id)}" data-set-id="${escapeHtml(set.id)}" ${set.done ? "checked" : ""} />✓</label>
        </div>
      `).join("")}
    </fieldset>
  `).join("");
  document.querySelector("#history-edit-content").innerHTML = `
    <div>
      <label class="field-label" for="history-edit-date">${t("history.dateTime")}</label>
      <input class="win-input" id="history-edit-date" type="datetime-local" required value="${toDateTimeLocal(workout.startedAt)}" />
    </div>
    <div class="edit-workout-list">${exercises || `<p class="empty-list">${t("history.noExercises")}</p>`}</div>
  `;
  historyEditDialog.showModal();
}

function saveHistoryEdit(event) {
  event.preventDefault();
  const workout = state.history.find((item) => item.id === editingHistoryId);
  if (!workout) return;
  const newStartedAt = new Date(document.querySelector("#history-edit-date").value).getTime();
  if (!Number.isFinite(newStartedAt)) {
    showToast(t("toast.dateRequired"));
    return;
  }
  const duration = Math.max(0, Number(workout.endedAt || workout.startedAt) - workout.startedAt);
  workout.startedAt = newStartedAt;
  workout.endedAt = newStartedAt + duration;
  document.querySelectorAll("#history-edit-content [data-edit-field]").forEach((input) => {
    const exercise = workout.exercises.find((item) => item.id === input.dataset.exerciseId);
    const set = exercise?.sets.find((item) => item.id === input.dataset.setId);
    if (!set) return;
    set[input.dataset.editField] = input.dataset.editField === "done"
      ? input.checked
      : input.dataset.editField === "weight" ? storeWeight(input.value) : storeReps(input.value);
  });
  saveState();
  editingHistoryId = null;
  historyEditDialog.close();
  render();
  showToast(t("toast.workoutChanged"));
}

async function deleteHistoryWorkout(workoutId) {
  const workout = state.history.find((item) => item.id === workoutId);
  if (!workout) return;
  const confirmed = await askForConfirmation({
    title: t("dialog.deleteWorkoutTitle"),
    message: t("dialog.deleteWorkoutMessage", { date: formatDate(workout.startedAt) }),
    confirmLabel: t("common.delete"),
    danger: true,
  });
  if (!confirmed) return;
  state.history = state.history.filter((item) => item.id !== workoutId);
  saveState();
  render();
  showToast(t("toast.workoutDeleted"));
}

async function clearHistory() {
  if (!state.history.length) return;
  const confirmed = await askForConfirmation({
    title: t("dialog.clearHistoryTitle"),
    message: t("dialog.clearHistoryMessage", { count: state.history.length }),
    confirmLabel: t("history.clearAll"),
    danger: true,
  });
  if (!confirmed) return;
  state.history = [];
  saveState();
  render();
  showToast(t("toast.historyDeleted"));
}

function updateSet(input) {
  const exercise = findWorkoutExercise(input.dataset.exerciseId);
  const set = exercise?.sets.find((item) => item.id === input.dataset.setId);
  if (!set || !["reps", "weight"].includes(input.dataset.field)) return;
  set[input.dataset.field] = input.dataset.field === "weight"
    ? storeWeight(input.value)
    : storeReps(input.value);
  scheduleStateSave();
}

async function deleteLibraryExercise(id) {
  const exercise = state.exercises.find((item) => item.id === id);
  if (!exercise?.custom) return;
  const confirmed = await askForConfirmation({
    title: t("dialog.deleteExerciseTitle"),
    message: t("dialog.deleteExerciseMessage", { name: exerciseDisplayName(exercise) }),
    confirmLabel: t("common.delete"),
    danger: true,
  });
  if (!confirmed) return;
  state.exercises = state.exercises.filter((item) => item.id !== id);
  saveState();
  render();
  showToast(t("toast.exerciseDeleted"));
}

function showToast(message, force = false) {
  if (saveFailureActive && !force) return;
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function askForConfirmation({
  title = t("confirm.title"),
  message,
  confirmLabel = t("common.confirm"),
  danger = false,
}) {
  return new Promise((resolve) => {
    confirmationResolver = resolve;
    document.querySelector("#confirmation-title").textContent = title;
    document.querySelector("#confirmation-message").textContent = message;
    const confirmButton = document.querySelector("#confirmation-accept");
    confirmButton.textContent = confirmLabel;
    confirmButton.classList.toggle("win-button--danger", danger);
    confirmationDialog.showModal();
    document.querySelector("#confirmation-cancel").focus();
  });
}

function settleConfirmation(confirmed) {
  if (!confirmationResolver) return;
  const resolve = confirmationResolver;
  confirmationResolver = null;
  if (confirmationDialog.open) confirmationDialog.close();
  resolve(confirmed);
}

function exportRecoveryData() {
  const file = new Blob([recoveryRawData ?? ""], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gymmi-recovery-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(t("recovery.exported"));
}

async function resetRecoveryData() {
  recoveryDialog.close();
  const confirmed = await askForConfirmation({
    title: t("recovery.resetTitle"),
    message: t("recovery.resetMessage"),
    confirmLabel: t("recovery.reset"),
    danger: true,
  });
  if (!confirmed) {
    recoveryDialog.showModal();
    return;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
    recoveryRawData = null;
    storageLocked = false;
    state = createInitialState(STARTER_EXERCISE_DATA);
    saveState();
    render();
  } catch (error) {
    console.error("GYMMI could not reset local data.", error);
    recoveryDialog.showModal();
    showToast(t("storage.failed"));
  }
}

document.querySelector(".tabs").addEventListener("click", (event) => {
  const tab = event.target.closest("[data-view]");
  if (!tab) return;
  currentView = tab.dataset.view;
  render();
  app.focus({ preventScroll: true });
});

app.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const { action } = button.dataset;

  switch (action) {
    case "start-workout":
    case "open-picker":
    case "finish-workout":
    case "discard-workout":
    case "add-set":
    case "remove-set":
    case "remove-exercise":
    case "toggle-set":
      handleWorkoutAction(button);
      break;
    case "new-exercise":
      openNewExercise(false);
      break;
    case "select-library-group":
      state.selectedGroup = button.dataset.group;
      saveState();
      render();
      break;
    case "quick-add":
      currentView = "workout";
      addExerciseToWorkout(button.dataset.libraryId);
      break;
    case "delete-library-exercise":
      deleteLibraryExercise(button.dataset.libraryId);
      break;
    case "edit-library-exercise":
      openExerciseEditor(button.dataset.libraryId);
      break;
    case "check-update":
      checkForUpdates();
      break;
    case "export-json":
      exportJsonBackup();
      break;
    case "import-json":
      importInput.click();
      break;
    case "open-template-dialog":
      openTemplateDialog();
      break;
    case "start-template":
      startWorkoutFromTemplate(button.dataset.templateId);
      break;
    case "delete-template":
      deleteTemplate(button.dataset.templateId);
      break;
    case "edit-history":
      openHistoryEditor(button.dataset.workoutId);
      break;
    case "delete-history":
      deleteHistoryWorkout(button.dataset.workoutId);
      break;
    case "clear-history":
      clearHistory();
      break;
    case "open-changelog":
      openChangelog();
      break;
    case "open-exercise-history":
      openExerciseHistory(button.dataset.exerciseId);
      break;
    default:
      break;
  }
});

app.addEventListener("input", (event) => {
  if (event.target.matches("[data-field]")) updateSet(event.target);
});

app.addEventListener("change", (event) => {
  if (event.target.matches("[data-field]")) {
    updateSet(event.target);
    flushStateSave();
  }
  if (event.target.matches("[data-setting]")) {
    const setting = event.target.dataset.setting;
    const value = event.target.value;
    if (setting === "language" && SUPPORTED_LANGUAGES.includes(value)) {
      state.settings.language = value;
      updateStatus = "";
    }
    if (setting === "unit" && SUPPORTED_UNITS.includes(value)) state.settings.unit = value;
    saveState();
    render();
  }
});

document.querySelector("#picker-groups").addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="select-picker-group"]');
  if (!button) return;
  pickerGroup = button.dataset.group;
  renderPicker();
});

document.querySelector("#picker-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-picker-add]");
  if (button) addExerciseToWorkout(button.dataset.pickerAdd);
});

searchInput.addEventListener("input", renderPicker);
window.visualViewport?.addEventListener("resize", updatePickerKeyboardSpace);
window.visualViewport?.addEventListener("scroll", updatePickerKeyboardSpace);
picker.addEventListener("close", () => {
  pickerViewportHeight = 0;
  pickerBottom = 0;
  picker.classList.remove("has-keyboard");
  picker.style.setProperty("--picker-keyboard-space", "0px");
});
document.querySelector("#create-from-picker").addEventListener("click", () => openNewExercise(true));
document.querySelector("#new-exercise-form").addEventListener("submit", submitExercise);
document.querySelector("#template-form").addEventListener("submit", saveWorkoutTemplate);
document.querySelector("#history-edit-form").addEventListener("submit", saveHistoryEdit);
document.querySelector("#confirm-finish").addEventListener("click", finishWorkout);
document.querySelector("#confirm-update").addEventListener("click", installPendingUpdate);
document.querySelector("#confirm-import").addEventListener("click", confirmJsonImport);
document.querySelector("#confirmation-cancel").addEventListener("click", () => settleConfirmation(false));
document.querySelector("#confirmation-accept").addEventListener("click", () => settleConfirmation(true));
confirmationDialog.addEventListener("close", () => settleConfirmation(false));
importInput.addEventListener("change", () => readJsonBackup(importInput.files[0]));
document.querySelector("#export-recovery-data").addEventListener("click", exportRecoveryData);
document.querySelector("#reset-recovery-data").addEventListener("click", resetRecoveryData);
recoveryDialog.addEventListener("cancel", (event) => event.preventDefault());
document.querySelector("#backup-reminder-now").addEventListener("click", () => {
  backupReminderDialog.close();
  exportJsonBackup();
});
appCloseButton.addEventListener("click", showCrashScreen);
bsod.addEventListener("click", hideCrashScreen);
bsod.addEventListener("keydown", (event) => {
  event.preventDefault();
  hideCrashScreen();
});

document.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-dialog]");
  if (closeButton) document.querySelector(`#${closeButton.dataset.closeDialog}`).close();
});

document.addEventListener("keydown", () => {
  lastInteractionWasKeyboard = true;
}, true);

document.addEventListener("pointerdown", () => {
  lastInteractionWasKeyboard = false;
}, true);

document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("close", () => {
    if (lastInteractionWasKeyboard) return;
    window.requestAnimationFrame(() => {
      if (document.querySelector("dialog[open]")) return;
      const focusedElement = document.activeElement;
      if (focusedElement instanceof HTMLElement && focusedElement !== document.body) {
        focusedElement.blur();
      }
    });
  });
});

function updateClock() {
  document.querySelector("#clock").textContent = new Intl.DateTimeFormat(language() === "en" ? "en-GB" : "de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const timer = document.querySelector("#workout-timer");
  if (timer && state.activeWorkout) timer.textContent = formatDuration(state.activeWorkout.startedAt);
}

window.setInterval(updateClock, 1000);
updateClock();
loadInstalledVersion().finally(() => {
  render();
  if (storageLocked) {
    recoveryDialog.showModal();
  } else {
    saveBackupReminderMeta();
    maybeShowBackupReminder();
  }
});

window.addEventListener("pagehide", flushStateSave);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    flushStateSave();
  } else {
    maybeShowBackupReminder();
  }
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" }).catch(() => {});
  });
}
