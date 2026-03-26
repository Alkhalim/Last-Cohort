// ============================================================
// Last Cohort – Map Generator
// ============================================================

function generateMap(difficulty = 1, recentBosses = [], usedRunEventIds = new Set()) {
  const nodes = [];
  let idCounter = 0;
  const isFinalMarch = difficulty >= 8;
  const maxMidDepth = isFinalMarch ? 4 : 6; // Standard: 7 layers (0-6) + boss, Final: 5 (0-4) + rest + boss

  // Depth 0: start node (easy combat)
  const startNode = {
    id: idCounter++,
    depth: 0,
    type: 'combat',
    threat: isFinalMarch ? 2 : 1,
    children: [],
    parents: [],
    visited: false,
    x: 0.5,
    encounter: null,
  };
  nodes.push(startNode);

  // Middle depths: 2-3 nodes each
  for (let depth = 1; depth <= maxMidDepth; depth++) {
    let count;
    if (depth >= 4) {
      count = 3; // always 3 nodes from depth 4 onward
    } else if (depth >= 2) {
      count = 2 + (Math.random() < 0.6 ? 1 : 0); // 60% chance of 3
    } else {
      count = 2 + (Math.random() < 0.4 ? 1 : 0); // depth 1: 40% chance of 3
    }
    const depthNodes = [];
    for (let n = 0; n < count; n++) {
      const roll = Math.random();
      let type;
      if (isFinalMarch) {
        type = 'combat'; // Gauntlet: mostly combat, events assigned below
      } else if (roll < 0.5) {
        type = 'combat';
      } else if (roll < 0.8) {
        type = 'event';
      } else {
        type = 'rest';
      }

      // Threat scales with depth + difficulty
      let threat = 1;
      if (depth >= 5) {
        threat = 2 + (Math.random() < 0.4 ? 1 : 0);
      } else if (depth >= 3) {
        threat = 1 + (Math.random() < 0.5 ? 1 : 0);
      } else {
        threat = 1;
      }
      // Difficulty adds to threat (capped at 3 for display, but passed to encounter gen)
      threat = Math.min(3, threat + (difficulty - 1));

      const x = (n + 1) / (count + 1);
      const node = {
        id: idCounter++,
        depth: depth,
        type: type,
        threat: type === 'combat' ? threat : 0,
        children: [],
        parents: [],
        visited: false,
        x: x,
        encounter: null,
      };
      depthNodes.push(node);
      nodes.push(node);
    }

    // Connect previous depth to this depth
    const prevDepthNodes = nodes.filter(n => n.depth === depth - 1);

    // Ensure every previous node has at least one child
    for (const prev of prevDepthNodes) {
      if (prev.children.length === 0) {
        // Connect to nearest node in current depth
        const nearest = depthNodes.reduce((best, n) =>
          Math.abs(n.x - prev.x) < Math.abs(best.x - prev.x) ? n : best, depthNodes[0]);
        prev.children.push(nearest.id);
        nearest.parents.push(prev.id);
      }
    }

    // Ensure every current node has at least one parent
    for (const curr of depthNodes) {
      if (curr.parents.length === 0) {
        const nearest = prevDepthNodes.reduce((best, n) =>
          Math.abs(n.x - curr.x) < Math.abs(best.x - curr.x) ? n : best, prevDepthNodes[0]);
        nearest.children.push(curr.id);
        curr.parents.push(nearest.id);
      }
    }

    // Add some extra connections for variety (30% chance per pair)
    for (const prev of prevDepthNodes) {
      for (const curr of depthNodes) {
        if (!prev.children.includes(curr.id) && Math.random() < 0.3) {
          const dist = Math.abs(prev.x - curr.x);
          if (dist < 0.5) {
            prev.children.push(curr.id);
            curr.parents.push(prev.id);
          }
        }
      }
    }
  }

  // Final march: insert special rest before boss, convert 2 random mid-nodes to events
  let bossDepth;
  if (isFinalMarch) {
    // Convert 2 random non-depth-0 combat nodes to events
    const midCombats = nodes.filter(n => n.type === 'combat' && n.depth > 0);
    const shuffledMid = midCombats.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(2, shuffledMid.length); i++) {
      shuffledMid[i].type = 'event';
      shuffledMid[i].threat = 0;
      shuffledMid[i]._thresholdEvent = true;
    }

    // Add special rest node "The Last Stand" before boss
    const restDepth = maxMidDepth + 1;
    const thresholdRest = {
      id: idCounter++,
      depth: restDepth,
      type: 'rest',
      threat: 0,
      children: [],
      parents: [],
      visited: false,
      x: 0.5,
      encounter: null,
      _thresholdRest: true,
    };
    nodes.push(thresholdRest);
    const lastMid = nodes.filter(n => n.depth === maxMidDepth);
    for (const n of lastMid) {
      n.children.push(thresholdRest.id);
      thresholdRest.parents.push(n.id);
    }

    bossDepth = restDepth + 1;
  } else {
    bossDepth = maxMidDepth + 1;
  }

  const bossNode = {
    id: idCounter++,
    depth: bossDepth,
    type: 'boss',
    threat: 3,
    children: [],
    parents: [],
    visited: false,
    x: 0.5,
    encounter: null,
  };
  nodes.push(bossNode);

  // Connect to boss
  if (isFinalMarch) {
    const restNode = nodes.find(n => n._thresholdRest);
    restNode.children.push(bossNode.id);
    bossNode.parents.push(restNode.id);
  } else {
    const depth7 = nodes.filter(n => n.depth === maxMidDepth);
    for (const n of depth7) {
      n.children.push(bossNode.id);
      bossNode.parents.push(n.id);
    }
  }

  // Enforce: no more than 2 non-combat nodes in a row on ANY possible path.
  // A node is forced to combat if there EXISTS any parent chain of 2 consecutive
  // non-combat nodes leading to it (meaning this would be the 3rd).
  // Run multiple passes since forcing a node to combat can fix downstream nodes.
  const isCombat = (n) => n.type === 'combat' || n.type === 'boss';
  for (let pass = 0; pass < 3; pass++) {
    for (const node of nodes) {
      if (isCombat(node) || node.depth < 1) continue;
      // Check: does any parent form a chain of 2 non-combat leading here?
      for (const pid of node.parents) {
        const parent = nodes.find(n => n.id === pid);
        if (!parent || isCombat(parent)) continue;
        // Parent is non-combat. Check grandparents.
        for (const gpid of parent.parents) {
          const gp = nodes.find(n => n.id === gpid);
          if (!gp || isCombat(gp)) continue;
          // Grandparent is also non-combat → this would be 3rd. Force combat.
          node.type = 'combat';
          let threat = 1;
          if (node.depth >= 5) threat = 2 + (Math.random() < 0.4 ? 1 : 0);
          else if (node.depth >= 3) threat = 1 + (Math.random() < 0.5 ? 1 : 0);
          threat = Math.min(3, threat + (difficulty - 1));
          node.threat = threat;
          break;
        }
        if (isCombat(node)) break;
      }
    }
  }

  // Enforce: no 2 rest nodes in a row on any path. Convert second rest to event.
  for (const node of nodes) {
    if (node.type !== 'rest' || node.depth < 1) continue;
    for (const pid of node.parents) {
      const parent = nodes.find(n => n.id === pid);
      if (parent && parent.type === 'rest') {
        node.type = 'event';
        node.threat = 0;
        break;
      }
    }
  }

  // Enforce: sibling nodes (children of the same parent) should have varied types.
  // If all children of a parent are the same non-combat type, re-roll one to a different type.
  // Combat siblings are exempt (encounters still provide variety).
  for (const parent of nodes) {
    if (parent.children.length < 2) continue;
    const children = parent.children.map(cid => nodes.find(n => n.id === cid)).filter(Boolean);
    const nonCombat = children.filter(c => c.type !== 'combat' && c.type !== 'boss');
    if (nonCombat.length < 2) continue;
    // Check if all non-combat siblings are the same type
    const types = new Set(nonCombat.map(c => c.type));
    if (types.size === 1) {
      // Pick one to re-roll (not the first)
      const toChange = nonCombat[1];
      const currentType = toChange.type;
      const alternatives = ['combat', 'event', 'rest'].filter(t => t !== currentType);
      toChange.type = alternatives[Math.floor(Math.random() * alternatives.length)];
      if (toChange.type === 'combat') {
        let threat = 1;
        if (toChange.depth >= 5) threat = 2 + (Math.random() < 0.4 ? 1 : 0);
        else if (toChange.depth >= 3) threat = 1 + (Math.random() < 0.5 ? 1 : 0);
        toChange.threat = Math.min(3, threat + (difficulty - 1));
      } else {
        toChange.threat = 0;
      }
    }
  }

  // Enforce: no 4 combat nodes in a row on any path.
  // Check each combat node: if ALL paths from root to it pass through 3+ consecutive combats,
  // convert it to an event.
  for (const node of nodes) {
    if (node.type !== 'combat' || node.depth < 3) continue;
    // Check if ANY parent chain has 3 consecutive combats leading to this (making it the 4th)
    let allPathsLong = true;
    for (const pid of node.parents) {
      const p = nodes.find(n => n.id === pid);
      if (!p || p.type !== 'combat') { allPathsLong = false; break; }
      let streak = true;
      for (const gpid of p.parents) {
        const gp = nodes.find(n => n.id === gpid);
        if (!gp || gp.type !== 'combat') { streak = false; break; }
        for (const ggpid of gp.parents) {
          const ggp = nodes.find(n => n.id === ggpid);
          if (!ggp || ggp.type !== 'combat') { streak = false; break; }
        }
        if (!streak) break;
      }
      if (!streak) { allPathsLong = false; break; }
    }
    if (allPathsLong) {
      node.type = Math.random() < 0.6 ? 'event' : 'rest';
      node.threat = 0;
    }
  }

  // Generate encounters for combat nodes (filtered by difficulty)
  const usedEventIds = new Set();
  let merchantCount = 0;
  const MAX_MERCHANTS_PER_MARCH = 3;
  for (const node of nodes) {
    if (node.type === 'combat') {
      // First combat node (depth 0): use region-specific intro encounter
      const introEncounters = typeof RAW_ENCOUNTERS !== 'undefined' && RAW_ENCOUNTERS.marchIntroEncounters;
      if (node.depth === 0 && introEncounters && introEncounters[String(difficulty)]) {
        const intros = introEncounters[String(difficulty)];
        if (Array.isArray(intros)) {
          const pick = intros[Math.floor(Math.random() * intros.length)];
          node.encounter = pick;
          node._introEncounterName = pick.name; // track to avoid repeat in next encounter
        } else {
          node.encounter = intros;
          node._introEncounterName = intros.name;
        }
      } else if (node.depth === 1 && typeof RAW_ENCOUNTERS !== 'undefined' && RAW_ENCOUNTERS.marchSecondEncounters && RAW_ENCOUNTERS.marchSecondEncounters[String(difficulty)]) {
        // Second combat node: use curated second encounter, different from intro
        const seconds = RAW_ENCOUNTERS.marchSecondEncounters[String(difficulty)];
        const usedIntroName = nodes.find(n => n._introEncounterName)?._introEncounterName;
        let pool = Array.isArray(seconds) ? seconds : [seconds];
        if (usedIntroName) {
          pool = pool.filter(e => e.name !== usedIntroName);
        }
        if (pool.length > 0) {
          node.encounter = pool[Math.floor(Math.random() * pool.length)];
        } else {
          node.encounter = generateEncounterByThreat(node.threat, difficulty);
        }
      } else {
        node.encounter = generateEncounterByThreat(node.threat, difficulty);
      }
      // Ambush: at difficulty 3+, 30% chance for combat nodes to become ambushes (not on intro)
      if (difficulty >= 3 && node.depth > 0 && Math.random() < 0.3) {
        node.encounter = { ...node.encounter, isAmbush: true };
      }
    } else if (node.type === 'boss') {
      // Story bosses are forced at specific marches
      const storyBosses = { 4: 'Corpse of Arminius', 6: 'Corpse of Varus', 8: 'Spirits of Arminius & Varus' };
      const forcedBossName = storyBosses[difficulty];
      if (forcedBossName) {
        const forcedBoss = BOSS_ENCOUNTERS.find(b => b.name === forcedBossName);
        if (forcedBoss) {
          node.encounter = forcedBoss;
        }
      }
      if (!node.encounter) {
        const eligibleBosses = BOSS_ENCOUNTERS.filter(b => {
          if (b.minDifficulty && b.minDifficulty > difficulty) return false;
          // Exclude story bosses from random pool
          if (Object.values(storyBosses).includes(b.name)) return false;
          return true;
        });
        // Avoid repeating bosses until all eligible have been fought
        let unseenBosses = eligibleBosses.filter(b => !recentBosses.includes(b.name));
        if (unseenBosses.length === 0) {
          recentBosses.length = 0;
          unseenBosses = eligibleBosses;
        }
        const chosenBoss = unseenBosses[Math.floor(Math.random() * unseenBosses.length)];
        recentBosses.push(chosenBoss.name);
        node.encounter = chosenBoss;
      }
    } else if (node.type === 'event') {
      // Filter by difficulty, then weighted random — no regular event repeats per march
      const repeatable = ['skill_upgrade', 'item_upgrade', 'item_trade']; // these can repeat
      const eligible = EVENT_DATA.filter(e => {
        if (e.minDifficulty && e.minDifficulty > difficulty) return false;
        if (e.maxDifficulty && e.maxDifficulty < difficulty) return false;
        if (e.oncePerRun && usedRunEventIds.has(e.id)) return false;
        if (e.type === 'item_trade' && merchantCount >= MAX_MERCHANTS_PER_MARCH) return false;
        return true;
      });
      // Remove already-used non-repeatable events
      const available = eligible.filter(e => {
        if (repeatable.includes(e.type)) return true;
        return !usedEventIds.has(e.id);
      });
      const source = available.length > 0 ? available : eligible;
      // Build weighted pool
      const pool = [];
      source.forEach(e => {
        const baseWeight = e.weight || 1;
        const diffBonus = (e.minDifficulty && difficulty >= e.minDifficulty) ? Math.floor((difficulty - e.minDifficulty) / 1) : 0;
        const totalWeight = baseWeight + diffBonus;
        for (let w = 0; w < totalWeight; w++) pool.push(e);
      });
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      node.encounter = chosen;
      if (chosen && !repeatable.includes(chosen.type)) usedEventIds.add(chosen.id);
      if (chosen && chosen.oncePerRun) usedRunEventIds.add(chosen.id);
      if (chosen && chosen.type === 'item_trade') merchantCount++;
    }
  }

  // Enforce merchant spacing: no two merchants within 2 nodes of each other on any path
  // and at least 1 combat node must separate them
  const isMerchant = (n) => n.type === 'event' && n.encounter && n.encounter.type === 'item_trade';
  const repeatable = ['skill_upgrade', 'item_upgrade', 'item_trade'];
  const nonMerchantEvents = EVENT_DATA.filter(e => {
    if (e.type === 'item_trade') return false;
    if (e.minDifficulty && e.minDifficulty > difficulty) return false;
    if (e.maxDifficulty && e.maxDifficulty < difficulty) return false;
    if (!repeatable.includes(e.type) && usedEventIds.has(e.id)) return false;
    return true;
  });

  for (const node of nodes) {
    if (!isMerchant(node)) continue;
    // Check parents (depth-1) and grandparents (depth-2) for merchants
    for (const pid of node.parents) {
      const parent = nodes.find(n => n.id === pid);
      if (!parent) continue;
      // Direct parent is merchant — too close
      if (isMerchant(parent)) {
        // Re-roll this node to a non-merchant event
        if (nonMerchantEvents.length > 0) {
          const pick = nonMerchantEvents[Math.floor(Math.random() * nonMerchantEvents.length)];
          node.encounter = pick;
          if (pick && !repeatable.includes(pick.type)) usedEventIds.add(pick.id);
        }
        break;
      }
      // Check grandparents — merchant 2 nodes away with no combat in between
      for (const gpid of parent.parents) {
        const gp = nodes.find(n => n.id === gpid);
        if (gp && isMerchant(gp) && parent.type !== 'combat') {
          if (nonMerchantEvents.length > 0) {
            const pick = nonMerchantEvents[Math.floor(Math.random() * nonMerchantEvents.length)];
            node.encounter = pick;
            if (pick && !repeatable.includes(pick.type)) usedEventIds.add(pick.id);
          }
          break;
        }
      }
      if (!isMerchant(node)) break;
    }
  }

  return nodes;
}

