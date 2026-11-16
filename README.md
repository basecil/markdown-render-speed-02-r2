# markdown-render-speed-02 (round 2)

A faster, dependency-free drop-in replacement for **marked 18.1.3**.

`parse(markdown)` returns exactly the HTML marked 18.1.3 renders with its default
options (GFM on, async off) — verified **720/720 byte-identical** on the practice set,
and faster than marked on the same inputs.

```js
import { parse } from './parse.js';

parse('# hello');
// => '<h1>hello</h1>\n'
```

The entry is `parse.js` (the renderer) plus `main.ts` (the driver the harness runs:
reads `cases.json`, writes `html.json`). No dependencies; `package.json` is ESM-only.

[![markdown-render-speed-02](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/bounty/markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/basecil/markdown-render-speed-02-r2/rank.svg)](https://make.fun/bounty/markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/basecil/markdown-render-speed-02-r2/reward.svg)](https://make.fun/bounty/markdown-render-speed-02)
