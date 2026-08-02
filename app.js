"use strict";

const STORAGE_KEY = "gymmi-state-v1";
const GROUPS = ["Brust", "Rücken", "Beine", "Schultern", "Arme", "Core"];

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
].map(([name, group], index) => ({
  id: `starter-${index + 1}`,
  name,
  group,
  custom: false,
}));

const initialState = {
  exercises: STARTER_EXERCISES,
  activeWorkout: null,
  history: [],
  templates: [],
  selectedGroup: "Alle",
};

let state = loadState();
let currentView = "workout";
let pickerGroup = "Alle";
let addNewExerciseToWorkout = false;
let toastTimer;
let appVersion = "…";
let pendingVersion = null;
let updateStatus = "";
let pendingImportState = null;
let editingHistoryId = null;
let pickerViewportHeight = 0;
let changelogEntries = null;

const app = document.querySelector("#app");
const picker = document.querySelector("#exercise-picker");
const newExerciseDialog = document.querySelector("#new-exercise-dialog");
const finishDialog = document.querySelector("#finish-dialog");
const searchInput = document.querySelector("#exercise-search");
const importInput = document.querySelector("#json-import-input");
const importDialog = document.querySelector("#import-dialog");
const templateDialog = document.querySelector("#template-dialog");
const historyEditDialog = document.querySelector("#history-edit-dialog");
const changelogDialog = document.querySelector("#changelog-dialog");
const confirmationDialog = document.querySelector("#confirmation-dialog");
let confirmationResolver = null;

