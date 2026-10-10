/**
 * 访问统计配置（GoatCounter，免费、无 cookie）
 *
 * 在 https://www.goatcounter.com 注册后选定一个站点代码（如 logic），
 * 对应 https://<代码>.goatcounter.com，把代码填到 goatcounterSite。
 * 为空时不加载统计脚本、首页访客星图显示占位底图。
 * 另需在 GitHub 仓库 Settings → Secrets and variables → Actions 添加
 * GOATCOUNTER_TOKEN（GoatCounter Settings → API 里创建，勾选 Read statistics），
 * 供每日快照工作流取数。
 *
 * 省州级明细（首页星图里中国省份/美国州点亮）：需在 GoatCounter 站点后台
 * Settings → Data collection 勾选 "Region"；采集范围默认美国/俄罗斯/中国
 * （collect_regions），其余国家只到国家级。
 */
export const analytics = {
  /** GoatCounter 站点代码：如 'logic' */
  goatcounterSite: 'logic',
};
