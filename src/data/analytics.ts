/**
 * 访问统计配置（GoatCounter：免费、无 cookie、无广告）
 *
 * 填法：在 https://www.goatcounter.com 注册后选定一个站点代码（如 zhumen），
 * 对应 https://zhumen.goatcounter.com，把代码填到 goatcounterSite。
 * 为空时不加载统计脚本、首页访客星图显示占位底图。
 * 另需在 GitHub 仓库 Settings → Secrets and variables → Actions 添加
 * GOATCOUNTER_TOKEN（Settings → API 里创建），供每日快照工作流取数。
 */
export const analytics = {
  /** GoatCounter 站点代码：如 'zhumen' */
  goatcounterSite: 'logic',
};
