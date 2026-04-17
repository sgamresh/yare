import { deepClone } from "./utils.js";
import { syncComputedState } from "../state/sync-computed-state.js";

export function createStore(initialState) {
  let state = syncComputedState(deepClone(initialState));
  const listeners = new Set();

  function notify() {
    const snapshot = deepClone(state);
    listeners.forEach((listener) => listener(snapshot));
  }

  function getState() {
    return deepClone(state);
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function replaceState(nextState, { notifySubscribers = true } = {}) {
    state = syncComputedState(deepClone(nextState));
    if (notifySubscribers) {
      notify();
    }
    return getState();
  }

  function update(mutator, { notifySubscribers = true } = {}) {
    const draft = deepClone(state);
    mutator(draft);
    draft.app.dirty = true;
    state = syncComputedState(draft);
    if (notifySubscribers) {
      notify();
    }
    return getState();
  }

  return {
    getState,
    subscribe,
    replaceState,
    update
  };
}
