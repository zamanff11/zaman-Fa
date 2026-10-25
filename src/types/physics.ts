export enum ApparatusMode {
  ChainedWeights = 'CHAINED', // الشكل (3-2): تعليق متتابع شاقولي للأثقال
  ScalePan = 'SCALE_PAN',     // الشكل (2-2): كفة الميزان
}

export enum RulerUnit {
  Centimeter = 'CM',          // تدريج السنتيمتر (0, 0.3, 0.6, 0.9, 1.2 ...)
  Millimeter30 = 'MM30',      // تدريج ثلاثيني كما في الشكل (2-2) (0, 5, 10, 15, 20, 25, 30)
}

export interface WeightItem {
  id: string;
  forceN: number;             // مقدار الثقل بالنيوتن (مثلاً 0.1N)
  label: string;
  slotIndex: number;          // موقعه الأصلي على المنضدة
  isAttached: boolean;        // هل هو معلق حالياً في النابض؟
  attachOrder: number;        // ترتيب تعليقه شاقولياً (0, 1, 2...)
}

export interface PaperMark {
  id: string;
  elongationCm: number;
  forceN: number;
  label: string;
}

export interface RecordedReading {
  id: string;
  index: number;
  weightsCount: number;
  forceN: number;
  elongationCm: number;
  springConstantNPerM: number;
  timestamp: string;
}
