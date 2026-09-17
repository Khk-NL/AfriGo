import { ICON_IMAGES } from '../config/icons.js';

const LANGUAGE_STORAGE_KEY = 'appLanguage';
const SUPPORTED_LANGUAGES = ['zh', 'en', 'fr'];

const COUNTRY_NAMES = {
  '刚果(金)': { zh: '刚果(金)', en: 'DR Congo', fr: 'RDC' },
  '加纳': { zh: '加纳', en: 'Ghana', fr: 'Ghana' },
  '埃及': { zh: '埃及', en: 'Egypt', fr: 'Égypte' },
  '安哥拉': { zh: '安哥拉', en: 'Angola', fr: 'Angola' },
  '尼日利亚': { zh: '尼日利亚', en: 'Nigeria', fr: 'Nigéria' },
  '南非': { zh: '南非', en: 'South Africa', fr: 'Afrique du Sud' },
  '马达加斯加': { zh: '马达加斯加', en: 'Madagascar', fr: 'Madagascar' },
  '坦桑尼亚': { zh: '坦桑尼亚', en: 'Tanzania', fr: 'Tanzanie' },
  '肯尼亚': { zh: '肯尼亚', en: 'Kenya', fr: 'Kenya' },
  '科特迪瓦': { zh: '科特迪瓦', en: 'Côte d’Ivoire', fr: 'Côte d’Ivoire' },
  '赞比亚': { zh: '赞比亚', en: 'Zambia', fr: 'Zambie' },
  '乌干达': { zh: '乌干达', en: 'Uganda', fr: 'Ouganda' },
  '几内亚': { zh: '几内亚', en: 'Guinea', fr: 'Guinée' },
  '刚果(布)': { zh: '刚果(布)', en: 'Congo', fr: 'Congo' },
  '利比里亚': { zh: '利比里亚', en: 'Liberia', fr: 'Libéria' },
  '埃塞俄比亚': { zh: '埃塞俄比亚', en: 'Ethiopia', fr: 'Éthiopie' },
  '塞内加尔': { zh: '塞内加尔', en: 'Senegal', fr: 'Sénégal' },
  '津巴布韦': { zh: '津巴布韦', en: 'Zimbabwe', fr: 'Zimbabwe' },
  '摩洛哥': { zh: '摩洛哥', en: 'Morocco', fr: 'Maroc' },
  '莫桑比克': { zh: '莫桑比克', en: 'Mozambique', fr: 'Mozambique' },
  '阿尔及利亚': { zh: '阿尔及利亚', en: 'Algeria', fr: 'Algérie' }
};

const FEATURE_KEYS = [
  { key: 'visa', icon: '🛂', label: { zh: '签证指南', en: 'Visa Guide', fr: 'Visa' } },
  { key: 'health', icon: '🏥', label: { zh: '防疫健康', en: 'Health & Safety', fr: 'Santé et prévention' } },
  { key: 'customs', icon: '🤝', label: { zh: '当地风俗', en: 'Local Customs', fr: 'Coutumes locales' } },
  { key: 'local-info', icon: '📰', label: { zh: '本地资讯', en: 'Local Info', fr: 'Infos locales' } },
  { key: 'recommend', icon: '🧭', label: { zh: '出行推荐', en: 'Travel Picks', fr: 'Recommandations' } },
  { key: 'labor', icon: '⚖️', label: { zh: '劳务合规', en: 'Work Compliance', fr: 'Conformité travail' } },
  { key: 'phrases', icon: '💬', label: { zh: '实用词句', en: 'Useful Phrases', fr: 'Phrases utiles' } },
  { key: 'attractions', icon: '🏞️', label: { zh: '景点攻略', en: 'Attractions', fr: 'Lieux à visiter' } }
];

const TABS = {
  zh: { home: '首页', community: '社区', publish: '发布', message: '消息', profile: '个人中心' },
  en: { home: 'Home', community: 'Community', publish: 'Publish', message: 'Messages', profile: 'Profile' },
  fr: { home: 'Accueil', community: 'Communauté', publish: 'Publier', message: 'Messages', profile: 'Profil' }
};

const INDEX_TEXT = {
  zh: {
    mainTitle: '开启你的中非安全之旅',
    cta: '开启您期待的非洲之旅',
    brandMotto: '真境 · 中非安全指南',
    brandName: '非常行',
    sheetTitle: '选择您的目的地',
    sheetSubtitle: 'Select Your Destination',
    searchPlaceholder: '搜索非洲国家... / Search African countries...',
    confirmSelection: '确认选择',
    authTitle: '登录与身份',
    authSubtitle: '请在欢迎页完成微信登录，个人中心仅展示状态和退出入口。',
    loginButton: '微信一键登录',
    logoutButton: '退出登录',
    loginStatus: '已登录',
    guestStatus: '当前未登录',
    adminBadge: '管理员'
  },
  en: {
    mainTitle: 'Start Your Safe Journey',
    cta: 'Begin Your Dream African Journey',
    brandMotto: 'Authentic · Safety Guide',
    brandName: 'Very Travel',
    sheetTitle: 'Select Your Destination',
    sheetSubtitle: 'Choose your African destination',
    searchPlaceholder: 'Search African countries...',
    confirmSelection: 'Confirm Selection',
    authTitle: 'Login & identity',
    authSubtitle: 'Complete WeChat login on the welcome page. The profile page only shows status and sign-out.',
    loginButton: 'Login with WeChat',
    logoutButton: 'Sign out',
    loginStatus: 'Logged in',
    guestStatus: 'Not logged in yet',
    adminBadge: 'Admin'
  },
  fr: {
    mainTitle: 'Commencez votre voyage en toute sécurité',
    cta: 'Commencez le voyage africain que vous attendez',
    brandMotto: 'Authentique · Guide de sécurité',
    brandName: 'Voyage Serein',
    sheetTitle: 'Choisissez votre destination',
    sheetSubtitle: 'Sélectionnez un pays africain',
    searchPlaceholder: 'Rechercher des pays africains...',
    confirmSelection: 'Confirmer',
    authTitle: 'Connexion et identité',
    authSubtitle: 'Effectuez la connexion WeChat sur la page d’accueil. Le profil n’affiche que l’état et la déconnexion.',
    loginButton: 'Connexion WeChat',
    logoutButton: 'Se déconnecter',
    loginStatus: 'Connecté',
    guestStatus: 'Pas encore connecté',
    adminBadge: 'Admin'
  }
};

