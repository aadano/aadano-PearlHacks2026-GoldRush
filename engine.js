// ── Phase Management ───────────────────────────────────────────────────────────

const advancePhase = (state) => {
  if (state.phase === GAME_PHASES.JOURNEY) {
    state.phase = GAME_PHASES.MINING;
    state.currentRegion = "sacramento";
    state.knownRegions = ["sacramento"];
    applyRouteArrivalBonus(state);
    logJournal(state, "Week 1. We've arrived in California. The real work begins.");
  } else if (state.phase === GAME_PHASES.MINING) {
    state.phase = GAME_PHASES.EXIT;
    logJournal(state, "The easy claims are gone. Time to think about going home.");
  }
};

const applyRouteArrivalBonus = (state) => {
  const route = JOURNEY_ROUTES[state.journeyRoute];
  if (!route?.arrivalBonus) return;
  if (route.arrivalBonus === "rested") {
    getLivingMembers(state).forEach(m => {
      m.health = 100;
      m.morale = Math.min(100, m.morale + 20);
    });
  }
  if (route.arrivalBonus === "early") {
    state.week = 1;
  }
};

// ── Journey Loop (Phase 1) ─────────────────────────────────────────────────────

const advanceJourney = (state) => {
  state.journeyProgress += 1;
  state.day += 6;
  consumeFood(state);
  degradeTransport(state);
  updateWeather(state);
  checkDesertions(state);
  checkGameOver(state);

  if (state.journeyProgress >= state.journeyEventsTotal) {
    advancePhase(state);
  }
};

const degradeTransport = (state) => {
  if (!state.transport || state.transport === "foot") return;
  const penalty = state.weather === "storm" ? 15 : 5;
  state.transportHealth -= penalty;

  if (state.transportHealth <= 0) {
    state.transport = "foot";
    adjustMorale(state, -20);
    logJournal(state, "The cart gave out. We're on foot now.");
  }
};

// ── Mining Loop (Phase 2 & 3) ─────────────────────────────────────────────────

const advanceWeek = (state) => {
  state.week += 1;
  state.weeksMining += 1;
  if (state.travelCooldown > 0) state.travelCooldown -= 1;
  tickMonth(state);
  consumeFood(state);
  degradeTools(state);
  updateMarketPrices(state);
  updateLoyalty(state);
  recoverMorale(state);
  tickStatProgression(state);
  checkDesertions(state);
  checkGoldRushPeak(state);
  checkExitPressure(state);
  checkGameOver(state);

  if (state.currentClaim) {
    mineThisWeek(state);
  }
};

const mineThisWeek = (state) => {
  const region = getCurrentRegion(state);
  const claimType = CLAIM_TYPES[state.claimType];
  if (!region || !claimType) return;

  const claimMultiplier = state.claimHealth / 100;
  const bestMiner = getBestSkill(state, "mining");
  const skillMultiplier = bestMiner ? 1 + (bestMiner.skills.mining * 0.3) : 1;
  const avgStrength = getLivingMembers(state)
    .reduce((sum, m) => sum + m.stats.strength, 0) / Math.max(1, getLivingMembers(state).length);
  const strengthMultiplier = avgStrength >= claimType.strengthRequirement ? 1 : 0.7;
  const partyMultiplier = Math.min(getLivingMembers(state).length / 3, 1.5);

  const yieldAmount = Math.floor(
    region.baseYieldPerWeek *
    claimType.yieldMultiplier *
    claimMultiplier *
    skillMultiplier *
    strengthMultiplier *
    partyMultiplier
  );

  state.gold += yieldAmount;
  state.claimHealth = Math.max(0, state.claimHealth - region.yieldDecayRate);

  getLivingMembers(state).forEach(m => {
    awardSkillXP(state, m.id, "mining", 10);
    if (state.claimType === "hydraulic") {
      awardSkillXP(state, m.id, "carpentry", 5);
    }
  });

  logJournal(state, `Week ${state.week}. Pulled ${yieldAmount} oz from the claim.`);

  if (state.claimHealth <= 20 && !state.flags.claimWarned) {
    state.flags.claimWarned = true;
    logJournal(state, "The claim is running thin. Time to move or go deeper.");
  }
  if (state.claimHealth <= 0) {
    state.currentClaim = null;
    state.claimType = null;
    logJournal(state, "The claim is played out. Nothing left here.");
  }
};

