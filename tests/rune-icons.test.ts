import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runeIcon, runeStars } from '../src/rune-icons.ts';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const references=(markup:string)=>Array.from(markup.matchAll(/<use href="#(rune-[\w-]+)"/g),([,id])=>id);

test('static and dynamic rune icons resolve to one SVG symbol each',()=>{
  const symbols=Array.from(html.matchAll(/<symbol id="(rune-[\w-]+)" viewBox="0 0 24 24">/g),([,id])=>id);
  assert.equal(new Set(symbols).size,symbols.length);
  const dynamic=['forward','portal','restart','unlimited','verified','selected'] as const;
  const used=new Set(references(html+dynamic.map(runeIcon).join('')+runeStars(1)));
  assert.deepEqual(used,new Set(symbols));
});

test('mission ratings render three decorative marks with the correct earned count',()=>{
  for(let earned=0;earned<=3;earned++){
    const markup=runeStars(earned);
    assert.deepEqual(references(markup),[
      ...Array(earned).fill('rune-award'),
      ...Array(3-earned).fill('rune-award-empty'),
    ]);
    assert.equal((markup.match(/aria-hidden="true" focusable="false"/g)??[]).length,3);
  }
});
