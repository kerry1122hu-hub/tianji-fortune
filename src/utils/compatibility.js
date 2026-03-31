/**
 * 明己 MingMe - 合作匹配模块
 * 
 * 功能：
 * 1. 输入两人出生信息
 * 2. 分析双方八字五行互补或冲克
 * 3. 给出合作建议和相处之道
 * 4. 适用于商业合伙人、客户关系、团队搭配
 */

import { fullBaZiChart, getShiShen, TIAN_GAN, DI_ZHI, WU_XING, DZ_WX,
         SHENG_KE, getWuXingCount } from './baziEngine';

// 地支六合
const LIU_HE = { "子":"丑","丑":"子","寅":"亥","卯":"戌","辰":"酉","巳":"申",
                  "午":"未","未":"午","申":"巳","酉":"辰","戌":"卯","亥":"寅" };

// 地支六冲
const LIU_CHONG = { "子":"午","午":"子","丑":"未","未":"丑","寅":"申","申":"寅",
                     "卯":"酉","酉":"卯","辰":"戌","戌":"辰","巳":"亥","亥":"巳" };

// 地支三合局
const SAN_HE = [
  ["申","子","辰"], // 水局
  ["寅","午","戌"], // 火局
  ["巳","酉","丑"], // 金局
  ["亥","卯","未"], // 木局
];

// 地支相刑
const XIANG_XING = {
  "寅": "巳", "巳": "申", "申": "寅",
  "丑": "戌", "戌": "未", "未": "丑",
  "子": "卯", "卯": "子",
};

// 地支相害
const XIANG_HAI = {
  "子":"未","未":"子","丑":"午","午":"丑",
  "寅":"巳","巳":"寅","卯":"辰","辰":"卯",
  "申":"亥","亥":"申","酉":"戌","戌":"酉",
};

// 天干五合
const TIAN_GAN_HE = { "甲":"己","己":"甲","乙":"庚","庚":"乙","丙":"辛","辛":"丙",
                       "丁":"壬","壬":"丁","戊":"癸","癸":"戊" };

/**
 * 分析两人八字合化程度
 * @param person1 { year, month, day, hour, gender }
 * @param person2 { year, month, day, hour, gender }
 * @returns 合作匹配分析结果
 */
export function analyzeCompatibility(person1, person2) {
  // 排盘
  const chart1 = fullBaZiChart(person1.year, person1.month, person1.day, person1.hour, person1.gender);
  const chart2 = fullBaZiChart(person2.year, person2.month, person2.day, person2.hour, person2.gender);

  const pillars1 = chart1.pillars;
  const pillars2 = chart2.pillars;
  const dayGan1 = chart1.dayGan;
  const dayGan2 = chart2.dayGan;

  // 各项评分
  const scores = {
    tianGanHe: analyzeTianGanHe(pillars1, pillars2),      // 天干合
    diZhiHe: analyzeDiZhiHe(pillars1, pillars2),          // 地支合
    wuxingBubu: analyzeWuXingComplement(chart1, chart2),   // 五行互补
    dayMasterRelation: analyzeDayMasterRelation(dayGan1, dayGan2), // 日主关系
    conflicts: analyzeConflicts(pillars1, pillars2),        // 冲克
  };

  // 总分计算
  const totalScore = Math.round(
    scores.tianGanHe.score * 0.2 +
    scores.diZhiHe.score * 0.2 +
    scores.wuxingBubu.score * 0.25 +
    scores.dayMasterRelation.score * 0.2 +
    (100 - scores.conflicts.score) * 0.15  // 冲克分越低越好
  );

  // 合作建议
  const advice = generateCompatibilityAdvice(scores, dayGan1, dayGan2, chart1, chart2);

  return {
    person1: {
      pillars: pillars1,
      dayGan: dayGan1,
      dayWuXing: chart1.dayWuXing,
      shengXiao: chart1.shengXiao,
      wxCount: chart1.wxCount,
    },
    person2: {
      pillars: pillars2,
      dayGan: dayGan2,
      dayWuXing: chart2.dayWuXing,
      shengXiao: chart2.shengXiao,
      wxCount: chart2.wxCount,
    },
    scores,
    totalScore,
    level: getCompatibilityLevel(totalScore),
    advice,
  };
}

/**
 * 天干合分析
 */
function analyzeTianGanHe(pillars1, pillars2) {
  let heCount = 0;
  const details = [];

  for (const p1 of pillars1) {
    for (const p2 of pillars2) {
      if (TIAN_GAN_HE[p1.gan] === p2.gan) {
        heCount++;
        details.push({ gan1: p1.gan, gan2: p2.gan, label1: p1.label, label2: p2.label });
      }
    }
  }

  // 日干相合特别重要
  const dayGanHe = TIAN_GAN_HE[pillars1[2].gan] === pillars2[2].gan;

  return {
    score: Math.min(100, heCount * 25 + (dayGanHe ? 30 : 0)),
    heCount,
    dayGanHe,
    details,
  };
}

