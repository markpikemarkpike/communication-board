/* Communication Board: everything you see and tap.
   Plain JavaScript, no libraries, no build step.
   Anything a person typed is put on the page with textContent, never as HTML. */
(function () {
  'use strict';

  var D = window.BoardData;
  var HOME = location.pathname.replace(/[^/]*$/, '');   // so two copies at one address keep separate boards
  var KEY_BOARD = 'communication-board:v1:' + HOME + ':board';
  var KEY_SETTINGS = 'communication-board:v1:' + HOME + ':settings';
  var IDLE_TEXT = 'Tap a picture to speak.';

  function $(id) { return document.getElementById(id); }
  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(className, text) {
    var b = make('button', className, text);
    b.type = 'button';
    return b;
  }
  function picture(id) {
    var img = make('img');
    img.alt = '';
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.src = D.pictureUrl(id);
    return img;
  }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  /* ---------- saved in this browser only ---------- */
  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  var board = D.validateBoard(read(KEY_BOARD)) || D.starterBoard();
  var settings = D.validateSettings(read(KEY_SETTINGS));
  var editing = false;
  var said = [];          // history, kept in memory only
  var lastSaid = '';

  function saveBoard() {
    $('saveWarning').hidden = write(KEY_BOARD, D.serializeBoard(board));
    keepPicturesOffline();
  }
  function saveSettings() { write(KEY_SETTINGS, settings); }

  function findSection(id) {
    for (var i = 0; i < board.length; i++) if (board[i].id === id) return board[i];
    return null;
  }
  function indexOfId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return -1;
  }

  /* A button that has to be tapped twice, for anything that cannot be undone. */
  function twoStep(node, action) {
    var label = node.textContent, armed = false, timer = null;
    function reset() {
      armed = false; clearTimeout(timer);
      node.textContent = label; node.classList.remove('armed');
    }
    node.addEventListener('click', function () {
      if (!armed) {
        armed = true; node.textContent = 'Tap again to confirm'; node.classList.add('armed');
        timer = setTimeout(reset, 4000);
        return;
      }
      reset(); action();
    });
    return reset;
  }

  /* ---------- speaking ---------- */
  var canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  function voices() { return canSpeak ? window.speechSynthesis.getVoices() : []; }
  function chosenVoice() {
    var list = voices();
    for (var i = 0; i < list.length; i++) if (list[i].voiceURI === settings.voice) return list[i];
    return null;
  }
  function sayAloud(text) {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    var v = chosenVoice();
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = settings.rate;
    window.speechSynthesis.speak(u);
  }
  var lastAt = 0;
  function speak(text, tileNode) {
    var now = Date.now();
    if (tileNode && text === lastSaid && now - lastAt < 400) return;   // a shaky double tap on a tile counts once. Say again always speaks.
    lastAt = now;
    sayAloud(text);
    lastSaid = text;
    $('saidText').textContent = text;
    $('saidText').classList.remove('idle');
    $('again').disabled = false;
    said.unshift({ text: text, time: new Date() });
    if (said.length > 30) said.length = 30;
    if (tileNode) {
      tileNode.classList.add('speaking');
      setTimeout(function () { tileNode.classList.remove('speaking'); }, 700);
    }
  }

  /* ---------- drawing the board ---------- */
  function renderTile(section, tile) {
    var b = button('tile');
    b.dataset.id = tile.id;
    if (tile.picture) {
      var img = picture(tile.picture);
      img.addEventListener('error', function () { img.remove(); b.classList.add('words-only'); });
      b.appendChild(img);
    } else {
      b.classList.add('words-only');
    }
    b.appendChild(make('span', 'label', tile.label));
    b.addEventListener('click', function () {
      if (editing) openTile(section.id, tile.id);
      else speak(tile.say, b);
    });
    return b;
  }

  function renderSection(section) {
    var node = make('section', 'section' + (section.role === 'urgent' ? ' urgent' : ''));
    node.style.setProperty('--c', section.color);
    var head = make('div', 'section-head');
    head.appendChild(make('h2', '', section.name));
    if (editing) {
      var edit = button('section-edit', 'Change section');
      edit.dataset.id = section.id;
      edit.addEventListener('click', function () { openSection(section.id); });
      head.appendChild(edit);
    }
    node.appendChild(head);
    var tiles = make('div', 'tiles');
    section.tiles.forEach(function (t) { tiles.appendChild(renderTile(section, t)); });
    if (editing && section.tiles.length < D.LIMITS.tiles) {
      var add = button('tile add', '+ Add a tile');
      add.dataset.id = 'add-' + section.id;
      add.addEventListener('click', function () { openTile(section.id, null); });
      tiles.appendChild(add);
    }
    node.appendChild(tiles);
    return node;
  }

  /* One screen, no scrolling (fit), or a scrolling page. The credit line is always somewhere in view or in reach. */
  function setFit(on) {
    document.body.classList.toggle('fit', on);
    if (on) document.body.insertBefore($('credit'), $('pinned').nextSibling);
    else $('scroll').appendChild($('credit'));
    var size = settings.size === 'fit' ? 'medium' : settings.size;
    document.body.classList.remove('size-small', 'size-medium', 'size-large');
    document.body.classList.add('size-' + size);
  }

  function render() {
    var main = $('board'), bar = $('pinned');
    main.textContent = ''; bar.textContent = '';
    document.body.classList.toggle('editing', editing);
    $('editHint').hidden = !editing;
    $('toggleEdit').textContent = editing ? 'Done' : 'Edit';
    $('toggleEdit').classList.toggle('on', editing);

    // Sections marked "across the top" come first, wherever they sit in the list.
    var ordered = board.filter(function (s) { return s.role === 'urgent'; })
      .concat(board.filter(function (s) { return s.role !== 'urgent'; }));
    // While editing, everything is in one scrolling list.
    var inBar = editing ? [] : ordered.filter(function (s) { return s.role === 'pinned'; });
    var inMain = editing ? ordered : ordered.filter(function (s) { return s.role !== 'pinned'; });

    inBar.forEach(function (s) { bar.appendChild(renderSection(s)); });
    bar.hidden = !inBar.length;

    var plan = null;
    if (settings.size === 'fit' && !editing) {
      setFit(true);   // put the bars where they will be, then measure what is left
      plan = D.planFit($('scroll').clientWidth, $('scroll').clientHeight, inMain.map(function (s) { return s.tiles.length; }));
    }
    if (plan) {
      main.style.setProperty('--fit-label', plan.label + 'px');
      plan.shelves.forEach(function (shelf) {
        var row = make('div', 'shelf');
        shelf.forEach(function (i) {
          var node = renderSection(inMain[i]);
          node.style.setProperty('--cols', String(plan.cols[i]));
          node.style.setProperty('--rows', String(plan.rows));
          node.style.flexGrow = String(plan.cols[i]);
          row.appendChild(node);
        });
        main.appendChild(row);
      });
      growLabels(main, plan.label);
      return;
    }
    setFit(false);
    inMain.forEach(function (s) { main.appendChild(renderSection(s)); });
    if (editing && board.length < D.LIMITS.sections) {
      var add = button('add-section', '+ Add a section');
      add.addEventListener('click', function () { openSection(null); });
      main.appendChild(add);
    }
  }

  /* The plan's label size is a safe guess. Now that the tiles are on screen, make the words as big as they can be:
     no word split in two, nothing cut off, and every picture still a good share of its tile. */
  function growLabels(main, start) {
    var tiles = main.querySelectorAll('.tile');
    if (!tiles.length || !tiles[0].clientHeight) return;   // not laid out, so nothing to measure
    function fits(size) {
      main.style.setProperty('--fit-label', size + 'px');
      for (var i = 0; i < tiles.length; i++) {
        var t = tiles[i], label = t.querySelector('.label'), img = t.querySelector('img');
        if (t.scrollHeight > t.clientHeight + 1 || t.scrollWidth > t.clientWidth + 1) return false;
        if (label && label.scrollWidth > label.clientWidth + 0.5) return false;
        if (img && img.clientHeight < Math.max(40, t.clientHeight * 0.45)) return false;   // it is a picture board: the pictures come first
      }
      return true;
    }
    main.classList.add('measuring');
    var size = start;
    if (fits(size)) { while (size < 24 && fits(size + 1)) size += 1; }
    else { while (size > 10 && !fits(size - 1)) size -= 1; size = Math.max(10, size - 1); }
    main.style.setProperty('--fit-label', size + 'px');
    main.classList.remove('measuring');
  }

  /* After the board is redrawn, put keyboard focus back where the person was. */
  function focusOn(id) {
    var found = null;
    each(document.querySelectorAll('[data-id]'), function (n) { if (n.dataset.id === id) found = n; });
    (found || $('toggleEdit')).focus();
  }

  // Show the board before anything else, so a hiccup further down can never leave a blank screen.
  $('saidText').textContent = IDLE_TEXT;
  $('saidText').classList.add('idle');
  render();

  /* ---------- change or add a tile ---------- */
  var tileEdit = null;   // { sectionId, tileId or null, picture }
  var searchRun = 0;

  function showCurrentPicture() {
    var box = $('picNow');
    box.textContent = '';
    if (tileEdit.picture) box.appendChild(picture(tileEdit.picture));
    else box.textContent = 'Words only';
    each($('picResults').children, function (b) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.picture) === tileEdit.picture));
    });
  }

  function openTile(sectionId, tileId) {
    var section = findSection(sectionId);
    if (!section) return;
    var tile = tileId ? section.tiles[indexOfId(section.tiles, tileId)] : null;
    tileEdit = { sectionId: sectionId, tileId: tileId, picture: tile ? tile.picture : null };
    searchRun += 1;   // a slow search from the last tile must not land in this one
    $('tileTitle').textContent = tile ? 'Change this tile' : 'Add a tile to ' + section.name;
    $('tileLabel').value = tile ? tile.label : '';
    $('tileSay').value = tile && tile.say !== tile.label ? tile.say : '';
    $('picSearch').value = '';
    $('picStatus').textContent = '';
    $('picResults').textContent = '';
    $('tileError').textContent = '';
    $('tileMoves').hidden = !tile;
    resetTileDelete();
    showCurrentPicture();
    $('tileDialog').showModal();
  }

  function searchPictures() {
    var term = D.cleanText($('picSearch').value || $('tileLabel').value, 60);
    if (!term) { $('picStatus').textContent = 'Type a word to search for.'; return; }
    var run = ++searchRun;
    $('picStatus').textContent = 'Searching...';
    $('picResults').textContent = '';
    var stop = new AbortController();
    var timer = setTimeout(function () { stop.abort(); }, 8000);
    fetch(D.searchUrl(term), { credentials: 'omit', referrerPolicy: 'no-referrer', signal: stop.signal })
      .then(function (r) {
        if (r.ok) return r.json();
        if (r.status === 404) return [];   // how the library says "nothing matches"
        throw new Error('library error');
      })
      .then(function (reply) {
        if (run !== searchRun) return;
        var found = D.picturesFromSearch(reply, 12);
        $('picStatus').textContent = found.length ? 'Tap the one you want.' : 'Nothing found. Try a simpler word.';
        found.forEach(function (p) {
          var b = button('', '');
          b.dataset.picture = String(p.id);
          b.setAttribute('aria-label', p.word);
          b.appendChild(picture(p.id));
          b.addEventListener('click', function () { tileEdit.picture = p.id; showCurrentPicture(); });
          $('picResults').appendChild(b);
        });
        showCurrentPicture();
      })
      .catch(function () {
        if (run === searchRun) $('picStatus').textContent = 'Could not reach the picture library. Searching needs the internet.';
      })
      .then(function () { clearTimeout(timer); });
  }

  function saveTile() {
    var section = findSection(tileEdit.sectionId);
    var label = D.cleanText($('tileLabel').value, D.LIMITS.label);
    if (!section) return;
    if (!label) { $('tileError').textContent = 'Please type the words for the tile.'; $('tileLabel').focus(); return; }
    var say = D.cleanText($('tileSay').value, D.LIMITS.say) || label;
    var id = tileEdit.tileId;
    if (id) {
      var tile = section.tiles[indexOfId(section.tiles, id)];
      tile.label = label; tile.say = say; tile.picture = tileEdit.picture;
    } else {
      id = D.newId('tile');
      section.tiles.push({ id: id, label: label, say: say, picture: tileEdit.picture });
    }
    saveBoard(); render(); $('tileDialog').close(); focusOn(id);
  }

  function moveTile(by) {
    var tiles = findSection(tileEdit.sectionId).tiles;
    var from = indexOfId(tiles, tileEdit.tileId), to = from + by;
    if (from < 0 || to < 0 || to >= tiles.length) return;
    tiles.splice(to, 0, tiles.splice(from, 1)[0]);
    saveBoard(); render();
  }

  var resetTileDelete = twoStep($('tileDelete'), function () {
    var section = findSection(tileEdit.sectionId);
    var at = indexOfId(section.tiles, tileEdit.tileId);
    if (at !== -1) section.tiles.splice(at, 1);
    saveBoard(); render(); $('tileDialog').close(); focusOn('add-' + section.id);
  });

  /* ---------- change or add a section ---------- */
  var sectionEdit = null;   // section id, or null for a new one

  function openSection(id) {
    var section = id ? findSection(id) : null;
    sectionEdit = id;
    $('sectionTitle').textContent = section ? 'Change this section' : 'Add a section';
    $('sectionName').value = section ? section.name : '';
    $('sectionColor').value = section ? section.color : '#3867B7';
    $('sectionRole').value = section ? section.role : '';
    $('sectionError').textContent = '';
    $('sectionMoves').hidden = !section;
    resetSectionDelete();
    $('sectionDialog').showModal();
  }

  function saveSection() {
    var name = D.cleanText($('sectionName').value, D.LIMITS.name);
    if (!name) { $('sectionError').textContent = 'Please type a name.'; $('sectionName').focus(); return; }
    var role = $('sectionRole').value;
    if (['', 'urgent', 'pinned'].indexOf(role) === -1) role = '';
    var others = board.filter(function (s) { return s.role === 'pinned' && s.id !== sectionEdit; }).length;
    if (role === 'pinned' && others >= D.LIMITS.pinned) {
      $('sectionError').textContent = 'Only ' + D.LIMITS.pinned + ' sections can sit along the bottom.';
      return;
    }
    var color = D.cleanColor($('sectionColor').value);
    var section = sectionEdit ? findSection(sectionEdit) : null;
    if (section) { section.name = name; section.color = color; section.role = role; }
    else { section = { id: D.newId('section'), name: name, role: role, color: color, tiles: [] }; board.push(section); }
    saveBoard(); render(); $('sectionDialog').close(); focusOn(section.id);
  }

  /* Sections across the top are always shown first, so a move steps over them rather than seeming to do nothing. */
  function moveSection(by) {
    var from = indexOfId(board, sectionEdit);
    if (from < 0) return;
    var top = board[from].role === 'urgent', to = from + by;
    while (to >= 0 && to < board.length && (board[to].role === 'urgent') !== top) to += by;
    if (to < 0 || to >= board.length) return;
    board.splice(to, 0, board.splice(from, 1)[0]);
    saveBoard(); render();
  }

  var resetSectionDelete = twoStep($('sectionDelete'), function () {
    var at = indexOfId(board, sectionEdit);
    if (board.length <= 1) { $('sectionError').textContent = 'A board needs at least one section.'; return; }
    if (at !== -1) board.splice(at, 1);
    saveBoard(); render(); $('sectionDialog').close(); focusOn('');
  });

  /* ---------- history ---------- */
  function openHistory() {
    var list = $('historyList');
    list.textContent = '';
    if (!said.length) list.appendChild(make('p', 'hint', 'Nothing yet.'));
    said.forEach(function (entry) {
      var b = button('', '');
      b.appendChild(make('span', '', entry.text));
      b.appendChild(make('time', '', entry.time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })));
      b.addEventListener('click', function () { $('historyDialog').close(); speak(entry.text); });
      list.appendChild(b);
    });
    $('historyDialog').showModal();
  }

  /* ---------- settings, backup, restore ---------- */
  function fillVoices() {
    var select = $('voice');
    select.textContent = '';
    var first = make('option', '', canSpeak ? "This device's usual voice" : 'This browser cannot speak');
    first.value = '';
    select.appendChild(first);
    var mine = (navigator.language || 'en').slice(0, 2).toLowerCase();   // this device's language goes first
    function rank(v) { return (v.lang.slice(0, 2).toLowerCase() === mine ? '0' : '1') + v.lang + v.name; }
    voices().slice().sort(function (a, b) { return rank(a).localeCompare(rank(b)); })
      .forEach(function (v) {
        var o = make('option', '', v.name + ' (' + v.lang + ')' + (v.localService === false ? ', needs internet' : ''));
        o.value = v.voiceURI;
        select.appendChild(o);
      });
    select.value = chosenVoice() ? settings.voice : '';
  }

  function openSettings() {
    fillVoices();
    $('rate').value = String(settings.rate);
    $('size').value = settings.size;
    clearRestore();
    resetStartOver();
    $('settingsDialog').showModal();
  }

  function backup() {
    var text = JSON.stringify(D.serializeBoard(board), null, 2);
    var url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    var a = make('a');
    a.href = url; a.download = 'communication-board-backup.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);   // iPads ask "download?" first, so leave time to answer
  }

  var waiting = null;   // a checked board from a backup file, waiting for the second tap

  function clearRestore() {
    waiting = null;
    $('restoreFile').value = '';
    $('restoreStatus').textContent = '';
    $('restoreGo').hidden = true;
  }

  function readBackup(file) {
    clearRestore();
    if (!file) return;
    if (file.size > 1024 * 1024) { $('restoreStatus').textContent = 'That file is too big to be a board backup.'; return; }
    var reader = new FileReader();
    reader.onerror = function () { $('restoreStatus').textContent = 'Could not read that file.'; };
    reader.onload = function () {
      var parsed = null;
      try { parsed = JSON.parse(String(reader.result)); } catch (e) { parsed = null; }
      var checked = D.validateBoard(parsed);
      if (!checked) { $('restoreStatus').textContent = 'That file is not a board backup. Your board has not changed.'; return; }
      var tiles = checked.reduce(function (n, s) { return n + s.tiles.length; }, 0);
      waiting = checked;
      $('restoreStatus').textContent = 'Found ' + checked.length + ' sections and ' + tiles + ' tiles.';
      $('restoreGo').hidden = false;
    };
    reader.readAsText(file);
  }

  var resetStartOver = twoStep($('startOver'), function () {
    board = D.starterBoard();
    saveBoard(); render(); $('settingsDialog').close();
  });

  /* ---------- write or draw ---------- */
  var canvas = $('canvas'), ctx = canvas.getContext('2d');
  var pen = { color: '#1F2A30', finger: null, x: 0, y: 0 };
  var hasDrawing = false;

  function sizeCanvas(keepDrawing) {
    var box = canvas.getBoundingClientRect(), scale = window.devicePixelRatio || 1, old = null;
    if (keepDrawing && hasDrawing) {
      old = make('canvas'); old.width = canvas.width; old.height = canvas.height;
      old.getContext('2d').drawImage(canvas, 0, 0);
    }
    canvas.width = Math.max(1, Math.round(box.width * scale));
    canvas.height = Math.max(1, Math.round(box.height * scale));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (old) ctx.drawImage(old, 0, 0);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    hasDrawing = Boolean(old);
  }
  function at(e) {
    var box = canvas.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  }
  function line(from, to) {
    ctx.strokeStyle = pen.color;
    ctx.lineWidth = Number($('penSize').value) * (pen.color === '#FFFFFF' ? 3 : 1);
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    hasDrawing = true;
  }
  canvas.addEventListener('pointerdown', function (e) {
    if (pen.finger !== null) return;   // follow one finger, so a resting palm does not scribble
    e.preventDefault();
    pen.finger = e.pointerId;
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    var p = at(e); pen.x = p.x; pen.y = p.y;
    line(p, { x: p.x + 0.01, y: p.y });   // a tap leaves a dot
  });
  canvas.addEventListener('pointermove', function (e) {
    if (e.pointerId !== pen.finger) return;
    var p = at(e); line(pen, p); pen.x = p.x; pen.y = p.y;
  });
  ['pointerup', 'pointercancel'].forEach(function (name) {
    canvas.addEventListener(name, function (e) { if (e.pointerId === pen.finger) pen.finger = null; });
  });
  each($('pens').children, function (b) {
    b.style.backgroundColor = b.dataset.color;
    b.addEventListener('click', function () {
      pen.color = b.dataset.color;
      each($('pens').children, function (o) { o.setAttribute('aria-pressed', String(o === b)); });
    });
  });

  /* ---------- wiring ---------- */
  function onEnter(node, action) {
    node.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); action(); } });
  }

  $('again').addEventListener('click', function () { if (lastSaid) speak(lastSaid); });
  $('toggleEdit').addEventListener('click', function () { editing = !editing; render(); });
  $('openHistory').addEventListener('click', openHistory);
  $('historyClose').addEventListener('click', function () { $('historyDialog').close(); });
  $('openSettings').addEventListener('click', openSettings);
  $('settingsClose').addEventListener('click', function () { $('settingsDialog').close(); });

  $('tileSave').addEventListener('click', saveTile);
  $('tileCancel').addEventListener('click', function () { $('tileDialog').close(); focusOn(tileEdit.tileId || 'add-' + tileEdit.sectionId); });
  $('tileEarlier').addEventListener('click', function () { moveTile(-1); });
  $('tileLater').addEventListener('click', function () { moveTile(1); });
  $('picGo').addEventListener('click', searchPictures);
  $('picNone').addEventListener('click', function () { tileEdit.picture = null; showCurrentPicture(); });
  onEnter($('picSearch'), searchPictures);
  onEnter($('tileLabel'), saveTile);
  onEnter($('tileSay'), saveTile);

  $('sectionSave').addEventListener('click', saveSection);
  $('sectionCancel').addEventListener('click', function () { $('sectionDialog').close(); focusOn(sectionEdit || ''); });
  $('sectionEarlier').addEventListener('click', function () { moveSection(-1); });
  $('sectionLater').addEventListener('click', function () { moveSection(1); });
  onEnter($('sectionName'), saveSection);

  function changeSettings(next) {
    settings = D.validateSettings({
      voice: 'voice' in next ? next.voice : settings.voice,
      rate: 'rate' in next ? next.rate : settings.rate,
      size: 'size' in next ? next.size : settings.size
    });
    saveSettings();
  }
  $('voice').addEventListener('change', function () { changeSettings({ voice: $('voice').value }); });
  $('rate').addEventListener('change', function () { changeSettings({ rate: Number($('rate').value) }); });
  $('size').addEventListener('change', function () { changeSettings({ size: $('size').value }); render(); });
  $('tryVoice').addEventListener('click', function () { sayAloud('This is how I sound.'); });
  $('backup').addEventListener('click', backup);
  $('restorePick').addEventListener('click', function () { $('restoreFile').click(); });
  $('restoreFile').addEventListener('change', function () { readBackup($('restoreFile').files[0]); });
  $('restoreGo').addEventListener('click', function () {
    if (!waiting) return;
    board = waiting;
    saveBoard(); render(); clearRestore();
    $('restoreStatus').textContent = 'Done. Your board has been replaced.';
  });
  $('print').addEventListener('click', function () { $('settingsDialog').close(); window.print(); });

  $('openDraw').addEventListener('click', function () { $('draw').showModal(); sizeCanvas(true); });
  $('drawClear').addEventListener('click', function () { sizeCanvas(false); });
  $('drawClose').addEventListener('click', function () { $('draw').close(); });

  /* Turning the device, or showing and hiding the browser's bars, changes what fits. */
  var redraw = null;
  window.addEventListener('resize', function () {
    if (redraw) return;
    redraw = requestAnimationFrame(function () {
      redraw = null;
      if ($('draw').open) sizeCanvas(true);
      if (!$('tileDialog').open && !$('sectionDialog').open) render();   // the on-screen keyboard also counts as a resize
    });
  });

  if (canSpeak) {
    window.speechSynthesis.onvoiceschanged = function () { if ($('settingsDialog').open) fillVoices(); };
  }

  /* ---------- working with no internet ---------- */
  function keepPicturesOffline() {
    var helper = 'serviceWorker' in navigator && navigator.serviceWorker.controller;
    if (helper) helper.postMessage({ type: 'pictures', ids: D.picturesOnBoard(board) });
  }
  /* Off on your own computer, so that edits show up on the next reload. Add ?offline-test to the address to try it there. */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || /[?&]offline-test/.test(location.search))) {
    navigator.serviceWorker.addEventListener('controllerchange', keepPicturesOffline);
    navigator.serviceWorker.register('sw.js').then(keepPicturesOffline).catch(function () { /* the board still works online */ });
  }
})();
