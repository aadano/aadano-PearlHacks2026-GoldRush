// ── Core Member Factory ───────────────────────────────────────────────────────

const rollStat = () => Math.floor(Math.random() * 40) + 30; // 30–70 range

const createMember = (overrides = {}) => ({
  id: Math.random().toString(36).slice(2),
  name: "",
  age: 0,
  ethnicity: "",
  hometown: "",
  backstory: "",
  personalGoal: "",
  personality: "", // optimistic, gruff, devout, reckless, cautious

  // Core stats
  health: 100,
  morale: 80,
  alive: true,
  injured: false,
  sick: false,

  // Skills — each 0-3, 0 = none, 3 = expert
  skills: {
    mining: 0,
    medicine: 0,
    navigation: 0,
    carpentry: 0,
    haggling: 0,
    hunting: 0,
    firearms: 0,
  },

  // FIX: firearms was missing from skillXP — now matches skills object exactly
  skillXP: {
    mining: 0,
    medicine: 0,
    navigation: 0,
    carpentry: 0,
    haggling: 0,
    hunting: 0,
    firearms: 0,
  },

  // Stats — physical and mental attributes
  stats: {
    strength: rollStat(),     // affects mining yield, carrying capacity
    endurance: rollStat(),    // affects how fast health degrades under strain
    wits: rollStat(),         // affects haggling, avoiding scams, reading rumors
    grit: rollStat(),         // affects resistance to morale loss
    constitution: rollStat(), // affects disease resistance, recovery speed
    nerve: rollStat(),        // affects performance under violent stress
  },

  // Loyalty
  daysWithParty: 0,
  loyalty: 0, // 0–100, grows over time

  // History
  causeOfDeath: null,
  dayJoined: 1,
  dayDied: null,

  ...overrides
});

// ── Skill Progression ─────────────────────────────────────────────────────────

const SKILL_XP_THRESHOLDS = [0, 50, 150, 350]; // XP needed to reach levels 1, 2, 3

const awardSkillXP = (state, memberId, skill, amount) => {
  const member = state.party.find(m => m.id === memberId);
  if (!member || !member.alive) return;
  if (!(skill in member.skillXP)) return; // guard against invalid skill names

  member.skillXP[skill] += amount;
  const currentLevel = member.skills[skill];

  if (currentLevel < 3 && member.skillXP[skill] >= SKILL_XP_THRESHOLDS[currentLevel + 1]) {
    member.skills[skill] += 1;
    logJournal(state, `${member.name}'s ${skill} has grown sharper from hard experience.`);
  }
};

// ── Stat Progression ──────────────────────────────────────────────────────────

const tickStatProgression = (state) => {
  getLivingMembers(state).forEach(member => {
    // Mining in the foothills builds endurance
    if (state.currentRegion === "sierra_foothills") {
      member.stats.endurance = Math.min(100, member.stats.endurance + 0.1);
    }
    // Surviving sickness slowly builds constitution
    if (member.sick && member.alive) {
      member.stats.constitution = Math.min(100, member.stats.constitution + 0.05);
    }
  });
};

// ── Loyalty ───────────────────────────────────────────────────────────────────

const updateLoyalty = (state) => {
  getLivingMembers(state).forEach(member => {
    member.daysWithParty += 1;
    const timeBonus = member.daysWithParty > 30 ? 0.15 : 0.08;
    member.loyalty = Math.min(100, member.loyalty + timeBonus);
  });
};

const adjustLoyalty = (state, memberId, amount) => {
  const member = state.party.find(m => m.id === memberId);
  if (!member) return;
  member.loyalty = Math.max(0, Math.min(100, member.loyalty + amount));
};

// Loyal members have a lower morale floor — they won't desert as easily
const getMoraleFloor = (member) => -(member.loyalty * 0.5);

const dailyMoraleRecovery = (member) => {
  const base = 2;
  const loyaltyBonus = member.loyalty * 0.05;  // up to +5/day at max loyalty
  const gritBonus = member.stats.grit * 0.02;
  return base + loyaltyBonus + gritBonus;
};

const recoverMorale = (state) => {
  getLivingMembers(state).forEach(member => {
    member.morale = Math.min(100, member.morale + dailyMoraleRecovery(member));
  });
};

// ── Core Helpers ──────────────────────────────────────────────────────────────

const getLivingMembers = (state) =>
  state.party.filter(m => m.alive);

const getMemberWithSkill = (state, skill, minLevel = 1) =>
  getLivingMembers(state).find(m => m.skills[skill] >= minLevel);

const getBestSkill = (state, skill) =>
  getLivingMembers(state).reduce((best, m) =>
    m.skills[skill] > (best?.skills[skill] ?? -1) ? m : best, null);

// FIX: getBestStat — separate helper for stats (wits, nerve, etc.)
// Previously code incorrectly called getBestSkill for stat lookups
const getBestStat = (state, stat) =>
  getLivingMembers(state).reduce((best, m) =>
    m.stats[stat] > (best?.stats[stat] ?? -1) ? m : best, null);

