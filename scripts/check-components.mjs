#!/usr/bin/env node
// node scripts/check-components.mjs [file...]
//
// Fails on any JSX component an MDX page uses that Documentation.AI does not
// support. The site rejects the page at publish time with
// "<X> is not a supported component" — which is only discovered AFTER the push,
// on a repo that is live. This is that same check, before the commit.
//
// <Warning>, <Note>, <Info>, <Tip> and <Danger> are the ones that keep getting
// written (they exist in Mintlify and in most docs frameworks); here every
// admonition is a Callout with a `kind`.
//
// Reusable snippets are the one legitimate source of a non-platform component
// name: a default import from `/snippets/…` makes that local name renderable on
// the page. So this also collects those imports per file, allows the names they
// bind, and fails when the imported file does not exist — the site's own
// failure mode for that is a rendered "Unable to load snippet" block on a live
// page, not a publish error.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Authoritative list: the components documented in the documentation-ai skill
// (references/components.md). Add to it only when the skill gains a component.
const SUPPORTED = new Set([
  'Callout', 'Card', 'CodeGroup', 'Columns', 'Expandable', 'ExpandableGroup',
  'Iframe', 'Image', 'ParamField', 'Request', 'Response', 'ResponseField',
  'Step', 'Steps', 'Tab', 'Tabs', 'Update', 'Video',
]);

// What to write instead, for the mistakes that actually happen.
const SUGGEST = {
  Warning: '<Callout kind="warning">',
  Danger: '<Callout kind="alert">',
  Error: '<Callout kind="alert">',
  Note: '<Callout kind="note">',
  Info: '<Callout kind="info">',
  Tip: '<Callout kind="tip">',
  Check: '<Callout kind="success">',
  Success: '<Callout kind="success">',
  Accordion: '<Expandable title="…">',
  AccordionGroup: '<ExpandableGroup>',
  CardGroup: '<Columns>',
  Frame: '<Image src="…" />',
  Snippet: 'a default import from /snippets/… and the imported name as the tag',
};

// `import Foo from "/snippets/bar.mdx"` — Documentation.AI treats a DEFAULT
// import under snippets/ as a snippet reference. Named imports are ordinary
// ESM and bind nothing renderable, so they are not collected.
const SNIPPET_IMPORT = /^\s*import\s+([A-Z][A-Za-z0-9]*)\s+from\s+['"](\/snippets\/[^'"]+)['"]/gm;

const root = new URL('..', import.meta.url).pathname;

function mdxFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...mdxFiles(p));
    else if (name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

/** Blank out fenced and inline code so a JSX example inside ``` isn't linted. */
function stripCode(src) {
  return src
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));
}

const files = process.argv.slice(2).length ? process.argv.slice(2) : mdxFiles(root);
let problems = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const stripped = stripCode(src);

  // Snippet names this page may render. Code fences are already blanked, so an
  // import shown as example syntax is not collected (and the site does not
  // expand those either).
  const snippets = new Set();
  for (const m of stripped.matchAll(SNIPPET_IMPORT)) {
    const [, name, path] = m;
    snippets.add(name);
    if (!existsSync(join(root, path))) {
      // m.index sits on the leading \s* of `^\s*import`, so step over it.
      const line = stripped.slice(0, m.index + m[0].indexOf('import')).split('\n').length;
      console.error(`✗ ${relative(root, file)}:${line}: snippet ${path} does not exist — the page will render "Unable to load snippet"`);
      problems++;
    }
  }

  for (const m of stripped.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) {
    const tag = m[1];
    if (SUPPORTED.has(tag) || snippets.has(tag)) continue;
    const line = stripped.slice(0, m.index).split('\n').length;
    const hint = SUGGEST[tag]
      ? ` — use ${SUGGEST[tag]}`
      : ` — supported: ${[...SUPPORTED].join(', ')}, or a snippet imported from /snippets/`;
    console.error(`✗ ${relative(root, file)}:${line}: <${tag}> is not a supported component${hint}`);
    problems++;
  }
}

if (problems) {
  console.error(`\n${problems} problem(s). The docs site rejects an unsupported component at publish time, and renders a missing snippet as a broken block on the live page.`);
  process.exit(1);
}
console.log(`components check: OK (${files.length} mdx files)`);
