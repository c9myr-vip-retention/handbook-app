// SOP bodies converted from markdown by db/import-md.mjs, bundled so the
// preview and the offline fallback show them too. D1 stays the live source.
const files = import.meta.glob('../../db/content/*.json', { eager: true, import: 'default' })
export const IMPORTED = Object.fromEntries(Object.values(files).map(f => [f.id, f]))