const killMember = (state, memberId, cause) => {
  const member = state.party.find(m => m.id === memberId);
  if (!member || !member.alive) return;
  member.alive = false;
  member.causeOfDeath = cause;
  member.dayDied = state.day || state.week;
  // Morale hit for survivors
  getLivingMembers(state).forEach(m => m.morale -= 15);
  logJournal(state, `${member.name} has died. Cause: ${cause}.`);
};

const adjustMorale = (state, amount, targetId = null) => {
  const targets = targetId
    ? state.party.filter(m => m.id === targetId && m.alive)
    : getLivingMembers(state);
  targets.forEach(m => {
    m.morale = Math.max(getMoraleFloor(m), Math.min(100, m.morale + amount));
  });
};

const adjustHealth = (state, amount, targetId = null) => {
  const targets = targetId
    ? state.party.filter(m => m.id === targetId && m.alive)
    : getLivingMembers(state);
  targets.forEach(m => {
    m.health = Math.max(0, Math.min(100, m.health + amount));
    if (m.health === 0) killMember(state, m.id, "unknown causes");
  });
};

// ── Combat ────────────────────────────────────────────────────────────────────

const getCombatStrength = (state) => {
  return getLivingMembers(state).reduce((total, member) => {
    const skillBonus = member.skills.firearms * 20;
    const nerveBonus = member.stats.nerve * 0.3;
    const healthPenalty = member.health < 50 ? -15 : 0;
    return total + skillBonus + nerveBonus + healthPenalty;
  }, 0);
};

const getCombatOutcome = (state, difficulty) => {
  const thresholds = { easy: 40, medium: 80, hard: 140 };
  const strength = getCombatStrength(state);
  if (strength >= thresholds[difficulty]) return "victory";
  if (strength >= thresholds[difficulty] * 0.6) return "pyrrhic";
  return "defeat";
};

// ── Candidate Generation ──────────────────────────────────────────────────────

const PERSONALITIES = ["optimistic", "gruff", "devout", "reckless", "cautious"];

const BACKSTORIES = {
  appalachian: [
    "Left a failing farm in Tennessee. Has a wife and three kids waiting.",
    "Former blacksmith. Heard the stories and couldn't stay put.",
    "His brother came west last year. Hasn't heard from him since.",
    "Owes a debt back home. Came here to settle it.",
  ],
  irish: [
    "Arrived in New York two years ago. The famine took everything before that.",
    "Was a dockworker in Boston. Got tired of breaking his back for nothing.",
    "His whole village pitched in to send him. He carries that weight.",
    "Fought in the Mexican War. Figured California couldn't be worse.",
  ],
  german: [
    "A failed 1848 revolutionary. California was the only option left.",
    "Trained as an engineer in Hamburg. Heard the mines need smart men.",
    "Followed a pamphlet that promised riches. Believes it less every day.",
    "His father was a miner in the Ruhr. This feels familiar, if not easier.",
  ],
  chinese: [
    "From Guangdong province. Sending everything home to his family.",
    "Crossed the Pacific with twelve men from his village. He's the last one.",
    "Knows three words of English. Knows plenty about hard work.",
    "His uncle made it back with enough to buy land. He intends to do the same.",
  ],
  mexican: [
    "His family has worked this land for two generations. The border moved, not him.",
    "A vaquero by trade. The mines are new but difficult work is not.",
    "Was at Sutter's Mill when it started. Has seen it all go wrong before.",
    "Came north from Sonora with a crew of experienced miners. This is business.",
  ],
  chilean: [
    "A miner from Copiapó. Knows silver and copper — gold is just another metal.",
    "Arrived in '48 before most Anglos even heard the news.",
    "His partner was driven off a claim last month. He's careful now.",
    "Speaks French, Spanish, and enough English to get cheated slightly less.",
  ],
  french: [
    "A failed merchant from Lyon. One last gamble.",
    "Came as part of a French syndicate that dissolved three weeks after arriving.",
    "A former soldier. Quiet, observant, not easily rattled.",
    "Writes letters home every week. Nobody writes back.",
  ],
  black_american: [
    "A free man from Philadelphia. Carries his papers everywhere, always.",
    "Escaped from Georgia two years ago. California has no slavery — yet.",
    "His father was freed before him. He intends to buy land before he dies.",
    "A skilled carpenter. Came for gold but knows his skills are worth plenty.",
  ],
};

const PERSONAL_GOALS = [
  "Send $500 home before winter.",
  "Buy land back east and never work for another man again.",
  "Find his brother, last heard from near the northern mines.",
  "Pay off a debt before the men collecting it come looking.",
  "Make enough to bring his family west.",
  "Strike it rich once — just once — and then quit.",
  "Survive. That's all. Just survive.",
  "Prove something to someone back home.",
];

