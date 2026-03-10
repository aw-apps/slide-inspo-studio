export function createEmptyDoc() {
  return {
    schemaVersion: 1,
    meta: { title: 'Untitled', createdAt: Date.now(), updatedAt: Date.now() },
    masters: [
      {
        id: 'master-default',
        name: 'Default Master',
        layouts: [
          { id: 'layout-title', name: 'Title', placeholders: [] },
          { id: 'layout-title-content', name: 'Title + Content', placeholders: [] },
        ],
        theme: {
          fonts: { body: 'Inter, system-ui', heading: 'Inter, system-ui' },
          colors: { text: '#111111', bg: '#ffffff', accent: '#2b4cff' },
        },
      },
    ],
    slides: [
      { id: crypto.randomUUID(), name: 'Slide 1', masterId: 'master-default', layoutId: 'layout-title', elements: [] },
    ],
  };
}
