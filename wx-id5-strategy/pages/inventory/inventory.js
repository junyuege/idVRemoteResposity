// 本地占位图（替换真实素材时，把此处改为 /images/items/xxx.png 或云存储 URL）
const PLACEHOLDER_ITEM = '/images/placeholder/item.png';

Page({
  data: { items: [], keyword: '' },
  onLoad() { this.loadItems(); },
  loadItems() {
    this.setData({
      items: [
        { id: 'i1', name: '远古遗物', rarity: 'purple', rarityClass: 'rarity-purple', price: 2800, image: PLACEHOLDER_ITEM },
        { id: 'i2', name: '金色怀表', rarity: 'orange', rarityClass: 'rarity-orange', price: 1500, image: PLACEHOLDER_ITEM },
        { id: 'i3', name: '精致瓷器', rarity: 'blue', rarityClass: 'rarity-blue', price: 800, image: PLACEHOLDER_ITEM },
        { id: 'i4', name: '古老铜币', rarity: 'green', rarityClass: 'rarity-green', price: 300, image: PLACEHOLDER_ITEM },
        { id: 'i5', name: '碎布片', rarity: 'white', rarityClass: 'rarity-white', price: 50, image: PLACEHOLDER_ITEM },
        { id: 'i6', name: '神秘符文', rarity: 'purple', rarityClass: 'rarity-purple', price: 3200, image: PLACEHOLDER_ITEM },
      ]
    });
  },
  onSearch(e) {
    const kw = (e.detail.value || '').trim().toLowerCase();
    this.setData({ keyword: kw });
    if (!kw) { this.loadItems(); return; }
    const all = JSON.parse(JSON.stringify(this.data.items));
    this.setData({ items: all.filter(i => i.name.toLowerCase().includes(kw)) });
  },
  clearSearch() { this.setData({ keyword: '' }); this.loadItems(); },
  onItemTap() { wx.showToast({ title: '详情开发中', icon: 'none' }); }
});