/**
 * 地支合分析（六合、三合）
 */
function analyzeDiZhiHe(pillars1, pillars2) {
  let liuHeCount = 0;
  let sanHeCount = 0;
  const details = [];

  for (const p1 of pillars1) {
    for (const p2 of pillars2) {
      // 六合
      if (LIU_HE[p1.zhi] === p2.zhi) {
        liuHeCount++;
        details.push({ type: 'liuhe', zhi1: p1.zhi, zhi2: p2.zhi });
      }
    }
  }

  // 三合检查
  const allZhi1 = pillars1.map(p => p.zhi);
  const allZhi2 = pillars2.map(p => p.zhi);
  for (const combo of SAN_HE) {
    const found1 = combo.filter(z => allZhi1.includes(z));
    const found2 = combo.filter(z => allZhi2.includes(z));
    if (found1.length >= 1 && found2.length >= 1 && (found1.length + found2.length) >= 3) {
      sanHeCount++;
    }
  }

  return {
    score: Math.min(100, liuHeCount * 20 + sanHeCount * 15),
    liuHeCount,
    sanHeCount,
    details,
  };
}

/**
 * 五行互补分析
 */
function analyzeWuXingComplement(chart1, chart2) {
  const wx1 = chart1.wxCount;
  const wx2 = chart2.wxCount;

  let complementScore = 0;
  const details = [];
  const elements = ["木", "火", "土", "金", "水"];

  for (const wx of elements) {
    if (wx1[wx] === 0 && wx2[wx] >= 2) {
      complementScore += 15;
      details.push({ element: wx, description: 'complement', who: 'person2_fills_person1' });
    } else if (wx2[wx] === 0 && wx1[wx] >= 2) {
      complementScore += 15;
      details.push({ element: wx, description: 'complement', who: 'person1_fills_person2' });
    } else if (wx1[wx] >= 1 && wx2[wx] >= 1) {
      complementScore += 5;
    }
  }

  // 检查五行是否过于相同（不利互补）
  let similarity = 0;
  for (const wx of elements) {
    similarity += Math.abs(wx1[wx] - wx2[wx]);
  }
  if (similarity < 3) complementScore -= 10; // 太相似不利互补

  return {
    score: Math.max(0, Math.min(100, 40 + complementScore)),
    details,
  };
}

/**
 * 日主关系分析
 */
function analyzeDayMasterRelation(dayGan1, dayGan2) {
  const wx1 = WU_XING[TIAN_GAN.indexOf(dayGan1)];
  const wx2 = WU_XING[TIAN_GAN.indexOf(dayGan2)];
  const rel = SHENG_KE[wx1];

  let score, relationship;

  if (wx1 === wx2) {
    score = 70;
    relationship = { 'zh-Hans': '比肩关系·同行者', 'zh-Hant': '比肩關係·同行者', 'en': 'Companions — Similar strengths' };
  } else if (rel.sheng === wx2) {
    score = 75;
    relationship = { 'zh-Hans': '我生他·给予者', 'zh-Hant': '我生他·給予者', 'en': 'You support them — Giver role' };
  } else if (rel.beiSheng === wx2) {
    score = 85;
    relationship = { 'zh-Hans': '他生我·被助者', 'zh-Hant': '他生我·被助者', 'en': 'They support you — Receiver role' };
  } else if (rel.ke === wx2) {
    score = 60;
    relationship = { 'zh-Hans': '我克他·主导者', 'zh-Hant': '我剋他·主導者', 'en': 'You lead them — Dominant role' };
  } else {
    score = 55;
    relationship = { 'zh-Hans': '他克我·被制者', 'zh-Hant': '他剋我·被制者', 'en': 'They challenge you — Growth opportunity' };
  }

  return {
    score,
    relationship,
    wx1,
    wx2,
  };
}

/**
 * 冲克分析（分越高越多冲克，越不利）
 */
function analyzeConflicts(pillars1, pillars2) {
  let chongCount = 0;
  let xingCount = 0;
  let haiCount = 0;
  const details = [];

  for (const p1 of pillars1) {
    for (const p2 of pillars2) {
      if (LIU_CHONG[p1.zhi] === p2.zhi) {
        chongCount++;
        details.push({ type: 'chong', zhi1: p1.zhi, zhi2: p2.zhi,
          label: { 'zh-Hans': `${p1.zhi}${p2.zhi}相冲`, 'zh-Hant': `${p1.zhi}${p2.zhi}相沖`, 'en': `${p1.zhi}-${p2.zhi} clash` }
        });
      }
      if (XIANG_XING[p1.zhi] === p2.zhi) {
        xingCount++;
      }
      if (XIANG_HAI[p1.zhi] === p2.zhi) {
        haiCount++;
      }
    }
  }

  return {
    score: chongCount * 25 + xingCount * 15 + haiCount * 10,
    chongCount,
    xingCount,
    haiCount,
    details,
  };
}

