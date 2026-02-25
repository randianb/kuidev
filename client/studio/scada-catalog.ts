import { createNode, type NodeMeta } from "./types";

export type ScadaStencilCategory = "物流设备" | "汽车工艺设备" | "能源与公用工程" | "通用监控";

export interface ScadaStencil {
  key: string;
  label: string;
  description: string;
  icon: string;
  category: ScadaStencilCategory;
}

export const scadaStencils: ScadaStencil[] = [
  // 物流设备
  { key: "agv", label: "AGV 小车", description: "无轨搬运小车状态与任务", icon: "fas fa-truck-moving", category: "物流设备" },
  { key: "rgv", label: "RGV 小车（有轨）", description: "有轨穿梭车位置与速度", icon: "fas fa-train-tram", category: "物流设备" },
  { key: "forklift", label: "叉车", description: "叉车工位状态/电量/任务", icon: "fas fa-warehouse", category: "物流设备" },
  { key: "stacker", label: "堆垛机", description: "立体仓库堆垛机状态", icon: "fas fa-layer-group", category: "物流设备" },
  { key: "conveyor", label: "输送线", description: "输送线节拍与堵塞告警", icon: "fas fa-arrows-left-right", category: "物流设备" },

  // 汽车工艺设备
  { key: "die-casting", label: "压铸机", description: "压铸压力/温度/循环时间", icon: "fas fa-industry", category: "汽车工艺设备" },
  { key: "machining", label: "切削机", description: "主轴转速/刀具寿命/负载", icon: "fas fa-gears", category: "汽车工艺设备" },
  { key: "pressure-test", label: "压检设备", description: "压检结果与泄漏率告警", icon: "fas fa-gauge-high", category: "汽车工艺设备" },
  { key: "spray-wash", label: "喷淋设备", description: "喷淋压力/流量/液位", icon: "fas fa-shower", category: "汽车工艺设备" },
  { key: "welding-station", label: "焊接工位", description: "焊点计数与工艺参数", icon: "fas fa-fire-flame-curved", category: "汽车工艺设备" },
  { key: "assembly-station", label: "装配工位", description: "工位节拍/在制品状态", icon: "fas fa-screwdriver-wrench", category: "汽车工艺设备" },

  // 能源与公用工程
  { key: "boiler", label: "锅炉", description: "锅炉温压/水位/燃烧状态", icon: "fas fa-fire", category: "能源与公用工程" },
  { key: "air-compressor", label: "空压机", description: "空压系统压力与启停", icon: "fas fa-wind", category: "能源与公用工程" },
  { key: "cooling-tower", label: "冷却塔", description: "冷却回路温度与流量", icon: "fas fa-fan", category: "能源与公用工程" },

  // 通用监控
  { key: "device-window", label: "设备浮窗", description: "可承载组态明细的小窗口", icon: "fas fa-window-maximize", category: "通用监控" },
  { key: "temperature-kpi", label: "温度显示", description: "温度数值 + 状态色", icon: "fas fa-temperature-high", category: "通用监控" },
  { key: "voltage-kpi", label: "电压显示", description: "电压数据展示", icon: "fas fa-bolt", category: "通用监控" },
  { key: "progress-kpi", label: "运行进度", description: "设备运行进度条", icon: "fas fa-chart-line", category: "通用监控" },
  { key: "high-temp-alert", label: "高温告警", description: "高温预警与告警文案", icon: "fas fa-exclamation-triangle", category: "通用监控" },
  { key: "andon-tip", label: "安灯提示", description: "安灯状态提示条", icon: "fas fa-lightbulb", category: "通用监控" },
  { key: "animation-layer", label: "动画图层", description: "2D 动画/图片叠加区域", icon: "fas fa-film", category: "通用监控" },
];

function equipmentCard(title: string, description: string, metrics: string[]): NodeMeta {
  return createNode("Card", {
    props: { title, description, className: "min-h-[180px]" },
    children: metrics.map((text) => createNode("Label", { props: { text } })),
  });
}

