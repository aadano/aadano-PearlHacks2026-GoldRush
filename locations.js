// ── Journey Waypoints (Phase 1 only) ─────────────────────────────────────────

const WAYPOINTS = [
  {
    id: "independence_mo",
    label: "Independence, Missouri",
    description: "The jumping-off point. Streets choked with wagons and desperate men.",
    tutorialFocus: "supplies",
  },
  {
    id: "fort_kearney",
    label: "Fort Kearney",
    description: "The last real fort for a long stretch. Stock up.",
    tutorialFocus: "party",
  },
  {
    id: "fort_laramie",
    label: "Fort Laramie",
    description: "Halfway. The Rockies are ahead. Some men turn back here.",
    tutorialFocus: "morale",
  },
  {
    id: "sierra_nevada",
    label: "Sierra Nevada Crossing",
    description: "The last and worst obstacle. The Donner Party crossed here two years ago.",
    tutorialFocus: "survival",
  },
  {
    id: "sacramento",
    label: "Sacramento",
    description: "You made it. The city is a madhouse. Everyone is going to be rich. That's what they all say.",
    isJourneyEnd: true,
    tutorialFocus: null,
  },
];

// ── Journey Routes ────────────────────────────────────────────────────────────

const JOURNEY_ROUTES = {
  overland: {
    label: "Overland Trail",
    description: "The classic route. Long, punishing, and well-traveled.",
    durationEvents: 8,
    startingCash: 120,
    startingFood: 50,
    riskProfile: "medium",
    arrivalBonus: null,
  },
  sea: {
    label: "Cape Horn by Sea",
    description: "Six months around the bottom of the world. Expensive but no mountains.",
    durationEvents: 6,
    startingCash: 60,
    startingFood: 40,
    riskProfile: "low",
    arrivalBonus: "rested",
  },
  panama: {
    label: "Panama Shortcut",
    description: "Fast but the jungle will try to kill you. Malaria. Heat. Mud.",
    durationEvents: 5,
    startingCash: 50,
    startingFood: 30,
    riskProfile: "high",
    arrivalBonus: "early",
  },
};

// ── California Regions (Phase 2+) ─────────────────────────────────────────────

const REGIONS = {
  sacramento: {
    id: "sacramento",
    label: "Sacramento",
    description: "The supply hub. Expensive, loud, and full of men who haven't bathed in months.",
    type: "town",
    hasAssayOffice: true,
    hasDoctor: true,
    hasTrading: true,
    hasSaloon: true,
    recruitmentPool: {
      chinese: 0.25,
      irish: 0.25,
      appalachian: 0.25,
      black_american: 0.15,
      chilean: 0.10,
    },
    miningAvailable: false,
    priceMultiplier: 3.5,
    travelCost: 0,
    weeklyEvents: ["town_gossip", "assay_office", "saloon_night", "recruitment"],
  },

  northern_mines: {
    id: "northern_mines",
    label: "Northern Mines",
    description: "The American River country. Crowded now, but claims still open if you look.",
    type: "mining",
    hasAssayOffice: false,
    hasDoctor: false,
    hasTrading: true,
    hasSaloon: true,
    recruitmentPool: {
      chinese: 0.35,
      appalachian: 0.30,
      german: 0.20,
      french: 0.15,
    },
    miningAvailable: true,
    claimTypes: ["river_panning", "hard_rock"],
    baseYieldPerWeek: 25,
    yieldDecayRate: 3,
    priceMultiplier: 4.5,
    travelCost: 1,
  },

  southern_mines: {
    id: "southern_mines",
    label: "Southern Mines",
    description: "Mexican and Chilean miners got here first and know what they're doing.",
    type: "mining",
    hasAssayOffice: false,
    hasDoctor: false,
    hasTrading: true,
    hasSaloon: false,
    recruitmentPool: {
      mexican: 0.40,
      chilean: 0.25,
      appalachian: 0.25,
      black_american: 0.10,
    },
    miningAvailable: true,
    claimTypes: ["river_panning", "hydraulic"],
    baseYieldPerWeek: 30,
    yieldDecayRate: 4,
    priceMultiplier: 5.0,
    travelCost: 1,
  },

  sierra_foothills: {
    id: "sierra_foothills",
    label: "Sierra Foothills",
    description: "Harder to reach. Less picked over. The mountains will take their toll.",
    type: "mining",
    hasAssayOffice: false,
    hasDoctor: false,
    hasTrading: false,
    hasSaloon: false,
    recruitmentPool: {
      appalachian: 0.50,
      german: 0.30,
      french: 0.20,
    },
    miningAvailable: true,
    claimTypes: ["hard_rock", "river_panning"],
    baseYieldPerWeek: 45,
    yieldDecayRate: 2,
    priceMultiplier: 6.0,
    travelCost: 2,
  },

  san_francisco: {
    id: "san_francisco",
    label: "San Francisco",
    description: "The city that gold built. Ships rotting in the bay, their crews gone to the mines.",
    type: "town",
    hasAssayOffice: true,
    hasDoctor: true,
    hasTrading: true,
    hasSaloon: true,
    recruitmentPool: {
      chinese: 0.20,
      chilean: 0.20,
      french: 0.20,
      irish: 0.20,
      appalachian: 0.10,
      black_american: 0.10,
    },
    miningAvailable: false,
    priceMultiplier: 4.0,
    travelCost: 2,
    specialActions: ["book_passage_home", "invest_in_merchant"],
  },
};

