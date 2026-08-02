"use strict";

(function exposeGymmiData(global) {
  const GROUPS = Object.freeze(["Brust", "Rücken", "Beine", "Schultern", "Arme", "Core"]);
  const SUPPORTED_LANGUAGES = Object.freeze(["de", "en"]);
  const SUPPORTED_UNITS = Object.freeze(["kg", "lbs"]);
  const TRACKING_MODES = Object.freeze(["weighted", "reps"]);
  const BACKUP_SCHEMA_VERSION = 2;
  const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
  const INTEGER_VALUE_PATTERN = /^(?:|0|[1-9]\d*)$/;
  const DECIMAL_VALUE_PATTERN = /^(?:|(?:0|[1-9]\d*)(?:\.\d{1,4})?)$/;
  const MAX_DATE_TIMESTAMP = 8_640_000_000_000_000;

  class StateValidationError extends Error {
    constructor(path) {
      super(`Invalid GYMMI data at ${path}`);
      this.name = "StateValidationError";
      this.path = path;
    }
  }

  function fail(path) {
    throw new StateValidationError(path);
  }

  function isPlainObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function assertObject(value, path, expectedKeys) {
    if (!isPlainObject(value)) fail(path);
    const actualKeys = Object.keys(value).sort();
    const sortedExpectedKeys = [...expectedKeys].sort();
    if (
      actualKeys.length !== sortedExpectedKeys.length
      || actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
    ) fail(path);
  }

  function assertArray(value, path, maxLength, minLength = 0) {
    if (!Array.isArray(value) || value.length < minLength || value.length > maxLength) fail(path);
  }

  function assertString(value, path, maxLength, { allowEmpty = false } = {}) {
    if (
      typeof value !== "string"
      || value.length > maxLength
      || value !== value.trim()
      || /[\u0000-\u001F\u007F]/.test(value)
      || (!allowEmpty && value.length === 0)
    ) fail(path);
    return value;
  }

  function assertId(value, path, { allowEmpty = false } = {}) {
    if (allowEmpty && value === "") return value;
    if (typeof value !== "string" || !SAFE_ID_PATTERN.test(value)) fail(path);
    return value;
  }

  function registerId(value, path, seenIds) {
    const id = assertId(value, path);
    if (seenIds.has(id)) fail(path);
    seenIds.add(id);
    return id;
  }

  function assertTimestamp(value, path) {
    if (!Number.isSafeInteger(value) || value < 0 || value > MAX_DATE_TIMESTAMP) fail(path);
    return value;
  }

  function assertEnum(value, options, path) {
    if (!options.includes(value)) fail(path);
    return value;
  }

  function assertNumericString(value, path, pattern, maximum) {
    if (typeof value !== "string" || !pattern.test(value)) fail(path);
    if (value !== "" && Number(value) > maximum) fail(path);
    return value;
  }

  function validateSet(raw, path, seenIds) {
    assertObject(raw, path, ["id", "reps", "weight", "done"]);
    if (typeof raw.done !== "boolean") fail(`${path}.done`);
    return {
      id: registerId(raw.id, `${path}.id`, seenIds),
      reps: assertNumericString(raw.reps, `${path}.reps`, INTEGER_VALUE_PATTERN, 999),
      weight: assertNumericString(raw.weight, `${path}.weight`, DECIMAL_VALUE_PATTERN, 9999),
      done: raw.done,
    };
  }

  function validateWorkoutExercise(raw, path, seenIds) {
    assertObject(raw, path, ["id", "libraryId", "name", "group", "trackingMode", "sets"]);
    assertArray(raw.sets, `${path}.sets`, 99, 1);
    return {
      id: registerId(raw.id, `${path}.id`, seenIds),
      libraryId: assertId(raw.libraryId, `${path}.libraryId`, { allowEmpty: true }),
      name: assertString(raw.name, `${path}.name`, 42),
      group: assertEnum(raw.group, GROUPS, `${path}.group`),
      trackingMode: assertEnum(raw.trackingMode, TRACKING_MODES, `${path}.trackingMode`),
      sets: raw.sets.map((set, index) => validateSet(set, `${path}.sets[${index}]`, seenIds)),
    };
  }

  function validateWorkout(raw, path, seenIds, completed) {
    const keys = completed ? ["id", "startedAt", "endedAt", "exercises"] : ["id", "startedAt", "exercises"];
    assertObject(raw, path, keys);
    assertArray(raw.exercises, `${path}.exercises`, 100);
    const startedAt = assertTimestamp(raw.startedAt, `${path}.startedAt`);
    const workout = {
      id: registerId(raw.id, `${path}.id`, seenIds),
      startedAt,
      exercises: raw.exercises.map((exercise, index) => (
        validateWorkoutExercise(exercise, `${path}.exercises[${index}]`, seenIds)
      )),
    };
    if (completed) {
      workout.endedAt = assertTimestamp(raw.endedAt, `${path}.endedAt`);
      if (workout.endedAt < startedAt) fail(`${path}.endedAt`);
    }
    return workout;
  }

  function validateTemplateExercise(raw, path) {
    assertObject(raw, path, ["libraryId", "name", "group", "trackingMode", "setCount"]);
    if (!Number.isInteger(raw.setCount) || raw.setCount < 1 || raw.setCount > 99) {
      fail(`${path}.setCount`);
    }
    return {
      libraryId: assertId(raw.libraryId, `${path}.libraryId`, { allowEmpty: true }),
      name: assertString(raw.name, `${path}.name`, 42),
      group: assertEnum(raw.group, GROUPS, `${path}.group`),
      trackingMode: assertEnum(raw.trackingMode, TRACKING_MODES, `${path}.trackingMode`),
      setCount: raw.setCount,
    };
  }

  function validateTemplate(raw, path, seenIds) {
    assertObject(raw, path, ["id", "name", "createdAt", "exercises"]);
    assertArray(raw.exercises, `${path}.exercises`, 100);
    return {
      id: registerId(raw.id, `${path}.id`, seenIds),
      name: assertString(raw.name, `${path}.name`, 42),
      createdAt: assertTimestamp(raw.createdAt, `${path}.createdAt`),
      exercises: raw.exercises.map((exercise, index) => (
        validateTemplateExercise(exercise, `${path}.exercises[${index}]`)
      )),
    };
  }

  function validateExercise(raw, path, seenIds) {
    assertObject(raw, path, ["id", "name", "group", "custom", "trackingMode"]);
    if (typeof raw.custom !== "boolean") fail(`${path}.custom`);
    return {
      id: registerId(raw.id, `${path}.id`, seenIds),
      name: assertString(raw.name, `${path}.name`, 42),
      group: assertEnum(raw.group, GROUPS, `${path}.group`),
      custom: raw.custom,
      trackingMode: assertEnum(raw.trackingMode, TRACKING_MODES, `${path}.trackingMode`),
    };
  }

  function validateState(raw) {
    assertObject(raw, "data", ["exercises", "activeWorkout", "history", "templates", "selectedGroup", "settings"]);
    assertArray(raw.exercises, "data.exercises", 1000, 1);
    assertArray(raw.history, "data.history", 5000);
    assertArray(raw.templates, "data.templates", 500);
    assertObject(raw.settings, "data.settings", ["language", "unit"]);

    const seenIds = new Set();
    return {
      exercises: raw.exercises.map((exercise, index) => (
        validateExercise(exercise, `data.exercises[${index}]`, seenIds)
      )),
      activeWorkout: raw.activeWorkout === null
        ? null
        : validateWorkout(raw.activeWorkout, "data.activeWorkout", seenIds, false),
      history: raw.history.map((workout, index) => (
        validateWorkout(workout, `data.history[${index}]`, seenIds, true)
      )),
      templates: raw.templates.map((template, index) => (
        validateTemplate(template, `data.templates[${index}]`, seenIds)
      )),
      selectedGroup: assertEnum(raw.selectedGroup, ["Alle", ...GROUPS], "data.selectedGroup"),
      settings: {
        language: assertEnum(raw.settings.language, SUPPORTED_LANGUAGES, "data.settings.language"),
        unit: assertEnum(raw.settings.unit, SUPPORTED_UNITS, "data.settings.unit"),
      },
    };
  }

  function validateBackup(raw) {
    assertObject(raw, "backup", ["format", "schemaVersion", "appVersion", "exportedAt", "data"]);
    if (raw.format !== "gymmi-backup" || raw.schemaVersion !== BACKUP_SCHEMA_VERSION) fail("backup.schemaVersion");
    if (typeof raw.appVersion !== "string" || !/^\d+\.\d+\.\d+$/.test(raw.appVersion)) fail("backup.appVersion");
    const exportedAtTimestamp = typeof raw.exportedAt === "string" ? Date.parse(raw.exportedAt) : NaN;
    if (
      !Number.isFinite(exportedAtTimestamp)
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(raw.exportedAt)
      || new Date(exportedAtTimestamp).toISOString() !== raw.exportedAt
    ) fail("backup.exportedAt");
    return {
      format: raw.format,
      schemaVersion: raw.schemaVersion,
      appVersion: raw.appVersion,
      exportedAt: raw.exportedAt,
      data: validateState(raw.data),
    };
  }

  function createInitialState(starterExercises) {
    const raw = {
      exercises: structuredClone(starterExercises),
      activeWorkout: null,
      history: [],
      templates: [],
      selectedGroup: "Alle",
      settings: { language: "de", unit: "kg" },
    };
    return validateState(raw);
  }

  global.GymmiData = Object.freeze({
    BACKUP_SCHEMA_VERSION,
    GROUPS,
    SUPPORTED_LANGUAGES,
    SUPPORTED_UNITS,
    TRACKING_MODES,
    StateValidationError,
    createInitialState,
    validateBackup,
    validateState,
  });
}(globalThis));