function makeId(prefix) {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}-${randomPart}`;
}

function cleanText(value, maxLength = 80) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeSet(raw = {}) {
  return {
    id: cleanText(raw.id, 120) || makeId("set"),
    reps: cleanText(raw.reps, 8),
    weight: cleanText(raw.weight, 10),
    done: Boolean(raw.done),
  };
}

function normalizeWorkoutExercise(raw = {}) {
  const name = cleanText(raw.name, 42);
  const group = GROUPS.includes(raw.group) ? raw.group : "Core";
  if (!name) return null;
  const sets = Array.isArray(raw.sets) ? raw.sets.slice(0, 99).map(normalizeSet) : [];
  return {
    id: cleanText(raw.id, 120) || makeId("workout-exercise"),
    libraryId: cleanText(raw.libraryId, 120),
    name,
    group,
    sets: sets.length ? sets : [makeSet()],
  };
}

function normalizeWorkout(raw = {}, includeEnd = true) {
  const startedAt = Number(raw.startedAt);
  if (!Number.isFinite(startedAt) || !Array.isArray(raw.exercises)) return null;
  const exercises = raw.exercises
    .slice(0, 100)
    .map(normalizeWorkoutExercise)
    .filter(Boolean);
  const workout = {
    id: cleanText(raw.id, 120) || makeId("workout"),
    startedAt,
    exercises,
  };
  const endedAt = Number(raw.endedAt);
  if (includeEnd && Number.isFinite(endedAt)) workout.endedAt = Math.max(startedAt, endedAt);
  return workout;
}

function normalizeTemplate(raw = {}) {
  const name = cleanText(raw.name, 42);
  if (!name || !Array.isArray(raw.exercises)) return null;
  const exercises = raw.exercises.slice(0, 100).map((exercise) => {
    const exerciseName = cleanText(exercise.name, 42);
    if (!exerciseName) return null;
    return {
      libraryId: cleanText(exercise.libraryId, 120),
      name: exerciseName,
      group: GROUPS.includes(exercise.group) ? exercise.group : "Core",
      setCount: Math.min(99, Math.max(1, Number.parseInt(exercise.setCount, 10) || 1)),
    };
  }).filter(Boolean);
  return {
    id: cleanText(raw.id, 120) || makeId("template"),
    name,
    createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
    exercises,
  };
}

function normalizeState(raw, strict = false) {
  if (!raw || !Array.isArray(raw.exercises) || !Array.isArray(raw.history)) {
    if (strict) throw new Error("Das Backup enthält keine gültigen GYMMI-Daten.");
    return structuredClone(initialState);
  }

  const exercises = raw.exercises.slice(0, 1000).map((exercise) => {
    const name = cleanText(exercise.name, 42);
    if (!name) return null;
    return {
      id: cleanText(exercise.id, 120) || makeId("exercise"),
      name,
      group: GROUPS.includes(exercise.group) ? exercise.group : "Core",
      custom: Boolean(exercise.custom),
    };
  }).filter(Boolean);
  if (strict && !exercises.length) throw new Error("Im Backup wurden keine gültigen Übungen gefunden.");

  return {
    exercises: exercises.length ? exercises : structuredClone(STARTER_EXERCISES),
    activeWorkout: raw.activeWorkout ? normalizeWorkout(raw.activeWorkout, false) : null,
    history: raw.history.slice(0, 5000).map((workout) => normalizeWorkout(workout, true)).filter(Boolean),
    templates: Array.isArray(raw.templates)
      ? raw.templates.slice(0, 500).map(normalizeTemplate).filter(Boolean)
      : [],
    selectedGroup: GROUPS.includes(raw.selectedGroup) ? raw.selectedGroup : "Alle",
  };
}

function loadState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const status = document.querySelector("#storage-status");
  if (!status) return;
  status.textContent = "GESPEICHERT ✓";
  window.setTimeout(() => {
    status.textContent = "LOKAL GESPEICHERT";
  }, 900);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  return new Intl.DateTimeFormat("de-DE", {
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
          <h1>KEIN WORKOUT AKTIV</h1>
          <p>Starte ein leeres Training oder verwende eine deiner Vorlagen.</p>
          <button class="win-button win-button--primary" type="button" data-action="start-workout">
            Leeres Workout starten
          </button>
        </div>
        <div class="template-section">
          <div class="section-heading">
            <div>
              <p class="eyebrow">GESPEICHERTE ROUTINEN</p>
              <h2>Workout-Vorlagen</h2>
            </div>
            <span class="counter-badge">${templates.length}</span>
          </div>
          <div class="template-list">
            ${templates.length ? templates.map(templateItem).join("") : `
              <p class="empty-list">Noch keine Vorlage. Starte ein Workout und speichere die Übungsauswahl als Vorlage.</p>
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
          <p class="eyebrow">AKTUELLES WORKOUT</p>
          <h1 class="view-title">Training läuft</h1>
        </div>
        <div class="header-actions">
          ${workout.exercises.length ? '<button class="win-button" type="button" data-action="open-template-dialog">Als Vorlage</button>' : ""}
          <button class="win-button win-button--danger" type="button" data-action="discard-workout">Verwerfen</button>
        </div>
      </div>
      <div class="workout-meta">
        <div class="metric"><span>ZEIT</span><strong id="workout-timer">${formatDuration(workout.startedAt)}</strong></div>
        <div class="metric"><span>ERLEDIGT</span><strong>${completedSets(workout)} SÄTZE</strong></div>
      </div>
      <div id="workout-exercises">
        ${cards || '<div class="panel empty-list">Noch keine Übung im Workout.</div>'}
      </div>
      <div class="workout-actions">
        <button class="win-button" type="button" data-action="open-picker">+ Übung</button>
        <button class="win-button win-button--primary" type="button" data-action="finish-workout">Workout fertig</button>
      </div>
    </section>
  `;
}

function templateItem(template) {
  const names = template.exercises.map((exercise) => exercise.name).join(" · ");
  return `
    <div class="template-item">
      <div class="template-item__text">
        <strong>${escapeHtml(template.name)}</strong>
        <span class="muted">${template.exercises.length} Übungen${names ? ` · ${escapeHtml(names)}` : ""}</span>
      </div>
      <div class="template-item__actions">
        <button class="win-button win-button--primary" type="button" data-action="start-template" data-template-id="${escapeHtml(template.id)}">Start</button>
        <button class="icon-button" type="button" data-action="delete-template" data-template-id="${escapeHtml(template.id)}" aria-label="Vorlage ${escapeHtml(template.name)} löschen">×</button>
      </div>
    </div>
  `;
}

function findLastExerciseValues(exercise) {
  const workouts = [...state.history].sort((a, b) => b.startedAt - a.startedAt);
  for (const workout of workouts) {
    const match = workout.exercises.find((item) => (
      (exercise.libraryId && item.libraryId === exercise.libraryId)
      || item.name.toLocaleLowerCase("de") === exercise.name.toLocaleLowerCase("de")
    ));
    if (!match) continue;
    const sets = match.sets.filter((set) => set.done || set.reps || set.weight);
    if (sets.length) return { workout, sets };
  }
  return null;
}

function exerciseCard(exercise) {
  const previous = findLastExerciseValues(exercise);
  const previousValues = previous
    ? previous.sets.map((set) => `${set.reps || "–"}× ${set.weight || "–"} kg`).join(" · ")
    : "Noch keine Werte gespeichert";
  const rows = exercise.sets.map((set, index) => `
    <div class="set-row ${set.done ? "is-done" : ""}">
      <span class="set-row__number">${index + 1}</span>
      <div class="set-field">
        <label for="reps-${set.id}">Wdh.</label>
        <input
          class="win-input"
          id="reps-${set.id}"
          inputmode="numeric"
          min="0"
          max="999"
          type="number"
          value="${escapeHtml(set.reps)}"
          data-field="reps"
          data-exercise-id="${exercise.id}"
          data-set-id="${set.id}"
          aria-label="Wiederholungen in Satz ${index + 1}"
        />
      </div>
      <div class="set-field">
        <label for="weight-${set.id}">KG</label>
        <input
          class="win-input"
          id="weight-${set.id}"
          inputmode="decimal"
          min="0"
          max="9999"
          step="0.5"
          type="number"
          value="${escapeHtml(set.weight)}"
          data-field="weight"
          data-exercise-id="${exercise.id}"
          data-set-id="${set.id}"
          aria-label="Gewicht in Satz ${index + 1}"
        />
      </div>
      <button
        class="set-check ${set.done ? "is-done" : ""}"
        type="button"
        data-action="toggle-set"
        data-exercise-id="${exercise.id}"
        data-set-id="${set.id}"
        aria-label="Satz ${index + 1} ${set.done ? "als offen markieren" : "abschließen"}"
        aria-pressed="${set.done}"
      >✓</button>
    </div>
  `).join("");

  return `
    <article class="exercise-card">
      <header class="exercise-card__header">
        <div>
          <h2>${escapeHtml(exercise.name)}</h2>
          <span class="group-label">${escapeHtml(exercise.group)}</span>
        </div>
        <button
          class="icon-button"
          type="button"
          data-action="remove-exercise"
          data-exercise-id="${exercise.id}"
          aria-label="${escapeHtml(exercise.name)} aus dem Workout entfernen"
          title="Übung entfernen"
        >×</button>
      </header>
      <div class="previous-values">
        <strong>LETZTES MAL${previous ? ` · ${formatDate(previous.workout.startedAt)}` : ""}</strong>
        <span>${escapeHtml(previousValues)}</span>
      </div>
      <div class="sets">${rows}</div>
      <div class="card-footer">
        <button class="win-button" type="button" data-action="remove-set" data-exercise-id="${exercise.id}" ${exercise.sets.length <= 1 ? "disabled" : ""}>− Satz</button>
        <button class="win-button" type="button" data-action="add-set" data-exercise-id="${exercise.id}">+ Satz</button>
      </div>
    </article>
  `;
}

function renderExercises() {
  const selected = state.selectedGroup;
  const exercises = state.exercises
    .filter((exercise) => selected === "Alle" || exercise.group === selected)
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  app.innerHTML = `
    <section>
      <div class="view-header">
        <div>
          <p class="eyebrow">ÜBUNGSBIBLIOTHEK</p>
          <h1 class="view-title">${state.exercises.length} Übungen</h1>
        </div>
        <button class="win-button win-button--primary" type="button" data-action="new-exercise">+ Neu</button>
      </div>
      <div class="filter-row" aria-label="Muskelgruppe wählen">
        ${groupButtons(selected, "select-library-group")}
      </div>
      <div class="library-list">
        ${exercises.length ? exercises.map(libraryItem).join("") : '<p class="empty-list">Keine Übung in dieser Gruppe.</p>'}
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
      data-group="${group}"
      aria-pressed="${selected === group}"
    >${group}</button>
  `).join("");
}

function libraryItem(exercise) {
  return `
    <div class="library-item">
      <div>
        <strong>${escapeHtml(exercise.name)}</strong>
        <span class="muted">${escapeHtml(exercise.group)}${exercise.custom ? " · EIGEN" : ""}</span>
      </div>
      <div class="library-item__actions">
        ${state.activeWorkout ? `<button class="win-button" type="button" data-action="quick-add" data-library-id="${exercise.id}">+ Workout</button>` : ""}
        ${exercise.custom ? `<button class="icon-button" type="button" data-action="delete-library-exercise" data-library-id="${exercise.id}" aria-label="${escapeHtml(exercise.name)} löschen">×</button>` : ""}
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
          <p class="eyebrow">TRAININGSLOG</p>
          <h1 class="view-title">${workouts.length} ${workouts.length === 1 ? "Workout" : "Workouts"}</h1>
        </div>
        ${workouts.length ? '<button class="win-button win-button--danger" type="button" data-action="clear-history">Alle löschen</button>' : ""}
      </div>
      <div class="history-list">
        ${workouts.length ? workouts.map(historyItem).join("") : `
          <div class="empty-list">
            <p><strong>NOCH KEINE EINTRÄGE</strong></p>
            <p>Abgeschlossene Workouts erscheinen hier.</p>
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
      ? sets.map((set) => `${set.reps || "–"}× ${set.weight || "–"} kg`).join(" · ")
      : "Keine abgeschlossenen Sätze";
    return `<p><strong>${escapeHtml(exercise.name)}:</strong> ${escapeHtml(summary)}</p>`;
  }).join("");

  return `
    <details class="history-item">
      <summary>
        <strong>${formatDate(workout.startedAt)}</strong>
        <span class="muted">${workout.exercises.length} Übungen · ${completedSets(workout)} Sätze</span>
        <span class="history-duration">${formatDuration(workout.startedAt, workout.endedAt)}</span>
      </summary>
      <div class="history-details">
        ${exerciseDetails || "Keine Übungen gespeichert."}
        <div class="history-actions">
          <button class="win-button" type="button" data-action="edit-history" data-workout-id="${escapeHtml(workout.id)}">Bearbeiten</button>
          <button class="win-button win-button--danger" type="button" data-action="delete-history" data-workout-id="${escapeHtml(workout.id)}">Löschen</button>
        </div>
      </div>
    </details>
  `;
}

function localDataSize() {
  const savedData = localStorage.getItem(STORAGE_KEY) || "";
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
  const formatted = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: value < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(value);
  return `${formatted} ${units[unitIndex]}`;
}

function renderInfo() {
  const storageBytes = localDataSize();
  app.innerHTML = `
    <section>
      <div class="view-header">
        <div>
          <p class="eyebrow">SYSTEMSTEUERUNG</p>
          <h1 class="view-title">Info</h1>
        </div>
      </div>
      <div class="info-grid">
        <div class="panel about-panel">
          <div class="about-logo" aria-hidden="true">G</div>
          <h2>GYMMI.EXE</h2>
          <span class="version-number">VERSION ${escapeHtml(appVersion)}</span>
          <p class="muted">Minimaler Workout-Tracker<br />für maximale Gains.</p>
        </div>
        <div class="panel update-panel">
          <h2>Software-Update</h2>
          <p class="muted">Prüft nur auf deinen ausdrücklichen Wunsch, ob auf GitHub Pages eine neuere Version liegt.</p>
          <button class="win-button win-button--wide win-button--primary" type="button" data-action="check-update">
            Auf Updates prüfen
          </button>
          <div class="update-status" id="update-status" role="status" aria-live="polite">${escapeHtml(updateStatus)}</div>
        </div>
        <div class="panel changelog-panel">
          <h2>Versionsverlauf</h2>
          <p class="muted">Zeigt Veröffentlichungsdatum und Änderungen aller bisherigen GYMMI-Versionen.</p>
          <button class="win-button win-button--wide" type="button" data-action="open-changelog">
            Changelog öffnen
          </button>
        </div>
        <div class="panel data-panel">
          <h2>Datenverwaltung</h2>
          <div class="storage-readout" title="${storageBytes} Byte">
            <span>LOKALE GYMMI-DATEN</span>
            <strong data-storage-size>${formatDataSize(storageBytes)}</strong>
            <small>${state.exercises.length} Übungen · ${state.templates.length} Vorlagen · ${state.history.length} Workouts</small>
          </div>
          <p class="storage-note">Gemessen werden deine gespeicherten Trainingsdaten. Die installierten App-Dateien zählen nicht dazu.</p>
          <p class="muted">Sichert oder ersetzt Übungen, Vorlagen, laufendes Workout und Trainingsverlauf.</p>
          <div class="data-actions">
            <button class="win-button win-button--wide" type="button" data-action="export-json">
              JSON-Backup exportieren
            </button>
            <button class="win-button win-button--wide" type="button" data-action="import-json">
              JSON-Backup importieren
            </button>
          </div>
        </div>
        <div class="panel">
          <strong>DATENSCHUTZ</strong>
          <ul class="privacy-list">
            <li>Workouts bleiben auf diesem Gerät.</li>
            <li>Keine Anmeldung und kein Tracking.</li>
            <li>Die Updateprüfung lädt nur die Versionsnummer.</li>
          </ul>
        </div>
      </div>
    </section>
  `;
}

function formatChangelogDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) return cleanText(value, 20) || "Datum unbekannt";
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function renderChangelogEntries(entries) {
  return entries.map((entry) => {
    const version = cleanText(entry.version, 20) || "unbekannt";
    const title = cleanText(entry.title, 80) || "Update";
    const changes = Array.isArray(entry.changes) ? entry.changes.slice(0, 30) : [];
    return `
      <article class="changelog-entry ${version === appVersion ? "is-current" : ""}">
        <header class="changelog-entry__header">
          <span class="changelog-version">v${escapeHtml(version)}</span>
          <time datetime="${escapeHtml(entry.date)}">${escapeHtml(formatChangelogDate(entry.date))}</time>
        </header>
        <h3>${escapeHtml(title)}</h3>
        <ul>
          ${changes.map((change) => `<li>${escapeHtml(cleanText(change, 240))}</li>`).join("")}
        </ul>
      </article>
    `;
  }).join("");
}

async function openChangelog() {
  const content = document.querySelector("#changelog-content");
  content.innerHTML = '<div class="changelog-loading">CHANGELOG WIRD GELADEN…</div>';
  changelogDialog.showModal();

  try {
    if (!changelogEntries) {
      const response = await fetch("changelog.json");
      if (!response.ok) throw new Error("Changelog nicht erreichbar");
      const data = await response.json();
      if (!Array.isArray(data.entries)) throw new Error("Changelog ist ungültig");
      changelogEntries = data.entries;
    }
    content.innerHTML = changelogEntries.length
      ? renderChangelogEntries(changelogEntries)
      : '<p class="empty-list">Noch keine Versionseinträge vorhanden.</p>';
  } catch (error) {
    content.innerHTML = `
      <div class="changelog-error">
        <strong>FEHLER</strong>
        <p>${escapeHtml(error.message)}</p>
        <p>Bitte prüfe deine Verbindung und versuche es erneut.</p>
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
    schemaVersion: 1,
    appVersion,
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
        text: "Backup meiner GYMMI-Trainingsdaten",
      });
      showToast("Backup zum Teilen bereit");
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
    showToast("JSON-Backup heruntergeladen");
  } catch (error) {
    if (error.name !== "AbortError") showToast("Export fehlgeschlagen");
  }
}

