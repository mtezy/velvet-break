import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('navigation motion is loaded by the game and scoped to no motion preference', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/page-transitions.css', import.meta.url), 'utf8').trim();
  assert.match(html, /<link rel="stylesheet" href="\.\/src\/page-transitions\.css"/);
  const media = css.match(/^@media \(prefers-reduced-motion: no-preference\)\s*\{/);
  assert.ok(media);
  let depth = 1;
  for (let i = media[0].length; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') depth--;
    if (depth === 0) {
      assert.equal(i, css.length - 1, 'No navigation styles should leak outside the motion query');
      return;
    }
  }
  assert.fail('Missing closing motion-query brace');
});
