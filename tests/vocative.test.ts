import { describe, expect, it, vi } from 'vitest';
import { toVocative, type ShevchenkoLib } from '../src/vocative';

function fakeLib(overrides: Partial<ShevchenkoLib> = {}): ShevchenkoLib {
  return {
    GrammaticalGender: { MASCULINE: 'masculine', FEMININE: 'feminine' },
    detectGender: vi.fn(async () => 'masculine'),
    inVocative: vi.fn(async ({ givenName }: { givenName: string }) => ({ givenName: `${givenName}!` })),
    ...overrides,
  };
}

describe('toVocative', () => {
  it('VI-TC-23: declines common names with the real library', async () => {
    expect(await toVocative('Андрій')).toBe('Андрію');
    expect(await toVocative('Олена')).toBe('Олено');
    expect(await toVocative('Тарас')).toBe('Тарасе');
    expect(await toVocative('Микола')).toBe('Миколо');
  });

  it('VI-TC-24: prefers the override and greets «Друже» without a name', async () => {
    const lib = fakeLib();
    expect(await toVocative('Андрій', 'm', 'Андрійку', async () => lib)).toBe('Андрійку');
    expect(lib.inVocative).not.toHaveBeenCalled();
    expect(await toVocative(null)).toBe('Друже');
    expect(await toVocative('   ')).toBe('Друже');
  });

  it('VI-TC-25: returns the name unchanged for Latin names, unknown gender or library errors', async () => {
    const lib = fakeLib();
    expect(await toVocative('Alex', null, null, async () => lib)).toBe('Alex');
    expect(lib.detectGender).not.toHaveBeenCalled();

    const unknown = fakeLib({ detectGender: vi.fn(async () => null) });
    expect(await toVocative('Женя', null, null, async () => unknown)).toBe('Женя');

    expect(await toVocative('Андрій', null, null, async () => Promise.reject(new Error('chunk failed')))).toBe('Андрій');
    const throwing = fakeLib({ inVocative: vi.fn(async () => Promise.reject(new Error('boom'))) });
    expect(await toVocative('Андрій', null, null, async () => throwing)).toBe('Андрій');
  });

  it('VI-TC-26: passes an explicit gender to the library without detecting it', async () => {
    const lib = fakeLib();
    expect(await toVocative('Саша', 'f', null, async () => lib)).toBe('Саша!');
    expect(lib.detectGender).not.toHaveBeenCalled();
    expect(lib.inVocative).toHaveBeenCalledWith({ gender: 'feminine', givenName: 'Саша' });
  });
});
