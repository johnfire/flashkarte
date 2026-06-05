# Play Store assets

Generated graphics for the flashkarte Google Play listing.

| File                               | Play slot        | Size      | Format        |
| ---------------------------------- | ---------------- | --------- | ------------- |
| `icon_512.png`                     | App icon         | 512×512   | 32-bit PNG    |
| `feature_1024x500.png`             | Feature graphic  | 1024×500  | PNG, no alpha |
| `screenshot_1_decks_1080x1920.png` | Phone screenshot | 1080×1920 | PNG           |
| `screenshot_2_study_1080x1920.png` | Phone screenshot | 1080×1920 | PNG           |

Built programmatically (Pillow) to match the app's indigo `#4F46E5` theme and
the real deck-list / study screens — not emulator captures. Good enough for
internal testing; can be polished later.

## Regenerate

```bash
python3 docs/store-assets/store_assets.py   # rewrites the PNGs in this folder
```

Edit `store_assets.py` to change captions, colors, or sample text.
