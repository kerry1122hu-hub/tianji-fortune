/**
 * 明己 MingMe v2.0 — 国际化层
 * src/i18n/index.ts
 *
 * 功能：
 *   - i18next + react-i18next 完整配置
 *   - 简中 / 繁中 / 英文 三语全量翻译
 *   - TypeScript 类型安全（所有 key 有类型提示）
 *   - 城市数据库 TypeScript 接入层
 *   - useLang() Hook — 语言切换 + 持久化
 *
 * ─── 依赖 ──────────────────────────────────────────────────────────────────
 *   npx expo install react-i18next i18next
 *   npx expo install @react-native-async-storage/async-storage  (持久化)
 *   # 或使用 react-native-mmkv（更快）
 * ─────────────────────────────────────────────────────────────────────────────
 */

import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import citiesData from "./cities.json";

// ─────────────────────────────────────────────────────────────────────────────
// §1  语言类型
// ─────────────────────────────────────────────────────────────────────────────

export type Lang = "zh-Hans" | "zh-Hant" | "en";

export const LANG_OPTIONS: Array<{ value: Lang; label: string; nativeLabel: string }> = [
  { value: "zh-Hans", label: "简体中文", nativeLabel: "简体中文" },
  { value: "zh-Hant", label: "繁體中文", nativeLabel: "繁體中文" },
  { value: "en",      label: "English",  nativeLabel: "English"  },
];

const LANG_STORAGE_KEY = "@mingme/lang";

// ─────────────────────────────────────────────────────────────────────────────
// §2  翻译资源 — 简体中文（基准语言）
// ─────────────────────────────────────────────────────────────────────────────