export function createScadaNode(stencilKey: string): NodeMeta {
  switch (stencilKey) {
    case "agv":
      return equipmentCard("AGV 小车", "物流搬运设备", ["任务: 送料到工位A", "电量: 78%", "位置: A-12"]);
    case "rgv":
      return equipmentCard("RGV 小车", "有轨搬运设备", ["轨道段: R3", "速度: 1.2m/s", "状态: 运行中"]);
    case "forklift":
      return equipmentCard("叉车", "仓储搬运设备", ["司机: 张三", "载重: 1.6t", "电量: 64%"]);
    case "stacker":
      return equipmentCard("堆垛机", "立体仓库设备", ["巷道: 02", "层位: 18", "状态: 入库作业"]);
    case "conveyor":
      return equipmentCard("输送线", "产线输送模块", ["节拍: 52s", "堵塞: 无", "运行: 正常"]);

    case "boiler":
      return equipmentCard("锅炉", "热能系统", ["蒸汽压力: 1.6MPa", "温度: 182℃", "水位: 正常"]);
    case "air-compressor":
      return equipmentCard("空压机", "压缩空气系统", ["出口压力: 0.72MPa", "运行时长: 128h", "状态: 正常"]);
    case "cooling-tower":
      return equipmentCard("冷却塔", "冷却循环系统", ["进水温度: 36℃", "出水温度: 29℃", "流量: 53m³/h"]);

    case "die-casting":
      return equipmentCard("压铸机", "压铸工艺设备", ["锁模力: 800T", "模温: 220℃", "周期: 78s"]);
    case "machining":
      return equipmentCard("切削机", "机加工设备", ["主轴转速: 3800rpm", "刀具寿命: 63%", "负载: 71%"]);
    case "pressure-test":
      return equipmentCard("压检设备", "密封压检工艺", ["测试压力: 0.9MPa", "保压时间: 45s", "结果: PASS"]);
    case "spray-wash":
      return equipmentCard("喷淋设备", "清洗喷淋工艺", ["喷淋压力: 0.45MPa", "流量: 28L/min", "液位: 72%"]);
    case "welding-station":
      return equipmentCard("焊接工位", "焊装工艺", ["焊点数: 128", "电流: 8.2kA", "状态: 生产中"]);
    case "assembly-station":
      return equipmentCard("装配工位", "总装工艺", ["节拍: 65s", "在制品: 14", "状态: 正常"]);

    case "device-window":
      return createNode("Card", {
        props: { title: "设备浮窗", description: "双击修改绑定数据", className: "min-h-[180px]" },
        children: [
          createNode("Label", { props: { text: "设备ID: M-1024" } }),
          createNode("Label", { props: { text: "状态: 运行中" } }),
        ],
      });
    case "temperature-kpi":
      return createNode("Label", { props: { text: "温度: 86℃", className: "text-orange-500 font-semibold" } });
    case "voltage-kpi":
      return createNode("Label", { props: { text: "电压: 381V", className: "text-cyan-500 font-semibold" } });
    case "progress-kpi":
      return createNode("Progress", { props: { value: 72 } });
    case "high-temp-alert":
      return createNode("Alert", {
        props: { title: "高温告警", description: "温度超过阈值，请检查冷却系统", variant: "destructive" },
      });
    case "andon-tip":
      return createNode("Badge", { props: { text: "安灯: 产线B待处理", className: "bg-amber-500/20 text-amber-500" } });
    case "animation-layer":
      return createNode("Container", {
        layout: "col",
        props: { title: "动画图层", className: "min-h-[160px] border border-dashed border-cyan-500/40" },
        children: [
          createNode("Image", { props: { src: "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?q=80&w=1200&auto=format&fit=crop", alt: "组态背景", className: "h-[120px] w-full object-cover" } }),
          createNode("Label", { props: { text: "动画占位（可接入three.js渲染层）", className: "animate-pulse text-cyan-500" } }),
        ],
      });
    default:
      return createNode("Label", { props: { text: `未知组态: ${stencilKey}` } });
  }
}
