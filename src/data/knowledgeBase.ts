import type { KnowledgePoint } from '@/types'

/* ==================================================================
 * 初中数理知识点库
 *
 * 组织方式对齐实战题背景原文：「按学科—知识点—题型组织，覆盖初中数学与物理」。
 * 教材定位一律按**人教版**（原型里学生选的也是人教版）。
 *
 * ── 这张网是拿来干什么的 ────────────────────────────────────
 * 「识别并**持续跟进**薄弱知识点」——「跟进」需要一个稳定的追踪单元。
 * 没有这张网，「薄弱点」就只是一个字符串标签：
 *   系统不知道该往回查什么（prereq）、
 *   不知道该拿什么跟它区分（confusable）、
 *   不知道该隔几天拿什么题来复查（problemTypes）。
 *
 * ── 覆盖范围 ──────────────────────────────────────────────
 * **聚焦演示链路**，不做全量（初中数理全量约 400+ 个，做全了每个都只能写个名字）。
 * 取舍标准：原型演示真正走到的题（串联电路故障分析、一元二次方程根的判别式）
 * 及其**前置链条**必须完整 —— 因为「查漏补缺」靠的就是这条链。
 *
 * ── 教材版本差异（textbookNote）的填写纪律 ──────────────────
 * **只知道才写，不知道就不写**。这一栏会出现在家长能看到的报告里，
 * 是信任凭据 —— 编一条比空着伤得重。
 * ================================================================== */

/* ------------------------------------------------------------------
 * 物理 · 电学（人教版九年级全一册）—— 主线，做到最细
 * ------------------------------------------------------------------ */

