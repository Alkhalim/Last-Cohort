// ============================================================
// Last Cohort – Map Generator
// ============================================================

function generateMap(difficulty = 1) {
  const nodes = [];
  let idCounter = 0;

  // Depth 0: start node (easy combat)
  const startNode = {
    id: idCounter++,
    depth: 0,
    type: 'combat',
    threat: 1,
    children: [],
    parents: [],
    visited: false,
    x: 0.5,
    encounter: null,
  };
  nodes.push(startNode);

  // Depths 1-7: 2-3 nodes each
  for (let depth = 1; depth <= 7; depth++) {
    const count = 2 + (Math.random() < 0.4 ? 1 : 0); // 2 or 3 nodes
    const depthNodes = [];
    for (let n = 0; n < count; n++) {
      const roll = Math.random();
      let type;
      if (roll < 0.5) {
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

  // Depth 8: boss node
  const bossNode = {
    id: idCounter++,
    depth: 8,
    type: 'boss',
    threat: 3,
    children: [],
    parents: [],
    visited: false,
    x: 0.5,
    encounter: null,
  };
  nodes.push(bossNode);

  // Connect all depth 7 nodes to boss
  const depth7 = nodes.filter(n => n.depth === 7);
  for (const n of depth7) {
    n.children.push(bossNode.id);
    bossNode.parents.push(n.id);
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

  // Generate encounters for combat nodes (filtered by difficulty)
  const usedEventIds = new Set();
  for (const node of nodes) {
    if (node.type === 'combat') {
      node.encounter = generateEncounterByThreat(node.threat, difficulty);
    } else if (node.type === 'boss') {
      const eligibleBosses = BOSS_ENCOUNTERS.filter(b => !b.minDifficulty || b.minDifficulty <= difficulty);
      node.encounter = eligibleBosses[Math.floor(Math.random() * eligibleBosses.length)];
    } else if (node.type === 'event') {
      // Filter by difficulty, then weighted random — no regular event repeats per march
      const repeatable = ['skill_upgrade', 'item_upgrade']; // these can repeat
      const eligible = EVENT_DATA.filter(e => !e.minDifficulty || e.minDifficulty <= difficulty);
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
    }
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
