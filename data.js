/* Communication Board: the starter board, and the rules for what a board may contain.
   No page code in this file, so it can be tested with plain `node test.js`.

   To change the starter board, edit STARTER below.
   Each tile is [label on the tile, what it says out loud, ARASAAC picture number].
   Leave the number off for a tile that shows words only.
   Find picture numbers by searching at https://arasaac.org/pictograms/search */
(function (root) {
  'use strict';

  var LIMITS = { sections: 40, tiles: 120, allTiles: 600, pinned: 2, name: 40, label: 40, say: 160, maxPicture: 9999999 };
  var COLOR = /^#[0-9a-fA-F]{6}$/;
  var FALLBACK_COLOR = '#5B6770';
  var ROLES = ['', 'urgent', 'pinned'];   // urgent: full width at the top. pinned: always on screen at the bottom.

  var STARTER = [
    { name: 'Right now', role: 'urgent', color: '#C62828', tiles: [
      ['Short of breath', 'I am short of breath', 34377],
      ['Choking', 'I am choking', 3406],
      ['Suction', 'I need suction', 35213],
      ['Pain', 'I am in pain', 30620],
      ['Feel sick', 'I feel sick', 38403],
      ['Dizzy', 'I feel dizzy', 35543]
    ]},
    { name: 'How I feel', role: '', color: '#3867B7', tiles: [
      ['Cold', 'I feel cold', 35583],
      ['Hot', 'I feel hot', 6952],
      ['Tired', 'I feel tired', 35537],
      ['Scared', 'I feel scared', 35535],
      ['Sad', 'I feel sad', 35545],
      ['Frustrated', 'I feel frustrated', 35541],
      ['Angry', 'I feel angry', 35539]
    ]},
    { name: 'Move me', role: '', color: '#00796B', tiles: [
      ['Sit up', 'Please help me sit up', 6549],
      ['Lie down', 'Please help me lie down', 6027],
      ['Turn', 'Please help me turn onto my other side', 26728],
      ['Raise or lower bed', 'Please move the head of the bed', 35341],
      ['Out of bed', 'Please help me get out of bed', 5099]
    ]},
    { name: 'Care', role: '', color: '#7B1FA2', tiles: [
      ['Moisten lips', 'Please moisten my lips', 38737],
      ['Bathroom', 'I need the bathroom', 5921],
      ['Shower', 'I would like a shower', 26803],
      ['Head massage', 'Please massage my head', 9010],
      ['Arm or leg massage', 'Please massage my arms or legs', 9010],
      ['Comfort me', 'I would like some comfort', 4550],
      ['Sleep', 'I want to sleep', 6479]
    ]},
    { name: 'Around me', role: '', color: '#9A5B00', tiles: [
      ['TV', 'I want to watch TV', 25498],
      ['Music', 'I want some music', 24791],
      ['Quiet', 'I want it quiet', 6071],
      ['Lights', 'Please change the lights', 2285],
      ['Blanket', 'I want a blanket', 2459],
      ['Go home', 'I want to go home', 6964]
    ]},
    { name: 'My things', role: '', color: '#5D4037', tiles: [
      ['Phone', 'I need my phone', 25269],
      ['Glasses', 'I need my glasses', 3329],
      ['Pen and paper', 'I need a pen and paper', 2380]
    ]},
    { name: 'People', role: '', color: '#2E7D32', tiles: [
      ['Doctor', 'I want to see the doctor', 6561],
      ['Nurse', 'I want to see the nurse', 6050],
      ['Family', 'I want to see my family', 38351]
    ]},
    { name: 'Where it hurts', role: '', color: '#AD1457', tiles: [
      ['Head', 'My head hurts', 2673],
      ['Neck', 'My neck hurts', 2727],
      ['Throat', 'My throat hurts', 3332],
      ['Mouth', 'My mouth hurts', 2663],
      ['Chest', 'My chest hurts', 2853],
      ['Stomach', 'My stomach hurts', 2786],
      ['Back', 'My back hurts', 2748],
      ['Arms', 'My arms hurt', 2669],
      ['Legs', 'My legs hurt', 8666]
    ]},
    { name: 'How much, 1 to 10', role: '', color: '#00698C', tiles: [
      ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'],
      ['6', '6'], ['7', '7'], ['8', '8'], ['9', '9'], ['10', '10']
    ]},
    { name: 'Quick replies', role: 'pinned', color: '#37474F', tiles: [
      ['Yes', 'Yes', 5584],
      ['No', 'No', 5526],
      ['Stop', 'Stop', 8289],
      ['Thank you', 'Thank you', 8129],
      ['I love you', 'I love you', 6898]
    ]}
  ];

  var counter = 0;
  function newId(kind) { counter += 1; return kind + '-' + counter; }

  /* Text from a person or a file: a string, trimmed and capped, with nothing invisible in it.
     Out go control characters, zero-width spaces, text-direction overrides and broken halves of emoji. */
  function cleanText(value, max) {
    if (typeof value !== 'string') return '';
    var text = value
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/[\u200B\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g, '')
      .replace(/([\uD800-\uDBFF][\uDC00-\uDFFF])|[\uD800-\uDFFF]/g, function (m, pair) { return pair || ''; })
      .replace(/\s+/g, ' ').trim();
    return Array.from(text).slice(0, max).join('').trim();   // counts an emoji as one, so none is cut in half
  }
  function cleanColor(value) {
    return typeof value === 'string' && COLOR.test(value) ? value : FALLBACK_COLOR;
  }
  function cleanPicture(value) {
    return Number.isInteger(value) && value >= 1 && value <= LIMITS.maxPicture ? value : null;
  }
  function cleanRole(value) {
    return ROLES.indexOf(value) !== -1 ? value : '';
  }

  function starterBoard() {
    return STARTER.map(function (s) {
      return {
        id: newId('section'), name: s.name, role: s.role, color: s.color,
        tiles: s.tiles.map(function (t) { return { id: newId('tile'), label: t[0], say: t[1], picture: t[2] || null }; })
      };
    });
  }

  /* The one gate every board passes through, whether it came from this browser's
     storage or from a backup file. Returns a freshly built board, or null.
     Only known fields are copied, so nothing unexpected rides along. */
  function validateBoard(input) {
    if (!input || typeof input !== 'object' || !Array.isArray(input.sections)) return null;
    if (input.sections.length < 1 || input.sections.length > LIMITS.sections) return null;
    var board = [], allTiles = 0, pinned = 0;
    for (var i = 0; i < input.sections.length; i++) {
      var s = input.sections[i];
      if (!s || typeof s !== 'object' || !Array.isArray(s.tiles)) return null;
      if (s.tiles.length > LIMITS.tiles) return null;
      allTiles += s.tiles.length;
      if (allTiles > LIMITS.allTiles) return null;
      var name = cleanText(s.name, LIMITS.name);
      if (!name) return null;
      var tiles = [];
      for (var j = 0; j < s.tiles.length; j++) {
        var t = s.tiles[j];
        if (!t || typeof t !== 'object') return null;
        var label = cleanText(t.label, LIMITS.label);
        if (!label) return null;
        tiles.push({
          id: newId('tile'), label: label,
          say: cleanText(t.say, LIMITS.say) || label,
          picture: cleanPicture(t.picture)
        });
      }
      var role = cleanRole(s.role);
      if (role === 'pinned' && ++pinned > LIMITS.pinned) role = '';   // too many would push the board off the screen
      board.push({ id: newId('section'), name: name, role: role, color: cleanColor(s.color), tiles: tiles });
    }
    return board;
  }

  /* What goes in a backup file or in storage. Ids are left out: they are remade on load. */
  function serializeBoard(board) {
    return {
      app: 'communication-board', version: 1,
      sections: board.map(function (s) {
        return {
          name: s.name, role: s.role, color: s.color,
          tiles: s.tiles.map(function (t) {
            var out = { label: t.label, say: t.say };
            if (t.picture) out.picture = t.picture;
            return out;
          })
        };
      })
    };
  }

  function validateSettings(input) {
    var s = input && typeof input === 'object' ? input : {};
    var rate = typeof s.rate === 'number' && s.rate >= 0.5 && s.rate <= 1.5 ? s.rate : 0.9;
    var size = ['fit', 'small', 'medium', 'large'].indexOf(s.size) !== -1 ? s.size : 'fit';
    return { voice: cleanText(s.voice, 200), rate: rate, size: size };
  }

  /* Fit the whole board on one screen with no scrolling.
     Sections are laid out in shelves (rows of sections). Every shelf holds the same number of tile rows.
     Tries every sensible mix of shelves and rows and keeps the one with the biggest tiles.
     `counts` is the number of tiles in each section, in order. Sizes are CSS pixels.
     The numbers in FIT must match the `.fit` rules in style.css.
     Returns null when tiles would be too small to tap, which is the cue to scroll instead. */
  var FIT = { padX: 10, padY: 8, between: 8, headH: 34, sideW: 21, gap: 5, smallest: 54 };

  function packShelves(cols, capacity) {
    var shelves = [[]], used = 0;
    for (var i = 0; i < cols.length; i++) {
      if (shelves[shelves.length - 1].length && used + cols[i] > capacity) { shelves.push([]); used = 0; }
      shelves[shelves.length - 1].push(i); used += cols[i];
    }
    return shelves;
  }

  function planFit(width, height, counts) {
    if (!(width > 0) || !(height > 0) || !counts.length) return null;
    var best = null;
    for (var rows = 1; rows <= 6; rows++) {
      var cols = counts.map(function (n) { return Math.max(1, Math.ceil(n / rows)); });
      var widest = Math.max.apply(null, cols), total = cols.reduce(function (a, b) { return a + b; }, 0);
      for (var capacity = total; capacity >= widest; capacity--) {
        var shelves = packShelves(cols, capacity);
        var S = shelves.length;
        var tileH = (height - 2 * FIT.padY - (S - 1) * FIT.between - S * FIT.headH - S * (rows - 1) * FIT.gap) / (S * rows);
        var tileW = Infinity;
        shelves.forEach(function (shelf) {
          var c = shelf.reduce(function (a, i) { return a + cols[i]; }, 0), k = shelf.length;
          tileW = Math.min(tileW, (width - 2 * FIT.padX - (k - 1) * FIT.between - k * FIT.sideW - (c - k) * FIT.gap) / c);
        });
        var score = Math.min(tileW, tileH * 1.08);
        if (!best || score > best.score + 0.01) {
          best = { score: score, rows: rows, cols: cols, shelves: shelves, tileW: Math.floor(tileW), tileH: Math.floor(tileH) };
        }
      }
    }
    if (!best || Math.min(best.tileW, best.tileH) < FIT.smallest) return null;
    best.label = Math.max(10, Math.min(19, Math.round(best.tileH * 0.155)));
    return best;
  }

  function pictureUrl(id) {
    var ok = cleanPicture(id);
    return ok ? 'https://static.arasaac.org/pictograms/' + ok + '/' + ok + '_300.png' : null;
  }

  function searchUrl(term) {
    return 'https://api.arasaac.org/v1/pictograms/en/search/' + encodeURIComponent(cleanText(term, 60));
  }

  /* Pulls usable pictures out of an ARASAAC search reply: the number, and a word to describe it. */
  function picturesFromSearch(reply, max) {
    if (!Array.isArray(reply)) return [];
    var found = [], seen = {};
    for (var i = 0; i < reply.length && found.length < max; i++) {
      var r = reply[i] && typeof reply[i] === 'object' ? reply[i] : {};
      var id = cleanPicture(r._id);
      if (!id || seen[id]) continue;
      seen[id] = true;
      var first = Array.isArray(r.keywords) && r.keywords[0] && typeof r.keywords[0] === 'object' ? r.keywords[0].keyword : '';
      found.push({ id: id, word: cleanText(first, 40) || 'Picture ' + id });
    }
    return found;
  }

  /* Every picture a board uses, once each. The offline helper keeps exactly these. */
  function picturesOnBoard(board) {
    var ids = [], seen = {};
    board.forEach(function (s) {
      s.tiles.forEach(function (t) {
        if (t.picture && !seen[t.picture]) { seen[t.picture] = true; ids.push(t.picture); }
      });
    });
    return ids;
  }

  var api = {
    LIMITS: LIMITS, starterBoard: starterBoard, validateBoard: validateBoard, serializeBoard: serializeBoard,
    validateSettings: validateSettings, planFit: planFit, pictureUrl: pictureUrl, searchUrl: searchUrl,
    picturesFromSearch: picturesFromSearch, picturesOnBoard: picturesOnBoard, cleanText: cleanText, cleanColor: cleanColor,
    cleanPicture: cleanPicture, newId: newId
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BoardData = api;
})(typeof self !== 'undefined' ? self : this);
