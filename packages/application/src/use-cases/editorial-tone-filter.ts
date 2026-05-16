/**
 * Spec: ai-assistance / "AI never adopts the editorializing voice",
 *       presentation-principles / "No editorializing copy in product strings".
 *
 * Pure-function filter applied at AI-port boundaries. If the model returns
 * text containing a deny-list phrase, the caller is expected to regenerate
 * once; on a repeat hit, the phrase is stripped before the response is
 * returned to the user.
 */

export const EDITORIAL_TONE_DENY_LIST: readonly string[] = [
  // Bahasa Indonesia (primary — what the model is actually instructed to write)
  'mengejutkan',
  'sudah diduga',
  'menghebohkan',
  'fantastis',
  'gempar',
  'sensasional',
  // English equivalents that might leak through translation
  'shocking',
  'as expected',
  'explosive',
  'stunning',
  'breaking news',
];

export interface EditorialToneFilterResult {
  readonly safe: string;
  readonly hits: readonly string[];
  readonly stripped: boolean;
}

export function detectEditorialTone(text: string): readonly string[] {
  const lower = text.toLowerCase();
  return EDITORIAL_TONE_DENY_LIST.filter((phrase) => lower.includes(phrase));
}

export function stripEditorialTone(text: string): EditorialToneFilterResult {
  let safe = text;
  const hits: string[] = [];
  for (const phrase of EDITORIAL_TONE_DENY_LIST) {
    const re = new RegExp(escapeRegExp(phrase), 'gi');
    if (re.test(safe)) {
      hits.push(phrase);
      safe = safe.replace(re, '').replace(/\s{2,}/g, ' ').trim();
    }
  }
  return { safe, hits, stripped: hits.length > 0 };
}

/**
 * Spec: ai-assistance / "Outputs from any port detected by a configured
 * filter to contain such phrases SHALL be regenerated once and, on repeat,
 * returned with the offending phrase stripped."
 */
export async function withEditorialToneGuard<TOutput>(
  produce: () => Promise<TOutput>,
  extractText: (output: TOutput) => string,
  replaceText: (output: TOutput, safe: string) => TOutput,
): Promise<TOutput> {
  const first = await produce();
  const firstHits = detectEditorialTone(extractText(first));
  if (firstHits.length === 0) return first;
  const second = await produce();
  const secondHits = detectEditorialTone(extractText(second));
  if (secondHits.length === 0) return second;
  const cleaned = stripEditorialTone(extractText(second));
  return replaceText(second, cleaned.safe);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
