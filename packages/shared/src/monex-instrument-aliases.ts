/**
 * 保有明細名（正規名）と資産クラス画面名のゆれを吸収する。
 * key = 正規名（ON COMPASS / 保有側）、value = 資産クラス側などで使われる別名。
 */
export const MONEX_INSTRUMENT_NAME_ALIASES: ReadonlyArray<{
  canonicalName: string;
  aliases: readonly string[];
}> = [
  {
    canonicalName: "ＭＳＶ内外ＥＴＦ資産配分Ｆ・Ｇ",
    aliases: ["ＭＳＶ内外ＥＴＦ資産配分ファンド（Ｇコース）"],
  },
];

export function buildMonexInstrumentNameAliasMap(
  entries: ReadonlyArray<{
    canonicalName: string;
    aliases: readonly string[];
  }> = MONEX_INSTRUMENT_NAME_ALIASES,
): Map<string, string[]> {
  let result = new Map<string, string[]>();

  for (const entry of entries) {
    result.set(entry.canonicalName, [...entry.aliases]);
  }

  return result;
}

/** 任意の名称から正規名を返す。別名でも正規名でもそのまま正規名。未登録は入力を返す。 */
export function resolveMonexCanonicalInstrumentName(
  instrumentName: string,
  aliasMap: Map<string, string[]> = buildMonexInstrumentNameAliasMap(),
): string {
  let result = instrumentName;

  for (const [canonicalName, aliases] of aliasMap) {
    if (canonicalName === instrumentName || aliases.includes(instrumentName)) {
      result = canonicalName;
      return result;
    }
  }

  return result;
}

/** 正規名に対応する lookup 用名称一覧（正規名 + 別名）。 */
export function listMonexInstrumentAliasLookupNames(
  instrumentName: string,
  aliasMap: Map<string, string[]> = buildMonexInstrumentNameAliasMap(),
): string[] {
  let result: string[] = [];
  const canonicalName = resolveMonexCanonicalInstrumentName(instrumentName, aliasMap);
  const aliases = aliasMap.get(canonicalName) ?? [];
  const names = new Set<string>([canonicalName, ...aliases, instrumentName]);
  result = [...names];
  return result;
}