const HOME_TEXT = {
  zh: {
    welcomePrefix: '欢迎来到',
    welcomeFallbackSubtitle: '签证与出行',
    tooltip: '您可以尝试问我“签证”或“大使馆”',
    safetyTitle: '旅行安全出行',
    safetyMore: '更多 >',
    safetyLevel: '安全等级：中等风险',
    safetyText: '外交部预警：请遵守当地法律法规，避免夜间单独出行',
    safetyDate: '最近更新：2026年3月3日',
    featureTitle: '功能专标',
    embassyLabel: '致电大使馆',
    hotlineLabel: '紧急电话',
    embassySubLabel: 'Call Embassy',
    hotlineSubLabel: 'Emergency Numbers',
    tabLabels: TABS.zh
  },
  en: {
    welcomePrefix: 'Welcome to',
    welcomeFallbackSubtitle: 'Visas & Travel',
    tooltip: 'Try asking me about “visas” or the “embassy”',
    safetyTitle: 'Travel Safety',
    safetyMore: 'More >',
    safetyLevel: 'Risk level: Moderate',
    safetyText: 'Foreign affairs alert: follow local laws and avoid traveling alone at night.',
    safetyDate: 'Updated: Mar 3, 2026',
    featureTitle: 'Key Services',
    embassyLabel: 'Call Embassy',
    hotlineLabel: 'Emergency Numbers',
    embassySubLabel: 'Embassy',
    hotlineSubLabel: 'Hotline',
    tabLabels: TABS.en
  },
  fr: {
    welcomePrefix: 'Bienvenue à',
    welcomeFallbackSubtitle: 'Visa et transport',
    tooltip: 'Vous pouvez me demander “visa” ou “ambassade”',
    safetyTitle: 'Sécurité du voyage',
    safetyMore: 'Plus >',
    safetyLevel: 'Niveau de risque : modéré',
    safetyText: 'Alerte diplomatique : respectez les lois locales et évitez de sortir seul la nuit.',
    safetyDate: 'Mise à jour : 3 mars 2026',
    featureTitle: 'Services clés',
    embassyLabel: 'Appeler l’ambassade',
    hotlineLabel: 'Numéros d’urgence',
    embassySubLabel: 'Ambassade',
    hotlineSubLabel: 'Urgence',
    tabLabels: TABS.fr
  }
};

