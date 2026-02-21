const GAME_PHASES = {
  JOURNEY: "journey",   // tutorial — getting to California
  MINING: "mining",     // main game loop
  EXIT: "exit",         // endgame pressure
};

const createInitialState = () => ({
  // ── Phase ─────────────────────────────────────────────────────────────────
  phase: GAME_PHASES.JOURNEY,

  // ── Time ──────────────────────────────────────────────────────────────────
  day: 1,               // used during journey
  week: 1,              // used during mining & exit
  month: 4,             // April 1849 — canonical Gold Rush start
  year: 1849,
  season: "spring",     // spring, summer, fall, winter

  // ── Journey-specific (phase 1 only) ───────────────────────────────────────
  journeyProgress: 0,         // 0-8, each event increments this
  journeyEventsTotal: 8,
  journeyRoute: null,         // "overland", "sea", "panama"
  transport: null,            // ox_cart, mule, horse, foot
  transportHealth: 100,
  weather: "clear",

  // ── Location (phase 2+) ───────────────────────────────────────────────────
  currentRegion: null,        // set when phase 2 begins
  travelCooldown: 0,          // weeks before you can move regions again

  // ── Claim ─────────────────────────────────────────────────────────────────
  currentClaim: null,         // null until player stakes one
  claimHealth: 100,           // 100 = fresh, 0 = exhausted
  claimType: null,            // "river_panning", "hard_rock", "hydraulic"
  weeksMining: 0,             // total weeks spent mining

  // ── Resources ─────────────────────────────────────────────────────────────
  cash: 0,
  gold: 0,                    // raw unassayed gold in oz
  debt: 0,
  food: 30,                   // lbs
  water: 7,                   // days supply
  medicine: 2,
  tools: 3,                   // pickaxes, pans — degrade over time
  toolCondition: 100,         // 100 = new, 0 = broken
  ammo: 10,

  // ── Party ─────────────────────────────────────────────────────────────────
  party: [],
  maxPartySize: 6,

  // ── Economy ───────────────────────────────────────────────────────────────
  goldRushPeak: false,        // flips true at week 20, yields start declining
  marketPrices: {             // updated each week based on region & rush state
    food: 0.05,
    medicine: 8.00,
    tools: 12.00,
    ammo: 2.00,
  },

  // ── World State ───────────────────────────────────────────────────────────
  flags: {},
  reputation: 50,             // 0-100, never shown directly
  rumors: [],
  knownRegions: [],           // regions the player has visited or heard about
  pendingRecruits: null,      // candidates shown during recruitment action

  // ── Journal ───────────────────────────────────────────────────────────────
  journal: [],

  // ── End State ─────────────────────────────────────────────────────────────
  gameOver: false,
  gameOverReason: null,
  won: false,
  endingTier: null,           // "destitute", "survived", "modest", "wealthy", "legend"
});
