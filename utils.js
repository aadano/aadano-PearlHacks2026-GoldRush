// ── Utility Functions ─────────────────────────────────────────────────────────
// Loaded first so all other files can call logJournal freely

const logJournal = (state, message) => {
  state.journal.push({
    time: state.phase === "journey" ? `Day ${state.day}` : `Week ${state.week}`,
    message,
  });
  console.log(`[Journal] ${message}`);
};
