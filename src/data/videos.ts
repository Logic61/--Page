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
  /** 英文题名（与 title 对应） */
  titleEn: string;
  /** B 站原始标题 */
  raw: string;
  /** 发布日期 YYYY-MM-DD */
  date: string;
  /** 时长（秒） */
  secs: number;
  /** 附加标记，如「合集」 */
  badge?: string;
  /** 标记的英文（如「合集」→ Collection） */
  badgeEn?: string;
  /** 抖音作品 id（aweme_id） */
  douyin?: string;
  /** 快手作品 id（photoId） */
  kuaishou?: string;
}

export interface VideoGroup {
  /** 分组短标，如「序」「二」「三」 */
  tag: string;
  name: string;
  nameEn: string;
  note: string;
  noteEn: string;
  videos: Video[];
}

export const collectionUrl = 'https://space.bilibili.com/471124175/lists/4453923?type=season';
export const collectionTitle = '上古道家隐传秘传体系认知';
export const collectionTitleEn = 'The Hidden and Secret System of the Ancient Daoist Transmission';
export const collectionAuthor = '巫-鸿';
export const collectionAuthorEn = 'Wu-Hong';
export const kuaishouProfile = 'https://www.kuaishou.com/profile/3xia9t48h3vzmpy';
export const douyinProfile = 'https://www.douyin.com/user/MS4wLjABAAAAOivd5KuZq5KKIFfR3PaW12OH_TbXNjw5sI9EJ0mNe6mp4_3YeIhwMtjwjXwe0DoG';

export const videoUrl = (bvid: string) => `https://www.bilibili.com/video/${bvid}`;
export const douyinUrl = (id: string) => `https://www.douyin.com/video/${id}`;
export const kuaishouUrl = (id: string) => `https://www.kuaishou.com/short-video/${id}`;

