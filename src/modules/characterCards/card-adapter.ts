// PF1E 角色卡接入层。
//
// 本插件其余模块（先攻、气泡、悬浮信息卡、旧版查看器）都按 5E 的
// `schema_version: "0.3"` 结构读取角色数据。PF1E 卡（我们自己的
// `schema: "pf1e-card"`）在进入这些模块前，先由这里转换成同一结构，
// 这样其他功能不用逐个改字段名。
//
// 数据来源一律使用我们导出的字段：
//   meta.* / classes[] / abilities.* / derived.*
//   derived.abilityMods / ac / initiative / saves / cmb / cmd
//   derived.skillTotals / pools / spellcasting

type AnyRec = Record<string, any>;

export function isPf1eCard(data: unknown): boolean {
  return !!data && typeof data === "object" && (data as AnyRec).schema === "pf1e-card";
}

const SKILL_ZH: Record<string, string> = {
  climb: "攀爬", swim: "游泳", acrobatics: "特技", "disable-device": "解除装置",
  "escape-artist": "逃脱", fly: "飞行", ride: "骑术", "sleight-of-hand": "巧手",
  stealth: "隐匿", appraise: "估价", linguistics: "语言学", spellcraft: "法术辨识",
  "k-arcana": "奥秘知识", "k-dungeons": "地城知识", "k-nature": "自然知识",
  "k-planes": "位面知识", "k-religion": "宗教知识", "k-history": "历史知识",
  "k-nobility": "贵族知识", "k-local": "地方知识", craft: "工艺", lore: "学识",
  heal: "医疗", perception: "察觉", "sense-motive": "察言观色", survival: "生存",
  profession: "专业", bluff: "唬骗", diplomacy: "交涉", disguise: "易容",
  "handle-animal": "驯养动物", intimidate: "威吓", "use-magic-device": "使用魔法装置",
  art: "艺术", perform: "表演",
};

const SKILL_ABILITY: Record<string, string> = {
  climb: "str", swim: "str", acrobatics: "dex", "disable-device": "dex",
  "escape-artist": "dex", fly: "dex", ride: "dex", "sleight-of-hand": "dex",
  stealth: "dex", appraise: "int", linguistics: "int", spellcraft: "int",
  "k-arcana": "int", "k-dungeons": "int", "k-nature": "int", "k-planes": "int",
  "k-religion": "int", "k-history": "int", "k-nobility": "int", "k-local": "int",
  craft: "int", lore: "int", heal: "wis", perception: "wis", "sense-motive": "wis",
  survival: "wis", profession: "wis", bluff: "cha", diplomacy: "cha",
  disguise: "cha", "handle-animal": "cha", intimidate: "cha",
  "use-magic-device": "cha", art: "cha", perform: "cha",
};

/** PF1E 卡数据 → 插件内部沿用的 0.3 结构；非 PF1E 原样返回。 */
export function normalizeCardData<T>(data: T): T {
  if (!isPf1eCard(data)) return data;
  const d = data as AnyRec;
  const meta = d.meta || {};
  const derived = d.derived || {};
  const abilitiesIn = d.abilities || {};
  const mods = derived.abilityMods || {};
  const saves = derived.saves || { fort: derived.fort, ref: derived.ref, will: derived.will };
  const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
  const SAVE_ABILITY: Record<string, string> = { fort: "con", ref: "dex", will: "wis" };

  const abilities: AnyRec = {};
  for (const key of ABILITIES) {
    const total = Number(abilitiesIn[key] ?? 10);
    const modifier = Number(mods[key] ?? Math.floor((total - 10) / 2));
    let saveBonus = modifier;
    for (const [saveKey, abKey] of Object.entries(SAVE_ABILITY)) {
      if (abKey === key && saves?.[saveKey] != null) saveBonus = Number(saves[saveKey]) || 0;
    }
    abilities[key] = {
      total, initial: total, modifier,
      save: { proficient: false, bonus: saveBonus, misc: 0 },
    };
  }

  const classes = Array.isArray(d.classes) && d.classes.length
    ? d.classes.map((c: AnyRec, i: number) => ({
        role: i === 0 ? "主职" : `兼职${i}`,
        name: c.name || null,
        subclass: c.variant || null,
        level: c.level || null,
      }))
    : [{ role: "主职", name: null, subclass: null, level: null }];

  const skillsIn = derived.skillTotals || {};
  const skills = Object.keys(skillsIn).map((id) => ({
    id,
    name: SKILL_ZH[id] || id,
    ability: SKILL_ABILITY[id] || "int",
    proficiency: "none",
    total: Number(skillsIn[id]) || 0,
    misc_bonus: 0,
  }));

  const spellMeta = derived.spellcasting || {};
  const pages = Array.isArray(spellMeta) ? spellMeta : (Array.isArray(spellMeta.pages) ? spellMeta.pages : []);
  const firstPage = pages[0] || {};
  const perDay = firstPage.perDay || {};
  const spellSlots: AnyRec = {};
  for (const [ring, max] of Object.entries(perDay)) {
    const n = Number(max) || 0;
    if (n > 0) spellSlots[ring] = { current: n, max: n };
  }
  const prepared: AnyRec[] = [];
  pages.forEach((page: AnyRec, pageIndex: number) => {
    const preparedMap = page.prepared || {};
    for (const [ring, names] of Object.entries(preparedMap)) {
      for (const name of (names as string[]) || []) {
        prepared.push({ level: Number(ring), name, page: pageIndex + 1 });
      }
    }
  });

  const pools = Array.isArray(derived.pools) ? derived.pools : (Array.isArray(d.pools) ? d.pools : []);
  const specialResources = pools.map((p: AnyRec, i: number) => ({
    id: `pf1e-pool-${i}`, name: p.name || "能力池", type: "count",
    current: Number(p.current) || 0, max: Number(p.max) || 0,
  }));

  return {
    ...d,
    schema_version: "0.3",
    identity: {
      character_name: meta.name || "",
      display_name: meta.name || "",
      player: meta.player || "",
      race: { name: meta.race || "", subrace: null },
      alignment: meta.align || null,
    },
    classes,
    total_level: Number(meta.totalLevel) || 0,
    abilities,
    core_stats: {
      proficiency_bonus: 0,
      initiative: Number(derived.initiative) || 0,
      ac: Number(derived.ac) || 10,
      dc: null,
      passive_perception: null,
      size: meta.size || "中型",
      speed: Number(meta.speed) || 0,
      hp: {
        current: Number(derived.hpCurrent ?? derived.hpMax) || 0,
        max: Number(derived.hpMax) || 0,
        temp: 0,
      },
    },
    skills,
    spellcasting: { spell_slots: spellSlots, prepared },
    special_resources: specialResources,
    // 保留原始 PF1E 数据，供需要专有字段的界面使用
    pf1e: d,
  } as unknown as T;
}
