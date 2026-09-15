const path = require('path');
const XLSX = require('xlsx');
const { normalizeCountryCode } = require('./countries');

const EXCEL_PATH = path.join(__dirname, '../../../整合版.xlsx');

const COVER_MAP = {
  '刚果(金)': '/assets/images/covers/drc.jpg',
  加纳: '/assets/images/covers/ghana.jpg',
  埃及: '/assets/images/covers/egypt.jpg',
  安哥拉: '/assets/images/covers/angola.jpg',
  尼日利亚: '/assets/images/covers/nigeria.jpg',
  南非: '/assets/images/covers/south-africa.jpg',
  马达加斯加: '/assets/images/covers/madagascar.jpg',
  肯尼亚: '/assets/images/covers/kenya.jpg',
  坦桑尼亚: '/assets/images/covers/tanzania.jpg',
  科特迪瓦: '/assets/images/covers/cote-divoire.jpg',
  赞比亚: '/assets/images/covers/zambia.jpg'
};

const VISA_ICONS = [
  ['商务', '💼'],
  ['工作', '🛠️'],
  ['留学', '🎓'],
  ['学生', '🎓'],
  ['转机', '✈️'],
  ['过境', '✈️'],
  ['探亲', '👨‍👩‍👧'],
  ['免签', '✅'],
  ['落地', '🛬'],
  ['旅游', '🧳']
];

function text(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

function normalizeCountry(name) {
  return text(name)
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/^刚果金$/, '刚果(金)')
    .replace(/^刚果$/, '刚果(金)');
}

function countryCandidates(name) {
  const normalized = normalizeCountry(name);
  const list = [normalized];
  const noParen = normalized.replace(/[()]/g, '');
  if (noParen && !list.includes(noParen)) list.push(noParen);
  if (normalized === '刚果(金)' && !list.includes('刚果金')) list.push('刚果金');
  return list;
}

function splitLines(value) {
  return text(value)
    .split(/\n+|•|◦|；|;/)
    .map((item) => item.replace(/^\d+[\.．、]\s*/, '').trim())
    .filter((item) => item && item.length > 1 && !/^官方信息来源/.test(item));
}

function splitTags(value) {
  return text(value)
    .split(/[、，,/／|]/)
    .map((item) => item.trim())
    .filter((item) => item && item.length < 40);
}

function splitNumbered(value) {
  const raw = text(value);
  if (!raw) return [];
  const parts = raw
    .split(/(?=\n?\s*\d+[\.．、]\s)/)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts : [];
}

function firstPhone(value) {
  const match = text(value).replace(/－/g, '-').match(/\+?\d[\d\-\s]{6,}\d/);
  return match ? match[0].replace(/\s+/g, '') : '';
}