const PROFILE_TEXT = {
  zh: {
    heroBadge: 'Traveler Portfolio',
    memberSince: '注册于',
    guestName: '开启你的专属档案',
    guestSubcopy: '登录后可同步收藏夹、目的地与常用提醒，把出行信息收成一页。',
    loginButton: '微信一键登录',
    loggedInStatus: '已同步微信身份',
    heroSubcopy: '安全同行账户',
    quickTitle: '高频入口',
    quickSubtitle: '把最常用的四个动作收进这张旅途仪表盘',
    journeyTitle: '旅途画像',
    journeySubtitle: '保持页面气质统一，但信息表达更像一张随身卡片',
    serviceTitle: '服务总览',
    serviceSubtitle: '把签证、安全、资讯和设置串在一页里，不必来回找入口',
    bookmarkTitle: '收藏清单',
    bookmarkSubtitle: '以后你在各页标记的重点内容，都可以回到这里统一回看',
    bookmarkEmptyTitle: '收藏夹还没有内容',
    bookmarkEmptyDesc: '去签证、词句或出行推荐页标记内容后，这里会自动归档。',
    journeyBadgePrefix: '驻留档案',
    focusPrefix: '重点：',
    riskPrefix: '风险：',
    safetyScore: '安全评分',
    statusReady: '已激活',
    statusPending: '待登录',
    bookmarkCountSuffix: '条',
    logout: '退出当前账号',
    supportTitle: '收尾动作',
    supportSubtitle: '把应急入口和身份管理放在页面底部，逻辑更清晰',
    supportSecurityTitle: '安全中心',
    supportSecurityDesc: '应急提醒',
    supportLocalInfoTitle: '本地资讯',
    supportLocalInfoDesc: '城市速览',
    loggedInNote: '你的微信身份、收藏夹和旅途服务都已经汇总到这张随身面板里。',
    guestStatus: '当前未登录，请前往欢迎页完成微信登录。',
    adminEntrance: '管理员入口',
    adminEntranceDesc: '仅管理员可进入增删改后台。',
    quickActions: {
      visa: { label: '证件材料', meta: '签证与清单' },
      security: { label: '安全助手', meta: '预警与应急' },
      bookmarks: { label: '我的收藏', meta: '{count} 条归档' },
      message: { label: '消息中心', meta: '系统提醒' }
    },
    serviceEntries: {
      localInfo: { title: '本地资讯摘要', subtitle: '查看{country}的生活线索与城市节奏' },
      visa: { title: '签证材料清单', subtitle: '出发前最后核对一遍高频证件事项' },
      security: { title: '安全出行提醒', subtitle: '同步最新风险等级与夜间出行建议' },
      recommend: { title: '本地推荐路线', subtitle: '把住宿、交通和补给点排进同一条路线' },
      phrases: { title: '常用沟通词句', subtitle: '紧急场景、问路和支付对话都能快速找到' },
      settings: { title: '偏好与设置', subtitle: '管理界面语言、应用内提醒和账号数据' }
    }
  },
  en: {
    heroBadge: 'Traveler Portfolio',
    memberSince: 'Member since',
    guestName: 'Open your personal profile',
    guestSubcopy: 'Sign in to sync bookmarks, destinations, and reminders into one neat travel card.',
    loginButton: 'Sign in with WeChat',
    loggedInStatus: 'WeChat identity synced',
    heroSubcopy: 'Safety travel account',
    quickTitle: 'Quick Access',
    quickSubtitle: 'Keep the four most used actions in one travel dashboard',
    journeyTitle: 'Journey Snapshot',
    journeySubtitle: 'Keep the visual tone unified while the content feels like a portable card',
    serviceTitle: 'Service Overview',
    serviceSubtitle: 'Connect visa, safety, info, and settings without hunting for entry points',
    bookmarkTitle: 'Bookmarks',
    bookmarkSubtitle: 'Everything you save in other pages will be collected here for review later.',
    bookmarkEmptyTitle: 'No bookmarks yet',
    bookmarkEmptyDesc: 'Save items in visa, phrases, or travel pages and they will appear here automatically.',
    journeyBadgePrefix: 'Stay record',
    focusPrefix: 'Focus: ',
    riskPrefix: 'Risk: ',
    safetyScore: 'Safety score',
    statusReady: 'Active',
    statusPending: 'Pending sign-in',
    bookmarkCountSuffix: 'items',
    logout: 'Sign out',
    supportTitle: 'Final actions',
    supportSubtitle: 'Place emergency and account controls at the bottom for a cleaner layout',
    supportSecurityTitle: 'Safety Center',
    supportSecurityDesc: 'Alerts',
    supportLocalInfoTitle: 'Local Info',
    supportLocalInfoDesc: 'City snapshot',
    loggedInNote: 'Your WeChat identity, bookmarks, and travel services are all gathered into this portable panel.',
    guestStatus: 'You are not signed in yet. Please log in from the welcome page.',
    adminEntrance: 'Admin portal',
    adminEntranceDesc: 'Only admins can enter the create / update / delete console.',
    quickActions: {
      visa: { label: 'Documents', meta: 'Visa & checklist' },
      security: { label: 'Safety Helper', meta: 'Alerts & emergency' },
      bookmarks: { label: 'Bookmarks', meta: '{count} saved' },
      message: { label: 'Messages', meta: 'System alerts' }
    },
    serviceEntries: {
      localInfo: { title: 'Local info digest', subtitle: 'See daily life hints and city rhythm in {country}' },
      visa: { title: 'Visa checklist', subtitle: 'Recheck the most important travel documents before departure' },
      security: { title: 'Safety reminders', subtitle: 'Sync the latest risk level and night-travel advice' },
      recommend: { title: 'Recommended routes', subtitle: 'Arrange accommodation, transport, and supply stops into one route' },
      phrases: { title: 'Useful phrases', subtitle: 'Find emergency, navigation, and payment lines quickly' },
      settings: { title: 'Preferences & settings', subtitle: 'Manage language, in-app reminders, and account data' }
    }
  },
  fr: {
    heroBadge: 'Portfolio voyageur',
    memberSince: 'Membre depuis',
    guestName: 'Ouvrez votre profil personnel',
    guestSubcopy: 'Connectez-vous pour synchroniser favoris, destinations et rappels dans une carte de voyage.',
    loginButton: 'Connexion WeChat',
    loggedInStatus: 'Identité WeChat synchronisée',
    heroSubcopy: 'Compte de voyage sécurisé',
    quickTitle: 'Accès rapide',
    quickSubtitle: 'Regroupez les quatre actions les plus utiles dans un seul tableau de bord',
    journeyTitle: 'Aperçu du voyage',
    journeySubtitle: 'Conservez une harmonie visuelle tout en gardant une lecture façon carte de poche',
    serviceTitle: 'Aperçu des services',
    serviceSubtitle: 'Reliez visa, sécurité, infos et réglages sans chercher les entrées',
    bookmarkTitle: 'Favoris',
    bookmarkSubtitle: 'Tout ce que vous enregistrez ailleurs sera réuni ici pour consultation.',
    bookmarkEmptyTitle: 'Aucun favori',
    bookmarkEmptyDesc: 'Enregistrez des éléments dans visa, phrases ou itinéraires et ils apparaîtront ici automatiquement.',
    journeyBadgePrefix: 'Dossier de séjour',
    focusPrefix: 'Priorité : ',
    riskPrefix: 'Risque : ',
    safetyScore: 'Score de sécurité',
    statusReady: 'Actif',
    statusPending: 'Connexion requise',
    bookmarkCountSuffix: 'éléments',
    logout: 'Se déconnecter',
    supportTitle: 'Actions finales',
    supportSubtitle: 'Placez l’urgence et la gestion du compte en bas pour plus de clarté',
    supportSecurityTitle: 'Centre de sécurité',
    supportSecurityDesc: 'Alertes',
    supportLocalInfoTitle: 'Infos locales',
    supportLocalInfoDesc: 'Aperçu urbain',
    loggedInNote: 'Votre identité WeChat, vos favoris et vos services de voyage sont regroupés dans ce panneau portable.',
    guestStatus: 'Vous n’êtes pas encore connecté. Veuillez vous connecter depuis la page d’accueil.',
    adminEntrance: 'Accès administrateur',
    adminEntranceDesc: 'Seuls les administrateurs peuvent ouvrir la console de création / modification / suppression.',
    quickActions: {
      visa: { label: 'Documents', meta: 'Visa et liste' },
      security: { label: 'Assistant sécurité', meta: 'Alertes et urgence' },
      bookmarks: { label: 'Favoris', meta: '{count} enregistrés' },
      message: { label: 'Messages', meta: 'Alertes système' }
    },
    serviceEntries: {
      localInfo: { title: 'Résumé local', subtitle: 'Voir les repères du quotidien et le rythme urbain de {country}' },
      visa: { title: 'Checklist visa', subtitle: 'Vérifiez une dernière fois les documents essentiels avant le départ' },
      security: { title: 'Conseils de sécurité', subtitle: 'Synchronisez le niveau de risque et les conseils de déplacement nocturne' },
      recommend: { title: 'Itinéraires recommandés', subtitle: 'Regroupez hébergement, transport et ravitaillement sur un même trajet' },
      phrases: { title: 'Phrases utiles', subtitle: 'Trouvez rapidement les formules d’urgence, de route et de paiement' },
      settings: { title: 'Préférences & réglages', subtitle: 'Gérez la langue, les rappels intégrés et les données du compte' }
    }
  }
};

