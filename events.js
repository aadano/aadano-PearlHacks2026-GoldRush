const EVENTS = [

  // ── Journey Events (phase 1) ────────────────────────────────────────────────

  {
    id: "cholera_outbreak",
    repeatable: false,
    weight: 1,
    phase: GAME_PHASES.JOURNEY,
    // FIX: removed state.terrain check (no longer on state); scoped to journey phase
    // and water supply instead
    condition: (state) =>
      state.water < 5 &&
      getLivingMembers(state).length > 1,
    title: "A Shadow on the Water",
    description: (state) => {
      const victim = getLivingMembers(state)[0];
      return `${victim.name} woke before dawn, unable to stand.
      By morning, two others showed the same signs.
      The water from the last creek tasted wrong.
      You should have known.`;
    },
    choices: [
      {
        text: "Use your medicine supply",
        available: (state) => state.medicine >= 2,
        consequences: (state) => {
          state.medicine -= 2;
          adjustHealth(state, -20);
          logJournal(state, "Used medicine to fight the cholera. Some recovered.");
        }
      },
      {
        text: "Push through and hope for the best",
        consequences: (state) => {
          adjustHealth(state, -40);
          adjustMorale(state, -20);
          const living = getLivingMembers(state);
          if (living.length && living[0].health < 20) {
            killMember(state, living[0].id, "cholera");
          }
          logJournal(state, "Pushed through the sickness. The cost was steep.");
        }
      },
      {
        text: "Rest for 3 days",
        consequences: (state) => {
          state.day += 3;
          state.food -= 3 * getLivingMembers(state).length * 1.5;
          adjustHealth(state, -10);
          adjustMorale(state, 10);
          logJournal(state, "Rested near the creek. Most recovered slowly.");
        }
      }
    ]
  },

  {
    id: "river_crossing",
    repeatable: true,
    weight: 2,
    phase: GAME_PHASES.JOURNEY,
    // FIX: removed state.terrain === "plains"; scoped to journey, early progress
    condition: (state) =>
      state.journeyProgress < 5 &&
      state.transport !== "foot",
    title: "The River Don't Care",
    description: () =>
      `The river is running high from recent rain.
      There's a ferry — $8 a cart — or you can try the ford
      a half mile downstream where the bottom looks solid enough. Looks.`,
    choices: [
      {
        text: "Pay for the ferry",
        available: (state) => state.cash >= 8,
        consequences: (state) => {
          state.cash -= 8;
          logJournal(state, "Paid for the ferry. Dry and safe on the other side.");
        }
      },
      {
        text: "Attempt the ford",
        consequences: (state) => {
          const navigator = getBestSkill(state, "navigation");
          const successChance = 0.5 + (navigator ? navigator.skills.navigation * 0.12 : 0);
          if (Math.random() < successChance) {
            logJournal(state, "Made the crossing without trouble. Saved the fare.");
          } else {
            state.food = Math.floor(state.food * 0.6);
            adjustHealth(state, -20);
            state.transportHealth -= 30;
            adjustMorale(state, -15);
            logJournal(state, "The ford was deeper than it looked. Lost supplies. Someone nearly drowned.");
          }
        }
      }
    ]
  },

  {
    id: "bandit_ambush",
    repeatable: false,
    weight: 1,
    phase: GAME_PHASES.JOURNEY,
    // FIX: removed state.terrain === "mountain"; trigger near end of journey instead
    condition: (state) =>
      state.journeyProgress >= 5 &&
      state.cash > 50,
    title: "The Road Narrows",
    description: () =>
      `The pass narrows to a ledge barely wide enough for the cart.
      Two men step out from behind the rocks above.
      Rifles. Bandanas. The older one says: "Leave the cart."`,
    choices: [
      {
        text: "Fight back",
        consequences: (state) => {
          const outcome = getCombatOutcome(state, "hard");
          if (outcome === "victory") {
            adjustMorale(state, 20);
            getLivingMembers(state).forEach(m =>
              awardSkillXP(state, m.id, "firearms", 25));
            logJournal(state, "We fought them off. Hands still shaking.");
            state.flags.foughtOffBandits = true;
          } else if (outcome === "pyrrhic") {
            const victim = getLivingMembers(state)[0];
            adjustHealth(state, -35);
            if (victim) killMember(state, victim.id, "gunshot wound");
            logJournal(state, `Drove the bandits off. ${victim?.name ?? "Someone"} didn't make it.`);
          } else {
            state.cash = Math.floor(state.cash * 0.4);
            adjustHealth(state, -30);
            adjustMorale(state, -30);
            logJournal(state, "They took most of it. Lucky to be alive.");
          }
        }
      },
      {
        text: "Comply — hand over the cart",
        consequences: (state) => {
          state.transport = "foot";
          state.food = Math.floor(state.food * 0.3);
          adjustMorale(state, -35);
          logJournal(state, "We gave them everything. Alive but stranded on the pass with almost nothing.");
        }
      },
      {
        text: "Create a diversion and scatter",
        available: (state) => getBestSkill(state, "navigation") !== null,
        consequences: (state) => {
          const nav = getBestSkill(state, "navigation");
          const success = Math.random() < 0.4 + (nav.skills.navigation * 0.15);
          if (success) {
            adjustMorale(state, 10);
            awardSkillXP(state, nav.id, "navigation", 20);
            logJournal(state, `${nav.name} knew a side trail. We slipped away clean.`);
          } else {
            state.cash = Math.floor(state.cash * 0.6);
            adjustHealth(state, -15);
            logJournal(state, "The diversion half-worked. Lost some cash but kept the cart.");
          }
        }
      }
    ]
  },

  {
    id: "fellow_traveler_grave",
    repeatable: true,
    weight: 3,
    phase: GAME_PHASES.JOURNEY,
    // FIX: removed state.milesTraveled (no longer on state); use journeyProgress instead
    condition: (state) => state.journeyProgress > 2,
    title: "A Stone By the Road",
    description: () => {
      const names = ["E. Holbrook, Ohio", "T. Briggs, age 24", "Mary & James Coble", "Unknown"];
      const name = names[Math.floor(Math.random() * names.length)];
      return `A cairn of stones at the roadside.
      Scratched into a board: "${name}."
      No year. No explanation.
      The party goes quiet for a while after that.`;
    },
    choices: [
      {
        text: "Stop and say a few words",
        consequences: (state) => {
          adjustMorale(state, -5);
          const devout = getLivingMembers(state).find(m => m.personality === "devout");
          if (devout) {
            adjustMorale(state, 10, devout.id);
            adjustLoyalty(state, devout.id, 5);
          }
          logJournal(state, "We stopped at a grave on the trail. Said what we could.");
        }
      },
      {
        text: "Keep moving",
        consequences: (state) => {
          adjustMorale(state, -3);
          logJournal(state, "Another grave. We didn't stop.");
        }
      }
    ]
  },

  {
    id: "gold_strike_rumor",
    repeatable: false,
    weight: 1,
    phase: GAME_PHASES.JOURNEY,
    // FIX: was checking state.currentLocation === "fort_laramie" (old system)
    // Now triggers mid-journey by progress
    condition: (state) => state.journeyProgress >= 3 && state.journeyProgress <= 5,
    title: "Word From a Stranger",
    description: () =>
      `A gaunt man heading east — the wrong direction — stops by your fire.
      He says there's a creek two days north of Sacramento,
      barely on the maps, running thick with color.
      His eyes are hollow. He didn't stay long enough to work it, he says.
      You're not sure you believe him.`,
    choices: [
      {
        text: "Note it down — head there when you arrive",
        consequences: (state) => {
          state.rumors.push({
            id: "secret_creek",
            text: "A creek north of Sacramento, barely mapped. Rich with gold.",
            verified: false
          });
          logJournal(state, "A stranger told us about a creek. Filed it away.");
        }
      },
      {
        text: "Ask him more — press for details",
        consequences: (state) => {
          // FIX: was getBestSkill(state, "wits") — wits is a STAT not a skill
          // Now correctly uses getBestStat
          const wisest = getBestStat(state, "wits");
          const believable = wisest && wisest.stats.wits > 55;
          if (believable) {
            state.rumors.push({
              id: "secret_creek",
              text: "A creek north of Sacramento. The stranger's story held up.",
              verified: true
            });
            logJournal(state, "Pressed him on it. Story checked out. We'll find that creek.");
          } else {
            logJournal(state, "Couldn't tell if he was lying. Let him go.");
          }
        }
      },
      {
        text: "Ignore it — stick to the plan",
        consequences: (state) => {
          logJournal(state, "A man heading east told us something. We didn't listen.");
        }
      }
    ]
  },

  // ── Mining Events (phase 2 & 3) ─────────────────────────────────────────────

  {
    id: "claim_jumping_confrontation",
    repeatable: false,
    weight: 2,
    // FIX: was state.currentLocation — now state.currentRegion
    condition: (state) =>
      ["northern_mines", "southern_mines", "sierra_foothills"].includes(state.currentRegion) &&
      state.currentClaim !== null,
    title: "This Claim Is Ours",
    description: (state) => {
      const member = getLivingMembers(state)[0];
      return `Three men have moved onto your claim while the party slept.
      They're armed and don't look like they intend to leave.
      ${member?.name ?? "Someone"} grips a pickaxe. Nobody speaks first.`;
    },
    choices: [
      {
        text: "Stand your ground — drive them off",
        consequences: (state) => {
          const outcome = getCombatOutcome(state, "medium");
          if (outcome === "victory") {
            state.gold += 20;
            adjustMorale(state, 15);
            getLivingMembers(state).forEach(m =>
              awardSkillXP(state, m.id, "firearms", 15));
            logJournal(state, "Stood our ground. They backed down.");
          } else if (outcome === "pyrrhic") {
            adjustHealth(state, -25);
            state.gold += 10;
            logJournal(state, "Drove them off but not without a fight. Someone took a bad hit.");
          } else {
            adjustHealth(state, -40);
            adjustMorale(state, -25);
            state.gold = Math.max(0, state.gold - 15);
            logJournal(state, "We were outgunned. They took gold and left us bruised.");
          }
        }
      },
      {
        text: "Negotiate — offer them a share of the claim",
        available: (state) => getBestSkill(state, "haggling") !== null,
        consequences: (state) => {
          const haggler = getBestSkill(state, "haggling");
          const witsCheck = haggler.stats.wits > 50;
          if (witsCheck) {
            adjustMorale(state, 5);
            awardSkillXP(state, haggler.id, "haggling", 20);
            logJournal(state, `${haggler.name} brokered an uneasy peace. We keep the claim, they get a cut.`);
          } else {
            state.gold = Math.max(0, state.gold - 20);
            adjustMorale(state, -10);
            logJournal(state, "The negotiation went badly. We paid more than we should have.");
          }
        }
      },
      {
        text: "Abandon the claim and move on",
        consequences: (state) => {
          state.currentClaim = null;
          state.claimType = null;
          adjustMorale(state, -20);
          const first = getLivingMembers(state)[0];
          if (first) adjustLoyalty(state, first.id, -10);
          logJournal(state, "We walked away. The right call, maybe. Doesn't feel like it.");
          state.flags.abandonedClaim = true;
        }
      }
    ]
  },

  {
    id: "vigilante_recruitment",
    repeatable: false,
    weight: 1,
    // FIX: was state.currentLocation — now state.currentRegion
    condition: (state) =>
      state.currentRegion === "sacramento" && !state.flags.joinedVigilantes,
    title: "Law of the Camp",
    description: () =>
      `A broad-shouldered man with a deputy's badge — self-appointed — approaches your camp at dusk.
      A Chinese miner was found near a jumped claim.
      The crowd wants someone to blame.
      He wants your guns on his side tonight.`,
    choices: [
      {
        text: "Join the vigilantes",
        consequences: (state) => {
          state.cash += 30;
          adjustMorale(state, 10);
          state.reputation -= 20;
          state.flags.joinedVigilantes = true;
          logJournal(state, "We rode with the vigilantes. The money was good. The memory isn't.");
        }
      },
      {
        text: "Refuse and walk away",
        consequences: (state) => {
          state.reputation += 10;
          adjustMorale(state, -5);
          logJournal(state, "We stayed out of it. The night was loud anyway.");
        }
      },
      {
        text: "Intervene — defend the accused miner",
        available: (state) => getCombatStrength(state) > 50,
        consequences: (state) => {
          adjustHealth(state, -20);
          state.reputation += 25;
          adjustMorale(state, 20);
          state.flags.defendedChineseMiner = true;
          const chineseMember = getLivingMembers(state).find(m => m.ethnicity === "chinese");
          if (chineseMember) adjustLoyalty(state, chineseMember.id, 30);
          logJournal(state, "We stood between the mob and an innocent man. Took some blows for it.");
        }
      }
    ]
  },

  {
    id: "trading_post_scam",
    repeatable: true,
    weight: 2,
    // FIX: was state.currentLocation !== "independence_mo" — now phase-based
    condition: (state) =>
      state.phase !== GAME_PHASES.JOURNEY && state.cash > 20,
    title: "Finest Goods on the Trail",
    description: () =>
      `The merchant's smile is too wide.
      His flour is half chalk, his medicine water with a drop of laudanum.
      He knows you're desperate and prices accordingly.`,
    choices: [
      {
        text: "Buy anyway — you need the supplies",
        consequences: (state) => {
          const price = getBasePrice("food", state) * 1.5;
          state.cash -= Math.min(state.cash, price * 10);
          state.food += 8;
          logJournal(state, "Paid too much for too little. No choice.");
        }
      },
      {
        text: "Let your haggler negotiate",
        available: (state) => getMemberWithSkill(state, "haggling") !== null,
        consequences: (state) => {
          const haggler = getMemberWithSkill(state, "haggling");
          const discount = getHagglingDiscount(state);
          const price = getBasePrice("food", state) * (1 - discount);
          state.cash -= Math.min(state.cash, price * 10);
          state.food += 15;
          awardSkillXP(state, haggler.id, "haggling", 15);
          logJournal(state, `${haggler.name} haggled him down. Still expensive, but fair.`);
        }
      },
      {
        text: "Walk away — try your luck hunting",
        consequences: (state) => {
          const hunter = getMemberWithSkill(state, "hunting");
          if (hunter) {
            const amount = 10 + hunter.skills.hunting * 8;
            state.food += amount;
            awardSkillXP(state, hunter.id, "hunting", 10);
            logJournal(state, `${hunter.name} came back with enough to keep us going.`);
          } else {
            adjustHealth(state, -10);
            logJournal(state, "Nobody knows how to hunt. We went hungry.");
          }
        }
      }
    ]
  },

  {
    id: "foreign_miners_tax",
    repeatable: false,
    weight: 2,
    // FIX: was state.currentLocation — now state.currentRegion
    condition: (state) =>
      ["northern_mines", "southern_mines"].includes(state.currentRegion) &&
      getLivingMembers(state).some(m =>
        ["chinese", "mexican", "chilean"].includes(m.ethnicity)),
    title: "The Foreign Miners Tax",
    description: (state) => {
      const foreign = getLivingMembers(state).find(m =>
        ["chinese", "mexican", "chilean"].includes(m.ethnicity));
      return `A tax collector and two armed deputies arrive at your claim.
      $20 a month per foreign miner, they say.
      ${foreign.name} says nothing, just watches you.`;
    },
    choices: [
      {
        text: "Pay the tax",
        consequences: (state) => {
          const foreignCount = getLivingMembers(state).filter(m =>
            ["chinese", "mexican", "chilean"].includes(m.ethnicity)).length;
          state.cash -= 20 * foreignCount;
          adjustMorale(state, -10);
          logJournal(state, "Paid the tax. Legal theft with a badge.");
        }
      },
      {
        text: "Refuse and argue the law",
        consequences: (state) => {
          if (Math.random() > 0.6) {
            logJournal(state, "They backed down this time. Won't last.");
            state.flags.refusedTax = true;
          } else {
            state.cash -= 40;
            adjustHealth(state, -15);
            logJournal(state, "Refusal cost us more than compliance would have.");
          }
        }
      },
      {
        text: "Ask the foreign members to make themselves scarce",
        consequences: (state) => {
          getLivingMembers(state)
            .filter(m => ["chinese", "mexican", "chilean"].includes(m.ethnicity))
            .forEach(m => {
              adjustMorale(state, -25, m.id);
              adjustLoyalty(state, m.id, -30);
            });
          logJournal(state, "We asked them to hide. They did. Something broke that day.");
        }
      }
    ]
  },

  {
    id: "mining_accident",
    repeatable: true,
    weight: 2,
    condition: (state) =>
      state.claimType === "hard_rock" &&
      getLivingMembers(state).length > 0,
    title: "The Shaft Gives Way",
    description: () =>
      `A crack. Then a sound like thunder underground.
      By the time the dust cleared, two men were on the ground.
      Hard rock doesn't forgive mistakes.`,
    choices: [
      {
        text: "Pull them out and tend to their wounds",
        available: (state) => state.medicine >= 1,
        consequences: (state) => {
          state.medicine -= 1;
          adjustHealth(state, -20);
          adjustMorale(state, -10);
          logJournal(state, "Got them out. Cost us medicine and a week of good health.");
        }
      },
      {
        text: "Do what you can without medicine",
        consequences: (state) => {
          adjustHealth(state, -35);
          adjustMorale(state, -20);
          const living = getLivingMembers(state);
          if (living.length && living[0].health < 15) {
            killMember(state, living[0].id, "mining accident");
          }
          logJournal(state, "Did what we could. Not enough.");
        }
      }
    ]
  },

  {
    id: "rich_strike",
    repeatable: false,
    weight: 1,
    condition: (state) =>
      state.currentClaim !== null &&
      state.claimHealth > 30 &&
      !state.flags.hadRichStrike,
    title: "Color",
    description: () =>
      `The pan came up heavy.
      Not flakes — nuggets. Real ones.
      Nobody said anything for a long moment.
      Then everyone started talking at once.`,
    choices: [
      {
        text: "Work it hard while it lasts",
        consequences: (state) => {
          const bonus = Math.floor(Math.random() * 60) + 40;
          state.gold += bonus;
          state.claimHealth -= 20; // worked it hard
          adjustMorale(state, 25);
          state.flags.hadRichStrike = true;
          logJournal(state, `A rich strike. Pulled ${bonus} oz in a single week.`);
        }
      },
      {
        text: "Work it steady — don't blow the claim out",
        consequences: (state) => {
          const bonus = Math.floor(Math.random() * 30) + 20;
          state.gold += bonus;
          state.claimHealth -= 5;
          adjustMorale(state, 15);
          state.flags.hadRichStrike = true;
          logJournal(state, `Took it slow. Pulled ${bonus} oz, kept the claim intact.`);
        }
      },
      {
        text: "Tell no one and stake a second claim nearby",
        consequences: (state) => {
          const bonus = Math.floor(Math.random() * 40) + 20;
          state.gold += bonus;
          state.reputation -= 10; // word gets around
          state.flags.hadRichStrike = true;
          logJournal(state, "Kept quiet and staked more ground. Word got out eventually.");
        }
      }
    ]
  },

];
