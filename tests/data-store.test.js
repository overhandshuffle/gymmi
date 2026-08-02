"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

require("../data-store.js");

const {
  StateValidationError,
  createBackupReminderMeta,
  createInitialState,
  validateBackup,
  validateBackupReminderMeta,
  validateState,
} = globalThis.GymmiData;

const STARTER = [{
  id: "starter-1",
  name: "Bankdrücken",
  group: "Brust",
  custom: false,
  trackingMode: "weighted",
}];

function validState() {
  const state = createInitialState(STARTER);
  state.activeWorkout = {
    id: "workout-active",
    startedAt: 1000,
    exercises: [{
      id: "workout-exercise-active",
      libraryId: "starter-1",
      name: "Bankdrücken",
      group: "Brust",
      trackingMode: "weighted",
      sets: [{ id: "set-active", reps: "8", weight: "80.5", done: true }],
    }],
  };
  state.history = [{
    id: "workout-history",
    startedAt: 100,
    endedAt: 200,
    exercises: [{
      id: "workout-exercise-history",
      libraryId: "starter-1",
      name: "Bankdrücken",
      group: "Brust",
      trackingMode: "weighted",
      sets: [{ id: "set-history", reps: "10", weight: "75", done: true }],
    }],
  }];
  state.templates = [{
    id: "template-1",
    name: "Push",
    createdAt: 300,
    exercises: [{
      libraryId: "starter-1",
      name: "Bankdrücken",
      group: "Brust",
      trackingMode: "weighted",
      setCount: 3,
    }],
  }];
  return state;
}

function expectInvalid(mutator, expectedPath) {
  const state = validState();
  mutator(state);
  assert.throws(
    () => validateState(state),
    (error) => error instanceof StateValidationError && error.path === expectedPath,
  );
}

test("accepts and clones the complete current state schema", () => {
  const state = validState();
  const validated = validateState(state);
  assert.deepEqual(validated, state);
  assert.notEqual(validated, state);
  assert.notEqual(validated.history[0], state.history[0]);
});

test("does not migrate missing or extra state fields", () => {
  expectInvalid((state) => delete state.settings, "data");
  expectInvalid((state) => { state.legacyVersion = 1; }, "data");
  expectInvalid((state) => delete state.exercises[0].trackingMode, "data.exercises[0]");
});

test("rejects unsafe and duplicate ids before rendering", () => {
  expectInvalid(
    (state) => { state.activeWorkout.exercises[0].sets[0].id = 'set"><img src=x onerror=alert(1)>'; },
    "data.activeWorkout.exercises[0].sets[0].id",
  );
  expectInvalid(
    (state) => { state.history[0].exercises[0].sets[0].id = "set-active"; },
    "data.history[0].exercises[0].sets[0].id",
  );
});

test("rejects implicit type conversions and malformed values", () => {
  expectInvalid(
    (state) => { state.activeWorkout.exercises[0].sets[0].done = "false"; },
    "data.activeWorkout.exercises[0].sets[0].done",
  );
  expectInvalid(
    (state) => { state.templates[0].exercises[0].setCount = "3"; },
    "data.templates[0].exercises[0].setCount",
  );
  expectInvalid(
    (state) => { state.activeWorkout.exercises[0].sets[0].reps = "8.5"; },
    "data.activeWorkout.exercises[0].sets[0].reps",
  );
});

test("accepts only the exact current backup envelope", () => {
  const backup = {
    format: "gymmi-backup",
    schemaVersion: 2,
    appVersion: "1.4.0",
    exportedAt: "2026-08-02T12:00:00.000Z",
    data: validState(),
  };
  assert.deepEqual(validateBackup(backup).data, backup.data);

  assert.throws(() => validateBackup({ ...backup, schemaVersion: 1 }), StateValidationError);
  assert.throws(() => validateBackup({ ...backup, legacy: true }), StateValidationError);
});

test("validates the separate backup reminder metadata without changing workout data", () => {
  const meta = createBackupReminderMeta(1000);
  assert.deepEqual(meta, {
    trackingStartedAt: 1000,
    lastBackupAt: null,
    lastReminderAt: null,
  });
  meta.lastBackupAt = 2000;
  assert.deepEqual(validateBackupReminderMeta(meta), meta);
  assert.throws(
    () => validateBackupReminderMeta({ ...meta, intervalDays: 7 }),
    StateValidationError,
  );
});
