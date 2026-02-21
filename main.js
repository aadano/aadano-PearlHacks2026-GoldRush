// ── Entry Point ───────────────────────────────────────────────────────────────
// main.js runs after all other scripts are loaded.

const gameState = createInitialState();

// ── Quick smoke test — remove before shipping ─────────────────────────────────
const smokeTest = () => {
  const state = createInitialState();

  // Set up a minimal party
  state.party = [
    createMember({ name: "Test Leader", ethnicity: "appalachian", health: 100, morale: 80 }),
    createMember({ name: "Liang Wei", ethnicity: "chinese", health: 90, morale: 75 }),
  ];

  // Simulate journey phase
  state.phase = GAME_PHASES.JOURNEY;
  state.journeyRoute = "overland";
  state.transport = "ox_cart";
  state.cash = 120;
  state.food = 50;

  try {
    advanceJourney(state);
    console.log("✓ advanceJourney passed");
  } catch (e) {
    console.error("✗ advanceJourney failed:", e.message);
  }

  // Simulate mining phase
  state.phase = GAME_PHASES.MINING;
  state.currentRegion = "northern_mines";
  state.currentClaim = "northern_mines_river_panning_1";
  state.claimType = "river_panning";
  state.week = 1;

  try {
    advanceWeek(state);
    console.log("✓ advanceWeek passed");
    console.log("  Last journal:", state.journal[state.journal.length - 1]);
  } catch (e) {
    console.error("✗ advanceWeek failed:", e.message);
  }

  // Test recruitment
  try {
    const candidates = openRecruitment(state);
    console.log(`✓ openRecruitment returned ${candidates?.length ?? 0} candidates`);
    if (candidates?.length) {
      console.log(`  Sample: ${candidates[0].name} (${candidates[0].ethnicity}), asking $${candidates[0].askingPrice}`);
    }
  } catch (e) {
    console.error("✗ openRecruitment failed:", e.message);
  }

  // Test assay
  state.currentRegion = "sacramento";
  state.gold = 50;
  try {
    assayGold(state);
    console.log(`✓ assayGold passed — cash now $${state.cash}`);
  } catch (e) {
    console.error("✗ assayGold failed:", e.message);
  }

  console.log("\n✓ Smoke test complete.");
};

smokeTest();
