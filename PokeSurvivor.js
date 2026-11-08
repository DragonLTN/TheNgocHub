// ==UserScript==
// @name         TheNgocHub2.0
// @namespace    local.pokesurvivor.thengochub
// @version      2.0
// @description  IB My TikTok @dragonltn
// @author       DagonLTN
// @match        *://pokesurvivor.com/*
// @match        *://www.pokesurvivor.com/*
// @icon         https://pokesurvivor.com/assets/icons/icon-96.png
// @run-at       document-end
// @grant        none
// @license      PolyForm-Noncommercial-1.0.0
// @downloadURL https://raw.githubusercontent.com/DragonLTN/TheNgocHub/refs/heads/main/PokeSurvivor.js
// @updateURL https://raw.githubusercontent.com/DragonLTN/TheNgocHub/refs/heads/main/PokeSurvivor.js
// ==/UserScript==

// =========================================================================
// DISCLAIMER & LICENSE
// =========================================================================
//
// TheNgocHub2.0
// DragonLTN
//
// This script is provided for educational and personal study purposes only.
// It does not contain any copyrighted assets (sprites, music, character names).
// It is not affiliated with, endorsed by, or sponsored by Nintendo, Creatures Inc.,
// GAME FREAK, or The Pokémon Company.
//
// The game pokesurvivor.com uses Pokémon assets without authorization.
// This script merely modifies the game's client-side behavior.
// The author assumes no responsibility for how the game is used.
//
// LICENSE: PolyForm Noncommercial License 1.0.0
// You are free to use, study, and modify this script for non-commercial purposes.
// You may distribute copies and modified versions, provided you include this
// license and the required notice below.
//
// Required Notice: Copyright (c) 2026 Rekcheli
//
// For full terms, see: https://polyformproject.org/licenses/noncommercial/1.0.0
//
// MAINTENANCE: This script is open for anyone to fork, improve, and maintain.
// If you find this useful, feel free to create your own version.
// =========================================================================

