# 安全落地助手功能路线

产品面向中国赴非旅行、务工和商务人员，核心价值是“安全、合规地落地”，而不是单纯展示景点。

## 已实现：阶段 1 · 行前中心

- 小程序页面：`miniprogram/pages/trip-plan/`
- 客户端调用：`miniprogram/utils/cloud-service.js` 中的 `loadTrips` / `saveTrip` / `deleteTrip`
- 远程接口：`GET|POST /api/trips`、`PUT|DELETE /api/trips/:id`
- MySQL：`trip_plans` 表，数据按服务端用户 ID 隔离
- 离线回退：未登录或网络异常时保存到 `landingAssistantTripPlans`

覆盖出行目的、日期、人数、预算、签证进度、材料清单、机酒/当地交通备注和逐日行程。

## 已实现：阶段 2 · 旅中工具

### 地图与路线

- 小程序内已使用 `wx.chooseLocation`、`wx.getLocation` 和 `wx.openLocation` 完成位置选择与地图打开，无需把密钥下发到客户端。
- 已实现 Express 代理接口：`POST /api/navigation/routes`，请求字段为 `origin`、`destination` 和 `mode`，接口需登录且有独立限流。
- 供应商选择改为 Provider 抽象（`backend/src/navigation/`）：用 `NAVIGATION_PROVIDER` 切换，新增服务只需实现 `plan()` 并注册进 `providers/index.js`；响应回传 `provider` 与 `providerLabel`，小程序不硬编码地图品牌。
- 已内置 `amap-overseas`（高德海外 Web Service，需企业开发者认证并工单开通海外 LBS 权限，文档 https://lbs.amap.com/api/web-service/guide/routes）、`mapbox`（Mapbox Directions，自助注册、全球覆盖）、`google-directions`（Google Directions，需 Google Cloud 项目与结算账号）、`tencent`（腾讯位置服务 Direction，控制台自助申请 Key、有免费配额），以及显式关闭用的 `disabled`。
  腾讯返回的 `duration` 单位是分钟，Provider 内已换算成秒，保证四种服务的 `durationSeconds` 口径一致。
- 各 Provider 的 Key 只放在服务端环境变量，由 Express 代理请求；未配置时接口明确返回 503，微信原生选点和地图打开仍可使用。

### 翻译

- 已实现 Express 接口：`POST /api/translate`，请求字段为 `text`、`sourceLanguage`、`targetLanguage`；接口需登录且有独立限流。
- 供应商选择：阿里云机器翻译 `TranslateGeneral`。官方接口限制为单次最多 5000 字符：https://help.aliyun.com/zh/machine-translation/developer-reference/api-reference-machine-translation-universal-version-call-guide
- 已接入官方 Node.js SDK，使用 ECS RAM Role/短期凭据；最小权限模板位于 `backend/deploy/aliyun/ram-translate-policy.json`。未开通服务时保持 `ALIYUN_TRANSLATE_ENABLED=false`，接口会明确返回 503。

### 风险和应急

- 已实现 `GET /api/risk-alerts?countryCode=KE`；提醒必须有来源、核验时间和有效期，并经后台人工审核后发布。`POST /api/emergency-sessions` 仍后置。
- 第一版以驻外使领馆/领事服务等可核验来源为主，不自动发布抓取结果。
- 已将当前国家指南、常用语、应急联系人和行前计划纳入本机离线包。

## 已实现：阶段 3 · 旅后闭环

- 复盘页支持五星评价、总体回顾、推荐亮点和经验提醒，并可整理为带目的地的社区游记。
- 路线复用接口：`POST /api/trips/:id/clone`，保留预算和逐日路线，清空日期、签证完成状态和订单信息。
- 费用接口：`GET|POST /api/trips/:id/expenses`、`DELETE /api/trips/:tripId/expenses/:expenseId`，按分类对比行前预算和实际支出。
- 评价接口：`GET|PUT /api/trips/:id/review`。所有旅后数据均校验行程所有权，不使用匿名远程存储。

## 已实现：阶段 4 · 服务对接

- 统一服务目录：`GET /api/services?countryCode=KE&category=hotel|transport|guide|insurance`，仅返回 `approved` 服务方且不下发内部联系方式。
- 意向单：`POST /api/service-leads`、`GET /api/me/service-leads`，只能向已审核服务方提交，并记录跟进状态。
- 管理后台新增 `service_providers` 与 `service_leads`，支持审核服务方、记录资质来源和更新意向状态。
- 在没有真实合作方、价格和售后规则前，前端显示真实空状态，并明确意向不等于预订或付款。

## 已实现：阶段 5 · 内容可信机制

- 国家整合资料返回来源链接、同步/核验时间、可信类型和发布状态；前端按 180 天提示时效风险。
- 风险提醒存储 `sourceUrl`、`sourceName`、`publishedAt`、`verifiedAt`、`expiresAt` 和 `status`；`GET /api/risk-alerts` 只返回已发布且未过期内容。
- 用户纠错：`POST /api/content-corrections`、`GET /api/me/content-corrections`，登录用户可查看采纳或驳回说明。
- 管理后台新增 `risk_alerts` 与 `content_corrections`，用于发布风险信息和审核纠错；旅中工具同步显示有效提醒。

## 已实现：AI 陪伴（非洲象 · 旅行小助手）

- 后端 `POST /api/chat` 代理大模型（`AI_PROVIDER=deepseek`，默认 DeepSeek），Key 只存服务端，接口需登录且有独立限流（20 次/分钟）。
- 人设由服务端注入（`backend/src/chat/persona.js`），可用 `AI_SYSTEM_PROMPT` 整体覆盖：一只叫「小象」的非洲象旅行小助手，先给结论、默认 200 字内、不用 Markdown 排版，遇签证/安全/医疗/法律先提示以官方渠道为准，不编造电话、地址、政策与价格。
- 资料注入（`backend/src/chat/travel-context.js`）：请求带上 `countryCode` 后，服务端把该国的签证、治安、紧急电话、健康、风俗、劳务、官方入口和正在生效的风险提醒压成要点，拼进系统提示词；查不到资料时照常回答，只是明确告诉模型没有该国数据。
- 小程序 `components/elephant-pet`：常驻悬浮的桌宠小象，可拖动、松手吸附屏幕边缘、长按换位置或暂时收起；点一下就地弹出对话卡片，发消息时小象会切到说话/开心状态；卡片内可一键跳到全屏。
- 全屏页 `pages/chat/chat`：同一个桌宠的历史与文案（`utils/elephant-chat.js` 统一维护），显示当前参考的国家资料，未登录时引导去登录。
- 未配置 Key 时接口返回 503，其余功能不受影响；新增模型服务只需实现 `complete()` 并注册进 `chat/providers/index.js`。

## 已实现：媒体存储与个人资料

- 媒体存储做成可替换 Provider（`backend/src/storage.js`）：`STORAGE_PROVIDER=oss` 用阿里云私有 Bucket + 签名 URL，`local` 用服务器本地磁盘并经 `/media` 前缀提供；留空时自动判断，因此没有云凭据也能使用图片与头像。
- 个人中心支持自助修改头像与昵称：头像用微信原生 `open-type="chooseAvatar"`，昵称用 `<input type="nickname">`，保存时先上传头像再调用 `PUT /api/auth/profile`。

## 后置项

- 实时航班、酒店库存/支付、保险投保、导游订单：需要真实商业合作方、资质、回调签名和售后流程，暂不伪实现。
- 全自动风险抓取：先建立来源白名单、去重和人工审核，再开启定时任务。
