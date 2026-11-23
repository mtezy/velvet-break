import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('the table HUD keeps shooting controls visible and exposes all camera and display controls in one popover', () => {
  const hud = page.match(/<section\b[^>]*\bclass="[^"]*\bshot-hud\b[^"]*"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert.ok(hud);
  const options = hud.match(/<aside\b[^>]*\bid="hud-view-options"\s+popover\b[^>]*>([\s\S]*?)<\/aside>/)?.[1];
  assert.ok(options);
  const bar = hud.slice(0, hud.indexOf('<aside'));
  assert.match(bar, /<button\b[^>]*\bpopovertarget="hud-view-options"/);
  for (const id of ['restart-button', 'spin-picker', 'spin-reset', 'power', 'power-value', 'shoot-button']) {
    assert.ok(bar.includes(`id="${id}"`), `${id} should be available without opening the popover`);
  }
  for (const id of ['view-club', 'view-overhead', 'view-custom', 'view-reset', 'camera-button', 'effects-button', 'quality-button', 'labels-button', 'replay-toggle']) {
    assert.ok(options.includes(`id="${id}"`), `${id} should be available in the popover`);
  }
});