const COMMUNITY_TEXT = {
  zh: {
    eyebrow: 'Community Feed',
    heroTitle: '你好，{country}',
    subtitle: '柔光旅行社区流',
    description: '承接首页的清晨感，把旅途故事安放在更轻、更高级的社区流里。',
    journeyNote: '从首页的晨光，缓缓过渡到发布页的暖色',
    avatarShellTitle: '旅人头像',
    avatarShellMeta: 'soft online glow',
    composeButton: '发布',
    actionTexts: { comment: '评论', save: '收藏', share: '分享' },
    stats: [
      { value: '24.8K', label: '精选动态' },
      { value: '5.6K', label: '旅人收藏' },
      { value: '912', label: '灵感路线' }
    ],
    featuredPost: {
      author: 'Amani Studio',
      role: '柔光旅行编录',
      time: '3 分钟阅读',
      title: '柔和日照落进非洲河岸，风景与故事都慢了下来',
      body: '把首页的晨雾与发布页的暖光接在一起，社区页就像一层会呼吸的轻雾背景。前景只保留干净的亚克力白卡片，让故事、照片和旅行线索以更从容的节奏被看见。',
      location: 'African river bend',
      light: '柔光笔记',
      likesText: '12.8K',
      baseLikesText: '12.8K',
      likedLikesText: '12.9K',
      commentsText: '286',
      savesText: '1.4K',
      isLiked: false
    }
  },
  en: {
    eyebrow: 'Community Feed',
    heroTitle: 'Hello, {country}',
    subtitle: 'Soft-blend travel community',
    description: 'Carry the morning feel from the home page into a lighter, more refined community feed.',
    journeyNote: 'From the mint glow on Home to the warmer tone on Publish',
    avatarShellTitle: 'Travelers',
    avatarShellMeta: 'soft online glow',
    composeButton: 'Compose',
    actionTexts: { comment: 'Comment', save: 'Save', share: 'Share' },
    stats: [
      { value: '24.8K', label: 'Featured posts' },
      { value: '5.6K', label: 'Saved by travelers' },
      { value: '912', label: 'Route ideas' }
    ],
    featuredPost: {
      author: 'Amani Studio',
      role: 'Soft-light travel log',
      time: '3 min read',
      title: 'Gentle sunlight reaches the riverbank and slows both scenery and stories',
      body: 'Blend the mint morning from Home with the warm light on Publish, and the community page becomes a breathing layer of mist. The foreground keeps only clean acrylic cards so stories, photos, and travel notes feel calm and elevated.',
      location: 'African river bend',
      light: 'Soft light note',
      likesText: '12.8K',
      baseLikesText: '12.8K',
      likedLikesText: '12.9K',
      commentsText: '286',
      savesText: '1.4K',
      isLiked: false
    }
  },
  fr: {
    eyebrow: 'Fil communautaire',
    heroTitle: 'Bonjour, {country}',
    subtitle: 'Communauté voyage en lumière douce',
    description: 'Prolongez l’ambiance du matin depuis l’accueil vers un fil communautaire plus léger et élégant.',
    journeyNote: 'De la lumière menthe de l’accueil à la chaleur de la publication',
    avatarShellTitle: 'Portraits de voyageurs',
    avatarShellMeta: 'soft online glow',
    composeButton: 'Publier',
    actionTexts: { comment: 'Commenter', save: 'Enregistrer', share: 'Partager' },
    stats: [
      { value: '24.8K', label: 'Publications' },
      { value: '5.6K', label: 'Favoris voyageurs' },
      { value: '912', label: 'Idées d’itinéraires' }
    ],
    featuredPost: {
      author: 'Amani Studio',
      role: 'Journal de voyage en lumière douce',
      time: '3 min de lecture',
      title: 'Un soleil doux tombe sur la rive africaine et ralentit paysages comme récits',
      body: 'En reliant la brume menthe de l’accueil à la lumière chaude de la publication, la page communautaire devient une couche de brume légère qui respire. Le premier plan ne garde que des cartes en acrylique propres afin que récits, photos et repères de voyage soient perçus avec calme.',
      location: 'Courbe d’un fleuve africain',
      light: 'Note de lumière douce',
      likesText: '12.8K',
      baseLikesText: '12.8K',
      likedLikesText: '12.9K',
      commentsText: '286',
      savesText: '1.4K',
      isLiked: false
    }
  }
};

