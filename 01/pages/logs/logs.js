import { loadGuide } from '../../utils/cloud-service.js';
import { decorateBookmarks, toggleBookmark } from '../../utils/bookmarks.js';
import { getSelectedDestination } from '../../utils/countries.js';

Page({
  data: {
    countryName: '肯尼亚',
    countryFlag: '🇰🇪',
    themeStart: '#edf6ff',
    themeEnd: '#ffffff',
    pageThemeStyle: '--theme-start:#edf6ff;--theme-end:#ffffff;',
    updateDate: '2026-03-22',
    statusBarHeight: 20,
    navWrapHeight: 88,
    capsuleWidth: 96,
    capsuleHeight: 32,
    visaItems: [],
    latestPolicyChange: '',
    sourceUrls: [],
    noData: false,
    expandedVisaId: ''
  },

  onLoad(options) {
    const themeStart = decodeURIComponent((options && options.themeStart) || '#edf6ff')
    const themeEnd = decodeURIComponent((options && options.themeEnd) || '#ffffff')

    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: themeEnd,
      animation: {
        duration: 160,
        timingFunc: 'easeIn'
      }
    })

    this.setData({
      themeStart,
      themeEnd,
      pageThemeStyle: `--theme-start:${themeStart};--theme-end:${themeEnd};`
    })

    this.initNavMetrics()

    const selectedDestination = getSelectedDestination()
    const rawCountryName = selectedDestination.zhName
    const countryName = this.normalizeCountryName(rawCountryName)
    this.loadVisaData(countryName)
  },

  async loadVisaData(countryName) {
    try {
      const guide = await loadGuide(countryName)
      if (guide && Array.isArray(guide.visaItems) && guide.visaItems.length) {
        const visaItems = await decorateBookmarks(
          this.normalizeVisaItems(guide.visaItems).map((item) => this.attachCardKeyInfo(item)),
          'visa'
        )
        this.setData({
          countryName,
          countryFlag: this.getCountryFlag(countryName),
          updateDate: this.formatSourceDate(guide.source && guide.source.updatedAt),
          visaItems,
          latestPolicyChange: guide.latestPolicyChange || '',
          sourceUrls: (guide.source && guide.source.urls) || [],
          noData: false
        })
        return
      }
    } catch (error) {
      console.warn('visa: fallback to local', error)
    }
    await this.applyLocalVisa(countryName)
  },

  async applyLocalVisa(countryName) {
    const visaDatabase = {
      刚果金: {
        latestPolicyChange: '2024年起要求提供详细行程和官方认证邀请函。',
        visaItems: this.buildDrcVisaItems()
      },
      '加纳': {
        latestPolicyChange: '2023年底优化电子签系统，缩短审批时间，新增在线支付功能。',
        visaItems: this.buildGhanaVisaItems()
      },
      '坦桑尼亚': {
        latestPolicyChange: '2025年起落地签仅限指定口岸办理，电子签为优先推荐方式。',
        visaItems: this.buildTanzaniaVisaItems()
      },
      '肯尼亚': {
        latestPolicyChange: '电子签证系统24小时开放，申请流程进一步简化。',
        visaItems: this.buildKenyaVisaItems()
      },
      '马达加斯加': {
        latestPolicyChange: '近期政策相对稳定，入境口岸执行以现场要求为准。',
        visaItems: this.buildMadagascarVisaItems()
      },
      '科特迪瓦': {
        latestPolicyChange: '2025年起对中国普通护照旅游实施免费落地签。',
        visaItems: this.buildCoteDivoireVisaItems()
      },
      '赞比亚': {
        latestPolicyChange: '2026年2月起中赞对部分公务/外交护照实施30天互免停留签证。',
        visaItems: this.buildZambiaVisaItems()
      },
      '埃及': {
        latestPolicyChange: '2024年起对中国公民放宽旅游落地签条件，无需提前申请邀请信。',
        visaItems: this.buildEgyptVisaItems()
      },
      '安哥拉': {
        latestPolicyChange: '2023年起要求签证申请人提供生物信息（指纹），安全审查更严格。',
        visaItems: this.buildAngolaVisaItems()
      },
      '尼日利亚': {
        latestPolicyChange: '近期以线上预约+线下采集模式为主，建议至少提前1个月准备。',
        visaItems: this.buildNigeriaVisaItems()
      },
      '南非': {
        latestPolicyChange: '电子签（ETA）范围持续扩展，建议优先使用电子渠道递交。',
        visaItems: this.buildSouthAfricaVisaItems()
      },
      '摩洛哥': {
        latestPolicyChange: '请以使馆最新公告为准，部分申请需增加行程资金说明。',
        visaItems: [
          {
            id: 'ma-tourist',
            visaType: '旅游签证',
            visaMode: '电子签',
            processingTime: '办理时长 7-10个工作日',
            fee: '约220元人民币',
            validityStay: '停留30天',
            materialsText: '护照；照片；申请表；机票与住宿证明；银行流水；在职或在读证明。',
            icon: '🧳'
          }
        ]
      },
      '突尼斯': {
        latestPolicyChange: '旅游政策相对稳定，建议出行前二次确认停留期限。',
        visaItems: [
          {
            id: 'tn-tourist',
            visaType: '旅游签证',
            visaMode: '落地签',
            processingTime: '入境现场审核',
            fee: '以现场为准',
            validityStay: '通常停留30天',
            materialsText: '护照；往返机票；酒店订单；旅行保险；资金证明。',
            icon: '🛬'
          }
        ]
      },
      '南方非洲': {
        latestPolicyChange: '该地区国家签证政策差异大，建议按具体目的国单独核验。',
        visaItems: [
          {
            id: 'saf-note',
            visaType: '区域出行提示',
            visaMode: '暂无统一签证',
            processingTime: '请按目的国查询',
            fee: '--',
            validityStay: '不同国家差异较大',
            materialsText: '请先明确具体国家（如南非、纳米比亚、博茨瓦纳等），再准备对应材料；通常需护照、机票、住宿、资金证明与保险。',
            icon: '🌍'
          }
        ]
      }
    }

    const dataset = visaDatabase[countryName]

    if (!dataset) {
      this.setData({
        countryName,
        countryFlag: this.getCountryFlag(countryName),
        updateDate: '2026-03-22',
        visaItems: [],
        latestPolicyChange: '暂无该国家信息',
        noData: true
      })
      return
    }

    let visaItems = this.normalizeVisaItems(dataset.visaItems).map((item) => this.attachCardKeyInfo(item))
    try {
      visaItems = await decorateBookmarks(visaItems, 'visa')
    } catch (error) {
      console.warn('visa: load bookmarks failed', error)
    }
    this.setData({
      countryName,
      countryFlag: this.getCountryFlag(countryName),
      updateDate: '2026-03-22',
      visaItems,
      latestPolicyChange: dataset.latestPolicyChange,
      noData: false
    })
  },

  async onBookmarkTap(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.visaItems.find((entry) => String(entry.id) === String(id))
    if (!item) return
    try {
      const state = await toggleBookmark('visa', item, {
        title: `${this.data.countryName} · ${item.visaType}`,
        category: '签证指南',
        payload: { visaMode: item.visaMode, processingTime: item.processingTime, fee: item.fee }
      })
      this.setData({
        visaItems: this.data.visaItems.map((entry) => String(entry.id) === String(id) ? { ...entry, ...state } : entry)
      })
      wx.showToast({ title: state.isBookmarked ? '已收藏' : '已取消收藏', icon: 'success' })
    } catch (error) {
      wx.showToast({ title: error.message || '收藏失败', icon: 'none' })
    }
  },

  formatSourceDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '未标注';
    const pad = (number) => String(number).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  },

  onCopySource(e) {
    const url = this.data.sourceUrls[Number(e.currentTarget.dataset.index)];
    if (!url) return;
    wx.setClipboardData({ data: url });
  },

  initNavMetrics() {
    const systemInfo = wx.getSystemInfoSync()
    const statusBarHeight = systemInfo.statusBarHeight || 20
    let navWrapHeight = statusBarHeight + 44
    let capsuleWidth = 96
    let capsuleHeight = 32

    try {
      const capsule = wx.getMenuButtonBoundingClientRect()
      if (capsule && capsule.top) {
        const verticalGap = capsule.top - statusBarHeight
        navWrapHeight = capsule.bottom + verticalGap
        capsuleWidth = capsule.width
        capsuleHeight = capsule.height
      }
    } catch (error) {
      navWrapHeight = statusBarHeight + 44
    }

    this.setData({
      statusBarHeight,
      navWrapHeight,
      capsuleWidth,
      capsuleHeight
    })
  },

  normalizeVisaItems(visaItems) {
    return (visaItems || []).map((item) => {
      if (item.validityPeriod && item.stayPeriod) {
        return item
      }

      const validityStay = String(item.validityStay || '')
      const validityMatch = validityStay.match(/有效期[^，。,；;]*/)
      const stayMatch = validityStay.match(/(单次停留[^，。,；;]*|停留[^，。,；;]*)/)

      return {
        ...item,
        validityPeriod: item.validityPeriod || (validityMatch ? validityMatch[0] : '以使馆签发为准'),
        stayPeriod: item.stayPeriod || (stayMatch ? stayMatch[0] : '以入境批注为准')
      }
    })
  },

  getCommonMaterialsList() {
    return [
      '下载并填写完整签证申请表（蓝/黑色墨水签名），2份申请表附2张2英寸白底护照照片。',
      '护照：有效期超1年（或超6个月且有2页空白页）及复印件。（非中国护照需中国居留签）。',
      '费用：支付不可退款的申请处理费。',
      '资金与行程：过去3个月银行对账单；往返机票与酒店预订单。',
      '邀请函：需刚果金有关部门合法认证。住亲友家需提供注明住址的认证邀请函及邀请人身份证复印件（跨国籍需居留签复印件）。',
      '防疫要求：COVID-19疫苗接种证书副本；48小时PCR检测结果。',
      '特殊人群：未成年人需父母授权书和护照复印件。'
    ]
  },

  getTourBizValidityList() {
    return [
      '1个月单次：有效期90天，停留30天',
      '1个月多次：有效期90天，每次≤30天（累计不超30天）',
      '2个月单次：有效期90天，停留60天',
      '2个月多次：有效期90天，每次≤60天（累计不超60天）',
      '6个月多次：有效期180天，每次≤30天（累计≤90天）'
    ]
  },

  getWorkValidityList() {
    return [
      '使馆贴纸签：1个月单次（停留30天） / 2个月单次（停留60天） / 6个月多次（累计停留90天）'
    ]
  },

  getStudyValidityList() {
    return [
      '依据使馆贴纸签标准审批发放。'
    ]
  },

  getTransitValidityList() {
    return [
      '海空港落地签（紧急）：有效期7天，停留7天',
      '过境签：有效期7天，停留≤7天'
    ]
  },

  buildDrcVisaItems() {
    const commonMaterials = this.getCommonMaterialsList()
    const tourBizValidity = this.getTourBizValidityList()

    return [
      {
        id: 'drc-business',
        visaType: '商务签证',
        visaMode: '电子签',
        processingTime: '10-15个工作日',
        fee: '以使馆为准',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '💼',
        keyInfo: {
          materialsList: commonMaterials,
          validityList: tourBizValidity
        }
      },
      {
        id: 'drc-work',
        visaType: '工作签证',
        visaMode: '贴纸签',
        processingTime: '12-20个工作日',
        fee: '以使馆为准',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🛠️',
        keyInfo: {
          materialsList: commonMaterials,
          validityList: this.getWorkValidityList()
        }
      },
      {
        id: 'drc-tourist',
        visaType: '旅游签证',
        visaMode: '电子签',
        processingTime: '7-12个工作日',
        fee: '以使馆为准',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🧳',
        keyInfo: {
          materialsList: commonMaterials,
          validityList: tourBizValidity
        }
      },
      {
        id: 'drc-study',
        visaType: '留学签证',
        visaMode: '贴纸签',
        processingTime: '15-25个工作日',
        fee: '以使馆为准',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🎓',
        keyInfo: {
          materialsList: commonMaterials,
          extraTip: '注：需额外补充当地学校录取证明。',
          validityList: this.getStudyValidityList()
        }
      },
      {
        id: 'drc-transfer',
        visaType: '转机签证',
        visaMode: '落地签/过境签',
        processingTime: '1-3个工作日（预审）',
        fee: '以口岸/使馆为准',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🛫',
        keyInfo: {
          materialsList: commonMaterials,
          extraTip: '注：需额外确认飞往第三国的联程机票。',
          validityList: this.getTransitValidityList()
        }
      }
    ]
  },

  getGhanaCommonMaterialsList() {
    return [
      '护照：有效期≥6个月，至少2页空白页；提供护照首页清晰扫描件。',
      '证件照：近期白底免冠，35×45mm，无眼镜/饰品，电子版上传。',
      '黄热病疫苗证书（黄皮书）：入境必查，接种后至少10天生效。',
      '往返机票预订单：含姓名、日期、航班号（英文）。',
      '资金证明：近3-6个月银行流水，日均建议≥$100/天（建议余额≥¥5000）。',
      '身份证复印件（纸质签）。'
    ]
  },

  getGhanaTouristValidityList() {
    return [
      '电子签（e-Visa）：有效期90天（签发日起算），停留30天（单次入境，以入境章为准）。',
      '贴纸签：有效期90天，停留30天（最长可批60天，以入境章为准）。'
    ]
  },

  getGhanaBusinessValidityList() {
    return [
      '电子签：有效期90天，停留30天。',
      '贴纸签（单次）：有效期90天，停留30-60天（以入境章为准）。',
      '贴纸签（多次）：有效期6个月/1年，每次停留≤30天。'
    ]
  },

  getGhanaWorkValidityList() {
    return [
      '工作/学生/居留签证：有效期按合同/录取通知书（通常1年起）。',
      '停留期：与签证有效期一致，可在当地申请延期。'
    ]
  },

  getGhanaTransitValidityList() {
    return [
      '过境签证：有效期30天。',
      '停留期：≤48小时（不出关24小时内可免签）。'
    ]
  },

  buildGhanaVisaItems() {
    const commonMaterials = this.getGhanaCommonMaterialsList()

    return [
      {
        id: 'gh-business',
        visaType: '商务签证',
        visaMode: '电子签/贴纸签',
        processingTime: '电子签3-5个工作日，普通签7-10个工作日',
        fee: '约150美元',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '💼',
        keyInfo: {
          materialsList: [
            ...commonMaterials,
            '加纳公司邀请函（英文、公司抬头、盖章，注明停留与费用承担）。',
            '加纳公司营业执照复印件。',
            '中方在职证明+出差证明（英文、签字盖章）。',
            '中方营业执照复印件（盖章）。'
          ],
          validityList: this.getGhanaBusinessValidityList()
        }
      },
      {
        id: 'gh-work',
        visaType: '工作签证',
        visaMode: '电子签/贴纸签',
        processingTime: '电子签3-5个工作日，普通签7-10个工作日',
        fee: '约200美元',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🛠️',
        keyInfo: {
          materialsList: [
            ...commonMaterials,
            '加纳用工单位邀请与担保材料（按使馆要求补充）。',
            '工作许可/雇佣相关证明（按使馆要求提交）。'
          ],
          validityList: this.getGhanaWorkValidityList()
        }
      },
      {
        id: 'gh-tourist',
        visaType: '旅游签证',
        visaMode: '电子签/贴纸签',
        processingTime: '电子签3-5个工作日，普通签7-10个工作日',
        fee: '约150美元',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🧳',
        keyInfo: {
          materialsList: [
            ...commonMaterials,
            '酒店预订单（全程、英文、含姓名）。',
            '行程单（可选，建议提供）。',
            '在职/学生/退休证明（英文，可选但建议）。'
          ],
          validityList: this.getGhanaTouristValidityList()
        }
      },
      {
        id: 'gh-transit',
        visaType: '过境签证',
        visaMode: '电子签/贴纸签',
        processingTime: '电子签3-5个工作日，普通签7-10个工作日',
        fee: '以使馆为准',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🛫',
        keyInfo: {
          materialsList: [
            ...commonMaterials,
            '前往第三国的联程机票与可入境凭证。'
          ],
          validityList: this.getGhanaTransitValidityList()
        }
      },
      {
        id: 'gh-family',
        visaType: '探亲签证',
        visaMode: '电子签/贴纸签',
        processingTime: '电子签3-5个工作日，普通签7-10个工作日',
        fee: '以使馆为准',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '👨‍👩‍👧‍👦',
        keyInfo: {
          materialsList: [
            ...commonMaterials,
            '加纳亲属邀请函（英文、签字、联系方式）。',
            '亲属在加纳的居留/护照复印件。',
            '亲属关系证明（可选）。',
            '住宿证明（亲属住址）。'
          ],
          validityList: this.getGhanaTouristValidityList()
        }
      }
    ]
  },

  getEgyptCommonMaterialsList() {
    return [
      '护照首页扫描件：有效期≥6个月，至少2页空白页。',
      '白底电子证件照：JPG/PNG格式，单张建议≤1MB。',
      '往返机票行程单与全程酒店预订单。',
      '资金证明：近3个月银行流水。',
      '入境时建议携带电子签打印件与护照原件备查。'
    ]
  },

  buildEgyptVisaItems() {
    const commonMaterials = this.getEgyptCommonMaterialsList()

    return [
      {
        id: 'eg-business',
        visaType: '商务签证',
        visaMode: '电子签/贴纸签',
        processingTime: '电子签3-5个工作日，贴纸签7-15个工作日',
        fee: '电子签25-60美元，贴纸签以使馆为准',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '💼',
        keyInfo: {
          materialsList: [
            ...commonMaterials,
            '埃及合作方邀请函（英文，含行程与费用承担说明）。',
            '中方公司派遣函与营业执照复印件（盖章）。'
          ],
          validityList: [
            '电子签单次：有效期90天，停留30天。',
            '电子签多次：有效期180天，每次停留≤30天。',
            '商务贴纸签：有效期90天/180天，停留30-60天（以批注为准）。'
          ]
        }
      },
      {
        id: 'eg-work',
        visaType: '工作签证',
        visaMode: '贴纸签',
        processingTime: '15-30个工作日',
        fee: '以使馆为准',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🛠️',
        keyInfo: {
          materialsList: [
            ...commonMaterials,
            '埃及用工单位邀请及雇佣证明。',
            '当地劳工许可或审批文件（按使馆要求补充）。',
            '学历/无犯罪证明等支持材料（如被要求）。'
          ],
          validityList: [
            '工作签通常按合同期限签发，常见6个月至1年。',
            '停留期与签证批注一致，可在当地申请延期。'
          ]
        }
      },
      {
        id: 'eg-tourist',
        visaType: '旅游签证',
        visaMode: '电子签/落地签',
        processingTime: '电子签3-5个工作日，落地签1-2小时',
        fee: '电子签25美元，落地签30美元',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🧳',
        keyInfo: {
          materialsList: [
            ...commonMaterials,
            '落地签建议准备美元现金，避免现场支付受限。'
          ],
          validityList: [
            '电子签单次：有效期90天，停留30天。',
            '电子签多次：有效期180天，每次停留≤30天。',
            '落地签：有效期90天，停留30天。'
          ]
        }
      },
      {
        id: 'eg-transit',
        visaType: '过境签证',
        visaMode: '落地签/口岸审批',
        processingTime: '以口岸现场审核为准',
        fee: '以口岸公布为准',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🛫',
        keyInfo: {
          materialsList: [
            '护照原件（有效期≥6个月）。',
            '前往第三国联程机票与可入境证明。',
            '必要时提供酒店预订单与资金证明。'
          ],
          validityList: [
            '过境停留通常较短，请以口岸最终批准为准。'
          ]
        }
      },
      {
        id: 'eg-study',
        visaType: '学生签证',
        visaMode: '贴纸签',
        processingTime: '10-20个工作日',
        fee: '以使馆为准',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🎓',
        keyInfo: {
          materialsList: [
            ...commonMaterials,
            '埃及院校录取通知书与学费支付证明。',
            '监护与住宿证明（未成年人/特殊情况）。'
          ],
          validityList: [
            '通常按学期或学年签发，可在当地续签。'
          ]
        }
      }
    ]
  },

  getAngolaCommonMaterialsList() {
    return [
      '护照原件或扫描件：有效期≥6个月，至少2页空白页。',
      '近期白底电子证件照。',
      '黄热病疫苗接种证明（小黄本）。',
      '往返机票行程单与酒店预订单。',
      '资金证明（近3-6个月流水）。'
    ]
  },

  buildAngolaVisaItems() {
    const commonMaterials = this.getAngolaCommonMaterialsList()

    return [
      {
        id: 'ao-business',
        visaType: '商务签证',
        visaMode: '电子签/贴纸签',
        processingTime: '电子签3-7个工作日，贴纸签7-15个工作日',
        fee: '电子签45-90美元，贴纸签以使馆为准',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '💼',
        keyInfo: {
          materialsList: [
            ...commonMaterials,
            '安哥拉邀请函（经认可机构或合作方出具）。',
            '中方派遣函、营业执照复印件。'
          ],
          validityList: [
            '电子签（eVisa）：有效期30天，停留≤30天/次。',
            '商务贴纸签（多次）：有效期180天/1年，每次停留以批注为准。'
          ]
        }
      },
      {
        id: 'ao-work',
        visaType: '工作签证',
        visaMode: '贴纸签',
        processingTime: '15-30个工作日',
        fee: '以使馆为准',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🛠️',
        keyInfo: {
          materialsList: [
            ...commonMaterials,
            '安哥拉用工单位雇佣许可与担保函。',
            '工作合同与无犯罪/体检等附加文件（按要求）。'
          ],
          validityList: [
            '通常按合同期签发，常见6个月至1年，可在当地续办。'
          ]
        }
      },
      {
        id: 'ao-tourist',
        visaType: '旅游签证',
        visaMode: '免签/落地签/电子签',
        processingTime: '免签直接出行，落地签3-5个工作日，电子签3-7个工作日',
        fee: '落地签约120美元，电子签45-90美元',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🧳',
        keyInfo: {
          materialsList: [
            ...commonMaterials,
            '免签入境仍建议携带完整行程与资金证明备查。',
            '落地签需先在 `smevisa.gov.ao` 获批电子批文。'
          ],
          validityList: [
            '免签（普通护照）：1年内多次，单次停留≤30天，年累计≤90天。',
            '落地签：签证有效期15-30天，停留30天，可续签2次（最长90天）。',
            '电子签（eVisa）：有效期30天，停留≤30天/次。'
          ]
        }
      },
      {
        id: 'ao-transit',
        visaType: '过境签证',
        visaMode: '贴纸签/口岸审批',
        processingTime: '3-7个工作日或口岸现场审核',
        fee: '以使馆/口岸公布为准',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🛫',
        keyInfo: {
          materialsList: [
            '护照原件与第三国机票。',
            '必要时提交第三国签证或入境许可。'
          ],
          validityList: [
            '通常为短停留签注，请以批文为准。'
          ]
        }
      },
      {
        id: 'ao-study',
        visaType: '学生签证',
        visaMode: '贴纸签',
        processingTime: '10-20个工作日',
        fee: '以使馆为准',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🎓',
        keyInfo: {
          materialsList: [
            ...commonMaterials,
            '学校录取通知书与在读安排证明。'
          ],
          validityList: [
            '按学制或学期签发，停留期以签注为准。'
          ]
        }
      }
    ]
  },

  buildNigeriaVisaItems() {
    return [
      {
        id: 'ng-tourist',
        visaType: '旅游签证',
        visaMode: '落地签/贴纸签',
        processingTime: '官网申请通常1-2个月',
        fee: '50-100美元',
        validityPeriod: '有效期90天',
        stayPeriod: '停留30天',
        icon: '🧳',
        keyInfo: {
          materialsList: [
            '护照：有效期>6个月，至少2页空白页。',
            '2寸白底证件照（近6个月）。',
            '行程计划与酒店预订单。',
            '银行流水（建议余额>5000元人民币）。'
          ],
          validityList: [
            '常见批注：有效期90天，停留30天。'
          ]
        }
      },
      {
        id: 'ng-business',
        visaType: '商务签证',
        visaMode: '落地签/贴纸签',
        processingTime: '官网申请通常1-2个月',
        fee: '100-150美元',
        validityPeriod: '有效期90天',
        stayPeriod: '停留30天',
        icon: '💼',
        keyInfo: {
          materialsList: [
            '护照：有效期>6个月，至少2页空白页。',
            '尼方公司邀请函（注明访问目的与停留时间）。',
            '中方公司派遣函与营业执照复印件。',
            '机票与住宿订单。'
          ],
          validityList: [
            '常见批注：有效期90天，停留30天。'
          ]
        }
      }
    ]
  },

  buildSouthAfricaVisaItems() {
    return [
      {
        id: 'za-tourist',
        visaType: '旅游签证',
        visaMode: '电子签（ETA）/贴纸签',
        processingTime: '电子签5-10个工作日，贴纸签10-30天',
        fee: '约425南非兰特（约25美元）起',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🧳',
        keyInfo: {
          materialsList: [
            '护照：离境后仍有至少30天有效期，至少2页空白页。',
            '证件照、住宿证明、返程机票。',
            '财务证明：建议每人至少300美元或5000兰特。'
          ],
          validityList: [
            '需签证人群的停留期以批文为准，可申请延期。',
            '部分免签国家可停留90天（供参考）。'
          ]
        }
      },
      {
        id: 'za-business',
        visaType: '商务签证',
        visaMode: '电子签（ETA）/贴纸签',
        processingTime: '电子签5-10个工作日，贴纸签10-30天',
        fee: '约425南非兰特起（按类型浮动）',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '💼',
        keyInfo: {
          materialsList: [
            '护照：离境后仍有至少30天有效期，至少2页空白页。',
            '南非邀请函与商务往来证明。',
            '中方派遣函、公司资质文件。',
            '机票、住宿及资金证明。'
          ],
          validityList: [
            '停留期通常以批文为准，必要时可申请延期。'
          ]
        }
      }
    ]
  },

  buildMadagascarVisaItems() {
    return [
      {
        id: 'mg-arrival',
        visaType: '旅游落地签',
        visaMode: '落地签',
        processingTime: '7-10个工作日（建议行前准备）',
        fee: '30天：37美元；60天：45美元',
        validityPeriod: '详见下方关键信息',
        stayPeriod: '详见下方关键信息',
        icon: '🧳',
        keyInfo: {
          materialsList: [
            '护照：有效期>6个月。',
            '酒店订单或旅行社行程单。',
            '往返机票。',
            '黄热病疫苗接种证书（来自疫区时需提供）。'
          ],
          validityList: [
            '可申请停留30天或60天。',
            '可在当地公安/移民机构申请延期，最长约90天。'
          ]
        }
      }
    ]
  },

  buildTanzaniaVisaItems() {
    return [
      {
        id: 'tz-tourist',
        visaType: '旅游签证',
        visaMode: '电子签/指定口岸落地签',
        processingTime: '电子签3-5个工作日，加急1-2天',
        fee: '50美元',
        validityPeriod: '有效期3个月',
        stayPeriod: '单次停留30天（通常不可延期）',
        icon: '🧳',
        keyInfo: {
          materialsList: [
            '护照（有效期≥6个月，至少1页空白页）。',
            '白底证件照。',
            '往返机票。',
            '酒店预订或邀请函。',
            '黄热病疫苗接种证书。'
          ],
          validityList: [
            '旅游签：有效期3个月，单次停留30天。'
          ]
        }
      },
      {
        id: 'tz-business',
        visaType: '商务签证',
        visaMode: '电子签/使馆贴纸签',
        processingTime: '电子签3-5个工作日，贴纸签约5个工作日',
        fee: '250美元',
        validityPeriod: '有效期通常3个月',
        stayPeriod: '停留期以批注为准',
        icon: '💼',
        keyInfo: {
          materialsList: [
            '护照与白底证件照。',
            '坦方公司邀请函与公司资质文件。',
            '中方派遣函。',
            '机票与住宿证明。',
            '黄热病疫苗接种证书。'
          ],
          validityList: [
            '商务签：有效期与停留期以签注/批文为准。'
          ]
        }
      },
      {
        id: 'tz-family',
        visaType: '探亲签证',
        visaMode: '电子签/贴纸签',
        processingTime: '3-7个工作日',
        fee: '以使馆为准',
        validityPeriod: '通常3个月',
        stayPeriod: '以签注为准',
        icon: '👨‍👩‍👧‍👦',
        keyInfo: {
          materialsList: [
            '护照与证件照。',
            '坦方亲属邀请函与身份证明。',
            '行程、机票与住宿证明。',
            '黄热病疫苗接种证书。'
          ],
          validityList: [
            '停留期按批注执行，必要时可申请延期。'
          ]
        }
      },
      {
        id: 'tz-work',
        visaType: '工作签证',
        visaMode: '贴纸签',
        processingTime: '约5-10个工作日',
        fee: '约200美元/年',
        validityPeriod: '按雇佣期限签发',
        stayPeriod: '以批注为准',
        icon: '🛠️',
        keyInfo: {
          materialsList: [
            '护照与证件照。',
            '雇佣合同、工作许可相关文件。',
            '坦方公司担保文件。',
            '黄热病疫苗接种证书。'
          ],
          validityList: [
            '工作签按许可周期签发，通常可续签。'
          ]
        }
      },
      {
        id: 'tz-east-africa',
        visaType: '东非三国旅游签',
        visaMode: '电子签',
        processingTime: '3-5个工作日',
        fee: '100美元',
        validityPeriod: '以签注为准',
        stayPeriod: '以签注为准',
        icon: '🌍',
        keyInfo: {
          materialsList: [
            '护照、照片、机票与住宿订单。',
            '行程证明与黄热病疫苗接种证书。'
          ],
          validityList: [
            '适用于东非联游，具体停留规则按签注执行。'
          ]
        }
      }
    ]
  },

  buildKenyaVisaItems() {
    return [
      {
        id: 'ke-tourist',
        visaType: '旅游签证',
        visaMode: '电子签（eTA）',
        processingTime: '标准3个工作日（多数2-3天）',
        fee: '约51美元（约190元人民币）',
        validityPeriod: '有效期3个月',
        stayPeriod: '单次停留30天，可申请延期至90天',
        icon: '🧳',
        keyInfo: {
          materialsList: [
            '护照（有效期≥6个月，至少2页空白页）。',
            '白底证件照。',
            '往返机票与酒店订单。',
            '资金证明。',
            '打印版eTA批准信。'
          ],
          validityList: [
            '旅游签：有效期3个月，单次停留30天，可申请延长。'
          ]
        }
      },
      {
        id: 'ke-business',
        visaType: '商务签证',
        visaMode: '电子签（eTA）',
        processingTime: '标准3个工作日（旺季可能延长）',
        fee: '约51美元',
        validityPeriod: '有效期3个月',
        stayPeriod: '单次停留30天，可申请延期至90天',
        icon: '💼',
        keyInfo: {
          materialsList: [
            '护照与白底证件照。',
            '肯方邀请函。',
            '中方派遣函。',
            '机票、住宿与资金证明。',
            '打印版eTA批准信。'
          ],
          validityList: [
            '商务签：有效期3个月，停留30天，延期按当地审批。'
          ]
        }
      },
      {
        id: 'ke-transit',
        visaType: '过境签证',
        visaMode: '电子签（eTA）',
        processingTime: '1-3个工作日',
        fee: '约21美元（约80元人民币）',
        validityPeriod: '以签注为准',
        stayPeriod: '短期过境停留',
        icon: '🛫',
        keyInfo: {
          materialsList: [
            '护照原件。',
            '前往第三国机票与入境凭证。',
            '打印版eTA批准信。'
          ],
          validityList: [
            '过境停留时间以签注和口岸审核为准。'
          ]
        }
      },
      {
        id: 'ke-work',
        visaType: '工作签证',
        visaMode: '工作许可+签证',
        processingTime: '以审批流程为准（通常较长）',
        fee: '按签证等级收费',
        validityPeriod: '按工作许可核发',
        stayPeriod: '按许可批注执行',
        icon: '🛠️',
        keyInfo: {
          materialsList: [
            '护照与照片。',
            '雇佣合同与公司资质。',
            '工作许可申请材料。'
          ],
          validityList: [
            '工作签有效期与停留期按许可等级执行。'
          ]
        }
      }
    ]
  },

  buildCoteDivoireVisaItems() {
    return [
      {
        id: 'ci-tourist-arrival',
        visaType: '旅游落地签',
        visaMode: '电子预批+机场贴签',
        processingTime: '电子预批约72小时，机场贴签约30分钟',
        fee: '旅游落地签免费（按最新政策）',
        validityPeriod: '有效期30天',
        stayPeriod: '停留30天',
        icon: '🧳',
        keyInfo: {
          materialsList: [
            '护照（有效期≥6个月）。',
            '返程机票。',
            '完成电子签官网预申请并获取许可。',
            '黄热病疫苗证书。'
          ],
          validityList: [
            '需先获电子许可后方可在阿比让机场办理贴签。',
            '不可无申请直接到场办理。'
          ]
        }
      },
      {
        id: 'ci-business',
        visaType: '商务签证',
        visaMode: '电子签/贴纸签',
        processingTime: '电子签约72小时，贴纸签5-10个工作日',
        fee: '电子签约73欧元，贴纸签约58欧元',
        validityPeriod: '以申请批复时长为准',
        stayPeriod: '以签注为准',
        icon: '💼',
        keyInfo: {
          materialsList: [
            '护照与证件照。',
            '公司注册证明与商务邀请函。',
            '中方派遣函、机票与住宿订单。',
            '黄热病疫苗证书。'
          ],
          validityList: [
            '商务签有效期与停留期按申请批复执行。'
          ]
        }
      },
      {
        id: 'ci-work',
        visaType: '工作签证',
        visaMode: '贴纸签',
        processingTime: '7-15个工作日（视审批）',
        fee: '按使馆与许可类别收取',
        validityPeriod: '按雇佣许可签发',
        stayPeriod: '按批注执行',
        icon: '🛠️',
        keyInfo: {
          materialsList: [
            '护照、照片、雇佣合同。',
            '科方用工单位资质与担保材料。',
            '黄热病疫苗证书。'
          ],
          validityList: [
            '工作签有效期通常与工作许可期限一致。'
          ]
        }
      }
    ]
  },

  buildZambiaVisaItems() {
    return [
      {
        id: 'zm-tourist-free',
        visaType: '旅游免签',
        visaMode: '免签入境',
        processingTime: '0天（入境即办）',
        fee: '免费',
        validityPeriod: '以入境章为准',
        stayPeriod: '停留90天',
        icon: '🧳',
        keyInfo: {
          materialsList: [
            '护照原件。',
            '返程机票或后续行程证明。',
            '必要时提供资金证明与住宿信息。',
            '黄热病疫苗证书。'
          ],
          validityList: [
            '普通护照旅游可免签停留90天。'
          ]
        }
      },
      {
        id: 'zm-business-free',
        visaType: '商务免签',
        visaMode: '免签入境',
        processingTime: '0天（入境即办）',
        fee: '免费',
        validityPeriod: '以入境章为准',
        stayPeriod: '停留30天',
        icon: '💼',
        keyInfo: {
          materialsList: [
            '护照原件。',
            '商务邀请函或商务往来证明。',
            '返程机票与住宿信息。',
            '黄热病疫苗证书。'
          ],
          validityList: [
            '普通护照商务可免签停留30天。'
          ]
        }
      },
      {
        id: 'zm-business-visa',
        visaType: '商务签证',
        visaMode: '电子签/口岸签',
        processingTime: '电子签3-6个工作日，加急1-2天',
        fee: '单次25美元，多次40美元',
        validityPeriod: '以签注为准',
        stayPeriod: '以签注为准',
        icon: '📄',
        keyInfo: {
          materialsList: [
            '护照与照片。',
            '商务邀请函与行程证明。',
            '机票、住宿与资金证明。'
          ],
          validityList: [
            '商务签按签注执行，单次/多次类型不同。'
          ]
        }
      },
      {
        id: 'zm-work',
        visaType: '工作签证',
        visaMode: '贴纸签/工作许可',
        processingTime: '按审批流程办理',
        fee: '申请费约250元人民币（约500克瓦查）',
        validityPeriod: '有效期1-2年',
        stayPeriod: '按许可批注执行',
        icon: '🛠️',
        keyInfo: {
          materialsList: [
            '护照、照片。',
            '无犯罪公证、学历认证。',
            '雇主担保与健康证明。',
            '黄热病疫苗证书。'
          ],
          validityList: [
            '工作签常见有效期1-2年，需配套工作许可。'
          ]
        }
      }
    ]
  },

  attachCardKeyInfo(item) {
    if (item.keyInfo) {
      return item
    }

    const materialsList = String(item.materialsText || '')
      .split(/[；;。\n\r]/)
      .map((text) => text.trim())
      .filter(Boolean)

    const validityList = [
      `${item.validityPeriod || '以使馆签发为准'}，${item.stayPeriod || '以入境批注为准'}`
    ]

    return {
      ...item,
      keyInfo: {
        materialsList,
        validityList
      }
    }
  },

  normalizeCountryName(countryName) {
    const rawName = String(countryName || '').trim()
    const normalized = rawName.replace(/[()（）\s]/g, '')
    if (normalized === '刚果金' || normalized === '刚果') {
      return '刚果金'
    }
    if (normalized === '刚果布') {
      return '刚果(布)'
    }
    return rawName
  },

  getCountryFlag(countryName) {
    const flagMap = {
      '刚果金': '🇨🇩',
      '刚果(金)': '🇨🇩',
      '加纳': '🇬🇭',
      '埃及': '🇪🇬',
      '安哥拉': '🇦🇴',
      '尼日利亚': '🇳🇬',
      '南非': '🇿🇦',
      '马达加斯加': '🇲🇬',
      '肯尼亚': '🇰🇪',
      '坦桑尼亚': '🇹🇿',
      '科特迪瓦': '🇨🇮',
      '赞比亚': '🇿🇲',
      '乌干达': '🇺🇬',
      '几内亚': '🇬🇳',
      '刚果(布)': '🇨🇬',
      '刚果布': '🇨🇬',
      '利比里亚': '🇱🇷',
      '埃塞俄比亚': '🇪🇹',
      '塞内加尔': '🇸🇳',
      '津巴布韦': '🇿🇼',
      '摩洛哥': '🇲🇦',
      '莫桑比克': '🇲🇿',
      '阿尔及利亚': '🇩🇿',
      '突尼斯': '🇹🇳',
      '南方非洲': '🌍'
    }
    return flagMap[countryName] || '🌍'
  },

  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.redirectTo({
          url: '/pages/home/home'
        })
      }
    })
  },

  toggleVisaExpand(e) {
    const { id } = e.currentTarget.dataset
    const expandedVisaId = this.data.expandedVisaId === id ? '' : id

    this.setData({
      expandedVisaId
    })
  }
})
