/* Run with: node test.js   (no installs needed) */
'use strict';
var D = require('./data.js');
var assert = require('assert');
var passed = 0;
function test(name, fn) { fn(); passed += 1; console.log('ok  ' + name); }

test('the starter board passes its own rules and survives a save and load', function () {
  var b = D.starterBoard();
  var again = D.validateBoard(JSON.parse(JSON.stringify(D.serializeBoard(b))));
  assert.ok(again);
  assert.deepStrictEqual(D.serializeBoard(again), D.serializeBoard(b));
});

test('every starter tile has words and speech, and a picture unless it is a number', function () {
  D.starterBoard().forEach(function (s) {
    assert.ok(s.tiles.length > 0, s.name);
    s.tiles.forEach(function (t) { assert.ok(t.label && t.say && (D.pictureUrl(t.picture) || /^\d+$/.test(t.label)), s.name + ' / ' + t.label); });
  });
});

test('the starter board has one top section and one always-on-screen section', function () {
  var roles = D.starterBoard().map(function (s) { return s.role; });
  assert.strictEqual(roles.filter(function (r) { return r === 'urgent'; }).length, 1);
  assert.strictEqual(roles.filter(function (r) { return r === 'pinned'; }).length, 1);
});

test('things that are not boards are refused', function () {
  [null, undefined, 5, 'x', [], {}, { sections: [] }, { sections: 'no' }, { sections: [null] }, { sections: [{ name: 'A' }] },
   { sections: [{ name: '', tiles: [] }] }, { sections: [{ name: 'A', tiles: [{}] }] },
   { sections: [{ name: 'A', tiles: [{ label: 7 }] }] }, { sections: [{ name: 'A', tiles: ['x'] }] }
  ].forEach(function (bad) { assert.strictEqual(D.validateBoard(bad), null, JSON.stringify(bad)); });
});

test('oversized boards are refused', function () {
  var many = []; for (var i = 0; i < D.LIMITS.sections + 1; i++) many.push({ name: 'S', tiles: [] });
  assert.strictEqual(D.validateBoard({ sections: many }), null);
  var tiles = []; for (var j = 0; j < D.LIMITS.tiles + 1; j++) tiles.push({ label: 'T' });
  assert.strictEqual(D.validateBoard({ sections: [{ name: 'S', tiles: tiles }] }), null);
  var full = []; for (var k = 0; k < 6; k++) full.push({ name: 'S', tiles: tiles.slice(0, D.LIMITS.tiles) });
  assert.strictEqual(D.validateBoard({ sections: full }), null, 'too many tiles in all');
});

test('only two sections may sit along the bottom', function () {
  var b = D.validateBoard({ sections: [1, 2, 3, 4].map(function (n) { return { name: 'P' + n, role: 'pinned', tiles: [] }; }) });
  assert.deepStrictEqual(b.map(function (s) { return s.role; }), ['pinned', 'pinned', '', '']);
});

test('invisible characters and broken emoji are removed, whole emoji are kept', function () {
  assert.strictEqual(D.cleanText('a\u200Bb\u202Ec\uFEFF', 40), 'abc');
  assert.strictEqual(D.cleanText('x\uD83D', 40), 'x');
  assert.strictEqual(D.cleanText('\uDE00x', 40), 'x');
  assert.strictEqual(D.cleanText('\uD83D\uDE00\uD83D\uDE00\uD83D\uDE00', 2), '\uD83D\uDE00\uD83D\uDE00');
  assert.doesNotThrow(function () { D.searchUrl('\uD83D'); D.searchUrl('a'.repeat(59) + '\uD83D\uDE00'); });
  assert.strictEqual(D.validateBoard({ sections: [{ name: '\u200B', tiles: [] }] }), null);
});