const physicsElectricity: KnowledgePoint[] = [
  /* ===== 第15章 电流和电路 ===== */
  {
    id: 'p15-1',
    subject: '物理',
    name: '两种电荷',
    textbook: { book: '九年级全一册', chapter: '第15章 电流和电路', section: '第1节 两种电荷' },
    prereq: [],
    confusable: ['p15-3'],
    problemTypes: ['判断两物体带电后是相吸还是相斥', '验电器箔片张开角度变化', '摩擦起电的实质判断'],
  },
  {
    id: 'p15-2',
    subject: '物理',
    name: '电流和电路',
    textbook: { book: '九年级全一册', chapter: '第15章 电流和电路', section: '第2节 电流和电路' },
    prereq: ['p15-1'],
    confusable: ['p15-3'],
    problemTypes: ['判断电路的组成是否完整', '电流方向的判断', '画电路图与实物图互译'],
  },
  {
    id: 'p15-3',
    subject: '物理',
    name: '串联和并联',
    textbook: { book: '九年级全一册', chapter: '第15章 电流和电路', section: '第3节 串联和并联' },
    prereq: ['p15-2'],
    confusable: ['p15-5', 'p16-2'],
    problemTypes: ['识别串并联电路', '按实物图连接电路', '开关控制作用的判断', '串并联特点辨析'],
    inDemo: true,
  },
  {
    id: 'p15-4',
    subject: '物理',
    name: '电流的测量',
    textbook: { book: '九年级全一册', chapter: '第15章 电流和电路', section: '第4节 电流的测量' },
    prereq: ['p15-3'],
    confusable: ['p16-1'],
    problemTypes: ['电流表读数', '量程选择', '电流表接法正误判断', '试触法操作'],
  },
  {
    id: 'p15-5',
    subject: '物理',
    name: '串、并联电路中电流的规律',
    textbook: { book: '九年级全一册', chapter: '第15章 电流和电路', section: '第5节 串、并联电路中电流的规律' },
    prereq: ['p15-3', 'p15-4'],
    confusable: ['p16-2'],
    problemTypes: ['串联电路电流处处相等', '并联电路干路电流等于各支路之和', '探究实验的数据分析'],
  },

  /* ===== 第16章 电压 电阻 ===== */
  {
    id: 'p16-1',
    subject: '物理',
    name: '电压',
    textbook: { book: '九年级全一册', chapter: '第16章 电压 电阻', section: '第1节 电压' },
    prereq: ['p15-2'],
    confusable: ['p15-4'],
    problemTypes: ['电压表读数', '电压表接法正误判断', '电源电压的判断'],
  },
  {
    id: 'p16-2',
    subject: '物理',
    name: '串、并联电路中电压的规律',
    textbook: { book: '九年级全一册', chapter: '第16章 电压 电阻', section: '第2节 串、并联电路中电压的规律' },
    prereq: ['p16-1', 'p15-3'],
    confusable: ['p15-5'],
    problemTypes: [
      '串联电路总电压等于各部分电压之和',
      '并联电路各支路电压相等',
      '用电压表判断断路位置',
      '串联电路故障分析',
    ],
    inDemo: true,
  },
  {
    id: 'p16-3',
    subject: '物理',
    name: '电阻',
    textbook: { book: '九年级全一册', chapter: '第16章 电压 电阻', section: '第3节 电阻' },
    prereq: ['p16-1'],
    confusable: ['p17-1'],
    problemTypes: ['影响电阻大小的因素探究', '导体与绝缘体的判断', '电阻是导体本身的性质'],
  },
  {
    id: 'p16-4',
    subject: '物理',
    name: '变阻器',
    textbook: { book: '九年级全一册', chapter: '第16章 电压 电阻', section: '第4节 变阻器' },
    prereq: ['p16-3'],
    confusable: ['p17-4'],
    problemTypes: ['滑动变阻器的接法判断', '滑片移动时接入阻值的变化', '实验中的保护作用分析'],
  },

  /* ===== 第17章 欧姆定律 ===== */
  {
    id: 'p17-1',
    subject: '物理',
    name: '电流与电压和电阻的关系',
    textbook: { book: '九年级全一册', chapter: '第17章 欧姆定律', section: '第1节 电流与电压和电阻的关系' },
    prereq: ['p16-1', 'p16-3'],
    confusable: [],
    problemTypes: ['探究实验的电路连接', '控制变量法的运用', '实验数据的图象分析'],
  },
  {
    id: 'p17-2',
    subject: '物理',
    name: '欧姆定律',
    textbook: { book: '九年级全一册', chapter: '第17章 欧姆定律', section: '第2节 欧姆定律' },
    prereq: ['p17-1'],
    confusable: ['p18-2'],
    problemTypes: ['公式 I=U/R 的直接计算', '已知两个量求第三个量', '简单电路中的电流电压求解'],
    inDemo: true,
  },
  {
    id: 'p17-3',
    subject: '物理',
    name: '电阻的测量',
    textbook: { book: '九年级全一册', chapter: '第17章 欧姆定律', section: '第3节 电阻的测量' },
    prereq: ['p17-2', 'p16-4'],
    confusable: [],
    problemTypes: ['伏安法测电阻的电路连接', '实验步骤排序', '滑动变阻器的作用', '误差来源分析'],
  },
  {
    id: 'p17-4',
    subject: '物理',
    name: '欧姆定律在串、并联电路中的应用',
    textbook: { book: '九年级全一册', chapter: '第17章 欧姆定律', section: '第4节 欧姆定律在串、并联电路中的应用' },
    prereq: ['p17-2', 'p15-3'],
    confusable: ['p16-4'],
    problemTypes: [
      '串联电路的总电阻计算',
      '并联电路的总电阻计算',
      '滑动变阻器移动时的动态电路分析',
      '电表示数变化判断',
    ],
    inDemo: true,
  },

  /* ===== 第18章 电功率 ===== */
  {
    id: 'p18-1',
    subject: '物理',
    name: '电能 电功',
    textbook: { book: '九年级全一册', chapter: '第18章 电功率', section: '第1节 电能 电功' },
    prereq: ['p17-2'],
    confusable: ['p18-2'],
    problemTypes: ['电能表读数与转数计算', '电功公式 W=UIt 的应用', '单位换算（度与焦耳）'],
  },
  {
    id: 'p18-2',
    subject: '物理',
    name: '电功率',
    textbook: { book: '九年级全一册', chapter: '第18章 电功率', section: '第2节 电功率' },
    prereq: ['p18-1'],
    confusable: ['p17-2', 'p18-4'],
    problemTypes: ['额定功率与实际功率的区分', 'P=UI 及其变形公式计算', '灯泡亮度与实际功率的关系'],
  },
  {
    id: 'p18-3',
    subject: '物理',
    name: '测量小灯泡的电功率',
    textbook: { book: '九年级全一册', chapter: '第18章 电功率', section: '第3节 测量小灯泡的电功率' },
    prereq: ['p18-2', 'p17-3'],
    confusable: [],
    problemTypes: ['实验电路连接与检查', '额定功率的测定步骤', '灯泡电阻随温度变化的分析'],
  },
  {
    id: 'p18-4',
    subject: '物理',
    name: '焦耳定律',
    textbook: { book: '九年级全一册', chapter: '第18章 电功率', section: '第4节 焦耳定律' },
    prereq: ['p18-2'],
    confusable: ['p18-2'],
    problemTypes: ['Q=I²Rt 的计算', '纯电阻与非纯电阻电路的区分', '电热的应用与防止'],
  },

  /* ===== 第19章 生活用电 ===== */
  {
    id: 'p19-1',
    subject: '物理',
    name: '家庭电路',
    textbook: { book: '九年级全一册', chapter: '第19章 生活用电', section: '第1节 家庭电路' },
    prereq: ['p15-3'],
    confusable: ['p19-3'],
    problemTypes: ['家庭电路的组成与连接', '火线零线的判断', '三孔插座与漏电保护器'],
  },
  {
    id: 'p19-2',
    subject: '物理',
    name: '家庭电路中电流过大的原因',
    textbook: { book: '九年级全一册', chapter: '第19章 生活用电', section: '第2节 家庭电路中电流过大的原因' },
    prereq: ['p19-1', 'p17-2'],
    confusable: [],
    problemTypes: ['短路与过载的区分', '保险丝的选择与作用', '空气开关跳闸的原因分析'],
  },
  {
    id: 'p19-3',
    subject: '物理',
    name: '安全用电',
    textbook: { book: '九年级全一册', chapter: '第19章 生活用电', section: '第3节 安全用电' },
    prereq: ['p19-1'],
    confusable: [],
    problemTypes: ['触电原因的判断', '安全用电原则的应用', '触电急救措施'],
  },

  /* ===== 第20章 电与磁 ===== */
  {
    id: 'p20-1',
    subject: '物理',
    name: '磁现象 磁场',
    textbook: { book: '九年级全一册', chapter: '第20章 电与磁', section: '第1节 磁现象 磁场' },
    prereq: [],
    confusable: ['p15-1'],
    problemTypes: ['磁极间作用规律', '磁感线的方向与描述', '磁场方向的判断'],
  },
  {
    id: 'p20-2',
    subject: '物理',
    name: '电生磁',
    textbook: { book: '九年级全一册', chapter: '第20章 电与磁', section: '第2节 电生磁' },
    prereq: ['p20-1', 'p15-2'],
    confusable: [],
    problemTypes: ['奥斯特实验', '安培定则判断磁极', '通电螺线管的磁场'],
  },
  {
    id: 'p20-3',
    subject: '物理',
    name: '电磁铁 电磁继电器',
    textbook: { book: '九年级全一册', chapter: '第20章 电与磁', section: '第3节 电磁铁 电磁继电器' },
    prereq: ['p20-2'],
    confusable: [],
    problemTypes: ['电磁铁磁性强弱的影响因素', '电磁继电器的工作过程分析', '控制电路与工作电路的区分'],
  },
  {
    id: 'p20-4',
    subject: '物理',
    name: '电动机',
    textbook: { book: '九年级全一册', chapter: '第20章 电与磁', section: '第4节 电动机' },
    prereq: ['p20-2'],
    confusable: ['p20-5'],
    problemTypes: ['通电导线在磁场中受力', '电动机转向与转速的影响因素', '能量转化分析'],
  },
  {
    id: 'p20-5',
    subject: '物理',
    name: '磁生电',
    textbook: { book: '九年级全一册', chapter: '第20章 电与磁', section: '第5节 磁生电' },
    prereq: ['p20-4'],
    confusable: ['p20-4'],
    problemTypes: ['电磁感应现象的判断', '感应电流方向的影响因素', '发电机的工作原理'],
  },
]

