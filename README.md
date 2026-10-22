# Communication Board

*A free tap-to-speak picture board. Tap a picture and the device says it out loud.*

![The whole board on one tablet screen. The bar across the top reads I am in pain. Below it are colored groups of picture tiles named Right now, How I feel, Move me, Care, Around me, My things, People, Where it hurts, and How much, 1 to 10. A row along the bottom holds Yes, No, Stop, Thank you and I love you.](docs/board.png)

**Use it: [markpikemarkpike.github.io/communication-board](https://markpikemarkpike.github.io/communication-board/)**

---

## The idea

I first made a board like this for my mom. This one is a fresh start, for anyone who can tap a screen more easily than they can talk.

Tap **Pain** and it says "I am in pain." Tap **Arms** and it says "My arms hurt." The words also show in big type across the top, for noisy rooms.

- **Everything fits on one tablet screen.** No scrolling and no pages to flip through. The board measures the screen and makes the tiles as big as it can.
- **Urgent things come first.** Breathing, choking, suction and pain sit together in red at the top.
- **Quick replies never move.** Yes, No, Stop, Thank you and I love you stay along the bottom.
- **Every tile can be changed.** New words, new speech, new picture. Add your own tiles and sections.
- **It works with no internet** once it has finished loading one time.
- **Write or draw** with a finger when no tile fits.
- **Print it** for a paper copy.

The starter tiles are a general bedside set. Change them to suit the person.

Note: I'm a non-technical lawyer. I can't really code. I built this with [Claude Code](https://claude.com/claude-code). Full disclosure: I work at Anthropic, which makes Claude. This is a personal project, not an Anthropic product.

## Please read this

This is a hobby project. It has not been reviewed, cleared or tested as a medical device. Don't rely on it as the only way to call for help. A speech-language pathologist can tell you what will really suit a particular person.

## Using it

1. Open the link above on a tablet, phone or computer.
2. Put it on the home screen, so it opens full screen like an app.
   - iPad or iPhone: in Safari, tap Share, then **Add to Home Screen**.
   - Android: in Chrome, tap the menu, then **Add to Home screen** or **Install app**.
3. Open it from the home screen and tap a picture. Check that the volume is up.

**Say again** repeats the last thing said. **History** lists what was said since the page opened. **Settings** has the voice, the speaking speed and the tile size.

A phone screen is too small to hold everything at once, so on a phone the board scrolls.

It needs a browser from 2022 or later. On an iPad or iPhone that means iOS 15.4 or newer.

## Making it yours

Tap **Edit**, then tap any tile. You can change the words on it, what it says out loud, and its picture. Picture search needs the internet.

Do it in this order: add the board to the home screen first, make your changes there, then save a backup. On an iPad or iPhone the home screen copy and Safari each keep their own board. Browsers can also clear saved data for sites that go unused for a while.

In **Settings**, **Save a backup** downloads your board as a small file. **Load a backup** puts it on another device, or lets you share it with someone else.

The more tiles you add, the smaller they get. If they would be too small to tap, the board starts to scroll.

## Privacy

There are no accounts, no ads, no cookies and no tracking. I run no server and collect nothing.

- Your board and settings are kept in your browser's own storage: section names and colors, tile words, what each tile says, picture numbers, and your voice, speed and size choices.
- What you say is never saved. History clears when the page closes.

Three outside services are involved, and each one sees your internet address, as any website does.

- **GitHub** hosts the page.
- **ARASAAC** supplies the pictures. It sees which pictures your board loads, and what you search for. If you press Search with the box empty, it searches for the words on the tile.
- **Your device's voice.** Most voices work on the device. A voice marked "needs internet" in Settings sends the words to whoever makes that voice, and it won't work offline.

Other pages hosted at the same web address could read the saved board. That is true of my copy and of any copy you host beside other sites.

## Changing the code

There's nothing to install and nothing to build.

| File | What it is |
|---|---|
| `data.js` | The starter board, the rules for what a board may contain, and the math that fits it to the screen. Start here. |
| `app.js` | Everything you see and tap. |
| `style.css` | How it looks. |
| `index.html` | The page and its pop-ups. |
| `sw.js` | Keeps it working with no internet. |
| `test.js` | Checks for `data.js`. Run `node test.js`. |

To run it on your own computer:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Edit a file, save, reload.

A few things that will save you time:

- If you change the starter board and nothing happens, your browser is showing its saved board. Use Settings, then **Start over**.
- The offline helper is switched off on your own computer so that edits show up right away. Add `?offline-test` to the address to try it.
- If you add a file, add it to `FILES` in `sw.js`, and bump `shell-v1` when you publish a change.
- The spacing numbers in `FIT` in `data.js` have to match the `.fit` rules in `style.css`.
- To use different pictures, change `pictureUrl` and `searchUrl` in `data.js`, the address near the end of `sw.js`, and the security line at the top of `index.html`.

To put up your own copy, fork this repo and turn on GitHub Pages in Settings. Then point the links in this file and in Settings at your copy.

## Ways to make it better

I'd love help with any of these. Pull requests are welcome.

- **Switch and dwell access**, for people who can't tap.
- **Other languages.** ARASAAC's search already supports many.
- **More starter boards**: kids, hospital stays, home.
- **A keyboard** for typing anything, with word prediction.
- **Dark and high-contrast looks.**
- **Testing with people who use boards like this**, and with the people who care for them.

## License and credits

MIT for the code. The pictures have their own owner and license, and they can't be used commercially. Details are in [NOTICE.md](NOTICE.md).

The pictographic symbols used are the property of the Government of Aragón and have been created by Sergio Palao for ARASAAC (http://www.arasaac.org), that distributes them under Creative Commons License BY-NC-SA.

If this helps someone you love, I'd like to hear about it. Open an issue on this repo. Issues are public, so leave out anything private.

*Claude is a trademark of Anthropic, PBC. I work there, but this is a personal project. ARASAAC is a trademark of the Government of Aragon, which has nothing to do with this project.*
