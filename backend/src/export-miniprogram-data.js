const fs = require('fs');
const path = require('path');
const { loadGuideWorkbook, EXCEL_PATH } = require('./excel-guide');

const OUTPUT_PATH = path.join(__dirname, '../../miniprogram/data/country-guides.generated.js');

function withStableIds(guide) {
  return {
    ...guide,
    attractionsList: (guide.attractionsList || []).map((item, index) => ({
      id: `${guide.countryCode}-attraction-${index + 1}`,
      countryCode: guide.countryCode,
      countryZh: guide.countryZh,
      ...item
    })),
    recommendList: (guide.recommendList || []).map((item, index) => ({
      id: `${guide.countryCode}-recommend-${index + 1}`,
      countryCode: guide.countryCode,
      countryZh: guide.countryZh,
      ...item
    }))
  };
}

function main() {
  const sourceUpdatedAt = fs.statSync(EXCEL_PATH).mtime.toISOString();
  const guides = loadGuideWorkbook().map((guide) => ({
    ...withStableIds(guide),
    source: {
      type: 'workbook',
      label: '项目整合资料',
      updatedAt: sourceUpdatedAt,
      urls: [guide.visa && guide.visa.url, guide.extras && guide.extras.officialSites].filter(Boolean)
    }
  }));
  const payload = {
    sourceUpdatedAt,
    guidesByCode: Object.fromEntries(guides.map((guide) => [guide.countryCode, guide]))
  };
  const output = `// 此文件由 backend/src/export-miniprogram-data.js 从整合版.xlsx 生成，请勿手工编辑。\nmodule.exports = ${JSON.stringify(payload, null, 2)};\n`;
  fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
  console.log(`Exported ${guides.length} country guides to ${OUTPUT_PATH}`);
}

if (require.main === module) {
  main();
}

module.exports = { withStableIds };