test('unknown fields, bad colors, bad roles and bad picture numbers are dropped', function () {
  var raw = JSON.parse('{"sections":[{"name":"A","role":"admin","color":"red;background:url(x)","onclick":"x","__proto__":{"hacked":1},' +
    '"tiles":[{"label":"T","say":"","picture":"12","html":"<b>"},{"label":"U","picture":-1},{"label":"V","picture":1.5},{"label":"W","picture":99999999}]}]}');
  var b = D.validateBoard(raw);
  assert.deepStrictEqual(Object.keys(b[0]).sort(), ['color', 'id', 'name', 'role', 'tiles']);
  assert.strictEqual(b[0].role, '');
  assert.ok(/^#[0-9a-f]{6}$/i.test(b[0].color));
  assert.strictEqual(b[0].hacked, undefined);
  assert.strictEqual(({}).hacked, undefined);
  b[0].tiles.forEach(function (t) {
    assert.deepStrictEqual(Object.keys(t).sort(), ['id', 'label', 'picture', 'say']);
    assert.strictEqual(t.picture, null);
  });
  assert.strictEqual(b[0].tiles[0].say, 'T');
});

test('text is trimmed, capped and stripped of control characters, and markup stays plain text', function () {
  var b = D.validateBoard({ sections: [{ name: '  A\u0000\nB  ', tiles: [{ label: '<img src=x onerror=alert(1)>' + 'x'.repeat(200), say: 'y'.repeat(500) }] }] });
  assert.strictEqual(b[0].name, 'A B');
  assert.strictEqual(b[0].tiles[0].label.length, D.LIMITS.label);
  assert.strictEqual(b[0].tiles[0].say.length, D.LIMITS.say);
  assert.ok(b[0].tiles[0].label.indexOf('<img') === 0);
});

test('picture addresses can only point at the picture library', function () {
  assert.strictEqual(D.pictureUrl(2627), 'https://static.arasaac.org/pictograms/2627/2627_300.png');
  [0, -5, 1.2, '2627', '../x', null, undefined, {}, NaN, Infinity, 1e9].forEach(function (bad) {
    assert.strictEqual(D.pictureUrl(bad), null, String(bad));
  });
});

test('search words are escaped and capped', function () {
  assert.strictEqual(D.searchUrl('ice cream'), 'https://api.arasaac.org/v1/pictograms/en/search/ice%20cream');
  assert.ok(D.searchUrl('../../admin?x=1#y').indexOf('search/..%2F..%2Fadmin%3Fx%3D1%23y') !== -1);
  assert.ok(D.searchUrl('a'.repeat(500)).length < 130);
});

test('only whole-number ids are taken from a search reply', function () {
  assert.deepStrictEqual(D.picturesFromSearch([{ _id: 5, keywords: [{ keyword: 'water' }] }, { _id: '6' }, null, 7, { _id: 5 }, { _id: 8, keywords: 'x' }, {}], 12),
    [{ id: 5, word: 'water' }, { id: 8, word: 'Picture 8' }]);
  assert.deepStrictEqual(D.picturesFromSearch({ _id: 5 }, 12), []);
  assert.strictEqual(D.picturesFromSearch(Array.from({ length: 50 }, function (_, i) { return { _id: i + 1 }; }), 12).length, 12);
});

test('settings fall back to safe values', function () {
  assert.deepStrictEqual(D.validateSettings(null), { voice: '', rate: 0.9, size: 'fit' });
  assert.deepStrictEqual(D.validateSettings({ voice: 5, rate: 99, size: 'huge' }), { voice: '', rate: 0.9, size: 'fit' });
  assert.deepStrictEqual(D.validateSettings({ voice: 'Samantha', rate: 1.2, size: 'large' }), { voice: 'Samantha', rate: 1.2, size: 'large' });
});

test('the starter board fits every iPad screen, both ways up, with tiles big enough to tap', function () {
  var counts = D.starterBoard().filter(function (s) { return s.role !== 'pinned'; }).map(function (s) { return s.tiles.length; });
  // [name, space left for the board after the top bar, bottom bar and credit]
  [['iPad 9.7 app, wide', 1024, 610], ['iPad 9.7 Safari, wide', 1024, 540], ['iPad 9.7 app, tall', 768, 866],
   ['iPad 10.2 wide', 1080, 650], ['iPad Air wide', 1180, 660], ['iPad Air tall', 820, 1020],
   ['iPad mini wide', 1133, 585], ['iPad Pro 12.9 wide', 1366, 865]].forEach(function (s) {
    var plan = D.planFit(s[1], s[2], counts);
    assert.ok(plan, s[0] + ' should fit');
    assert.ok(plan.tileW >= 60 && plan.tileH >= 60, s[0] + ' tiles ' + plan.tileW + 'x' + plan.tileH);
    var placed = [].concat.apply([], plan.shelves);
    assert.deepStrictEqual(placed, counts.map(function (_, i) { return i; }), s[0] + ' keeps every section, in order');
    counts.forEach(function (n, i) { assert.ok(plan.cols[i] * plan.rows >= n, s[0] + ' has room for every tile'); });
    console.log('      ' + s[0] + ': ' + plan.shelves.length + ' shelves x ' + plan.rows + ' rows, tiles ' + plan.tileW + ' x ' + plan.tileH);
  });
});

test('a phone, or a board with far too many tiles, scrolls instead of shrinking to nothing', function () {
  var counts = D.starterBoard().filter(function (s) { return s.role !== 'pinned'; }).map(function (s) { return s.tiles.length; });
  assert.strictEqual(D.planFit(390, 600, counts), null);
  assert.strictEqual(D.planFit(1024, 610, [120, 120, 120]), null);
  assert.strictEqual(D.planFit(0, 0, counts), null);
  assert.strictEqual(D.planFit(1024, 610, []), null);
});

test('the list of pictures to keep offline has each one once', function () {
  var ids = D.picturesOnBoard(D.starterBoard());
  assert.strictEqual(ids.length, new Set(ids).size);
  assert.ok(ids.length >= 45 && ids.every(Number.isInteger));
});

console.log('\n' + passed + ' tests passed');