const degradeTools = (state) => {
  if (!state.claimType) return;
  const claimType = CLAIM_TYPES[state.claimType];
  let degradation = claimType.toolDegradation;

  const carpenter = getMemberWithSkill(state, "carpentry");
  if (carpenter) degradation -= carpenter.skills.carpentry * 3;

  state.toolCondition = Math.max(0, Math.min(100, state.toolCondition - degradation));

  if (state.toolCondition <= 0) {
    state.tools = Math.max(0, state.tools - 1);
    state.toolCondition = 60;
    adjustMorale(state, -10);
    logJournal(state, "Tools are breaking down faster than we can replace them.");
  }
};

// ── Gold Rush Peak & Exit Pressure ────────────────────────────────────────────

const checkGoldRushPeak = (state) => {
  if (!state.goldRushPeak && state.week >= 20) {
    state.goldRushPeak = true;
    logJournal(state, "The easy gold is gone. Yields are falling and prices are climbing.");
    adjustMorale(state, -10);
  }
};

const checkExitPressure = (state) => {
  if (state.phase === GAME_PHASES.MINING && state.week >= 30) {
    advancePhase(state);
  }
};

// ── Time & Season ─────────────────────────────────────────────────────────────

const tickMonth = (state) => {
  if (state.week % 4 === 0) {
    state.month += 1;
    if (state.month > 12) {
      state.month = 1;
      state.year += 1;
    }
    state.season = getSeason(state.month);
  }
};

const getSeason = (month) => {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
};

const updateMarketPrices = (state) => {
  state.marketPrices = getRegionPrices(state);
};

// ── Food & Survival ───────────────────────────────────────────────────────────

const consumeFood = (state) => {
  const daysElapsed = state.phase === GAME_PHASES.JOURNEY ? 6 : 7;
  const consumed = getLivingMembers(state).length * 1.5 * daysElapsed;
  state.food = Math.max(0, state.food - consumed);

  if (state.food <= 0) {
    adjustHealth(state, -15);
    adjustMorale(state, -20);
    logJournal(state, "No food this week. The party is starving.");
  }
};

// ── Weather ───────────────────────────────────────────────────────────────────

const updateWeather = (state) => {
  const roll = Math.random();
  if (state.season === "winter") {
    state.weather = roll < 0.4 ? "snow" : roll < 0.6 ? "storm" : "clear";
  } else if (state.season === "summer") {
    state.weather = roll < 0.3 ? "heatwave" : "clear";
  } else {
    state.weather = roll < 0.2 ? "storm" : roll < 0.4 ? "rain" : "clear";
  }
};

// ── Event System ──────────────────────────────────────────────────────────────

const getEligibleEvents = (state) => {
  return EVENTS.filter(event => {
    if (state.flags[`seen_${event.id}`] && !event.repeatable) return false;
    if (event.phase && event.phase !== state.phase) return false;
    if (event.condition && !event.condition(state)) return false;
    return true;
  });
};

const pickEvent = (state) => {
  const eligible = getEligibleEvents(state);
  if (!eligible.length) return getFallbackEvent(state);
  const totalWeight = eligible.reduce((sum, e) => sum + (e.weight || 1), 0);
  let rand = Math.random() * totalWeight;
  for (const event of eligible) {
    rand -= (event.weight || 1);
    if (rand <= 0) return event;
  }
  return eligible[eligible.length - 1];
};

const getFallbackEvent = (state) => ({
  id: "quiet_week",
  title: "A Quiet Week",
  description: () => state.phase === GAME_PHASES.JOURNEY
    ? "The trail is uneventful. You make good progress."
    : "Nothing remarkable happens. The work continues.",
  choices: [{
    text: "Press on",
    consequences: (state) => {
      adjustMorale(state, 3);
      logJournal(state, "A quiet stretch. Almost peaceful.");
    }
  }]
});

const resolveChoice = (state, event, choiceIndex) => {
  const choice = event.choices[choiceIndex];
  if (!choice) return;
  if (choice.available && !choice.available(state)) return;

  choice.consequences(state);

  // Mark as seen (repeatable events skip this)
  if (!event.repeatable) {
    state.flags[`seen_${event.id}`] = true;
  }

  if (state.phase === GAME_PHASES.JOURNEY) {
    advanceJourney(state);
  } else {
    advanceWeek(state);
  }

  render(state);
};