async function readJsonBackup(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast("Backup ist größer als 5 MB");
    return;
  }

  try {
    const backup = JSON.parse(await file.text());
    if (backup.format !== "gymmi-backup" || !backup.data) {
      throw new Error("Diese Datei ist kein GYMMI-Backup.");
    }
    pendingImportState = normalizeState(backup.data, true);
    const activeText = pendingImportState.activeWorkout ? " · 1 laufendes Workout" : "";
    document.querySelector("#import-message").textContent =
      `${pendingImportState.exercises.length} Übungen · ${pendingImportState.templates.length} Vorlagen · ${pendingImportState.history.length} Workouts${activeText}. Deine aktuellen lokalen Daten werden ersetzt.`;
    importDialog.showModal();
  } catch (error) {
    pendingImportState = null;
    showToast(error instanceof SyntaxError ? "Ungültige JSON-Datei" : error.message);
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
  showToast("Backup importiert");
}

async function loadInstalledVersion() {
  try {
    const response = await fetch("version.json");
    if (!response.ok) throw new Error("Versionsdatei fehlt");
    const data = await response.json();
    appVersion = String(data.version || "unbekannt");
  } catch {
    appVersion = "unbekannt";
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
  updateStatus = "Suche nach Updates…";
  refreshInfoView();
  const button = app.querySelector('[data-action="check-update"]');
  button.disabled = true;

  try {
    const response = await fetch(`version.json?check=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Versionsserver nicht erreichbar");
    const data = await response.json();
    const remoteVersion = String(data.version || "");
    if (!/^\d+\.\d+\.\d+$/.test(remoteVersion)) throw new Error("Ungültige Versionsnummer");

    const comparison = compareVersions(remoteVersion, appVersion);
    if (comparison === 0) {
      updateStatus = `Version ${appVersion} ist aktuell.`;
      refreshInfoView();
      return;
    }
    if (comparison < 0) {
      updateStatus = `Installiert: ${appVersion} · Server: ${remoteVersion}`;
      refreshInfoView();
      return;
    }

    pendingVersion = remoteVersion;
    updateStatus = `Neue Version ${remoteVersion} gefunden.`;
    refreshInfoView();
    document.querySelector("#update-message").textContent =
      `Version ${remoteVersion} ist verfügbar. Möchtest du das Update jetzt herunterladen und installieren?`;
    document.querySelector("#update-dialog").showModal();
  } catch (error) {
    updateStatus = navigator.onLine
      ? `Prüfung fehlgeschlagen: ${error.message}`
      : "Keine Internetverbindung. Bitte später erneut versuchen.";
    refreshInfoView();
  }
}

async function refreshAppShell() {
  if (!("serviceWorker" in navigator)) throw new Error("Offline-Updates werden nicht unterstützt");
  const registration = await navigator.serviceWorker.ready;
  const worker = navigator.serviceWorker.controller || registration.active;
  if (!worker) throw new Error("Offline-Dienst ist noch nicht bereit");

  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => reject(new Error("Update-Zeitüberschreitung")), 20000);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeout);
      if (event.data?.ok) resolve();
      else reject(new Error(event.data?.error || "Update fehlgeschlagen"));
    };
    worker.postMessage({ type: "REFRESH_APP_SHELL" }, [channel.port2]);
  });
}

async function installPendingUpdate() {
  if (!pendingVersion) return;
  const targetVersion = pendingVersion;
  const confirmButton = document.querySelector("#confirm-update");
  confirmButton.disabled = true;
  confirmButton.textContent = "Wird geladen…";

  try {
    await refreshAppShell();
    updateStatus = `Version ${targetVersion} wurde geladen. Neustart…`;
    document.querySelector("#update-dialog").close();
    showToast("Update installiert – Neustart…");
    window.setTimeout(() => location.reload(), 450);
  } catch (error) {
    document.querySelector("#update-dialog").close();
    updateStatus = `Installation fehlgeschlagen: ${error.message}`;
    pendingVersion = null;
    refreshInfoView();
  } finally {
    confirmButton.disabled = false;
    confirmButton.textContent = "Herunterladen";
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
  showToast("Workout gestartet");
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
      sets: Array.from({ length: exercise.setCount }, makeSet),
    })),
  };
  saveState();
  render();
  showToast(`„${template.name}“ gestartet`);
}

function openTemplateDialog() {
  if (!state.activeWorkout?.exercises.length) return;
  document.querySelector("#template-form").reset();
  templateDialog.showModal();
  window.setTimeout(() => document.querySelector("#template-name").focus(), 0);
}

function saveWorkoutTemplate(event) {
  event.preventDefault();
  const name = cleanText(new FormData(event.currentTarget).get("name"), 42);
  if (!name || !state.activeWorkout?.exercises.length) return;
  const duplicate = state.templates.some(
    (template) => template.name.toLocaleLowerCase("de") === name.toLocaleLowerCase("de"),
  );
  if (duplicate) {
    showToast("Eine Vorlage mit diesem Namen existiert schon");
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
      setCount: exercise.sets.length,
    })),
  });
  saveState();
  templateDialog.close();
  render();
  showToast("Vorlage gespeichert");
}

async function deleteTemplate(templateId) {
  const template = state.templates.find((item) => item.id === templateId);
  if (!template) return;
  const confirmed = await askForConfirmation({
    title: "Vorlage löschen",
    message: `Soll die Vorlage „${template.name}“ wirklich gelöscht werden?`,
    confirmLabel: "Löschen",
    danger: true,
  });
  if (!confirmed) return;
  state.templates = state.templates.filter((item) => item.id !== templateId);
  saveState();
  render();
  showToast("Vorlage gelöscht");
}

function makeSet() {
  return { id: makeId("set"), reps: "", weight: "", done: false };
}

function addExerciseToWorkout(libraryId) {
  if (!state.activeWorkout) {
    startWorkout();
  }
  const source = state.exercises.find((exercise) => exercise.id === libraryId);
  if (!source) return;

  state.activeWorkout.exercises.push({
    id: makeId("workout-exercise"),
    libraryId: source.id,
    name: source.name,
    group: source.group,
    sets: [makeSet()],
  });
  saveState();
  render();
  picker.close();
  showToast(`${source.name} hinzugefügt`);
}

function openPicker() {
  pickerGroup = "Alle";
  searchInput.value = "";
  renderPicker();
  pickerViewportHeight = window.visualViewport?.height || window.innerHeight;
  const pickerHeight = Math.min(620, Math.max(360, pickerViewportHeight - 20));
  const pickerTop = Math.max(10, (pickerViewportHeight - pickerHeight) / 2);
  picker.style.setProperty("--picker-height", `${pickerHeight}px`);
  picker.style.setProperty("--picker-top", `${pickerTop}px`);
  picker.style.setProperty("--picker-keyboard-space", "0px");
  picker.showModal();
  window.setTimeout(() => searchInput.focus(), 0);
}

function updatePickerKeyboardSpace() {
  if (!picker.open || !pickerViewportHeight) return;
  const currentHeight = window.visualViewport?.height || window.innerHeight;
  const keyboardSpace = Math.max(0, pickerViewportHeight - currentHeight);
  picker.style.setProperty("--picker-keyboard-space", `${keyboardSpace}px`);
  picker.classList.toggle("has-keyboard", keyboardSpace > 100);
}

function renderPicker() {
  const term = searchInput.value.trim().toLocaleLowerCase("de");
  const matches = state.exercises
    .filter((exercise) => pickerGroup === "Alle" || exercise.group === pickerGroup)
    .filter((exercise) => exercise.name.toLocaleLowerCase("de").includes(term))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  document.querySelector("#picker-groups").innerHTML = groupButtons(pickerGroup, "select-picker-group");
  document.querySelector("#picker-list").innerHTML = matches.length
    ? matches.map((exercise) => `
      <div class="picker-item">
        <div><strong>${escapeHtml(exercise.name)}</strong><br /><span class="muted">${escapeHtml(exercise.group)}</span></div>
        <button class="win-button" type="button" data-picker-add="${exercise.id}">+ Add</button>
      </div>
    `).join("")
    : '<p class="empty-list">Keine Übung gefunden.</p>';
}

function openNewExercise(fromPicker = false) {
  addNewExerciseToWorkout = fromPicker;
  if (picker.open) picker.close();
  const select = document.querySelector("#new-exercise-group");
  select.innerHTML = GROUPS.map((group) => `<option value="${group}">${group}</option>`).join("");
  document.querySelector("#new-exercise-form").reset();
  newExerciseDialog.showModal();
  window.setTimeout(() => document.querySelector("#new-exercise-name").focus(), 0);
}

function submitNewExercise(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const name = String(formData.get("name") || "").trim();
  const group = String(formData.get("group") || "");
  if (!name || !GROUPS.includes(group)) return;

  const duplicate = state.exercises.some(
    (exercise) => exercise.name.toLocaleLowerCase("de") === name.toLocaleLowerCase("de"),
  );
  if (duplicate) {
    showToast("Diese Übung gibt es bereits");
    return;
  }

  const exercise = { id: makeId("custom"), name, group, custom: true };
  state.exercises.push(exercise);
  saveState();
  newExerciseDialog.close();

  if (addNewExerciseToWorkout) {
    addExerciseToWorkout(exercise.id);
  } else {
    state.selectedGroup = group;
    saveState();
    render();
    showToast("Übung gespeichert");
  }
}

function findWorkoutExercise(id) {
  return state.activeWorkout?.exercises.find((exercise) => exercise.id === id);
}

async function handleWorkoutAction(button) {
  const action = button.dataset.action;
  const exerciseId = button.dataset.exerciseId;
  const exercise = exerciseId ? findWorkoutExercise(exerciseId) : null;

  if (action === "start-workout") startWorkout();
  if (action === "open-picker") openPicker();
  if (action === "finish-workout") finishDialog.showModal();
  if (action === "discard-workout") {
    const confirmed = await askForConfirmation({
      title: "Workout verwerfen",
      message: "Soll das aktuelle Workout wirklich verworfen werden? Alle noch nicht gespeicherten Sätze gehen verloren.",
      confirmLabel: "Verwerfen",
      danger: true,
    });
    if (!confirmed) return;
    state.activeWorkout = null;
    saveState();
    render();
    showToast("Workout verworfen");
  }
  if (action === "add-set" && exercise) {
    exercise.sets.push(makeSet());
    saveState();
    render();
  }
  if (action === "remove-set" && exercise && exercise.sets.length > 1) {
    exercise.sets.pop();
    saveState();
    render();
  }
  if (action === "remove-exercise" && exercise) {
    state.activeWorkout.exercises = state.activeWorkout.exercises.filter((item) => item.id !== exerciseId);
    saveState();
    render();
  }
  if (action === "toggle-set" && exercise) {
    const set = exercise.sets.find((item) => item.id === button.dataset.setId);
    if (!set) return;
    set.done = !set.done;
    saveState();
    render();
  }
}

function finishWorkout() {
  if (!state.activeWorkout) return;
  state.activeWorkout.endedAt = Date.now();
  state.history.push(state.activeWorkout);
  state.activeWorkout = null;
  saveState();
  finishDialog.close();
  currentView = "history";
  render();
  showToast("Workout gespeichert");
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
      <legend>${escapeHtml(exercise.name)}</legend>
      ${exercise.sets.map((set, index) => `
        <div class="edit-set-row">
          <span>${index + 1}.</span>
          <label>Wdh.<input class="win-input" type="number" inputmode="numeric" min="0" max="999" value="${escapeHtml(set.reps)}" data-edit-field="reps" data-exercise-id="${escapeHtml(exercise.id)}" data-set-id="${escapeHtml(set.id)}" /></label>
          <label>KG<input class="win-input" type="number" inputmode="decimal" min="0" max="9999" step="0.5" value="${escapeHtml(set.weight)}" data-edit-field="weight" data-exercise-id="${escapeHtml(exercise.id)}" data-set-id="${escapeHtml(set.id)}" /></label>
          <label class="edit-done"><input type="checkbox" data-edit-field="done" data-exercise-id="${escapeHtml(exercise.id)}" data-set-id="${escapeHtml(set.id)}" ${set.done ? "checked" : ""} />✓</label>
        </div>
      `).join("")}
    </fieldset>
  `).join("");
  document.querySelector("#history-edit-content").innerHTML = `
    <div>
      <label class="field-label" for="history-edit-date">Datum und Uhrzeit</label>
      <input class="win-input" id="history-edit-date" type="datetime-local" required value="${toDateTimeLocal(workout.startedAt)}" />
    </div>
    <div class="edit-workout-list">${exercises || '<p class="empty-list">Keine Übungen gespeichert.</p>'}</div>
  `;
  historyEditDialog.showModal();
}

function saveHistoryEdit(event) {
  event.preventDefault();
  const workout = state.history.find((item) => item.id === editingHistoryId);
  if (!workout) return;
  const newStartedAt = new Date(document.querySelector("#history-edit-date").value).getTime();
  if (!Number.isFinite(newStartedAt)) {
    showToast("Bitte Datum und Uhrzeit angeben");
    return;
  }
  const duration = Math.max(0, Number(workout.endedAt || workout.startedAt) - workout.startedAt);
  workout.startedAt = newStartedAt;
  workout.endedAt = newStartedAt + duration;
  document.querySelectorAll("#history-edit-content [data-edit-field]").forEach((input) => {
    const exercise = workout.exercises.find((item) => item.id === input.dataset.exerciseId);
    const set = exercise?.sets.find((item) => item.id === input.dataset.setId);
    if (!set) return;
    set[input.dataset.editField] = input.dataset.editField === "done" ? input.checked : input.value;
  });
  saveState();
  editingHistoryId = null;
  historyEditDialog.close();
  render();
  showToast("Workout geändert");
}

async function deleteHistoryWorkout(workoutId) {
  const workout = state.history.find((item) => item.id === workoutId);
  if (!workout) return;
  const confirmed = await askForConfirmation({
    title: "Workout löschen",
    message: `Soll das Workout vom ${formatDate(workout.startedAt)} wirklich aus dem Verlauf gelöscht werden?`,
    confirmLabel: "Löschen",
    danger: true,
  });
  if (!confirmed) return;
  state.history = state.history.filter((item) => item.id !== workoutId);
  saveState();
  render();
  showToast("Workout gelöscht");
}

async function clearHistory() {
  if (!state.history.length) return;
  const confirmed = await askForConfirmation({
    title: "Verlauf löschen",
    message: `Sollen wirklich alle ${state.history.length} Workouts aus dem Verlauf gelöscht werden? Übungen und Vorlagen bleiben erhalten.`,
    confirmLabel: "Alle löschen",
    danger: true,
  });
  if (!confirmed) return;
  state.history = [];
  saveState();
  render();
  showToast("Verlauf gelöscht");
}

function updateSet(input) {
  const exercise = findWorkoutExercise(input.dataset.exerciseId);
  const set = exercise?.sets.find((item) => item.id === input.dataset.setId);
  if (!set || !["reps", "weight"].includes(input.dataset.field)) return;
  set[input.dataset.field] = input.value;
  saveState();
}

async function deleteLibraryExercise(id) {
  const exercise = state.exercises.find((item) => item.id === id);
  if (!exercise?.custom) return;
  const confirmed = await askForConfirmation({
    title: "Übung löschen",
    message: `Soll die Übung „${exercise.name}“ wirklich aus der Bibliothek gelöscht werden? Bereits gespeicherte Workouts bleiben erhalten.`,
    confirmLabel: "Löschen",
    danger: true,
  });
  if (!confirmed) return;
  state.exercises = state.exercises.filter((item) => item.id !== id);
  saveState();
  render();
  showToast("Übung gelöscht");
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function askForConfirmation({
  title = "Aktion bestätigen",
  message,
  confirmLabel = "Bestätigen",
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

  if (["start-workout", "open-picker", "finish-workout", "discard-workout", "add-set", "remove-set", "remove-exercise", "toggle-set"].includes(action)) {
    handleWorkoutAction(button);
  }
  if (action === "new-exercise") openNewExercise(false);
  if (action === "select-library-group") {
    state.selectedGroup = button.dataset.group;
    saveState();
    render();
  }
  if (action === "quick-add") {
    addExerciseToWorkout(button.dataset.libraryId);
    currentView = "workout";
    render();
  }
  if (action === "delete-library-exercise") deleteLibraryExercise(button.dataset.libraryId);
  if (action === "check-update") checkForUpdates();
  if (action === "export-json") exportJsonBackup();
  if (action === "import-json") importInput.click();
  if (action === "open-template-dialog") openTemplateDialog();
  if (action === "start-template") startWorkoutFromTemplate(button.dataset.templateId);
  if (action === "delete-template") deleteTemplate(button.dataset.templateId);
  if (action === "edit-history") openHistoryEditor(button.dataset.workoutId);
  if (action === "delete-history") deleteHistoryWorkout(button.dataset.workoutId);
  if (action === "clear-history") clearHistory();
  if (action === "open-changelog") openChangelog();
});

app.addEventListener("change", (event) => {
  if (event.target.matches("[data-field]")) updateSet(event.target);
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
picker.addEventListener("close", () => {
  pickerViewportHeight = 0;
  picker.classList.remove("has-keyboard");
  picker.style.setProperty("--picker-keyboard-space", "0px");
});
document.querySelector("#create-from-picker").addEventListener("click", () => openNewExercise(true));
document.querySelector("#new-exercise-form").addEventListener("submit", submitNewExercise);
document.querySelector("#template-form").addEventListener("submit", saveWorkoutTemplate);
document.querySelector("#history-edit-form").addEventListener("submit", saveHistoryEdit);
document.querySelector("#confirm-finish").addEventListener("click", finishWorkout);
document.querySelector("#confirm-update").addEventListener("click", installPendingUpdate);
document.querySelector("#confirm-import").addEventListener("click", confirmJsonImport);
document.querySelector("#confirmation-cancel").addEventListener("click", () => settleConfirmation(false));
document.querySelector("#confirmation-accept").addEventListener("click", () => settleConfirmation(true));
confirmationDialog.addEventListener("close", () => settleConfirmation(false));
importInput.addEventListener("change", () => readJsonBackup(importInput.files[0]));

document.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-dialog]");
  if (closeButton) document.querySelector(`#${closeButton.dataset.closeDialog}`).close();
});

function updateClock() {
  document.querySelector("#clock").textContent = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const timer = document.querySelector("#workout-timer");
  if (timer && state.activeWorkout) timer.textContent = formatDuration(state.activeWorkout.startedAt);
}

window.setInterval(updateClock, 1000);
updateClock();
loadInstalledVersion().finally(render);

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" }).catch(() => {});
  });
}