// ── Claim Types ────────────────────────────────────────────────────────────────

const CLAIM_TYPES = {
  river_panning: {
    label: "River Panning",
    description: "Patient work in cold water. Low risk, steady yield.",
    yieldMultiplier: 1.0,
    toolDegradation: 5,
    healthRisk: 0.1,
    skillBenefit: "mining",
    strengthRequirement: 20,
  },
  hard_rock: {
    label: "Hard Rock Mining",
    description: "Blasting and drilling into the hillside. Dangerous but potentially lucrative.",
    yieldMultiplier: 1.6,
    toolDegradation: 15,
    healthRisk: 0.25,
    skillBenefit: "mining",
    strengthRequirement: 50,
  },
  hydraulic: {
    label: "Hydraulic Mining",
    description: "High-pressure water cannons strip the hillside. Brutal and effective.",
    yieldMultiplier: 2.2,
    toolDegradation: 20,
    healthRisk: 0.15,
    skillBenefit: "carpentry",
    strengthRequirement: 40,
    requiredTools: 5,
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const getCurrentRegion = (state) => REGIONS[state.currentRegion] || null;

const getRegionPrices = (state) => {
  const region = getCurrentRegion(state);
  const multiplier = region ? region.priceMultiplier : 1.0;
  const rushMultiplier = state.goldRushPeak ? 1.3 : 1.0;
  return {
    food:     0.05  * multiplier * rushMultiplier,
    medicine: 8.00  * multiplier * rushMultiplier,
    tools:    12.00 * multiplier * rushMultiplier,
    ammo:     2.00  * multiplier * rushMultiplier,
  };
};

const getBasePrice = (item, state) => state.marketPrices[item] || 1;

const getHagglingDiscount = (state) => {
  const haggler = getBestSkill(state, "haggling");
  if (!haggler) return 0;
  const witsBonus = haggler.stats.wits * 0.001;
  return Math.min(0.3, (haggler.skills.haggling * 0.05) + witsBonus);
};

const canTravelTo = (state, regionId) => {
  if (state.travelCooldown > 0) return false;
  if (state.currentRegion === regionId) return false;
  return !!REGIONS[regionId];
};

const travelToRegion = (state, regionId) => {
  const region = REGIONS[regionId];
  if (!region) return;
  const cost = region.travelCost;
  state.food -= cost * getLivingMembers(state).length * 1.5;
  state.currentRegion = regionId;
  state.travelCooldown = cost;
  state.currentClaim = null;
  state.claimHealth = 100;
  state.claimType = null;
  if (!state.knownRegions.includes(regionId)) {
    state.knownRegions.push(regionId);
  }
  logJournal(state, `Moved to ${region.label}.`);
};
