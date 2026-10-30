# Ellie's Halloween Chase

A spooky (but not too spooky) 3D chase game, made for Ellie. Help Matilda get her library books back from the school at midnight, without Miss Trunchbull catching her.

**Play it:** https://lukemerrett.github.io/ellies-halloween-chase/

It's made for a phone held sideways, and it works on a computer too.

## How to play

- **Walk:** press and drag anywhere on the left of the screen. The further you drag, the faster Matilda runs. On a computer, use the arrow keys or WASD.
- **POWER (big purple button):** Matilda's special power.
  - If Miss Trunchbull is close, it knocks her dizzy for a few seconds, and a nearby water jug flies at her too.
  - Otherwise it floats crates out of the way, which opens up hidden corners with books in them.
  - The ring around the button fills up again after each use. On a computer, press Space.
- **Hide:** walk into a wicker basket (they glow faintly green). Miss Trunchbull can't see you in there.
  - You peek out through a gap in the weave. Drag on the left to look left and right.
  - When it's safe, press the big green **GET OUT** button, which replaces POWER while you're hiding. On a computer, press Space. Matilda hops out on the side you were looking at.
- **Books:** collect every glowing book in a level. Then the padlock on the exit door turns green, and you can escape.
- **Fairy light:** a little floating light always leads the way to the next book, or to the door.
- **Pumpkins:** walk past a pumpkin to light it. That's your checkpoint. If Miss Trunchbull catches you, you go back to the last lit pumpkin and keep the books you've found.

Miss Trunchbull patrols the level. If she spots you, her eyes glow red, her face in the top corner turns red, and you'll hear her stomping and your heartbeat. Run, hide or use your POWER. If you get away, she searches for a bit, grumbles and goes back to patrolling.

## Levels

Every time a level starts, it gets a new layout: the maze, the rooms, the books, the baskets, the pumpkins and Miss Trunchbull's patrol are all made up fresh. Each layout is checked, so every book and the door can always be reached, and one book is always tucked behind a crate that needs the POWER.

1. **The Playground at Midnight:** a hedge maze outside, with 3 books and helpful tips.
2. **The Creaky Corridors:** classrooms and corridors, with 5 books.
3. **The Headmistress's Hall:** 5 books, and once you have them all, Miss Trunchbull gets very angry and chases you to the door.

Finished levels are remembered on that device, so you can pick a level from the start screen.

## Tech

It's a static site with no build step:
- 3D graphics use [three.js](https://threejs.org/) r170 from the jsDelivr CDN.
- Every character, prop and texture is made in code: no image or model files.
- Sounds and music are synthesised with the Web Audio API.

| File | What it holds |
|---|---|
| `index.html` | Page, HUD, touch controls and screens |
| `src/game.js` | Game logic, camera, controls, Miss Trunchbull's patrol and chase |
| `src/levels.js` | The three levels and the random layout generator |
| `src/characters.js` | Matilda and Miss Trunchbull |
| `src/props.js` | School props: baskets, desks, books, doors and more |
| `src/models.js` | Halloween props: pumpkins, trees, bats and toadstools |
| `src/materials.js` | Shared materials, glows and mesh merging |
| `src/audio.js` | Sound effects and the spooky drone |

To run it locally, serve the folder with any static web server, for example `python3 -m http.server`.

An unofficial fan game made for a family member, not affiliated with the Roald Dahl Story Company. Matilda and Miss Trunchbull are characters created by Roald Dahl. All art here is original.