const MESSAGE_TEXT = {
  zh: {
    title: '消息通知',
    subtitle: '实时获取当地预警与办事动态',
    unreadToast: '已标记为已读',
    empty: '暂无新消息',
    notices: [
      {
        id: 1,
        type: '安全预警',
        tagBg: '#ffeeee',
        title: '内罗毕集会提醒',
        content: '近期市中心区域可能有规模性活动，建议华人同胞减少不必要出行，注意人身安全。',
        time: '10:25',
        unread: true
      },
      {
        id: 2,
        type: '系统更新',
        tagBg: '#eef9f2',
        title: '斯瓦希里语库更新',
        content: '我们新增了50条关于“当地集市贸易”的实用口语，快去实用词句板块看看吧！',
        time: '昨天',
        unread: true
      },
      {
        id: 3,
        type: '办事指南',
        tagBg: '#eef2ff',
        title: '签证续签政策变动',
        content: '当地移民局发布最新通告，关于劳务签证续签流程有所简化，详情请查阅劳务合规模块。',
        time: '3天前',
        unread: false
      }
    ]
  },
  en: {
    title: 'Messages',
    subtitle: 'Get local alerts and service updates in real time',
    unreadToast: 'Marked as read',
    empty: 'No new messages',
    notices: [
      {
        id: 1,
        type: 'Safety Alert',
        tagBg: '#ffeeee',
        title: 'Nairobi gathering reminder',
        content: 'A large event may take place in the city center soon. We recommend minimizing non-essential travel and staying safe.',
        time: '10:25',
        unread: true
      },
      {
        id: 2,
        type: 'System Update',
        tagBg: '#eef9f2',
        title: 'Swahili phrase library updated',
        content: 'We added 50 practical lines for local market trade. Check them in the useful phrases section!',
        time: 'Yesterday',
        unread: true
      },
      {
        id: 3,
        type: 'Service Guide',
        tagBg: '#eef2ff',
        title: 'Visa renewal policy changed',
        content: 'The local immigration office has issued a new notice. Work visa renewal steps are simplified; see the labor compliance section for details.',
        time: '3 days ago',
        unread: false
      }
    ]
  },
  fr: {
    title: 'Messages',
    subtitle: 'Recevez en temps réel les alertes locales et les mises à jour de services',
    unreadToast: 'Marqué comme lu',
    empty: 'Aucun nouveau message',
    notices: [
      {
        id: 1,
        type: 'Alerte sécurité',
        tagBg: '#ffeeee',
        title: 'Rappel de rassemblement à Nairobi',
        content: 'Un événement de grande ampleur pourrait avoir lieu bientôt au centre-ville. Réduisez les déplacements non essentiels et restez prudent.',
        time: '10:25',
        unread: true
      },
      {
        id: 2,
        type: 'Mise à jour système',
        tagBg: '#eef9f2',
        title: 'Bibliothèque de phrases swahilies mise à jour',
        content: 'Nous avons ajouté 50 phrases pratiques sur le commerce au marché local. Allez voir la section des phrases utiles !',
        time: 'Hier',
        unread: true
      },
      {
        id: 3,
        type: 'Guide administratif',
        tagBg: '#eef2ff',
        title: 'Changement de la politique de renouvellement du visa',
        content: 'L’immigration locale a publié un nouvel avis. Les étapes de renouvellement du visa travail sont simplifiées ; voir la section conformité travail pour plus de détails.',
        time: 'Il y a 3 jours',
        unread: false
      }
    ]
  }
};

const HEALTH_TEXT = {
  zh: {
    navTitle: (country) => `防疫健康（${country}）`,
    ticker: '⚠️ {country}核心疫情预警：霍乱（全境极高风险） | 猴痘（持续上升） | 麻疹（局部爆发）',
    entryMustTag: '入境必看',
    entryMustTitle: '强制要求：必须携带黄热病疫苗接种证书（小黄本）',
    entryMustDesc: '建议将纸质原件与电子扫描件同时准备；边检抽查频率高，缺失可能导致拒绝入境或隔离观察。',
    hospitalTitle: '华人集中地主要医院',
    addressLabel: '地址：',
    phoneLabel: '电话：',
    callButton: '拨打',
    malariaTitle: '防疟疾指南',
    malariaAccordion: '推荐预防药物：阿托伐醌 / 多西环素',
    malariaNote: '高发区域：金沙萨周边、东部矿区及雨季积水地带，请全程防蚊并及时就医。',
    emergencyButton: '一键拨打当地急救 112 / 116',
    emergencyToast: '拨号失败，请稍后重试',
    malariaTips: ['阿托伐醌（按医嘱行前启动）', '多西环素（注意防晒与胃部反应）', '驱蚊剂（DEET）+ 长袖衣裤 + 蚊帐']
  },
  en: {
    navTitle: (country) => `Health & Safety (${country})`,
    ticker: '⚠️ {country} health alert: cholera (very high nationwide risk) | mpox (rising) | measles (localized outbreaks)',
    entryMustTag: 'Must read before entry',
    entryMustTitle: 'Mandatory: Yellow fever vaccination certificate required',
    entryMustDesc: 'Prepare both paper and digital copies. Border checks are frequent; missing documents may lead to refusal of entry or quarantine.',
    hospitalTitle: 'Main hospitals in expat areas',
    addressLabel: 'Address: ',
    phoneLabel: 'Phone: ',
    callButton: 'Call',
    malariaTitle: 'Malaria prevention guide',
    malariaAccordion: 'Recommended prophylaxis: atovaquone / doxycycline',
    malariaNote: 'High-risk areas include the outskirts of Kinshasa, eastern mining areas, and rainy-season standing water. Please protect yourself from mosquitoes at all times and seek care promptly.',
    emergencyButton: 'One-tap local emergency call 112 / 116',
    emergencyToast: 'Call failed, please try again later',
    malariaTips: ['Atovaquone (start before departure as prescribed)', 'Doxycycline (watch for sun sensitivity and stomach effects)', 'Repellent (DEET) + long sleeves + mosquito net']
  },
  fr: {
    navTitle: (country) => `Santé et prévention (${country})`,
    ticker: '⚠️ Alerte sanitaire pour {country} : choléra (risque très élevé sur tout le territoire) | mpox (hausse continue) | rougeole (foyers locaux)',
    entryMustTag: 'À lire avant l’entrée',
    entryMustTitle: 'Obligatoire : certificat de vaccination contre la fièvre jaune',
    entryMustDesc: 'Préparez une version papier et une version numérique. Les contrôles frontaliers sont fréquents ; l’absence de documents peut entraîner un refus d’entrée ou une quarantaine.',
    hospitalTitle: 'Principaux hôpitaux en zone expatriée',
    addressLabel: 'Adresse : ',
    phoneLabel: 'Téléphone : ',
    callButton: 'Appeler',
    malariaTitle: 'Guide de prévention du paludisme',
    malariaAccordion: 'Prophylaxie recommandée : atovaquone / doxycycline',
    malariaNote: 'Les zones à haut risque incluent les abords de Kinshasa, les zones minières de l’est et les eaux stagnantes de la saison des pluies. Protégez-vous des moustiques et consultez rapidement en cas de symptômes.',
    emergencyButton: 'Appel d’urgence local 112 / 116',
    emergencyToast: 'Appel impossible, veuillez réessayer',
    malariaTips: ['Atovaquone (à commencer avant le départ selon l’ordonnance)', 'Doxycycline (attention au soleil et à l’estomac)', 'Répulsif (DEET) + manches longues + moustiquaire']
  }
};

