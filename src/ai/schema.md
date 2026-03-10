# AI Export Schema (v1)

This documents the **forAI** export format used by Slide Inspo Studio.

## Goals
- Deterministic export: same input doc => **byte-identical** JSON (no timestamps).
- Separate reusable templates (masters/layouts/placeholders) from slide instances.
- Deterministic asset packaging: hash-based IDs + stable file paths.

## Export archive (.zip)
The UI action **匯出 for AI** downloads a ZIP with:
- `ai-export.v1.json`
- `assets/<sha256>.<ext>` files (store-only ZIP; stable ordering)

## ai-export.v1.json shape

```json
{
  "version": 1,
  "doc": { "title": "...", "page": { "w": 960, "h": 540 } },
  "templates": {
    "masters": [
      {
        "id": "master-default",
        "name": "Default Master",
        "theme": {
          "fonts": { "heading": "...", "body": "..." },
          "colors": { "text": "#...", "bg": "#...", "accent": "#..." }
        },
        "layouts": [
          {
            "id": "layout-title",
            "name": "Title",
            "placeholders": [
              {
                "id": "ph-...",
                "type": "text",
                "name": "Optional name",
                "policy": { "replaceable": true, "kind": "text", "maxLen": 400, "multiline": true }
              }
            ]
          }
        ]
      }
    ]
  },
  "styleTokens": {
    "colors": ["#111111", "#ffffff"],
    "fonts": ["Inter, system-ui"],
    "fontSizes": [24, 28, 44]
  },
  "assets": [
    {
      "id": "sha256:<hex>",
      "sha256": "<hex>",
      "type": "image",
      "mime": "image/png",
      "sizeBytes": 12345,
      "filePath": "assets/<hex>.png"
    }
  ],
  "slides": [
    {
      "id": "slide-1",
      "name": "Slide 1",
      "masterId": "master-default",
      "layoutId": "layout-title",
      "elements": [
        { "id": "el-1", "type": "text", "x": 0, "y": 0, "w": 100, "h": 20, "text": "...", "fontSize": 28, "color": "#111111" },
        { "id": "el-2", "type": "image", "x": 0, "y": 0, "w": 100, "h": 100, "assetId": "sha256:<hex>" }
      ]
    }
  ]
}
```

## Determinism notes
- No time fields are included in the AI export.
- Objects are serialized with recursively-sorted keys.
- Masters/layouts/placeholders and assets are sorted by ID.
