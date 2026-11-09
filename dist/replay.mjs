export function createReplay() {
  const states = new Map();
  const read = id => states.get(id) ?? { selection: null, revealed: false };
  return {
    read,
    select(id, selection) {
      if (!read(id).revealed) states.set(id, { selection, revealed: false });
    },
    reveal(id) {
      const state = read(id);
      if (state.selection === null) return false;
      states.set(id, { ...state, revealed: true });
      return true;
    },
    reset(id) { states.delete(id); },
  };
}