function normalizeLanguage(language) {
  if (!language) {
    return 'zh';
  }

  const normalized = String(language).toLowerCase();
  if (SUPPORTED_LANGUAGES.includes(normalized)) {
    return normalized;
  }

  if (normalized.startsWith('en')) {
    return 'en';
  }

  if (normalized.startsWith('fr')) {
    return 'fr';
  }

  return 'zh';
}

function getSystemLanguage() {
  try {
    const systemInfo = wx.getSystemInfoSync();
    return normalizeLanguage(systemInfo.language);
  } catch (error) {
    return 'zh';
  }
}

function getStoredLanguage() {
  try {
    const stored = wx.getStorageSync(LANGUAGE_STORAGE_KEY);
    return normalizeLanguage(stored || getSystemLanguage());
  } catch (error) {
    return getSystemLanguage();
  }
}

function setStoredLanguage(language) {
  const normalized = normalizeLanguage(language);
  try {
    wx.setStorageSync(LANGUAGE_STORAGE_KEY, normalized);
  } catch (error) {
    // ignore storage errors in low-space / restricted environments
  }
  return normalized;
}

function getTextPack(pack, language) {
  return pack[normalizeLanguage(language)] || pack.zh;
}

function formatValue(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return values[key];
    }
    return `{${key}}`;
  });
}

function getCountryName(zhName, language) {
  const locale = normalizeLanguage(language);
  const entry = COUNTRY_NAMES[zhName];
  if (!entry) {
    return zhName;
  }
  return entry[locale] || entry.zh || zhName;
}

function buildFeatureItems(language) {
  const locale = normalizeLanguage(language);
  return FEATURE_KEYS.map((item) => ({
    key: item.key,
    icon: item.icon,
    iconImage: item.iconImage || ICON_IMAGES.features[item.key] || '',
    label: item.label[locale] || item.label.zh
  }));
}

function buildTabTexts(language) {
  return getTextPack(TABS, language);
}

function buildTabIconImages() {
  return { ...ICON_IMAGES.tabs };
}

function buildIndexText(language) {
  return getTextPack(INDEX_TEXT, language);
}

function buildHomeText(language, currentCountryZh = '肯尼亚', currentCountryLabel = '') {
  const locale = normalizeLanguage(language);
  const base = getTextPack(HOME_TEXT, locale);
  const country = currentCountryLabel || getCountryName(currentCountryZh, locale);

  return {
    ...base,
    tabLabels: buildTabTexts(locale),
    tabIconImages: buildTabIconImages(),
    welcomeTitle: `${base.welcomePrefix}${country}`,
    welcomeSubtitle: currentCountryZh === '肯尼亚' && locale === 'zh'
      ? '肯尼亚，内罗毕'
      : currentCountryZh === '肯尼亚' && locale === 'en'
        ? 'Kenya, Nairobi'
        : currentCountryZh === '肯尼亚' && locale === 'fr'
          ? 'Kenya, Nairobi'
          : `${country} · ${base.welcomeFallbackSubtitle}`,
    countryLabel: country,
    features: buildFeatureItems(locale),
    safetyMore: base.safetyMore,
    safetyTitle: base.safetyTitle
  };
}

