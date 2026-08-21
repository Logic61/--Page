// 脉图数据 —— 只负责数据，不含任何布局或渲染逻辑。
// 修改这棵树的增删、路由、文案即可自动重绘整张脉图。

export const pulseTree = {
  id: 'origin',
  name: '巫祝始祖',
  type: 'origin',
  glyph: '巫',
  children: [
    {
      id: 'zhoufa',
      name: '咒法',
      type: 'major',
      glyph: '咒',
      route: '/zhoufa',
      children: [
        { id: 'zhudao', name: '祝祷', type: 'normal' },
        { id: 'zhuyou', name: '祝由', type: 'normal' },
        { id: 'yinji', name: '音诀', type: 'normal' },
      ],
    },
    {
      id: 'zhenqi',
      name: '真气治病',
      type: 'major',
      glyph: '气',
      route: '/zhenqi',
      children: [
        { id: 'waiqi', name: '外气', type: 'normal' },
        { id: 'shenqi', name: '神气', type: 'normal' },
        { id: 'jifa', name: '激发', type: 'normal' },
      ],
    },
    {
      id: 'oujing',
      name: '偶景',
      type: 'major',
      glyph: '景',
      route: '/oujing',
      children: [
        { id: 'neijing', name: '内景', type: 'normal' },
        { id: 'guanzhao', name: '观照', type: 'normal' },
        { id: 'shouyi', name: '守一', type: 'normal' },
      ],
    },
    {
      id: 'aozhan',
      name: '鏖战法',
      type: 'major',
      glyph: '战',
      route: '/aozhan',
      children: [
        { id: 'danji', name: '丹基', type: 'normal' },
        { id: 'fangzhong', name: '房中', type: 'normal' },
        { id: 'yangsheng', name: '养生', type: 'normal' },
      ],
    },
    {
      id: 'zhuyanshu',
      name: '驻颜术',
      type: 'major',
      glyph: '颜',
      route: '/zhuyanshu',
      children: [
        { id: 'zhuyan', name: '驻颜', type: 'normal' },
        { id: 'yangrong', name: '养容', type: 'normal' },
        { id: 'shengfa', name: '生发', type: 'normal' },
      ],
    },
  ],
};
