/** Strips the usage examples out of a data/vocabulary.json definition, leaving
 *  just the meaning:
 *
 *    "people; '¡mi gente!' = 'my people!'"                    -> "people"
 *    "you are; 'si no estás conmigo' — from estar"            -> "you are — from estar"
 *    "that (neuter); also an exclamation — '¡eso!' = '...'"   -> "that (neuter); also an exclamation"
 *
 *  Examples always follow a `;`, `,` or `—` and open with a quote. Quotes inside
 *  the definition itself ("diminutive of 'poco'") are left alone, and a trailing
 *  "— from <verb>" note (the infinitive) is kept. */
export function definitionOnly(definition: string): string {
  const cut = definition.search(/[;,—]\s+'|;\s+also\s+'/);
  if (cut === -1) return definition;
  const head = definition.slice(0, cut).trim();
  const lemma = definition.slice(cut).match(/—\s*from\s+[^\s;]+\s*$/);
  return lemma ? `${head} ${lemma[0]}` : head;
}