/* ------------------------------------------------------------------
 * 物理 · 力学（人教版八年级下册）
 *
 * 真题背景说知识点库「覆盖初中数学与物理」——力学是物理的另一半，
 * 不能只有电学。但演示链路不经过这里，所以粒度到「节」为止。
 * ------------------------------------------------------------------ */

const physicsMechanics: KnowledgePoint[] = [
  /* ===== 第7章 力 ===== */
  {
    id: 'p7-1',
    subject: '物理',
    name: '力',
    textbook: { book: '八年级下册', chapter: '第7章 力', section: '第1节 力' },
    prereq: [],
    confusable: ['p11-1'],
    problemTypes: ['力的作用效果判断', '力的三要素与示意图', '物体间力的作用是相互的'],
  },
  {
    id: 'p7-2',
    subject: '物理',
    name: '弹力',
    textbook: { book: '八年级下册', chapter: '第7章 力', section: '第2节 弹力' },
    prereq: ['p7-1'],
    confusable: ['p7-3', 'p8-3'],
    problemTypes: ['弹簧测力计的读数与使用', '弹力方向的判断', '弹性形变与塑性形变'],
  },
  {
    id: 'p7-3',
    subject: '物理',
    name: '重力',
    textbook: { book: '八年级下册', chapter: '第7章 力', section: '第3节 重力' },
    prereq: ['p7-1'],
    confusable: ['p7-2'],
    problemTypes: ['重力大小的计算 G=mg', '重心位置的判断', '重力方向的应用'],
  },

  /* ===== 第8章 运动和力 ===== */
  {
    id: 'p8-1',
    subject: '物理',
    name: '牛顿第一定律',
    textbook: { book: '八年级下册', chapter: '第8章 运动和力', section: '第1节 牛顿第一定律' },
    prereq: ['p7-1'],
    confusable: ['p8-2'],
    problemTypes: ['惯性现象的解释', '阻力对物体运动影响的实验推理', '力和运动关系的判断'],
  },
  {
    id: 'p8-2',
    subject: '物理',
    name: '二力平衡',
    textbook: { book: '八年级下册', chapter: '第8章 运动和力', section: '第2节 二力平衡' },
    prereq: ['p8-1'],
    confusable: ['p8-3'],
    problemTypes: ['二力平衡条件的应用', '平衡力与相互作用力的区分', '物体受力分析'],
  },
  {
    id: 'p8-3',
    subject: '物理',
    name: '摩擦力',
    textbook: { book: '八年级下册', chapter: '第8章 运动和力', section: '第3节 摩擦力' },
    prereq: ['p8-2', 'p7-2'],
    confusable: ['p7-2'],
    problemTypes: ['影响滑动摩擦力大小的因素', '摩擦力的方向判断', '增大与减小摩擦的方法'],
  },

  /* ===== 第9章 压强 ===== */
  {
    id: 'p9-1',
    subject: '物理',
    name: '压强',
    textbook: { book: '八年级下册', chapter: '第9章 压强', section: '第1节 压强' },
    prereq: ['p7-1'],
    confusable: ['p9-2'],
    problemTypes: ['p=F/S 的计算', '增大与减小压强的方法', '压力与重力的区分'],
  },
  {
    id: 'p9-2',
    subject: '物理',
    name: '液体压强',
    textbook: { book: '八年级下册', chapter: '第9章 压强', section: '第2节 液体压强' },
    prereq: ['p9-1'],
    confusable: ['p9-1', 'p10-2'],
    problemTypes: ['p=ρgh 的计算', '连通器原理', '液体压强的实验探究'],
  },
  {
    id: 'p9-3',
    subject: '物理',
    name: '大气压强',
    textbook: { book: '八年级下册', chapter: '第9章 压强', section: '第3节 大气压强' },
    prereq: ['p9-2'],
    confusable: ['p9-2'],
    problemTypes: ['大气压的测量（托里拆利实验）', '大气压随高度的变化', '生活中大气压的应用'],
  },
  {
    id: 'p9-4',
    subject: '物理',
    name: '流体压强与流速的关系',
    textbook: { book: '八年级下册', chapter: '第9章 压强', section: '第4节 流体压强与流速的关系' },
    prereq: ['p9-3'],
    confusable: ['p10-3'],
    problemTypes: ['流速与压强关系的解释', '飞机升力产生的原因', '生活中的流体现象'],
  },

  /* ===== 第10章 浮力 ===== */
  {
    id: 'p10-1',
    subject: '物理',
    name: '浮力',
    textbook: { book: '八年级下册', chapter: '第10章 浮力', section: '第1节 浮力' },
    prereq: ['p9-2'],
    confusable: ['p10-3'],
    problemTypes: ['称重法测浮力', '浮力产生的原因', '浮力方向的判断'],
  },
  {
    id: 'p10-2',
    subject: '物理',
    name: '阿基米德原理',
    textbook: { book: '八年级下册', chapter: '第10章 浮力', section: '第2节 阿基米德原理' },
    prereq: ['p10-1'],
    confusable: ['p9-2'],
    problemTypes: ['F浮=ρ液gV排 的计算', '探究浮力大小的影响因素', '排开液体体积的判断'],
  },
  {
    id: 'p10-3',
    subject: '物理',
    name: '物体的浮沉条件及应用',
    textbook: { book: '八年级下册', chapter: '第10章 浮力', section: '第3节 物体的浮沉条件及应用' },
    prereq: ['p10-2', 'p8-2'],
    confusable: ['p10-1'],
    problemTypes: ['浮沉条件的判断', '密度计与潜水艇原理', '漂浮时浮力等于重力'],
  },

  /* ===== 第11章 功和机械能 ===== */
  {
    id: 'p11-1',
    subject: '物理',
    name: '功',
    textbook: { book: '八年级下册', chapter: '第11章 功和机械能', section: '第1节 功' },
    prereq: ['p7-1', 'p8-2'],
    confusable: ['p11-3'],
    problemTypes: ['W=Fs 的计算', '是否做功的判断', '功的两个必要因素'],
  },
  {
    id: 'p11-2',
    subject: '物理',
    name: '功率',
    textbook: { book: '八年级下册', chapter: '第11章 功和机械能', section: '第2节 功率' },
    prereq: ['p11-1'],
    confusable: ['p12-3'],
    problemTypes: ['P=W/t 的计算', '功率与功的区分', '功率大小的比较'],
  },
  {
    id: 'p11-3',
    subject: '物理',
    name: '动能和势能',
    textbook: { book: '八年级下册', chapter: '第11章 功和机械能', section: '第3节 动能和势能' },
    prereq: ['p11-1'],
    confusable: ['p11-4'],
    problemTypes: ['影响动能大小的因素', '重力势能与弹性势能的判断', '探究实验中的转换法'],
  },
  {
    id: 'p11-4',
    subject: '物理',
    name: '机械能及其转化',
    textbook: { book: '八年级下册', chapter: '第11章 功和机械能', section: '第4节 机械能及其转化' },
    prereq: ['p11-3'],
    confusable: ['p11-3'],
    problemTypes: ['动能与势能的相互转化分析', '机械能守恒的判断', '生活中能量转化的实例'],
  },

  /* ===== 第12章 简单机械 ===== */
  {
    id: 'p12-1',
    subject: '物理',
    name: '杠杆',
    textbook: { book: '八年级下册', chapter: '第12章 简单机械', section: '第1节 杠杆' },
    prereq: ['p7-1', 'p8-2'],
    confusable: ['p12-2'],
    problemTypes: ['力臂的画法', '杠杆平衡条件的计算', '杠杆分类（省力/费力/等臂）'],
  },
  {
    id: 'p12-2',
    subject: '物理',
    name: '滑轮',
    textbook: { book: '八年级下册', chapter: '第12章 简单机械', section: '第2节 滑轮' },
    prereq: ['p12-1'],
    confusable: ['p12-1'],
    problemTypes: ['定滑轮与动滑轮的判断', '滑轮组绳子段数的判断', '滑轮组的省力情况'],
  },
  {
    id: 'p12-3',
    subject: '物理',
    name: '机械效率',
    textbook: { book: '八年级下册', chapter: '第12章 简单机械', section: '第3节 机械效率' },
    prereq: ['p11-1', 'p12-2'],
    confusable: ['p11-2'],
    problemTypes: ['有用功、额外功、总功的区分', 'η=W有/W总 的计算', '影响机械效率的因素'],
  },
]