function buildProfileText(language, currentCountryZh = '肯尼亚', currentCountryLabel = '', bookmarksCount = 0, isLogin = false) {
  const locale = normalizeLanguage(language);
  const base = getTextPack(PROFILE_TEXT, locale);
  const country = currentCountryLabel || getCountryName(currentCountryZh, locale);
  const cityMap = {
    '刚果(金)': { zh: '金沙萨', en: 'Kinshasa', fr: 'Kinshasa' },
    '加纳': { zh: '阿克拉', en: 'Accra', fr: 'Accra' },
    '埃及': { zh: '开罗', en: 'Cairo', fr: 'Le Caire' },
    '安哥拉': { zh: '罗安达', en: 'Luanda', fr: 'Luanda' },
    '尼日利亚': { zh: '阿布贾', en: 'Abuja', fr: 'Abuja' },
    '南非': { zh: '约翰内斯堡', en: 'Johannesburg', fr: 'Johannesburg' },
    '马达加斯加': { zh: '塔那那利佛', en: 'Antananarivo', fr: 'Antananarivo' },
    '坦桑尼亚': { zh: '达累斯萨拉姆', en: 'Dar es Salaam', fr: 'Dar es Salaam' },
    '肯尼亚': { zh: '内罗毕', en: 'Nairobi', fr: 'Nairobi' },
    '科特迪瓦': { zh: '阿比让', en: 'Abidjan', fr: 'Abidjan' },
    '赞比亚': { zh: '卢萨卡', en: 'Lusaka', fr: 'Lusaka' },
    '乌干达': { zh: '坎帕拉', en: 'Kampala', fr: 'Kampala' },
    '几内亚': { zh: '科纳克里', en: 'Conakry', fr: 'Conakry' },
    '刚果(布)': { zh: '布拉柴维尔', en: 'Brazzaville', fr: 'Brazzaville' },
    '利比里亚': { zh: '蒙罗维亚', en: 'Monrovia', fr: 'Monrovia' },
    '埃塞俄比亚': { zh: '亚的斯亚贝巴', en: 'Addis Ababa', fr: 'Addis-Abeba' },
    '塞内加尔': { zh: '达喀尔', en: 'Dakar', fr: 'Dakar' },
    '津巴布韦': { zh: '哈拉雷', en: 'Harare', fr: 'Harare' },
    '摩洛哥': { zh: '拉巴特', en: 'Rabat', fr: 'Rabat' },
    '莫桑比克': { zh: '马普托', en: 'Maputo', fr: 'Maputo' },
    '阿尔及利亚': { zh: '阿尔及尔', en: 'Algiers', fr: 'Alger' }
  };
  const cityEntry = cityMap[currentCountryZh] || { zh: '主要城市', en: 'Main city', fr: 'Ville principale' };
  const city = cityEntry[locale] || cityEntry.zh;
  const insightMap = {
    '肯尼亚': {
      zh: '内罗毕更需要关注晚间通勤、证件随身管理和约车路线确认。',
      en: 'Nairobi needs extra attention on evening commuting, document safety, and ride-hailing routes.',
      fr: 'Nairobi demande une attention particulière aux trajets du soir, aux documents et aux itinéraires de covoiturage.'
    },
    '坦桑尼亚': {
      zh: '落地后建议优先熟悉港口与机场周边交通方式，降低临时换乘成本。',
      en: 'After landing, get familiar with port and airport transport options first to reduce transfer costs.',
      fr: 'Après l’atterrissage, commencez par comprendre les transports autour des ports et des aéroports pour réduire les coûts de correspondance.'
    },
    '尼日利亚': {
      zh: '商务活动多的区域节奏快，建议提前固化通勤与会面动线。',
      en: 'Business districts move fast, so it helps to lock down commuting and meeting routes in advance.',
      fr: 'Les zones d’affaires vont vite ; il vaut mieux fixer à l’avance les trajets domicile-rendez-vous.'
    }
  };
  const insightEntry = insightMap[currentCountryZh] || {
    zh: `${city}当前更适合优先建立稳定路线，把证件、交通和联系人放在第一顺位。`,
    en: `${city} is best approached by establishing a stable route first, with documents, transport, and contacts as top priorities.`,
    fr: `${city} se prête surtout à la mise en place d’un itinéraire stable, en priorisant documents, transport et contacts.`
  };
  const destinationInsight = insightEntry[locale] || insightEntry.zh;
  const focusLabelMap = {
    zh: currentCountryZh === '尼日利亚' ? '商务路线' : currentCountryZh === '坦桑尼亚' ? '口岸出行' : '夜间交通',
    en: currentCountryZh === '尼日利亚' ? 'Business route' : currentCountryZh === '坦桑尼亚' ? 'Border travel' : 'Night transport',
    fr: currentCountryZh === '尼日利亚' ? 'Trajet affaires' : currentCountryZh === '坦桑尼亚' ? 'Trajet frontalier' : 'Transports de nuit'
  };
  const riskLabelMap = {
    zh: currentCountryZh === '尼日利亚' ? '需提高警惕' : '中等风险',
    en: currentCountryZh === '尼日利亚' ? 'Heightened alert' : 'Moderate risk',
    fr: currentCountryZh === '尼日利亚' ? 'Vigilance renforcée' : 'Risque modéré'
  };

  return {
    ...base,
    tabLabels: buildTabTexts(locale),
    tabIconImages: buildTabIconImages(),
    heroBadge: base.heroBadge,
    memberSinceLabel: base.memberSince,
    heroName: isLogin ? '' : base.guestName,
    heroSubcopy: `${country} · ${city} · ${base.heroSubcopy}`,
    companionNote: isLogin ? 'synced' : 'guest',
    profileStats: [
      {
        label: locale === 'zh' ? '旅途身份' : locale === 'en' ? 'Travel status' : 'Statut de voyage',
        value: isLogin ? base.statusReady : base.statusPending,
        tone: isLogin ? 'emerald' : 'sand'
      },
      { label: locale === 'zh' ? '当前目的地' : locale === 'en' ? 'Destination' : 'Destination', value: country, tone: 'sky' },
      { label: locale === 'zh' ? '收藏夹' : locale === 'en' ? 'Bookmarks' : 'Favoris', value: `${bookmarksCount} ${base.bookmarkCountSuffix}`, tone: 'rose' },
      { label: base.safetyScore, value: '92', tone: 'gold' }
    ],
    quickActions: [
      { key: 'visa', label: base.quickActions.visa.label, meta: base.quickActions.visa.meta, icon: '🛂', iconImage: ICON_IMAGES.profile.visa, tone: 'sky' },
      { key: 'security', label: base.quickActions.security.label, meta: base.quickActions.security.meta, icon: '🛡️', iconImage: ICON_IMAGES.profile.security, tone: 'emerald' },
      { key: 'bookmarks', label: base.quickActions.bookmarks.label, meta: formatValue(base.quickActions.bookmarks.meta, { count: bookmarksCount }), icon: '✦', iconImage: ICON_IMAGES.profile.bookmarks, tone: 'sand' },
      { key: 'message', label: base.quickActions.message.label, meta: base.quickActions.message.meta, icon: '✉️', iconImage: ICON_IMAGES.profile.message, tone: 'rose' }
    ],
    serviceEntries: [
      { title: base.serviceEntries.localInfo.title, subtitle: formatValue(base.serviceEntries.localInfo.subtitle, { country }), icon: '📰', iconImage: ICON_IMAGES.profile['local-info'], action: 'local-info' },
      { title: base.serviceEntries.visa.title, subtitle: base.serviceEntries.visa.subtitle, icon: '🧾', iconImage: ICON_IMAGES.profile.visa, action: 'visa' },
      { title: base.serviceEntries.security.title, subtitle: base.serviceEntries.security.subtitle, icon: '🛡️', iconImage: ICON_IMAGES.profile.security, action: 'security' },
      { title: base.serviceEntries.recommend.title, subtitle: base.serviceEntries.recommend.subtitle, icon: '🧭', iconImage: ICON_IMAGES.profile.recommend, action: 'recommend' },
      { title: base.serviceEntries.phrases.title, subtitle: base.serviceEntries.phrases.subtitle, icon: '🗨️', iconImage: ICON_IMAGES.profile.phrases, action: 'phrases' },
      { title: base.serviceEntries.settings.title, subtitle: base.serviceEntries.settings.subtitle, icon: '⚙️', iconImage: ICON_IMAGES.profile.settings, action: 'settings' }
    ],
    currentCountryLabel: country,
    currentCity: city,
    destinationInsight,
    focusLabel: focusLabelMap[locale] || focusLabelMap.zh,
    riskLabel: riskLabelMap[locale] || riskLabelMap.zh,
    destinationBanner: `${country} ${base.journeyBadgePrefix}`,
    journeyTitle: base.journeyTitle,
    journeySubtitle: base.journeySubtitle,
    quickTitle: base.quickTitle,
    quickSubtitle: base.quickSubtitle,
    serviceTitle: base.serviceTitle,
    serviceSubtitle: base.serviceSubtitle,
    bookmarkTitle: base.bookmarkTitle,
    bookmarkSubtitle: base.bookmarkSubtitle,
    bookmarkEmptyTitle: base.bookmarkEmptyTitle,
    bookmarkEmptyDesc: base.bookmarkEmptyDesc,
    supportTitle: base.supportTitle,
    supportSubtitle: base.supportSubtitle,
    supportSecurityTitle: base.supportSecurityTitle,
    supportSecurityDesc: base.supportSecurityDesc,
    supportLocalInfoTitle: base.supportLocalInfoTitle,
    supportLocalInfoDesc: base.supportLocalInfoDesc,
    loginButton: base.loginButton,
    loggedInStatus: base.loggedInStatus,
    logout: base.logout,
    heroBadgeText: base.heroBadge,
    loggedInNote: base.loggedInNote,
    focusPrefix: base.focusPrefix,
    riskPrefix: base.riskPrefix
  };
}

