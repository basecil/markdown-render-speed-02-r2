// Entry driver for markdown-render-speed-02.
//
// The harness runs `node /bot/main.ts` (Node 22). We read every case from
// /input/cases.json -- a JSON array of { id, markdown } -- render each markdown
// string on its own through parse() from parse.js, and write /output/html.json:
// a JSON array of the resulting HTML strings, one per case and in the cases' order.
// Each case is rendered independently, exactly once.
//
// MAKEFUN_INPUT_DIR / MAKEFUN_OUTPUT_DIR override /input /output outside the
// container, which is how we exercise this locally.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from './parse.js';

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

type Case = { id: string; markdown: string };

const cases = JSON.parse(readFileSync(join(INPUT_DIR, 'cases.json'), 'utf8')) as Case[];

const rendered: string[] = new Array(cases.length);
for (let i = 0; i < cases.length; i++) {
  rendered[i] = parse(cases[i]!.markdown);
}

writeFileSync(join(OUTPUT_DIR, 'html.json'), JSON.stringify(rendered));
