/**
 * 访问统计配置（均为免费、无 cookie 方案）
 *
 * GoatCounter：在 https://www.goatcounter.com 注册后选定一个站点代码（如 zhumen），
 * 对应 https://zhumen.goatcounter.com，把代码填到 goatcounterSite。
 * 为空时不加载统计脚本、首页访客星图显示占位底图。
 * 另需在 GitHub 仓库 Settings → Secrets and variables → Actions 添加
 * GOATCOUNTER_TOKEN（Settings → API 里创建），供每日快照工作流取数。
 *
 * MapMyVisitors：在 https://mapmyvisitors.com 注册站点后，把嵌入代码里的
 * d= 参数（公开密钥，非机密）填到 mapmyvisitorsWidgetKey。
 * 仅在页面加载其 widget_call_home.js 即完成计数（服务端按 IP 定位到城市），
 * 站点不渲染它的地图；城市数据由每日快照取回（scripts/snapshot-cities.mjs），
 * 画在首页访客星图的金图上。为空则不埋点。
 */
export const analytics = {
  /** GoatCounter 站点代码：如 'zhumen' */
  goatcounterSite: 'logic',
  /** MapMyVisitors 站点密钥（嵌入代码 src 里的 d= 参数）；为空则不埋点 */
  mapmyvisitorsWidgetKey: 'jifEa5wkGJle7rCzR78Wj3gsC9ebbUKEwiITXbd3qGA',
};
