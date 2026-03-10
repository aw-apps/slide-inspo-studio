# AI Export Schema (Draft)

This file documents the intended AI-ready export format.

## Goals
- Capture masters, layouts, placeholders, styles, and assets in a deterministic structure.
- Enable future AI agents to re-use masters/layouts and replace content safely.

## Proposed JSON

```json
{
  "version": 1,
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
              "id": "ph-title","kind": "title","bounds": {"x":0,"y":0,"w":0,"h":0},
              "styleRef": "style/title",
              "contentPolicy": {"replaceable": true, "maxLen": 80}
            }
          ]
        }
      ]
    }
  ],
  "assets": [
    {"id":"asset-...","type":"image","mime":"image/png","sha256":"..."}
  ]
}
```
