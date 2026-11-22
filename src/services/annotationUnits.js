import { queryUnits } from './qudtService.js';

export function localizedUnitRows(units, language = 'en') {
  const preferred = /^de(?:-|$)/i.test(language) ? 'de' : 'en';
  const choices = new Map();
  for (const unit of units || []) {
    if (!unit?.unit || typeof unit.label !== 'string' || !unit.label.trim()) continue;
    const code = String(unit.labelLanguage || '').toLocaleLowerCase();
    const rank = code === preferred ? 0
      : code.startsWith(`${preferred}-`) ? 1
        : code === 'en' ? 2
          : code.startsWith('en-') ? 3 : Infinity;
    if (!Number.isFinite(rank)) continue;
    if (!choices.has(unit.unit) || rank < choices.get(unit.unit).rank) {
      choices.set(unit.unit, { rank, unit });
    }
  }
  return [...choices.values()].map((item) => item.unit);
}

export function englishUnitRows(units) {
  return localizedUnitRows(units, 'en');
}

/** Only literal unit evidence in a field associated with this column is eligible. */
export async function suggestUnit({ description, header, notes = '', quantityKind = '', language = 'en' }, lookup = queryUnits) {
  const sources = [{ name: 'header', value: header }, { name: 'description', value: description }, { name: 'note', value: notes }];
  const explicit = sources.flatMap(({ name, value }) => {
    const text = String(value || '');
    const matches = [...text.matchAll(/\[([^\]]{1,20})\]|\(([^)]{1,20})\)/g)];
    return matches.map((match) => ({ source: name, evidence: match[0], token: (match[1] || match[2]).trim() }));
  });
  if (!explicit.length) return null;
  const units = await lookup();
  const localizedByUri = new Map(localizedUnitRows(units, language).map((unit) => [unit.unit, unit]));
  for (const item of explicit) {
    const matching = units.filter((unit) =>
      unit.symbols?.includes(item.token) ||
      unit.label?.toLocaleLowerCase() === item.token.toLocaleLowerCase() ||
      unit.unit?.split('/').pop() === item.token,
    ).map((unit) => localizedByUri.get(unit.unit)).filter(Boolean);
    if (!matching.length) continue;
    const compatible = quantityKind ? matching.filter((unit) => unit.quantityKinds?.includes(quantityKind)) : matching;
    const candidates = compatible.length ? compatible : matching;
    const unique = [...new Map(candidates.map((unit) => [unit.unit, unit])).values()];
    if (unique.length !== 1) continue;
    return { unit: unique[0], reason: `${item.evidence} in the ${item.source}` };
  }
  return null;
}
