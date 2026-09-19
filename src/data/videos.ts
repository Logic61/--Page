// 《上古道家隐传秘传体系认知》多平台视频数据
// B 站合集：https://space.bilibili.com/471124175/lists/4453923?type=season （UP：巫-鸿）
// 快手主页：https://www.kuaishou.com/profile/3xia9t48h3vzmpy
// 抖音主页：https://www.douyin.com/user/MS4wLjABAAAAOivd5KuZq5KKIFfR3PaW12OH_TbXNjw5sI9EJ0mNe6mp4_3YeIhwMtjwjXwe0DoG
// 共 28 讲，按课程次序（发布时间正序）排列，序号即讲次。
// raw 为 B 站原始标题（仅用于悬停提示），title 为页面上精简后的题名。
// douyin / kuaishou 为该讲在对应平台的作品 id，未同步到该平台的讲次留空。

export interface Video {
  /** B 站 BV 号 */
  bvid: string;
  /** 页面显示的精简题名 */
  title: string;
  /** B 站原始标题 */
  raw: string;
  /** 发布日期 YYYY-MM-DD */
  date: string;
  /** 时长（秒） */
  secs: number;
  /** 附加标记，如「合集」 */
  badge?: string;
  /** 抖音作品 id（aweme_id） */
  douyin?: string;
  /** 快手作品 id（photoId） */
  kuaishou?: string;
}

export interface VideoGroup {
  /** 分组短标，如「序」「二」「三」 */
  tag: string;
  name: string;
  note: string;
  videos: Video[];
}

export const collectionUrl = 'https://space.bilibili.com/471124175/lists/4453923?type=season';
export const collectionTitle = '上古道家隐传秘传体系认知';
export const collectionAuthor = '巫-鸿';
export const kuaishouProfile = 'https://www.kuaishou.com/profile/3xia9t48h3vzmpy';
export const douyinProfile = 'https://www.douyin.com/user/MS4wLjABAAAAOivd5KuZq5KKIFfR3PaW12OH_TbXNjw5sI9EJ0mNe6mp4_3YeIhwMtjwjXwe0DoG';

export const videoUrl = (bvid: string) => `https://www.bilibili.com/video/${bvid}`;
export const douyinUrl = (id: string) => `https://www.douyin.com/video/${id}`;
export const kuaishouUrl = (id: string) => `https://www.kuaishou.com/short-video/${id}`;