/**
 * 合作等级
 */
function getCompatibilityLevel(score) {
  if (score >= 85) return { level: 'excellent', label: { 'zh-Hans': '天作之合', 'zh-Hant': '天作之合', 'en': 'Excellent Match' }, color: '#d4af37' };
  if (score >= 75) return { level: 'good', label: { 'zh-Hans': '良好搭档', 'zh-Hant': '良好搭檔', 'en': 'Good Partnership' }, color: '#2ECC71' };
  if (score >= 60) return { level: 'average', label: { 'zh-Hans': '尚可合作', 'zh-Hant': '尚可合作', 'en': 'Workable Match' }, color: '#3498DB' };
  if (score >= 45) return { level: 'challenging', label: { 'zh-Hans': '需要磨合', 'zh-Hant': '需要磨合', 'en': 'Needs Adjustment' }, color: '#F39C12' };
  return { level: 'difficult', label: { 'zh-Hans': '慎重考虑', 'zh-Hant': '慎重考慮', 'en': 'Consider Carefully' }, color: '#E74C3C' };
}

/**
 * 生成合作建议
 */
function generateCompatibilityAdvice(scores, dayGan1, dayGan2, chart1, chart2) {
  const advice = {
    'zh-Hans': { strengths: [], challenges: [], tips: [] },
    'zh-Hant': { strengths: [], challenges: [], tips: [] },
    'en': { strengths: [], challenges: [], tips: [] },
  };

  // 优势
  if (scores.tianGanHe.dayGanHe) {
    advice['zh-Hans'].strengths.push('日干相合，天生默契，沟通顺畅，适合深度合作');
    advice['zh-Hant'].strengths.push('日干相合，天生默契，溝通順暢，適合深度合作');
    advice['en'].strengths.push('Day Stems harmonize — natural chemistry and smooth communication');
  }
  if (scores.diZhiHe.liuHeCount >= 2) {
    advice['zh-Hans'].strengths.push('地支多合，行动方向一致，执行力互补');
    advice['zh-Hant'].strengths.push('地支多合，行動方向一致，執行力互補');
    advice['en'].strengths.push('Multiple Branch harmonies — aligned in actions and execution');
  }
  if (scores.wuxingBubu.score >= 70) {
    advice['zh-Hans'].strengths.push('五行互补良好，各有所长，能取长补短');
    advice['zh-Hant'].strengths.push('五行互補良好，各有所長，能取長補短');
    advice['en'].strengths.push('Five Elements complement well — each covers the other\'s gaps');
  }
  if (scores.dayMasterRelation.score >= 80) {
    advice['zh-Hans'].strengths.push('日主关系融洽，合作中能互相成就');
    advice['zh-Hant'].strengths.push('日主關係融洽，合作中能互相成就');
    advice['en'].strengths.push('Day Masters relate well — mutual growth in partnership');
  }

  // 挑战
  if (scores.conflicts.chongCount >= 2) {
    advice['zh-Hans'].challenges.push('地支冲克较多，理念或做事风格可能有较大差异');
    advice['zh-Hant'].challenges.push('地支沖剋較多，理念或做事風格可能有較大差異');
    advice['en'].challenges.push('Multiple Branch clashes — differing philosophies or work styles');
  }
  if (scores.dayMasterRelation.score < 60) {
    advice['zh-Hans'].challenges.push('日主相克，需要注意权力分配和决策方式');
    advice['zh-Hant'].challenges.push('日主相剋，需要注意權力分配和決策方式');
    advice['en'].challenges.push('Day Master tension — be mindful of power dynamics and decision-making');
  }

  // 建议
  const wx1 = chart1.dayWuXing;
  const wx2 = chart2.dayWuXing;
  const bridgeWx = SHENG_KE[wx1].sheng; // 通关五行

  advice['zh-Hans'].tips.push(`建议在${bridgeWx}属性的环境或时间合作，有助于化解分歧`);
  advice['zh-Hant'].tips.push(`建議在${bridgeWx}屬性的環境或時間合作，有助於化解分歧`);
  advice['en'].tips.push(`Collaborate in ${bridgeWx}-element environments or timing to bridge differences`);

  advice['zh-Hans'].tips.push('重大决策前，选择双方运势都较好的日子进行');
  advice['zh-Hant'].tips.push('重大決策前，選擇雙方運勢都較好的日子進行');
  advice['en'].tips.push('For major decisions, choose days when both parties\' fortune is favorable');

  if (scores.conflicts.chongCount > 0) {
    advice['zh-Hans'].tips.push('遇到分歧时，引入第三方调解比正面对抗更有效');
    advice['zh-Hant'].tips.push('遇到分歧時，引入第三方調解比正面對抗更有效');
    advice['en'].tips.push('When disagreements arise, mediation works better than confrontation');
  }

  return advice;
}