export const groups: VideoGroup[] = [
  {
    tag: '序',
    name: '通识五讲',
    nameEn: 'The Five General Talks',
    note: '先辨道家为何物、来历如何，再说修道之事。',
    noteEn: 'First, what the Daoist school is and where it came from; then the matter of cultivating the Dao.',
    videos: [
      { bvid: 'BV1kLmbYGExv', title: '道家历史', titleEn: 'History of the Daoist School', raw: '道家历史（仅供娱乐，无不良引导）', date: '2024-11-12', secs: 294 },
      { bvid: 'BV1E3meYnERz', title: '道家、道教与百家', titleEn: 'The Daoist School, Daoist Religion, and the Hundred Schools', raw: '道家，道教与百家（仅供娱乐，无不良引导）', date: '2024-11-12', secs: 417 },
      { bvid: 'BV1AvmXY2Ef4', title: '道家器物：玉的变化', titleEn: 'Daoist Implements: The Transformations of Jade', raw: '道家器物:玉的变化', date: '2024-11-15', secs: 9 },
      { bvid: 'BV1HHB8YREy1', title: '自古修道者的来历 · 现代人可以修道吗', titleEn: 'The Origins of Cultivators Past · Can Modern People Cultivate?', raw: '自古修道者的来历，现代人可以修道吗？（仅供娱乐，无不良引导）', date: '2024-11-24', secs: 2512 },
      { bvid: 'BV1FSBYYwEXi', title: '大众学道次序', titleEn: 'The Order of Learning the Dao for the Many', raw: '大众学道次序（无论不良引导，仅供娱乐）', date: '2024-11-25', secs: 32 },
    ],
  },
  {
    tag: '二',
    name: '第二课 · 学道之人',
    nameEn: 'Lesson Two · Those Who Learn the Dao',
    note: '从古代贵族与百姓的差别，讲到今日求道者能走的路。',
    noteEn: 'From the gulf between ancient nobles and commoners, to the roads open to seekers today.',
    videos: [
      { bvid: 'BV17LBYY4EeJ', title: '二.2 带入王室的没落，百姓的生活', titleEn: 'II.2 The Decline Brought into the Royal House, and the Life of the Common People', raw: '二.2道家基础认知 带入王室的没落，百姓的生活。古代贵族与百姓的对比', date: '2024-11-25', secs: 673 },
      { bvid: 'BV1BBzMY4E7Z', title: '二.3 古往今来修道有所成的身份', titleEn: 'II.3 The Stations of Those Who Succeeded in Cultivation, Past and Present', raw: '二.3道家基础认知古往今来修道有所成的身份（仅供娱乐，无不良引导）', date: '2024-11-26', secs: 135 },
      { bvid: 'BV1XqBDYPEro', title: '二.4 历来学艺者的付费行为', titleEn: 'II.4 How Learners of Arts Have Paid Across the Ages', raw: '二.4道家基础认知历来学艺者的付费行为（仅供娱乐，无不良引导）', date: '2024-11-26', secs: 447, douyin: '7441719398081056040' },
      { bvid: 'BV1vxBZYREJG', title: '二.5 修道有所成者的身份总结', titleEn: 'II.5 A Summary of the Stations of Successful Cultivators', raw: '二.5:道家基础认知，古往今来修道有所成者的身份总结（仅供娱乐，无不良引导）', date: '2024-11-27', secs: 52, douyin: '7442113360545451316' },
      { bvid: 'BV1opBZYoEsw', title: '二.6 现代人修道能走的路', titleEn: 'II.6 The Roads Modern People Can Walk in Cultivation', raw: '二.6:道家基础认知，现代人修道能走的路（仅供娱乐，无不良引导）', date: '2024-11-28', secs: 140, douyin: '7442118386932387106' },
      { bvid: 'BV1vvziYAEiG', title: '二.7 修道几小问', titleEn: 'II.7 A Few Small Questions on Cultivation', raw: '二.7:道家基础认知修道几小问（仅供娱乐，无不良引导）', date: '2024-11-29', secs: 52, douyin: '7442484584861748514' },
    ],
  },
  {
    tag: '三',
    name: '第三课 · 道法体系',
    nameEn: 'Lesson Three · The System of Dao-Methods',
    note: '道法何以成体系：存思、存神、精思、导引、服食、内丹，逐一辨明。',
    noteEn: 'How the Dao-methods form a system: cunsi, cunshen, jingsi, daoyin, fushi and inner alchemy, each distinguished in turn.',
    videos: [
      { bvid: 'BV14z6wYxEbZ', title: '三.1 道家传承的传播方式', titleEn: 'III.1 How the Daoist Transmission Spreads', raw: '第三课，道家基础认知三.1:道家传承的传播方式（仅供娱乐，无不良引导）', date: '2024-12-02', secs: 137, douyin: '7443661439136484643' },
      { bvid: 'BV1LK6NY1Ev3', title: '三.2 道家完成的传承', titleEn: 'III.2 The Completed Transmissions of the Daoist School', raw: '道家基础认知 三.2道家完成的传承（仅供娱乐，无不良引导）', date: '2024-12-02', secs: 461, douyin: '7443697293695421730' },
      { bvid: 'BV1vQzyYWEpt', title: '三.3 修道主要提升哪几个方面', titleEn: 'III.3 What Aspects Cultivation Chiefly Raises', raw: '道家基础认知三.3:修道主要提升哪几个方面？（仅供娱乐，无不良引导）', date: '2024-12-02', secs: 123 },
      { bvid: 'BV14Tz1YVEkZ', title: '三.4 古往今来的道法体系 · 总说', titleEn: 'III.4 The System of Dao-Methods Past and Present · General Account', raw: '道家基础认知三.4:古往今来的道法体系（仅供娱乐，无不良引导）', date: '2024-12-03', secs: 175 },
      { bvid: 'BV1CUzXYtEgN', title: '三.4.1 存思', titleEn: 'III.4.1 Cunsi — Meditative Visualization', raw: '道家基础认知三.4.1:古往今来的道法体系之——存思（无不良引导，仅供娱乐）', date: '2024-12-03', secs: 41, douyin: '7444336476285881635' },
      { bvid: 'BV1KyzXYwEJq', title: '三.4.2 存神', titleEn: 'III.4.2 Cunshen — Dwelling on the Spirit', raw: '道家基础认知三.4.2:古往今来的道法体系之——存神（仅供娱乐，无不良引导）', date: '2024-12-04', secs: 20, douyin: '7444340323645410594' },
      { bvid: 'BV1C2zXYfEQC', title: '三.4.3 精思', titleEn: 'III.4.3 Jingsi — Refined Reflection', raw: '道家基础认知三.4.3:古往今来的道法体系之——精思（无不良引导，仅供娱乐）', date: '2024-12-04', secs: 20, douyin: '7444345819467189519' },
      { bvid: 'BV1fjzXYJEVn', title: '三.4.4 导引', titleEn: 'III.4.4 Daoyin — Guiding and Drawing', raw: '道家基础认知三.4.4:古往今来的道法体系之——导引（仅供娱乐，无不良引导）', date: '2024-12-04', secs: 120 },
      { bvid: 'BV12ViQYQEsE', title: '三.4.5 服食', titleEn: 'III.4.5 Fushi — Ingesting Substances', raw: '道家基础认知三.4.5:古往今来的道法体系之——服食（仅供娱乐，无不良引导）', date: '2024-12-04', secs: 397, douyin: '7444699184315354403' },
      { bvid: 'BV1QAiQYbE8F', title: '三.4.6 服食 · 续', titleEn: 'III.4.6 Fushi — Continued', raw: '道家基础认知三.4.6:古往今来的道法体系之——服食仅供娱乐，无不良引导）', date: '2024-12-04', secs: 310 },
      { bvid: 'BV1CHiQYjEEK', title: '三.4.7 内丹', titleEn: 'III.4.7 Inner Alchemy', raw: '道家基础认知三.4.7:古往今来的道法体系之——内丹（仅供娱乐，无不良引导）', date: '2024-12-04', secs: 100, douyin: '7444706570685975860' },
      { bvid: 'BV1rsiQY5Ev4', title: '三.4 古往今来的道法体系 · 合集全', titleEn: 'III.4 The System of Dao-Methods Past and Present · Complete Collection', raw: '道家基础认知三.4:古往今来的道法体系之——（合集全）【仅供娱乐，无不良引导】', date: '2024-12-04', secs: 796, badge: '合集', badgeEn: 'Collection' },
      { bvid: 'BV1xCiRYfEcq', title: '三.5 略论古今之人的求道态度', titleEn: 'III.5 A Brief Word on the Attitudes of Seekers, Then and Now', raw: '道家基础认知三.5:略论古今之人的求道态度（仅供参考，无不良引导）', date: '2024-12-05', secs: 535 },
      { bvid: 'BV1zdiaYHEpy', title: '三.6 略论师寻徒传', titleEn: 'III.6 A Brief Word on Masters Seeking Disciples and Passing the Teaching', raw: '道家基础认知三.6:略论师寻徒传（无不良引导，仅供娱乐）', date: '2024-12-06', secs: 529 },
      { bvid: 'BV1ZYi6YuEuJ', title: '三.7 论现实求道困难', titleEn: 'III.7 On the Difficulties of Seeking the Dao in the Real World', raw: '道家基础认知三.7:论现实求道困难', date: '2024-12-06', secs: 208 },
    ],
  },
  {
    tag: '四',
    name: '第四课 · 外求与内求',
    nameEn: 'Lesson Four · Outer Seeking and Inner Seeking',
    note: '修道体系的两大类型：向外求法与向内求法。',
    noteEn: 'The two great types of the cultivation system: seeking outward and seeking inward.',
    videos: [
      { bvid: 'BV1wqqnYfEpw', title: '修道体系两大类型：外求法与内求法', titleEn: 'The Two Great Types of the Cultivation System: Outer-Seeking and Inner-Seeking', raw: '道家基础认知第四课:修道体系量大类型分别外求法和内求法（无不良引导，仅供娱乐）', date: '2024-12-08', secs: 354 },
    ],
  },
  {
    tag: '申',
    name: '择人申明',
    nameEn: 'A Declaration on Choosing Candidates',
    note: '一门之规矩，收束全篇。',
    noteEn: 'The rules of the gate, closing the whole series.',
    videos: [
      { bvid: 'BV1dJqBYPECM', title: '上古隐传秘传道家择人申明', titleEn: 'A Declaration on Choosing Candidates from the Hidden and Secret Daoist Transmission of High Antiquity', raw: '上古隐传秘传道家择人申明（仅供娱乐，无不良引导）', date: '2024-12-13', secs: 26 },
    ],
  },
];
