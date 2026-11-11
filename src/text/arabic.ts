export const FATHATAN = "\u064B";
export const DAMMATAN = "\u064C";
export const KASRATAN = "\u064D";
export const FATHA = "\u064E";
export const DAMMA = "\u064F";
export const KASRA = "\u0650";
export const SHADDA = "\u0651";
export const SUKUN = "\u0652";
export const DAGGER_ALEF = "\u0670";

export const HARAKAT: readonly string[] = [FATHA, DAMMA, KASRA, SUKUN, SHADDA];
export const TANWEEN: readonly string[] = [FATHATAN, DAMMATAN, KASRATAN];

const ALEF = "\u0627";
const ALEF_MADDA = "\u0622";
const TEH_MARBUTA = "\u0629";
const WAW = "\u0648";
const YEH = "\u064A";
const ALEF_MAKSURA = "\u0649";

const ONE_MARK = /^[\u064B-\u065F\u0670]$/;
const MARK_RUN = /[\u064B-\u065F\u0670]+/g;
const WORD = /^(?:[\u0621-\u063A\u0641-\u064A][\u064B-\u0652]*)+$/;
const CLUSTER = /([\u0621-\u063A\u0641-\u064A])([\u064B-\u0652]*)/g;
const VOICED = /^\u0651?[\u064B-\u0650\u0652]$/;
const HAS_TANWEEN = /[\u064B-\u064D]/;

const LENGTHENED_BY: Readonly<Record<string, readonly string[]>> = {
  [ALEF]: [FATHA, FATHATAN],
  [WAW]: [DAMMA],
  [YEH]: [KASRA],
  [ALEF_MAKSURA]: [FATHA, FATHATAN],
};

interface Cluster {
  readonly letter: string;
  readonly marks: string;
}

function rank(mark: string): number {
  if (mark === SHADDA) {
    return 0;
  }
  return mark === DAGGER_ALEF ? 2 : 1;
}

export function isMark(char: string): boolean {
  return ONE_MARK.test(char);
}

export function canonicalizeMarks(text: string): string {
  return text.replace(MARK_RUN, (run) => [...run].sort((a, b) => rank(a) - rank(b)).join(""));
}

export function skeleton(text: string): string {
  return text.replace(MARK_RUN, "");
}

function lengthens(cluster: Cluster, previous: Cluster | undefined): boolean {
  return (LENGTHENED_BY[cluster.letter] ?? []).some((vowel) => previous?.marks.includes(vowel));
}

function isSilentAfterTanween(cluster: Cluster | undefined): boolean {
  return cluster !== undefined && cluster.marks === "" && (cluster.letter === ALEF || cluster.letter === ALEF_MAKSURA);
}

function isWellFormed(clusters: readonly Cluster[], index: number): boolean {
  const cluster = clusters[index];
  if (cluster === undefined) {
    return false;
  }
  const last = index === clusters.length - 1;
  if (cluster.letter === ALEF_MADDA) {
    return cluster.marks === "";
  }
  if (cluster.letter === TEH_MARBUTA && (index === 0 || !last)) {
    return false;
  }
  if (cluster.marks === "") {
    return lengthens(cluster, clusters[index - 1]);
  }
  if (!VOICED.test(cluster.marks)) {
    return false;
  }
  if (index === 0 && (cluster.marks.includes(SHADDA) || cluster.marks.includes(SUKUN))) {
    return false;
  }
  if (HAS_TANWEEN.test(cluster.marks)) {
    return last || (index === clusters.length - 2 && isSilentAfterTanween(clusters[index + 1]));
  }
  return true;
}

export function isFullyVocalized(word: string): boolean {
  if (!WORD.test(word)) {
    return false;
  }
  const clusters = [...word.matchAll(CLUSTER)].map((match) => ({ letter: match[1] ?? "", marks: match[2] ?? "" }));
  return clusters.every((_, index) => isWellFormed(clusters, index));
}
