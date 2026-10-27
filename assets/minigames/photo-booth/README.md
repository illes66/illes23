# Comic Foreground assets

These assets are for **PO02 — Comic Foreground**. The game uses two independent
character wheels: the left shows feet and the right shows heads. Characters and
their matching partners are configured in `pages/comic-game.js`.

## Folder and filenames

Create one folder per character. Upload both images for every character:

```text
photo-booth/
  characters/
    hotdog/
      feet.png
      head.png
    fries/
      feet.png
      head.png
  costumes/
    hotdog.png
    fries.png
```

The demo data includes `hotdog`, `fries`, `popcorn`, `soda`, `churro`, and
`chocolate`. Other characters can use any lowercase ID, but the same ID must be
added to the character list and wheel sequences in `pages/comic-game.js`.
Each character's `partnerId` must point back to its partner; both entries must
share the same `familyId`. After uploading, set `headImage`, `feetImage`, and
`costumeImage` to paths such as
`../assets/minigames/photo-booth/characters/hotdog/head.png` and
`../assets/minigames/photo-booth/costumes/hotdog.png` in that character's entry.

## PNG specifications

- **Heads:** transparent RGBA PNG, 512 × 512 px, sRGB; center the head with
  consistent transparent margins.
- **Feet:** transparent RGBA PNG, 512 × 512 px; center the lower-body/feet art.
- **Costumes:** transparent RGBA PNG, 512 × 768 px; draw the outfit from the
  shoulders down and leave the face opening transparent.
- Do not trim transparent margins. The game places heads, costume layers, and
  feet in separate aligned areas of each photocall slot.
- Export clean, anti-aliased art. Avoid indexed transparency; 2× the displayed
  dimensions (1024 × 1536 px) is also supported for especially detailed art.
- Keep filenames lowercase and match the character ID exactly.

The current demo uses emoji/CSS art. Image paths are left `null` until you add
the PNGs and configure them; if a configured image fails to load, its
placeholder remains visible and the browser console reports the missing file.
The two costume selectors move independently. A correct photo needs reciprocal
character partners and the corresponding costume for each character.