// Generate a hidden march map (e.g. Dragon's Lair)
// Layout: start combat → two parallel paths (2 fights + 3 events each) → Lair Feast rest → boss
function generateHiddenMarch(options = {}) {
  const enemyPool = options.enemies || [];
  const bossData = options.boss || null;
  const hiddenEvents = options.events || [];
  const nodes = [];
  let idCounter = 0;

  const makeNode = (depth, type, x, threat) => {
    const node = { id: idCounter++, depth, type, threat: type === 'combat' ? (threat || 2) : 0, children: [], parents: [], visited: false, x, encounter: null };
    nodes.push(node);
    return node;
  };
  const link = (parent, child) => { parent.children.push(child.id); child.parents.push(parent.id); };

  // Depth 0: Start combat (single)
  const start = makeNode(0, 'combat', 0.5, 2);

  // Depths 1-5: Two parallel paths, each path = 2 combats + 3 events (shuffled order)
  const pathTypes = ['combat', 'combat', 'event', 'event', 'event'];
  const leftTypes = [...pathTypes].sort(() => Math.random() - 0.5);
  const rightTypes = [...pathTypes].sort(() => Math.random() - 0.5);

  let leftPrev = start;
  let rightPrev = start;
  for (let i = 0; i < 5; i++) {
    const depth = i + 1;
    const leftNode = makeNode(depth, leftTypes[i], 0.3, depth >= 4 ? 3 : 2);
    const rightNode = makeNode(depth, rightTypes[i], 0.7, depth >= 4 ? 3 : 2);
    link(leftPrev, leftNode);
    link(rightPrev, rightNode);
    leftPrev = leftNode;
    rightPrev = rightNode;
  }

  // Depth 6: Lair Feast (single rest node, both paths converge)
  const feast = makeNode(6, 'rest', 0.5, 0);
  feast._lairFeast = true;
  link(leftPrev, feast);
  link(rightPrev, feast);

  // Depth 7: Boss
  const boss = makeNode(7, 'boss', 0.5, 3);
  link(feast, boss);

  // Shuffle and assign unique events to event nodes (3 per path = 6 total, we have 4 events so some repeat)
  const shuffledEvents = [...hiddenEvents].sort(() => Math.random() - 0.5);
  let eventIdx = 0;

  // Combat encounter variety
  const combatIntros = [
    { name: 'Tunnel Ambush', intro: 'Shapes lunge from the dark. The lair is guarded.' },
    { name: 'Lair Guardians', intro: 'The tunnel twists deeper. More creatures block the way.' },
    { name: 'Bone Pile Awakening', intro: 'A pile of bones rattles to life. The dead defend this place.' },
    { name: 'The Deep Watch', intro: 'Eyes gleam in the torchlight. Something has been waiting.' },
  ];

  // Assign encounters
  for (const node of nodes) {
    if (node.type === 'combat') {
      const count = node.depth === 0 ? 2 : 3;
      const enemies = [];
      for (let i = 0; i < count; i++) {
        enemies.push(enemyPool[Math.floor(Math.random() * enemyPool.length)]);
      }
      const ci = combatIntros[Math.floor(Math.random() * combatIntros.length)];
      node.encounter = { name: ci.name, enemies: enemies, intro: ci.intro };
    } else if (node.type === 'boss' && bossData) {
      node.encounter = { name: bossData.name, enemies: bossData.enemies, intro: bossData.intro, loot: bossData.loot || [], lootCount: bossData.lootCount };
    } else if (node.type === 'event') {
      if (eventIdx < shuffledEvents.length) {
        node.encounter = shuffledEvents[eventIdx++];
      } else {
        // Recycle events if we need more than available
        eventIdx = 0;
        node.encounter = shuffledEvents[eventIdx++];
      }
    }
    // Rest nodes (Lair Feast) don't need encounter data — handled by rest screen
  }

  return nodes;
}

function getReachableNodes(nodes, currentId) {
  const current = nodes.find(n => n.id === currentId);
  if (!current) return [];
  return current.children.map(cid => nodes.find(n => n.id === cid)).filter(Boolean);
}

function getNodeById(nodes, id) {
  return nodes.find(n => n.id === id) || null;
}