// ── Desertions ────────────────────────────────────────────────────────────────

const checkDesertions = (state) => {
  getLivingMembers(state).forEach(member => {
    if (member.morale <= getMoraleFloor(member)) {
      member.alive = false;
      member.causeOfDeath = "desertion";
      member.dayDied = state.day || state.week;
      logJournal(state, `${member.name} slipped away in the night. Can't blame them.`);
    }
  });
};

// ── Game Over ─────────────────────────────────────────────────────────────────

const checkGameOver = (state) => {
  if (state.gameOver) return; // don't double-trigger

  if (getLivingMembers(state).length === 0) {
    state.gameOver = true;
    state.gameOverReason = "Your entire party has perished.";
    return;
  }
  if (state.cash <= 0 && state.gold <= 0 && state.food <= 0) {
    state.gameOver = true;
    state.gameOverReason = "Destitute and starving. The dream is over.";
    return;
  }
  if (state.phase === GAME_PHASES.EXIT && state.flags.bookedPassageHome) {
    resolveEnding(state);
  }
};

// ── Ending Resolution ─────────────────────────────────────────────────────────

const resolveEnding = (state) => {
  state.gameOver = true;
  state.won = true;

  const totalWealth = state.cash + (state.gold * 16);
  const partyIntact = getLivingMembers(state).length >= 3;
  const loyalParty = getLivingMembers(state).every(m => m.loyalty > 60);

  if (totalWealth < 100) {
    state.endingTier = "destitute";
  } else if (totalWealth < 500) {
    state.endingTier = "survived";
  } else if (totalWealth < 2000) {
    state.endingTier = "modest";
  } else if (totalWealth >= 2000 && (!partyIntact || !loyalParty)) {
    state.endingTier = "wealthy";
  } else {
    state.endingTier = "legend";
  }

  logJournal(state, `The journey is over. You leave California with $${state.cash} cash and ${state.gold} oz of gold.`);
};

// ── Assay Office ──────────────────────────────────────────────────────────────

const assayGold = (state) => {
  const region = getCurrentRegion(state);
  if (!region?.hasAssayOffice) return;
  if (state.gold <= 0) return;

  const haggler = getBestSkill(state, "haggling");
  const baseRate = 16;
  const hagglerBonus = haggler ? haggler.skills.haggling * 0.5 : 0;
  const scamChance = state.reputation < 40 ? 0.3 : 0.1;
  const rate = Math.random() < scamChance ? baseRate * 0.7 : baseRate + hagglerBonus;

  // FIX: capture gold amount BEFORE zeroing it out
  const ozSold = state.gold;
  const earned = Math.floor(ozSold * rate);
  state.gold = 0;
  state.cash += earned;

  logJournal(state, `Assayed ${ozSold} oz. Received $${earned}.`);
};

// ── Staking a Claim ───────────────────────────────────────────────────────────

const stakeClaim = (state, claimType) => {
  const region = getCurrentRegion(state);
  if (!region?.miningAvailable) return;
  if (!region.claimTypes.includes(claimType)) return;

  const type = CLAIM_TYPES[claimType];
  if (claimType === "hydraulic" && state.tools < type.requiredTools) {
    logJournal(state, "Not enough tools for hydraulic mining.");
    return;
  }

  state.currentClaim = `${state.currentRegion}_${claimType}_${state.week}`;
  state.claimType = claimType;
  state.claimHealth = 100;
  state.flags.claimWarned = false;
  logJournal(state, `Staked a ${type.label} claim in the ${region.label}.`);
};

// ── Recruitment ───────────────────────────────────────────────────────────────

const openRecruitment = (state) => {
  if (!canRecruit(state)) return null;
  const count = Math.min(4, getOpenSlots(state) + 2);
  const candidates = generateRecruitmentPool(state, count);
  state.pendingRecruits = candidates;
  return candidates;
};

const confirmRecruitment = (state, selectedIndices) => {
  const candidates = state.pendingRecruits || [];
  const slots = getOpenSlots(state);
  selectedIndices.slice(0, slots).forEach(i => {
    if (candidates[i]) hireCandidate(state, candidates[i]);
  });
  state.pendingRecruits = null;
  render(state);
};