const zhHans = {
  // ── App 基础 ──────────────────────────────────────────────────────────────
  appName:     "明己",
  appSlogan:   "认识自己，是一切改变的开始",

  // ── 通用操作 ──────────────────────────────────────────────────────────────
  next:        "下一步",
  back:        "返回",
  skip:        "跳过",
  continue:    "继续",
  confirm:     "确认",
  cancel:      "取消",
  save:        "保存",
  edit:        "编辑",
  delete:      "删除",
  close:       "关闭",
  done:        "完成",
  retry:       "重试",
  loading:     "加载中",
  error:       "出错了",
  success:     "成功",
  unknown:     "未知",

  // ── Tab 导航 ──────────────────────────────────────────────────────────────
  tabHome:     "首页",
  tabProfile:  "明己",
  tabStage:    "阶段",
  tabPremium:  "会员",
  tabMe:       "我的",

  // ── Onboarding ────────────────────────────────────────────────────────────
  onb_step:               "0{{n}}",
  onb_0_title:            "认识自己，是一切改变的开始",
  onb_0_body:             "明己帮助你看见自己的特质、阶段与节奏，在更清楚的状态下做出选择。",
  onb_0_action:           "开始了解自己",
  onb_1_title:            "你会在这里看懂三件事",
  onb_1_body:             "看见自己，看懂阶段，做出选择。",
  onb_1_action:           "继续",
  onb_2_title:            "当你处在这些时刻，明己会更有用",
  onb_2_body:             "很努力，却越来越没方向；在关系里反复拉扯；做选择时犹豫或冲动。",
  onb_2_action:           "这正是我需要的",
  onb_3_title:            "不是给你贴标签，而是帮你更理解自己",
  onb_3_body:             "明己会把复杂的信息，转成更现代、更易懂的表达。",
  onb_3_action:           "开始生成我的档案",

  // ── Intake — 基础信息 ────────────────────────────────────────────────────
  buildProfile:           "建立档案",
  startFromBasics:        "先从你的基础信息开始",
  startFromBasicsSubtitle:"填写后，我们将为你生成第一轮分析",
  stepOf:                 "{{current}} / {{total}}",

  calendarType:           "出生日期类型",
  solarLabel:             "阳历",
  lunarLabel:             "农历",
  calendarNote:           "这里按原始出生历法录入，当前版本不做前端自动换历。",

  birthDate:              "出生日期",
  birthTime:              "出生时间",
  birthTimeHelper:        "尽量填写准确时间，结果会更稳定",
  birthPlace:             "出生城市",
  birthPlacePlaceholder:  "省份 / 城市，例如：山东·济南",

  lunarYear:              "农历年",
  lunarMonth:             "农历月",
  lunarDay:               "农历日",
  isLeapMonth:            "是否闰月",
  yes:                    "是",
  no:                     "否",

  calculationOptions:     "计算选项",
  trueSolarTime:          "真太阳时校正",
  trueSolarTimeNote:      "根据出生地经度修正，约 ±20 分钟",
  jieqiBoundary:          "节气边界",
  jieqiBoundaryNote:      "月柱以节气为分界（传统八字规范）",

  // ── Intake — 关注点 ────────────────────────────────────────────────────
  focusQuestion:          "你现在最想看清什么？",
  focusSubtitle:          "我们会优先为你呈现相关内容",
  focus_self:             "自我认知",
  focus_career:           "事业与方向",
  focus_relation:         "关系与沟通",
  focus_emotion:          "情绪与状态",
  focus_wealth:           "财富与金钱观",
  focus_romance:          "感情与亲密关系",
  focus_all:              "我都想看看",

  // ── Intake — 角色 ──────────────────────────────────────────────────────
  roleQuestion:           "你更接近哪一种状态？",
  roleSubtitle:           "这会帮助我们用更贴近你的方式呈现内容",
  role_student:           "大学生",
  role_entrepreneur:      "创业者/行商",
  role_office:            "上班族",
  role_professional:      "职业白领",
  role_parent:            "宝妈/宝爸",
  role_transition:        "正在调整阶段",
  role_other:             "其他",
  nickname:               "称呼",
  nicknamePlaceholder:    "例如：H / Alex",
  nicknameNote:           "可选，用于首页欢迎语展示",

  // ── 生成中 ─────────────────────────────────────────────────────────────
  generatingTitle:        "正在为你生成专属档案",
  generating_step1:       "正在保存你的原始出生信息",
  generating_step2:       "正在校正历法、时区与节气边界",
  generating_step3:       "正在排盘并生成第一轮现代解读",

  // ── 结果页 ─────────────────────────────────────────────────────────────
  analysisResult:         "分析结果",
  firstRound:             "第一轮结果",
  resultTitle:            "这是你的第一轮结果",
  resultSubtitle:         "先别急着定义自己。先看见，再理解。",
  currentFocus:           "当前关注",
  currentRole:            "当前角色",
  birthInfo:              "出生信息",
  continueToHome:         "进入首页",
  unlockFull:             "解锁完整",
  viewFullInsight:        "查看完整分析",
  coreTraitTitle:         "你的核心特质",
  currentStage:           "你当前的阶段",
  todayFocus:             "你今天最该注意什么",

  // ── 首页 ────────────────────────────────────────────────────────────────
  homeGreeting:           "你好，{{name}}",
  homeTagline:            "今天，先看清自己，再决定往哪里走。",
  todayKeyword:           "今日关键词：{{keyword}}",
  viewFullAnalysis:       "查看完整分析",
  stageSectionTitle:      "你正在经历",
  weeklyFocus:            "本周重点",
  dailyQuote:             "今日一句",
  seeSelf:                "看见自己",
  seeSelfSub:             "核心特质、优势与盲点",
  seeStage:               "看懂阶段",
  stageSub:               "当前位置与节奏",
  viewFull:               "查看完整",
  viewFullSub:            "解锁更深入的分析",
  myProfile:              "我的档案",
  myProfileSub:           "管理资料、记录与设置",
  manage:                 "管理",

  // ── 明己页（Profile Tab）──────────────────────────────────────────────
  profileTabTitle:        "看见自己",
  coreProfile:            "核心特质",
  continueFullProfile:    "继续查看完整档案",
  continueFullProfileBody:"解锁完整个人档案、阶段地图、关系分析与深度提醒。",

  // ── 阶段页 ─────────────────────────────────────────────────────────────
  stageTabTitle:          "看懂阶段",
  stageMapTitle:          "阶段地图",
  last30Days:             "最近 30 天提醒",
  actionSuggestions:      "行动建议",
  viewFullStageMap:       "查看完整阶段地图",

  // ── 会员页 ─────────────────────────────────────────────────────────────
  premiumTitle:           "解锁更完整的自己",
  premiumSubtitle:        "不只看到结果，也看见背后的原因与路径。",
  memberCenter:           "会员中心",
  premiumFullProfile:     "完整个人档案",
  premiumStageMap:        "阶段地图",
  premiumWeekly:          "每周 / 每月提醒",
  premiumRelation:        "关系分析",
  premiumDeep:            "深度解读",
  premiumWuXing:          "五行雷达图",
  premiumPillars:         "完整四柱详解",
  premiumCompat:          "合作匹配分析",

  planMonthly:            "月会员",
  planMonthlyDesc:        "适合先体验一段时间",
  planAnnual:             "年会员",
  planAnnualDesc:         "适合长期陪伴使用",
  planLifetime:           "永久会员",
  planLifetimeDesc:       "一次买断，终身使用",
  recommended:            "推荐",
  savingsLabel:           "省 {{pct}}%",
  trialLabel:             "免费试用 {{days}} 天",
  trialThenPrice:         "{{days}} 天后 {{price}} {{period}}",
  subscribeMonthly:       "开通月会员",
  subscribeAnnual:        "开通年会员",
  subscribeLifetime:      "开通永久会员",
  trialCta:               "免费试用 7 天",
  restorePurchase:        "恢复购买",
  privacyPolicy:          "隐私政策",
  termsOfService:         "服务协议",
  subscriptionLegal:      "订阅将在到期前 24 小时自动续费，可随时取消。",
  subscriptionManage:     "付款后可在「我的」→「会员中心」管理订阅。",

  priceMonthly:           "¥28 / 月",
  priceAnnual:            "¥168 / 年",
  priceLifetime:          "¥198",

  // ── 我的页 ─────────────────────────────────────────────────────────────
  meTitle:                "我的",
  editProfile:            "修改档案",
  personalInfo:           "个人资料",
  birthInfoItem:          "出生信息",
  myRecords:              "我的记录",
  notifications:          "通知设置",
  helpFeedback:           "帮助与反馈",
  langSwitch:             "语言",
  aboutApp:               "关于明己",
  versionLabel:           "版本",
  logout:                 "退出登录",

  // ── 城市选择器 ─────────────────────────────────────────────────────────
  selectCity:             "选择出生城市",
  searchCity:             "搜索省份或城市",
  overseasCities:         "海外城市",
  clearSearch:            "清除",

  // ── 付费状态 ────────────────────────────────────────────────────────────
  paymentProcessing:      "正在处理",
  paymentProcessingBody:  "请稍候，正在连接支付…",
  paymentWaiting:         "等待支付确认",
  paymentWaitingBody:     "请在支付 App 中完成付款",
  paymentSuccess:         "支付成功！",
  paymentSuccessBody:     "会员权益已开通，欢迎使用",
  paymentFailed:          "支付失败",
  paymentFailedBody:      "请检查网络后重试",
  paymentTimeout:         "支付超时",
  paymentTimeoutBody:     "如已完成支付，请点击「恢复购买」",
  startUsing:             "开始使用",
  iKnow:                  "我知道了",
  upgradeNow:             "升级会员",
  notNow:                 "暂不升级",
  unlockFeature:          "解锁「{{feature}}」需要升级会员",
  unlockFeatureBody:      "升级会员后即可解锁完整个人档案、阶段地图与深度分析。",
  restoreSuccess:         "恢复成功",
  restoreSuccessBody:     "会员权益已恢复",
  restoreEmpty:           "未找到购买记录",
  restoreEmptyBody:       "当前账号没有可恢复的购买记录",

  // ── 四柱相关 ─────────────────────────────────────────────────────────
  yearPillar:             "年柱",
  monthPillar:            "月柱",
  dayPillar:              "日柱",
  hourPillar:             "时柱",
  dayMaster:              "日主",
  naYin:                  "纳音",
  kongWang:               "空亡",
  wuXing:                 "五行",
  ganZhi:                 "干支",
  zodiac:                 "生肖",

  wuxing_wood:            "木",
  wuxing_fire:            "火",
  wuxing_earth:           "土",
  wuxing_metal:           "金",
  wuxing_water:           "水",

  // ── 节气 ──────────────────────────────────────────────────────────────
  jieqi_xiaohan:          "小寒",
  jieqi_dahan:            "大寒",
  jieqi_lichun:           "立春",
  jieqi_yushui:           "雨水",
  jieqi_jingzhe:          "惊蛰",
  jieqi_chunfen:          "春分",
  jieqi_qingming:         "清明",
  jieqi_guyu:             "谷雨",
  jieqi_lixia:            "立夏",
  jieqi_xiaoman:          "小满",
  jieqi_mangzhong:        "芒种",
  jieqi_xiazhi:           "夏至",
  jieqi_xiaoshu:          "小暑",
  jieqi_dashu:            "大暑",
  jieqi_liqiu:            "立秋",
  jieqi_chushu:           "处暑",
  jieqi_bailu:            "白露",
  jieqi_qiufen:           "秋分",
  jieqi_hanlu:            "寒露",
  jieqi_shuangjiang:      "霜降",
  jieqi_lidong:           "立冬",
  jieqi_xiaoxue:          "小雪",
  jieqi_daxue:            "大雪",
  jieqi_dongzhi:          "冬至",
  daysToNextJieqi:        "距{{name}} {{days}} 天",
  jieLabel:               "节",
  qiLabel:                "气",

  // ── 错误信息 ─────────────────────────────────────────────────────────
  errorNetwork:           "网络连接失败，请检查后重试",
  errorServer:            "服务器暂时不可用，请稍后再试",
  errorBirthDateRequired: "请填写出生日期",
  errorBirthTimeRequired: "请填写出生时间",
  errorBirthCityRequired: "请选择出生城市",
  errorUnknown:           "发生未知错误，请重试",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// §3  翻译资源 — 繁体中文
// ─────────────────────────────────────────────────────────────────────────────

const zhHant: typeof zhHans = {
  appName:     "明己",
  appSlogan:   "認識自己，是一切改變的開始",
  next:        "下一步",
  back:        "返回",
  skip:        "略過",
  continue:    "繼續",
  confirm:     "確認",
  cancel:      "取消",
  save:        "儲存",
  edit:        "編輯",
  delete:      "刪除",
  close:       "關閉",
  done:        "完成",
  retry:       "重試",
  loading:     "載入中",
  error:       "出錯了",
  success:     "成功",
  unknown:     "未知",
  tabHome:     "首頁",
  tabProfile:  "明己",
  tabStage:    "階段",
  tabPremium:  "會員",
  tabMe:       "我的",
  onb_step:               "0{{n}}",
  onb_0_title:            "認識自己，是一切改變的開始",
  onb_0_body:             "明己幫助你看見自己的特質、階段與節奏，在更清楚的狀態下做出選擇。",
  onb_0_action:           "開始了解自己",
  onb_1_title:            "你會在這裡看懂三件事",
  onb_1_body:             "看見自己，看懂階段，做出選擇。",
  onb_1_action:           "繼續",
  onb_2_title:            "當你處在這些時刻，明己會更有用",
  onb_2_body:             "很努力，卻越來越沒方向；在關係裡反覆拉扯；做選擇時猶豫或衝動。",
  onb_2_action:           "這正是我需要的",
  onb_3_title:            "不是給你貼標籤，而是幫你更理解自己",
  onb_3_body:             "明己會把複雜的資訊，轉成更現代、更易懂的表達。",
  onb_3_action:           "開始生成我的檔案",
  buildProfile:           "建立檔案",
  startFromBasics:        "先從你的基礎資訊開始",
  startFromBasicsSubtitle:"填寫後，我們將為你生成第一輪分析",
  stepOf:                 "{{current}} / {{total}}",
  calendarType:           "出生日期類型",
  solarLabel:             "陽曆",
  lunarLabel:             "農曆",
  calendarNote:           "這裡按原始出生曆法錄入，當前版本不做前端自動換曆。",
  birthDate:              "出生日期",
  birthTime:              "出生時間",
  birthTimeHelper:        "盡量填寫準確時間，結果會更穩定",
  birthPlace:             "出生城市",
  birthPlacePlaceholder:  "省份 / 城市，例如：山東·濟南",
  lunarYear:              "農曆年",
  lunarMonth:             "農曆月",
  lunarDay:               "農曆日",
  isLeapMonth:            "是否閏月",
  yes:                    "是",
  no:                     "否",
  calculationOptions:     "計算選項",
  trueSolarTime:          "真太陽時校正",
  trueSolarTimeNote:      "根據出生地經度修正，約 ±20 分鐘",
  jieqiBoundary:          "節氣邊界",
  jieqiBoundaryNote:      "月柱以節氣為分界（傳統八字規範）",
  focusQuestion:          "你現在最想看清什麼？",
  focusSubtitle:          "我們會優先為你呈現相關內容",
  focus_self:             "自我認知",
  focus_career:           "事業與方向",
  focus_relation:         "關係與溝通",
  focus_emotion:          "情緒與狀態",
  focus_wealth:           "財富與金錢觀",
  focus_romance:          "感情與親密關係",
  focus_all:              "我都想看看",
  roleQuestion:           "你更接近哪一種狀態？",
  roleSubtitle:           "這會幫助我們用更貼近你的方式呈現內容",
  role_student:           "大學生",
  role_entrepreneur:      "創業者/行商",
  role_office:            "上班族",
  role_professional:      "職業白領",
  role_parent:            "寶媽/寶爸",
  role_transition:        "正在調整階段",
  role_other:             "其他",
  nickname:               "稱呼",
  nicknamePlaceholder:    "例如：H / Alex",
  nicknameNote:           "可選，用於首頁歡迎語展示",
  generatingTitle:        "正在為你生成專屬檔案",
  generating_step1:       "正在儲存你的原始出生資訊",
  generating_step2:       "正在校正曆法、時區與節氣邊界",
  generating_step3:       "正在排盤並生成第一輪現代解讀",
  analysisResult:         "分析結果",
  firstRound:             "第一輪結果",
  resultTitle:            "這是你的第一輪結果",
  resultSubtitle:         "先別急著定義自己。先看見，再理解。",
  currentFocus:           "當前關注",
  currentRole:            "當前角色",
  birthInfo:              "出生資訊",
  continueToHome:         "進入首頁",
  unlockFull:             "解鎖完整",
  viewFullInsight:        "查看完整分析",
  coreTraitTitle:         "你的核心特質",
  currentStage:           "你當前的階段",
  todayFocus:             "你今天最該注意什麼",
  homeGreeting:           "你好，{{name}}",
  homeTagline:            "今天，先看清自己，再決定往哪裡走。",
  todayKeyword:           "今日關鍵詞：{{keyword}}",
  viewFullAnalysis:       "查看完整分析",
  stageSectionTitle:      "你正在經歷",
  weeklyFocus:            "本週重點",
  dailyQuote:             "今日一句",
  seeSelf:                "看見自己",
  seeSelfSub:             "核心特質、優勢與盲點",
  seeStage:               "看懂階段",
  stageSub:               "當前位置與節奏",
  viewFull:               "查看完整",
  viewFullSub:            "解鎖更深入的分析",
  myProfile:              "我的檔案",
  myProfileSub:           "管理資料、記錄與設定",
  manage:                 "管理",
  profileTabTitle:        "看見自己",
  coreProfile:            "核心特質",
  continueFullProfile:    "繼續查看完整檔案",
  continueFullProfileBody:"解鎖完整個人檔案、階段地圖、關係分析與深度提醒。",
  stageTabTitle:          "看懂階段",
  stageMapTitle:          "階段地圖",
  last30Days:             "最近 30 天提醒",
  actionSuggestions:      "行動建議",
  viewFullStageMap:       "查看完整階段地圖",
  premiumTitle:           "解鎖更完整的自己",
  premiumSubtitle:        "不只看到結果，也看見背後的原因與路徑。",
  memberCenter:           "會員中心",
  premiumFullProfile:     "完整個人檔案",
  premiumStageMap:        "階段地圖",
  premiumWeekly:          "每週 / 每月提醒",
  premiumRelation:        "關係分析",
  premiumDeep:            "深度解讀",
  premiumWuXing:          "五行雷達圖",
  premiumPillars:         "完整四柱詳解",
  premiumCompat:          "合作匹配分析",
  planMonthly:            "月會員",
  planMonthlyDesc:        "適合先體驗一段時間",
  planAnnual:             "年會員",
  planAnnualDesc:         "適合長期陪伴使用",
  planLifetime:           "永久會員",
  planLifetimeDesc:       "一次買斷，終身使用",
  recommended:            "推薦",
  savingsLabel:           "省 {{pct}}%",
  trialLabel:             "免費試用 {{days}} 天",
  trialThenPrice:         "{{days}} 天後 {{price}} {{period}}",
  subscribeMonthly:       "開通月會員",
  subscribeAnnual:        "開通年會員",
  subscribeLifetime:      "開通永久會員",
  trialCta:               "免費試用 7 天",
  restorePurchase:        "恢復購買",
  privacyPolicy:          "隱私政策",
  termsOfService:         "服務協議",
  subscriptionLegal:      "訂閱將在到期前 24 小時自動續費，可隨時取消。",
  subscriptionManage:     "付款後可在「我的」→「會員中心」管理訂閱。",
  priceMonthly:           "NT$88 / 月",
  priceAnnual:            "NT$528 / 年",
  priceLifetime:          "NT$628",
  meTitle:                "我的",
  editProfile:            "修改檔案",
  personalInfo:           "個人資料",
  birthInfoItem:          "出生資訊",
  myRecords:              "我的記錄",
  notifications:          "通知設定",
  helpFeedback:           "幫助與回饋",
  langSwitch:             "語言",
  aboutApp:               "關於明己",
  versionLabel:           "版本",
  logout:                 "登出",
  selectCity:             "選擇出生城市",
  searchCity:             "搜尋省份或城市",
  overseasCities:         "海外城市",
  clearSearch:            "清除",
  paymentProcessing:      "正在處理",
  paymentProcessingBody:  "請稍候，正在連接支付…",
  paymentWaiting:         "等待支付確認",
  paymentWaitingBody:     "請在支付 App 中完成付款",
  paymentSuccess:         "支付成功！",
  paymentSuccessBody:     "會員權益已開通，歡迎使用",
  paymentFailed:          "支付失敗",
  paymentFailedBody:      "請檢查網路後重試",
  paymentTimeout:         "支付逾時",
  paymentTimeoutBody:     "如已完成支付，請點擊「恢復購買」",
  startUsing:             "開始使用",
  iKnow:                  "我知道了",
  upgradeNow:             "升級會員",
  notNow:                 "暫不升級",
  unlockFeature:          "解鎖「{{feature}}」需要升級會員",
  unlockFeatureBody:      "升級會員後即可解鎖完整個人檔案、階段地圖與深度分析。",
  restoreSuccess:         "恢復成功",
  restoreSuccessBody:     "會員權益已恢復",
  restoreEmpty:           "未找到購買記錄",
  restoreEmptyBody:       "當前帳號沒有可恢復的購買記錄",
  yearPillar:             "年柱",
  monthPillar:            "月柱",
  dayPillar:              "日柱",
  hourPillar:             "時柱",
  dayMaster:              "日主",
  naYin:                  "納音",
  kongWang:               "空亡",
  wuXing:                 "五行",
  ganZhi:                 "干支",
  zodiac:                 "生肖",
  wuxing_wood:            "木",
  wuxing_fire:            "火",
  wuxing_earth:           "土",
  wuxing_metal:           "金",
  wuxing_water:           "水",
  jieqi_xiaohan:          "小寒",
  jieqi_dahan:            "大寒",
  jieqi_lichun:           "立春",
  jieqi_yushui:           "雨水",
  jieqi_jingzhe:          "驚蟄",
  jieqi_chunfen:          "春分",
  jieqi_qingming:         "清明",
  jieqi_guyu:             "穀雨",
  jieqi_lixia:            "立夏",
  jieqi_xiaoman:          "小滿",
  jieqi_mangzhong:        "芒種",
  jieqi_xiazhi:           "夏至",
  jieqi_xiaoshu:          "小暑",
  jieqi_dashu:            "大暑",
  jieqi_liqiu:            "立秋",
  jieqi_chushu:           "處暑",
  jieqi_bailu:            "白露",
  jieqi_qiufen:           "秋分",
  jieqi_hanlu:            "寒露",
  jieqi_shuangjiang:      "霜降",
  jieqi_lidong:           "立冬",
  jieqi_xiaoxue:          "小雪",
  jieqi_daxue:            "大雪",
  jieqi_dongzhi:          "冬至",
  daysToNextJieqi:        "距{{name}} {{days}} 天",
  jieLabel:               "節",
  qiLabel:                "氣",
  errorNetwork:           "網路連線失敗，請檢查後重試",
  errorServer:            "伺服器暫時不可用，請稍後再試",
  errorBirthDateRequired: "請填寫出生日期",
  errorBirthTimeRequired: "請填寫出生時間",
  errorBirthCityRequired: "請選擇出生城市",
  errorUnknown:           "發生未知錯誤，請重試",
};

// ─────────────────────────────────────────────────────────────────────────────
// §4  翻译资源 — 英文
// ─────────────────────────────────────────────────────────────────────────────

const en: typeof zhHans = {
  appName:     "MingMe",
  appSlogan:   "Know yourself — where every change begins",
  next:        "Next",
  back:        "Back",
  skip:        "Skip",
  continue:    "Continue",
  confirm:     "Confirm",
  cancel:      "Cancel",
  save:        "Save",
  edit:        "Edit",
  delete:      "Delete",
  close:       "Close",
  done:        "Done",
  retry:       "Retry",
  loading:     "Loading",
  error:       "Error",
  success:     "Success",
  unknown:     "Unknown",
  tabHome:     "Home",
  tabProfile:  "Self",
  tabStage:    "Stage",
  tabPremium:  "Premium",
  tabMe:       "Me",
  onb_step:               "0{{n}}",
  onb_0_title:            "Know yourself — where every change begins",
  onb_0_body:             "MingMe helps you see your traits, stage & rhythm — to make clearer choices.",
  onb_0_action:           "Start Understanding Myself",
  onb_1_title:            "Here you'll understand three things",
  onb_1_body:             "See yourself. Understand your stage. Make better choices.",
  onb_1_action:           "Continue",
  onb_2_title:            "MingMe is most useful in these moments",
  onb_2_body:             "Trying hard but losing direction. Stuck in relationship patterns. Hesitating or acting impulsively.",
  onb_2_action:           "That's exactly what I need",
  onb_3_title:            "Not labelling you — helping you understand yourself",
  onb_3_body:             "MingMe translates complex information into modern, accessible language.",
  onb_3_action:           "Generate My Profile",
  buildProfile:           "Build Profile",
  startFromBasics:        "Let's start with your basic information",
  startFromBasicsSubtitle:"We'll generate your first analysis after this",
  stepOf:                 "{{current}} / {{total}}",
  calendarType:           "Calendar Type",
  solarLabel:             "Gregorian",
  lunarLabel:             "Lunar",
  calendarNote:           "Enter your birth data in the original calendar system to preserve calculation accuracy.",
  birthDate:              "Birth Date",
  birthTime:              "Birth Time",
  birthTimeHelper:        "Accurate birth time gives more precise results",
  birthPlace:             "Birth City",
  birthPlacePlaceholder:  "Country / City, e.g. China · Jinan",
  lunarYear:              "Lunar Year",
  lunarMonth:             "Lunar Month",
  lunarDay:               "Lunar Day",
  isLeapMonth:            "Leap Month?",
  yes:                    "Yes",
  no:                     "No",
  calculationOptions:     "Calculation Options",
  trueSolarTime:          "True Solar Time",
  trueSolarTimeNote:      "Corrects for longitude, approx. ±20 min",
  jieqiBoundary:          "Solar Term Boundary",
  jieqiBoundaryNote:      "Month pillar uses solar terms as boundary (traditional BaZi)",
  focusQuestion:          "What do you most want clarity on?",
  focusSubtitle:          "We'll prioritise content around your focus",
  focus_self:             "Self-Awareness",
  focus_career:           "Career & Direction",
  focus_relation:         "Relationships & Communication",
  focus_emotion:          "Emotions & State of Mind",
  focus_wealth:           "Wealth & Money Mindset",
  focus_romance:          "Romantic Relationships",
  focus_all:              "I want to see everything",
  roleQuestion:           "Which best describes your current situation?",
  roleSubtitle:           "This helps us present insights in a more relevant way",
  role_student:           "University Student",
  role_entrepreneur:      "Entrepreneur / Business Owner",
  role_office:            "Office Worker",
  role_professional:      "Professional",
  role_parent:            "Parent",
  role_transition:        "In Transition",
  role_other:             "Other",
  nickname:               "Nickname",
  nicknamePlaceholder:    "e.g. Alex",
  nicknameNote:           "Optional — used in home greeting",
  generatingTitle:        "Building Your Personal Profile",
  generating_step1:       "Saving your birth data",
  generating_step2:       "Calibrating calendar, timezone & solar terms",
  generating_step3:       "Generating your first-round modern reading",
  analysisResult:         "Analysis Result",
  firstRound:             "First-Round Results",
  resultTitle:            "Your First-Round Results",
  resultSubtitle:         "Don't rush to define yourself. First see, then understand.",
  currentFocus:           "Current Focus",
  currentRole:            "Current Role",
  birthInfo:              "Birth Info",
  continueToHome:         "Go to Home",
  unlockFull:             "Unlock Full",
  viewFullInsight:        "View Full Analysis",
  coreTraitTitle:         "Your Core Trait",
  currentStage:           "Your Current Stage",
  todayFocus:             "What to pay attention to today",
  homeGreeting:           "Hello, {{name}}",
  homeTagline:            "Today — understand yourself first, then decide where to go.",
  todayKeyword:           "Today's Keyword: {{keyword}}",
  viewFullAnalysis:       "View Full Analysis",
  stageSectionTitle:      "Your Current Stage",
  weeklyFocus:            "Weekly Focus",
  dailyQuote:             "Today's Insight",
  seeSelf:                "See Yourself",
  seeSelfSub:             "Core traits, strengths & blind spots",
  seeStage:               "Understand Your Stage",
  stageSub:               "Where you are & your rhythm",
  viewFull:               "View Full",
  viewFullSub:            "Unlock deeper analysis",
  myProfile:              "My Profile",
  myProfileSub:           "Manage data, records & settings",
  manage:                 "Manage",
  profileTabTitle:        "See Yourself",
  coreProfile:            "Core Profile",
  continueFullProfile:    "Continue to Full Profile",
  continueFullProfileBody:"Unlock full personal profile, stage map, relationship analysis & insights.",
  stageTabTitle:          "Understand Stage",
  stageMapTitle:          "Stage Map",
  last30Days:             "Next 30-Day Reminders",
  actionSuggestions:      "Action Suggestions",
  viewFullStageMap:       "View Full Stage Map",
  premiumTitle:           "Unlock Your Full Self",
  premiumSubtitle:        "Not just results — the reasons behind them and the path forward.",
  memberCenter:           "Member Centre",
  premiumFullProfile:     "Full Personal Profile",
  premiumStageMap:        "Stage Map",
  premiumWeekly:          "Weekly / Monthly Insights",
  premiumRelation:        "Relationship Analysis",
  premiumDeep:            "Deep Reading",
  premiumWuXing:          "Five Elements Radar",
  premiumPillars:         "Full BaZi Reading",
  premiumCompat:          "Compatibility Analysis",
  planMonthly:            "Monthly",
  planMonthlyDesc:        "Great for trying it out",
  planAnnual:             "Annual",
  planAnnualDesc:         "Best for long-term growth",
  planLifetime:           "Lifetime",
  planLifetimeDesc:       "One-time purchase, forever",
  recommended:            "Best Value",
  savingsLabel:           "Save {{pct}}%",
  trialLabel:             "{{days}}-day free trial",
  trialThenPrice:         "Then {{price}} {{period}} after {{days}} days",
  subscribeMonthly:       "Start Monthly Plan",
  subscribeAnnual:        "Start Annual Plan",
  subscribeLifetime:      "Get Lifetime Access",
  trialCta:               "Try Free for 7 Days",
  restorePurchase:        "Restore Purchase",
  privacyPolicy:          "Privacy Policy",
  termsOfService:         "Terms of Service",
  subscriptionLegal:      "Subscription auto-renews 24 hours before expiry. Cancel anytime.",
  subscriptionManage:     "Manage subscription in Me → Member Centre.",
  priceMonthly:           "$3.99 / mo",
  priceAnnual:            "$23.99 / yr",
  priceLifetime:          "$27.99",
  meTitle:                "Me",
  editProfile:            "Edit Profile",
  personalInfo:           "Personal Info",
  birthInfoItem:          "Birth Info",
  myRecords:              "My Records",
  notifications:          "Notification Settings",
  helpFeedback:           "Help & Feedback",
  langSwitch:             "Language",
  aboutApp:               "About MingMe",
  versionLabel:           "Version",
  logout:                 "Log Out",
  selectCity:             "Select Birth City",
  searchCity:             "Search city or country",
  overseasCities:         "Overseas Cities",
  clearSearch:            "Clear",
  paymentProcessing:      "Processing",
  paymentProcessingBody:  "Please wait, connecting to payment…",
  paymentWaiting:         "Awaiting Payment Confirmation",
  paymentWaitingBody:     "Please complete payment in the payment app",
  paymentSuccess:         "Payment Successful!",
  paymentSuccessBody:     "Your membership is now active. Welcome!",
  paymentFailed:          "Payment Failed",
  paymentFailedBody:      "Please check your connection and try again",
  paymentTimeout:         "Payment Timed Out",
  paymentTimeoutBody:     "If payment was completed, tap Restore Purchase",
  startUsing:             "Start Using",
  iKnow:                  "Got It",
  upgradeNow:             "Upgrade to Premium",
  notNow:                 "Not Now",
  unlockFeature:          "Upgrade to unlock {{feature}}",
  unlockFeatureBody:      "Get full profile, stage map & in-depth analysis with a premium plan.",
  restoreSuccess:         "Restored Successfully",
  restoreSuccessBody:     "Your membership has been restored",
  restoreEmpty:           "No Purchases Found",
  restoreEmptyBody:       "No restorable purchases found for this account",
  yearPillar:             "Year",
  monthPillar:            "Month",
  dayPillar:              "Day",
  hourPillar:             "Hour",
  dayMaster:              "Day Master",
  naYin:                  "Nayin",
  kongWang:               "Empty Branches",
  wuXing:                 "Five Elements",
  ganZhi:                 "Stems & Branches",
  zodiac:                 "Zodiac",
  wuxing_wood:            "Wood",
  wuxing_fire:            "Fire",
  wuxing_earth:           "Earth",
  wuxing_metal:           "Metal",
  wuxing_water:           "Water",
  jieqi_xiaohan:          "Minor Cold",
  jieqi_dahan:            "Major Cold",
  jieqi_lichun:           "Start of Spring",
  jieqi_yushui:           "Rain Water",
  jieqi_jingzhe:          "Awakening of Insects",
  jieqi_chunfen:          "Spring Equinox",
  jieqi_qingming:         "Clear and Bright",
  jieqi_guyu:             "Grain Rain",
  jieqi_lixia:            "Start of Summer",
  jieqi_xiaoman:          "Grain Buds",
  jieqi_mangzhong:        "Grain in Ear",
  jieqi_xiazhi:           "Summer Solstice",
  jieqi_xiaoshu:          "Minor Heat",
  jieqi_dashu:            "Major Heat",
  jieqi_liqiu:            "Start of Autumn",
  jieqi_chushu:           "End of Heat",
  jieqi_bailu:            "White Dew",
  jieqi_qiufen:           "Autumnal Equinox",
  jieqi_hanlu:            "Cold Dew",
  jieqi_shuangjiang:      "Frost's Descent",
  jieqi_lidong:           "Start of Winter",
  jieqi_xiaoxue:          "Minor Snow",
  jieqi_daxue:            "Major Snow",
  jieqi_dongzhi:          "Winter Solstice",
  daysToNextJieqi:        "{{days}} days to {{name}}",
  jieLabel:               "Jié",
  qiLabel:                "Qì",
  errorNetwork:           "Network error. Please check your connection.",
  errorServer:            "Server temporarily unavailable. Please try again later.",
  errorBirthDateRequired: "Please enter your birth date",
  errorBirthTimeRequired: "Please enter your birth time",
  errorBirthCityRequired: "Please select your birth city",
  errorUnknown:           "An unknown error occurred. Please try again.",
};

// ─────────────────────────────────────────────────────────────────────────────
// §5  TypeScript 类型安全 Key
// ─────────────────────────────────────────────────────────────────────────────

export type TranslationKey = keyof typeof zhHans;

// ─────────────────────────────────────────────────────────────────────────────
// §6  i18next 初始化
// ─────────────────────────────────────────────────────────────────────────────

i18n.use(initReactI18next).init({
  resources: {
    "zh-Hans": { translation: zhHans },
    "zh-Hant": { translation: zhHant },
    "en":      { translation: en     },
  },
  lng:           "zh-Hans",
  fallbackLng:   "zh-Hans",
  interpolation: { escapeValue: false },
  compatibilityJSON: "v3",
});

export default i18n;

// ─────────────────────────────────────────────────────────────────────────────
// §7  useLang() Hook — 语言切换 + AsyncStorage 持久化
// ─────────────────────────────────────────────────────────────────────────────

export function useLang() {
  const [lang, setLangState] = useState<Lang>(
    (i18n.language as Lang) ?? "zh-Hans"
  );

  // 启动时读取持久化语言
  useEffect(() => {
    AsyncStorage.getItem(LANG_STORAGE_KEY).then((stored) => {
      if (stored && ["zh-Hans", "zh-Hant", "en"].includes(stored)) {
        const l = stored as Lang;
        i18n.changeLanguage(l);
        setLangState(l);
      }
    });
  }, []);

  const setLang = useCallback(async (l: Lang) => {
    await i18n.changeLanguage(l);
    setLangState(l);
    await AsyncStorage.setItem(LANG_STORAGE_KEY, l);
  }, []);

  return { lang, setLang, langOptions: LANG_OPTIONS };
}

// ─────────────────────────────────────────────────────────────────────────────
// §8  城市数据库接入层
// ─────────────────────────────────────────────────────────────────────────────

export type CityRecord = {
  city:     string;
  lat:      number;
  lon:      number;
  tz:       string;
  province: string;   // 省份（大陆）或 country（海外）
  isGlobal: boolean;
};

// 扁平化城市列表（用于搜索）
let _flatCache: CityRecord[] | null = null;

export function getAllCities(): CityRecord[] {
  if (_flatCache) return _flatCache;

  const result: CityRecord[] = [];

  // 大陆城市
  const mainland = (citiesData as any).mainland as Record<
    string,
    Array<{ city: string; lat: number; lon: number; tz: string }>
  >;
  for (const [province, cities] of Object.entries(mainland)) {
    for (const c of cities) {
      result.push({ ...c, province, isGlobal: false });
    }
  }

  // 海外城市
  const global = (citiesData as any).global as Record<
    string,
    Array<{ city: string; country: string; lat: number; lon: number; tz: string }>
  >;
  for (const regionCities of Object.values(global)) {
    for (const c of regionCities) {
      result.push({
        city:     c.city,
        lat:      c.lat,
        lon:      c.lon,
        tz:       c.tz,
        province: c.country,
        isGlobal: true,
      });
    }
  }

  _flatCache = result;
  return result;
}

export function getMainlandProvinces(): string[] {
  return Object.keys((citiesData as any).mainland);
}

export function getCitiesByProvince(province: string): CityRecord[] {
  const data = (citiesData as any).mainland[province] ?? [];
  return data.map((c: any) => ({ ...c, province, isGlobal: false }));
}

export function getGlobalRegions(): string[] {
  return Object.keys((citiesData as any).global);
}

export function getCitiesByRegion(region: string): CityRecord[] {
  const data = (citiesData as any).global[region] ?? [];
  return data.map((c: any) => ({
    city:     c.city,
    lat:      c.lat,
    lon:      c.lon,
    tz:       c.tz,
    province: c.country,
    isGlobal: true,
  }));
}

export function searchCities(query: string): CityRecord[] {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  return getAllCities().filter(
    (c) =>
      c.city.includes(q) ||
      c.province.toLowerCase().includes(q)
  ).slice(0, 30);
}

export function getCityByName(city: string): CityRecord | undefined {
  return getAllCities().find((c) => c.city === city);
}

// ─────────────────────────────────────────────────────────────────────────────
// §9  使用示例
// ─────────────────────────────────────────────────────────────────────────────
/**
 * // 在 App.tsx 入口引入（确保 i18next 初始化）：
 * import "./src/i18n";
 *
 * // 在组件中使用：
 * import { useTranslation } from "react-i18next";
 * const { t } = useTranslation();
 * <Text>{t("appSlogan")}</Text>
 * <Text>{t("homeGreeting", { name: "Hugo" })}</Text>
 *
 * // 语言切换：
 * import { useLang } from "./src/i18n";
 * const { lang, setLang } = useLang();
 * await setLang("en");
 *
 * // 城市搜索：
 * import { searchCities, getCitiesByProvince } from "./src/i18n";
 * const results = searchCities("上海");
 * const shandong = getCitiesByProvince("山东省");
 */
