/* Archive an older mission run by marking its parent + children as done and tagging archived.

Usage:
  node scripts/archive-mission.js <baseUrl> <parentId>
Example:
  node scripts/archive-mission.js http://localhost:3000 4cbf0fe4-9630-419b-9c58-793e847883c0
*/

const fs = require('fs');

async function http(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok || json?.success === false) {
    const err = new Error(`HTTP ${res.status} ${res.statusText} :: ${text}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return json;
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

(async () => {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const parentId = process.argv[3];
  if (!parentId) {
    console.error('Missing parentId');
    process.exit(2);
  }

  const all = await http('GET', `${baseUrl}/api/tasks`);
  const tasks = all.tasks || [];

  const parent = tasks.find(t => t.id === parentId);
  if (!parent) {
    console.error('Parent not found:', parentId);
    process.exit(3);
  }

  const children = tasks.filter(t => t.parentId === parentId);

  let patched = 0;

  // Patch children first
  for (const c of children) {
    const tags = uniq([...(c.tags || []), 'archived']);
    await http('PATCH', `${baseUrl}/api/tasks/${c.id}`, { status: 'done', tags });
    patched++;
  }

  // Patch parent
  const parentTags = uniq([...(parent.tags || []), 'archived']);
  const newTitle = parent.title.includes('(archived)') ? parent.title : `${parent.title} (archived)`;
  await http('PATCH', `${baseUrl}/api/tasks/${parentId}`, { status: 'done', tags: parentTags, title: newTitle });
  patched++;

  // Write a small marker file for traceability (optional)
  try {
    fs.writeFileSync('data/last-archive.json', JSON.stringify({ parentId, archivedAt: new Date().toISOString(), children: children.map(c => c.id) }, null, 2));
  } catch {}

  console.log(JSON.stringify({ success: true, parentId, children: children.length, patched }, null, 2));
})().catch(err => {
  console.error('archive-mission failed:', err);
  process.exit(1);
});
