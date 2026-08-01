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

const app = document.querySelector("#app");
const picker = document.querySelector("#exercise-picker");
const newExerciseDialog = document.querySelector("#new-exercise-dialog");
const finishDialog = document.querySelector("#finish-dialog");
const searchInput = document.querySelector("#exercise-search");

function makeId(prefix) {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}-${randomPart}`;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.exercises) || !Array.isArray(saved.history)) {
      return structuredClone(initialState);
    }
    return {
      ...structuredClone(initialState),
      ...saved,
      selectedGroup: GROUPS.includes(saved.selectedGroup) ? saved.selectedGroup : "Alle",
    };
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const status = document.querySelector("#storage-status");
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
    app.innerHTML = `
      <section class="empty-state">
        <div class="empty-state__icon" aria-hidden="true"><span class="empty-state__bar"></span></div>
        <h1>KEIN WORKOUT AKTIV</h1>
        <p>Starte ein leeres Training und füge danach deine Übungen und Sätze hinzu.</p>
        <button class="win-button win-button--primary" type="button" data-action="start-workout">
          Neues Workout starten
        </button>
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
        <button class="win-button win-button--danger" type="button" data-action="discard-workout">Verwerfen</button>
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

function exerciseCard(exercise) {
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
      <div class="history-details">${exerciseDetails || "Keine Übungen gespeichert."}</div>
    </details>
  `;
}

function renderInfo() {
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

function refreshInfoView() {
  if (currentView === "info") renderInfo();
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
  picker.showModal();
  window.setTimeout(() => searchInput.focus(), 0);
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

function handleWorkoutAction(button) {
  const action = button.dataset.action;
  const exerciseId = button.dataset.exerciseId;
  const exercise = exerciseId ? findWorkoutExercise(exerciseId) : null;

  if (action === "start-workout") startWorkout();
  if (action === "open-picker") openPicker();
  if (action === "finish-workout") finishDialog.showModal();
  if (action === "discard-workout") {
    if (window.confirm("Aktuelles Workout wirklich verwerfen?")) {
      state.activeWorkout = null;
      saveState();
      render();
      showToast("Workout verworfen");
    }
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

function updateSet(input) {
  const exercise = findWorkoutExercise(input.dataset.exerciseId);
  const set = exercise?.sets.find((item) => item.id === input.dataset.setId);
  if (!set || !["reps", "weight"].includes(input.dataset.field)) return;
  set[input.dataset.field] = input.value;
  saveState();
}

function deleteLibraryExercise(id) {
  const exercise = state.exercises.find((item) => item.id === id);
  if (!exercise?.custom) return;
  if (!window.confirm(`„${exercise.name}“ wirklich löschen?`)) return;
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
document.querySelector("#create-from-picker").addEventListener("click", () => openNewExercise(true));
document.querySelector("#new-exercise-form").addEventListener("submit", submitNewExercise);
document.querySelector("#confirm-finish").addEventListener("click", finishWorkout);
document.querySelector("#confirm-update").addEventListener("click", installPendingUpdate);

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