(function () {
  'use strict';

  if (window.top !== window.self) return;
  if (document.getElementById('ps-ultimate-panel')) return;

  // =========================================================================
  // AUTO-REDIRECT & URL MASKING
  // =========================================================================
  const useDev = localStorage.getItem('ps_use_dev_version') === 'true';

  if (useDev) {
    // Se il toggle è ON, forziamo l'ingresso nella dev
    if (location.pathname === '/' || location.pathname === '/index.html') {
      location.replace('/dev.html' + location.search + location.hash);
      return;
    }
  }
  // Se il toggle è OFF, non facciamo nulla: l'utente resta dove vuole (main o dev)

  // =========================================================================
  // SHARED STATE & CONFIGURATION
  // =========================================================================
  const toggles = {
    // Trainer Sliders
    vitality: false, strength: false, stride: false, reflexes: false,
    armor: false, synthesis: false, magnet: false, wisdom: false,
    fortune: false, critical: false, reroll: false,
    vitalitySlider: 0, strengthSlider: 0, strideSlider: 0, reflexesSlider: 0,
    armorSlider: 0, synthesisSlider: 0, magnetSlider: 0, wisdomSlider: 0,
    fortuneSlider: 0, criticalSlider: 0,

    // Trainer Toggles
    godmode: false, automagnet: false, shinygacha: false, autoRift: false,
    autolevel: false, autolevelAll: false,
    fly: false, autoEvade: false, autoSwarm: false,

    // HUD
    hudPanel: true, hudFov: true, hudHp: true, hudXp: true,
    hudRing: true, hudSupport: true, hudHaz: true,
    hudMagnetCircle: false, hudArrows: true, hudPoi: true, instantChest: false,
    hudAlerts: true,
    hudAtk: true, hudSpd: true, hudRed: true, hudRegen: true, hudCrit: true,
    hudKills: true, hudCoins: true, hudCd: true, hudXpMul: true, hudCoinMul: true, hudMagnet: true
  };

  const HUdCFG_KEY = 'ps_hud_cfg';
  const hudCfg = {
    hpbar: 'big',
    zoom: parseFloat(localStorage.getItem('ps_zoom')) || 1,
    pos: null,
    hiddenStats: {},
    poiRange: 2000
  };

  // inizio funzione loadHudCfg
  function loadHudCfg() {
    try {
      const saved = JSON.parse(localStorage.getItem(HUdCFG_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        Object.assign(hudCfg, saved);
      }
    } catch (_) {}
  }
  // fine funzione loadHudCfg

  // inizio funzione saveHudCfg
  function saveHudCfg() {
    try { localStorage.setItem(HUdCFG_KEY, JSON.stringify(hudCfg)); } catch (_) {}
  }
  // fine funzione saveHudCfg
  loadHudCfg();

  // =========================================================================
  // LAYOUT PERSISTENCE
  // =========================================================================
  try {
    const savedToggles = JSON.parse(localStorage.getItem('ps_ultimate_toggles') || '{}');
    for (const k in savedToggles) {
      if (toggles[k] !== undefined) toggles[k] = savedToggles[k];
    }
  } catch (_) {}

  // inizio funzione saveToggles
  function saveToggles() {
    try { localStorage.setItem('ps_ultimate_toggles', JSON.stringify(toggles)); } catch (_) {}
  }
  // fine funzione saveToggles

  const LAYOUT_KEY = 'ps_ultimate_layout_v1';

  const layout = {
    panel: { left: null, top: null, width: 420, height: null, opacity: 0.96, blur: true },
    hud: { left: null, top: null, width: 220, height: null, opacity: 0.85, blur: true }
  };

  // inizio funzione loadLayout
  function loadLayout() {
    try {
      const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        if (saved.panel) Object.assign(layout.panel, saved.panel);
        if (saved.hud) Object.assign(layout.hud, saved.hud);
      }
    } catch (_) {}
  }
  // fine funzione loadLayout

  // inizio funzione saveLayout
  function saveLayout() {
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch (_) {}
  }
  // fine funzione saveLayout
  loadLayout();

  // inizio funzione clampLayoutRect
  function clampLayoutRect(rect, minW, minH) {
    const w = Math.max(minW, Math.min(window.innerWidth - 20, rect.width || minW));
    const h = rect.height ? Math.max(minH, Math.min(window.innerHeight - 20, rect.height)) : null;
    let left = rect.left;
    let top = rect.top;
    if (left === null || left === undefined) left = Math.max(10, window.innerWidth - w - 16);
    if (top === null || top === undefined) top = Math.max(10, Math.min(80, window.innerHeight - 200));
    left = Math.max(0, Math.min(window.innerWidth - w, left));
    if (h !== null) top = Math.max(0, Math.min(window.innerHeight - h, top));
    return { left, top, width: w, height: h };
  }
  // fine funzione clampLayoutRect

  // inizio funzione applyOpacity
  function applyOpacity(el, opacity, blur) {
    const base = el.dataset.baseBg || 'rgba(10, 15, 29, 0.96)';
    if (!el.dataset.baseBg) el.dataset.baseBg = base;
    if (blur) {
      const m = base.match(/rgba?\(([^)]+)\)/);
      if (m) {
        const parts = m[1].split(',').map(s => s.trim());
        const r = parts[0], g = parts[1], b = parts[2];
        el.style.background = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
      el.style.backdropFilter = 'blur(10px)';
      el.style.webkitBackdropFilter = 'blur(10px)';
    } else {
      el.style.background = 'transparent';
      el.style.backdropFilter = 'none';
      el.style.webkitBackdropFilter = 'none';
    }
  }
  // fine funzione applyOpacity

  const DEFAULT_PRIORITY = ['atk', 'cd', 'def', 'xp', 'spd', 'mag', 'hp', 'rgn', 'heal'];
  let statPriority = JSON.parse(localStorage.getItem('ps_ultimate_priority')) || [...DEFAULT_PRIORITY];
  let levelUpHooked = false;

  const TAG = '[TheNgocHub2.0]';
  const log = (...a) => console.log(TAG, ...a);

  // =========================================================================
  // GAME ACCESS
  // =========================================================================
  const G = () => window.G;

  // inizio funzione getPlayer
  function getPlayer() {
    const g = G();
    return (g && g.Game && g.Game.player) || null;
  }
  // fine funzione getPlayer

  // inizio funzione modifySave
  function modifySave(callback) {
    const g = G();
    if (g && g.DB && g.DB.save) {
      callback(g.DB.save);
      g.DB.commit();
      if (g.UI && g.UI.refreshCoins) g.UI.refreshCoins();
      return true;
    }
    let updated = false;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('ps.save.') || k.startsWith('ps.cloud.'))) {
        try {
          const data = JSON.parse(localStorage.getItem(k));
          callback(data);
          localStorage.setItem(k, JSON.stringify(data));
          updated = true;
        } catch (e) { console.error(TAG, 'Save error:', e); }
      }
    }
    return updated;
  }
  // fine funzione modifySave

  // inizio funzione addCoins
  const addCoins = n => modifySave(s => { s.coins = Math.max(0, (s.coins || 0) + n); });
  // fine funzione addCoins

  // inizio funzione addGoldTickets
  const addGoldTickets = n => modifySave(s => { s.tickets = s.tickets || { t1: 0, t10: 0 }; s.tickets.t1 = Math.max(0, (s.tickets.t1 || 0) + n); });
  // fine funzione addGoldTickets

  // inizio funzione addPurpleTickets
  const addPurpleTickets = n => modifySave(s => { s.tickets = s.tickets || { t1: 0, t10: 0 }; s.tickets.t10 = Math.max(0, (s.tickets.t10 || 0) + n); });
  // fine funzione addPurpleTickets

  // =========================================================================
  // HOOKS & LOGIC
  // =========================================================================

  // inizio funzione installLevelUpHook
  function installLevelUpHook() {
    if (levelUpHooked) return;
    const g = G();
    if (!g || !g.LevelUp || typeof g.LevelUp.offer !== 'function') return;
    if (!g.RunUI || typeof g.RunUI.pick !== 'function') return;

    const originalOffer = g.LevelUp.offer;
    g.LevelUp.offer = function (...args) {
      const cards = originalOffer.apply(this, args);
      if (!toggles.autolevel && !toggles.autolevelAll) return cards;
      if (!Array.isArray(cards) || !cards.length) return cards;

      let bestIndex = -1, bestRank = Infinity;
      let firstMoveIndex = -1;

      cards.forEach((card, i) => {
        const key = String(card.key || '');
        if (key.startsWith('stat:')) {
          const id = key.slice(5);
          const rank = statPriority.indexOf(id);
          if (rank !== -1 && rank < bestRank) {
            bestRank = rank;
            bestIndex = i;
          }
        } else {
          if (firstMoveIndex === -1) firstMoveIndex = i;
        }
      });

      // NUOVA LOGICA: Se c'è almeno una mossa e siamo in modalità "Stats", lascia scegliere all'utente
      if (toggles.autolevel && !toggles.autolevelAll && firstMoveIndex !== -1) {
        return cards;
      }

      if (bestIndex === -1) {
        if (toggles.autolevelAll && firstMoveIndex !== -1) {
          bestIndex = firstMoveIndex;
        } else {
          return cards;
        }
      }

      setTimeout(() => {
        try {
          g.RunUI.pick(bestIndex);
          log('Auto-pick (delayed)', bestIndex, cards[bestIndex]);
        }
        catch (e) {
          console.error(TAG, 'Auto-pick failed', e);
        }
      }, 1500);
        return cards;
    };

      levelUpHooked = true;
      log('LevelUp.offer hook installed with delay');
  }
    // fine funzione installLevelUpHook

    // inizio funzione unlockAllDex
  function unlockAllDex() {
    return modifySave(save => {
      save.owned = save.owned || {};
      save.shiny = save.shiny || {};
      const g = G();
      const dexList = (g && g.DEX) ? g.DEX : Array.from({ length: 1025 }, (_, i) => ({ dex: i + 1 }));
      for (const p of dexList) {
        save.owned[p.dex] = { at: Date.now(), from: 'gacha' };
        save.shiny[p.dex] = { at: Date.now(), from: 'gacha' };
      }
      save.stats = save.stats || {};
      save.stats.shinies = Object.keys(save.shiny).length;
    });
  }
  // fine funzione unlockAllDex

  // inizio funzione unlockSinglePokemon
  function unlockSinglePokemon(query, isShiny = false) {
    if (!query) return null;
    const q = String(query).trim().toLowerCase();
    let targetDex = parseInt(q, 10);
    let targetName = '';
    const g = G();
    if (isNaN(targetDex) || targetDex <= 0) {
      if (g && g.DEX) {
        const found = g.DEX.find(p => p.name.toLowerCase() === q || p.name.toLowerCase().includes(q));
        if (found) { targetDex = found.dex; targetName = found.name; }
      }
    }
    if (!targetDex || isNaN(targetDex)) return null;
    modifySave(save => {
      save.owned = save.owned || {};
      save.shiny = save.shiny || {};
      if (isShiny && !save.owned[targetDex]) return;
      save.owned[targetDex] = save.owned[targetDex] || { at: Date.now(), from: 'gacha' };
      if (isShiny) {
        save.shiny[targetDex] = { at: Date.now(), from: 'gacha' };
        save.stats = save.stats || {};
        save.stats.shinies = Object.keys(save.shiny).length;
      }
    });
    return targetName || '#' + targetDex;
  }
  // fine funzione unlockSinglePokemon

  // inizio funzione lockAllDex
  function lockAllDex() {
    return modifySave(save => {
      save.owned = {};
      save.shiny = {};
      save.stats = save.stats || {};
      save.stats.shinies = 0;
    });
  }
  // fine funzione lockAllDex

  // inizio funzione lockSinglePokemon
  function lockSinglePokemon(query, isShiny = false) {
    if (!query) return null;
    const q = String(query).trim().toLowerCase();
    let targetDex = parseInt(q, 10);
    let targetName = '';
    const g = G();
    if (isNaN(targetDex) || targetDex <= 0) {
      if (g && g.DEX) {
        const found = g.DEX.find(p => p.name.toLowerCase() === q || p.name.toLowerCase().includes(q));
        if (found) { targetDex = found.dex; targetName = found.name; }
      }
    }
    if (!targetDex || isNaN(targetDex)) return null;
    modifySave(save => {
      if (isShiny) {
        if (save.shiny) delete save.shiny[targetDex];
        save.stats = save.stats || {};
        save.stats.shinies = Object.keys(save.shiny || {}).length;
      } else {
        if (save.owned) delete save.owned[targetDex];
      }
    });
    return targetName || '#' + targetDex;
  }
  // fine funzione lockSinglePokemon

  // inizio funzione applyBanLimit
  function applyBanLimit(limit) {
    const g = G();
    if (!g || !g.Upgrades) return false;
    if (g.Upgrades.BY && g.Upgrades.BY.ban) {
      g.Upgrades.BY.ban.max = limit;
    }
    if (Array.isArray(g.Upgrades.LIST)) {
      const u = g.Upgrades.LIST.find(x => x.id === 'ban');
      if (u) u.max = limit;
    }
    return true;
  }
  // fine funzione applyBanLimit

  // inizio funzione getCustomBanLimit
  function getCustomBanLimit() {
    const val = parseInt(localStorage.getItem('ps_custom_ban_limit'), 10);
    if (!Number.isFinite(val) || val < 1) return 10;
    return Math.min(20, val); // Forza il massimo a 20
  }
  // fine funzione getCustomBanLimit

  // inizio funzione Rift Teleport
  let lastRiftTeleport = 0;
  setInterval(() => {
    if (!toggles.autoRift) return;
    const g = G();
    if (!g || !g.Rift) return;

    const rift = g.Rift.rift;
    if (!rift) return;

    const p = getPlayer();
    if (!p || p.dead || g.Rift.inArena) return;

    const now = Date.now();
    if (now - lastRiftTeleport < 1000) return;
    lastRiftTeleport = now;

    p.x = rift.x;
    p.y = rift.y - 10;

    let frames = 0;
    const forceInt = setInterval(() => {
      const pl = getPlayer();
      if (!pl || pl.dead || !g.Rift.rift) { clearInterval(forceInt); return; }
      pl.x = rift.x;
      pl.y = rift.y - 10;
      frames++;
      if (frames > 30) clearInterval(forceInt);
    }, 16);

    log('Rift auto-teleport to', rift.x, rift.y);
  }, 200);
  // fine funzione Rift Teleport

  // inizio funzione Auto-Pick Bonds & Items
  setInterval(() => {
    if (!toggles.autolevelAll) return;
    const g = G();
    if (!g || !g.Game) return;

    const itemScreen = document.getElementById('scr-item') || document.getElementById('scr-item-choice');
    const bondScreen = document.getElementById('scr-bond');

    const isItemVisible = itemScreen && !itemScreen.classList.contains('hidden');
    const isBondVisible = bondScreen && !bondScreen.classList.contains('hidden');

    if (isItemVisible || isBondVisible) {
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));

      const ev = new KeyboardEvent('keydown', { key: '1', code: 'Digit1', keyCode: 49, which: 49, bubbles: true });
      document.dispatchEvent(ev);

      if (!window._lastAutoPickLog || Date.now() - window._lastAutoPickLog > 1000) {
        log('Auto-pressing 1 for Item/Bond (Focus Trick)...');
        window._lastAutoPickLog = Date.now();
      }
    }
  }, 500);
  // fine funzione Auto-Pick Bonds & Items

  // inizio funzione Stat Loop
  setInterval(() => {
    const p = getPlayer();
    if (p) {
      // Vitality (HP) - Flat Add
      if (p._psAppliedMaxHp === undefined) p._psAppliedMaxHp = 0;
      const vPct = (toggles.vitalitySlider || 0) / 100;
      const targetAddHp = 5000 * vPct;
      const hpDiff = targetAddHp - p._psAppliedMaxHp;
      if (hpDiff !== 0) {
        p.maxHp += hpDiff;
        if (hpDiff > 0) p.hp += hpDiff;
        if (p.hp > p.maxHp) p.hp = p.maxHp;
        p._psAppliedMaxHp = targetAddHp;
      }

      // Strength (Atk Mul) - Multiplier
      if (p._psAppliedAtkMul === undefined) p._psAppliedAtkMul = 1;
      const atkPct = toggles.strengthSlider || 0;
      const targetAtkMul = atkPct === 100 ? 9999 : Math.round((1 + (9 * (atkPct / 100))) * 10) / 10;
      if (targetAtkMul !== p._psAppliedAtkMul) {
        const baseAtkMul = (p.atkMul || 1) / p._psAppliedAtkMul;
        p.atkMul = baseAtkMul * targetAtkMul;
        p._psAppliedAtkMul = targetAtkMul;
      }

      // Stride (Spd Mul) - Multiplier
      if (p._psAppliedSpdMul === undefined) p._psAppliedSpdMul = 1;
      const speedPct = Math.max(0, Math.min(100, Number(toggles.strideSlider) || 0));
      const targetSpdMul = Math.round((1 + (2.0 * (speedPct / 100))) * 100) / 100;
      if (targetSpdMul !== p._psAppliedSpdMul) {
        const baseSpdMul = (p.spdMul || 1) / p._psAppliedSpdMul;
        p.spdMul = baseSpdMul * targetSpdMul;
        p._psAppliedSpdMul = targetSpdMul;
      }

      // Reflexes (Cooldown Mul) - Multiplier
      if (p._psAppliedCdMul === undefined) p._psAppliedCdMul = 1;
      const targetCdMul = Math.round((1 - (0.85 * ((toggles.reflexesSlider || 0) / 100))) * 100) / 100;
      if (targetCdMul !== p._psAppliedCdMul) {
        const baseCdMul = (p.cdMul || 1) / p._psAppliedCdMul;
        p.cdMul = baseCdMul * targetCdMul;
        p._psAppliedCdMul = targetCdMul;
      }

      // Armor (Dmg Reduce) - Additive with cap
      if (p._psAppliedDmgReduce === undefined) p._psAppliedDmgReduce = 0;
      const targetDmgReduce = Math.round((0.8 * ((toggles.armorSlider || 0) / 100)) * 10) / 10;
      if (targetDmgReduce !== p._psAppliedDmgReduce) {
        const baseDmgReduce = (p.dmgReduce || 0) - p._psAppliedDmgReduce;
        const newDmgReduce = Math.min(0.95, baseDmgReduce + targetDmgReduce);
        p.dmgReduce = newDmgReduce;
        p._psAppliedDmgReduce = newDmgReduce - baseDmgReduce;
      }

      // Synthesis (Regen) - Additive
      if (p._psAppliedRegenFlat === undefined) p._psAppliedRegenFlat = 0;
      const targetRegenFlat = Math.round((50 * ((toggles.synthesisSlider || 0) / 100)) * 10) / 10;
      if (targetRegenFlat !== p._psAppliedRegenFlat) {
        const baseRegenFlat = (p.regenFlat || 0) - p._psAppliedRegenFlat;
        p.regenFlat = baseRegenFlat + targetRegenFlat;
        p._psAppliedRegenFlat = targetRegenFlat;
      }

      // Magnet Logic
      if (toggles.magnet) {
        if (p._psBaseMagnet === undefined) {
          p._psBaseMagnet = p.magnet || 78;
        }
        const pct = toggles.magnetSlider || 0;
        if (pct <= 0) {
          p.magnet = p._psBaseMagnet;
        } else {
          p.magnet = Math.round(p._psBaseMagnet * (1 + (pct / 100) * 9));
        }
      } else {
        if (p._psBaseMagnet !== undefined) {
          p.magnet = p._psBaseMagnet;
          delete p._psBaseMagnet;
        }
      }

      // Wisdom (XP Mul) - Multiplier
      if (p._psAppliedXpMul === undefined) p._psAppliedXpMul = 1;
      const targetXpMul = Math.round((1 + (9 * ((toggles.wisdomSlider || 0) / 100))) * 10) / 10;
      if (targetXpMul !== p._psAppliedXpMul) {
        const baseXpMul = (p.xpMul || 1) / p._psAppliedXpMul;
        p.xpMul = baseXpMul * targetXpMul;
        p._psAppliedXpMul = targetXpMul;
      }

      // Fortune (Coin Mul) - Multiplier
      if (p._psAppliedCoinMul === undefined) p._psAppliedCoinMul = 1;
      const targetCoinMul = Math.round((1 + (9 * ((toggles.fortuneSlider || 0) / 100))) * 10) / 10;
      if (targetCoinMul !== p._psAppliedCoinMul) {
        const baseCoinMul = (p.coinMul || 1) / p._psAppliedCoinMul;
        p.coinMul = baseCoinMul * targetCoinMul;
        p._psAppliedCoinMul = targetCoinMul;
      }

      // Critical (Crit Chance) - Additive with cap
      if (p._psAppliedCrit === undefined) p._psAppliedCrit = 0;
      const targetCrit = Math.round((1.0 * ((toggles.criticalSlider || 0) / 100)) * 100) / 100;
      if (targetCrit !== p._psAppliedCrit) {
        const baseCrit = (p.critChance || 0) - p._psAppliedCrit;
        const newCrit = Math.min(1.0, baseCrit + targetCrit);
        p.critChance = newCrit;
        p._psAppliedCrit = newCrit - baseCrit;
      }

      const g = G();
      if (toggles.automagnet && g && g.Pickups && g.Pickups.pullAll) g.Pickups.pullAll();
    }
    const g = G();
    if (toggles.shinygacha && g && g.Gacha && g.Gacha.debugForceShiny) g.Gacha.debugForceShiny(9999);
    installLevelUpHook();
    applyBanLimit(getCustomBanLimit());
  }, 1000);
  // fine funzione Stat Loop

  // inizio funzione hookInstantChest
  function hookInstantChest() {
    const g = G();
    if (!g || !g.Interact || g.Interact._psChestHooked) return;
    g.Interact._psChestHooked = true;

    const origUpdate = g.Interact.update;
    g.Interact.update = function(dt, pl) {
      if (toggles.instantChest && pl && g.World && typeof g.World.specialsNear === 'function') {
        const near = g.World.specialsNear(pl.x, pl.y, 90);
        for (const s of near) {
          if (s && s.type === 'bigchest' && !s.used && s.open < 3.5) {
            s.open = 3.5;
          }
        }
      }
      return origUpdate.apply(this, arguments);
    };
    log('Instant Chest hook installed');
  }
  // fine funzione hookInstantChest
  setInterval(hookInstantChest, 1000);

  // inizio funzione Hooks Fly & Swarm & Evade
  setInterval(() => {
    const g = G();
    if (g && g.World && !g.World._psFlyHooked) {
      g.World._psFlyHooked = true;
      const origCollide = g.World.collide;
      g.World.collide = function(entity) {
        if (toggles.fly && entity === getPlayer()) return false;
        return origCollide.apply(this, arguments);
      };
      const origLiquid = g.World.liquidEffect;
      g.World.liquidEffect = function() {
        if (toggles.fly) return {};
        return origLiquid.apply(this, arguments);
      };
    }
  }, 1000);

  setInterval(() => {
    if (!toggles.autoSwarm) return;
    const g = G(), p = getPlayer();
    if (!g || !p || p.dead || !g.Game || g.Game.state !== 'playing' || !g.Spawner || !g.EnemyMgr) return;
    if (g.Rift && g.Rift.inArena) return;

    const alive = g.EnemyMgr.all().filter(e => e && !e.dead).length;
    if (alive < 200) {
      let target = g.EnemyMgr;
      let desc = Object.getOwnPropertyDescriptor(target, 'count');

      // Se non c'è sull'istanza, cerca sul prototipo
      if (!desc) {
        target = Object.getPrototypeOf(g.EnemyMgr);
        desc = Object.getOwnPropertyDescriptor(target, 'count');
      }

      if (desc && desc.configurable) {
        try {
          Object.defineProperty(target, 'count', { get: () => 0, configurable: true });
          g.Spawner.burst(24);
        } finally {
          Object.defineProperty(target, 'count', desc);
        }
      }
    }
  }, 1000);

  setInterval(() => {
    if (!toggles.autoEvade) return;
    const g = G(), p = getPlayer();
    if (!g || !p || p.dead || !g.Game || g.Game.state !== 'playing') return;

    let ex = 0, ey = 0;
    const r = p.r || 12;
    let danger = false;

    // 1. Evita proiettili
    if (g.Projectiles && g.Projectiles.all) {
      for (const proj of g.Projectiles.all()) {
        if (!proj.friendly && proj.vx !== undefined) {
          const speed2 = proj.vx * proj.vx + proj.vy * proj.vy;
          const dx = p.x - proj.x, dy = p.y - proj.y;
          const t = speed2 > 0 ? Math.max(0, Math.min(0.6, (dx * proj.vx + dy * proj.vy) / speed2)) : 0;
          const cx = proj.x + proj.vx * t - p.x;
          const cy = proj.y + proj.vy * t - p.y;
          if (cx*cx + cy*cy < (r + (proj.r || 6) + 10) ** 2) {
            danger = true;
            const len = Math.hypot(dx, dy) || 1;
            ex += dx / len;
            ey += dy / len;
          }
        }
      }
    }

    // 2. Evita nemici vicini (raggio 150px)
    if (g.EnemyMgr && g.EnemyMgr.all) {
      for (const enemy of g.EnemyMgr.all()) {
        if (enemy && !enemy.dead) {
          const dx = p.x - enemy.x, dy = p.y - enemy.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0 && dist < 150) {
            danger = true;
            // Più è vicino, più la spinta è forte
            const strength = (150 - dist) / 150;
            ex += (dx / dist) * strength;
            ey += (dy / dist) * strength;
          }
        }
      }
    }

    if (danger) {
      const len = Math.hypot(ex, ey) || 1;
      p.x += (ex / len) * 8;
      p.y += (ey / len) * 8;
    }
  }, 50);
  // fine funzione Hooks Fly & Swarm & Evade

  // =========================================================================
  // HUD: ZOOM, CAMERA, HP BAR, HAZARDS, PLAYER PATCH
  // =========================================================================
  const ZMIN = 0.7, ZMAX = 3;
  const clampZ = v => Math.min(ZMAX, Math.max(ZMIN, v));
  let Cam = null, lastCam = null;

  // inizio funzione applyZoom
  function applyZoom() {
    if (Cam && lastCam) Cam.resize(...lastCam);
    localStorage.setItem('ps_zoom', hudCfg.zoom.toFixed(3));
  }
  // fine funzione applyZoom

  // inizio funzione installCamera
  function installCamera(C) {
    if (C._psHooked) return;
    C._psHooked = true; Cam = C;
    const baseW = C.VIEW_W, baseH = C.MIN_VIEW_H, orig = C.resize;
    C.resize = function (w, h, d) {
      lastCam = [w, h, d];
      this.VIEW_W = baseW * hudCfg.zoom;
      this.MIN_VIEW_H = baseH * hudCfg.zoom;
      return orig.call(this, w, h, d);
    };
    if (C.w) { lastCam = [C.w * C.scale, C.h * C.scale, C.dpr]; applyZoom(); }
  }
  // fine funzione installCamera

  // inizio funzione hookCamera
  function hookCamera() {
    const g = G();
    if (g && g.Camera) { installCamera(g.Camera); return true; }
    if (window.G && window.G.Camera) { installCamera(window.G.Camera); return true; }
    return false;
  }
  // fine funzione hookCamera
  hookCamera();

  const HPBAR = { normal: [1, 1], big: [1.5, 2.3], huge: [2, 3.4] };
  let curEnemy = null;
  const nativeFill = CanvasRenderingContext2D.prototype.fillRect;

  // inizio funzione HP Bar Patch
  CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
    if (curEnemy !== null && h === 3.4) {
      const [kw, kh] = HPBAR[hudCfg.hpbar] || HPBAR.normal;
      if (kw !== 1 || kh !== 1) {
        const e = curEnemy, w0 = e.boss ? 90 : Math.max(22, e.r * 2);
        const nh = h * kh, nw = w * kw, nx = e.x - (w0 * kw) / 2, ny = y - (nh - h) / 2;
        if (/^rgba\(0, 0, 0/.test(this.fillStyle)) {
          const f = this.fillStyle;
          this.fillStyle = 'rgba(0,0,0,.9)'; nativeFill.call(this, nx - 1, ny - 1, nw + 2, nh + 2);
          this.fillStyle = '#2b2d3a'; nativeFill.call(this, nx, ny, nw, nh);
          this.fillStyle = f;
          return;
        }
        return nativeFill.call(this, nx, ny, nw, nh);
      }
    }
    return nativeFill.apply(this, arguments);
  };
  // fine funzione HP Bar Patch

  // inizio funzione patchEnemyClass
  function patchEnemyClass(v) {
    if (v._psHpPatched) return;
    v._psHpPatched = true;
    const orig = v.prototype.draw;
    v.prototype.draw = function (ctx) {
      curEnemy = this;
      try { return orig.call(this, ctx); } finally { curEnemy = null; }
    };
  }
  // fine funzione patchEnemyClass

  // inizio funzione hookEnemy
  (function hookEnemy() {
    const g = G();
    const cand = (g && g.Enemy) || (window.G && window.G.Enemy);
    if (cand && typeof cand === 'function' && cand.prototype && typeof cand.prototype.draw === 'function') {
      patchEnemyClass(cand);
    }
  })();
  // fine funzione hookEnemy

  const hazards = [];

  // inizio funzione wrapHazards
  function wrapHazards(H) {
    if (!H || H._psW) return;
    H._psW = true;
    const orig = H.add;
    H.add = function (h) {
      try { hazards.push({ ...h, t0: (getPlayer() && getPlayer()._psTime) || 0 }); if (hazards.length > 200) hazards.shift(); } catch {}
      return orig.apply(this, arguments);
    };
  }
  // fine funzione wrapHazards

  // inizio funzione hookHazards
  (function hookHazards() {
    const g = G();
    const cand = (g && g.Hazards) || (window.G && window.G.Hazards);
    if (cand && typeof cand.add === 'function') wrapHazards(cand);
  })();
  // fine funzione hookHazards

  const instances = [];
  const isPlayerClass = v => typeof v === 'function' && v.prototype &&
    typeof v.prototype.hurt === 'function' && typeof v.prototype.gainXp === 'function';

  // inizio funzione patchPlayerClass
  function patchPlayerClass(v) {
    if (v._psTimePatched) return;
    v._psTimePatched = true;
    const orig = v.prototype.update;
    v.prototype.update = function (dt) {
      this._psTime = (this._psTime || 0) + dt;
      this._psUpd = performance.now();
      return orig.call(this, dt);
    };
  }
  // fine funzione patchPlayerClass

  // inizio funzione wrapPlayerClass
  function wrapPlayerClass(v) {
    return new Proxy(v, {
      construct(t, a, nt) {
        const o = Reflect.construct(t, a, nt);
        instances.push(o); if (instances.length > 12) instances.shift();
        return o;
      }
    });
  }
  // fine funzione wrapPlayerClass

  // inizio funzione hookPlayer
  (function hookPlayer() {
    const g = G();
    const cand = (g && g.Player) || (window.G && window.G.Player);
    if (cand && isPlayerClass(cand)) {
      patchPlayerClass(cand);
      const wrapped = wrapPlayerClass(cand);
      if (g) g.Player = wrapped;
      if (window.G) window.G.Player = wrapped;
    }
  })();
  // fine funzione hookPlayer

  // inizio funzione isPlayer & findPlayer
  const isPlayer = o => o && typeof o === 'object' && typeof o.hp === 'number' && typeof o.maxHp === 'number' &&
    typeof o.x === 'number' && typeof o.y === 'number' && typeof o.gainXp === 'function';

  function findPlayer() {
    for (let i = instances.length - 1; i >= 0; i--) {
      const p = instances[i];
      if (!p.remote && !p.net) return p;
    }
    return null;
  }
  // fine funzione isPlayer & findPlayer

  // inizio funzione Wheel Event (Zoom / Cycle)
  addEventListener('wheel', e => {
    if (!toggles.hudFov) return;
    const path = e.composedPath();
    const ourPanel = document.getElementById('ps-ultimate-panel');
    if (ourPanel && path.includes(ourPanel)) return;
    let el = e.target;
    while (el && el !== document.body) {
      const s = getComputedStyle(el);
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight) return;
      el = el.parentElement;
    }
    if (e.shiftKey && toggles.hudShiftWheel) {
      e.preventDefault();
      const d = e.deltaY || e.deltaX;
      const p = findPlayer();
      if (d && isPlayer(p) && !p.dead && p.cycle) p.cycle(d > 0 ? 1 : -1);
      return;
    }
    e.preventDefault();
    hudCfg.zoom = clampZ(hudCfg.zoom * (e.deltaY > 0 ? 1.1 : 1 / 1.1));
    applyZoom();
  }, { passive: false });
  // fine funzione Wheel Event (Zoom / Cycle)

  // =========================================================================
  // HUD: OVERLAY DRAW
  // =========================================================================
  const overlay = document.createElement('canvas');
  overlay.id = 'ps-ultimate-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99998';
  document.documentElement.appendChild(overlay);
  const octx = overlay.getContext('2d');

  let gc = null;
  const getGC = () => (gc && gc.isConnected) ? gc :
    (gc = [...document.querySelectorAll('canvas')]
      .filter(c => c !== overlay && c.clientWidth > 300)
      .sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0] || null);

  const fmt = v => typeof v === 'number'
    ? (Number.isFinite(v) ? (Number.isInteger(v) ? v : Math.round(v * 100) / 100).toLocaleString('en-US') : '—')
    : String(v);

  let lastOverlayFrame = 0;

  // inizio funzione drawOverlay
  function drawOverlay() {
    requestAnimationFrame(drawOverlay);
    const now = performance.now();
    if (now - lastOverlayFrame < 1000 / 30) return;
    lastOverlayFrame = now;

    const dpr = window.devicePixelRatio || 1, W = innerWidth, H = innerHeight;
    if (overlay.width !== Math.round(W * dpr) || overlay.height !== Math.round(H * dpr)) {
      overlay.width = Math.round(W * dpr); overlay.height = Math.round(H * dpr);
    }
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, overlay.width, overlay.height);

    const g = G(), p = findPlayer();
    if (!g || !Cam || !Cam.w || !isPlayer(p)) return;

    const gc2 = getGC(); if (!gc2) return;
    const r = gc2.getBoundingClientRect(); if (r.width < 10) return;
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const k = r.width / Cam.w, L = Cam.left() - (Cam._sx || 0), T = Cam.top() - (Cam._sy || 0);
    const X = wx => (wx - L) * k + r.left, Y = wy => (wy - T) * k + r.top;

    if (toggles.hudMagnetCircle && p.magnet) {
      octx.save(); octx.setLineDash([7, 7]); octx.globalAlpha = 0.4; octx.strokeStyle = '#7fe0ff'; octx.lineWidth = 2;
      octx.beginPath(); octx.arc(X(p.x), Y(p.y), p.magnet * k, 0, 6.2832); octx.stroke(); octx.restore();
    }

    if (toggles.hudHaz) {
      const clock = p._psTime || 0;
      for (let i = hazards.length - 1; i >= 0; i--) {
        const h = hazards[i], el = clock - h.t0, delay = h.delay || 1;
        if (el > delay + 0.3 || el < -1) { hazards.splice(i, 1); continue; }
        const col = h.color || '#ff5252', prog = Math.max(0, Math.min(1, el / delay));
        octx.save();
        if (h.kind === 'zone') {
          const x = X(h.x), y = Y(h.y), rr = (h.r || 40) * k;
          octx.beginPath(); octx.arc(x, y, rr, 0, 6.2832);
          octx.globalAlpha = 0.1 + 0.14 * prog; octx.fillStyle = col; octx.fill();
          octx.globalAlpha = 0.95; octx.lineWidth = 3; octx.strokeStyle = '#fff'; octx.stroke();
          octx.beginPath(); octx.arc(x, y, Math.max(1, rr * prog), 0, 6.2832);
          octx.lineWidth = 2.5; octx.strokeStyle = col; octx.stroke();
        } else if (h.kind === 'beam') {
          octx.translate(X(h.x), Y(h.y)); octx.rotate(h.angle || 0);
          const len = (h.len || 300) * k, w = (h.w || 20) * k;
          octx.globalAlpha = 0.1 + 0.16 * prog; octx.fillStyle = col; octx.fillRect(0, -w / 2, len, w);
          octx.globalAlpha = 0.95; octx.lineWidth = 2.5; octx.strokeStyle = '#fff'; octx.strokeRect(0, -w / 2, len, w);
        }
        octx.restore();
      }
    }

    const enemies = (g.EnemyMgr && g.EnemyMgr.all()) || [];
    const grp = p.activeGroup ? p.activeGroup() : [];
    const m0 = r.left + 6, m1 = r.right - 6, n0 = r.top + 6, n1 = r.bottom - 6;
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2, edge = 24;

    const arrowTo = (wx, wy, col, glyph) => {
      const dx = X(wx) - cx, dy = Y(wy) - cy;
      const t = Math.min((cx - r.left - edge) / Math.abs(dx || 1e-6), (cy - r.top - edge) / Math.abs(dy || 1e-6));
      const x = cx + dx * t, y = cy + dy * t, ang = Math.atan2(dy, dx);
      octx.save(); octx.translate(x, y);
      octx.fillStyle = col; octx.strokeStyle = 'rgba(0,0,0,.7)'; octx.lineWidth = 2;
      octx.beginPath(); octx.arc(0, 0, 11, 0, 6.2832); octx.fill(); octx.stroke();
      octx.rotate(ang); octx.beginPath(); octx.moveTo(20, 0); octx.lineTo(11, -6.5); octx.lineTo(11, 6.5); octx.closePath(); octx.fill(); octx.stroke();
      octx.rotate(-ang);
      octx.fillStyle = '#10151f'; octx.font = '700 12px sans-serif'; octx.textAlign = 'center'; octx.textBaseline = 'middle';
      octx.fillText(glyph, 0, 1); octx.restore();
    };

    for (const e of enemies) {
      if (e.dead) continue;
      const x = X(e.x), y = Y(e.y), on = x > m0 && x < m1 && y > n0 && y < n1;
      if (!on) {
        if (toggles.hudArrows) {
          if (e.boss) arrowTo(e.x, e.y, '#ff5252', 'B');
          else if (e.behavior === 'thief') arrowTo(e.x, e.y, '#ffd23f', '$');
        }
        continue;
      }
      const rx = (e.r || 10) * k;
      if (toggles.hudRing && grp.length && g.Types && e.types) {
        let s = 0; for (const m of grp) s += g.Types.mult(m.type, e.types);
        const mul = s / grp.length;
        if (Math.abs(mul - 1) > 0.01) {
          octx.beginPath(); octx.ellipse(x, y, rx * 1.3, rx * 0.55, 0, 0, 6.2832);
          octx.globalAlpha = 0.85; octx.lineWidth = 2;
          octx.strokeStyle = mul >= 2 ? '#46d37a' : mul > 1 ? '#a6e36a' : mul === 0 ? '#9b59d0' : '#ff6b6b';
          octx.stroke(); octx.globalAlpha = 1;
        }
      }
      if (toggles.hudSupport && (e.behavior === 'healer' || e.behavior === 'shielder' || e.behavior === 'summoner')) {
        octx.save(); octx.setLineDash([5, 4]); octx.lineWidth = 2.5;
        octx.globalAlpha = 0.65 + 0.3 * Math.sin(now / 180);
        octx.strokeStyle = e.behavior === 'healer' ? '#5fe08a' : e.behavior === 'shielder' ? '#7fc8ff' : '#c47bff';
        octx.beginPath(); octx.ellipse(x, y, rx * 1.8, rx * 0.8, 0, 0, 6.2832); octx.stroke(); octx.restore();
      }
    }

    // Item Finder (Radar)
    if (toggles.hudPoi && g.World && typeof g.World.specialsNear === 'function') {
      const currentRange = hudCfg.poiRange || 3500;
      const specials = g.World.specialsNear(p.x, p.y, currentRange) || [];

      const validSpecials = specials.filter(s => {
        if (!s) return false;
        if (s.type === 'bigchest' && !s.used && s.open < 3.5) return true;
        if (s.type === 'altar' && !s.used) return true;
        if (s.type === 'spring' && s.charge >= 0.1) return true;
        return false;
      });

      const limitedSpecials = validSpecials.slice(0, 30);

      for (const s of limitedSpecials) {
        let color = null;
        if (s.type === 'bigchest') { color = '#fbbf24'; }
        else if (s.type === 'altar') { color = '#94a3b8'; }
        else if (s.type === 'spring') { color = '#38bdf8'; }

        if (color) {
          const sx = X(s.x);
          const sy = Y(s.y);
          const onScreen = (sx > m0 && sx < m1 && sy > n0 && sy < n1);

          if (!onScreen) {
            const dx = sx - (r.left + r.width / 2);
            const dy = sy - (r.top + r.height / 2);
            const ang = Math.atan2(dy, dx);
            const edge = 30;
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const t = Math.min((cx - r.left - edge) / Math.abs(dx || 1e-6), (cy - r.top - edge) / Math.abs(dy || 1e-6));
            const ex = cx + dx * t;
            const ey = cy + dy * t;

            octx.save();
            octx.translate(ex, ey);
            octx.rotate(ang);
            octx.fillStyle = color;
            octx.strokeStyle = 'rgba(0,0,0,0.8)';
            octx.lineWidth = 1.5;
            octx.beginPath();
            octx.moveTo(14, 0);
            octx.lineTo(-6, -9);
            octx.lineTo(-6, 9);
            octx.closePath();
            octx.fill();
            octx.stroke();
            octx.restore();
          }
        }
      }
    }
  }
  // fine funzione drawOverlay
  requestAnimationFrame(drawOverlay);

  // =========================================================================
  // HUD: PLAYER STATS PANEL
  // =========================================================================
  const hudStats = document.createElement('div');
  hudStats.id = 'ps-hud-stats';
  hudStats.style.cssText = `
    position:fixed;right:10px;top:50%;transform:translateY(-50%);
    width:220px;min-width:170px;min-height:120px;
    background:rgba(10,20,48,.85);backdrop-filter:blur(6px);
    border:1px solid rgba(255,255,255,.14);border-radius:10px;
    box-shadow:0 6px 20px rgba(0,0,0,.45);padding:8px 10px 10px;
    font-family:'Pixelify Sans',ui-monospace,Consolas,monospace;font-size:13px;color:#e8eefc;
    z-index:99997;user-select:none;overflow:auto;resize:both;
  `;
  hudStats.dataset.baseBg = 'rgba(10,20,48,.85)';
  document.documentElement.appendChild(hudStats);

  const hudHead = document.createElement('div');
  hudHead.style.cssText = `
    display:flex;align-items:center;justify-content:space-between;
    gap:6px;margin:-2px -2px 6px;padding:2px 2px 4px;
    border-bottom:1px solid rgba(255,255,255,.1);
    cursor:pointer;user-select:none;font-size:11px;
    letter-spacing:.08em;text-transform:uppercase;color:#8fb3ff;
  `;
  hudHead.innerHTML = `<span>HUD Stats</span><span id="ps-hud-min" style="font-weight:bold;font-size:14px;">−</span>`;
  hudStats.appendChild(hudHead);

  const hudBody = document.createElement('div');
  hudBody.id = 'ps-hud-body';
  hudStats.appendChild(hudBody);

  // inizio funzione addHudOpacitySlider
  (function addHudOpacitySlider() {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px';
    wrap.innerHTML = `
      <span style="font-size:10px;color:#9fb0d4;white-space:nowrap">Opacity</span>
      <input type="range" min="0.2" max="1" step="0.05" value="${layout.hud.opacity}"
             style="flex:1;accent-color:#8fb3ff">
      <span style="font-size:10px;color:#9fb0d4;min-width:28px;text-align:right" class="ps-op-val">${Math.round(layout.hud.opacity*100)}%</span>
      <button type="button" class="ps-blur-btn" title="Toggle background blur"
              style="border:1px solid #334155;background:#1e293b;color:#cbd5e1;border-radius:5px;padding:1px 6px;font-size:10px;cursor:pointer;min-width:38px">
        ${layout.hud.blur ? 'Blur' : 'None'}
      </button>
    `;
    hudStats.insertBefore(wrap, hudHead.nextSibling);
    const range = wrap.querySelector('input');
    const val = wrap.querySelector('.ps-op-val');
    const btn = wrap.querySelector('.ps-blur-btn');
    range.addEventListener('input', () => {
      const v = parseFloat(range.value);
      layout.hud.opacity = v;
      applyOpacity(hudStats, v, layout.hud.blur);
      val.textContent = Math.round(v * 100) + '%';
      saveLayout();
    });
    btn.addEventListener('click', () => {
      layout.hud.blur = !layout.hud.blur;
      btn.textContent = layout.hud.blur ? 'Blur' : 'None';
      applyOpacity(hudStats, layout.hud.opacity, layout.hud.blur);
      saveLayout();
    });
  })();
  // fine funzione addHudOpacitySlider

  // inizio funzione HUD Minimize Logic
  let hudMinimized = false;
  const hudMinBtn = document.getElementById('ps-hud-min');

  if (hudMinBtn) {
    hudMinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const body = document.getElementById('ps-hud-body');
      const slider = hudStats.querySelector('input[type=range]')?.parentElement;

      if (!hudMinimized) {
        layout.hud.height = hudStats.offsetHeight;
        saveLayout();
        body.style.display = 'none';
        if (slider) {
          slider.style.display = 'none';
          slider.style.marginBottom = '0';
        }
        hudStats.style.padding = '0';
        hudStats.style.height = 'auto';
        hudStats.style.minHeight = '0';
        hudHead.style.padding = '8px 10px';
        hudHead.style.marginBottom = '0';
        hudHead.style.borderBottom = 'none';
        hudMinBtn.textContent = '+';
        hudMinimized = true;
      } else {
        body.style.display = 'block';
        if (slider) {
          slider.style.display = 'flex';
          slider.style.marginBottom = '6px';
        }
        hudStats.style.padding = '8px 10px 10px';
        hudStats.style.height = layout.hud.height ? layout.hud.height + 'px' : '';
        hudStats.style.minHeight = '120px';
        hudHead.style.padding = '2px 2px 4px';
        hudHead.style.marginBottom = '6px';
        hudHead.style.borderBottom = '1px solid rgba(255,255,255,.1)';
        hudMinBtn.textContent = '−';
        hudMinimized = false;
      }
    });
  }
  // fine funzione HUD Minimize Logic

  // inizio funzione applyHudLayout
  (function applyHudLayout() {
    const r = clampLayoutRect(
      { left: layout.hud.left, top: layout.hud.top, width: layout.hud.width, height: layout.hud.height },
      170, 120
    );
    if (layout.hud.left !== null && layout.hud.top !== null) {
      hudStats.style.left = r.left + 'px';
      hudStats.style.top = r.top + 'px';
      hudStats.style.right = 'auto';
      hudStats.style.transform = 'none';
    }
    hudStats.style.width = r.width + 'px';
    if (r.height) hudStats.style.height = r.height + 'px';
    applyOpacity(hudStats, layout.hud.opacity, layout.hud.blur);
  })();
  // fine funzione applyHudLayout

  // inizio funzione HUD ResizeObserver
  new ResizeObserver(() => {
    if (hudMinimized) return;
    layout.hud.width = hudStats.offsetWidth;
    layout.hud.height = hudStats.offsetHeight;
    saveLayout();
  }).observe(hudStats);
  // fine funzione HUD ResizeObserver

  // inizio funzione HUD Drag
  let hudDrag = null;
  hudHead.addEventListener('mousedown', e => {
    if (e.button !== 0 || e.target.closest('input') || e.target.closest('button') || e.target.id === 'ps-hud-min') return;
    hudDrag = {
      x: e.clientX, y: e.clientY,
      ox: hudStats.offsetLeft, oy: hudStats.offsetTop
    };
    hudHead.style.cursor = 'grabbing';
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!hudDrag) return;
    hudStats.style.left = (hudDrag.ox + e.clientX - hudDrag.x) + 'px';
    hudStats.style.top = (hudDrag.oy + e.clientY - hudDrag.y) + 'px';
    hudStats.style.right = 'auto';
    hudStats.style.transform = 'none';
  });
  window.addEventListener('mouseup', () => {
    if (!hudDrag) return;
    hudDrag = null;
    hudHead.style.cursor = 'pointer';
    layout.hud.left = hudStats.offsetLeft;
    layout.hud.top = hudStats.offsetTop;
    saveLayout();
  });
  // fine funzione HUD Drag

  // inizio funzione renderHudStats & FPS Loop
  function row(icon, label, value, cls = '') {
    return `<div style="display:flex;justify-content:space-between;gap:14px;padding:2px 0">
      <span style="color:#9fb0d4">${icon} ${label}</span>
      <b style="color:${cls || '#fff'};font-variant-numeric:tabular-nums">${value}</b>
    </div>`;
  }

  function renderHudStats() {
    if (!toggles.hudPanel) { hudStats.style.display = 'none'; return; }
    const p = findPlayer();
    if (!isPlayer(p)) { hudStats.style.display = 'none'; return; }
    hudStats.style.display = 'block';
    let h = '';

    if (toggles.hudAtk) {
      let pAtk = Math.round(p.atk || 0);
      let sAtk = pAtk;
      if (typeof p.atkFor === 'function') {
        try {
          pAtk = Math.round(p.atkFor({ cat: 'physical' }) || pAtk);
          sAtk = Math.round(p.atkFor({ cat: 'special' }) || sAtk);
        } catch(e) {}
      } else if (p.mon && p.mon.sa) {
        sAtk = Math.round(p.mon.sa * (p.atkMul || 1));
      }
      h += row('', 'Atk / SpAtk', `${pAtk} / ${sAtk}`);
    }
    if (toggles.hudCoins) h += row('', 'Coins', p.coins);
    if (toggles.hudCoinMul) h += row('', 'Coins mult.', '×' + (p.coinMul || 1).toFixed(2));
    if (toggles.hudCd) h += row('', 'Cooldown', p.cdMul ? (p.cdMul * 100).toFixed(0) + '%' : '100%');
    if (toggles.hudCrit) h += row('', 'Crit', Math.round((p.critChance || 0) * 100) + '%');
    if (toggles.hudRed) h += row('', 'Defense', Math.round((p.reduction || 0) * 100) + '%');
    if (toggles.hudFov) h += row('', 'FOV', hudCfg.zoom.toFixed(2) + '×');
    if (toggles.hudHp) h += row('', 'HP', `${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}`);
    if (toggles.hudKills) h += row('', 'Kills', p.kills);
    if (toggles.hudMagnet) h += row('', 'Magnet', Math.round(p.magnet || 0));
    if (toggles.hudRegen) h += row('', 'Regen', Math.round(p.regen || 0) + '/s');
    if (toggles.hudSpd) h += row('', 'Speed', Math.round(p.spd || 0));
    if (toggles.hudXp) h += row('', 'XP Bar', `${Math.floor(p.xp || 0)} / ${p.xpNext || 0}`);
    if (toggles.hudXpMul) h += row('', 'XP mult.', '×' + (p.xpMul || 1).toFixed(2));

    const body = document.getElementById('ps-hud-body');
    if (body) body.innerHTML = h;
  }
  setInterval(renderHudStats, 250);
  // fine funzione renderHudStats & FPS Loop

  // inizio funzione Title Update
  let baseTitle = '';
  setInterval(() => {
    if (!/^/.test(document.title)) baseTitle = document.title;
    const p = findPlayer();
    if (!isPlayer(p) || performance.now() - (p._psUpd || 0) > 1500) {
      if (/^/.test(document.title)) document.title = baseTitle;
      return;
    }
    if (toggles.hudTitle) {
      const t = Math.floor((p._psTime || 0));
      const mm = String(Math.floor(t / 60)).padStart(2, '0');
      const ss = String(t % 60).padStart(2, '0');
      document.title = ` ${Math.ceil(p.hp)}/${Math.round(p.maxHp)} · ${mm}:${ss} · ${baseTitle || 'PokéSurvivor'}`;
    } else if (/^/.test(document.title)) {
      document.title = baseTitle;
    }
  }, 500);
  // fine funzione Title Update

  // =========================================================================
  // BATCH GACHA
  // =========================================================================
  let gachaRunning = false, gachaStop = false, gachaIssued = 0, gachaTotal = 0;
  let gachaResults = [];
  let gachaStatus = null, gachaProgress = null;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // inizio funzione gachaCompatible
  function gachaCompatible() {
    const g = G();
    return g && typeof g.Gacha?.pull === 'function' && typeof g.Gacha?.costOf === 'function'
      && typeof g.DB?.commit === 'function' && typeof g.GachaUI?.open === 'function';
  }
  // fine funzione gachaCompatible

  // inizio funzione availableDraws
  function availableDraws() {
    const g = G(); if (!g || !g.DB || !g.DB.save) return 0;
    const t = g.DB.save.tickets || { t1: 0, t10: 0 };
    return (t.t1 || 0) + (t.t10 || 0) * 10;
  }
  // fine funzione availableDraws

  // inizio funzione nativePullOpen
  function nativePullOpen() {
    const g = G(); if (!g || !g.GachaUI) return false;
    const fx = document.getElementById('pull-fx');
    return g.GachaUI.open_ || (fx && !fx.classList.contains('hidden') && getComputedStyle(fx).display !== 'none');
  }
  // fine funzione nativePullOpen

  // inizio funzione gachaRun
  async function gachaRun(count, gen) {
    const g = G();
    const user = g.DB.user;
    const t = g.DB.save.tickets || { t1: 0, t10: 0 };
    if (count % 10 > (t.t1 || 0)) throw new Error('Not enough regular tickets to complete; need a multiple of 10 or draw all.');
    const genButton = document.querySelector(`#gacha-gens button[data-gen="${gen}"]`);
    if (!genButton) throw new Error('Generation button not found.');
    genButton.click();
    while (gachaIssued < count && !gachaStop) {
      if (g.DB.user !== user) throw new Error('Account switched.');
      if (nativePullOpen()) throw new Error('Native pull open; close it first.');
      const screen = document.getElementById('scr-gacha');
      if (!screen || screen.classList.contains('hidden')) throw new Error('Left the gacha page.');
      const remaining = count - gachaIssued;
      const tickets = g.DB.save.tickets || { t1: 0, t10: 0 };
      const currency = remaining >= 10 && (tickets.t10 || 0) > 0 ? 't10' : 't1';
      const n = remaining >= 10 && (currency === 't10' || (tickets.t1 || 0) >= 10) ? 10 : 1;
      const cost = g.Gacha.costOf(g.DB.save, n, currency);
      if (!cost) throw new Error('Tickets insufficient.');
      const results = g.Gacha.pull(g.DB.save, n, gen, currency);
      if (!Array.isArray(results) || results.length !== n) throw new Error('Abnormal draw result.');
      for (const r of results) gachaResults.push(r);
      gachaIssued += n;
      try { g.Progress && g.Progress.checkAch && g.Progress.checkAch(); } catch {}
      g.DB.commit();
      if (g.UI && g.UI.refreshCoins) g.UI.refreshCoins();
      gachaStatus.textContent = `Drawing… ${gachaIssued}/${count}`;
      gachaProgress.textContent = `Drawn ${gachaIssued}/${count}`;
      await sleep(60);
    }
  }
  // fine funzione gachaRun

  // inizio funzione gachaStart
  async function gachaStart() {
    if (gachaRunning) return;
    if (!gachaStatus || !gachaProgress) {
      console.warn('[Ultimate] Gacha UI not built yet');
      return;
    }
    if (!gachaCompatible()) { gachaStatus.textContent = 'Gacha not ready yet.'; return; }
    const countInput = document.getElementById('ps-gacha-count');
    const allChk = document.getElementById('ps-gacha-all');
    const genSel = document.getElementById('ps-gacha-gen');
    const max = availableDraws();
    const count = allChk.checked ? max : Number(countInput.value);
    const gen = Number(genSel.value);
    if (!Number.isSafeInteger(count) || count <= 0) { gachaStatus.textContent = 'Enter a positive integer.'; return; }
    if (count > max) { gachaStatus.textContent = `Not enough tickets (available: ${max}).`; return; }
    gachaRunning = true; gachaStop = false; gachaIssued = 0; gachaTotal = count; gachaResults = [];
    gachaStatus.textContent = 'Drawing…';
    try {
      if (!navigator.locks || !navigator.locks.request) throw new Error('Browser does not support tab locks.');
      await navigator.locks.request('ps-ultimate-gacha', { ifAvailable: true }, async lock => {
        if (!lock) throw new Error('Another tab is running gacha.');
        await gachaRun(count, gen);
      });
      gachaStatus.textContent = gachaStop ? 'Stopped' : 'Done';
      renderGachaResults();
    } catch (e) {
      gachaStatus.textContent = 'Stopped: ' + (e.message || e);
    } finally {
      gachaRunning = false;
    }
  }
  // fine funzione gachaStart

  // inizio funzione renderGachaResults
  function renderGachaResults() {
    const box = document.getElementById('ps-gacha-results');
    if (!box) return;
    if (!gachaResults.length) { box.innerHTML = ''; return; }
    const newCount = gachaResults.filter(r => r.isNew).length;
    const shinyCount = gachaResults.filter(r => r.shiny).length;
    box.innerHTML = `
      <div style="margin:8px 0 4px;color:#b7c6e4;font-size:11px">
        ${gachaResults.length} draws · New: ${newCount} · Shiny: ${shinyCount}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px;max-height:240px;overflow:auto">
        ${gachaResults.slice(0, 200).map(r => `
          <div style="padding:4px;background:#1c2c49;border:1px solid ${r.shiny ? '#9ae6ff' : '#7189b5'};border-radius:6px;text-align:center;font-size:11px">
            <div>#${r.dex}</div>
            <div style="color:${r.isNew ? '#ffdf73' : '#b7c6e4'}">${r.isNew ? 'NEW' : 'dup'}</div>
            ${r.shiny ? '<div style="color:#9ae6ff"></div>' : ''}
          </div>
        `).join('')}
        ${gachaResults.length > 200 ? `<div style="grid-column:1/-1;text-align:center;color:#b7c6e4;font-size:11px">…and ${gachaResults.length - 200} more</div>` : ''}
      </div>
    `;
  }
  // fine funzione renderGachaResults

  // =========================================================================
  // UI: MAIN PANEL
  // =========================================================================

  // inizio funzione buildPanel
  function buildPanel() {
    if (document.getElementById('ps-ultimate-panel')) return;

    const style = document.createElement('style');
    style.textContent = `
      #ps-ultimate-panel {
        position: fixed; top: 16px; right: 16px; width: 420px;
        max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px);
        box-sizing: border-box;
        background: rgba(10, 15, 29, 0.96);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 12px;
        box-shadow: 0 10px 35px rgba(0, 0, 0, 0.85);
        font-family: 'Pixelify Sans', 'Segoe UI', system-ui, sans-serif;
        color: #f8fafc; z-index: 9999999; font-size: 12px; user-select: none;
      }
      #ps-ultimate-panel .ps-head {
        display: flex; justify-content: space-between; align-items: center;
        padding: 8px 12px; background: rgba(10, 20, 48, 0.5);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 11px 11px 0 0; cursor: grab; font-weight: 700; color: #8fb3ff;
        letter-spacing: .08em; text-transform: uppercase; font-size: 11px;
      }
      #ps-ultimate-panel .ps-tabs {
        display: flex; border-bottom: 1px solid rgba(255,255,255,.1);
      }
      #ps-ultimate-panel .ps-tabs button {
        flex: 1; padding: 8px 0; background: none; border: 0;
        border-bottom: 2px solid transparent; color: #94a3b8;
        font: inherit; font-size: 12px; cursor: pointer;
      }
      #ps-ultimate-panel .ps-tabs button:hover { color: #fff; background: rgba(255,255,255,.05); }
      #ps-ultimate-panel .ps-tabs button.on { color: #ffcb3d; border-bottom-color: #ffcb3d; }
      #ps-ultimate-panel {
        display: flex;
        flex-direction: column;
      }
      #ps-ultimate-panel .ps-body {
        padding: 10px 12px;
        flex: 1 1 auto;
        min-height: 0;
        max-height: 100%;
        overflow-y: auto !important;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-y: contain;
        touch-action: pan-y;
        scrollbar-width: thin;
      }
      #ps-ultimate-panel .ps-tabs {
        flex: 0 0 auto;
      }
      #ps-ultimate-panel .ps-head {
        flex: 0 0 auto;
      }
      #ps-ultimate-panel .ps-pane { display: none; }
      #ps-ultimate-panel .ps-pane.on { display: block; }

      /* SEZIONI COMPRIMIBILI */
      #ps-ultimate-panel .pt-section { margin-bottom: 11px; }
      #ps-ultimate-panel .pt-title {
        font-size: 10px; text-transform: uppercase; color: #94a3b8;
        margin-bottom: 5px; font-weight: 700;
        border-left: 3px solid #ffcb3d; padding-left: 5px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      #ps-ultimate-panel .pt-title::after { content: '−'; font-size: 14px; }
      #ps-ultimate-panel .pt-section.collapsed .pt-title::after { content: '+'; }
      #ps-ultimate-panel .pt-section.collapsed > *:not(.pt-title) { display: none !important; }

      #ps-ultimate-panel .pt-grid {
        display: grid; gap: 5px;
      }
      #ps-ultimate-panel .ps-pane[data-pane="trainer"] .pt-grid {
        grid-template-columns: 1fr 1fr 1fr;
      }
      #ps-ultimate-panel .ps-pane:not([data-pane="trainer"]) .pt-grid {
        grid-template-columns: 1fr 1fr;
      }
      #ps-ultimate-panel .pt-btn, #ps-ultimate-panel .pt-toggle-btn {
        background: #1e293b; color: #e2e8f0; border: 1px solid #334155;
        border-radius: 6px; padding: 5px 4px; font-size: 11px;
        font-weight: 600; cursor: pointer; text-align: center;
        transition: all 0.15s ease;
        display: flex; justify-content: center; align-items: center;
        position: relative;
      }
      #ps-ultimate-panel .pt-btn:hover {
        background: #334155; border-color: #ffcb3d; color: #ffcb3d;
      }
      #ps-ultimate-panel .pt-toggle-btn {
        font-size: 10.5px;
        padding-left: 6px; padding-right: 6px;
      }
      #ps-ultimate-panel .pt-toggle-btn.on {
        background: #14532d; border-color: #22c55e; color: #86efac;
      }

      #ps-ultimate-panel .dot {
        display: none !important;
      }

      #ps-ultimate-panel .pt-gold { border-color: #eab308; color: #facc15; }
      #ps-ultimate-panel .pt-purple { border-color: #c084fc; color: #e9d5ff; }
      #ps-ultimate-panel .pt-blue { border-color: #38bdf8; color: #38bdf8; }

      #ps-ultimate-panel .ps-pane[data-pane="trainer"] .pt-full { grid-column: span 3; }
      #ps-ultimate-panel .ps-pane:not([data-pane="trainer"]) .pt-full { grid-column: span 2; }
      #ps-ultimate-panel .pt-three-col { grid-template-columns: 1fr 1fr 1fr; }
      #ps-ultimate-panel .pt-two-col { grid-template-columns: 1fr 1fr; }

      #ps-ultimate-panel .pt-input, #ps-ultimate-panel select {
        background: #0f172a; border: 1px solid #334155; border-radius: 6px;
        color: #fff; padding: 5px 8px; font-size: 11px; width: 100%;
        box-sizing: border-box; margin-bottom: 4px;
      }
      #ps-ultimate-panel .pt-input:focus { border-color: #ffcb3d; outline: none; }

      #ps-ultimate-panel .pt-check-grid {
        display: grid; gap: 0px 4px;
      }
      #ps-ultimate-panel .ps-pane[data-pane="trainer"] .pt-check-grid {
        grid-template-columns: 1fr 1fr 1fr;
      }
      #ps-ultimate-panel .ps-pane:not([data-pane="trainer"]) .pt-check-grid {
        grid-template-columns: 1fr 1fr;
      }
      #ps-ultimate-panel label.pt-check {
        display: flex; align-items: center; gap: 6px;
        padding: 0px 2px; cursor: pointer; color: #cbd5e1; font-size: 11px;
      }
      #ps-ultimate-panel label.pt-check:hover { background: rgba(255,255,255,.05); border-radius: 4px; }
      #ps-ultimate-panel input[type=checkbox] { accent-color: #ffcb3d; }

      #ps-ultimate-panel #pt-toast {
        margin-top: 6px; font-size: 11px; text-align: center;
        color: #38bdf8; min-height: 14px;
      }
      #ps-ultimate-panel .ps-min {
        cursor: pointer; font-weight: bold; padding: 0 4px;
      }
      #ps-ultimate-panel .ps-note {
        font-size: 10px; color: #94a3b8; margin: 4px 0;
      }

      /* PRIORITY LIST */
      #ps-ultimate-panel .ps-prio-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 6px;
        background: rgba(255,255,255,.03);
        border: 1px solid rgba(255,255,255,.05);
        border-radius: 4px;
        cursor: grab;
        user-select: none;
        transition: background 0.1s;
      }
      #ps-ultimate-panel .ps-prio-row:active {
        cursor: grabbing;
      }
      #ps-ultimate-panel .ps-prio-row.drag-over {
        border-color: #ffcb3d;
        background: rgba(255,203,61,.1);
      }
      #ps-ultimate-panel .ps-prio-icon {
        font-size: 14px;
        width: 18px;
        text-align: center;
      }
      #ps-ultimate-panel .ps-prio-label {
        flex: 1;
        font-size: 11px;
        color: #e2e8f0;
      }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'ps-ultimate-panel';

    panel.innerHTML = `
      <div class="ps-head" id="ps-ultimate-head">
        <span>TheNgocHub2.0</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="ps-dev-toggle" style="background: ${useDev ? '#14532d' : '#334155'}; color: ${useDev ? '#86efac' : '#cbd5e1'}; border: 1px solid ${useDev ? '#22c55e' : '#475569'}; border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer; font-weight: bold; letter-spacing: normal; text-transform: none;" title="Toggle between main site and dev.html. Requires reload.">Dev: ${useDev ? 'ON' : 'OFF'}</button>
          <span class="ps-min" id="ps-ultimate-min">−</span>
        </div>
      </div>
      <div style="padding:7px 10px;background:#0b1b2b;border-bottom:1px solid #24506b;display:flex;justify-content:space-between;align-items:center;color:#bae6fd;font-size:11px"><span>Access Key</span><button id="tngh-get-key" class="pt-btn" type="button">Get Key</button></div>
      <div class="ps-tabs">
        <button data-tab="trainer" class="on">Trainer</button>
        <button data-tab="gacha">Progression</button>
        <button data-tab="hud">HUD</button>
      </div>
      <div class="ps-body" id="ps-ultimate-body">

        <div class="ps-pane on" data-pane="trainer">

          <div class="pt-section">
            <div class="pt-title">Stat Sliders (In-Run)</div>
            <div class="pt-grid">
              <button class="pt-toggle-btn" id="tog-strength" style="position: relative; overflow: hidden; z-index: 1;">
                <div id="strength-bg" style="position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: rgba(34, 197, 94, 0.4); z-index: -1; transition: width 0.1s;"></div> Attack
              </button>
              <button class="pt-toggle-btn" id="tog-fortune" style="position: relative; overflow: hidden; z-index: 1;">
                <div id="fortune-bg" style="position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: rgba(34, 197, 94, 0.4); z-index: -1; transition: width 0.1s;"></div> Coins
              </button>
              <button class="pt-toggle-btn" id="tog-reflexes" style="position: relative; overflow: hidden; z-index: 1;">
                <div id="reflexes-bg" style="position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: rgba(34, 197, 94, 0.4); z-index: -1; transition: width 0.1s;"></div> Cooldown
              </button>
              <button class="pt-toggle-btn" id="tog-critical" style="position: relative; overflow: hidden; z-index: 1;">
                <div id="critical-bg" style="position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: rgba(34, 197, 94, 0.4); z-index: -1; transition: width 0.1s;"></div> Crit
              </button>
              <button class="pt-toggle-btn" id="tog-armor" style="position: relative; overflow: hidden; z-index: 1;">
                <div id="armor-bg" style="position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: rgba(34, 197, 94, 0.4); z-index: -1; transition: width 0.1s;"></div> Defense
              </button>
              <button class="pt-toggle-btn" id="tog-vitality" style="position: relative; overflow: hidden; z-index: 1;">
                <div id="vitality-bg" style="position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: rgba(34, 197, 94, 0.4); z-index: -1; transition: width 0.1s;"></div> HP
              </button>
              <button class="pt-toggle-btn" id="tog-automagnet" style="position: relative; overflow: hidden; z-index: 1;">
                <div id="magnet-bg" style="position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: rgba(34, 197, 94, 0.4); z-index: -1; transition: width 0.1s;"></div> Magnet
              </button>
              <button class="pt-toggle-btn" id="tog-synthesis" style="position: relative; overflow: hidden; z-index: 1;">
                <div id="synthesis-bg" style="position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: rgba(34, 197, 94, 0.4); z-index: -1; transition: width 0.1s;"></div> Regen
              </button>
              <button class="pt-toggle-btn" id="tog-stride" style="position: relative; overflow: hidden; z-index: 1;">
                <div id="stride-bg" style="position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: rgba(34, 197, 94, 0.4); z-index: -1; transition: width 0.1s;"></div> Speed
              </button>
              <button class="pt-toggle-btn" id="tog-wisdom" style="position: relative; overflow: hidden; z-index: 1;">
                <div id="wisdom-bg" style="position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: rgba(34, 197, 94, 0.4); z-index: -1; transition: width 0.1s;"></div> XP
              </button>
              <button class="pt-toggle-btn pt-gold pt-full" id="tog-godmode" title="Keyboard shortcut: G"> GODMODE (G) </button>
            </div>
          </div>

          <div class="pt-section">
            <div class="pt-title">Run Utilities</div>
            <div class="pt-grid">
              <button class="pt-btn" id="btn-reroll"> +10 Reroll</button>
              <button class="pt-btn pt-gold" id="btn-bomb" title="Keyboard shortcut: B"> Bomb (B)</button>
              <button class="pt-toggle-btn" id="tog-autoRift"> Rift</button>
              <button class="pt-toggle-btn" id="tog-instantChest"> Insta-Chest</button>
              <button class="pt-toggle-btn" id="tog-fly"> Fly</button>
              <button class="pt-toggle-btn" id="tog-autoEvade"> Evade</button>
              <button class="pt-toggle-btn" id="tog-autoSwarm"> Swarm</button>
              <button class="pt-btn" id="btn-lvlup">⬆ Level Up</button>
            </div>
          </div>

          <div class="pt-section">
            <div class="pt-title">Auto Level-Up</div>
            <div class="pt-grid pt-two-col" style="margin-bottom: 8px;">
              <button class="pt-toggle-btn" id="tog-autolevel"> Stats</button>
              <button class="pt-toggle-btn" id="tog-autolevel-all"> Always</button>
            </div>
            <details style="margin-bottom: 16px;">
              <summary style="cursor: pointer; font-size: 10px; color: #94a3b8; display: flex; justify-content: center; align-items: center; outline: none; user-select: none; padding: 4px 0; position: relative;">
                <span> Configure Priority Order</span>
                <span id="btn-reset-priority" style="position: absolute; right: 0; cursor: pointer; color: #38bdf8; font-weight: bold;" title="Reset to default">↺ Reset</span>
              </summary>
              <div id="ps-priority-list" style="display: flex; flex-direction: column; gap: 4px; padding: 4px; margin-top: 4px; background: rgba(0,0,0,0.2); border-radius: 6px; max-height: 150px; overflow-y: auto;"></div>
            </details>
          </div>

          <div class="pt-section">
            <div class="pt-title">Abilities</div>
            <select id="ps-ability-select" class="pt-input" style="margin-bottom: 6px;"></select>
            <div class="pt-grid pt-two-col" style="margin-bottom: 6px;">
              <button class="pt-btn" id="btn-ability-plus">Level +1</button>
              <button class="pt-btn" id="btn-ability-max">Max Level</button>
            </div>
            <div class="pt-grid">
              <select id="ps-ability-change-select" class="pt-input" style="margin-bottom: 0;"></select>
              <button class="pt-btn pt-blue" id="btn-ability-change">Change</button>
            </div>
          </div>

          <div id="pt-toast"></div>
        </div>

        <div class="ps-pane" data-pane="gacha">

          <!-- Currencies -->
          <div class="pt-section">
            <div class="pt-title">Currencies</div>
            <div class="pt-grid">
              <input type="number" id="ps-currency-amount" class="pt-input" step="1" value="5000"
                    placeholder="Amount (e.g. 5000 or -5000)"
                    title="Enter a positive number to ADD, or a negative number to REMOVE. Then click Coins or a Ticket button."
                    style="grid-column: span 2; margin-bottom: 6px;">
              <div style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px;">
                <button class="pt-btn pt-gold" id="btn-coins-apply"
                        title="Add the amount of coins in the field. Use a negative value to REMOVE coins instead."> Coins</button>
                <button class="pt-btn pt-gold" id="btn-t1-apply"
                        title="Add the amount of GOLD (×1) tickets in the field. Use a negative value to REMOVE them instead."> Gold</button>
                <button class="pt-btn pt-purple" id="btn-purp-apply"
                        title="Add the amount of PURPLE (×10) tickets in the field. Use a negative value to REMOVE them instead."> Purple</button>
              </div>
            </div>
          </div>

          <!-- Pokédex & Gacha -->
          <div class="pt-section">
            <div class="pt-title">Pokédex & Gacha</div>
            <div class="pt-grid">
              <input type="text" id="pt-mon-input" class="pt-input" placeholder="Dex # or Name"
                    style="grid-column: span 2; margin-bottom: 6px;">
              <div style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 6px;">
                <button class="pt-btn" id="btn-unlock-normal"
                        title="Unlock this Pokémon's NORMAL form in your Pokédex.">Unlock Normal</button>
                <button class="pt-btn pt-gold" id="btn-unlock-shiny"
                        title="Unlock this Pokémon's SHINY form in your Pokédex.">Unlock Shiny</button>
                <button class="pt-btn" id="btn-lock-normal"
                        title="Remove this Pokémon's NORMAL form from your Pokédex."
                        style="border-color:#ef4444; color:#fca5a5;">Lock Normal</button>
                <button class="pt-btn" id="btn-lock-shiny"
                        title="Remove this Pokémon's SHINY form from your Pokédex."
                        style="border-color:#ef4444; color:#fca5a5;">Lock Shiny</button>
              </div>
              <button class="pt-toggle-btn pt-full" style="margin-bottom: 6px;" id="tog-shinygacha"> 100% Shiny Rate</button>
              <button class="pt-btn pt-blue" id="btn-unlock-all"
                      title="Unlock every Pokémon in your Pokédex, both normal and shiny."> Unlock All</button>
              <button class="pt-btn" id="btn-lock-all"
                      title="Remove EVERY normal and shiny entry from your Pokédex. Asks for confirmation."
                      style="border-color:#ef4444; color:#fca5a5;"> Lock All</button>
            </div>
          </div>

          <!-- Batch Gacha -->
          <div class="pt-section">
            <div class="pt-title">Batch Gacha</div>
            <label class="pt-check" style="margin-bottom:6px">
              <input type="checkbox" id="ps-gacha-all"> Draw all tickets
            </label>
            <input type="number" id="ps-gacha-count" class="pt-input" min="1" max="100000" value="10">
            <select id="ps-gacha-gen" class="pt-input">
              <option value="1">Gen 1</option>
              <option value="2">Gen 2</option>
              <option value="3">Gen 3</option>
              <option value="4">Gen 4</option>
              <option value="5">Gen 5</option>
              <option value="6">Gen 6</option>
              <option value="7">Gen 7</option>
              <option value="8">Gen 8</option>
              <option value="9">Gen 9</option>
            </select>
            <div class="pt-grid">
              <button class="pt-btn" id="ps-gacha-start">▶ Start</button>
              <button class="pt-btn" id="ps-gacha-stop">■ Stop</button>
            </div>
            <div class="ps-note" id="ps-gacha-status">Ready</div>
            <div class="ps-note" id="ps-gacha-progress">Not started</div>
            <div id="ps-gacha-results"></div>
          </div>

          <!-- Ban / Veto Limit -->
          <div class="pt-section">
            <div class="pt-title">Ban / Veto Limit</div>
            <div class="pt-grid">
              <input type="number" id="ps-ban-limit" class="pt-input" min="1" max="20" value="10"
                     title="Set the maximum number of moves you can ban. Then click Apply."
                     style="grid-column: span 2; margin-bottom: 6px;">
              <button class="pt-btn pt-full" id="btn-apply-ban-limit"
                      title="Apply the limit to the game. Required before you can ban more than 3 moves.">Apply Limit</button>
              <button class="pt-btn pt-gold" id="btn-max-ban-lv"
                      title="Set the current Pokémon's Ban level to the max limit.">Max Lv (Selected)</button>
              <button class="pt-btn pt-gold" id="btn-max-ban-all"
                      title="Set EVERY Pokémon's Ban level to the max limit.">Max Lv (All)</button>
            </div>
          </div>
        </div> <!-- <--- ORA CHIUDE CORRETTAMENTE IL TAB PROGRESSION -->

        <div class="ps-pane" data-pane="hud">

          <div class="pt-section">
            <div class="pt-title">Panel Statistics</div>
            <div class="pt-check-grid">
              <label class="pt-check" title="Show or hide the entire HUD stats panel on the right."><input type="checkbox" id="hud-panel" checked>  Stats panel</label>
              <label class="pt-check" title="Show your current physical and special attack damage."><input type="checkbox" id="hud-atk" checked>  Atk / SpAtk</label>
              <label class="pt-check" title="Show the amount of coins collected in the current run."><input type="checkbox" id="hud-coins" checked>  Coins</label>
              <label class="pt-check" title="Show your current coin gain multiplier."><input type="checkbox" id="hud-coinmul" checked>  Coins mult.</label>
              <label class="pt-check" title="Show your attack cooldown multiplier. Lower is better."><input type="checkbox" id="hud-cd" checked>  Cooldown</label>
              <label class="pt-check" title="Show your chance to land a critical hit."><input type="checkbox" id="hud-crit" checked>  Crit</label>
              <label class="pt-check" title="Show your damage reduction percentage from armor."><input type="checkbox" id="hud-red" checked>  Defense</label>
              <label class="pt-check" title="Show the current camera zoom level (Field of View)."><input type="checkbox" id="hud-fov" checked>  FOV</label>
              <label class="pt-check" title="Show current and maximum health points."><input type="checkbox" id="hud-hp" checked>  HP</label>
              <label class="pt-check" title="Show the number of enemies defeated in the current run."><input type="checkbox" id="hud-kills" checked>  Kills</label>
              <label class="pt-check" title="Show your current loot magnet radius."><input type="checkbox" id="hud-magnet-stat" checked>  Magnet</label>
              <label class="pt-check" title="Show how much HP you regenerate per second."><input type="checkbox" id="hud-regen" checked>  Regen</label>
              <label class="pt-check" title="Show your movement speed."><input type="checkbox" id="hud-spd" checked>  Speed</label>
              <label class="pt-check" title="Show current and required experience for the next level."><input type="checkbox" id="hud-xp" checked>  XP Bar</label>
              <label class="pt-check" title="Show your current experience gain multiplier."><input type="checkbox" id="hud-xpmul" checked>  XP mult.</label>
            </div>
          </div>

          <div class="pt-section">
            <div class="pt-title">World Overlay</div>
            <div class="pt-check-grid">
              <div style="grid-column: span 2; display: flex; align-items: center; gap: 8px; padding: 2px 0; margin-bottom: 4px;">
                <label class="pt-check" title="Show markers for chests (yellow), altars (gray), and springs (light blue)." style="flex: 0 0 auto; margin: 0;">
                  <input type="checkbox" id="hud-poi" checked> Item Finder
                </label>
                <input type="range" id="hud-poi-range" min="1000" max="5000" step="500" value="${hudCfg.poiRange || 2000}" style="flex: 1; accent-color: #ffcb3d; margin: 0;">
                <span id="hud-poi-range-val" style="font-size: 10px; color: #94a3b8; min-width: 32px; text-align: right;">${hudCfg.poiRange || 2000}</span>
              </div>

              <label class="pt-check" title="Draw a ring under enemies showing if your attack type is effective against them."><input type="checkbox" id="hud-ring" checked> Type rings</label>
              <label class="pt-check" title="Highlight healer, shielder, and summoner enemies with a dashed circle."><input type="checkbox" id="hud-support" checked> Support hints</label>
              <label class="pt-check" title="Draw visual warnings on the ground for enemy area-of-effect attacks."><input type="checkbox" id="hud-haz" checked> Warnings</label>
              <label class="pt-check" title="Draw a circle around the player showing the loot magnet radius."><input type="checkbox" id="hud-magnetCircle"> Magnet circle</label>
              <label class="pt-check" title="Draw arrows pointing towards off-screen bosses and thieves."><input type="checkbox" id="hud-arrows" checked> Boss arrows</label>
              <label class="pt-check" title="Play a sound and show a banner when a shiny, thief, or rift appears."><input type="checkbox" id="hud-alerts" checked> Alerts</label>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // TheNgocHub2.0 image launcher (user-provided artwork)
    const launcher = document.createElement('button');
    launcher.id = 'tngh-floating-launcher';
    launcher.type = 'button';
    launcher.setAttribute('aria-label', 'Open TheNgocHub2.0');
    launcher.style.cssText = "position:fixed;z-index:2147483646;left:18px;top:38%;width:66px;height:66px;padding:0;border:2px solid #38bdf8;border-radius:50%;overflow:hidden;background:#07111f;box-shadow:0 0 18px #0284c7;cursor:grab;display:none;touch-action:none";
    launcher.innerHTML = `<img alt="TheNgocHub2.0" src="data:image/jpeg;base64,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" style="width:100%;height:100%;object-fit:cover;pointer-events:none">`;
    document.body.appendChild(launcher);
    let bubbleDrag = null;
    launcher.addEventListener('pointerdown', e => { bubbleDrag = {x:e.clientX,y:e.clientY,left:launcher.offsetLeft,top:launcher.offsetTop,moved:false}; launcher.setPointerCapture(e.pointerId); });
    launcher.addEventListener('pointermove', e => { if(!bubbleDrag) return; const dx=e.clientX-bubbleDrag.x, dy=e.clientY-bubbleDrag.y; if(Math.abs(dx)+Math.abs(dy)>5) bubbleDrag.moved=true; launcher.style.left=Math.max(0,Math.min(innerWidth-66,bubbleDrag.left+dx))+'px'; launcher.style.top=Math.max(0,Math.min(innerHeight-66,bubbleDrag.top+dy))+'px'; });
    launcher.addEventListener('pointerup', () => { if(bubbleDrag && !bubbleDrag.moved) { panel.style.display='block'; launcher.style.display='none'; } bubbleDrag=null; });


    // inizio funzione sezioni comprimibili
    panel.querySelectorAll('.pt-title').forEach(title => {
      title.addEventListener('click', () => {
        title.parentElement.classList.toggle('collapsed');
      });
    });
    // fine funzione sezioni comprimibili

    // inizio funzione Panel Layout & Resize
    panel.style.resize = 'both';
    panel.style.overflow = 'hidden';
    // Giới hạn chiều cao theo màn hình để phần nội dung bên trong có thể cuộn hết.
    panel.style.maxHeight = 'calc(100vh - 32px)';
    panel.style.maxHeight = 'calc(100dvh - 32px)';
    panel.style.minWidth = '240px';
    const scrollBody = panel.querySelector('.ps-body');
    if (scrollBody) {
      scrollBody.style.overflowY = 'auto';
      scrollBody.style.overflowX = 'hidden';
      scrollBody.style.webkitOverflowScrolling = 'touch';
      scrollBody.style.overscrollBehaviorY = 'contain';
      scrollBody.style.touchAction = 'pan-y';
      scrollBody.style.minHeight = '0';
    }
    panel.style.minHeight = '200px';

    (function applyPanelLayout() {
      const r = clampLayoutRect(
        { left: layout.panel.left, top: layout.panel.top, width: layout.panel.width, height: layout.panel.height },
        240, 200
      );
      if (layout.panel.left !== null && layout.panel.top !== null) {
        panel.style.left = r.left + 'px';
        panel.style.top = r.top + 'px';
        panel.style.right = 'auto';
      }
      panel.style.width = r.width + 'px';
      if (r.height && r.height > 100) {
        panel.style.height = r.height + 'px';
      }
      panel.dataset.baseBg = 'rgba(10, 15, 29, 0.96)';
      applyOpacity(panel, layout.panel.opacity, layout.panel.blur);
    })();

    // inizio funzione Dev Toggle
    const devToggleBtn = document.getElementById('ps-dev-toggle');
    if (devToggleBtn) {
      devToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCurrentlyDev = localStorage.getItem('ps_use_dev_version') === 'true';

        if (isCurrentlyDev) {
          // Eri in modalità Dev, ora passi alla Main
          localStorage.setItem('ps_use_dev_version', 'false');
          window.location.href = '/';
        } else {
          // Eri in modalità Main, ora passi alla Dev
          localStorage.setItem('ps_use_dev_version', 'true');
          window.location.href = '/dev.html';
        }
      });
    }
    // fine funzione Dev Toggle

    let panelMinimized = false;

    const panelObserver = new ResizeObserver(() => {
      if (panelMinimized) return;
      layout.panel.width = panel.offsetWidth;
      layout.panel.height = panel.offsetHeight;
      saveLayout();
    });
    panelObserver.observe(panel);

    const getKeyBtn = document.getElementById('tngh-get-key');
    if (getKeyBtn) getKeyBtn.addEventListener('click', () => showToast('Get Key server is not configured. A verification URL/API is required.'));

    document.getElementById('ps-ultimate-min').addEventListener('click', () => {
      const body = document.getElementById('ps-ultimate-body');
      const tabs = panel.querySelector('.ps-tabs');

      if (!panelMinimized) {
        layout.panel.height = panel.offsetHeight;
        saveLayout();
        tabs.style.display = 'none';
        body.style.display = 'none';
        panel.style.height = 'auto';
        panel.style.minHeight = '0';
        panelMinimized = true;
        panel.style.display = 'none';
        launcher.style.display = 'block';
        document.getElementById('ps-ultimate-min').textContent = '+';
      } else {
        tabs.style.display = 'flex';
        body.style.display = 'block';
        panel.style.height = layout.panel.height ? layout.panel.height + 'px' : '';
        panel.style.minHeight = '200px';
        panelMinimized = false;
        panel.style.display = 'block';
        launcher.style.display = 'none';
        document.getElementById('ps-ultimate-min').textContent = '−';
      }
    });

    const savePanelPosition = () => {
      layout.panel.left = panel.offsetLeft;
      layout.panel.top = panel.offsetTop;
      saveLayout();
    };
    window.addEventListener('mouseup', savePanelPosition);
    // fine funzione Panel Layout & Resize

    // inizio funzione addOpacitySlider (Panel)
    (function addOpacitySlider() {
      const body = document.getElementById('ps-ultimate-body');
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.08)';
      wrap.innerHTML = `
        <span style="font-size:10px;color:#94a3b8;white-space:nowrap">Opacity</span>
        <input type="range" min="0.2" max="1" step="0.05" value="${layout.panel.opacity}"
               style="flex:1;accent-color:#ffcb3d">
        <span style="font-size:10px;color:#94a3b8;min-width:28px;text-align:right" class="ps-op-val">${Math.round(layout.panel.opacity*100)}%</span>
        <button type="button" class="ps-blur-btn" title="Toggle background blur"
                style="border:1px solid #334155;background:#1e293b;color:#cbd5e1;border-radius:5px;padding:1px 6px;font-size:10px;cursor:pointer;min-width:38px">
          ${layout.panel.blur ? 'Blur' : 'None'}
        </button>
      `;
      body.insertBefore(wrap, body.firstChild);
      const range = wrap.querySelector('input');
      const val = wrap.querySelector('.ps-op-val');
      const btn = wrap.querySelector('.ps-blur-btn');
      range.addEventListener('input', () => {
        const v = parseFloat(range.value);
        layout.panel.opacity = v;
        applyOpacity(panel, v, layout.panel.blur);
        val.textContent = Math.round(v * 100) + '%';
        saveLayout();
      });
      btn.addEventListener('click', () => {
        layout.panel.blur = !layout.panel.blur;
        btn.textContent = layout.panel.blur ? 'Blur' : 'None';
        applyOpacity(panel, layout.panel.opacity, layout.panel.blur);
        saveLayout();
      });
    })();
    // fine funzione addOpacitySlider (Panel)

    // inizio funzione showToast
    let toastTimer = null;
    function showToast(msg) {
      const t = document.getElementById('pt-toast');
      if (!t) return;
      t.textContent = msg;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.textContent = '', 2600);
    }
    // fine funzione showToast

    // inizio funzione Panel Drag
    const head = document.getElementById('ps-ultimate-head');
    let drag = null;
    head.addEventListener('mousedown', e => {
      if (e.target.closest('span') && e.target.id !== 'ps-ultimate-head') return;
      drag = { x: e.clientX, y: e.clientY, ox: panel.offsetLeft, oy: panel.offsetTop };
      head.style.cursor = 'grabbing';
    });
    head.addEventListener('touchstart', e => { const t=e.touches[0]; if(!t) return; drag={x:t.clientX,y:t.clientY,ox:panel.offsetLeft,oy:panel.offsetTop}; }, {passive:true});
    window.addEventListener('touchmove', e => { if(!drag) return; const t=e.touches[0]; if(!t) return; panel.style.left=(drag.ox+t.clientX-drag.x)+'px'; panel.style.top=(drag.oy+t.clientY-drag.y)+'px'; panel.style.right='auto'; }, {passive:true});
    window.addEventListener('touchend', () => { drag=null; });
    window.addEventListener('mousemove', e => {
      if (!drag) return;
      panel.style.left = (drag.ox + e.clientX - drag.x) + 'px';
      panel.style.top = (drag.oy + e.clientY - drag.y) + 'px';
      panel.style.right = 'auto';
    });
    window.addEventListener('mouseup', () => { drag = null; head.style.cursor = 'grab'; });
    // fine funzione Panel Drag

    // inizio funzione Tab Switching
    panel.querySelectorAll('.ps-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        panel.querySelectorAll('.ps-tabs button').forEach(b => b.classList.toggle('on', b === btn));
        panel.querySelectorAll('.ps-pane').forEach(p => p.classList.toggle('on', p.dataset.pane === tab));
      });
    });
    // fine funzione Tab Switching

    // inizio funzione bindToggle
    function bindToggle(elId, key, label, tooltip, onEnable, onDisable) {
      const btn = document.getElementById(elId);
      if (!btn) return;
      if (tooltip) btn.title = tooltip;
      if (toggles[key]) btn.classList.add('on');

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggles[key] = !toggles[key];
        btn.classList.toggle('on', toggles[key]);
        saveToggles();

        if (toggles[key]) {
          if (onEnable) onEnable();
          showToast(`[ON] ${label}`);
        } else {
          if (onDisable) onDisable();
          showToast(`[OFF] ${label}`);
        }
      });
    }
    // fine funzione bindToggle

    // inizio funzione Bind Stat Sliders
    const statSliders = [
      { id: 'tog-vitality', bg: 'vitality-bg', key: 'vitality', label: 'HP' },
      { id: 'tog-strength', bg: 'strength-bg', key: 'strength', label: 'Attack' },
      { id: 'tog-stride', bg: 'stride-bg', key: 'stride', label: 'Speed' },
      { id: 'tog-reflexes', bg: 'reflexes-bg', key: 'reflexes', label: 'Cooldown' },
      { id: 'tog-armor', bg: 'armor-bg', key: 'armor', label: 'Defense' },
      { id: 'tog-synthesis', bg: 'synthesis-bg', key: 'synthesis', label: 'Regen' },
      { id: 'tog-wisdom', bg: 'wisdom-bg', key: 'wisdom', label: 'XP' },
      { id: 'tog-fortune', bg: 'fortune-bg', key: 'fortune', label: 'Coins' },
      { id: 'tog-critical', bg: 'critical-bg', key: 'critical', label: 'Crit' },
      { id: 'tog-automagnet', bg: 'magnet-bg', key: 'magnet', label: 'Magnet' }
    ];

    statSliders.forEach(({ id, bg, key, label }) => {
      const btn = document.getElementById(id);
      const bgEl = document.getElementById(bg);
      if (!btn || !bgEl) return;

      if (toggles[key + 'Slider'] === undefined) toggles[key + 'Slider'] = 0;
      if (toggles[key + 'Slider'] > 0) btn.classList.add('on');
      bgEl.style.width = `${toggles[key + 'Slider']}%`;

      let isDragging = false;

      const update = (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));

        toggles[key + 'Slider'] = pct;
        bgEl.style.width = `${pct}%`;

        if (pct > 0) {
          toggles[key] = true;
          btn.classList.add('on');
        } else {
          toggles[key] = false;
          btn.classList.remove('on');
        }
        saveToggles();
      };

      btn.addEventListener('mousedown', (e) => {
        isDragging = true;
        update(e);
        e.preventDefault();
        e.stopPropagation();
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        update(e);
      });

      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          if (toggles[key + 'Slider'] === 0) {
            toggles[key] = false;
            btn.classList.remove('on');
            saveToggles();
          }
        }
      });
    });
    // fine funzione Bind Stat Sliders

    // inizio funzione Godmode Toggle
    bindToggle('tog-godmode', 'godmode', ' GODMODE ', 'Activates ALL stat toggles and infinite HP.',
      () => {
        statSliders.forEach(({ id, bg, key }) => {
          const btn = document.getElementById(id);
          const bgEl = document.getElementById(bg);
          if (!btn || !bgEl) return;
          toggles[key + 'Slider'] = 100;
          toggles[key] = true;
          btn.classList.add('on');
          bgEl.style.width = '100%';
        });
        saveToggles();
      },
      () => {
        // Quando disattivi il Godmode, mettiamo semplicemente tutti gli slider a 0.
        // Ci penserà lo Stat Loop a rimuovere i bonus in eccesso e ripristinare i valori,
        // preservando i potenziamenti del level up!
        statSliders.forEach(({ id, bg, key }) => {
          const btn = document.getElementById(id);
          const bgEl = document.getElementById(bg);
          if (!btn || !bgEl) return;
          toggles[key + 'Slider'] = 0;
          toggles[key] = false;
          btn.classList.remove('on');
          bgEl.style.width = '0%';
        });
        saveToggles();
      }
    );
    // fine funzione Godmode Toggle

    // inizio funzione Bind Other Toggles & Buttons (Run Utilities)
    bindToggle('tog-fly', 'fly', ' Fly', 'Walk through walls and ignore lava/water.', null, null);
    bindToggle('tog-autoEvade', 'autoEvade', ' Evade', 'Automatically dodges enemy projectiles and enemies.', null, null);
    bindToggle('tog-autoSwarm', 'autoSwarm', ' Swarm', 'Spawns extra enemies around you.', null, null);

    document.getElementById('btn-reroll').onclick = (e) => {
      e.stopPropagation();
      const p = getPlayer();
      if (p) {
        p.rerollBonus = (p.rerollBonus || 0) + 10;
        showToast('+10 Rerolls');
      } else {
        showToast(' Available only inside runs');
      }
    };

    document.getElementById('btn-bomb').onclick = (e) => {
      e.stopPropagation();
      const g = G(), p = getPlayer();
      if (!p || p.dead || !g || !g.Game || g.Game.state !== 'playing' || !g.EnemyMgr) {
        showToast(' Available only inside runs');
        return;
      }
      const damage = 60 + 14 * (Number(p.level) || 1);
      const radius = g.Camera && typeof g.Camera.outerRadius === 'function' ? g.Camera.outerRadius() : 520;

      if (g.Camera && typeof g.Camera.kick === 'function') g.Camera.kick(0.8);
      if (g.FX && typeof g.FX.ring === 'function') g.FX.ring(p.x, p.y, 20, radius, '#ff7b3d', 0.5, 6);
      if (g.Audio && typeof g.Audio.sfx === 'function') g.Audio.sfx('break');

      for (const enemy of g.EnemyMgr.all()) {
        if (!enemy || enemy.dead || typeof enemy.hurt !== 'function') continue;
        const dx = enemy.x - p.x, dy = enemy.y - p.y;
        if (dx*dx + dy*dy <= radius*radius) {
          enemy.hurt(99999, '#ff7b3d', dx, dy, 160);
        }
      }
      showToast(' Bomb detonated!');
    };
    // fine funzione Bind Other Toggles & Buttons

    // inizio funzione Keybinds
    window.addEventListener('keydown', (e) => {
      // 1. Ignora se stai scrivendo in un input, textarea o se il tasto è un modificatore
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const key = e.key.toLowerCase();

      // 2. Tasto B per la Bomba
      if (key === 'b') {
        const bombBtn = document.getElementById('btn-bomb');
        if (bombBtn) bombBtn.click(); // Simula il click sul pulsante
      }

      // 3. Tasto G per il Godmode
      if (key === 'g') {
        const godBtn = document.getElementById('tog-godmode');
        if (godBtn) godBtn.click(); // Simula il click sul pulsante
      }
    });
    // fine funzione Keybinds

    // inizio funzione Bind Currency Buttons
    const currencyInput = document.getElementById('ps-currency-amount');
    const coinsApplyBtn = document.getElementById('btn-coins-apply');
    const t1ApplyBtn = document.getElementById('btn-t1-apply');
    const purpApplyBtn = document.getElementById('btn-purp-apply');
    const readCurrencyAmount = () => {
      const n = parseInt(currencyInput?.value, 10);
      if (!Number.isFinite(n) || n === 0) { showToast(' Enter a non-zero number'); return null; }
      return n;
    };
    if (coinsApplyBtn) {
      coinsApplyBtn.addEventListener('click', () => {
        const n = readCurrencyAmount(); if (n === null) return;
        addCoins(n);
        showToast(`${n > 0 ? '+' : ''}${n.toLocaleString()} Coins`);
      });
    }

    if (t1ApplyBtn) {
      t1ApplyBtn.addEventListener('click', () => {
        const n = readCurrencyAmount(); if (n === null) return;
        addGoldTickets(n);
        showToast(`${n > 0 ? '+' : ''}${n.toLocaleString()} Gold tickets`);
      });
    }

    if (purpApplyBtn) {
      purpApplyBtn.addEventListener('click', () => {
        const n = readCurrencyAmount(); if (n === null) return;
        addPurpleTickets(n);
        showToast(`${n > 0 ? '+' : ''}${n.toLocaleString()} Purple tickets`);
      });
    }
    // fine funzione Bind Currency Buttons

    // inizio funzione Bind Ban / Veto UI
    const banLimitInput = document.getElementById('ps-ban-limit');
    const applyBanLimitBtn = document.getElementById('btn-apply-ban-limit');
    const maxBanLvBtn = document.getElementById('btn-max-ban-lv');
    const maxBanAllBtn = document.getElementById('btn-max-ban-all');

    if (banLimitInput) banLimitInput.value = getCustomBanLimit();

    if (applyBanLimitBtn) {
      applyBanLimitBtn.onclick = () => {
        let val = parseInt(banLimitInput.value, 10);
        if (!Number.isFinite(val) || val < 1) { showToast(' Invalid limit'); return; }

        val = Math.min(20, val); // Forza il massimo a 20
        banLimitInput.value = val; // Aggiorna visivamente l'input

        localStorage.setItem('ps_custom_ban_limit', String(val));
        applyBanLimit(val);

        const sel = document.getElementById('upg-mon');
        if (sel && typeof sel.onchange === 'function') sel.onchange();

        showToast(`Ban limit set to ${val}`);
      };
    }

    if (maxBanLvBtn) {
      maxBanLvBtn.onclick = () => {
        const g = G();
        if (!g || !g.DB || !g.DB.upgradesOf) return;
        const sel = document.getElementById('upg-mon');
        const dex = sel ? parseInt(sel.value, 10) : g.DB.save.partner;
        if (!dex) { showToast(' No Pokémon selected'); return; }

        const limit = getCustomBanLimit();
        applyBanLimit(limit);
        g.DB.upgradesOf(dex).ban = limit;
        g.DB.commit();

        if (sel && typeof sel.onchange === 'function') sel.onchange();
        showToast(`Max Ban (Lv ${limit}) applied to #${dex}`);
      };
    }

    if (maxBanAllBtn) {
      maxBanAllBtn.onclick = () => {
        const g = G();
        if (!g || !g.DB || !g.DB.save || !g.DB.save.pupg) return;
        const limit = getCustomBanLimit();
        applyBanLimit(limit);
        let count = 0;
        for (const dex in g.DB.save.pupg) {
          g.DB.save.pupg[dex].ban = limit;
          count++;
        }
        g.DB.commit();

        const sel = document.getElementById('upg-mon');
        if (sel && typeof sel.onchange === 'function') sel.onchange();
        showToast(`Max Ban (Lv ${limit}) applied to ${count} Pokémon`);
      };
    }
    // fine funzione Bind Ban / Veto UI

    // inizio funzione Abilities Logic
    function refreshAbilityList() {
      const p = getPlayer();
      const sel = document.getElementById('ps-ability-select');
      const changeSel = document.getElementById('ps-ability-change-select');
      if (!p || !p.moves || !sel || !changeSel) return;

      const currentVal = sel.value;
      sel.innerHTML = '';
      p.moves.forEach((move, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `${move.name} (Lvl ${move.lvl || 1}/${move.def?.maxLvl || move.maxLvl || '?'})`;
        sel.appendChild(opt);
      });
      if (currentVal && sel.options[currentVal]) sel.value = currentVal;

      const g = G();
      if (g && g.Moves && g.Moves.BY_ID) {
        changeSel.innerHTML = '';
        Object.values(g.Moves.BY_ID).forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = m.name;
          changeSel.appendChild(opt);
        });
      }
    }

    document.getElementById('ps-ability-select').addEventListener('focus', refreshAbilityList);
    document.getElementById('btn-ability-plus').onclick = (e) => {
      e.stopPropagation();
      const p = getPlayer(), g = G();
      if (!p || !g || !g.Moves) return;
      const idx = document.getElementById('ps-ability-select').value;
      const move = p.moves[idx];
      if (move && g.Moves.levelUp) {
        g.Moves.levelUp(move);
        showToast(`Leveled up ${move.name}`);
        refreshAbilityList();
      }
    };

    document.getElementById('btn-ability-max').onclick = (e) => {
      e.stopPropagation();
      const p = getPlayer(), g = G();
      if (!p || !g || !g.Moves) return;
      const idx = document.getElementById('ps-ability-select').value;
      const move = p.moves[idx];
      if (move && g.Moves.levelUp) {
        const maxLvl = move.def?.maxLvl || move.maxLvl || 10;
        while (move.lvl < maxLvl && g.Moves.levelUp(move));
        showToast(`Maxed out ${move.name}`);
        refreshAbilityList();
      }
    };

    document.getElementById('btn-ability-change').onclick = (e) => {
      e.stopPropagation();
      const p = getPlayer(), g = G();
      if (!p || !g || !g.Moves || !g.Moves.BY_ID) return;

      const idx = parseInt(document.getElementById('ps-ability-select').value, 10);
      const currentMove = p.moves[idx];
      const newId = document.getElementById('ps-ability-change-select').value;
      if (!currentMove || !newId) return;

      const definition = g.Moves.BY_ID[newId];
      if (!definition) return;

      // Crea la nuova istanza della mossa
      const replacement = g.Moves.instance(newId, currentMove.lvl || 1);
      if (!replacement) return;

      replacement.since = currentMove.since || 0;
      replacement.t = 0;

      if (currentMove.evolved && g.Moves.evolve) {
        g.Moves.evolve(replacement);
      }

      // Sostituisce nell'array
      p.moves[idx] = replacement;

      // Sostituisce negli slot (se presenti)
      if (Array.isArray(p.slots)) {
        for (const group of p.slots) {
          if (!Array.isArray(group)) continue;
          for (let i = 0; i < group.length; i++) {
            if (group[i] === currentMove) group[i] = replacement;
          }
        }
      }

      // Sostituisce nei tasti assegnati
      if (p.bind && typeof p.bind === 'object' && p.bind[currentMove.id] != null) {
        p.bind[newId] = p.bind[currentMove.id];
        delete p.bind[currentMove.id];
      }

      // Pulisce i proiettili e riordina
      if (g.Projectiles && g.Projectiles.clearOrbs) g.Projectiles.clearOrbs(p);
      if (p.arrange) p.arrange();

      showToast(`Changed to ${replacement.name}`);
      refreshAbilityList();
    };
    // fine funzione Abilities Logic

    // inizio funzione Bind Other Toggles
    bindToggle('tog-shinygacha', 'shinygacha', ' 100% Shiny', 'Forces every Gacha pull to be shiny.', () => {
      const g = G(); if (g && g.Gacha && g.Gacha.debugForceShiny) g.Gacha.debugForceShiny(9999);
    }, () => {
      const g = G(); if (g && g.Gacha && g.Gacha.debugForceShiny) g.Gacha.debugForceShiny(0);
    });

    bindToggle('tog-autolevel', 'autolevel', ' Stats', 'Automatically picks stat upgrades when no moves are offered.', () => installLevelUpHook(), null);
    bindToggle('tog-autolevel-all', 'autolevelAll', ' Always', 'Automatically picks EVERYTHING, including moves, bonds, and boss items.', () => installLevelUpHook(), null);
    bindToggle('tog-autoRift', 'autoRift', ' Rift', 'Teleports you directly into a Rift as soon as it spawns.', null, null);
    bindToggle('tog-instantChest', 'instantChest', ' Insta-Chest', 'Opens chests instantly upon contact.', null, null);
    // fine funzione Bind Other Toggles

    // inizio funzione Bind Level Up Button
    document.getElementById('btn-lvlup').onclick = (e) => {
      e.stopPropagation();
      const g = G();
      if (g && g.Game && g.Game.debugLevelUp) { g.Game.debugLevelUp(); showToast('Level +1'); }
      else showToast(' Available only inside runs');
    };
    // fine funzione Bind Level Up Button

    // Track a Pokémon selected in the game's Pokédex UI when its card exposes a dex id.
    let tnghSelectedDex = null;
    document.addEventListener('click', e => {
      if (e.target.closest('#ps-ultimate-panel')) return;
      const card = e.target.closest('[data-dex], [data-pokemon-dex], [data-pokedex-id]');
      if (!card) return;
      const rawDex = card.dataset.dex || card.dataset.pokemonDex || card.dataset.pokedexId;
      const dex = Number(rawDex);
      if (!Number.isInteger(dex) || dex <= 0) return;
      tnghSelectedDex = dex;
      const field = document.getElementById('pt-mon-input');
      if (field) field.value = String(dex);
      showToast('Selected Pokémon #' + dex);
    }, true);

    // inizio funzione Bind Pokédex Buttons
    document.getElementById('btn-unlock-all').onclick = () => { unlockAllDex(); showToast(' All unlocked'); };
    document.getElementById('btn-unlock-normal').onclick = () => {
      const v = tnghSelectedDex || document.getElementById('pt-mon-input').value;
      const r = unlockSinglePokemon(v, false);
      showToast(r ? `Unlocked: ${r}` : ' Invalid');
    };
    document.getElementById('btn-unlock-shiny').onclick = () => {
      const v = tnghSelectedDex || document.getElementById('pt-mon-input').value;
      const r = unlockSinglePokemon(v, true);
      showToast(r ? `Unlocked shiny: ${r}` : ' Invalid');
    };
    document.getElementById('btn-lock-all').onclick = () => {
      if (!confirm('Lock ALL Pokémon?\n\nThis will REMOVE every normal and shiny entry from your Pokédex. This cannot be undone.')) return;
      lockAllDex();
      showToast(' All Pokémon locked');
    };
    document.getElementById('btn-lock-normal').onclick = () => {
      const v = document.getElementById('pt-mon-input').value;
      const r = lockSinglePokemon(v, false);
      showToast(r ? `Locked: ${r}` : ' Invalid');
    };
    document.getElementById('btn-lock-shiny').onclick = () => {
      const v = document.getElementById('pt-mon-input').value;
      const r = lockSinglePokemon(v, true);
      showToast(r ? `Locked shiny: ${r}` : ' Invalid');
    };
    // fine funzione Bind Pokédex Buttons

    // inizio funzione Bind Gacha UI
    gachaStatus = document.getElementById('ps-gacha-status');
    gachaProgress = document.getElementById('ps-gacha-progress');
    document.getElementById('ps-gacha-all').addEventListener('change', e => {
      document.getElementById('ps-gacha-count').disabled = e.target.checked;
      if (e.target.checked) document.getElementById('ps-gacha-count').value = availableDraws();
    });
    document.getElementById('ps-gacha-start').addEventListener('click', gachaStart);
    document.getElementById('ps-gacha-stop').addEventListener('click', () => { gachaStop = true; gachaStatus.textContent = 'Stopping…'; });
    // fine funzione Bind Gacha UI

    // inizio funzione Bind HUD Checkboxes
    const hudMap = {
      'hud-panel': 'hudPanel', 'hud-fov': 'hudFov',
      'hud-hp': 'hudHp', 'hud-xp': 'hudXp',
      'hud-atk': 'hudAtk', 'hud-spd': 'hudSpd', 'hud-red': 'hudRed',
      'hud-regen': 'hudRegen', 'hud-crit': 'hudCrit', 'hud-kills': 'hudKills',
      'hud-coins': 'hudCoins', 'hud-cd': 'hudCd', 'hud-xpmul': 'hudXpMul', 'hud-coinmul': 'hudCoinMul',
      'hud-magnet-stat': 'hudMagnet',
      'hud-ring': 'hudRing', 'hud-support': 'hudSupport',
      'hud-haz': 'hudHaz', 'hud-magnetCircle': 'hudMagnetCircle',
      'hud-arrows': 'hudArrows', 'hud-poi': 'hudPoi',
      'hud-alerts': 'hudAlerts'
    };
    for (const [elId, key] of Object.entries(hudMap)) {
      const el = document.getElementById(elId);
      if (el) {
        el.checked = !!toggles[key];
        el.addEventListener('change', () => {
          toggles[key] = el.checked;
          saveToggles();
        });
      }
    }
    // fine funzione Bind HUD Checkboxes

    // inizio funzione Bind HUD Slider
    const poiRangeInput = document.getElementById('hud-poi-range');
    const poiRangeVal = document.getElementById('hud-poi-range-val');
    if (poiRangeInput && poiRangeVal) {
      poiRangeInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        hudCfg.poiRange = val;
        poiRangeVal.textContent = val;
        saveHudCfg();
      });
    }
    // fine funzione Bind HUD Slider

    // inizio funzione Priority List UI
    function renderPriorityList() {
      const listContainer = document.getElementById('ps-priority-list');
      if (!listContainer) return;

      const statInfo = {
        atk: { icon: '', name: 'Attack' },
        cd: { icon: '', name: 'Cooldown' },
        def: { icon: '', name: 'Defense' },
        xp: { icon: '', name: 'XP' },
        spd: { icon: '', name: 'Speed' },
        mag: { icon: '', name: 'Magnet' },
        hp: { icon: '', name: 'Max HP' },
        rgn: { icon: '', name: 'Regen' },
        heal: { icon: '', name: 'Heal' }
      };

      listContainer.innerHTML = '';

      statPriority.forEach((statId, index) => {
        const info = statInfo[statId] || { icon: '', name: statId };
        const row = document.createElement('div');
        row.className = 'ps-prio-row';
        row.draggable = true;
        row.dataset.id = statId;
        row.dataset.index = index;

        row.innerHTML = `
          <span style="color:#64748b; font-size:14px;">≡</span>
          <span class="ps-prio-icon">${info.icon}</span>
          <span class="ps-prio-label">${info.name}</span>
        `;

        row.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', index);
          e.dataTransfer.effectAllowed = 'move';
          row.style.opacity = '0.4';
        });

        row.addEventListener('dragend', () => {
          row.style.opacity = '1';
          document.querySelectorAll('.ps-prio-row').forEach(r => r.classList.remove('drag-over'));
        });

        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          row.classList.add('drag-over');
        });

        row.addEventListener('dragleave', () => {
          row.classList.remove('drag-over');
        });

        row.addEventListener('drop', (e) => {
          e.preventDefault();
          row.classList.remove('drag-over');
          const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
          const dropIndex = index;

          if (dragIndex !== dropIndex) {
            const movedItem = statPriority.splice(dragIndex, 1)[0];
            statPriority.splice(dropIndex, 0, movedItem);
            localStorage.setItem('ps_ultimate_priority', JSON.stringify(statPriority));
            renderPriorityList();
          }
        });

        listContainer.appendChild(row);
      });
    }

    document.getElementById('btn-reset-priority').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      statPriority = [...DEFAULT_PRIORITY];
      localStorage.setItem('ps_ultimate_priority', JSON.stringify(statPriority));
      renderPriorityList();
    });

    renderPriorityList();
    // fine funzione Priority List UI

    log('Panel built');
  }
  // fine funzione buildPanel

  // =========================================================================
  // INIT
  // =========================================================================

  // inizio funzione init
  function init() {
    if (!document.body) { setTimeout(init, 200); return; }
    buildPanel();
  }
  // fine funzione init

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // inizio funzione Retry Hooks Timer
  const hookTimer = setInterval(() => {
    if (hookCamera()) { /* camera ok */ }
    const g = G();
    const cand = (g && g.Enemy) || (window.G && window.G.Enemy);
    if (cand && typeof cand === 'function' && cand.prototype && typeof cand.prototype.draw === 'function') {
      patchEnemyClass(cand);
    }
    const hz = (g && g.Hazards) || (window.G && window.G.Hazards);
    if (hz && typeof hz.add === 'function') wrapHazards(hz);
    installLevelUpHook();
    if (Cam && curEnemy !== undefined && g && g.Enemy && g.Enemy._psHpPatched) clearInterval(hookTimer);
  }, 1000);
  // fine funzione Retry Hooks Timer

  log('TheNgocHub loaded');
})();
