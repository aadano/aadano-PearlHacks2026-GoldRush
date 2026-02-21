// ── Render ────────────────────────────────────────────────────────────────────
// This is the UI layer. It reads state and redraws the screen.
// Swap out these console.logs for real DOM manipulation when building the UI.

const render = (state) => {
  if (state.gameOver) {
    renderGameOver(state);
    return;
  }
  renderStatus(state);
  renderEvent(state);
};

const renderStatus = (state) => {
  // Placeholder — replace with DOM updates
  console.log(`[Status] Week ${state.week} | Cash: $${state.cash} | Gold: ${state.gold}oz | Food: ${Math.floor(state.food)}lbs`);
  console.log(`[Party] ${state.party.filter(m => m.alive).map(m => `${m.name} (HP:${m.health} MOR:${Math.floor(m.morale)})`).join(", ")}`);
};

const renderEvent = (state) => {
  const event = pickEvent(state);
  if (!event) return;

  const description = typeof event.description === "function"
    ? event.description(state)
    : event.description;

  console.log(`\n[Event] ${event.title}`);
  console.log(description);
  event.choices.forEach((choice, i) => {
    const available = !choice.available || choice.available(state);
    if (available) console.log(`  [${i}] ${choice.text}`);
  });

  // Store current event on state so resolveChoice can access it
  state.currentEvent = event;
};

const renderGameOver = (state) => {
  console.log("\n════════════════════════════════");
  if (state.won) {
    const tierMessages = {
      destitute: "You made it back. Barely. Nothing to show for it.",
      survived:  "You survived the Gold Rush. More than most can say.",
      modest:    "You came back with enough to start over. A decent life.",
      wealthy:   "You struck it rich. California made you a wealthy man.",
      legend:    "Rich, alive, and your people made it home with you. A legend.",
    };
    console.log(`[Ending: ${state.endingTier}] ${tierMessages[state.endingTier]}`);
  } else {
    console.log(`[Game Over] ${state.gameOverReason}`);
  }

  console.log("\n── Journal ──");
  state.journal.forEach(entry => console.log(`${entry.time}: ${entry.message}`));

  console.log("\n── Fallen ──");
  state.party.filter(m => !m.alive).forEach(m =>
    console.log(`${m.name} — ${m.causeOfDeath}`)
  );
};
