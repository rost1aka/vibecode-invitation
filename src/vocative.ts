import type { Gender } from './params';

export const DEFAULT_GREETING = 'Друже';

/** The part of `shevchenko` we use; lets tests substitute the library. */
export interface ShevchenkoLib {
  GrammaticalGender: { MASCULINE: string; FEMININE: string };
  detectGender(input: { givenName: string }): Promise<string | null | undefined>;
  inVocative(input: { gender: string; givenName: string }): Promise<{ givenName?: string }>;
}

export type ShevchenkoLoader = () => Promise<ShevchenkoLib>;

// Dynamic import: the library is ~1 MB, so Vite puts it in its own chunk.
const loadShevchenko: ShevchenkoLoader = () => import('shevchenko') as unknown as Promise<ShevchenkoLib>;

const CYRILLIC_NAME = /^[\p{Script=Cyrillic}ʼ'’\- ]+$/u;

export async function toVocative(
  name: string | null,
  gender?: Gender | null,
  override?: string | null,
  load: ShevchenkoLoader = loadShevchenko,
): Promise<string> {
  const custom = override?.trim();
  if (custom) return custom;
  const givenName = name?.trim();
  if (!givenName) return DEFAULT_GREETING;
  if (!CYRILLIC_NAME.test(givenName)) return givenName;
  try {
    const lib = await load();
    const grammaticalGender =
      gender === 'm'
        ? lib.GrammaticalGender.MASCULINE
        : gender === 'f'
          ? lib.GrammaticalGender.FEMININE
          : await lib.detectGender({ givenName });
    if (!grammaticalGender) return givenName;
    const declined = await lib.inVocative({ gender: grammaticalGender, givenName });
    return declined.givenName || givenName;
  } catch {
    return givenName;
  }
}
