/* PokéSurvivor mod panel v8 — Chrome Console or DevTools Snippet.
 * Normal page connection: Console > queryObjects(Object) > right-click the
 * resulting Array > Store as global variable. Run this file, or press
 * Connect saved objects in its Spawns tab. No reload or /dev.html required.
 * On first injection: resume and fire a projectile to capture your player.
 * Damage affects melee and ranged attacks. Settings are relative to normal
 * run stats; upgrades continue to work. No network requests or saved settings.
 * New run: use Capture player again. Remove panel restores its modifiers.
 */
(() => {
  'use strict';
  if (location.protocol !== 'https:' ||
      !['pokesurvivor.com', 'www.pokesurvivor.com'].includes(location.hostname)) {
    throw new Error('Run this snippet on the official pokesurvivor.com page.');
  }
  if (!document.body) throw new Error('Wait for the game page to load.');

function createBackgroundController(win, doc) {
  let active = false, base = null, nextId = 0;
  const jobs = new Map();
  const visibleHidden = () => false;
  const visibleState = () => 'visible';
  function descriptorInChain(object, key) {
    for (let at = object; at; at = Object.getPrototypeOf(at)) {
      const descriptor = Object.getOwnPropertyDescriptor(at, key);
      if (descriptor) return descriptor;
    }
    return undefined;
  }
  function restore(object, key, descriptor) {
    if (descriptor) Object.defineProperty(object, key, descriptor);
    else delete object[key];
  }
  function realHidden() {
    return base.hidden.get ? !!base.hidden.get.call(doc) : !!base.hidden.value;
  }
  function releaseCancel() {
    if (!active && jobs.size === 0 && win.cancelAnimationFrame === cancel) {
      restore(win, 'cancelAnimationFrame', base.cancelDescriptor);
    }
  }
  function unschedule(job) {
    job.generation++;
    if (job.kind === 'timer') base.clearTimeout.call(win, job.handle);
    else if (job.kind === 'frame') base.cancel.call(win, job.handle);
    job.kind = null;
  }
  function schedule(job) {
    unschedule(job);
    const generation = job.generation;
    const finish = timestamp => {
      if (!jobs.has(job.id) || job.generation !== generation) return;
      jobs.delete(job.id);
      try { job.callback(timestamp); } finally { releaseCancel(); }
    };
    if (active && realHidden()) {
      job.kind = 'timer';
      job.handle = base.setTimeout.call(win, () => finish(win.performance.now()), 33);
    } else {
      job.kind = 'frame';
      job.handle = base.raf.call(win, finish);
    }
  }
  function request(callback) {
    if (typeof callback !== 'function') throw new TypeError('Expected an animation callback.');
    const job = { id: --nextId, callback, generation: 0, kind: null };
    jobs.set(job.id, job); schedule(job); return job.id;
  }
  function cancel(id) {
    const job = jobs.get(Number(id));
    if (job) { unschedule(job); jobs.delete(job.id); releaseCancel(); }
    else base.cancel.call(win, id);
  }
  function migrate() { for (const job of jobs.values()) schedule(job); }
  function disable() {
    if (!active) return;
    active = false;
    doc.removeEventListener('visibilitychange', migrate, true);
    if (Object.getOwnPropertyDescriptor(doc, 'hidden')?.get === visibleHidden) restore(doc, 'hidden', base.ownHidden);
    if (Object.getOwnPropertyDescriptor(doc, 'visibilityState')?.get === visibleState) restore(doc, 'visibilityState', base.ownVisibility);
    if (win.requestAnimationFrame === request) restore(win, 'requestAnimationFrame', base.rafDescriptor);
    // Deliver already requested callbacks normally; cancellation remains valid
    // until these callbacks drain, then its original descriptor is restored.
    migrate(); releaseCancel();
  }
  function enable() {
    if (active) return;
    if (!base) {
      const hidden = descriptorInChain(doc, 'hidden');
      if (!hidden) throw new Error('Page visibility is unavailable.');
      base = {
        hidden, ownHidden: Object.getOwnPropertyDescriptor(doc, 'hidden'),
        ownVisibility: Object.getOwnPropertyDescriptor(doc, 'visibilityState'),
        rafDescriptor: Object.getOwnPropertyDescriptor(win, 'requestAnimationFrame'),
        cancelDescriptor: Object.getOwnPropertyDescriptor(win, 'cancelAnimationFrame'),
        raf: win.requestAnimationFrame, cancel: win.cancelAnimationFrame,
        setTimeout: win.setTimeout, clearTimeout: win.clearTimeout
      };
      if (typeof base.raf !== 'function' || typeof base.cancel !== 'function') {
        throw new Error('Animation scheduling is unavailable.');
      }
    }
    try {
      Object.defineProperty(doc, 'hidden', { configurable: true, get: visibleHidden });
      Object.defineProperty(doc, 'visibilityState', { configurable: true, get: visibleState });
      Object.defineProperty(win, 'requestAnimationFrame', { ...base.rafDescriptor, configurable: true, writable: true, value: request });
      Object.defineProperty(win, 'cancelAnimationFrame', { ...base.cancelDescriptor, configurable: true, writable: true, value: cancel });
      active = true;
      doc.addEventListener('visibilitychange', migrate, true);
      migrate();
    } catch (error) {
      active = true; disable(); throw error;
    }
  }
  return Object.freeze({ enable, disable, get enabled() { return active; } });
}

function normalizeRewardName(value) {
  return String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
function classifyReward(title, tag, evolution) {
  if (evolution) return 'evo';
  const normalizedTag = normalizeRewardName(tag);
  if (/\b(new|nuevo)\b/.test(normalizedTag)) return 'new';
  if (/\b(lv|nv)\.?\s*\d/.test(normalizedTag)) return 'up';
  const aliases = {
    hp: ['vigor'], damage: ['potencia', 'power'], movement: ['carrera', 'sprint'],
    cooldown: ['reflejos', 'reflexes'], defense: ['coraza', 'armor'],
    regen: ['sintesis', 'synthesis'], pickup: ['iman', 'magnet'],
    xp: ['aprendizaje', 'learning'], heal: ['baya zidra', 'sitrus berry']
  };
  const name = normalizeRewardName(title);
  return Object.keys(aliases).find(key => aliases[key].includes(name)) || 'unknown';
}
function chooseReward(cards, policy, build = {}) {
  const names = String(policy.names || '').slice(0, 200).split(',').slice(0, 10)
    .map(normalizeRewardName).filter(Boolean);
  for (const name of names) {
    const match = cards.find(card => {
      const title = normalizeRewardName(card.title);
      return title === name || title.startsWith(name + ' →');
    });
    if (match) return match;
  }
  if (policy.smart) {
    const heal = build.hpFraction <= 0.35 && cards.find(card => card.category === 'heal');
    if (heal) return heal;
    const evolution = cards.find(card => card.category === 'evo');
    if (evolution) return evolution;
    for (const need of build.needs || []) {
      const card = cards.find(card => card.category === need);
      if (card) return card;
    }
  }
  for (const category of [policy.first, policy.second]) {
    if (category && category !== 'none') {
      const match = cards.find(card => card.category === category);
      if (match) return match;
    }
  }
  return policy.fallback === 'first' ? cards[0] || null : null;
}

function getBuildRewardContext(runtime) {
  const player = runtime?.Game?.player;
  if (!player || player.dead || runtime.Coop?.active) return {};
  const categories = { hp: 'hp', atk: 'damage', spd: 'movement', cd: 'cooldown', def: 'defense', rgn: 'regen', mag: 'pickup', xp: 'xp' };
  const needs = [];
  for (const move of player.moves.slice(0, 32)) {
    const info = runtime.Moves.evoInfo(move, player.statsTaken);
    const category = info && !info.ready && categories[info.needs];
    if (category && !needs.includes(category)) needs.push(category);
  }
  return { hpFraction: player.maxHp > 0 ? player.hp / player.maxHp : 1, needs };
}

function selectRareTarget(targets, mode) {
  const filtered = targets.filter(t => mode === 'auto' || t.kind === mode || (mode === 'boss' && t.boss));
  const priority = { shiny: 0, rift: 1, boss: 2 };
  return filtered.slice().sort((a, b) => (mode === 'auto' ? priority[a.kind] - priority[b.kind] : 0) || a.distance - b.distance)[0] || null;
}

function createChestLocator(win, getPlayer, onUpdate) {
  const own = (value, key) => value && typeof value === 'object'
    ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
  const mapPrototype = win.Map.prototype;
  let enabled = false, worldMap = null, watchStop = null, interval = null;
  let target = null, targetChunk = null, targetKey = null, nextScan = 0, count = 0;
  let waiting = false;
  function validChunk(value, key) {
    const cx = own(value, 'cx'), cy = own(value, 'cy'), terrain = own(value, 'terr');
    return Number.isInteger(cx) && Number.isInteger(cy) && key === `${cx},${cy}` &&
      terrain instanceof win.Uint8Array && terrain.length === 256 &&
      Array.isArray(own(value, 'props')) && own(value, 'propAt') instanceof win.Map &&
      Array.isArray(own(value, 'liquids'));
  }
  function validChest(value) {
    return own(value, 'type') === 'bigchest' && own(value, 'hp') > 0 &&
      Number.isFinite(own(value, 'x')) && Number.isFinite(own(value, 'y'));
  }
  function stopWatch() { if (watchStop) watchStop(); }
  function findMap() {
    stopWatch();
    const descriptor = Object.getOwnPropertyDescriptor(mapPrototype, 'set');
    if (!descriptor?.configurable || typeof descriptor.value !== 'function') {
      waiting = false; onUpdate({ state: 'error', title: 'World capture unavailable', detail: 'Reload the page and try again.' }); return false;
    }
    const original = descriptor.value;
    let watching = true, timeout;
    function stop() {
      watching = false; waiting = false; win.clearTimeout(timeout);
      if (mapPrototype.set === watchSet) Object.defineProperty(mapPrototype, 'set', descriptor);
      if (watchStop === stop) watchStop = null;
    }
    function watchSet(key, value) {
      const result = Reflect.apply(original, this, [key, value]);
      if (watching) {
        try {
          if (this instanceof win.Map && validChunk(value, key)) {
            worldMap = this; stop(); nextScan = 0;
          }
        } catch (error) {
          stop(); onUpdate({ state: 'error', title: 'World capture stopped', detail: error.message });
        }
      }
      return result;
    }
    waiting = true; watchStop = stop;
    Object.defineProperty(mapPrototype, 'set', { ...descriptor, value: watchSet });
    timeout = win.setTimeout(() => {
      stop(); onUpdate({ state: 'idle', title: 'Move into new terrain', detail: 'No world captured yet. Explore farther, then press Retry scan.' });
    }, 60000);
  }
  function targetStillLoaded() {
    return target && worldMap?.get(targetKey) === targetChunk &&
      own(targetChunk, 'props')?.includes(target) && validChest(target);
  }
  function scan(player) {
    target = targetChunk = targetKey = null; count = 0;
    let best = Infinity, chunks = 0;
    for (const [key, chunk] of worldMap.entries()) {
      if (++chunks > 512) break;
      if (!validChunk(chunk, key)) continue;
      for (const prop of own(chunk, 'props')) {
        if (!validChest(prop)) continue;
        count++;
        const distance = Math.hypot(prop.x - player.x, prop.y - player.y);
        if (distance < best) { best = distance; target = prop; targetChunk = chunk; targetKey = key; }
      }
    }
  }
  function tick() {
    if (!enabled) return;
    try {
      const player = getPlayer();
      if (!player || !Number.isFinite(own(player, 'x')) || !Number.isFinite(own(player, 'y'))) {
        onUpdate({ state: 'waiting', title: 'Capture your player first', detail: 'Fire one projectile, then move into new terrain.' }); return;
      }
      if (own(player, 'dead') === true) {
        onUpdate({ state: 'idle', title: 'Run ended', detail: 'Start a new run and capture your player again.' }); return;
      }
      if (!worldMap) {
        onUpdate({ state: 'waiting', title: 'Waiting for loaded map', detail: waiting ? 'Move into new terrain to capture map data.' : 'Explore farther, then press Retry scan.' }); return;
      }
      const now = win.performance.now();
      if (now >= nextScan || (target && !targetStillLoaded())) { scan(player); nextScan = now + 1000; }
      if (!target) {
        onUpdate({ state: 'idle', title: 'No large chest loaded', detail: 'Explore farther. Only the currently loaded map is scanned.', count: 0 }); return;
      }
      const dx = target.x - player.x, dy = target.y - player.y;
      const distance = Math.hypot(dx, dy), angle = Math.atan2(dx, -dy);
      const direction = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][(Math.round(angle / (Math.PI / 4)) + 8) % 8];
      const near = distance < Math.max(46, (own(target, 'r') || 14) + (own(player, 'r') || 0) + 24);
      const progress = Math.max(0, Math.min(1, (own(target, 'open') || 0) / 3.5));
      onUpdate({ state: 'found', title: near ? 'Large chest nearby' : 'Large ticket chest',
        detail: near ? `Stay beside it to unlock · ${Math.round(progress * 100)}%` : `${Math.ceil(distance / 32)} tiles · ${direction} · straight-line direction`,
        distance, angle, direction, progress, near, count,
        target: { x: target.x, y: target.y } });
    } catch (error) {
      onUpdate({ state: 'error', title: 'Locator paused', detail: error.message });
      disable();
    }
  }
  function enable() {
    if (enabled) return;
    enabled = true; nextScan = 0;
    if (!worldMap && findMap() === false) { enabled = false; return; }
    interval = win.setInterval(tick, 100); tick();
  }
  function disable() {
    enabled = false; stopWatch(); win.clearInterval(interval); interval = null;
    target = targetChunk = targetKey = null;
  }
  function refresh() {
    if (!enabled) enable();
    else if (!worldMap && findMap() === false) { disable(); return; }
    nextScan = 0; tick();
  }
  return Object.freeze({ enable, disable, refresh,
    prepareCapture: stopWatch,
    useMap(map) { if (!(map instanceof win.Map)) return false; stopWatch(); worldMap = map; nextScan = 0; if (enabled) tick(); return true; },
    get enabled() { return enabled; } });
}

function chooseItem(cur, next, preferred) {
  const currentRank = preferred.indexOf(cur), nextRank = preferred.indexOf(next);
  return nextRank >= 0 && (currentRank < 0 || nextRank < currentRank) ? next : cur;
}

function createItemAutomation(getRuntime, onUpdate) {
  let enabled = false, preferred = [], attached = null, descriptor = null, wrapper = null, message = '';
  function info() { return { enabled, preferred: [...preferred], message }; }
  function notify(text) { message = text; onUpdate(info()); }
  function release() {
    if (attached && attached.RunUI.showItemChoice === wrapper) Object.defineProperty(attached.RunUI, 'showItemChoice', descriptor);
    attached = descriptor = wrapper = null;
  }
  function reset() { enabled = false; release(); notify('Off · choose items manually.'); }
  function set(ids, active = enabled) {
    const r = getRuntime();
    if (!Array.isArray(ids) || ids.length > 3 || ids.some(id => typeof id !== 'string' || !Object.hasOwn(r?.Items?.BY || {}, id))) throw new Error('Choose valid items from the list.');
    if (active && (!ids.length || !r?.Game.player || r.Game.player.dead || r.Coop?.active)) throw new Error('Choose a preferred item and start a living solo run first.');
    const next = [...new Set(ids)];
    if (active && (!attached || attached !== r)) {
      const d = Object.getOwnPropertyDescriptor(r.RunUI || {}, 'showItemChoice');
      if (!d?.writable || typeof d.value !== 'function') throw new Error('Item selection is unavailable in this build.');
      release(); descriptor = d; attached = r;
      const original = d.value;
      wrapper = function (cur, incoming, callback, ...rest) {
        const p = r.Game.player;
        if (!enabled || r.Coop?.active || !p || p.dead || !['choice', 'playing', 'held'].includes(r.Game.state) ||
            typeof callback !== 'function' || !Object.hasOwn(r.Items.BY, cur) || !Object.hasOwn(r.Items.BY, incoming)) {
          return Reflect.apply(original, this, [cur, incoming, callback, ...rest]);
        }
        const chosen = chooseItem(cur, incoming, preferred);
        r.Game.debugTime?.(r.Game.st.time);
        // Complete the game's callback: it equips the item, resumes the run,
        // records progress and drains queued offers. No screen is constructed.
        callback(chosen);
        notify(`Auto item: ${chosen === cur ? 'kept' : 'equipped'} ${r.Items.BY[chosen].name}.`);
      };
      Object.defineProperty(r.RunUI, 'showItemChoice', { ...d, value: wrapper });
    }
    preferred = next; enabled = !!active;
    if (!enabled) release();
    notify(enabled ? 'On · preferred items win; otherwise keep your current item. Future item screens are skipped.' : 'Off · choose items manually.');
    return info();
  }
  return Object.freeze({ set, reset, info });
}

function validWorldChunk(chunk, key) {
  return chunk && Number.isInteger(chunk.cx) && Number.isInteger(chunk.cy) && key === `${chunk.cx},${chunk.cy}` &&
    chunk.terr instanceof Uint8Array && chunk.terr.length === 256 && Array.isArray(chunk.props) &&
    chunk.propAt instanceof Map && Array.isArray(chunk.liquids);
}

function captureWorldAccess(r) {
  const world = r.World, player = r.Game.player;
  if (typeof world.kindAt !== 'function' || !Number.isFinite(world.CW) || world.CW <= 0) throw new Error('World data access is unavailable in this build.');
  const mapDescriptor = Object.getOwnPropertyDescriptor(Map.prototype, 'set');
  const setDescriptor = Object.getOwnPropertyDescriptor(Set.prototype, 'has');
  if (!mapDescriptor?.writable || !setDescriptor?.writable) throw new Error('World capture is unavailable.');
  let chunks = null;
  const candidates = new Set();
  function mapSet(key, value) {
    const result = Reflect.apply(mapDescriptor.value, this, [key, value]);
    if (validWorldChunk(value, key)) chunks = this;
    return result;
  }
  function setHas(key) {
    // World.placeProps checks its broken-tile Set before placing each tile.
    if (typeof key === 'string' && /^-?\d+,-?\d+$/.test(key)) candidates.add(this);
    return Reflect.apply(setDescriptor.value, this, [key]);
  }
  try {
    Object.defineProperty(Map.prototype, 'set', { ...mapDescriptor, value: mapSet });
    Object.defineProperty(Set.prototype, 'has', { ...setDescriptor, value: setHas });
    // A bounded synchronous read loads one fresh chunk. The hooks never span
    // a frame, await or timer, and all original collection methods are restored.
    for (let i = 2; i <= 10 && (!chunks || candidates.size !== 1); i++) {
      world.kindAt(player.x + world.CW * i, player.y + world.CW * i * 0.7);
    }
  } finally {
    if (Map.prototype.set === mapSet) Object.defineProperty(Map.prototype, 'set', mapDescriptor);
    if (Set.prototype.has === setHas) Object.defineProperty(Set.prototype, 'has', setDescriptor);
  }
  if (!chunks || candidates.size !== 1) throw new Error('Could not identify current map data safely. Move into new terrain and retry.');
  return { world, player, chunks, broken: [...candidates][0] };
}

function findGameRuntime(input) {
  const ownValue = (o, k) => o && (typeof o === 'object' || typeof o === 'function')
    ? Object.getOwnPropertyDescriptor(o, k)?.value : undefined;
  const valid = o => {
    try {
      return typeof ownValue(o, 'Spawner')?.burst === 'function' &&
        typeof ownValue(o, 'EnemyMgr')?.add === 'function' &&
        typeof ownValue(o, 'Game')?.startRun === 'function' &&
        typeof ownValue(o, 'World')?.isFree === 'function' && !!ownValue(o, 'DEX_BY');
    } catch { return false; }
  };
  if (valid(input)) return input;
  if (Array.isArray(input)) {
    for (let i = 0, n = Math.min(input.length, 300000); i < n; i++) {
      const value = ownValue(input, String(i));
      if (valid(value)) return value;
    }
  }
  return null;
}

function createPowerController(getRuntime, onUpdate) {
  const defaults = { god: false, arsenal: false, stasis: false, vacuum: false,
    radial: 0, homing: 0, pierce: 0, area: 1 };
  const options = { ...defaults }, patches = [];
  let attached = null, lastMessage = '', vacuumTime = -1;
  function solo(r) { return r && !r.Coop?.active; }
  function running(r) { return solo(r) && r.Game.state === 'playing' && r.Game.player && !r.Game.player.dead; }
  function active() { return Object.keys(defaults).some(k => options[k] !== defaults[k]); }
  function practice(r) {
    // Use the game's own practice marker without advancing its clock.
    if (running(r) && typeof r.Game.debugTime === 'function') r.Game.debugTime(r.Game.st.time);
  }
  function info() { return { ...options, message: lastMessage, connected: !!getRuntime(), enabled: active() }; }
  function notify(message) { lastMessage = message; onUpdate(info()); }
  function patch(object, key, make) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (!descriptor?.writable || typeof descriptor.value !== 'function') throw new Error(`${key} is unavailable in this build.`);
    const wrapper = make(descriptor.value);
    Object.defineProperty(object, key, { ...descriptor, value: wrapper });
    patches.push({ object, key, descriptor, wrapper });
  }
  function release() {
    for (const p of patches.splice(0).reverse()) {
      if (p.object[p.key] === p.wrapper) Object.defineProperty(p.object, p.key, p.descriptor);
    }
    attached = null; vacuumTime = -1;
  }
  function attach(r) {
    if (attached === r) return;
    release();
    try {
      patch(r.Player.prototype, 'hurt', original => function (...args) {
        if (options.god && running(r) && this === r.Game.player) { practice(r); return; }
        return Reflect.apply(original, this, args);
      });
      patch(r.Combat, 'tick', original => function (dt, pl, now) {
        if (!running(r) || pl !== r.Game.player) return Reflect.apply(original, this, [dt, pl, now]);
        if (active()) practice(r);
        const groupDescriptor = Object.getOwnPropertyDescriptor(pl, 'activeGroup');
        const changes = [];
        try {
          if (options.arsenal) Object.defineProperty(pl, 'activeGroup', {
            configurable: true, writable: true, value: () => pl.moves.slice(0, 32)
          });
          if (options.area !== 1) for (const m of pl.moves) {
            for (const key of ['radius', 'width', 'size']) {
              if (Number.isFinite(m[key]) && m[key] > 0) {
                changes.push([m, key, m[key]]); m[key] *= options.area;
              }
            }
          }
          if (options.vacuum && now - vacuumTime >= 0.5) { r.Pickups.pullAll(); vacuumTime = now; }
          return Reflect.apply(original, this, [dt, pl, now]);
        } finally {
          for (const [m, key, before] of changes) m[key] = before;
          if (options.arsenal) {
            if (groupDescriptor) Object.defineProperty(pl, 'activeGroup', groupDescriptor);
            else delete pl.activeGroup;
          }
        }
      });
      patch(r.Projectiles, 'spawn', original => function (input) {
        if (!running(r) || !input || input.owner !== r.Game.player || input.friendly === false || input.ghost) {
          return Reflect.apply(original, this, [input]);
        }
        let o = input;
        if (!input.orb && active()) {
          o = { ...input };
          if (options.homing) o.homing = Math.max(o.homing || 0, options.homing);
          if (options.pierce) o.pierce = Math.min(100, (o.pierce || 0) + options.pierce);
        }
        const shot = Reflect.apply(original, this, [o]);
        const vx = o.vx, vy = o.vy;
        if (options.radial && !o.orb && !o.boom && Number.isFinite(vx) && Number.isFinite(vy) && Math.hypot(vx, vy) > 0) {
          for (let i = 1; i <= options.radial && r.Projectiles.count < 650; i++) {
            const a = Math.PI * 2 * i / (options.radial + 1), c = Math.cos(a), s = Math.sin(a);
            Reflect.apply(original, this, [{ ...o, vx: vx * c - vy * s, vy: vx * s + vy * c,
              hits: new Set(), phits: new Set(), hitLog: o.hitLog ? new Map() : null }]);
          }
        }
        return shot;
      });
      patch(r.Enemy.prototype, 'update', original => function (dt, ...args) {
        if (options.stasis && running(r)) { practice(r); return; }
        return Reflect.apply(original, this, [dt, ...args]);
      });
      attached = r;
    } catch (error) { release(); throw error; }
  }
  function set(next) {
    if (!next || typeof next !== 'object') throw new Error('Use valid power settings.');
    const proposed = { ...options };
    for (const [key, value] of Object.entries(next)) {
      if (!Object.hasOwn(defaults, key)) throw new Error(`Unknown power: ${key}`);
      if (typeof defaults[key] === 'boolean') {
        if (typeof value !== 'boolean') throw new Error(`${key} requires a checkbox value.`);
        proposed[key] = value;
      } else {
        if (!Number.isFinite(value)) throw new Error(`${key} requires a number.`);
        const max = { radial: 8, homing: 20, pierce: 30, area: 5 }[key];
        proposed[key] = Math.max(key === 'area' ? 1 : 0, Math.min(max, value));
        if (key === 'radial' || key === 'pierce') proposed[key] = Math.floor(proposed[key]);
      }
    }
    const r = getRuntime();
    if (!r || !solo(r)) throw new Error('Connect the game and leave co-op before enabling powers.');
    if (Object.keys(defaults).some(k => proposed[k] !== defaults[k])) attach(r);
    Object.assign(options, proposed);
    if (!active()) release(); else practice(r);
    notify(active() ? 'Powers active in solo play. Modded runs use the game’s practice flag.' : 'Powers off.');
    return info();
  }
  function requireRun() {
    const r = getRuntime();
    if (!running(r)) throw new Error('Start or resume a living solo run first.');
    practice(r); return r;
  }
  function action(name) {
    try {
      if (name === 'death') {
        const r = getRuntime(), p = r?.Game.player;
        if (!solo(r) || !p || p.dead || !['playing', 'paused'].includes(r.Game.state)) throw new Error('Start a living solo run, or close the reward/item screen first.');
        if (r.Judgment?.cinematic) throw new Error('Wait for the current cinematic to finish.');
        if (r.Game.state === 'paused') r.Game.togglePause();
        if (r.Game.state !== 'playing') throw new Error('Resume the run before using Death.');
        practice(r);
        // Apply the same KO state as Player.hurt, bypassing invulnerability
        // and Focus Sash. The game loop handles the normal death/arena result.
        p.hp = 0; p.dead = true; p.reviveT = 0;
        p.anim.play('Faint', { hold: true }); r.Projectiles.clearOrbs(p);
        notify(r.Rift.inArena ? 'Player defeated. The rift applies its normal arena-loss outcome.' : 'Player defeated. The normal run summary will open.');
        return true;
      }
      const r = requireRun(), p = r.Game.player;
      if (name === 'clearNormal' || name === 'defeatAll') {
        const enemies = r.EnemyMgr.all().filter(e => !e.dead && !e.remote &&
          (name === 'defeatAll' || (!e.shiny && !e.boss && !e.legend && !e.judge && e.behavior !== 'thief'))).slice(0, 256);
        if (enemies.some(e => typeof e.die !== 'function')) throw new Error('This build does not expose normal enemy defeat handling.');
        for (const enemy of enemies) { enemy.hp = 0; enemy.die(); }
        notify(`${enemies.length} enemies defeated. Loot and kill counts follow the normal game update.`);
        return enemies.length;
      }
      if (name === 'heal') { p.heal(p.maxHp); notify('Health restored.'); return true; }
      if (name === 'loot') { r.Pickups.pullAll(); notify('All existing loot is moving toward you.'); return true; }
      if (name === 'maxMoves' || name === 'evolve') {
        let count = 0;
        for (const m of p.moves.slice(0, 32)) {
          if (name === 'maxMoves') {
            for (let i = 0; i < 20 && m.lvl < m.def.maxLvl; i++) { if (!r.Moves.levelUp(m)) break; count++; }
          } else {
            const info = r.Moves.evoInfo(m, p.statsTaken);
            if (info?.ready && r.Moves.evolve(m)) count++;
          }
        }
        notify(name === 'maxMoves' ? `${count} move levels added. These last for this run.` : `${count} eligible moves evolved. Max the move and obtain its required stat card first.`);
        return count;
      }
      throw new Error('Unknown action.');
    } catch (error) { notify(error.message); return false; }
  }
  function radar() {
    const r = getRuntime(), p = r?.Game.player;
    if (!p || p.dead || r.Coop?.active || !['playing', 'paused', 'levelup'].includes(r.Game.state)) return [];
    const targets = r.EnemyMgr.all().filter(e => !e.dead && (e.shiny || e.boss || e.legend))
      .map(e => ({ name: `${e.shiny ? '★ Shiny ' : ''}${e.boss || e.legend ? 'Boss ' : ''}${e.name}`, kind: e.shiny ? 'shiny' : 'boss', boss: !!(e.boss || e.legend), x: e.x, y: e.y }));
    if (r.Rift.rift && !r.Rift.inArena) targets.push({ ...r.Rift.rift, name: '◇ Rift', kind: 'rift' });
    return targets.map(t => {
      const dx = t.x - p.x, dy = t.y - p.y;
      const directions = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
      return { name: t.name, kind: t.kind, boss: !!t.boss, angle: Math.atan2(dy, dx), distance: Math.round(Math.hypot(dx, dy)),
        direction: directions[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8] };
    }).sort((a, b) => a.distance - b.distance);
  }
  function reset() { Object.assign(options, defaults); release(); lastMessage = ''; onUpdate(info()); }
  return Object.freeze({ set, action, radar, reset, info });
}

function createSpawnController(getRuntime, onUpdate, worldHooks = {}) {
  let worldAccess = null, nextModPropId = -1;
  let attached = null, wrappers = null, enabled = false, lastMessage = '';
  const options = { rate: 1, shiny: 0 };
  function runtime() {
    const r = getRuntime();
    return r && typeof r.Spawner?.update === 'function' && typeof r.Spawner?.burst === 'function' &&
      typeof r.Spawner?.debugForceShiny === 'function' && typeof r.EnemyMgr?.add === 'function' &&
      typeof r.EnemyMgr?.shinies === 'function' && typeof r.Enemies?.bagAt === 'function' &&
      typeof r.Sprites?.hasShiny === 'function' && typeof r.Rift?.debugOpen === 'function' && r.Game ? r : null;
  }
  function info() {
    const r = runtime();
    return { connected: !!r, enabled, rate: options.rate, shiny: options.shiny,
      treasureReady: !!(r && typeof r.Enemy === 'function' && typeof r.Enemy.prototype?.die === 'function' && typeof r.Sprites.preload === 'function'),
      playing: !!(r && r.Game.state === 'playing' && r.Game.player && !r.Game.player.dead && !r.Coop?.active),
      count: r ? r.EnemyMgr.count : 0, cap: r ? r.Spawner.CAP : 64, message: lastMessage };
  }
  function notify(message) { lastMessage = message; onUpdate(info()); }
  function requireRun() {
    const r = runtime();
    if (!r) throw new Error('Connect the game using Connect saved objects in the Spawns tab.');
    if (r.Coop?.active) throw new Error('Spawn controls support solo runs.');
    if (r.Game.state !== 'playing' || !r.Game.player || r.Game.player.dead) throw new Error('Start or resume a living solo run first.');
    if (r.Rift.inArena || r.Judgment?.active) throw new Error('Return to the normal map before spawning.');
    return r;
  }
  function patchable(object, key) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (!descriptor || typeof descriptor.value !== 'function' || !descriptor.writable) throw new Error(`Cannot modify ${key} in this build.`);
    return descriptor;
  }
  function setOptions(next) {
    if (!next || typeof next !== 'object') throw new Error('Use numeric spawn settings.');
    if (next.rate !== undefined && !Number.isFinite(next.rate)) throw new Error('Use a numeric spawn multiplier.');
    if (next.shiny !== undefined && !Number.isFinite(next.shiny)) throw new Error('Use a numeric shiny percentage.');
    if (next.rate !== undefined) {
      if (!Number.isFinite(next.rate)) throw new Error('Use a numeric spawn multiplier.');
      options.rate = Math.max(1, Math.min(10, next.rate));
    }
    if (next.shiny !== undefined) {
      if (!Number.isFinite(next.shiny)) throw new Error('Use a numeric shiny percentage.');
      options.shiny = Math.max(0, Math.min(100, next.shiny));
    }
    onUpdate(info()); return { ...options };
  }
  function disable() {
    if (attached && wrappers) {
      if (attached.Spawner.update === wrappers.update) Object.defineProperty(attached.Spawner, 'update', wrappers.updateDescriptor);
      if (attached.EnemyMgr.add === wrappers.add) Object.defineProperty(attached.EnemyMgr, 'add', wrappers.addDescriptor);
    }
    enabled = false; attached = wrappers = null;
    onUpdate(info());
  }
  function enable() {
    if (enabled) return true;
    const r = runtime();
    if (!r) { notify('Connect saved objects first.'); return false; }
    const updateDescriptor = patchable(r.Spawner, 'update'), addDescriptor = patchable(r.EnemyMgr, 'add');
    const originalUpdate = updateDescriptor.value, originalAdd = addDescriptor.value;
    function update(dt, who, time) {
      if (!r.Coop?.active && (options.rate !== 1 || options.shiny > 0)) r.Game.debugTime?.(r.Game.st.time);
      const scaled = !r.Coop?.active && Number.isFinite(dt) && dt >= 0 ? dt * options.rate : dt;
      return Reflect.apply(originalUpdate, this, [scaled, who, time]);
    }
    function add(enemy, ...rest) {
      try {
        if (!r.Coop?.active && options.shiny > 0 && enemy && !enemy.remote && !enemy.boss &&
            !enemy.legend && !enemy.shiny && typeof enemy.makeShiny === 'function' &&
            r.Sprites.hasShiny(enemy.dex) && Math.random() < options.shiny / 100) enemy.makeShiny();
      } catch (error) { notify(`Shiny modifier skipped: ${error.message}`); }
      return Reflect.apply(originalAdd, this, [enemy, ...rest]);
    }
    attached = r; wrappers = { update, add, updateDescriptor, addDescriptor };
    try {
      Object.defineProperty(r.Spawner, 'update', { ...updateDescriptor, value: update });
      Object.defineProperty(r.EnemyMgr, 'add', { ...addDescriptor, value: add });
      enabled = true; notify('Spawn modifiers enabled. Native mob limits remain in place.'); return true;
    } catch (error) { disable(); throw error; }
  }
  function countValue(value) {
    if (!Number.isFinite(value)) throw new Error('Use a numeric spawn count.');
    return Math.max(1, Math.min(50, Math.floor(value)));
  }
  function burst(value, shiny = false, selectedDex = null) {
    try {
      const r = requireRun(), count = countValue(value), before = r.EnemyMgr.count;
      r.Game.debugTime?.(r.Game.st.time);
      const beforeShinies = r.EnemyMgr.shinies().length;
      if (shiny || selectedDex) {
        const time = r.Game.st?.time || 0;
        let pool = r.Enemies.bagAt(time);
        if (selectedDex) {
          const mon = r.DEX_BY[selectedDex];
          if (!mon || !r.SPRITE_META[selectedDex] || !pool.length) throw new Error('Choose a species with loaded sprite metadata.');
          pool = [{ ...pool[0], dex: mon.dex, name: mon.name, behavior: 'chase' }];
        }
        if (shiny) pool = pool.filter(def => r.Sprites.hasShiny(def.dex));
        if (!pool.length) throw new Error('No shiny-supported species are available in the current spawn pool.');
        const descriptor = patchable(r.Enemies, 'bagAt');
        const supportedBag = () => pool;
        Object.defineProperty(r.Enemies, 'bagAt', { ...descriptor, value: supportedBag });
        try { if (shiny) r.Spawner.debugForceShiny(count); r.Spawner.burst(count); }
        finally {
          try { r.Spawner.debugForceShiny(0); }
          finally { if (r.Enemies.bagAt === supportedBag) Object.defineProperty(r.Enemies, 'bagAt', descriptor); }
        }
      } else r.Spawner.burst(count);
      const spawned = r.EnemyMgr.count - before;
      const shinyCount = r.EnemyMgr.shinies().length - beforeShinies;
      notify(spawned > 0
        ? `Spawned ${spawned} wild Pokémon${shiny ? ` · ${shinyCount} shiny` : ''}.`
        : 'No mobs spawned: the mob limit is reached or no free spawn position was found.');
      return spawned;
    } catch (error) { notify(error.message); return 0; }
  }
  function treasure(kind, value = 1) {
    try {
      const r = requireRun();
      const dex = kind === 'meowth' ? 52 : kind === 'gholdengo' ? 1000 : null;
      if (!dex) throw new Error('Choose Meowth or Gholdengo treasure carriers.');
      if (!Number.isFinite(value)) throw new Error('Use a numeric treasure count.');
      const count = Math.max(1, Math.min(10, Math.floor(value))), mon = r.DEX_BY[dex];
      if (!info().treasureReady || !mon || !r.SPRITE_META[dex]) throw new Error('Treasure enemies or their sprite metadata are unavailable in this build.');
      const p = r.Game.player, time = r.Game.st?.time;
      if (![p.x, p.y, time, r.EnemyMgr.count, r.Spawner.CAP].every(Number.isFinite) || time < 0 || r.Spawner.CAP < 1) throw new Error('The current run position, clock or mob limit is unavailable.');
      const limit = Math.min(256, r.Spawner.CAP + 10);
      if (r.EnemyMgr.count >= limit) { notify('Mob limit reached. Defeat some enemies before spawning treasure carriers.'); return 0; }
      r.Game.debugTime?.(time);
      r.Sprites.preload([dex]);
      // Match Events.spawnThief's native definition and 15-second escape timer.
      // Ordinary selected-species swarms use chase AI and cannot supply this loot.
      const gold = dex === 1000;
      const def = { dex, name: mon.name, behavior: 'thief',
        hp: Math.round(60 * (1 + time / 95) * (gold ? 1.5 : 1)),
        spd: 92, dmg: 0, xp: 10, loot: gold ? 'ticket10' : 'coins' };
      let spawned = 0;
      for (let n = 0; n < count && r.EnemyMgr.count < limit; n++) {
        let spot = null;
        for (let attempt = 0; attempt < 12; attempt++) {
          const a = Math.random() * 6.2832, d = 230 + Math.random() * 70;
          const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * 0.8;
          if (r.World.isFree(x, y, 14)) { spot = { x, y }; break; }
        }
        if (!spot) break;
        const enemy = new r.Enemy({ ...def }, spot.x, spot.y, { hp: 1, spd: 1, dmg: 1 });
        enemy.life = 15;
        r.EnemyMgr.add(enemy); spawned++;
      }
      notify(spawned
        ? `Spawned ${spawned} treasure ${mon.name}. ${gold ? 'Coins + one ×10 ticket each' : 'Coins'} on defeat. Catch them within 15 seconds; follow the game’s yellow arrow.`
        : 'No free treasure spawn position found. Move to open ground and try again.');
      return spawned;
    } catch (error) { notify(error.message); return 0; }
  }
  function boss(selectedDex = null, count = 1, shiny = false) {
    try {
      const r = requireRun(), p = r.Game.player, time = r.Game.st.time;
      if (!info().treasureReady || !Array.isArray(r.DEX) || !Number.isFinite(time) || time < 0) throw new Error('Boss spawning is unavailable in this build.');
      if (!Number.isInteger(count) || count < 1 || count > 3 || typeof shiny !== 'boolean') throw new Error('Choose 1–3 bosses and a valid shiny option.');
      const pool = r.DEX.filter(mon => mon.leg && r.SPRITE_META[mon.dex] && (!shiny || r.Sprites.hasShiny(mon.dex)));
      const chosen = selectedDex === null || selectedDex === '' ? null : pool.find(mon => String(mon.dex) === String(selectedDex));
      if (!pool.length || (selectedDex !== null && selectedDex !== '' && !chosen)) throw new Error('Choose a supported rift legendary. Shiny requires supported sprites.');
      if (![p.x, p.y, r.EnemyMgr.count, r.Spawner.CAP].every(Number.isFinite)) throw new Error('Run position or mob limit is unavailable.');
      const limit = Math.min(256, r.Spawner.CAP + 10);
      let spawned = 0;
      for (let i = 0; i < count && r.EnemyMgr.count < limit; i++) {
        const mon = chosen || pool[Math.floor(Math.random() * pool.length)];
        r.Sprites.preload([mon.dex]);
        const def = { dex: mon.dex, name: mon.name,
          hp: Math.round(3200 + time * 9), spd: Math.round(Math.max(48, Math.min(105, 48 + (mon.spd - 78) * 0.6))),
          dmg: Math.round(36 + time / 20), xp: Math.round(500 + time * 1.2),
          behavior: mon.types.some(t => ['psychic', 'electric', 'ghost', 'fairy', 'fire', 'water', 'ice', 'dragon'].includes(t)) ? 'ranged' : 'charger',
          shotDmg: Math.round(18 + time / 40), shotCd: 0.9, range: 300 };
        const enemy = new r.Enemy(def, p.x, p.y, { hp: 1, spd: 1, dmg: 1 }, true);
        let spot = null;
        for (let attempt = 0; attempt < 24; attempt++) {
          const a = Math.random() * Math.PI * 2, d = Math.max(280, p.r + enemy.r + 100) + Math.random() * 160;
          const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * 0.85;
          if (r.World.isFree(x, y, enemy.r + 6)) { spot = { x, y }; break; }
        }
        if (!spot) break;
        enemy.x = spot.x; enemy.y = spot.y; enemy.legend = true; enemy.flying = false;
        if (shiny) enemy.makeShiny();
        r.Game.debugTime?.(time); r.EnemyMgr.add(enemy); spawned++;
      }
      notify(spawned ? `Spawned ${spawned} rift boss${spawned === 1 ? '' : 'es'} on the normal map. Native combat and drops; arena fusion rewards require a real rift.`
        : 'No boss spawned: mob limit reached or no free position.');
      return spawned;
    } catch (error) { notify(error.message); return 0; }
  }
  function chests(kind, count = 1) {
    try {
      const r = requireRun(), w = r.World, p = r.Game.player;
      if (!['chest', 'bigchest'].includes(kind) || !Number.isInteger(count) || count < 1 || count > 10) throw new Error('Choose a chest type and count from 1–10.');
      if (![w.TS, w.CW, p.x, p.y, p.r].every(Number.isFinite) || w.TS <= 0 || w.CW !== w.TS * 16 ||
          typeof w.breakProp !== 'function' || typeof w.specialsNear !== 'function') throw new Error('Native chest support is unavailable in this build.');
      worldHooks.prepare?.();
      if (!worldAccess || worldAccess.world !== w || worldAccess.player !== p) worldAccess = captureWorldAccess(r);
      const { chunks, broken } = worldAccess;
      worldHooks.ready?.(chunks);
      const ts = w.TS, cx = Math.floor(p.x / ts), cy = Math.floor(p.y / ts);
      const start = Math.max(2, Math.ceil((p.r + 48) / ts));
      let spawned = 0;
      // Tile-aligned props participate in native rendering, collision, attacks,
      // chest timers and loot. Never overwrite terrain, existing props or a
      // tile already recorded as broken by the game.
      for (let ring = start; ring < start + 8 && spawned < count; ring++) {
        for (let step = 0; step < ring * 8 && spawned < count; step++) {
          const a = step / (ring * 8) * Math.PI * 2;
          const tx = cx + Math.round(Math.cos(a) * ring), ty = cy + Math.round(Math.sin(a) * ring);
          const key = `${tx},${ty}`, x = tx * ts + ts / 2, y = ty * ts + ts - 4;
          if (broken.has(key) || w.kindAt(x, y) !== 'floor' || !w.isFree(x, y, Math.max(30, p.r + 16))) continue;
          const chunkKey = `${Math.floor(tx / 16)},${Math.floor(ty / 16)}`, chunk = chunks.get(chunkKey);
          if (!validWorldChunk(chunk, chunkKey) || chunk.propAt.has(key) || chunk.props.some(prop => prop.tx === tx && prop.ty === ty)) continue;
          const locked = kind === 'bigchest', hp = locked ? Infinity : 22;
          const prop = { id: nextModPropId--, type: kind, tx, ty, kind: 0, x, y, r: locked ? 14 : 12,
            hp, maxHp: hp, solid: true, flat: false, destructible: !locked, flash: 0,
            wiggle: 0, used: false, charge: 1, open: 0 };
          chunk.props.push(prop);
          try { chunk.propAt.set(key, prop); }
          catch (error) { chunk.props.splice(chunk.props.indexOf(prop), 1); throw error; }
          spawned++;
        }
      }
      if (spawned) r.Game.debugTime?.(r.Game.st.time);
      notify(spawned ? `Spawned ${spawned} ${kind === 'bigchest' ? 'large locked' : 'normal'} chest${spawned === 1 ? '' : 's'} nearby. ${kind === 'bigchest' ? 'Stand beside each for 3.5 seconds.' : 'Break them with your attacks.'} Loot uses the normal chest tables.`
        : 'No safe unused chest tile nearby. Move to open, unexplored ground and retry.');
      return spawned;
    } catch (error) { notify(error.message); return 0; }
  }

  function openRift() {
    try {
      const r = requireRun();
      r.Game.debugTime?.(r.Game.st.time);
      if (r.Rift.rift) { notify('A rift is already open nearby.'); return false; }
      r.Rift.debugOpen();
      if (!r.Rift.rift) { notify('No free location for a rift. Move and try again.'); return false; }
      notify('Rift opened nearby. Follow the game’s purple rift indicator.'); return true;
    } catch (error) { notify(error.message); return false; }
  }
  function reset() { disable(); worldAccess = null; options.rate = 1; options.shiny = 0; lastMessage = ''; onUpdate(info()); }
  return Object.freeze({ enable, disable, reset, setOptions, burst, treasure, boss, chests, openRift, info,
    get enabled() { return enabled; }, get options() { return { ...options }; } });
}

  const KEY = 'pokeSurvivorMods';
  const VERSION = 'mod-panel-v8';
  const prior = window[KEY];
  if (prior !== undefined) {
    if (!['mod-panel-v1', 'mod-panel-v2', 'mod-panel-v3', 'mod-panel-v4', 'mod-panel-v5', 'mod-panel-v6', 'mod-panel-v7', VERSION].includes(prior?.version) || typeof prior.destroy !== 'function') {
      throw new Error('window.pokeSurvivorMods is already in use. Reload first.');
    }
    prior.destroy();
  }
  const oldDamage = window.pokeDamageMod;
  if (oldDamage?.version === 'projectile-owner-v1' && typeof oldDamage.undo === 'function') {
    oldDamage.undo();
  }

  const specs = [
    { id: 'damage', field: 'atkMul', label: 'Damage', help: 'Melee + ranged', min: 1, max: 100, step: 0.5, initial: 8 },
    { id: 'attackSpeed', field: 'cdMul', label: 'Attack speed', help: 'Higher = shorter cooldown', min: 0.5, max: 10, step: 0.25, initial: 1, inverse: true },
    { id: 'movement', field: 'spdMul', label: 'Movement speed', help: 'Run faster or slower', min: 0.5, max: 3, step: 0.1, initial: 1 },
    { id: 'pickup', field: 'magnet', label: 'Pickup range', help: 'XP + coin collection radius', min: 1, max: 30, step: 0.5, initial: 1 },
    { id: 'xp', field: 'xpMul', label: 'Experience gain', help: 'XP from collected orbs', min: 1, max: 50, step: 1, initial: 1 }
  ];
  const settings = Object.fromEntries(specs.map(s => [s.id, s.initial]));
  const applied = Object.fromEntries(specs.map(s => [s.id, 1]));
  const controls = new Map();
  const listeners = new AbortController();
  const own = (o, key) => o && typeof o === 'object'
    ? Object.getOwnPropertyDescriptor(o, key)?.value : undefined;
  let player = null, stopWatch = null, destroyed = false, watchTimer;
  let status = 'waiting';
  const rewardPolicy = { smart: false, names: '', first: 'up', second: 'damage', fallback: 'first' };
  let rewardsEnabled = false, rewardObserver = null, rewardQueued = false, pickingReward = false;
  const selectedCards = new WeakSet();
  const background = createBackgroundController(window, document);
  let locator;
  let spawnController, spawnInterval, powers, itemAutomation;
  let rareGuideEnabled = false, rareMode = 'auto';
  let gameRuntime = null;
  function connect(input) {
    let found = findGameRuntime(input) || findGameRuntime(window.G);
    if (!found) for (const key of Object.getOwnPropertyNames(window).filter(k => /^temp\d{1,4}$/.test(k)).reverse()) {
      found = findGameRuntime(Object.getOwnPropertyDescriptor(window, key)?.value);
      if (found) break;
    }
    if (!found) { message('waiting', 'Connect the normal game page', 'Console: queryObjects(Object), right-click its Array, Store as global variable, then press Connect saved objects.'); return false; }
    if (gameRuntime !== found) { powers?.reset(); spawnController?.reset(); itemAutomation?.reset(); gameRuntime = found; }
    arm(); renderSpawnStatus(spawnController.info()); populateSpecies(); populateBosses(); populateItems();
    message('active', 'Production runtime connected', 'Start or resume a solo run. Spawns and Powers are ready.');
    return true;
  }

  function element(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  const host = element('div');
  host.id = 'pokesurvivor-mod-panel';
  Object.assign(host.style, {
    position: 'fixed', right: '18px', top: '18px', zIndex: '2147483647',
    width: '308px', maxWidth: 'calc(100vw - 24px)', pointerEvents: 'auto',
    colorScheme: 'dark'
  });
  const root = host.attachShadow({ mode: 'open' });
  const style = element('style');
  style.textContent = `
    :host{all:initial;color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif}
    *{box-sizing:border-box}button,input{font:inherit}button{cursor:pointer}
    .panel{color:#e9edf9;background:#111824;border:1px solid #34465b;border-radius:18px;
      box-shadow:0 18px 60px #0008;overflow:hidden;font-size:13px;line-height:1.4}
    .header{display:flex;align-items:center;justify-content:space-between;padding:17px 18px;
      background:linear-gradient(110deg,#182a39,#1b2037);cursor:move;touch-action:none}
    .eyebrow{color:#75e7c4;font-size:9px;letter-spacing:2px;font-weight:800;margin-bottom:3px}
    h2{font-size:17px;font-weight:650;letter-spacing:-.3px;margin:0}
    .minimize{border:1px solid #415166;border-radius:8px;width:28px;height:28px;
      color:#d8e2f2;background:#ffffff08;font-size:20px;line-height:1}
    .body{padding:16px 18px 13px;max-height:calc(100dvh - 110px);overflow:auto}
    .state{display:flex;align-items:center;gap:7px;color:#f4cb78;font-size:11px;font-weight:600}
    .dot{width:6px;height:6px;flex:none;background:currentColor;border-radius:50%}
    .state[data-state=active]{color:#75e7c4}.state[data-state=error]{color:#ff9f9f}
    .hint{font-size:11px;color:#93a3b8;margin:6px 0 17px;line-height:1.5}
    .row{padding:0 0 16px;margin:0 0 13px;border-bottom:1px solid #293344}
    .row:last-of-type{margin-bottom:15px}.row-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .name{font-weight:600;color:#e3eaf6}.help{font-size:10px;color:#91a1b8;margin-top:2px}
    .value{display:flex;align-items:center;gap:4px;color:#76e8c6;font-size:12px}
    input[type=number]{width:55px;border:1px solid #384b60;background:#1a2636;color:#a5ffe1;
      text-align:right;padding:5px 4px;border-radius:7px;font-size:13px;appearance:textfield}
    input::-webkit-inner-spin-button{appearance:none}
    input[type=range]{display:block;width:100%;margin:12px 0 0;height:5px;accent-color:#75e7c4;cursor:pointer}
    input:focus-visible,button:focus-visible{outline:2px solid #a6b9ff;outline-offset:3px}
    .actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    .action{padding:10px 5px;border-radius:9px;border:1px solid #3b4a61;font-size:11px;font-weight:600;
      background:#202d40;color:#e8effb}.primary{background:#75e7c4;color:#10271f;border-color:#75e7c4}
    .footer{display:flex;justify-content:space-between;align-items:center;margin-top:13px;font-size:9px;color:#8294ad}
    .remove{border:0;background:none;color:#a8b6c9;padding:3px 0;font-size:10px}
    .mini{background:#152b31;border:1px solid #75e7c4;color:#b9ffe9;padding:10px 14px;border-radius:12px;
      box-shadow:0 8px 25px #0006;font-weight:600;font-size:12px}
    [hidden]{display:none!important}button:hover{filter:brightness(1.1)}
    .tabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;padding:4px;background:#0c121d;border-radius:9px;margin-bottom:17px}
    .tab{border:0;border-radius:6px;padding:8px 2px;color:#8fa4ba;background:none;font-size:10px;font-weight:600}
    .tab[aria-selected=true]{background:#2b3a50;color:#dffbed}
    .toggle{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:11px 0;font-weight:600}
    .toggle input{width:17px;height:17px;accent-color:#75e7c4;flex:none}
    .subnote{font-size:10px;color:#93a5ba;line-height:1.5;margin:2px 0 12px}
    .setting-label{display:block;font-size:11px;margin:11px 0 5px;color:#c4d2e3}
    select,input[type=text],input[type=search]{display:block;width:100%;border:1px solid #3a4c61;background:#1a2636;color:#e1edf9;
      border-radius:7px;padding:8px;font-size:11px;min-width:0}
    .automation-box{border-top:1px solid #293344;padding-top:7px;margin-top:12px}
    .automation-note{font-size:10px;line-height:1.5;color:#a6c9ba;margin:12px 0 14px;overflow-wrap:anywhere}
    .danger{border-color:#da6576;background:#422633;color:#ffc9d1}
    .run-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}
    .run-actions .danger{grid-column:1/-1}
    .rare-guide{position:fixed;left:18px;bottom:18px;width:228px;padding:12px 14px;background:#121e2aee;border:1px solid #75e7c4;border-radius:14px;box-shadow:0 6px 25px #0006;pointer-events:none;color:#ddfff3;font-size:11px;line-height:1.5}
    .rare-arrow{display:inline-block;font-size:30px;line-height:1;margin-right:12px;color:#75e7c4}
    .rare-title{display:block;font-weight:700;margin-bottom:6px}
    .locator-guide{position:fixed;top:102px;left:50%;transform:translateX(-50%);width:234px;
      color:#ffe6a1;background:#151d24ed;border:1px solid #90733f;border-radius:16px;padding:13px 12px;
      text-align:center;box-shadow:0 10px 35px #0007;pointer-events:none;font-size:11px;line-height:1.5}
    .locator-title{font-size:12px;font-weight:700;color:#ffe8ae;margin-bottom:4px}
    .locator-arrow{display:block;width:64px;height:64px;margin:7px auto 8px;filter:drop-shadow(0 0 8px #f7be4166)}
    .locator-detail{font-size:10px;color:#cfb984}.locator-progress{height:4px;background:#353025;border-radius:3px;margin-top:10px;overflow:hidden}
    .locator-fill{height:100%;background:#ffd56d;width:0%;border-radius:3px}
    .locator-box{background:#1b2735;border:1px solid #3d4c61;border-radius:10px;padding:13px;margin:15px 0}
    .locator-box strong{font-size:12px;color:#ffe3a0;display:block;margin-bottom:5px}
    .spawn-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}
    .rift-button{grid-column:1/-1;background:#322947;border-color:#806aa7;color:#e5d3ff}
    .source-link{display:block;color:#8de4c9;font-size:11px;margin:8px 0 3px;text-decoration:underline}
    button:disabled{opacity:.4;cursor:not-allowed}input:disabled{opacity:.5}
  `;
  const panel = element('section', undefined, 'panel');
  panel.setAttribute('aria-label', 'PokéSurvivor mod controls');
  const header = element('div', undefined, 'header');
  const heading = element('div');
  heading.append(element('div', 'POKÉSURVIVOR', 'eyebrow'), element('h2', 'Mod controls'));
  const minimize = element('button', '−', 'minimize');
  minimize.type = 'button'; minimize.setAttribute('aria-label', 'Minimize mod panel');
  header.append(heading, minimize);
  const body = element('div', undefined, 'body');
  const stateEl = element('div', undefined, 'state');
  stateEl.setAttribute('role', 'status');
  const stateText = element('span', 'Waiting for player');
  stateEl.append(element('span', undefined, 'dot'), stateText);
  const hint = element('p', 'Resume and fire a projectile once. Settings apply after capture.', 'hint');
  body.append(stateEl, hint);
  const tabs = element('div', undefined, 'tabs'); tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Mod sections');
  const statsTab = element('button', 'Stats', 'tab'), automationTab = element('button', 'Automation', 'tab'), locatorTab = element('button', 'Locator', 'tab'), spawnsTab = element('button', 'Spawns', 'tab');
  const powersTab = element('button', 'Powers', 'tab'), powersSection = element('div');
  powersTab.type = 'button'; powersTab.setAttribute('role', 'tab'); powersTab.setAttribute('aria-selected', 'false'); powersSection.hidden = true;
  const statsSection = element('div'), automationSection = element('div'), locatorSection = element('div'), spawnsSection = element('div');
  for (const tabButton of [statsTab, automationTab, locatorTab, spawnsTab]) { tabButton.type = 'button'; tabButton.setAttribute('role', 'tab'); }
  statsTab.setAttribute('aria-selected', 'true'); automationTab.setAttribute('aria-selected', 'false'); locatorTab.setAttribute('aria-selected', 'false'); spawnsTab.setAttribute('aria-selected', 'false');
  automationSection.hidden = locatorSection.hidden = spawnsSection.hidden = true;
  function selectTab(name) {
    statsSection.hidden = name !== 'stats'; automationSection.hidden = name !== 'automation'; locatorSection.hidden = name !== 'locator';
    spawnsSection.hidden = name !== 'spawns'; powersSection.hidden = name !== 'powers'; powersTab.setAttribute('aria-selected', String(name === 'powers'));
    statsTab.setAttribute('aria-selected', String(name === 'stats'));
    automationTab.setAttribute('aria-selected', String(name === 'automation'));
    locatorTab.setAttribute('aria-selected', String(name === 'locator'));
    spawnsTab.setAttribute('aria-selected', String(name === 'spawns'));
  }
  statsTab.addEventListener('click', () => selectTab('stats'), { signal: listeners.signal });
  automationTab.addEventListener('click', () => selectTab('automation'), { signal: listeners.signal });
  locatorTab.addEventListener('click', () => selectTab('locator'), { signal: listeners.signal });
  spawnsTab.addEventListener('click', () => selectTab('spawns'), { signal: listeners.signal });
  powersTab.addEventListener('click', () => selectTab('powers'), { signal: listeners.signal });
  tabs.style.flexWrap = 'wrap';
  tabs.append(statsTab, powersTab, spawnsTab, locatorTab, automationTab); body.append(tabs, statsSection, automationSection, locatorSection, spawnsSection, powersSection);
  for (const spec of specs) {
    const row = element('div', undefined, 'row');
    const rowHead = element('div', undefined, 'row-head');
    const text = element('div');
    const label = element('label', spec.label, 'name');
    label.htmlFor = `ps-${spec.id}-number`;
    text.append(label, element('div', spec.help, 'help'));
    const value = element('div', undefined, 'value');
    const number = element('input'); number.type = 'number'; number.id = label.htmlFor;
    const range = element('input'); range.type = 'range';
    range.setAttribute('aria-label', `${spec.label} multiplier`);
    for (const input of [number, range]) {
      input.min = String(spec.min); input.max = String(spec.max); input.step = String(spec.step);
      input.value = String(settings[spec.id]);
    }
    value.append(number, element('span', '×'));
    rowHead.append(text, value); row.append(rowHead, range); statsSection.append(row);
    controls.set(spec.id, { number, range });
    range.addEventListener('input', () => updateSetting(spec.id, range.valueAsNumber), { signal: listeners.signal });
    number.addEventListener('input', () => {
      if (Number.isFinite(number.valueAsNumber)) updateSetting(spec.id, number.valueAsNumber);
    }, { signal: listeners.signal });
    number.addEventListener('change', () => {
      if (Number.isFinite(number.valueAsNumber)) updateSetting(spec.id, number.valueAsNumber);
      else { syncControls(); message('error', 'Enter a number', `Use ${spec.min}–${spec.max}× for ${spec.label.toLowerCase()}.`); }
    }, { signal: listeners.signal });
  }
  const rewardToggle = element('input'); rewardToggle.type = 'checkbox';
  rewardToggle.setAttribute('aria-label', 'Auto choose level-up rewards');
  const rewardLabel = element('label', undefined, 'toggle');
  rewardLabel.append(element('span', 'Auto choose level-up rewards'), rewardToggle);
  const autoNote = element('p', 'Off · choose rewards manually.', 'automation-note');
  automationSection.append(rewardLabel, element('p', 'Select preferences once. Offered rewards are then picked automatically, closing the level-up screen.', 'subnote'));
  const categories = [
    ['none', 'No preference'], ['up', 'Upgrade a learned move'], ['evo', 'Evolve a move'], ['new', 'Learn a new move'],
    ['damage', 'Damage / Power'], ['cooldown', 'Cooldown / Reflexes'], ['hp', 'Max HP / Vigor'],
    ['defense', 'Defense / Armor'], ['regen', 'Regeneration / Synthesis'], ['pickup', 'Pickup / Magnet'],
    ['xp', 'XP / Learning'], ['movement', 'Movement / Sprint'], ['heal', 'Heal / Sitrus Berry']
  ];
  function addSelect(labelText, id, choices, initial, onChange) {
    const label = element('label', labelText, 'setting-label'); label.htmlFor = id;
    const select = element('select'); select.id = id;
    for (const [value, text] of choices) { const option = element('option', text); option.value = value; select.append(option); }
    select.value = initial;
    select.addEventListener('change', () => { onChange(select.value); queueRewardCheck(); }, { signal: listeners.signal });
    automationSection.append(label, select); return select;
  }
  addSelect('First priority', 'ps-reward-first', categories, rewardPolicy.first, value => { rewardPolicy.first = value; });
  addSelect('Second priority', 'ps-reward-second', categories, rewardPolicy.second, value => { rewardPolicy.second = value; });
  const namesLabel = element('label', 'Preferred reward names (optional)', 'setting-label'); namesLabel.htmlFor = 'ps-reward-names';
  const namesInput = element('input'); namesInput.type = 'text'; namesInput.id = namesLabel.htmlFor;
  namesInput.maxLength = 200; namesInput.placeholder = 'e.g. Confusion, Power';
  namesInput.addEventListener('input', () => { rewardPolicy.names = namesInput.value.slice(0, 200); queueRewardCheck(); }, { signal: listeners.signal });
  automationSection.append(namesLabel, namesInput, element('p', 'Comma separated, in priority order. Use the names shown on your cards. Names override the priorities above.', 'subnote'));
  addSelect('If no preference is offered', 'ps-reward-fallback', [['first', 'Pick the first offered card'], ['wait', 'Wait for me to choose']],
    rewardPolicy.fallback, value => { rewardPolicy.fallback = value; });
  const smartRewardsToggle = element('input'); smartRewardsToggle.type = 'checkbox'; smartRewardsToggle.setAttribute('aria-label', 'Build-aware auto rewards');
  const smartRewardsLabel = element('label', undefined, 'toggle'); smartRewardsLabel.append(element('span', 'Build-aware auto rewards'), smartRewardsToggle);
  smartRewardsToggle.addEventListener('change', () => { rewardPolicy.smart = smartRewardsToggle.checked; queueRewardCheck(); }, { signal: listeners.signal });
  automationSection.append(smartRewardsLabel, element('p', 'After preferred names: heal below 35% HP, take evolutions, then take stat cards needed to evolve maxed moves. Otherwise use your normal priorities. Requires Auto choose rewards.', 'subnote'), autoNote);
  const itemToggle = element('input'); itemToggle.type = 'checkbox'; itemToggle.setAttribute('aria-label', 'Auto choose items');
  const itemLabel = element('label', undefined, 'toggle'); itemLabel.append(element('span', 'Auto choose items'), itemToggle);
  const itemNote = element('p', 'Off · choose items manually.', 'automation-note');
  automationSection.prepend(itemLabel);
  const itemBox = element('div', undefined, 'automation-box');
  const itemFirstLabel = element('label', 'Preferred item', 'setting-label'); itemFirstLabel.htmlFor = 'ps-item-first';
  const itemSecondLabel = element('label', 'Backup item (optional)', 'setting-label'); itemSecondLabel.htmlFor = 'ps-item-second';
  const itemFirst = element('select'), itemSecond = element('select'); itemFirst.id = itemFirstLabel.htmlFor; itemSecond.id = itemSecondLabel.htmlFor;
  itemBox.append(itemFirstLabel, itemFirst, itemSecondLabel, itemSecond,
    element('p', 'One held item at a time. Your preferred item wins, then your backup; otherwise keep the current item. Future item screens are resolved through the game callback without opening. If a screen is already open, finish that choice once. Solo only.', 'subnote'), itemNote);
  itemLabel.after(itemBox);
  function populateItems() {
    const labels = { leftovers: 'Leftovers', choiceband: 'Choice Band', quickclaw: 'Quick Claw', focussash: 'Focus Sash', shellbell: 'Shell Bell', amuletcoin: 'Amulet Coin', luckyegg: 'Lucky Egg', lifeorb: 'Life Orb', choicescarf: 'Choice Scarf', rockyhelmet: 'Rocky Helmet', assaultvest: 'Assault Vest' };
    for (const select of [itemFirst, itemSecond]) {
      const prior = select.value; select.replaceChildren();
      const empty = element('option', select === itemFirst ? 'Choose an item' : 'No backup'); empty.value = ''; select.append(empty);
      for (const item of gameRuntime?.Items?.LIST || []) {
        const option = element('option', labels[item.id] || item.name); option.value = item.id; select.append(option);
      }
      if ([...select.options].some(o => o.value === prior)) select.value = prior;
    }
  }
  function updateItemAutomation() {
    try { itemAutomation.set([itemFirst.value, itemSecond.value].filter(Boolean), itemToggle.checked); }
    catch (error) { const prior = itemAutomation.info(); itemToggle.checked = prior.enabled; itemFirst.value = prior.preferred[0] || ''; itemSecond.value = prior.preferred[1] || ''; itemNote.textContent = error.message; }
  }
  itemToggle.addEventListener('change', updateItemAutomation, { signal: listeners.signal });
  itemFirst.addEventListener('change', updateItemAutomation, { signal: listeners.signal });
  itemSecond.addEventListener('change', updateItemAutomation, { signal: listeners.signal });
  const backgroundBox = element('div', undefined, 'automation-box');
  const backgroundToggle = element('input'); backgroundToggle.type = 'checkbox';
  backgroundToggle.setAttribute('aria-label', 'Keep running in background');
  const backgroundLabel = element('label', undefined, 'toggle');
  backgroundLabel.append(element('span', 'Keep running in background'), backgroundToggle);
  const backgroundNote = element('p', 'Off · normal tab-switch pausing. Manual Pause always works.', 'subnote');
  backgroundBox.append(backgroundLabel, backgroundNote); automationSection.append(backgroundBox);
  rewardToggle.addEventListener('change', () => setAutoRewards(rewardToggle.checked), { signal: listeners.signal });
  backgroundToggle.addEventListener('change', () => setBackground(backgroundToggle.checked), { signal: listeners.signal });
  const locatorToggle = element('input'); locatorToggle.type = 'checkbox';
  locatorToggle.setAttribute('aria-label', 'Large ticket chest locator');
  const locatorLabel = element('label', undefined, 'toggle');
  locatorLabel.append(element('span', 'Large ticket chest locator'), locatorToggle);
  const locatorBox = element('div', undefined, 'locator-box');
  const locatorState = element('strong', 'Locator off'), locatorDetail = element('p', 'Enable to track loaded large chests.', 'subnote');
  locatorDetail.style.marginBottom = '0'; locatorBox.append(locatorState, locatorDetail);
  const retryLocator = element('button', 'Retry scan', 'action primary'); retryLocator.type = 'button'; retryLocator.style.width = '100%';
  locatorSection.append(locatorLabel, element('p', 'A golden arrow points toward the nearest loaded large locked chest—the one with tickets, coins, and XP.', 'subnote'),
    locatorBox, retryLocator,
    element('p', 'First fire a projectile to capture your player. Then walk into new terrain to capture the loaded map.', 'subnote'),
    element('p', 'Follow the straight-line direction around obstacles. Stay beside the chest for about 3.5 seconds to unlock it normally.', 'subnote'));
  locatorToggle.addEventListener('change', () => setLocator(locatorToggle.checked), { signal: listeners.signal });
  retryLocator.addEventListener('click', () => { locatorToggle.checked = true; locator.refresh(); }, { signal: listeners.signal });
  const spawnBox = element('div', undefined, 'locator-box');
  const spawnState = element('strong', 'Checking spawn runtime'), spawnDetail = element('p', undefined, 'subnote');
  const sourceLink = element('button', 'Connect saved objects', 'action primary'); sourceLink.type = 'button';
  sourceLink.addEventListener('click', () => connect(), { signal: listeners.signal });
  const sourceNote = element('p', 'In Chrome Console run queryObjects(Object). Right-click the resulting Array → Store as global variable. Then press Connect saved objects. No reload needed.', 'subnote');
  spawnBox.append(spawnState, spawnDetail, sourceLink, sourceNote); spawnsSection.append(spawnBox);
  const bossLabel = element('label', 'Rift boss species', 'setting-label'); bossLabel.htmlFor = 'ps-boss-species';
  const bossSelect = element('select'); bossSelect.id = bossLabel.htmlFor;
  function populateBosses() {
    const prior = bossSelect.value; bossSelect.replaceChildren();
    const random = element('option', 'Random rift legendary'); random.value = ''; bossSelect.append(random);
    for (const mon of gameRuntime?.DEX || []) if (mon.leg && gameRuntime.SPRITE_META[mon.dex]) {
      const option = element('option', `#${mon.dex} ${mon.name}`); option.value = String(mon.dex); bossSelect.append(option);
    }
    if ([...bossSelect.options].some(o => o.value === prior)) bossSelect.value = prior;
  }
  const bossCountLabel = element('label', 'Rift boss count', 'setting-label'); bossCountLabel.htmlFor = 'ps-boss-count';
  const bossCount = element('input'); bossCount.id = bossCountLabel.htmlFor; bossCount.type = 'number'; bossCount.min = '1'; bossCount.max = '3'; bossCount.value = '1'; bossCount.step = '1';
  const bossShiny = element('input'); bossShiny.type = 'checkbox'; bossShiny.setAttribute('aria-label', 'Shiny rift bosses');
  const bossShinyLabel = element('label', undefined, 'toggle'); bossShinyLabel.append(element('span', 'Shiny rift bosses'), bossShiny);
  const bossButton = element('button', 'Spawn rift bosses · no portal', 'action primary'); bossButton.type = 'button'; bossButton.style.width = '100%';
  const chestCountLabel = element('label', 'Treasure box count', 'setting-label'); chestCountLabel.htmlFor = 'ps-chest-count';
  const chestCount = element('input'); chestCount.id = chestCountLabel.htmlFor; chestCount.type = 'number'; chestCount.min = '1'; chestCount.max = '10'; chestCount.value = '1'; chestCount.step = '1';
  const chestActions = element('div', undefined, 'spawn-actions');
  const chestButton = element('button', 'Spawn normal boxes', 'action'); chestButton.type = 'button';
  const lockedChestButton = element('button', 'Spawn locked boxes', 'action primary'); lockedChestButton.type = 'button'; chestActions.append(chestButton, lockedChestButton);
  const specialSpawnNote = element('p', '', 'automation-note'); specialSpawnNote.setAttribute('role', 'status');
  spawnsSection.append(element('strong', 'Rift bosses on the map'), bossLabel, bossSelect, bossCountLabel, bossCount, bossShinyLabel, bossButton,
    element('p', 'Native rift boss stats, attacks and drops on your current map. No portal or teleport. Arena fusion rewards still require a real rift.', 'subnote'),
    element('strong', 'Treasure boxes'), chestCountLabel, chestCount, chestActions,
    element('p', 'Normal boxes break under attacks. Large locked boxes open after 3.5 seconds beside them and use the native ticket/coin/XP/item loot table. Nearby empty floor only; existing objects and broken tiles are preserved.', 'subnote'), specialSpawnNote);
  bossButton.addEventListener('click', () => spawnController.boss(bossSelect.value || null, bossCount.valueAsNumber, bossShiny.checked), { signal: listeners.signal });
  chestButton.addEventListener('click', () => spawnController.chests('chest', chestCount.valueAsNumber), { signal: listeners.signal });
  lockedChestButton.addEventListener('click', () => spawnController.chests('bigchest', chestCount.valueAsNumber), { signal: listeners.signal });
  const treasureHeading = element('strong', 'Treasure carriers');
  const treasureLabel = element('label', 'Treasure count', 'setting-label'); treasureLabel.htmlFor = 'ps-treasure-count';
  const treasureCount = element('input'); treasureCount.type = 'number'; treasureCount.id = treasureLabel.htmlFor;
  treasureCount.min = '1'; treasureCount.max = '10'; treasureCount.step = '1'; treasureCount.value = '1';
  treasureCount.style.width = '100%'; treasureCount.style.textAlign = 'left';
  treasureCount.addEventListener('change', () => { treasureCount.value = String(Number.isFinite(treasureCount.valueAsNumber) ? Math.max(1, Math.min(10, Math.floor(treasureCount.valueAsNumber))) : 1); }, { signal: listeners.signal });
  const treasureActions = element('div', undefined, 'spawn-actions');
  const meowthButton = element('button', 'Spawn Meowth · coins', 'action primary');
  const gholdengoButton = element('button', 'Spawn Gholdengo · ×10 ticket', 'action');
  meowthButton.type = gholdengoButton.type = 'button'; treasureActions.append(meowthButton, gholdengoButton);
  const treasureMessage = element('p', '', 'automation-note'); treasureMessage.setAttribute('role', 'status');
  spawnsSection.append(treasureHeading, treasureLabel, treasureCount, treasureActions, treasureMessage,
    element('p', 'These are the treasure versions: Meowth drops coins; Gholdengo drops coins and one special ×10 ticket. They spawn nearby, flee and escape after 15 seconds. Follow the game’s yellow arrow, defeat them, then collect the drops. Clear normal mobs preserves them; Defeat all enemies includes them.', 'subnote'));
  meowthButton.addEventListener('click', () => spawnController.treasure('meowth', treasureCount.valueAsNumber), { signal: listeners.signal });
  gholdengoButton.addEventListener('click', () => spawnController.treasure('gholdengo', treasureCount.valueAsNumber), { signal: listeners.signal });
  const spawnToggle = element('input'); spawnToggle.type = 'checkbox'; spawnToggle.setAttribute('aria-label', 'Enable spawn modifiers');
  const spawnLabel = element('label', undefined, 'toggle'); spawnLabel.append(element('span', 'Enable spawn modifiers'), spawnToggle);
  spawnsSection.append(spawnLabel);
  const spawnControls = new Map();
  function addSpawnControl(id, labelText, helpText, min, max, step, initial, unit) {
    const row = element('div', undefined, 'row'), top = element('div', undefined, 'row-head'), text = element('div');
    const label = element('label', labelText, 'name'); label.htmlFor = `ps-spawn-${id}`;
    text.append(label, element('div', helpText, 'help'));
    const value = element('div', undefined, 'value'), number = element('input'), range = element('input');
    number.type = 'number'; number.id = label.htmlFor; range.type = 'range'; range.setAttribute('aria-label', `${labelText} slider`);
    for (const input of [number, range]) {input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(initial);}
    value.append(number, element('span', unit)); top.append(text, value); row.append(top, range); spawnsSection.append(row);
    const update = input => {if(Number.isFinite(input.valueAsNumber))spawnController.setOptions({[id]:input.valueAsNumber});};
    number.addEventListener('input',()=>update(number),{signal:listeners.signal});
    number.addEventListener('change',()=>{if(Number.isFinite(number.valueAsNumber))update(number);else renderSpawnStatus(spawnController.info());},{signal:listeners.signal});
    range.addEventListener('input',()=>update(range),{signal:listeners.signal});
    spawnControls.set(id,{number,range});
  }
  addSpawnControl('rate','Swarm rate','Faster waves + swarm frequency',1,10,0.5,1,'×');
  addSpawnControl('shiny','Extra shiny chance','Chance for supported wild species',0,100,1,0,'%');
  const countLabel = element('label','Spawn count','setting-label'); countLabel.htmlFor='ps-spawn-count';
  const countInput=element('input');countInput.type='number';countInput.id=countLabel.htmlFor;
  countInput.min='1';countInput.max='50';countInput.step='1';countInput.value='10';
  countInput.style.width='100%';countInput.style.textAlign='left';
  countInput.addEventListener('change',()=>{countInput.value=String(Number.isFinite(countInput.valueAsNumber)?Math.max(1,Math.min(50,Math.floor(countInput.valueAsNumber))):10);},{signal:listeners.signal});
  const speciesLabel = element('label', 'Spawn species', 'setting-label'); speciesLabel.htmlFor = 'ps-species';
  const speciesSelect = element('select'); speciesSelect.id = speciesLabel.htmlFor;
  const speciesSearch = element('input'); speciesSearch.type = 'search'; speciesSearch.placeholder = 'Filter by Pokémon name or dex'; speciesSearch.setAttribute('aria-label', 'Filter spawn species');
  function populateSpecies() {
    const previous = speciesSelect.value, query = speciesSearch.value.toLowerCase().trim();
    speciesSelect.replaceChildren();
    const random = element('option', 'Current wild pool'); random.value = ''; speciesSelect.append(random);
    if (gameRuntime) for (const mon of gameRuntime.DEX) {
      if (!gameRuntime.SPRITE_META[mon.dex] || (query && !`${mon.dex} ${mon.name}`.toLowerCase().includes(query))) continue;
      const option = element('option', `#${mon.dex} ${mon.name}${gameRuntime.Sprites.hasShiny(mon.dex) ? ' ★' : ''}`); option.value = String(mon.dex); speciesSelect.append(option);
    }
    if (Array.from(speciesSelect.options).some(o => o.value === previous)) speciesSelect.value = previous;
  }
  speciesSearch.addEventListener('input', populateSpecies, { signal: listeners.signal }); populateSpecies();
  spawnsSection.append(speciesLabel, speciesSearch, speciesSelect);
  const spawnActions=element('div',undefined,'spawn-actions');
  const swarmButton=element('button','Spawn swarm','action primary'), shinyButton=element('button','Spawn shiny pack','action'), riftButton=element('button','Open rift','action rift-button');
  for(const button of [swarmButton,shinyButton,riftButton])button.type='button';
  spawnActions.append(swarmButton,shinyButton,riftButton);
  const spawnMessage=element('p','', 'automation-note');
  spawnsSection.append(countLabel,countInput,spawnActions,spawnMessage,
    element('p','Solo only. Mobs appear outside the camera and approach you. Native cap: 64 (bursts up to 74). Chosen species use normal wild-enemy behavior and scaling; use the treasure buttons above for Meowth/Gholdengo special drops. Spawned creatures, portals and move upgrades remain after Undo. Modded runs are marked as practice.','subnote'));
  spawnToggle.addEventListener('change',()=>{try{if(spawnToggle.checked)spawnController.enable();else spawnController.disable();}catch(error){spawnMessage.textContent=error.message;}renderSpawnStatus(spawnController.info());},{signal:listeners.signal});
  swarmButton.addEventListener('click',()=>spawnController.burst(countInput.valueAsNumber,false,speciesSelect.value || null),{signal:listeners.signal});
  shinyButton.addEventListener('click',()=>spawnController.burst(countInput.valueAsNumber,true,speciesSelect.value || null),{signal:listeners.signal});
  riftButton.addEventListener('click',()=>spawnController.openRift(),{signal:listeners.signal});
    const powerNote = element('p', 'Connect the game in Spawns to unlock these powers.', 'automation-note');
  const powerInputs = new Map();
  powersSection.append(element('p', 'Solo powers · apply immediately during a run. Undo all restores the ongoing modifiers.', 'subnote'));
  for (const [key, label, help] of [
    ['god', 'Invulnerability', 'Blocks the player’s normal and pure hurt calls.'],
    ['arsenal', 'All move slots at once', 'Every learned move fires on its own cooldown.'],
    ['stasis', 'Freeze enemy AI', 'Stops movement and new attacks. Existing hostile projectiles remain.'],
    ['vacuum', 'Global loot magnet', 'Pulls all existing drops toward you every half second.']
  ]) {
    const input = element('input'); input.type = 'checkbox'; input.setAttribute('aria-label', label);
    const row = element('label', undefined, 'toggle'); row.append(element('span', label), input);
    powersSection.append(row, element('p', help, 'subnote')); powerInputs.set(key, input);
    input.addEventListener('change', () => { try { powers.set({ [key]: input.checked }); } catch (error) { powerNote.textContent = error.message; } syncPowerControls(); }, { signal: listeners.signal });
  }
  for (const [key, label, min, max, step, value] of [
    ['radial', 'Extra radial shots', 0, 8, 1, 0], ['homing', 'Homing strength', 0, 20, 1, 0],
    ['pierce', 'Extra pierce', 0, 30, 1, 0], ['area', 'Attack area multiplier', 1, 5, 0.5, 1]
  ]) {
    const row = element('div', undefined, 'row'), labelEl = element('label', label, 'name');
    const input = element('input'); input.type = 'number'; input.id = `ps-power-${key}`; labelEl.htmlFor = input.id;
    Object.assign(input, { min: String(min), max: String(max), step: String(step), value: String(value) });
    const top = element('div', undefined, 'row-head'); top.append(labelEl, input);
    row.append(top); powersSection.append(row); powerInputs.set(key, input);
    input.addEventListener('change', () => { try { powers.set({ [key]: input.valueAsNumber }); } catch (error) { powerNote.textContent = error.message; } syncPowerControls(); }, { signal: listeners.signal });
  }
  const powerActions = element('div', undefined, 'spawn-actions');
  for (const [name, label] of [['heal', 'Heal to full'], ['loot', 'Pull all loot'], ['maxMoves', 'Max learned moves'], ['evolve', 'Evolve eligible moves']]) {
    const button = element('button', label, 'action'); button.type = 'button';
    button.addEventListener('click', () => powers.action(name), { signal: listeners.signal }); powerActions.append(button);
  }
  const runActions = element('div', undefined, 'run-actions');
  const clearNormalButton = element('button', 'Clear normal mobs', 'action'), defeatAllButton = element('button', 'Defeat all enemies', 'action');
  const deathButton = element('button', 'Death · kill my player', 'action danger');
  for (const [button, action] of [[clearNormalButton, 'clearNormal'], [defeatAllButton, 'defeatAll'], [deathButton, 'death']]) {
    button.type = 'button'; button.addEventListener('click', () => powers.action(action), { signal: listeners.signal });
    runActions.append(button);
  }
  powersSection.prepend(element('strong', 'Run actions'), runActions,
    element('p', 'Death defeats your player even with god mode or Focus Sash, and resumes a paused run. In a rift, normal arena defeat applies. Clear normal mobs preserves shinies, bosses and treasure carriers; Defeat all includes them.', 'subnote'));
  const preset = element('button', 'Overpowered preset', 'action primary'); preset.type = 'button';
  preset.addEventListener('click', () => {
    try {
      powers.set({ god: true, arsenal: true, radial: 3, homing: 8, pierce: 10, area: 2, vacuum: true });
      for (const [key, value] of [['damage', 25], ['attackSpeed', 4], ['pickup', 10], ['xp', 5]]) updateSetting(key, value);
    } catch (error) { powerNote.textContent = error.message; }
    syncPowerControls();
  }, { signal: listeners.signal });
  const radarText = element('pre', 'No rare targets currently loaded.', 'subnote'); radarText.style.whiteSpace = 'pre-wrap';
  powersSection.append(preset, powerActions, powerNote,
    element('p', 'Max moves and evolution last for this run. Evolution respects the required stat card. Radial shots apply to moving player projectiles; orbits and boomerangs are excluded. Projectile count is bounded at 650 for extra copies.', 'subnote'),
    element('strong', 'Rare target radar'), radarText);
  function syncPowerControls() {
    if (!powers) return;
    const data = powers.info();
    for (const [key, input] of powerInputs) {
      if (input.type === 'checkbox') input.checked = data[key]; else input.value = String(data[key]);
    }
  }
  function renderPowerStatus(data) { powerNote.textContent = data.message || 'Powers off.'; syncPowerControls(); }
  function renderRadar() {
    const targets = powers.radar();
    const target = selectRareTarget(targets, rareMode);
    rareGuide.hidden = !rareGuideEnabled;
    rareTitle.textContent = target?.name || 'No matching rare target loaded';
    rareDetail.textContent = target ? `${target.direction} · ${target.distance} units` : 'Explore farther or change the target type.';
    rareArrow.hidden = !target;
    if (target) rareArrow.style.transform = `rotate(${target.angle}rad)`;
    radarText.textContent = targets.length ? targets.slice(0, 8).map(t => `${t.name} · ${t.direction} · ${t.distance} units`).join('\n') : 'No rare targets currently loaded.';
  }

  const rareToggle = element('input'); rareToggle.type = 'checkbox'; rareToggle.setAttribute('aria-label', 'Rare target direction arrow');
  const rareLabel = element('label', undefined, 'toggle'); rareLabel.append(element('span', 'Rare target direction arrow'), rareToggle);
  const rareSelect = element('select'); rareSelect.setAttribute('aria-label', 'Rare target type');
  for (const [value, text] of [['auto', 'Auto: shiny → rift → boss'], ['shiny', 'Nearest shiny'], ['rift', 'Active rift'], ['boss', 'Nearest boss']]) {
    const option = element('option', text); option.value = value; rareSelect.append(option);
  }
  rareToggle.addEventListener('change', () => { rareGuideEnabled = rareToggle.checked; renderRadar(); }, { signal: listeners.signal });
  rareSelect.addEventListener('change', () => { rareMode = rareSelect.value; renderRadar(); }, { signal: listeners.signal });
  locatorSection.append(rareLabel, rareSelect, element('p', 'The green guide stays visible when the panel is minimized. It points straight toward a loaded target; navigate around obstacles. Auto prefers shinies, then portals, then bosses.', 'subnote'));
  const actions = element('div', undefined, 'actions');
  const capture = element('button', 'Capture player', 'action primary');
  const undoButton = element('button', 'Undo all', 'action');
  capture.type = undoButton.type = 'button'; actions.append(capture, undoButton);
  const footer = element('div', undefined, 'footer');
  const remove = element('button', 'Remove panel', 'remove'); remove.type = 'button';
  footer.append(element('span', 'Drag header · New run? Capture again'), remove);
  body.append(actions, footer); panel.append(header, body);
  const mini = element('button', '◈  Mod controls', 'mini'); mini.type = 'button'; mini.hidden = true;
  const guide = element('div', undefined, 'locator-guide'); guide.hidden = true; guide.setAttribute('aria-label', 'Large chest direction guide');
  const guideTitle = element('div', 'Large ticket chest', 'locator-title');
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  arrow.setAttribute('viewBox', '0 0 64 64'); arrow.setAttribute('class', 'locator-arrow'); arrow.setAttribute('aria-hidden', 'true');
  const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  arrowPath.setAttribute('d', 'M32 6 L53 31 H40 V56 H24 V31 H11 Z'); arrowPath.setAttribute('fill', '#ffd56d');
  arrow.append(arrowPath);
  const guideDetail = element('div', undefined, 'locator-detail');
  const progress = element('div', undefined, 'locator-progress'), progressFill = element('div', undefined, 'locator-fill');
  progress.append(progressFill); progress.hidden = true; guide.append(guideTitle, arrow, guideDetail, progress);
  const rareGuide = element('div', undefined, 'rare-guide'); rareGuide.hidden = true; rareGuide.setAttribute('role', 'status'); rareGuide.setAttribute('aria-label', 'Rare target direction guide');
  const rareTitle = element('span', 'Rare target guide', 'rare-title'), rareArrow = element('span', '➤', 'rare-arrow'), rareDetail = element('span');
  rareArrow.setAttribute('aria-hidden', 'true'); rareGuide.append(rareTitle, rareArrow, rareDetail);
  root.append(style, panel, mini, guide, rareGuide);
  document.body.append(host);

  function renderSpawnStatus(data) {
    spawnState.textContent=data.connected?'Spawn runtime ready':'Connect the normal game page';
    spawnDetail.textContent=data.connected
      ? `${data.count} mobs · normal cap ${data.cap}. ${data.playing?'Solo run active.':'Start or resume a solo run.'}`
      : 'One-time Console connection required. See the instructions below.';
    sourceLink.hidden=sourceNote.hidden=data.connected;
    spawnToggle.disabled=!data.connected;spawnToggle.checked=data.enabled;
    for(const [id,control] of spawnControls){control.number.value=control.range.value=String(data[id]);control.number.disabled=control.range.disabled=!data.connected;}
    for(const button of [swarmButton,shinyButton,riftButton])button.disabled=!data.connected||!data.playing;
    for (const button of [meowthButton, gholdengoButton]) button.disabled = !data.treasureReady || !data.playing;
    treasureCount.disabled = !data.treasureReady; treasureMessage.textContent = data.message;
    bossButton.disabled = !data.treasureReady || !data.playing;
    const chestReady = data.playing && typeof gameRuntime?.World?.kindAt === 'function' && Number.isFinite(gameRuntime?.World?.TS);
    chestButton.disabled = lockedChestButton.disabled = !chestReady;
    specialSpawnNote.textContent = data.message;
    countInput.disabled=!data.connected;spawnMessage.textContent=data.message;
  }

  function renderLocator(data) {
    locatorState.textContent = data.title;
    locatorDetail.textContent = data.detail + (data.count ? ` · ${data.count} large chest${data.count === 1 ? '' : 's'} loaded` : '');
    guideTitle.textContent = data.title; guideDetail.textContent = data.detail;
    if (data.state === 'error') locatorToggle.checked = false;
    guide.hidden = !locatorToggle.checked;
    arrow.toggleAttribute('hidden', data.state !== 'found');
    if (data.state === 'found') arrow.style.transform = `rotate(${data.angle}rad)`;
    progress.hidden = data.state !== 'found' || !data.near;
    progressFill.style.width = `${Math.round((data.progress || 0) * 100)}%`;
  }
  function setLocator(enabled) {
    locatorToggle.checked = !!enabled;
    if (enabled) locator.enable(); else locator.disable();
    locatorToggle.checked = locator.enabled;
    if (!locator.enabled) {
      guide.hidden = true; locatorState.textContent = 'Locator off'; locatorDetail.textContent = 'Enable to track loaded large chests.';
    }
    return locator.enabled;
  }

  function queueRewardCheck() {
    if (!rewardsEnabled || rewardQueued || destroyed) return;
    rewardQueued = true;
    queueMicrotask(() => { rewardQueued = false; if (!destroyed) autoChooseReward(); });
  }
  function autoChooseReward() {
    if (!rewardsEnabled || pickingReward) return;
    const screen = document.getElementById('scr-levelup'), box = document.getElementById('cards');
    if (!screen || !box || screen.classList.contains('hidden') || box.classList.contains('done')) return;
    const cards = Array.from(box.querySelectorAll('.card')).filter(card => !selectedCards.has(card)).map(node => {
      const name = node.querySelector('.nm'), chip = node.querySelector('.tag-chip');
      const title = name ? Array.from(name.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim() : '';
      return { node, title, category: classifyReward(title, chip?.textContent, node.classList.contains('evo')) };
    });
    const picked = chooseReward(cards, rewardPolicy, getBuildRewardContext(gameRuntime));
    if (!picked) {
      if (cards.length) autoNote.textContent = 'No preferred reward offered · waiting for your choice.';
      return;
    }
    pickingReward = true; selectedCards.add(picked.node);
    try {
      picked.node.click();
      autoNote.textContent = `Last auto pick: ${picked.title || 'offered reward'}`;
    } catch (error) {
      setAutoRewards(false); autoNote.textContent = `Auto selection stopped: ${error.message}`;
    } finally { pickingReward = false; }
  }
  function setAutoRewards(enabled) {
    rewardObserver?.disconnect(); rewardObserver = null;
    rewardsEnabled = !!enabled; rewardToggle.checked = rewardsEnabled;
    if (!rewardsEnabled) { autoNote.textContent = 'Off · choose rewards manually.'; return false; }
    const screen = document.getElementById('scr-levelup');
    if (!screen) { rewardsEnabled = false; rewardToggle.checked = false; autoNote.textContent = 'Level-up screen not found. Wait for the game to load.'; return false; }
    rewardObserver = new MutationObserver(queueRewardCheck);
    rewardObserver.observe(screen, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    autoNote.textContent = 'On · waiting for the next level-up offer.'; queueRewardCheck(); return true;
  }
  function setBackground(enabled) {
    try {
      if (enabled) background.enable(); else background.disable();
      backgroundToggle.checked = background.enabled;
      backgroundNote.textContent = background.enabled
        ? 'On · tab-switch pause blocked, with background frame fallback. Chrome can still throttle or suspend the tab.'
        : 'Off · normal tab-switch pausing. Manual Pause always works.';
      return background.enabled;
    } catch (error) {
      backgroundToggle.checked = false; backgroundNote.textContent = `Background mode unavailable: ${error.message}`; return false;
    }
  }

  function message(kind, title, detail) {
    status = kind; stateEl.dataset.state = kind; stateText.textContent = title;
    hint.textContent = detail;
  }
  function syncControls() {
    for (const spec of specs) {
      const control = controls.get(spec.id);
      control.number.value = control.range.value = String(settings[spec.id]);
    }
  }
  function transfer(next) {
    if (!player) return;
    const changes = specs.map(spec => {
      const descriptor = Object.getOwnPropertyDescriptor(player, spec.field);
      const before = descriptor?.value;
      if (!descriptor?.writable || !Number.isFinite(before) || before <= 0) {
        throw new Error(`Cannot adjust ${spec.label.toLowerCase()} on this player.`);
      }
      const ratio = spec.inverse ? applied[spec.id] / next[spec.id] : next[spec.id] / applied[spec.id];
      const after = before * ratio;
      if (!Number.isFinite(after) || after <= 0) throw new Error('Invalid stat value.');
      return { field: spec.field, before, after };
    });
    const changed = [];
    try {
      for (const change of changes) { player[change.field] = change.after; changed.push(change); }
    } catch (error) {
      for (const change of changed.reverse()) player[change.field] = change.before;
      throw error;
    }
    for (const spec of specs) applied[spec.id] = next[spec.id];
  }
  function updateSetting(id, value) {
    const spec = specs.find(s => s.id === id);
    if (!spec || typeof value !== 'number' || !Number.isFinite(value)) {
      syncControls(); throw new Error('Use a valid numeric setting.');
    }
    const next = { ...settings, [id]: Math.round(Math.max(spec.min, Math.min(spec.max, value)) * 1000) / 1000 };
    try {
      transfer(next);
      Object.assign(settings, next); syncControls();
      if (player) message('active', 'Player captured · settings active', 'Changes affect future attacks. Upgrades continue to work.');
      return { ...settings };
    } catch (error) {
      syncControls(); message('error', 'Setting could not be applied', error.message);
      return null;
    }
  }
  function cancelWatch() { if (stopWatch) stopWatch(); }
  function restorePlayer() {
    transfer(Object.fromEntries(specs.map(s => [s.id, 1])));
  }
  function undoAll() {
    setAutoRewards(false); itemAutomation?.reset(); setBackground(false);
    setLocator(false); rareGuideEnabled = false; rareToggle.checked = false; rareGuide.hidden = true;
    rewardPolicy.smart = false; smartRewardsToggle.checked = false;
    spawnController?.reset(); powers?.reset(); syncPowerControls();
    cancelWatch();
    try {
      restorePlayer();
      for (const spec of specs) settings[spec.id] = 1;
      syncControls();
      message('idle', 'All modifiers removed', 'Normal run stats restored. Adjust a control to apply it again.');
      return true;
    } catch (error) { message('error', 'Could not restore player', error.message); return false; }
  }
  function validPlayer(candidate) {
    return candidate && own(candidate, 'remote') !== true &&
      Array.isArray(own(candidate, 'slots')) && own(candidate, 'mon') && own(candidate, 'buffs') &&
      Number.isFinite(own(candidate, 'baseAtk')) && own(candidate, 'baseAtk') > 0 &&
      specs.every(spec => {
        const d = Object.getOwnPropertyDescriptor(candidate, spec.field);
        return d?.writable && Number.isFinite(d.value) && d.value > 0;
      });
  }
  function arm() {
    if (destroyed) return;
    cancelWatch();
    try { restorePlayer(); } catch (error) { message('error', 'Could not release player', error.message); return; }
    player = null;
    const directPlayer=gameRuntime?.Game?.player;
    if(validPlayer(directPlayer)){
      player=directPlayer;
      try{transfer(settings);message('active','Player captured · settings active','Game runtime connected. Adjust any control below.');}
      catch(error){player=null;message('error','Player capture failed',error.message);}
      return;
    }
    const descriptor = Object.getOwnPropertyDescriptor(Array.prototype, 'push');
    if (!descriptor?.configurable || typeof descriptor.value !== 'function') {
      message('error', 'Capture unavailable', 'Reload the page and try again.'); return;
    }
    const original = descriptor.value;
    let watching = true;
    function stop() {
      watching = false; clearTimeout(watchTimer);
      if (Array.prototype.push === watchPush) Object.defineProperty(Array.prototype, 'push', descriptor);
      if (stopWatch === stop) stopWatch = null;
    }
    function watchPush(...items) {
      if (watching) {
        try {
          for (const item of items) {
            const owner = own(item, 'owner'), damage = own(item, 'dmg');
            if (!Number.isFinite(damage) || damage <= 0 || own(item, 'ghost') === true ||
                own(item, 'friendly') === false || !validPlayer(owner)) continue;
            const damageDescriptor = Object.getOwnPropertyDescriptor(item, 'dmg');
            if (!damageDescriptor?.writable) continue;
            stop(); player = owner;
            try {
              transfer(settings);
              item.dmg = damage * settings.damage;
            } catch (error) { restorePlayer(); player = null; throw error; }
            message('active', 'Player captured · settings active', 'Melee + ranged damage boosted. Adjust any control below.');
            break;
          }
        } catch (error) { stop(); message('error', 'Capture stopped', error.message); }
      }
      return Reflect.apply(original, this, items);
    }
    stopWatch = stop;
    Object.defineProperty(Array.prototype, 'push', { ...descriptor, value: watchPush });
    watchTimer = setTimeout(() => {
      stop(); message('idle', 'No player captured', 'Select a projectile move, click Capture player, and resume.');
    }, 60000);
    message('waiting', 'Waiting for player', 'Resume and fire a projectile once. Settings apply after capture.');
  }
  function destroy() {
    if (destroyed) return;
    if (!undoAll()) throw new Error('Restore the player before removing the panel.');
    destroyed = true; clearInterval(spawnInterval); listeners.abort(); host.remove();
    if (window[KEY] === api) delete window[KEY];
    player = null;
  }
  capture.addEventListener('click', arm, { signal: listeners.signal });
  undoButton.addEventListener('click', undoAll, { signal: listeners.signal });
  remove.addEventListener('click', destroy, { signal: listeners.signal });
  minimize.addEventListener('click', () => { panel.hidden = true; mini.hidden = false; }, { signal: listeners.signal });
  mini.addEventListener('click', () => { panel.hidden = false; mini.hidden = true; }, { signal: listeners.signal });
  for (const type of ['keydown', 'keyup', 'mousedown', 'mouseup', 'mousemove', 'pointerdown', 'pointerup', 'click', 'touchstart', 'touchmove', 'touchend']) {
    host.addEventListener(type, event => event.stopPropagation(), { signal: listeners.signal });
  }
  let drag = null;
  header.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    const rect = host.getBoundingClientRect();
    drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    header.setPointerCapture(event.pointerId); event.preventDefault();
  }, { signal: listeners.signal });
  header.addEventListener('pointermove', event => {
    if (!drag) return;
    const rect = host.getBoundingClientRect();
    host.style.left = `${Math.max(8, Math.min(innerWidth - rect.width - 8, event.clientX - drag.x))}px`;
    host.style.top = `${Math.max(8, Math.min(innerHeight - Math.min(rect.height, 80) - 8, event.clientY - drag.y))}px`;
    host.style.right = 'auto';
  }, { signal: listeners.signal });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    header.addEventListener(type, () => { drag = null; }, { signal: listeners.signal });
  }
  locator = createChestLocator(window, () => player, renderLocator);
  powers=createPowerController(()=>gameRuntime, renderPowerStatus);
  itemAutomation = createItemAutomation(() => gameRuntime, data => { itemToggle.checked = data.enabled; itemNote.textContent = data.message; });
  spawnController=createSpawnController(()=>gameRuntime,renderSpawnStatus, { prepare: () => locator.prepareCapture(), ready: map => locator.useMap(map) });
  renderSpawnStatus(spawnController.info());
  spawnInterval=setInterval(()=>{
    try {
      const next = gameRuntime?.Game?.player;
      if (validPlayer(next) && next !== player) arm();
      if (gameRuntime && !gameRuntime.Coop?.active && gameRuntime.Game.state === 'playing' && specs.some(s => settings[s.id] !== 1)) gameRuntime.Game.debugTime?.(gameRuntime.Game.st.time);
      renderSpawnStatus(spawnController.info()); renderRadar();
      const r = gameRuntime, p = r?.Game.player, solo = r && !r.Coop?.active;
      deathButton.disabled = !solo || !p || p.dead || !['playing', 'paused'].includes(r.Game.state) || !!r.Judgment?.cinematic;
      clearNormalButton.disabled = defeatAllButton.disabled = !solo || !p || p.dead || r.Game.state !== 'playing';
    } catch (error) { powerNote.textContent = error.message; }
  },750);
  const api = Object.freeze({ version: VERSION, capture: arm, undo: undoAll, destroy,
    set: updateSetting, autoRewards: setAutoRewards, background: setBackground,
    locator: setLocator, rescanChests: () => locator.refresh(),
    spawns: spawnController, powers, items: itemAutomation, connect,
    smartRewards(value) { rewardPolicy.smart = !!value; smartRewardsToggle.checked = rewardPolicy.smart; queueRewardCheck(); return rewardPolicy.smart; },
    rareGuide(value, mode = rareMode) { if (!['auto', 'shiny', 'rift', 'boss'].includes(mode)) throw new Error('Choose auto, shiny, rift, or boss.'); rareMode = mode; rareSelect.value = mode; rareGuideEnabled = !!value; rareToggle.checked = rareGuideEnabled; renderRadar(); return rareGuideEnabled; },
    get automation() { return { rewards: rewardsEnabled, items: itemAutomation.info(), background: background.enabled, ...rewardPolicy }; },
    get settings() { return { ...settings }; }, get status() { return status; } });
  Object.defineProperty(window, KEY, { configurable: true, value: api });
  if (!connect()) arm();
})();