/* ------------------------------------------------------------------
 * 数学 · 方程与函数（人教版九年级上册 + 八年级）
 *
 * 原型演示链路里的数学题是「一元二次方程根的判别式」和「二次函数与一元二次方程」，
 * 这两条的前置链一路往回是：公式法 ← 配方法 ← 乘法公式 ← 因式分解。
 * 链条必须完整 ——「查漏补缺」查的就是它。
 * ------------------------------------------------------------------ */

const mathEquationFunction: KnowledgePoint[] = [
  /* ===== 第21章 一元二次方程（九上） ===== */
  {
    id: 'm21-1',
    subject: '数学',
    name: '一元二次方程',
    textbook: { book: '九年级上册', chapter: '第21章 一元二次方程', section: '21.1 一元二次方程' },
    prereq: ['m14-2'],
    confusable: ['m22-1-1'],
    problemTypes: ['判断是否为一元二次方程', '化为一般式并指出各项系数', '由方程的解求字母的值'],
    textbookNote: '人教版把本章排在九年级上册第 21 章；北师大版排在九年级上册第 2 章，编号不同、学期一致。',
  },
  {
    id: 'm21-2-1',
    subject: '数学',
    name: '配方法',
    textbook: { book: '九年级上册', chapter: '第21章 一元二次方程', section: '21.2.1 配方法' },
    prereq: ['m21-1', 'm14-2'],
    confusable: ['m21-2-2', 'm21-2-3'],
    problemTypes: ['用配方法解一元二次方程', '二次项系数不为 1 时的配方', '配方求最值'],
  },
  {
    id: 'm21-2-2',
    subject: '数学',
    name: '公式法（含根的判别式）',
    textbook: { book: '九年级上册', chapter: '第21章 一元二次方程', section: '21.2.2 公式法' },
    prereq: ['m21-2-1', 'm16-1'],
    confusable: ['m21-2-3', 'm22-2'],
    problemTypes: [
      '用公式法解一元二次方程',
      '不解方程判断根的情况',
      '由根的情况求字母取值范围',
      '含参数方程的判别式讨论',
    ],
    inDemo: true,
  },
  {
    id: 'm21-2-3',
    subject: '数学',
    name: '因式分解法',
    textbook: { book: '九年级上册', chapter: '第21章 一元二次方程', section: '21.2.3 因式分解法' },
    prereq: ['m14-3', 'm21-1'],
    confusable: ['m21-2-2'],
    problemTypes: ['提公因式法解方程', '平方差公式解方程', '十字相乘法解方程'],
  },
  {
    id: 'm21-2-4',
    subject: '数学',
    name: '一元二次方程的根与系数的关系',
    textbook: { book: '九年级上册', chapter: '第21章 一元二次方程', section: '21.2.4 一元二次方程的根与系数的关系' },
    prereq: ['m21-2-2'],
    confusable: [],
    problemTypes: ['求两根之和与两根之积', '已知一根求另一根', '求与两根有关的代数式的值'],
  },
  {
    id: 'm21-3',
    subject: '数学',
    name: '实际问题与一元二次方程',
    textbook: { book: '九年级上册', chapter: '第21章 一元二次方程', section: '21.3 实际问题与一元二次方程' },
    prereq: ['m21-2-1', 'm21-2-2', 'm21-2-3'],
    confusable: [],
    problemTypes: ['平均增长率问题', '利润与销售问题', '面积与几何问题', '传播与握手问题'],
  },

  /* ===== 第22章 二次函数（九上） ===== */
  {
    id: 'm22-1-1',
    subject: '数学',
    name: '二次函数',
    textbook: { book: '九年级上册', chapter: '第22章 二次函数', section: '22.1.1 二次函数' },
    prereq: ['m14-2'],
    confusable: ['m21-1'],
    problemTypes: ['判断是否为二次函数', '由实际问题列二次函数关系式', '求二次函数的解析式'],
    textbookNote:
      '章节顺序差异明显：人教版把二次函数放在**九年级上册第 22 章**（紧接一元二次方程，为了强化两者联系）；北师大版放在**九年级下册第 2 章**。同一个知识点，学生在不同教材里见到的学期不同 —— 这正是知识点库必须带教材版本标识的原因。',
  },
  {
    id: 'm22-1-2',
    subject: '数学',
    name: '二次函数 y=ax² 的图象和性质',
    textbook: { book: '九年级上册', chapter: '第22章 二次函数', section: '22.1.2 二次函数 y=ax² 的图象和性质' },
    prereq: ['m22-1-1'],
    confusable: ['m22-1-3', 'm26-1'],
    problemTypes: ['开口方向与开口大小', '对称轴与顶点坐标', '增减性的判断'],
  },
  {
    id: 'm22-1-3',
    subject: '数学',
    name: '二次函数 y=a(x−h)²+k 的图象和性质',
    textbook: { book: '九年级上册', chapter: '第22章 二次函数', section: '22.1.3 二次函数 y=a(x−h)²+k 的图象和性质' },
    prereq: ['m22-1-2'],
    confusable: ['m22-1-4'],
    problemTypes: ['顶点式与顶点坐标', '图象平移的方向与距离', '由顶点式求解析式'],
  },
  {
    id: 'm22-1-4',
    subject: '数学',
    name: '二次函数 y=ax²+bx+c 的图象和性质',
    textbook: { book: '九年级上册', chapter: '第22章 二次函数', section: '22.1.4 二次函数 y=ax²+bx+c 的图象和性质' },
    prereq: ['m22-1-3', 'm21-2-1'],
    confusable: ['m22-2'],
    problemTypes: ['配方法化一般式为顶点式', '对称轴与顶点公式', '待定系数法求解析式', '最大最小值问题'],
  },
  {
    id: 'm22-2',
    subject: '数学',
    name: '二次函数与一元二次方程',
    textbook: { book: '九年级上册', chapter: '第22章 二次函数', section: '22.2 二次函数与一元二次方程' },
    prereq: ['m22-1-4', 'm21-2-2'],
    confusable: ['m21-2-2'],
    problemTypes: [
      '抛物线与 x 轴交点个数的判断',
      '由图象交点求方程的解',
      '图象法解一元二次不等式',
      '二次函数与方程的综合题',
    ],
    inDemo: true,
  },
  {
    id: 'm22-3',
    subject: '数学',
    name: '实际问题与二次函数',
    textbook: { book: '九年级上册', chapter: '第22章 二次函数', section: '22.3 实际问题与二次函数' },
    prereq: ['m22-1-4', 'm22-2'],
    confusable: ['m21-3'],
    problemTypes: ['最大面积问题', '最大利润问题', '抛球与拱桥问题', '水位变化问题'],
  },

  /* ===== 第19章 一次函数（八下）—— 函数概念的入口 ===== */
  {
    id: 'm19-1',
    subject: '数学',
    name: '函数',
    textbook: { book: '八年级下册', chapter: '第19章 一次函数', section: '19.1 函数' },
    prereq: [],
    confusable: ['m19-2'],
    problemTypes: ['函数概念的判断', '自变量取值范围的确定', '函数值的计算', '函数图象的识别'],
  },
  {
    id: 'm19-2',
    subject: '数学',
    name: '一次函数',
    textbook: { book: '八年级下册', chapter: '第19章 一次函数', section: '19.2 一次函数' },
    prereq: ['m19-1'],
    confusable: ['m22-1-2', 'm26-1'],
    problemTypes: ['待定系数法求解析式', '图象与性质（k、b 的意义）', '与方程、不等式的关系'],
    inDemo: true,
  },
  {
    id: 'm19-3',
    subject: '数学',
    name: '课题学习 选择方案',
    textbook: { book: '八年级下册', chapter: '第19章 一次函数', section: '19.3 课题学习 选择方案' },
    prereq: ['m19-2'],
    confusable: [],
    problemTypes: ['方案比较与最优选择', '分段函数建模', '结合实际意义的取值讨论'],
  },

  /* ===== 第14章 整式的乘法与因式分解（八上）—— 解方程的地基 ===== */
  {
    id: 'm14-2',
    subject: '数学',
    name: '乘法公式',
    textbook: { book: '八年级上册', chapter: '第14章 整式的乘法与因式分解', section: '14.2 乘法公式' },
    prereq: [],
    confusable: ['m14-3'],
    problemTypes: ['平方差公式的运用', '完全平方公式的运用', '公式的逆用与变形'],
  },
  {
    id: 'm14-3',
    subject: '数学',
    name: '因式分解',
    textbook: { book: '八年级上册', chapter: '第14章 整式的乘法与因式分解', section: '14.3 因式分解' },
    prereq: ['m14-2'],
    confusable: ['m14-2'],
    problemTypes: ['提公因式法', '公式法（平方差、完全平方）', '十字相乘法', '分解是否彻底的判断'],
  },

  /* ===== 第16章 二次根式（八下）—— 求根公式里的那根号 ===== */
  {
    id: 'm16-1',
    subject: '数学',
    name: '二次根式',
    textbook: { book: '八年级下册', chapter: '第16章 二次根式', section: '16.1 二次根式' },
    prereq: [],
    confusable: [],
    problemTypes: ['二次根式有意义的条件', '二次根式的化简与运算', '分母有理化'],
  },

  /* ===== 第26章 反比例函数（九下）—— 函数三兄弟里的第三个 ===== */
  {
    id: 'm26-1',
    subject: '数学',
    name: '反比例函数',
    textbook: { book: '九年级下册', chapter: '第26章 反比例函数', section: '26.1 反比例函数' },
    prereq: ['m19-2'],
    confusable: ['m22-1-2', 'm19-2'],
    problemTypes: ['反比例函数的图象与性质', 'k 的几何意义（面积不变性）', '与一次函数的综合题'],
  },
]