function clip(value, max = 180) {
  const raw = text(value);
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max).trim()}…`;
}

function visaIcon(type) {
  const found = VISA_ICONS.find(([key]) => type.includes(key));
  return found ? found[1] : '🛂';
}

function parseVisaItems(row) {
  const types = splitTags(row[3]);
  const mode = text(row[4]) || '以使馆为准';
  const time = text(row[5]) || '以使馆为准';
  const fee = text(row[6]) || '以使馆为准';
  const docs = splitLines(row[7]);
  const validity = splitLines(row[8]);
  const sourceTypes = types.length ? types : ['签证说明'];
  return sourceTypes.map((visaType, index) => ({
    id: `excel-${index + 1}`,
    visaType,
    visaMode: mode,
    processingTime: time,
    fee,
    validityPeriod: validity[0] || '以使馆签发为准',
    stayPeriod: validity.find((item) => /停留/.test(item)) || '以入境批注为准',
    icon: visaIcon(visaType),
    keyInfo: {
      materialsList: docs.length ? docs : [text(row[7]) || '请按使馆最新材料清单准备。'],
      validityList: validity.length ? validity : [text(row[8]) || '以使馆签发为准']
    }
  }));
}

function parsePhrases(raw, fallbackType = '日常') {
  let type = fallbackType;
  const items = [];
  text(raw)
    .split('\n')
    .forEach((line) => {
      const current = line.trim();
      if (!current) return;
      if (/问路/.test(current)) {
        type = '日常';
        if (!/^\d+/.test(current)) return;
      } else if (/就医/.test(current) && !/^\d+/.test(current)) {
        type = '医疗';
        return;
      } else if (/(报警|求助)/.test(current) && !/^\d+/.test(current)) {
        type = '应急';
        return;
      } else if (/购物/.test(current) && !/^\d+/.test(current)) {
        type = '日常';
        return;
      }

      const numbered = current.match(/^\d+[\.．、]\s*(.+)$/);
      if (!numbered) return;
      const parts = numbered[1]
        .split(/\s*(?:—+|–+|-+|\|+|｜+)\s*/)
        .map((item) => item.trim())
        .filter(Boolean);
      let cn = '';
      let foreign = '';
      let konger = '';
      if (parts.length >= 3) {
        if (/[\u4e00-\u9fff]/.test(parts[0]) && !/[\u4e00-\u9fff]/.test(parts[1])) {
          [cn, foreign, konger] = parts;
        } else {
          [foreign, konger, cn] = parts;
        }
      } else if (parts.length === 2) {
        if (/[\u4e00-\u9fff]/.test(parts[0])) {
          [cn, foreign] = parts;
        } else {
          [foreign, cn] = parts;
        }
      } else {
        cn = numbered[1];
      }
      items.push({
        type,
        cn: cn || numbered[1],
        foreign: foreign || '',
        konger: konger || '',
        audio: ''
      });
    });
  return items;
}

function parseLangSheet(workbook, officialLanguage) {
  const sheet = workbook.Sheets['语言'];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  let col = 0;
  if (/法/.test(officialLanguage)) col = 2;
  else if (/英/.test(officialLanguage) && !/斯瓦希里/.test(officialLanguage)) col = 3;
  else if (/斯瓦希里/.test(officialLanguage)) col = 0;
  const blob = rows.map((row) => row[col] || '').join('\n');
  return parsePhrases(blob);
}

function parseAttractions(row, countryZh) {
  const spots = text(row[42]);
  const tips = [text(row[43]), text(row[44])].filter(Boolean).join('\n');
  const cover = COVER_MAP[countryZh] || '/assets/images/covers/drc.jpg';
  const numbered = splitNumbered(spots);
  const source = numbered.length
    ? numbered
    : text(spots)
        .split(/[、，]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 4);
  const list = (source.length ? source : spots ? [spots] : []).map((block, index) => {
    const clean = text(block).replace(/^\d+[\.．、]\s*/, '');
    const name = clean.split(/[（(，,]/)[0].trim().slice(0, 28) || `${countryZh}景点`;
    return {
      name,
      image: cover,
      tags: ['整合资料', index === 0 ? '热门' : '推荐'],
      desc: clean,
      tips: tips || '出行前请再确认开放时间和安全提示。'
    };
  });
  return list.slice(0, 8);
}

function parseRecommend(row, countryZh) {
  const items = [
    ['住宿', '住宿建议', row[37]],
    ['交通', '交通方式', row[38]],
    ['美食', '美食推荐', row[39]],
    ['活动', '特色活动', row[40]]
  ];
  return items
    .filter((item) => text(item[2]))
    .map(([category, name, value]) => ({
      category,
      name,
      rating: '⭐⭐⭐⭐',
      desc: text(value),
      address: countryZh,
      safetyTip: text(row[43]) || '优先选择安全区域和正规服务。'
    }));
}

function parseLabor(row) {
  return [
    ['外籍员工配额', row[25], '用工', '重要'],
    ['工作许可申请流程', row[26], '签证安全', '强制'],
    ['健康证明要求', row[27], '医疗准入', '强制'],
    ['劳务合同规范', row[28], '合同', '重要'],
    ['社保与税务', row[29], '财务合规', '强制'],
    ['官方维权渠道', row[30], '信息来源', '建议']
  ]
    .filter((item) => text(item[1]))
    .map(([title, content, tag, level], index) => ({
      id: `labor-${index + 1}`,
      title,
      content: text(content),
      tag,
      level
    }));
}

function parseHospitals(row) {
  const phone = firstPhone(row[35]) || firstPhone(row[16]) || firstPhone(row[47]);
  const numbered = splitNumbered(row[34]);
  const blocks = numbered.length ? numbered : text(row[34]) ? [text(row[34])] : [];
  const hospitals = blocks.slice(0, 4).map((block) => {
    const lines = splitLines(block);
    const name = (lines[0] || '当地医院').replace(/^\d+[\.．、]\s*/, '').slice(0, 40);
    const address = lines.find((item) => /地址|位置|区|路|街/.test(item)) || lines[1] || clip(block, 80);
    return {
      name,
      address,
      phone: firstPhone(block) || phone || ''
    };
  });
  return hospitals.length
    ? hospitals
    : [{ name: `${normalizeCountry(row[0])}医疗机构`, address: clip(row[34], 80) || '详见使馆或当地卫生部门', phone }];
}

function parseSecurity(row, countryZh) {
  const indexMatch = text(row[11]).match(/(\d+(\.\d+)?)/);
  const crimeIndex = indexMatch ? Number(indexMatch[1]) : 50;
  const tips = splitLines(row[14]).concat(splitLines(row[43])).slice(0, 6);
  const contacts = text(row[16]);
  const embassy = firstPhone(row[47]) || firstPhone(contacts);
  const police = (text(row[35]).match(/报警[：:]\s*([0-9/+ ]+)/) || [])[1] || firstPhone(row[35]) || '112';
  return {
    countryNameZh: countryZh,
    overallCrimeIndex: crimeIndex,
    gaugeSweep: Math.max(40, Math.min(360, Math.round((crimeIndex / 100) * 360))),
    crimeTypes: splitTags(row[13]).slice(0, 8),
    highRiskAreas: splitTags(row[12]).slice(0, 8),
    specialRisk: text(row[14]) || '请尽量白天出行，避免单独前往偏僻区域。',
    embassyWarning: text(row[15]) || '请关注中国驻当地使领馆最新安全提醒。',
    travelTips: tips.length ? tips : splitLines(row[15]).slice(0, 5),
    emergencyChecklist: [
      '护照首页与签证页照片（云端+本地双备份）',
      '使馆电话、公司安保、当地医院电话纸质留存',
      '抗疟药、净水片、便携手电与备用电池',
      '现金小额分包，证件与现金分离'
    ],
    embassyPhone: embassy || '',
    policePhone: String(police).replace(/\s+/g, '').split('/')[0] || '112',
    medicalPhone: firstPhone(row[35]) || '112'
  };
}

function parseCustoms(row, countryZh) {
  const religion = splitLines(row[17]).slice(0, 6);
  const etiquette = splitLines(row[18]);
  const dress = text(row[21]);
  const menMatch = dress.split(/女士|女性/);
  return {
    languageLabel: `官方语言 / Official Language: ${text(row[23]) || '当地语言'}`,
    pageTitle: `${countryZh} 风俗与禁忌指南`,
    behaviorLines: religion.slice(0, 2).concat(etiquette.slice(0, 1)).slice(0, 2),
    colorText: clip(row[19], 120) || '无明显统一颜色禁忌，正式场合以素净为宜。',
    religionLines: religion.length ? religion : ['出行前了解当地宗教节日与着装习惯。'],
    dressMen: clip(menMatch[0] || dress, 140) || '正式场合建议正装，避免过于随意。',
    dressWomen: clip(menMatch[1] || dress, 140) || '进入宗教场所建议穿着保守。',
    etiquetteChips: etiquette.slice(0, 4),
    etiquetteText: clip(row[18], 220),
    customText: clip(row[20], 260),
    sourceLines: splitLines(row[22]).slice(0, 4)
  };
}

function parseHealth(row, countryZh) {
  const malariaTips = splitLines(`${row[32]}\n${row[36]}`).slice(0, 8);
  return {
    tickerText: clip(row[33], 90) || `${countryZh}健康提醒：出行前确认黄热病与疟疾防护。`,
    entryMustDesc: text(row[31]) || '入境前请确认是否需要黄热病疫苗接种证书。',
    hospitals: parseHospitals(row),
    malariaTips: malariaTips.length ? malariaTips : ['提前准备防蚊和抗疟药物，避免夜间户外久留。'],
    emergencyPhone: firstPhone(row[35]) || firstPhone(row[16]) || '112'
  };
}

function parseLocalInfo(row, countryZh) {
  return {
    summary: clip(row[2], 140) || `${countryZh}近期资讯已按整合资料同步。`,
    pulseItems: [
      {
        tag: '使馆联系',
        title: '使馆与紧急求助',
        desc: clip(row[47] || row[16], 90),
        action: 'security'
      },
      {
        tag: '生活资讯',
        title: '常用生活 App',
        desc: clip(row[46], 90),
        action: 'tips'
      },
      {
        tag: '安全观察',
        title: '高风险区域提醒',
        desc: clip(row[12], 90),
        action: 'security'
      }
    ].filter((item) => item.desc),
    livingTips: [
      { title: '住宿先选安全区', desc: clip(row[37], 100) },
      { title: '交通优先正规渠道', desc: clip(row[38], 100) },
      { title: '保留使馆与官方入口', desc: clip(row[48] || row[47], 100) }
    ].filter((item) => item.desc)
  };
}

function buildPayload(row, workbook) {
  const countryZh = normalizeCountry(row[0]);
  const phrasesRaw = text(row[24]);
  const phrasesList =
    phrasesRaw.length > 40 && !/详情见语言/.test(phrasesRaw)
      ? parsePhrases(phrasesRaw)
      : parseLangSheet(workbook, text(row[23]));

  return {
    countryCode: normalizeCountryCode(countryZh),
    countryZh,
    region: text(row[1]),
    chinaCoop: text(row[2]),
    officialLanguage: text(row[23]),
    visa: {
      types: text(row[3]),
      mode: text(row[4]),
      time: text(row[5]),
      fee: text(row[6]),
      docs: text(row[7]),
      validity: text(row[8]),
      policy: text(row[9]),
      url: text(row[10])
    },
    visaItems: parseVisaItems(row),
    latestPolicyChange: text(row[9]) || '请以使馆最新公告为准。',
    security: parseSecurity(row, countryZh),
    customs: parseCustoms(row, countryZh),
    phrasesList: phrasesList.map((item, index) => ({ id: index + 1, ...item })),
    laborList: parseLabor(row),
    health: parseHealth(row, countryZh),
    attractionsList: parseAttractions(row, countryZh),
    recommendList: parseRecommend(row, countryZh),
    localInfo: parseLocalInfo(row, countryZh),
    extras: {
      apps: text(row[46]),
      embassy: text(row[47]),
      officialSites: text(row[48])
    }
  };
}

function loadGuideWorkbook(filePath = EXCEL_PATH) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets.Sheet1;
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  const countries = [];
  for (let i = 2; i < rows.length; i += 1) {
    if (!text(rows[i][0])) continue;
    countries.push(buildPayload(rows[i], workbook));
  }
  return countries;
}

module.exports = {
  EXCEL_PATH,
  COVER_MAP,
  normalizeCountry,
  countryCandidates,
  loadGuideWorkbook
};
