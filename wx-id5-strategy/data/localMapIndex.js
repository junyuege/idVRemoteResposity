// data/localMapIndex.js (SSOT)
// 唯一真实数据源：地图路线、图鉴与辞章均维护在本文件。
// 页面请通过 data/api.js 读取，不要直接 require 本文件。
module.exports = {
  "version": "2.1",
  "inventoryData": [
  {
    "category": "anomaly",
    "id": "negligent_guard_hard",
    "name": "失职的看守-强化",
    "icon": "/images/inventory/anomaly/negligent_guard_hard.png",
    "description": "兼具远程威胁和追击能力的难缠敌人。同时，面对玩家的攻击，它能够遁入黑暗以进行有效的规避。",
    "counter": "当看见他开始挥舞锁链时，要注意横向移动或者蹲下来规避攻击，否则将被拉到他面前承受更大的威胁，你可能需要一些耐心来面对这个可怜的家伙。",
    "maps": ["困难", "噩梦"]
  },
  {
    "category": "anomaly",
    "id": "doom_stand_in",
    "name": "厄运替身",
    "icon": "/images/inventory/anomaly/doom_stand_in.png",
    "description": "厄运替身的攻击势大力沉，而且还会在远处对玩家发起冲锋。且蓄力冲锋命中玩家时，还会将玩家击飞。",
    "counter": "厄运替身作战请一定和它保持好距离。打不过的话也可以选择逃走。",
    "maps": ["新手", "简单", "普通", "困难", "噩梦"]
  },
  {
    "category": "anomaly",
    "id": "greedy_bandit_hard",
    "name": "贪婪的盗匪-强化",
    "icon": "/images/inventory/anomaly/greedy_bandit_hard.png",
    "description": "高高跃起，重击地面。对前方大范围地面区域造成范围伤害。蓄力时跃击还会将玩家击倒。",
    "counter": "尝试让自己的角色像异象那样高高跃起。或者尝试快速离开异象的攻击范围。",
    "maps": ["普通", "困难", "噩梦"]
  },
  {
    "category": "anomaly",
    "id": "silent_gentleman",
    "name": "缄默的绅士",
    "icon": "/images/inventory/anomaly/silent_gentleman.png",
    "description": "你可以和变身前的绅士交换一件物品，但是记住别吵到他。变身后的绅士会疯狂的追击玩家，并尝试用武器将玩家撕开。",
    "counter": "轻手轻脚，别吵到他。如果异象已经被激怒，请尝试逃走，或者呼叫支援。",
    "maps": ["简单", "普通", "困难", "噩梦"]
  },
  {
    "category": "anomaly",
    "id": "negligent_guard",
    "name": "失职的看守",
    "icon": "/images/inventory/anomaly/negligent_guard.png",
    "description": "兼具远程威胁和追击能力的难缠敌人。同时，面对玩家的攻击，它能够遁入黑暗以进行有效的规避。",
    "counter": "当看见他开始挥舞锁链时，要注意横向移动或者蹲下来规避攻击，否则将被拉到他面前承受更大的威胁，你可能需要一些耐心来面对这个可怜的家伙。",
    "maps": ["普通", "困难", "噩梦"]
  },
  {
    "category": "anomaly",
    "id": "mirror_memory",
    "name": "镜中回忆",
    "icon": "/images/inventory/anomaly/mirror_memory.png",
    "description": "镜子会孵化伴生渡鸦追击玩家。只要镜子没有被消灭，被击倒的渡鸦会再次复活。",
    "counter": "观察伴生渡鸦落下的羽毛，尝试找到并摧毁镜子。",
    "maps": ["简单", "普通", "困难", "噩梦"]
  },
  {
    "category": "anomaly",
    "id": "greedy_bandit",
    "name": "贪婪的盗匪",
    "icon": "/images/inventory/anomaly/greedy_bandit.png",
    "description": "高高跃起，重击地面。对前方大范围地面区域造成范围伤害。",
    "counter": "尝试让自己的角色像异象那样高高跃起。或者尝试快速离开异象的攻击范围。",
    "maps": ["简单", "普通", "困难", "噩梦"]
  },
  {
    "category": "anomaly",
    "id": "sigh_ball_hard",
    "name": "叹息球-强化",
    "icon": "/images/inventory/anomaly/sigh_ball_hard.png",
    "description": "通过附身玩家来造成伤害，多只气球附身时将对玩家产生控制效果。要小心它死亡之前会自爆来造成伤害。",
    "counter": "优先清理，单只叹息球并没有威胁能力，但要小心其成群出现，需要留意身旁每一个叹息球的位置。",
    "maps": ["新手", "简单", "普通", "困难", "噩梦"]
  },
  {
    "category": "anomaly",
    "id": "paper_pile",
    "name": "故纸堆",
    "icon": "/images/inventory/anomaly/paper_pile.png",
    "description": "故纸堆会指引玩家找到埋藏的辞章，但它会攻击不听从指引的玩家。",
    "counter": "当故纸堆在指引你时，注意不要离它太远。",
    "maps": ["简单", "普通", "困难", "噩梦"]
  },
  {
    "category": "anomaly",
    "id": "sigh_ball",
    "name": "叹息球",
    "icon": "/images/inventory/anomaly/sigh_ball.png",
    "description": "通过附身玩家来造成伤害，多只气球附身时将对玩家产生控制效果。要小心它死亡之前会自爆来造成伤害。",
    "counter": "优先清理，单只叹息球并没有威胁能力，但要小心其成群出现，需要留意身旁每一个叹息球的位置。",
    "maps": ["新手", "简单", "普通", "困难", "噩梦"]
  },
  {
    "category": "anomaly",
    "id": "clumsy_bandit",
    "name": "笨拙的盗匪",
    "icon": "/images/inventory/anomaly/clumsy_bandit.png",
    "description": "寻常的新手盗贼，会挥动简易的木板攻击玩家。",
    "counter": "记得带把武器防身，毕竟他手上有块木板。",
    "maps": ["新手", "简单", "普通", "困难", "噩梦"]
  },
  {
    "category": "anomaly",
    "id": "nameless_doll",
    "name": "无名布偶",
    "icon": "/images/inventory/anomaly/nameless_doll.png",
    "description": "无名布偶发现你后会尝试一直跟在你身边。无名布偶需要安抚，长时间被无视会变身成为厄运替身。",
    "counter": "安抚无名布偶。或者找一个机会提前解决这个潜在的隐患。",
    "maps": ["新手", "简单", "普通", "困难", "噩梦"]
  },
  {
    "category": "anomaly",
    "id": "doom_lady",
    "name": "厄运之女（异象）",
    "icon": "/images/inventory/anomaly/doom_lady.png",
    "description": "轻盈且锋利，优雅而致命。厄运之女会灵巧地运用自己的羽翼来造成伤害，注意躲避。",
    "counter": "合理利用场内建筑，躲避厄运之女的攻击。冷静判断形式，原路离开不失为一种选择。",
    "maps": ["噩梦"]
  },
  {
    "category": "anomaly",
    "id": "readers_musing",
    "name": "读者的揣摩",
    "icon": "/images/inventory/anomaly/readers_musing.png",
    "description": "读者的揣摩开始表演时，会强迫你观看演出。倘若你敬而远之或执意忽视，第一次会被施加减速，第二次则会彻底激怒它，引来攻击。",
    "counter": "当读者的揣摩靠近时，至少观看一次表演。它知道自己该何时退场。",
    "maps": ["噩梦"]
  },
  {
    "category": "anomaly",
    "id": "readers_review",
    "name": "读者的审阅",
    "icon": "/images/inventory/anomaly/readers_review.png",
    "description": "读者的审阅将会标记有误的情节，并不停歇地审阅每个角落。倘若无法在它的审阅中做出正确选择，便会遭到无情的剔除。",
    "counter": "根据读者的审阅的瞳孔收缩，及时做出选择。当它开始标记时，记得保持完全静止，避免被它发觉。",
    "maps": ["噩梦"]
  },
  {
    "category": "anomaly",
    "id": "collector_puppet",
    "name": "拾遗木偶",
    "icon": "/images/inventory/anomaly/collector_puppet.png",
    "description": "拾遗木偶会依据你给予物品的价值，将你传送到特定地点。善意的交换可以换取进入拾遗宝库的机会；若选择击败木偶，则会遭到惩罚。",
    "counter": "对拾遗木偶友好些！尽量用高价值物品换取更好的传送机会。",
    "maps": ["噩梦"]
  },
  {
    "category": "anomaly",
    "id": "collapsed_bookshelf",
    "name": "倾颓书架",
    "icon": "/images/inventory/anomaly/collapsed_bookshelf.png",
    "description": "倾颓书架大部分的躯体都坚不可摧，擅长挥动修长的四肢发起攻击。",
    "counter": "攻击躯体很难对倾颓书架造成足够的伤害，试试看直接命中那本翻开的书。",
    "maps": ["噩梦"]
  },
  {
    "category": "anomaly",
    "id": "flagstaff_ghost",
    "name": "旗杆阴兵",
    "icon": "/images/inventory/anomaly/flagstaff_ghost.png",
    "description": "旗杆阴兵难以察觉静止的对象，但对于移动的目标更加敏感。在被号角阴兵鼓舞后，还会使出更强力的招式。",
    "counter": "在被旗杆阴兵发现之前原地静止，一旦进入战斗，注意躲避他的攻击。",
    "maps": ["普通", "困难"]
  },
  {
    "category": "anomaly",
    "id": "horn_ghost",
    "name": "号角阴兵",
    "icon": "/images/inventory/anomaly/horn_ghost.png",
    "description": "号角阴兵能够大范围感知移动中或发出声响的对象。当发现目标后，他便会吹响号角，让周围的所有异象朝向该位置巡逻。",
    "counter": "缓慢移动或者原地静止以消除号角阴兵的警戒值。当发现号角阴兵的位置时，优先击败他。",
    "maps": ["困难"]
  },
  {
    "category": "material",
    "id": "loaded_shotgun",
    "name": "上膛的猎枪",
    "icon": "/images/inventory/material/loaded_shotgun.png",
    "quality": "稀世",
    "type": "进攻",
    "value": 50000,
    "weight": "3kg",
    "durability": "24/24",
    "description": "可以发射出若干弹丸进行攻击，伤害随距离的增加而衰减。"
  },
  {
    "category": "material",
    "id": "rest_seal",
    "name": "小憩闲章",
    "icon": "/images/inventory/material/rest_seal.png",
    "quality": "稀世",
    "type": "探索",
    "value": 50000,
    "weight": "1kg",
    "durability": "无耐久",
    "description": "使用小憩闲章后，可以将自己传送返回整备大厅。"
  },
  {
    "category": "material",
    "id": "burning_resentment",
    "name": "燃烧的怨恨",
    "icon": "/images/inventory/material/burning_resentment.png",
    "quality": "稀世",
    "type": "进攻",
    "value": 25000,
    "weight": "3kg",
    "durability": "100/100",
    "description": "可以持续发射火焰灼烧目标并造成伤害，持续灼烧会赋予目标燃烧状态，处于燃烧状态下的目标血量将持续降低。额外效果：可发射一道强焰对灼烧目标造成爆燃效果。"
  },
  {
    "category": "material",
    "id": "eye_of_lies",
    "name": "谎言之眼",
    "icon": "/images/inventory/material/eye_of_lies.png",
    "quality": "稀世",
    "type": "探索",
    "value": 25000,
    "weight": "3kg",
    "durability": "100/100",
    "description": "使用谎言之眼后，可以获得强化视野，在黑暗中辨清前路。"
  },
  {
    "category": "material",
    "id": "forgotten_faith",
    "name": "被遗忘的信仰",
    "icon": "/images/inventory/material/forgotten_faith.png",
    "quality": "奇珍",
    "type": "进攻",
    "value": 20000,
    "weight": "3kg",
    "durability": "无耐久",
    "description": "可以挥动进行横扫攻击，也可以消耗体力蓄力进行突刺攻击。额外效果：使用被遗忘的信仰招架攻击，招架成功后自动发起一次攻击并恢复一定体力。"
  },
  {
    "category": "material",
    "id": "guardian_staff",
    "name": "庇护者之杖",
    "icon": "/images/inventory/material/guardian_staff.png",
    "quality": "奇珍",
    "type": "进攻",
    "value": 15000,
    "weight": "3kg",
    "durability": "无耐久",
    "description": "可以挥动或蓄力向前方进行攻击。额外效果：将庇护者之杖向前方掷出，对范围内的异象造成伤害，并降低其移动与转向速度。"
  },
  {
    "category": "material",
    "id": "sniff_box",
    "name": "提神嗅盒",
    "icon": "/images/inventory/material/sniff_box.png",
    "quality": "奇珍",
    "type": "探索",
    "value": 8000,
    "weight": "1kg",
    "durability": "100/100",
    "description": "使用提神嗅盒后，可以进入警醒状态。在状态持续期间，可获得一定速度的加成，并降低体力消耗。"
  },
  {
    "category": "material",
    "id": "blessing_bell",
    "name": "祝祷铃",
    "icon": "/images/inventory/material/blessing_bell.png",
    "quality": "奇珍",
    "type": "辅助",
    "value": 6000,
    "weight": "1kg",
    "durability": "100/100",
    "description": "使用祝祷铃后，可以使坠入故事深处的队友重新返回探索。"
  },
  {
    "category": "material",
    "id": "incense_stove",
    "name": "祝祷烟炉",
    "icon": "/images/inventory/material/incense_stove.png",
    "quality": "独特",
    "type": "辅助",
    "value": 4000,
    "weight": "1kg",
    "durability": "无耐久",
    "description": "携带祝祷烟炉时，可以在危机时刻抵挡一次致命伤害。"
  },
  {
    "category": "material",
    "id": "first_aid_needle",
    "name": "急救针",
    "icon": "/images/inventory/material/first_aid_needle.png",
    "quality": "独特",
    "type": "辅助",
    "value": 4000,
    "weight": "1kg",
    "durability": "100/100",
    "description": "携带急救针时，可以在受伤状态下治疗自己，治疗成功即可恢复一定生命值。"
  },
  {
    "category": "material",
    "id": "lantern",
    "name": "提灯",
    "icon": "/images/inventory/material/lantern.png",
    "quality": "独特",
    "type": "探索",
    "value": 4000,
    "weight": "1kg",
    "durability": "100/100",
    "description": "使用提灯后，可以照亮前方一片区域，持续揭示附近的黑暗。"
  },
  {
    "category": "material",
    "id": "dancing_taunt",
    "name": "跃动的嘲弄",
    "icon": "/images/inventory/material/dancing_taunt.png",
    "quality": "独特",
    "type": "辅助",
    "value": 3500,
    "weight": "1kg",
    "durability": "无耐久",
    "description": "投掷出跃动的嘲弄后，可以在投掷点生成幻影。幻影将持续挑衅，吸引异象攻击，直至幻影被击败或持续时间结束。此时幻影将被引爆，减速范围内异象。"
  },
  {
    "category": "material",
    "id": "past_echo",
    "name": "旧日回声",
    "icon": "/images/inventory/material/past_echo.png",
    "quality": "奇珍",
    "type": "辅助",
    "value": 12000,
    "weight": "3kg",
    "durability": "100/100",
    "description": "携带旧日回声时，可以将其放置在任意地点并播放乐曲。乐曲生效范围内，异象无法进入，也无法对异象造成伤害。指明方向的同时，是否也在黑暗中揭露着你所处的位置？"
  }
],
  "chapterData": [
  {
    "category": "chapter",
    "id": "beizuzhou_de_lanshibao",
    "name": "被诅咒的蓝宝石",
    "quality": "华彩",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/beizuzhou_de_lanshibao.png",
    "weight": "1",
    "price": 600000,
    "map": "厄运之女",
    "description": "一条璀璨到异常的蓝宝石项链，吊坠背面用稍显稚嫩的笔触刻写下奇怪的谜题。\n我始于深渊\nI start in the deep\n我藏于花蕊\nI hide in the bloom\n我终于瑰宝\nI end in the gem\n我是谁\nwho am I"
  },
  {
    "category": "chapter",
    "id": "jinbei",
    "name": "金杯",
    "quality": "稀世",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/jinbei.png",
    "weight": "25",
    "price": 200000,
    "map": "厄运之女",
    "description": "繁复的花纹终将褪去，表面的镀金也被时光风蚀。唯有杯中盛放的金币仍旧闪耀，四叶草的花纹仍旧熠熠生辉。"
  },
  {
    "category": "chapter",
    "id": "hongshanhu",
    "name": "红珊瑚",
    "quality": "稀世",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/hongshanhu.png",
    "weight": "10",
    "price": 150000,
    "map": "厄运之女",
    "description": "它被从水中捞出，镶嵌上同一艘捕捞船带回港口的珍珠。流动的银包裹残缺的身体，珊瑚自此不曾嗅过海风。"
  },
  {
    "category": "chapter",
    "id": "huangjin_canye",
    "name": "黄金残页",
    "quality": "稀世",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/huangjin_canye.png",
    "weight": "25",
    "price": 100000,
    "map": "厄运之女",
    "description": "一卷沉甸甸的黄金卷轴，页面上錾刻着繁复的花纹与无人能辨识的符文。"
  },
  {
    "category": "chapter",
    "id": "yinzhi_de_teerpuxikerui_de_diaoxiang",
    "name": "银质的忒耳普西科瑞的雕像",
    "quality": "稀世",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/yinzhi_de_teerpuxikerui_de_diaoxiang.png",
    "weight": "24",
    "price": 40000,
    "map": "厄运之女",
    "description": "忒耳普西科瑞演奏着她的七弦琴，缪斯已然降临。"
  },
  {
    "category": "chapter",
    "id": "yinzhi_de_yeying_zhutai",
    "name": "银质的夜莺烛台",
    "quality": "稀世",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/yinzhi_de_yeying_zhutai.png",
    "weight": "20",
    "price": 20000,
    "map": "厄运之女",
    "description": "白色的蜡烛仍在燃烧，将银质的烛台照得纤毫毕现。夜莺，夜莺，你将为谁而歌唱？"
  },
  {
    "category": "chapter",
    "id": "henda_de_youhua",
    "name": "很大的油画",
    "quality": "奇珍",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/henda_de_youhua.png",
    "weight": "20",
    "price": 15000,
    "map": "厄运之女",
    "description": "富丽堂皇的鎏金画框，这类大幅尺寸的油画常常被作为艺术品收藏，没人知道它到底价值几何。"
  },
  {
    "category": "chapter",
    "id": "youling_shuijing",
    "name": "幽灵水晶",
    "quality": "奇珍",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/youling_shuijing.png",
    "weight": "15",
    "price": 14000,
    "map": "厄运之女",
    "description": "千万年前造地运动的产物，那团白色的幽灵始终如影随形。"
  },
  {
    "category": "chapter",
    "id": "guiwawa",
    "name": "鬼娃娃",
    "quality": "奇珍",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/guiwawa.png",
    "weight": "10",
    "price": 12000,
    "map": "厄运之女",
    "description": "蜂蜜色的卷发，白色的蕾丝裙。这一切是如此熟悉，她看着你，却无法告诉你，她到底是谁。"
  },
  {
    "category": "chapter",
    "id": "miusi_de_mimi",
    "name": "缪斯的秘密",
    "quality": "奇珍",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/miusi_de_mimi.png",
    "weight": "20",
    "price": 10000,
    "map": "厄运之女",
    "description": "空荡荡的木龛，顶部雕刻着一只栖息在枝叶上的夜莺。交还属于它的秘密，让夜莺开始歌唱吧。"
  },
  {
    "category": "chapter",
    "id": "tianye",
    "name": "添页",
    "quality": "奇珍",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/tianye.png",
    "weight": "7",
    "price": 10000,
    "map": "厄运之女",
    "description": "手记中抽离出的单独一页，边缘略有残缺，纸面上的塞壬之歌符号是一份坦荡的自我陈词。它并不隶属任何故事，只负责呈现一种全新的视角。（可用于进入加页手记监管者模式）"
  },
  {
    "category": "chapter",
    "id": "jintangshao",
    "name": "金汤勺",
    "quality": "奇珍",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/jintangshao.png",
    "weight": "4",
    "price": 8000,
    "map": "厄运之女",
    "description": "一只金质的汤勺，勺柄末端花纹舒展。光洁如新，甚至可以照出人影。"
  },
  {
    "category": "chapter",
    "id": "zibaoshi_jiezhi",
    "name": "紫宝石戒指",
    "quality": "奇珍",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/zibaoshi_jiezhi.png",
    "weight": "1",
    "price": 8000,
    "map": "厄运之女",
    "description": "一枚古典简洁的戒指，镶嵌着足够分量的紫色宝石。曾经用于象征身份与地位，不再是了。"
  },
  {
    "category": "chapter",
    "id": "shuiguopan",
    "name": "水果盘",
    "quality": "奇珍",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/shuiguopan.png",
    "weight": "8",
    "price": 7000,
    "map": "厄运之女",
    "description": "时间同等公平地倾轧着水果盘与水果。金属尚能抵挡锈蚀的困扰，果实却早已腐烂殆尽。"
  },
  {
    "category": "chapter",
    "id": "shoushihe",
    "name": "首饰盒",
    "quality": "奇珍",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/shoushihe.png",
    "weight": "8",
    "price": 5000,
    "map": "厄运之女",
    "description": "精美华贵的银色首饰盒，微微张开布满灰尘与蛛网的嘴，盒里早已空空如也。"
  },
  {
    "category": "chapter",
    "id": "huguang",
    "name": "弧光",
    "quality": "奇珍",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/huguang.png",
    "weight": "1",
    "price": 5000,
    "map": "厄运之女",
    "description": "一支金色羽毛笔，翎羽有些凌乱。黄铜笔杆上刻一朵最常见的鸢尾，银质笔尖锋锐。它仿佛从未蘸过墨水，又仿佛刚刚写完了什么。（可用于加页手记武器洗练）"
  },
  {
    "category": "chapter",
    "id": "gubao_zhuangshi_kaijia_toukui",
    "name": "古堡装饰铠甲头盔",
    "quality": "独特",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/gubao_zhuangshi_kaijia_toukui.png",
    "weight": "15",
    "price": 5000,
    "map": "厄运之女",
    "description": "装饰用的骑士头盔，面罩上镂空雕刻着繁复的纹饰。它早已锈迹斑斑，却依旧有着沉重的威严。"
  },
  {
    "category": "chapter",
    "id": "menpai",
    "name": "门牌",
    "quality": "独特",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/menpai.png",
    "weight": "10",
    "price": 4200,
    "map": "厄运之女",
    "description": "小猫正等着主人归来。它不知道门牌上的号码与回家的方向都早已模糊。"
  },
  {
    "category": "chapter",
    "id": "xiangkuang",
    "name": "相框",
    "quality": "独特",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/xiangkuang.png",
    "weight": "3",
    "price": 3000,
    "map": "厄运之女",
    "description": "鎏金相框里有一张看不清面目的照片。那是谁，承载着谁的回忆？"
  },
  {
    "category": "chapter",
    "id": "fugu_de_zhongbiao",
    "name": "复古的钟表",
    "quality": "独特",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/fugu_de_zhongbiao.png",
    "weight": "8",
    "price": 2700,
    "map": "厄运之女",
    "description": "有些磨损的木质钟表，表盘碎裂在那一刻——仿佛时间也停驻。"
  },
  {
    "category": "chapter",
    "id": "polie_muban",
    "name": "破裂木板",
    "quality": "独特",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/polie_muban.png",
    "weight": "5",
    "price": 2000,
    "map": "厄运之女",
    "description": "你抢走了他的最后一块木板！可惜，没能顺手拿到这块木板的使用秘诀。"
  },
  {
    "category": "chapter",
    "id": "laoshi_meiyoudeng",
    "name": "老式煤油灯",
    "quality": "独特",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/laoshi_meiyoudeng.png",
    "weight": "6",
    "price": 1600,
    "map": "厄运之女",
    "description": "煤油熏黑了它的脸颊，幸好碎裂的玻璃外罩漏出了更多的灯火。"
  },
  {
    "category": "chapter",
    "id": "tangguoguan",
    "name": "糖果罐",
    "quality": "独特",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/tangguoguan.png",
    "weight": "6",
    "price": 1600,
    "map": "厄运之女",
    "description": "透明的糖果罐里藏着曾经甜蜜的时光，灰尘和霉菌爬满透明身躯，它再不会被打开了。"
  },
  {
    "category": "chapter",
    "id": "jiuyijia",
    "name": "旧衣架",
    "quality": "独特",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/jiuyijia.png",
    "weight": "5",
    "price": 1200,
    "map": "厄运之女",
    "description": "被遗忘在房间角落的空衣架，从未被挂过衣物，所以它一直认为自己是根插在地上的长矛。"
  },
  {
    "category": "chapter",
    "id": "xiaoshuzhuangjing",
    "name": "小梳妆镜",
    "quality": "独特",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/xiaoshuzhuangjing.png",
    "weight": "8",
    "price": 1000,
    "map": "厄运之女",
    "description": "椭圆形的小梳妆镜，碎裂的镜面扭曲着任何倒影。"
  },
  {
    "category": "chapter",
    "id": "xinzhidui",
    "name": "信纸堆",
    "quality": "独特",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/xinzhidui.png",
    "weight": "3",
    "price": 800,
    "map": "厄运之女",
    "description": "寄往各地的信件被规整收拢在一起，绳索陷入松软的牛皮纸边沿，落款字迹无法辨认。"
  },
  {
    "category": "chapter",
    "id": "shalou",
    "name": "沙漏",
    "quality": "独特",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/shalou.png",
    "weight": "3",
    "price": 600,
    "map": "厄运之女",
    "description": "装有砂砾的木质沙漏，满是污渍的碎裂玻璃中，暗黄色的沙子静滞在那段时光。"
  },
  {
    "category": "chapter",
    "id": "ganhua",
    "name": "干花",
    "quality": "独特",
    "group": "常规辞章",
    "icon": "/images/inventory/chapter/ganhua.png",
    "weight": "1",
    "price": 300,
    "map": "厄运之女",
    "description": "一束干枯的花，枯萎的叶片托举着尚未凋零的花瓣，包裹它们的报纸字迹模糊不清。"
  },
  {
    "category": "chapter",
    "id": "guixi",
    "name": "鬼玺",
    "quality": "稀世",
    "group": "联动辞章",
    "icon": "/images/inventory/chapter/guixi.png",
    "weight": "25",
    "price": 500000,
    "map": "厄运之女",
    "description": "一方古朴厚重的青玉古玺，表面雕刻着繁复的纹样。雕工精细，出神入化，数只小鬼栩栩如生，扭转攀爬间，似乎组合成了神兽的轮廓。但若是将玉玺再换个角度端详，那钮上的形状就又变了个模样。"
  },
  {
    "category": "chapter",
    "id": "shemei_tongyu",
    "name": "蛇眉铜鱼",
    "quality": "稀世",
    "group": "联动辞章",
    "icon": "/images/inventory/chapter/shemei_tongyu.png",
    "weight": "15",
    "price": 250000,
    "map": "厄运之女",
    "description": "三条造型各异的蛇眉铜鱼，构成了一只首尾相连的环。"
  },
  {
    "category": "chapter",
    "id": "pingzhuang_youhuo",
    "name": "瓶装幽火",
    "quality": "稀世",
    "group": "联动辞章",
    "icon": "/images/inventory/chapter/pingzhuang_youhuo.png",
    "weight": "5",
    "price": 500000,
    "map": "厄运之女",
    "description": "火焰塑造出便于隐匿的样貌，想要照照镜子吗？"
  },
  {
    "category": "chapter",
    "id": "wuhui_mianju",
    "name": "舞会面具",
    "quality": "稀世",
    "group": "联动辞章",
    "icon": "/images/inventory/chapter/wuhui_mianju.png",
    "weight": "10",
    "price": 300000,
    "map": "厄运之女",
    "description": "纯金铸成的面具，镀上柔白的色彩。它更适合出现在灯火、舞步、乐曲与衣香鬓影间，被覆盖的面孔下，藏着另一重不愿被认出的身份。"
  },
  {
    "category": "chapter",
    "id": "chahu",
    "name": "茶壶",
    "quality": "稀世",
    "group": "联动辞章",
    "icon": "/images/inventory/chapter/chahu.png",
    "weight": "15",
    "price": 80000,
    "map": "厄运之女",
    "description": "融合了东方韵味与维多利亚风情的茶壶。青色的花草被细致的镶金包裹，来自两种文化的技艺在它身上交汇，浑然一体，相得益彰。"
  },
  {
    "category": "chapter",
    "id": "dantong_wangyuanjing",
    "name": "单筒望远镜",
    "quality": "奇珍",
    "group": "联动辞章",
    "icon": "/images/inventory/chapter/dantong_wangyuanjing.png",
    "weight": "12",
    "price": 10000,
    "map": "厄运之女",
    "description": "镜片中仍清楚映着那些遥远的事物。只是那些遥远的地方，它已经很久没去过了。"
  },
  {
    "category": "chapter",
    "id": "eyun_de_kuizeng",
    "name": "厄运的馈赠",
    "quality": "奇珍",
    "group": "联动辞章",
    "icon": "/images/inventory/chapter/eyun_de_kuizeng.png",
    "weight": "1",
    "price": 10000,
    "map": "厄运之女",
    "description": "夜莺留在原地的一份小小礼物。如今，她仍旧拥有的已经所剩无几，其中有意愿又能够分享的，也多半无法离开这座庄园。"
  },
  {
    "category": "chapter",
    "id": "cangbaotu",
    "name": "藏宝图",
    "quality": "奇珍",
    "group": "联动辞章",
    "icon": "/images/inventory/chapter/cangbaotu.png",
    "weight": "8",
    "price": 9000,
    "map": "厄运之女",
    "description": "卷起的藏宝图是一条不肯开口的秘密，有人想找到终点，有人更在意它沉默的原因。"
  },
  {
    "category": "chapter",
    "id": "yinshu",
    "name": "银梳",
    "quality": "奇珍",
    "group": "联动辞章",
    "icon": "/images/inventory/chapter/yinshu.png",
    "weight": "4",
    "price": 8000,
    "map": "厄运之女",
    "description": "无论头发多少、长短、是什么颜色、有什么形状、甚至是不是头发，都应该有一柄自己的梳子。"
  },
  {
    "category": "chapter",
    "id": "shuihu",
    "name": "水壶",
    "quality": "独特",
    "group": "联动辞章",
    "icon": "/images/inventory/chapter/shuihu.png",
    "weight": "8",
    "price": 5000,
    "map": "厄运之女",
    "description": "污垢只存在于玻璃的外层，这真的是一壶可以饮用的清水！"
  },
  {
    "category": "chapter",
    "id": "posun_de_wanou",
    "name": "破损的玩偶",
    "quality": "独特",
    "group": "联动辞章",
    "icon": "/images/inventory/chapter/posun_de_wanou.png",
    "weight": "4",
    "price": 2000,
    "map": "厄运之女",
    "description": "玩偶失去了一条胳膊，它永远不想你也落入同样的境地。"
  }
],
  "maps": [
  {
    "id": "e_yun_zhi_nv",
    "displayName": "厄运之女",
    "difficulty": "核心攻略",
    "coverImage": "/images/placeholder/cover.png",
    "sourceAnchor": "F:/d5/第五人格加页手记（超清4k，宝藏房 ）/厄运之女（展十版）/",
    "authors": [
      {
        "id": "zhanshi",
        "name": "展十版"
      },
      {
        "id": "lianghapi",
        "name": "凉哈皮版"
      }
    ],
    "routes": [
      {
          "id": "zhanshi-hard-full",
          "legacyIds": [
            "hard"
          ],
          "difficulty": "hard",
          "variant": "full",
          "authorId": "zhanshi",
          "name": "困难 · 全棺版13.0",
          "author": "展十版",
          "packageRoot": "pkg-zhanshi-hard-full",
          "assetNamespace": "maps/e_yun_zhi_nv/zhanshi/hard-full",
          "shapeDir": "厄运困难（超清4k，展十版）/厄运困难（超清4k，全棺路线，展十版）全棺版13.0",
          "shapes": [
            "┏",
            "┗",
            "┣",
            "┳",
            "▁┃━",
            "▃▃",
            "▌",
            "横Y"
          ],
          "shapeDetails": {
            "┏": {
              "doors": [
                {
                  "door": "侧门在下",
                  "files": [
                    "右路.jpg"
                  ]
                },
                {
                  "door": "侧门在右",
                  "files": [
                    "上路下路 下┓.jpg",
                    "上路下路 下▃▃.jpg"
                  ]
                }
              ]
            },
            "┗": {
              "doors": [
                {
                  "door": "侧门在上",
                  "files": [
                    "右路 右▍.jpg",
                    "右路.jpg",
                    "左路右路.jpg"
                  ]
                }
              ],
              "rootFiles": [
                "侧门在右.jpg",
                "侧门在中.jpg"
              ]
            },
            "┣": {
              "rootFiles": [
                "侧门在下   左路右路.jpg"
              ]
            },
            "┳": {
              "rootFiles": [
                "侧门在上.jpg"
              ]
            },
            "▁┃━": {
              "rootFiles": [
                "侧门在上   左路右路下路.jpg"
              ]
            },
            "▃▃": {
              "doors": [
                {
                  "door": "侧门在右",
                  "files": [
                    "上路下路.jpg",
                    "下路左路.jpg",
                    "左路.jpg"
                  ]
                },
                {
                  "door": "侧门在左",
                  "files": [
                    "上路右路.jpg",
                    "右路  右丨   右下┣.jpg",
                    "右路  右丨   右下十▃▃.jpg",
                    "右路 右丨   右下十丨.jpg",
                    "右路 右丨   右下楼梯.jpg",
                    "右路2 右▌（左下楼梯间，右红房间）.jpg",
                    "右路3 右▃▃.jpg",
                    "右路4 右凹.jpg"
                  ]
                }
              ]
            },
            "▌": {
              "doors": [
                {
                  "door": "侧门在上",
                  "files": [
                    "下路.jpg",
                    "下路2.jpg",
                    "左路右路下路.jpg"
                  ]
                },
                {
                  "door": "侧门在下",
                  "files": [
                    "左路上路.jpg",
                    "左路右路2.jpg",
                    "左路右路上路.jpg"
                  ]
                }
              ]
            },
            "横Y": {
              "doors": [
                {
                  "door": "侧门在斜左上",
                  "files": [
                    "斜左下路右路 右┣.jpg",
                    "斜左下路右路 右■.jpg"
                  ]
                }
              ]
            }
          },
          "rootFiles": []
        },
      {
          "id": "zhanshi-hard-fast",
          "legacyIds": [
            "hard_fast"
          ],
          "difficulty": "hard",
          "variant": "fast",
          "authorId": "zhanshi",
          "name": "困难 · 速刷版12.9",
          "author": "展十版",
          "packageRoot": "pkg-zhanshi-hard-fast",
          "assetNamespace": "maps/e_yun_zhi_nv/zhanshi/hard-fast",
          "shapeDir": "厄运困难（超清4k，展十版）/厄运困难（超清4k，速刷路线，展十版）速刷版12.9",
          "shapes": [
            "┏",
            "┗",
            "┣",
            "┳",
            "▁┃━",
            "▃▃",
            "▌",
            "横Y"
          ],
          "shapeDetails": {
            "┏": {
              "doors": [
                {
                  "door": "侧门在下",
                  "files": [
                    "右路.jpg"
                  ]
                },
                {
                  "door": "侧门在右",
                  "files": [
                    "上路下路 下┓.jpg",
                    "上路下路 下▃▃.jpg"
                  ]
                }
              ]
            },
            "┗": {
              "doors": [
                {
                  "door": "侧门在上",
                  "files": [
                    "右路 右▍.jpg",
                    "右路.jpg",
                    "左路右路.jpg"
                  ]
                }
              ],
              "rootFiles": [
                "侧门在右.jpg",
                "侧门在中.jpg"
              ]
            },
            "┣": {
              "doors": [
                {
                  "door": "侧门在下",
                  "files": [
                    "左路右路.jpg"
                  ]
                }
              ]
            },
            "┳": {
              "rootFiles": [
                "侧门在上.jpg"
              ]
            },
            "▁┃━": {
              "doors": [
                {
                  "door": "侧门在上",
                  "files": [
                    "左路右路下路.jpg"
                  ]
                }
              ]
            },
            "▃▃": {
              "doors": [
                {
                  "door": "侧门在右",
                  "files": [
                    "上路下路.jpg",
                    "下路左路.jpg",
                    "左路.jpg"
                  ]
                },
                {
                  "door": "侧门在左",
                  "files": [
                    "上路右路（下可能随机刷新宝藏房）.jpg",
                    "右路  右丨   右下┣.jpg",
                    "右路  右丨   右下十▃▃.jpg",
                    "右路 右丨   右下十丨.jpg",
                    "右路 右丨   右下楼梯.jpg",
                    "右路3 右▃▃.jpg",
                    "右路3 右▌（右红房间）.jpg",
                    "右路4 右凹.jpg"
                  ]
                }
              ]
            },
            "▌": {
              "doors": [
                {
                  "door": "侧门在上",
                  "files": [
                    "下路.jpg",
                    "下路2.jpg",
                    "左路右路下路.jpg"
                  ]
                },
                {
                  "door": "侧门在下",
                  "files": [
                    "左路上路.jpg",
                    "左路右路2.jpg",
                    "左路右路上路.jpg"
                  ]
                }
              ]
            },
            "横Y": {
              "doors": [
                {
                  "door": "侧门在斜左上",
                  "files": [
                    "斜左下路右路 右┣.jpg",
                    "斜左下路右路 右■.jpg"
                  ]
                }
              ]
            }
          },
          "rootFiles": []
        },
      {
        "id": "zhanshi-normal",
        "legacyIds": [
          "normal"
        ],
        "difficulty": "normal",
        "authorId": "zhanshi",
        "name": "普通 · 7.5",
        "author": "展十版",
        "packageRoot": "pkg-zhanshi-normal",
        "legacyCloudPackage": "pkg-normal",
        "assetNamespace": "maps/e_yun_zhi_nv/zhanshi/normal",
        "shapeDir": "厄运普通（超清4k，宝藏房，展十版）7.5",
        "shapes": [
          "┏",
          "┓",
          "┗",
          "┳",
          "▁┃━",
          "▃▃",
          "▄█▀",
          "▌",
          "十",
          "横Y"
        ],
        "shapeDetails": {
          "┏": {
            "doors": [
              {
                "door": "侧门在下",
                "files": [
                  "右路.jpg",
                  "右路2（左┗）.jpg"
                ]
              }
            ]
          },
          "┓": {
            "doors": [
              {
                "door": "侧门在左",
                "files": [
                  "下路.jpg"
                ]
              }
            ]
          },
          "┗": {
            "doors": [
              {
                "door": "侧门在上",
                "files": [
                  "左路右路.jpg"
                ]
              },
              {
                "door": "侧门在右",
                "files": [
                  "上路.jpg"
                ]
              }
            ]
          },
          "┳": {
            "doors": [
              {
                "door": "左路右路",
                "files": [
                  "左路右路.jpg"
                ]
              }
            ]
          },
          "▁┃━": {
            "doors": [
              {
                "door": "侧门在上",
                "files": [
                  "左路右路.jpg"
                ]
              },
              {
                "door": "侧门在左",
                "files": [
                  "上路下路.jpg"
                ]
              }
            ]
          },
          "▃▃": {
            "doors": [
              {
                "door": "侧门在右",
                "files": [
                  "左路.jpg",
                  "左路2.jpg"
                ]
              },
              {
                "door": "侧门在左",
                "files": [
                  "右路2（右[）.jpg",
                  "右路下路.jpg",
                  "右路（右┍）.jpg",
                  "右路（右▃▃）.jpg"
                ]
              }
            ]
          },
          "▄█▀": {
            "doors": [
              {
                "door": "侧门在左",
                "files": [
                  "右路.jpg"
                ]
              }
            ]
          },
          "▌": {
            "doors": [
              {
                "door": "左路右路下路",
                "files": [
                  "左路右路下路.jpg"
                ]
              }
            ]
          },
          "十": {
            "doors": [
              {
                "door": "上路下路右路",
                "files": [
                  "上路下路右路.jpg"
                ]
              }
            ]
          },
          "横Y": {
            "doors": [
              {
                "door": "侧门在左斜上",
                "files": [
                  "左斜下路右路.jpg"
                ]
              }
            ]
          }
        },
        "rootFiles": []
      },
      {
        "id": "zhanshi-easy",
        "legacyIds": [
          "easy"
        ],
        "difficulty": "easy",
        "authorId": "zhanshi",
        "name": "简单 · 7.5",
        "author": "展十版",
        "packageRoot": "pkg-zhanshi-easy",
        "legacyCloudPackage": "pkg-easy",
        "assetNamespace": "maps/e_yun_zhi_nv/zhanshi/easy",
        "shapeDir": "厄运简单（超清4k，宝藏房，展十版）7.5",
        "shapes": [
          "┏",
          "┓",
          "┗",
          "┛",
          "▁┃━",
          "▃▃",
          "▄█▀",
          "▌",
          "十",
          "横Y"
        ],
        "shapeDetails": {
          "┏": {
            "doors": [
              {
                "door": "侧门在右",
                "files": [
                  "左路下路.jpg"
                ]
              }
            ]
          },
          "┓": {
            "doors": [
              {
                "door": "侧门在上中",
                "files": [
                  "左路下路.jpg"
                ]
              },
              {
                "door": "侧门在左",
                "files": [
                  "下路.jpg",
                  "下路2.jpg"
                ]
              }
            ]
          },
          "┗": {
            "doors": [
              {
                "door": "侧门在上",
                "files": [
                  "左路右路.jpg"
                ]
              },
              {
                "door": "侧门在右",
                "files": [
                  "上路.jpg"
                ]
              }
            ]
          },
          "┛": {
            "doors": [
              {
                "door": "侧门在上",
                "files": [
                  "左路.jpg"
                ]
              }
            ]
          },
          "▁┃━": {
            "doors": [
              {
                "door": "左路右路",
                "files": [
                  "左路右路.jpg"
                ]
              }
            ]
          },
          "▃▃": {
            "doors": [
              {
                "door": "侧门在右",
                "files": [
                  "左路2（左匚）.jpg",
                  "左路3（左┫）.jpg",
                  "左路下路.jpg",
                  "左路（左▌）.jpg"
                ]
              },
              {
                "door": "侧门在左",
                "files": [
                  "右路（右白）.jpg",
                  "右路（右红）（上下可能刷新宝藏房）.jpg"
                ]
              }
            ]
          },
          "▄█▀": {
            "doors": [
              {
                "door": "侧门在左",
                "files": [
                  "下路右路.jpg"
                ]
              }
            ]
          },
          "▌": {
            "doors": [
              {
                "door": "左路右路下路",
                "files": [
                  "左路右路下路.jpg"
                ]
              }
            ]
          },
          "十": {
            "doors": [
              {
                "door": "上路下路",
                "files": [
                  "上路下路.jpg"
                ]
              }
            ]
          },
          "横Y": {
            "doors": [
              {
                "door": "侧门在左斜上",
                "files": [
                  "左斜下路右路.jpg"
                ]
              }
            ]
          }
        },
        "rootFiles": []
      },
      {
        "id": "zhanshi-newbie",
        "legacyIds": [
          "newbie"
        ],
        "difficulty": "newbie",
        "authorId": "zhanshi",
        "name": "新手 · 6.18",
        "author": "展十版",
        "packageRoot": "pkg-zhanshi-newbie",
        "legacyCloudPackage": "pkg-newbie",
        "assetNamespace": "maps/e_yun_zhi_nv/zhanshi/newbie",
        "shapeDir": "厄运新手（超清4k，宝藏房，展十版）6.18",
        "shapes": [],
        "shapeDetails": {},
        "rootFiles": [
          "目前全部只有一张.jpg"
        ]
      },
{
          "id": "zhanshi-nightmare-full",
          "legacyIds": [],
          "difficulty": "nightmare",
          "variant": "full",
          "authorId": "zhanshi",
          "name": "噩梦 · 全棺版13.4",
          "author": "展十版",
          "packageRoot": "pkg-zhanshi-nightmare-full",
          "assetNamespace": "maps/e_yun_zhi_nv/zhanshi/nightmare-full",
          "shapeDir": "厄运噩梦（超清4k，展十版）/厄运噩梦（超清4k，全棺路线，展十版）全棺版13.4",
          "shapes": [
            "┏",
            "┗",
            "┫",
            "┳",
            "▃▃",
            "▌",
            "ㅢ一"
          ],
          "shapeDetails": {
            "┏": {
              "rootFiles": [
                "下路   下Z.jpg",
                "下路   下ㅢ一.jpg"
              ]
            },
            "┗": {
              "rootFiles": [
                "上路.jpg",
                "右路（二号路线）.jpg",
                "右路（一号路线）.jpg",
                "右路两张图解释.jpg"
              ]
            },
            "┫": {
              "rootFiles": [
                "上路左路.jpg",
                "上路左路右路.jpg"
              ]
            },
            "┳": {
              "rootFiles": [
                "左路下路.jpg"
              ]
            },
            "▃▃": {
              "rootFiles": [
                "左路.jpg"
              ]
            },
            "▌": {
              "rootFiles": [
                "下路右路.jpg",
                "下路左路.jpg",
                "左路右路.jpg"
              ]
            },
            "ㅢ一": {
              "rootFiles": [
                "左路上路下路.jpg",
                "左路下路右路.jpg"
              ]
            }
          },
          "rootFiles": [
            "噩梦全棺版看法图文教学.jpg"
          ]
        },
{
          "id": "zhanshi-nightmare",
          "legacyIds": [],
          "difficulty": "nightmare",
          "authorId": "zhanshi",
          "name": "噩梦 · 速刷版13.4",
          "author": "展十版",
          "packageRoot": "pkg-zhanshi-nightmare",
          "assetNamespace": "maps/e_yun_zhi_nv/zhanshi/nightmare",
          "shapeDir": "厄运噩梦（超清4k，展十版）/厄运噩梦（超清4k，速刷路线，展十版）速刷版13.4",
          "shapes": [
            "上右路",
            "上左右路",
            "上左路",
            "左右路"
          ],
          "shapeDetails": {
            "上右路": {
              "rootFiles": [
                "上右路   右┻┳.jpg",
                "上右路   右┻┳2.jpg",
                "上右路   右▃▃.jpg",
                "上右路   右一.jpg"
              ]
            },
            "上左右路": {
              "rootFiles": [
                "上左右路   右I.jpg",
                "上左右路   右s.jpg",
                "上左右路  右└┐.jpg"
              ]
            },
            "上左路": {
              "rootFiles": [
                "上左路   上红┫.jpg",
                "上左路   上红┫2.jpg",
                "上左路   上I.jpg"
              ]
            },
            "左右路": {
              "rootFiles": [
                "左右路   右┛.jpg",
                "左右路   右┛2.jpg",
                "左右路   右s.jpg"
              ]
            }
          },
          "rootFiles": [
            "速刷版看法图文教学.jpg"
          ],
          "variant": "fast"
        },
      {
        "id": "lianghapi-v0710",
        "legacyIds": [
          "v0710"
        ],
        "difficulty": "special",
        "variant": "v0710",
        "authorId": "lianghapi",
        "name": "7.10 新版",
        "author": "凉哈皮版",
        "packageRoot": "pkg-lianghapi-v0710",
        "assetNamespace": "maps/e_yun_zhi_nv/lianghapi/v0710",
        "entryMode": "fileIcons",
        "iconPackageRoot": "pkg-lianghapi-icons",
        "iconNamespace": "maps/e_yun_zhi_nv/lianghapi/v0710/icons",
        "sourceAnchor": "F:/d5/加页手记地图（07.10更新）",
        "shapeDir": "",
        "shapes": [
          "北",
          "南",
          "左",
          "右"
        ],
        "shapeDetails": {
          "北": {
            "doors": [],
            "rootFiles": [
              "北-1门.jpg",
              "北-1沙发门（新增）.jpg",
              "北-4安全门（新增）.jpg",
              "北-4门.jpg",
              "北-凹门.jpg",
              "北-红对角门.jpg",
              "北-红门.jpg",
              "北-T门.jpg"
            ]
          },
          "南": {
            "doors": [],
            "rootFiles": [
              "南-红门.jpg",
              "南-三缺一门.jpg",
              "南-十字门.jpg",
              "南-L门.jpg",
              "南-orz门（新增）.jpg"
            ]
          },
          "左": {
            "doors": [],
            "rootFiles": [
              "左-锤灯笼门（新增）.jpg",
              "左-锤子门.jpg",
              "左-倒T门.jpg",
              "左-对角门.jpg",
              "左-对T门.jpg",
              "左-罐子门.jpg",
              "左-音叉门.jpg",
              "左-Y门.jpg",
              "左-Y青蛙房（新增）.jpg"
            ]
          },
          "右": {
            "doors": [],
            "rootFiles": [
              "右-锤子门.jpg",
              "右-骑士门.jpg",
              "右-三L门（新增）.jpg",
              "右-双L门.jpg",
              "右-左上右下门.jpg",
              "右-L门.jpg"
            ]
          }
        },
        "rootFiles": []
      }
    ]
  }
]
};