function buildCommunityText(language, currentCountryZh = '肯尼亚') {
  const locale = normalizeLanguage(language);
  const base = getTextPack(COMMUNITY_TEXT, locale);
  const country = getCountryName(currentCountryZh, locale);
  const featured = base.featuredPost;

  return {
    ...base,
    tabLabels: buildTabTexts(locale),
    tabIconImages: buildTabIconImages(),
    countryLabel: country,
    title: formatValue(base.heroTitle, { country }),
    featuredPost: {
      ...featured
    },
    stats: base.stats.slice(),
    actionTexts: { ...base.actionTexts },
    composeButton: base.composeButton
  };
}

function buildMessageText(language) {
  const locale = normalizeLanguage(language);
  const base = getTextPack(MESSAGE_TEXT, locale);
  return {
    ...base,
    tabLabels: buildTabTexts(locale),
    tabIconImages: buildTabIconImages(),
    notices: base.notices.map((item) => ({ ...item }))
  };
}

function buildHealthText(language, currentCountryZh = '刚果(金)') {
  const locale = normalizeLanguage(language);
  const base = getTextPack(HEALTH_TEXT, locale);
  const country = getCountryName(currentCountryZh, locale);
  return {
    navTitle: base.navTitle(country),
    tickerText: formatValue(base.ticker, { country }),
    entryMustTag: base.entryMustTag,
    entryMustTitle: base.entryMustTitle,
    entryMustDesc: base.entryMustDesc,
    hospitalTitle: base.hospitalTitle,
    addressLabel: base.addressLabel,
    phoneLabel: base.phoneLabel,
    callButton: base.callButton,
    malariaTitle: base.malariaTitle,
    malariaAccordion: base.malariaAccordion,
    malariaNote: base.malariaNote,
    emergencyButton: base.emergencyButton,
    emergencyToast: base.emergencyToast,
    malariaTips: base.malariaTips.slice(),
    countryLabel: country
  };
}

export {
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  COUNTRY_NAMES,
  TABS,
  normalizeLanguage,
  getSystemLanguage,
  getStoredLanguage,
  setStoredLanguage,
  getCountryName,
  buildFeatureItems,
  buildTabTexts,
  buildTabIconImages,
  buildIndexText,
  buildHomeText,
  buildProfileText,
  buildCommunityText,
  buildMessageText,
  buildHealthText
};