export const groups: VideoGroup[] = [
  {
    tag: '序',
    name: '通识五讲',
    note: '先辨道家为何物、来历如何，再说修道之事。',
    videos: [
      { bvid: 'BV1kLmbYGExv', title: '道家历史', raw: '道家历史（仅供娱乐，无不良引导）', date: '2024-11-12', secs: 294 },
      { bvid: 'BV1E3meYnERz', title: '道家、道教与百家', raw: '道家，道教与百家（仅供娱乐，无不良引导）', date: '2024-11-12', secs: 417 },
      { bvid: 'BV1AvmXY2Ef4', title: '道家器物：玉的变化', raw: '道家器物:玉的变化', date: '2024-11-15', secs: 9 },
      { bvid: 'BV1HHB8YREy1', title: '自古修道者的来历 · 现代人可以修道吗', raw: '自古修道者的来历，现代人可以修道吗？（仅供娱乐，无不良引导）', date: '2024-11-24', secs: 2512 },
      { bvid: 'BV1FSBYYwEXi', title: '大众学道次序', raw: '大众学道次序（无论不良引导，仅供娱乐）', date: '2024-11-25', secs: 32 },
    ],
  },
  {
    tag: '二',
    name: '第二课 · 学道之人',
    note: '从古代贵族与百姓的差别，讲到今日求道者能走的路。',
    videos: [
      { bvid: 'BV17LBYY4EeJ', title: '二.2 带入王室的没落，百姓的生活', raw: '二.2道家基础认知 带入王室的没落，百姓的生活。古代贵族与百姓的对比', date: '2024-11-25', secs: 673 },
      { bvid: 'BV1BBzMY4E7Z', title: '二.3 古往今来修道有所成的身份', raw: '二.3道家基础认知古往今来修道有所成的身份（仅供娱乐，无不良引导）', date: '2024-11-26', secs: 135 },
      { bvid: 'BV1XqBDYPEro', title: '二.4 历来学艺者的付费行为', raw: '二.4道家基础认知历来学艺者的付费行为（仅供娱乐，无不良引导）', date: '2024-11-26', secs: 447, douyin: '7441719398081056040' },
      { bvid: 'BV1vxBZYREJG', title: '二.5 修道有所成者的身份总结', raw: '二.5:道家基础认知，古往今来修道有所成者的身份总结（仅供娱乐，无不良引导）', date: '2024-11-27', secs: 52, douyin: '7442113360545451316' },
      { bvid: 'BV1opBZYoEsw', title: '二.6 现代人修道能走的路', raw: '二.6:道家基础认知，现代人修道能走的路（仅供娱乐，无不良引导）', date: '2024-11-28', secs: 140, douyin: '7442118386932387106' },
      { bvid: 'BV1vvziYAEiG', title: '二.7 修道几小问', raw: '二.7:道家基础认知修道几小问（仅供娱乐，无不良引导）', date: '2024-11-29', secs: 52, douyin: '7442484584861748514' },
    ],
  },
  {
    tag: '三',
    name: '第三课 · 道法体系',
    note: '道法何以成体系：存思、存神、精思、导引、服食、内丹，逐一辨明。',
    videos: [
      { bvid: 'BV14z6wYxEbZ', title: '三.1 道家传承的传播方式', raw: '第三课，道家基础认知三.1:道家传承的传播方式（仅供娱乐，无不良引导）', date: '2024-12-02', secs: 137, douyin: '7443661439136484643' },
      { bvid: 'BV1LK6NY1Ev3', title: '三.2 道家完成的传承', raw: '道家基础认知 三.2道家完成的传承（仅供娱乐，无不良引导）', date: '2024-12-02', secs: 461, douyin: '7443697293695421730' },
      { bvid: 'BV1vQzyYWEpt', title: '三.3 修道主要提升哪几个方面', raw: '道家基础认知三.3:修道主要提升哪几个方面？（仅供娱乐，无不良引导）', date: '2024-12-02', secs: 123 },
      { bvid: 'BV14Tz1YVEkZ', title: '三.4 古往今来的道法体系 · 总说', raw: '道家基础认知三.4:古往今来的道法体系（仅供娱乐，无不良引导）', date: '2024-12-03', secs: 175 },
      { bvid: 'BV1CUzXYtEgN', title: '三.4.1 存思', raw: '道家基础认知三.4.1:古往今来的道法体系之——存思（无不良引导，仅供娱乐）', date: '2024-12-03', secs: 41, douyin: '7444336476285881635' },
      { bvid: 'BV1KyzXYwEJq', title: '三.4.2 存神', raw: '道家基础认知三.4.2:古往今来的道法体系之——存神（仅供娱乐，无不良引导）', date: '2024-12-04', secs: 20, douyin: '7444340323645410594' },
      { bvid: 'BV1C2zXYfEQC', title: '三.4.3 精思', raw: '道家基础认知三.4.3:古往今来的道法体系之——精思（无不良引导，仅供娱乐）', date: '2024-12-04', secs: 20, douyin: '7444345819467189519' },
      { bvid: 'BV1fjzXYJEVn', title: '三.4.4 导引', raw: '道家基础认知三.4.4:古往今来的道法体系之——导引（仅供娱乐，无不良引导）', date: '2024-12-04', secs: 120 },
      { bvid: 'BV12ViQYQEsE', title: '三.4.5 服食', raw: '道家基础认知三.4.5:古往今来的道法体系之——服食（仅供娱乐，无不良引导）', date: '2024-12-04', secs: 397, douyin: '7444699184315354403' },
      { bvid: 'BV1QAiQYbE8F', title: '三.4.6 服食 · 续', raw: '道家基础认知三.4.6:古往今来的道法体系之——服食仅供娱乐，无不良引导）', date: '2024-12-04', secs: 310 },
      { bvid: 'BV1CHiQYjEEK', title: '三.4.7 内丹', raw: '道家基础认知三.4.7:古往今来的道法体系之——内丹（仅供娱乐，无不良引导）', date: '2024-12-04', secs: 100, douyin: '7444706570685975860' },
      { bvid: 'BV1rsiQY5Ev4', title: '三.4 古往今来的道法体系 · 合集全', raw: '道家基础认知三.4:古往今来的道法体系之——（合集全）【仅供娱乐，无不良引导】', date: '2024-12-04', secs: 796, badge: '合集' },
      { bvid: 'BV1xCiRYfEcq', title: '三.5 略论古今之人的求道态度', raw: '道家基础认知三.5:略论古今之人的求道态度（仅供参考，无不良引导）', date: '2024-12-05', secs: 535 },
      { bvid: 'BV1zdiaYHEpy', title: '三.6 略论师寻徒传', raw: '道家基础认知三.6:略论师寻徒传（无不良引导，仅供娱乐）', date: '2024-12-06', secs: 529 },
      { bvid: 'BV1ZYi6YuEuJ', title: '三.7 论现实求道困难', raw: '道家基础认知三.7:论现实求道困难', date: '2024-12-06', secs: 208 },
    ],
  },
  {
    tag: '四',
    name: '第四课 · 外求与内求',
    note: '修道体系的两大类型：向外求法与向内求法。',
    videos: [
      { bvid: 'BV1wqqnYfEpw', title: '修道体系两大类型：外求法与内求法', raw: '道家基础认知第四课:修道体系量大类型分别外求法和内求法（无不良引导，仅供娱乐）', date: '2024-12-08', secs: 354 },
    ],
  },
  {
    tag: '申',
    name: '择人申明',
    note: '一门之规矩，收束全篇。',
    videos: [
      { bvid: 'BV1dJqBYPECM', title: '上古隐传秘传道家择人申明', raw: '上古隐传秘传道家择人申明（仅供娱乐，无不良引导）', date: '2024-12-13', secs: 26 },
    ],
  },
];