const HOMETOWNS = {
  appalachian:   ["Knoxville, TN", "Asheville, NC", "Lexington, KY", "Richmond, VA", "Charleston, WV"],
  irish:         ["Cork", "Galway", "Dublin", "Boston, MA", "New York, NY"],
  german:        ["Hamburg", "Munich", "Berlin", "Frankfurt", "Cincinnati, OH"],
  chinese:       ["Guangzhou", "Taishan", "Zhongshan", "Jiangmen", "Kaiping"],
  mexican:       ["Sonora", "Sinaloa", "Jalisco", "Chihuahua", "Los Angeles"],
  chilean:       ["Santiago", "Valparaíso", "Copiapó", "Concepción", "La Serena"],
  french:        ["Paris", "Lyon", "Marseille", "Bordeaux", "Nantes"],
  black_american:["Philadelphia, PA", "Boston, MA", "Cincinnati, OH", "Detroit, MI", "New York, NY"],
};

const ETHNICITY_SKILL_WEIGHTS = {
  appalachian:    { hunting: 2, mining: 1, carpentry: 1 },
  irish:          { mining: 1, carpentry: 1 },
  german:         { carpentry: 2, mining: 1, navigation: 1 },
  chinese:        { mining: 2, haggling: 1 },
  mexican:        { mining: 2, navigation: 1, haggling: 1 },
  chilean:        { mining: 3, navigation: 1 },
  french:         { haggling: 2, navigation: 1 },
  black_american: { carpentry: 2, hunting: 1 },
};

const generateCandidateSkills = (ethnicity) => {
  const weights = ETHNICITY_SKILL_WEIGHTS[ethnicity] || {};
  const skills = {
    mining: 0, medicine: 0, navigation: 0,
    carpentry: 0, haggling: 0, hunting: 0, firearms: 0,
  };

  Object.entries(weights).forEach(([skill, level]) => {
    if (Math.random() < 0.6) {
      skills[skill] = Math.min(3, level);
    } else if (Math.random() < 0.3) {
      skills[skill] = Math.max(0, level - 1);
    }
  });

  // Small chance of a surprise bonus skill
  const allSkills = Object.keys(skills);
  if (Math.random() < 0.25) {
    const surprise = allSkills[Math.floor(Math.random() * allSkills.length)];
    skills[surprise] = Math.min(3, skills[surprise] + 1);
  }

  return skills;
};

const generateCandidate = (ethnicity, state) => {
  const { full } = generateName(ethnicity);
  const personality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
  const backstoryPool = BACKSTORIES[ethnicity] || BACKSTORIES.appalachian;
  const hometownPool = HOMETOWNS[ethnicity] || HOMETOWNS.appalachian;
  const skills = generateCandidateSkills(ethnicity);

  const totalSkillLevel = Object.values(skills).reduce((a, b) => a + b, 0);
  const region = getCurrentRegion(state);
  const demandMultiplier = region ? region.priceMultiplier / 3 : 1;
  const askingPrice = Math.floor((10 + totalSkillLevel * 8) * demandMultiplier);

  return createMember({
    name: full,
    ethnicity,
    age: Math.floor(Math.random() * 22) + 19,
    hometown: hometownPool[Math.floor(Math.random() * hometownPool.length)],
    backstory: backstoryPool[Math.floor(Math.random() * backstoryPool.length)],
    personalGoal: PERSONAL_GOALS[Math.floor(Math.random() * PERSONAL_GOALS.length)],
    personality,
    skills,
    // FIX: skillXP must include firearms to match skills object
    skillXP: { mining: 0, medicine: 0, navigation: 0, carpentry: 0, haggling: 0, hunting: 0, firearms: 0 },
    dayJoined: state.day || state.week,
    askingPrice,
  });
};

// ── Recruitment Pool ──────────────────────────────────────────────────────────

const sampleEthnicity = (pool) => {
  const rand = Math.random();
  let cumulative = 0;
  for (const [ethnicity, weight] of Object.entries(pool)) {
    cumulative += weight;
    if (rand <= cumulative) return ethnicity;
  }
  return Object.keys(pool)[0];
};

const generateRecruitmentPool = (state, count = 4) => {
  const region = getCurrentRegion(state);
  if (!region?.recruitmentPool || Object.keys(region.recruitmentPool).length === 0) {
    return [];
  }
  const candidates = [];
  for (let i = 0; i < count; i++) {
    const ethnicity = sampleEthnicity(region.recruitmentPool);
    candidates.push(generateCandidate(ethnicity, state));
  }
  return candidates;
};

// ── Hiring ────────────────────────────────────────────────────────────────────

const getOpenSlots = (state) =>
  state.maxPartySize - getLivingMembers(state).length;

const canRecruit = (state) =>
  getOpenSlots(state) > 0 &&
  state.phase !== GAME_PHASES.JOURNEY &&
  !!getCurrentRegion(state)?.recruitmentPool;

const hireCandidate = (state, candidate) => {
  if (getOpenSlots(state) <= 0) return false;
  if (state.cash < candidate.askingPrice) return false;

  const paid = candidate.askingPrice;
  state.cash -= paid;

  const { askingPrice, ...member } = candidate;
  member.loyalty = 10;
  state.party.push(member);

  logJournal(state, `${member.name} joined the party for $${paid}.`);
  return true;
};

// Single canonical recruitMember — FIX: removed duplicate that was in names.js
const recruitMember = (state, ethnicity) => {
  const { full } = generateName(ethnicity);
  return createMember({
    name: full,
    ethnicity,
    dayJoined: state.day || state.week,
  });
};
