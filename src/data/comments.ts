/**
 * giscus 评论配置（GitHub Discussions 承载）
 *
 * 接入已完成：仓库已开启 Discussions，并已安装 giscus App（仅授权本站仓库）。
 * categoryId 取自 giscus.app 的分类接口，对应 Announcements 分类
 * （只允许 giscus 机器人开新帖，访客只能评论，防刷）。
 * categoryId 留空时，全站不会渲染评论区，也不会加载任何 giscus 脚本。
 */
export const giscus = {
  repo: 'Logic61/--Page',
  repoId: 'R_kgDOT61d7g',
  /** 讨论分类名：Announcements 只允许 giscus 机器人开新帖，访客只能评论，防刷 */
  category: 'Announcements',
  categoryId: 'DIC_kwDOT61d7s4DHZBj',
};
