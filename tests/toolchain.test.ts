import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

describe('toolchain', () => {
  // VI-TC-51
  // Vercel's Node builder compiles api/*.ts with the project's own `typescript` package.
  it('provides a typescript package with the compiler API Vercel uses for api/*.ts', () => {
    const ts = require('typescript') as { transpileModule?: unknown };
    expect(typeof ts.transpileModule).toBe('function');
  });
});
