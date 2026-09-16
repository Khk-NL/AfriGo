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
- 路线规划预留 Express 接口：`POST /api/navigation/routes`。
- 供应商选择：高德地图海外 Web Service（阿里生态）。官方文档说明海外路线需先申请 Web Service Key 并工单开通海外权限：https://lbs.amap.com/api/web-service/guide/routes
- 密钥仅放在阿里云 ECS 环境变量 `AMAP_WEB_SERVICE_KEY`，由 Express 代理请求。

### 翻译

- 已实现 Express 接口：`POST /api/translate`，请求字段为 `text`、`sourceLanguage`、`targetLanguage`；接口需登录且有独立限流。
- 供应商选择：阿里云机器翻译 `TranslateGeneral`。官方接口限制为单次最多 5000 字符：https://help.aliyun.com/zh/machine-translation/developer-reference/api-reference-machine-translation-universal-version-call-guide
- 已接入官方 Node.js SDK，使用 ECS RAM Role/短期凭据；最小权限模板位于 `01/backend/deploy/aliyun/ram-translate-policy.json`。未开通服务时保持 `ALIYUN_TRANSLATE_ENABLED=false`，接口会明确返回 503。

### 风险和应急

- 预留接口：`GET /api/risk-alerts?countryCode=KE`、`POST /api/emergency-sessions`。
- 第一版以驻外使领馆/领事服务等可核验来源为主，后台人工审核后发布。
- 已将当前国家指南、常用语、应急联系人和行前计划纳入本机离线包。

## 已实现：阶段 3 · 旅后闭环

- 复盘页支持五星评价、总体回顾、推荐亮点和经验提醒，并可整理为带目的地的社区游记。
- 路线复用接口：`POST /api/trips/:id/clone`，保留预算和逐日路线，清空日期、签证完成状态和订单信息。
- 费用接口：`GET|POST /api/trips/:id/expenses`、`DELETE /api/trips/:tripId/expenses/:expenseId`，按分类对比行前预算和实际支出。
- 评价接口：`GET|PUT /api/trips/:id/review`。所有旅后数据均校验行程所有权，不使用匿名远程存储。

## 阶段 4 · 服务对接

- 统一服务目录：`GET /api/services?countryCode=KE&category=hotel|transport|guide|insurance`。
- 意向单：`POST /api/service-leads`，由后台分配给经过审核的供应商。
- 在没有真实合作方、价格和售后规则前，只展示“待对接”，不制造虚假下单闭环。

## 阶段 5 · 内容可信机制

- 每条内容存储 `sourceUrl`、`sourceName`、`verifiedAt`、`expiresAt`、`reviewStatus`。
- 用户纠错：`POST /api/content-corrections`。
- 管理员审核：`GET /api/admin/content-corrections`、`PATCH /api/admin/content-corrections/:id`。
- 前端统一显示来源、核验日期和“可能过期”状态。

## 后置项

- 实时航班、酒店库存/支付、保险投保、导游订单：需要真实商业合作方、资质、回调签名和售后流程，暂不伪实现。
- 全自动风险抓取：先建立来源白名单、去重和人工审核，再开启定时任务。