export const knowledgePoints: KnowledgePoint[] = [
  ...physicsElectricity,
  ...physicsMechanics,
  ...mathEquationFunction,
]

/** 按 id 取一个知识点（找不到返回 undefined，调用方自己决定怎么显示） */
export const findPoint = (id: string) => knowledgePoints.find(k => k.id === id)

/**
 * 完整教材出处，用于「章节」栏。
 * 写成「人教版 + 册次 + 章 + 节」四段齐全，是因为家长会**照着翻书核对** ——
 * 实战题背景原文说得很直接：家长在决定是否续费前，会确认内容出处是否来自权威来源。
 */
export const citeOf = (p: KnowledgePoint) =>
  `人教版${p.textbook.book} ${p.textbook.chapter} ${p.textbook.section}`

/** 句子内引用（短）：《串联和并联》（人教版九年级全一册） */
export const refOf = (p: KnowledgePoint) => `《${p.name}》（人教版${p.textbook.book}）`

/**
 * 沿前置链条往回查，找出「最可能塌掉的那一环」。
 *
 * ── 为什么是往回查，不是往深讲 ──────────────────────────────
 * 学生这道题不会，直接原因可能是这个知识点没学会，但也可能是**更底下的一环塌了**——
 * 苏格拉底式追问遇到「知识地板」缺失的学生，只会产生「无产出的空白」，
 * 错误理解还会层层叠加（这是备考材料里学术综述点名的失败模式）。
 *
 * 所以这个函数返回的是**候选回溯点**，不是结论：由 AI 结合作答记录去问，
 * 而不是直接判定「你基础不行」——判定是对人的评价，提问才是对事的排查。
 */
export function traceBackChain(id: string, depth = 2): KnowledgePoint[] {
  const seen = new Set<string>()
  const out: KnowledgePoint[] = []
  const walk = (cur: string, left: number) => {
    if (left <= 0) return
    const p = findPoint(cur)
    if (!p) return
    for (const pre of p.prereq) {
      if (seen.has(pre)) continue
      seen.add(pre)
      const kp = findPoint(pre)
      if (kp) {
        out.push(kp)
        walk(pre, left - 1)
      }
    }
  }
  walk(id, depth)
  return out
}
