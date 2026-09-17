# 安全落地助手功能路线

产品面向中国赴非旅行、务工和商务人员，核心价值是“安全、合规地落地”，而不是单纯展示景点。

## 已实现：阶段 1 · 行前中心

- 小程序页面：`01/pages/trip-plan/`
- 客户端调用：`01/utils/cloud-service.js` 中的 `loadTrips` / `saveTrip` / `deleteTrip`
- 远程接口：`GET|POST /api/trips`、`PUT|DELETE /api/trips/:id`
- MySQL：`trip_plans` 表，数据按服务端用户 ID 隔离
- 离线回退：未登录或网络异常时保存到 `landingAssistantTripPlans`

覆盖出行目的、日期、人数、预算、签证进度、材料清单、机酒/当地交通备注和逐日行程。

## 已实现：阶段 2 · 旅中工具

### 地图与路线

- 小程序内已使用 `wx.chooseLocation`、`wx.getLocation` 和 `wx.openLocation` 完成位置选择与地图打开，无需把密钥下发到客户端。
- 已实现 Express 代理接口：`POST /api/navigation/routes`，请求字段为 `origin`、`destination` 和 `mode`，接口需登录且有独立限流。
- 供应商选择：高德地图海外 Web Service（阿里生态）。官方文档说明海外路线需先申请 Web Service Key 并工单开通海外权限：https://lbs.amap.com/api/web-service/guide/routes
- 密钥仅放在阿里云 ECS 环境变量 `AMAP_WEB_SERVICE_KEY`，由 Express 代理请求；权限未开通时保持 `AMAP_NAVIGATION_ENABLED=false`，接口明确返回 503，微信原生选点和地图打开仍可使用。

### 翻译

- 已实现 Express 接口：`POST /api/translate`，请求字段为 `text`、`sourceLanguage`、`targetLanguage`；接口需登录且有独立限流。
- 供应商选择：阿里云机器翻译 `TranslateGeneral`。官方接口限制为单次最多 5000 字符：https://help.aliyun.com/zh/machine-translation/developer-reference/api-reference-machine-translation-universal-version-call-guide
- 已接入官方 Node.js SDK，使用 ECS RAM Role/短期凭据；最小权限模板位于 `01/backend/deploy/aliyun/ram-translate-policy.json`。未开通服务时保持 `ALIYUN_TRANSLATE_ENABLED=false`，接口会明确返回 503。

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

## 后置项

- 实时航班、酒店库存/支付、保险投保、导游订单：需要真实商业合作方、资质、回调签名和售后流程，暂不伪实现。
- 全自动风险抓取：先建立来源白名单、去重和人工审核，再开启定时任务。
