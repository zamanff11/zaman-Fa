import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  Eye,
  Hand,
  RotateCcw,
  Ruler,
  Trash2,
} from 'lucide-react';
import {
  ApparatusMode,
  PaperMark,
  RulerUnit,
  WeightItem,
} from '../types/physics';

interface SpringStageProps {
  weights: WeightItem[];
  apparatusMode: ApparatusMode;
  onChangeApparatusMode: (mode: ApparatusMode) => void;
  rulerUnit: RulerUnit;
  onChangeRulerUnit: (unit: RulerUnit) => void;
  springConstantK: number; // N/m (default 100/3 = 33.3333 N/m => 0.3 cm per 0.1 N)
  dampingRatio: number;    // default ~6.5
  paperMarks: PaperMark[];
  onAddPaperMark: (elongationCm: number, forceN: number) => void;
  onClearPaperMarks: () => void;
  onAttachWeight: (id: string) => void;
  onDetachWeight: (id: string) => void;
  onLiveElongationChange?: (elongationCm: number, isOscillating: boolean) => void;
}

// الثوابت الهندسية للمنصة التفاعلية (SVG Coordinate Space: 820 x 650)
const STAGE_W = 820;
const STAGE_H = 650;
const SPRING_X = 328;
const CLAMP_Y = 64;
const COIL_START_Y = 82;
const ZERO_POINTER_Y = 186; // موضع المؤشر عند F = 0N (يقابل التدريج 0 على المسطرة)
const PX_PER_CM = 84;       // 1 cm = 84 SVG units (0.3 cm = 25.2 px, 3.0 cm = 252 px)
const TABLE_TOP_Y = 582;

export const SpringStage: React.FC<SpringStageProps> = ({
  weights,
  apparatusMode,
  onChangeApparatusMode,
  rulerUnit,
  onChangeRulerUnit,
  springConstantK,
  dampingRatio,
  paperMarks,
  onAddPaperMark,
  onClearPaperMarks,
  onAttachWeight,
  onDetachWeight,
  onLiveElongationChange,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // خيارات العرض البصري على المنصة
  const [showForceVectors, setShowForceVectors] = useState<boolean>(true);
  const [showZeroLine, setShowZeroLine] = useState<boolean>(true);

  // الحالة الفيزيائية اللحظية للنابض (الاستطالة بالسنتيمتر والسرعة)
  const attachedWeights = weights
    .filter((w) => w.isAttached)
    .sort((a, b) => a.attachOrder - b.attachOrder);

  const totalForceN = Number(
    attachedWeights.reduce((acc, w) => acc + w.forceN, 0).toFixed(3)
  );
  const targetElongationCm = (totalForceN / springConstantK) * 100;

  const [currentElongationCm, setCurrentElongationCm] = useState<number>(targetElongationCm);
  const [isOscillating, setIsOscillating] = useState<boolean>(false);

  const physicsRef = useRef({
    yCm: targetElongationCm,
    vCm: 0,
    targetCm: targetElongationCm,
    totalForceN,
    springConstantK,
    dampingRatio,
    manualPullCm: null as number | null,
  });

  useEffect(() => {
    physicsRef.current.targetCm = targetElongationCm;
    physicsRef.current.totalForceN = totalForceN;
    physicsRef.current.springConstantK = springConstantK;
    physicsRef.current.dampingRatio = dampingRatio;
  }, [targetElongationCm, totalForceN, springConstantK, dampingRatio]);

  // حالة السحب بالماوس أو اللمس
  const [dragState, setDragState] = useState<{
    type: 'BENCH_WEIGHT' | 'ATTACHED_WEIGHT' | 'SPRING_PULL';
    weightId?: string;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    initialElongationCm: number;
  } | null>(null);

  // حلقة المحاكاة الفيزيائية (60 إطار/ثانية - قانون هوك مع حركة توافقية مخمدة)
  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.032);
      lastTime = now;

      const p = physicsRef.current;

      if (p.manualPullCm !== null) {
        p.yCm = p.manualPullCm;
        p.vCm = 0;
        setCurrentElongationCm(p.yCm);
        setIsOscillating(false);
        onLiveElongationChange?.(p.yCm, false);
      } else {
        const diff = p.targetCm - p.yCm;
        if (Math.abs(diff) > 0.0012 || Math.abs(p.vCm) > 0.015) {
          // الكتلة الفعالة تزداد بزيادة الأثقال المعلقة ليبدو التذبذب واقعياً
          const effectiveMass = 0.04 + p.totalForceN * 0.22;
          const restoringForceN = p.totalForceN - p.springConstantK * (p.yCm / 100);
          const accelCm = (restoringForceN / effectiveMass) * 100 - p.dampingRatio * p.vCm;

          p.vCm += accelCm * dt;
          p.yCm += p.vCm * dt;

          // حدود فيزيائية طبيعية: عدم تداخل حلقات النابض لأعلى أو اختراق المنضدة لأسفل
          if (p.yCm < -0.35) {
            p.yCm = -0.35;
            p.vCm *= -0.35;
          }
          if (p.yCm > 3.35) {
            p.yCm = 3.35;
            p.vCm *= -0.3;
          }

          setCurrentElongationCm(p.yCm);
          setIsOscillating(true);
          onLiveElongationChange?.(p.yCm, true);
        } else if (p.yCm !== p.targetCm || p.vCm !== 0) {
          p.yCm = p.targetCm;
          p.vCm = 0;
          setCurrentElongationCm(p.targetCm);
          setIsOscillating(false);
          onLiveElongationChange?.(p.targetCm, false);
        }
      }

      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [onLiveElongationChange]);

  // تحويل إحداثيات الماوس على الشاشة إلى إحداثيات SVG بدقة تامة
  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const res = pt.matrixTransform(ctm.inverse());
    return { x: res.x, y: res.y };
  }, []);

  // مواقع الأثقال الموضوعة على المنضدة (قبل التعليق)
  const getBenchSlotPosition = (slotIndex: number) => {
    const cols = 3;
    const col = slotIndex % cols;
    const row = Math.floor(slotIndex / cols);
    // ترتيب الأثقال فوق المنضدة على يمين النابض بشكل واضح ومرتب
    const baseX = 505 + col * 86;
    const baseY = row === 0 ? TABLE_TOP_Y - 22 : TABLE_TOP_Y - 76;
    return { x: baseX, y: baseY };
  };

  // حساب موضع المؤشر ونقطة التعليق السفلى الحالية
  const pointerY = ZERO_POINTER_Y + currentElongationCm * PX_PER_CM;
  const hookTipY = pointerY + 15;
  const panPlateY = hookTipY + 54;

  // فحص ما إذا كان الثقل المسحوب بالماوس فوق منطقة التعليق الشاقولي للنابض
  const isPointInSpringDropZone = (x: number, y: number) => {
    return Math.abs(x - SPRING_X) <= 105 && y >= 75 && y <= TABLE_TOP_Y - 12;
  };

  // بدء سحب ثقل من المنضدة بالماوس
  const handleStartDragBenchWeight = (
    e: React.PointerEvent,
    weight: WeightItem,
    posX: number,
    posY: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const pt = clientToSvg(e.clientX, e.clientY);
    setDragState({
      type: 'BENCH_WEIGHT',
      weightId: weight.id,
      x: pt.x,
      y: pt.y,
      offsetX: pt.x - posX,
      offsetY: pt.y - posY,
      startX: pt.x,
      startY: pt.y,
      initialElongationCm: physicsRef.current.yCm,
    });
  };

  // بدء سحب ثقل معلق في النابض (إما لشدّه شاقولياً أو لفصله وإعادته للمنضدة)
  const handleStartDragAttachedWeight = (
    e: React.PointerEvent,
    weight: WeightItem,
    posX: number,
    posY: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const pt = clientToSvg(e.clientX, e.clientY);
    setDragState({
      type: 'ATTACHED_WEIGHT',
      weightId: weight.id,
      x: pt.x,
      y: pt.y,
      offsetX: pt.x - posX,
      offsetY: pt.y - posY,
      startX: pt.x,
      startY: pt.y,
      initialElongationCm: physicsRef.current.yCm,
    });
  };

  // شد خطاف النابض أو كفة الميزان شاقولياً بالماوس لاختبار قوة المرونة
  const handleStartSpringPull = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pt = clientToSvg(e.clientX, e.clientY);
    setDragState({
      type: 'SPRING_PULL',
      x: pt.x,
      y: pt.y,
      offsetX: 0,
      offsetY: 0,
      startX: pt.x,
      startY: pt.y,
      initialElongationCm: physicsRef.current.yCm,
    });
  };

  // متابعة حركة الماوس وإفلات الثقل
  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const pt = clientToSvg(e.clientX, e.clientY);
      setDragState((prev) => (prev ? { ...prev, x: pt.x, y: pt.y } : null));

      if (dragState.type === 'SPRING_PULL') {
        const deltaPx = pt.y - dragState.startY;
        const pulledCm = Math.max(
          -0.25,
          Math.min(3.15, dragState.initialElongationCm + deltaPx / PX_PER_CM)
        );
        physicsRef.current.manualPullCm = pulledCm;
      } else if (dragState.type === 'ATTACHED_WEIGHT') {
        const currentX = pt.x - dragState.offsetX;
        // إذا كان السحب شاقولياً قريباً من محور النابض نحاكي شد النابض باليد
        if (Math.abs(currentX - SPRING_X) <= 68) {
          const deltaPx = pt.y - dragState.startY;
          const pulledCm = Math.max(
            -0.25,
            Math.min(3.15, dragState.initialElongationCm + deltaPx / PX_PER_CM)
          );
          physicsRef.current.manualPullCm = pulledCm;
        } else {
          // عند إبعاد الثقل جانبياً عن محور النابض نترك النابض حرّاً استعداداً للفصل
          physicsRef.current.manualPullCm = null;
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const pt = clientToSvg(e.clientX, e.clientY);
      physicsRef.current.manualPullCm = null;
      const pointerTravel = Math.hypot(
        pt.x - dragState.startX,
        pt.y - dragState.startY
      );

      if (dragState.type === 'BENCH_WEIGHT' && dragState.weightId) {
        const dropX = pt.x - dragState.offsetX;
        const dropY = pt.y - dragState.offsetY;

        if (isPointInSpringDropZone(dropX, dropY) || pointerTravel < 5) {
          physicsRef.current.vCm -= 0.4;
          onAttachWeight(dragState.weightId);
        }
      } else if (dragState.type === 'ATTACHED_WEIGHT' && dragState.weightId) {
        const dropX = pt.x - dragState.offsetX;
        const dropY = pt.y - dragState.offsetY;

        if (!isPointInSpringDropZone(dropX, dropY) || pointerTravel < 5) {
          onDetachWeight(dragState.weightId);
        }
      }

      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragState, clientToSvg, onAttachWeight, onDetachWeight]);

  // بناء حلقات النابض الحلزوني ثلاثي الأبعاد ديناميكياً
  const numCoils = 13;
  const coilEndY = Math.max(COIL_START_Y + 48, pointerY - 12);
  const coilSpan = coilEndY - COIL_START_Y;
  const pitch = coilSpan / numCoils;
  const coilRadius = 17;

  const backCoilsPaths: string[] = [];
  const frontCoilsPaths: string[] = [];

  for (let i = 0; i < numCoils; i++) {
    const y0 = COIL_START_Y + i * pitch;
    const yMid = y0 + pitch * 0.5;
    const y1 = y0 + pitch;

    // النصف الخلفي للحلقة
    backCoilsPaths.push(
      `M ${SPRING_X + coilRadius} ${y0} C ${SPRING_X + coilRadius} ${y0 + pitch * 0.22}, ${SPRING_X - coilRadius} ${yMid - pitch * 0.22}, ${SPRING_X - coilRadius} ${yMid}`
    );
    // النصف الأمامي للحلقة (يمنح الإحساس الحقيقي بالالتفاف الحلزوني الشاقولي)
    frontCoilsPaths.push(
      `M ${SPRING_X - coilRadius} ${yMid} C ${SPRING_X - coilRadius} ${yMid + pitch * 0.22}, ${SPRING_X + coilRadius} ${y1 - pitch * 0.22}, ${SPRING_X + coilRadius} ${y1}`
    );
  }

  // حالة منطقة الإفلات أثناء السحب
  const draggedWeightObj = dragState?.weightId
    ? weights.find((w) => w.id === dragState.weightId)
    : undefined;

  const draggedCenter = dragState
    ? {
        x: dragState.x - dragState.offsetX,
        y: dragState.y - dragState.offsetY,
      }
    : null;

  const isHoveringDropTarget =
    dragState?.type === 'BENCH_WEIGHT' &&
    draggedCenter !== null &&
    isPointInSpringDropZone(draggedCenter.x, draggedCenter.y);

  const isDetachingAttachedWeight =
    dragState?.type === 'ATTACHED_WEIGHT' &&
    draggedCenter !== null &&
    !isPointInSpringDropZone(draggedCenter.x, draggedCenter.y);

  // موضع المعاينة لربط الثقل الجديد شاقولياً
  const nextAttachPreviewY =
    apparatusMode === ApparatusMode.ChainedWeights
      ? hookTipY + attachedWeights.length * 32 + 16
      : panPlateY - 14;

  // توليد تدريجات المسطرة المدرجة بدقة علمية
  const renderRulerTicks = () => {
    const ticks: React.ReactNode[] = [];
    // المسطرة تمتد من 0 سم إلى 3.0 سم (أو 0 إلى 30 ملم)
    const totalMm = 30;
    for (let mm = 0; mm <= totalMm; mm++) {
      const cmVal = mm / 10;
      const y = ZERO_POINTER_Y + cmVal * PX_PER_CM;

      if (rulerUnit === RulerUnit.Centimeter) {
        // تدريج الكتاب في الشكل (3-2): 0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8 ...
        const isEvery3Mm = mm % 3 === 0;
        const tickLen = isEvery3Mm ? 15 : 7;
        ticks.push(
          <g key={`cm-${mm}`}>
            <line
              x1={196}
              y1={y}
              x2={196 - tickLen}
              y2={y}
              stroke={isEvery3Mm ? '#0f172a' : '#64748b'}
              strokeWidth={isEvery3Mm ? 1.6 : 0.9}
            />
            {isEvery3Mm && (
              <text
                x={175}
                y={y + 3.5}
                textAnchor="end"
                className="font-mono text-[10.5px] font-semibold fill-slate-800 select-none"
              >
                {mm === 0 ? '0' : cmVal.toFixed(1)}
              </text>
            )}
          </g>
        );
      } else {
        // تدريج الشكل (2-2): 0, 5, 10, 15, 20, 25, 30
        const isMajor5 = mm % 5 === 0;
        const tickLen = isMajor5 ? 15 : 7;
        ticks.push(
          <g key={`mm-${mm}`}>
            <line
              x1={196}
              y1={y}
              x2={196 - tickLen}
              y2={y}
              stroke={isMajor5 ? '#0f172a' : '#64748b'}
              strokeWidth={isMajor5 ? 1.6 : 0.9}
            />
            {isMajor5 && (
              <text
                x={175}
                y={y + 3.5}
                textAnchor="end"
                className="font-mono text-[10.5px] font-semibold fill-slate-800 select-none"
              >
                {mm}
              </text>
            )}
          </g>
        );
      }
    }
    return ticks;
  };

  // رسم كتلة الثقل المعدنية مع الخطاف العلوي والحلقة السفلية
  const renderWeightGraphic = (
    weight: WeightItem,
    cx: number,
    cy: number,
    options: {
      showTopHook?: boolean;
      showBottomRing?: boolean;
      isDragged?: boolean;
      compactInPan?: boolean;
    } = {}
  ) => {
    const {
      showTopHook = true,
      showBottomRing = true,
      isDragged = false,
      compactInPan = false,
    } = options;

    const w = compactInPan ? 26 : 34;
    const h = compactInPan ? 19 : 22;

    return (
      <g
        transform={`translate(${cx}, ${cy}) ${isDragged ? 'scale(1.08)' : ''}`}
        className="select-none"
      >
        {/* خطاف علوي للتعليق الشاقولي */}
        {showTopHook && (
          <path
            d={`M 0 ${-h / 2} L 0 ${-h / 2 - 5} C 0 ${-h / 2 - 10}, 6 ${-h / 2 - 10}, 5 ${-h / 2 - 5.5}`}
            fill="none"
            stroke="#334155"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        )}

        {/* جسم الثقل المعدني شبه المنحرف كما في الكتاب المدرسي */}
        <polygon
          points={`${-w * 0.42},${-h / 2} ${w * 0.42},${-h / 2} ${w * 0.5},${h / 2} ${-w * 0.5},${h / 2}`}
          fill="url(#weightMetallicGrad)"
          stroke={isDragged ? '#0284c7' : '#1e293b'}
          strokeWidth={isDragged ? 2 : 1.4}
        />

        {/* لمعان معدني خفيف */}
        <line
          x1={-w * 0.34}
          y1={-h / 2 + 2.5}
          x2={w * 0.34}
          y2={-h / 2 + 2.5}
          stroke="#cbd5e1"
          strokeWidth="1"
          strokeOpacity="0.45"
        />

        {/* كتابة مقدار الثقل W / 0.1N */}
        <text
          x={0}
          y={compactInPan ? 3.5 : 4}
          textAnchor="middle"
          direction="ltr"
          className="font-mono text-[9.5px] font-semibold fill-white select-none pointer-events-none"
        >
          { `${weight.forceN}N` }
        </text>

        {/* حلقة سفلية لتعليق ثقل آخر بالتتابع كما في الشكل (3-2) */}
        {showBottomRing && (
          <circle
            cx={0}
            cy={h / 2 + 3.5}
            r={3.2}
            fill="none"
            stroke="#334155"
            strokeWidth="2"
          />
        )}
      </g>
    );
  };

  const displayReadingValue =
    rulerUnit === RulerUnit.Centimeter
      ? `${Math.max(0, currentElongationCm).toFixed(2)} cm`
      : `${Math.max(0, currentElongationCm * 10).toFixed(1)} mm`;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* شريط أدوات المنصة العلوي */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/80 border-b border-slate-200">
        {/* التبديل بين الشكل (3-2) والشكل (2-2) */}
        <div
          role="group"
          aria-label="نمط تعليق الأثقال"
          className="flex items-center gap-1 p-1 bg-slate-200/75 rounded-lg"
        >
          <button
            type="button"
            onClick={() => onChangeApparatusMode(ApparatusMode.ChainedWeights)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              apparatusMode === ApparatusMode.ChainedWeights
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تعليق متتابع (شكل 3-2)
          </button>
          <button
            type="button"
            onClick={() => onChangeApparatusMode(ApparatusMode.ScalePan)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              apparatusMode === ApparatusMode.ScalePan
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            كفة الميزان (شكل 2-2)
          </button>
        </div>

        {/* أزرار المسطرة والتأشير على الورقة ومتجهات القوى */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onChangeRulerUnit(
                rulerUnit === RulerUnit.Centimeter
                  ? RulerUnit.Millimeter30
                  : RulerUnit.Centimeter
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Ruler className="w-3.5 h-3.5 text-sky-600" />
            <span>
              {rulerUnit === RulerUnit.Centimeter ? 'المسطرة: سنتيمتر (cm)' : 'المسطرة: مليمتر (0–30)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onAddPaperMark(
                Number(Math.max(0, currentElongationCm).toFixed(2)),
                totalForceN
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>تأشير على الورقة</span>
          </button>

          {paperMarks.length > 0 && (
            <button
              type="button"
              onClick={onClearPaperMarks}
              title="مسح تأشيرات الورقة"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:text-rose-700 hover:border-rose-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح الورقة</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowForceVectors((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showForceVectors
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>متجهات القوى</span>
          </button>
        </div>
      </div>

      {/* شريط القراءات الحية المباشرة أعلى الرسم (نصوص نظيفة بدون كبسولات ملونة) */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-2.5 bg-white border-b border-slate-100 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            القوة المؤثرة <strong dir="ltr" className="font-mono tabular-nums text-slate-900 text-sm">{totalForceN.toFixed(1)} N</strong>
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>
            مقدار الاستطالة <strong dir="ltr" className="font-mono tabular-nums text-sky-700 text-sm">{displayReadingValue}</strong>
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>
            الأثقال المعلقة <strong className="font-mono tabular-nums text-slate-900">{attachedWeights.length}</strong> من {weights.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowZeroLine((z) => !z)}
            className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-4 cursor-pointer whitespace-nowrap"
          >
            {showZeroLine ? 'إخفاء خط الصفر المرجعي' : 'إظهار خط الصفر المرجعي'}
          </button>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
            {isOscillating ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                <span>يتذبذب شاقولياً نحو الاتزان</span>
              </>
            ) : (
              <>
                <Hand className="w-3.5 h-3.5 text-emerald-600" />
                <span>متزن ضمن حد المرونة</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* لوحة المختبر التفاعلية (SVG) */}
      <div className="relative w-full bg-[#f8fafc] select-none touch-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
          className="w-full h-auto max-h-[640px] block"
          role="img"
          aria-label="منصة محاكاة النابض الحلزوني والأثقال الشاقولية"
        >
          <defs>
            {/* شبكة ورق بياني خفيفة جداً للخلفية المختبرية */}
            <pattern id="labGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="0.7"
              />
            </pattern>

            {/* تدرج معدني ثلاثي الأبعاد لسلك النابض الحلزوني */}
            <linearGradient id="springWireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="35%" stopColor="#94a3b8" />
              <stop offset="55%" stopColor="#f1f5f9" />
              <stop offset="80%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* تدرج معدن حامل الحديد */}
            <linearGradient id="ironStandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="45%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* تدرج معدن الأثقال */}
            <linearGradient id="weightMetallicGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="30%" stopColor="#475569" />
              <stop offset="75%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* تدرج خشب المنضدة */}
            <linearGradient id="woodTableGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a16237" />
              <stop offset="35%" stopColor="#854d27" />
              <stop offset="100%" stopColor="#6c3d1e" />
            </linearGradient>

            {/* تدرج المسطرة المعدنية المدرجة */}
            <linearGradient id="rulerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
          </defs>

          {/* خلفية المختبر */}
          <rect x="0" y="0" width={STAGE_W} height={STAGE_H} fill="url(#labGrid)" />

          {/* إرشاد بصري هادئ أعلى منطقة الأثقال على المنضدة */}
          <g transform="translate(590, 68)">
            <rect
              x="-168"
              y="-24"
              width="336"
              height="44"
              rx="10"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text
              x="0"
              y="-3"
              textAnchor="middle"
              className="text-[12px] font-semibold fill-slate-800"
            >
              ارفع أي ثقل بالماوس وعلّقه بالنابض الحلزوني شاقولياً
            </text>
            <text
              x="0"
              y="13"
              textAnchor="middle"
              className="text-[10.5px] fill-slate-500"
            >
              يمكنك أيضاً سحب أي ثقل معلق لإعادته إلى المنضدة أو شد النابض لأسفل
            </text>
          </g>

          {/* ==================== المنضدة الخشبية (كما في الشكل 2-2) ==================== */}
          <g id="wooden-bench">
            {/* أرجل المنضدة */}
            <rect x="74" y={TABLE_TOP_Y + 18} width="26" height="50" fill="#6c3d1e" />
            <rect x={STAGE_W - 100} y={TABLE_TOP_Y + 18} width="26" height="50" fill="#6c3d1e" />
            {/* سطح المنضدة */}
            <rect
              x="36"
              y={TABLE_TOP_Y}
              width={STAGE_W - 72}
              height="22"
              rx="4"
              fill="url(#woodTableGrad)"
              stroke="#562f14"
              strokeWidth="1.5"
            />
            <text
              x="415"
              y={TABLE_TOP_Y + 42}
              textAnchor="middle"
              className="text-[14px] font-bold fill-slate-700"
            >
              منضدة
            </text>
          </g>

          {/* ==================== حامل الحديد والمسطرة المدرجة والورقة ==================== */}
          <g id="iron-stand-and-ruler">
            {/* قاعدة حامل الحديد */}
            <rect
              x="54"
              y={TABLE_TOP_Y - 22}
              width="86"
              height="22"
              rx="3"
              fill="#334155"
              stroke="#0f172a"
              strokeWidth="1.2"
            />
            {/* العمود الشاقولي لحامل الحديد */}
            <rect
              x="88"
              y="36"
              width="13"
              height={TABLE_TOP_Y - 58}
              rx="3"
              fill="url(#ironStandGrad)"
            />
            {/* المشبك العلوي والذراع الأفقية الحاملة للنابض */}
            <rect
              x="80"
              y={CLAMP_Y - 14}
              width="29"
              height="24"
              rx="4"
              fill="#1e293b"
            />
            <rect
              x="101"
              y={CLAMP_Y - 7}
              width={SPRING_X - 101 + 32}
              height="11"
              rx="3"
              fill="url(#ironStandGrad)"
            />
            <text
              x="94"
              y="26"
              textAnchor="middle"
              className="text-[12px] font-semibold fill-slate-600"
            >
              حامل حديد
            </text>

            {/* قاعدة المسطرة المدرجة على المنضدة كما في الشكل (2-2) */}
            <rect
              x="132"
              y={TABLE_TOP_Y - 26}
              width="78"
              height="26"
              rx="2"
              fill="#475569"
              stroke="#1e293b"
              strokeWidth="1.2"
            />

            {/* الورقة البيضاء خلف المؤشر لتأشير الزيادة الحاصلة في طول النابض */}
            <g id="backing-paper">
              <rect
                x="204"
                y="156"
                width="58"
                height="310"
                rx="2"
                fill="#ffffff"
                stroke="#cbd5e1"
                strokeWidth="1.2"
              />
              {/* شريط لاصق علوي وسفلي للورقة */}
              <rect x="221" y="151" width="24" height="9" rx="1.5" fill="#bae6fd" opacity="0.85" />
              <rect x="221" y="461" width="24" height="9" rx="1.5" fill="#bae6fd" opacity="0.85" />
              <text
                x="233"
                y="484"
                textAnchor="middle"
                className="text-[11px] font-medium fill-slate-500"
              >
                ورقة التأشير
              </text>

              {/* العلامات المؤشرة على الورقة */}
              {paperMarks.map((mark) => {
                const my = ZERO_POINTER_Y + mark.elongationCm * PX_PER_CM;
                return (
                  <g key={mark.id}>
                    <line
                      x1="205"
                      y1={my}
                      x2="232"
                      y2={my}
                      stroke="#0284c7"
                      strokeWidth="1.8"
                    />
                    <text
                      x="257"
                      y={my + 3}
                      textAnchor="end"
                      direction="ltr"
                      className="font-mono text-[9.5px] font-semibold fill-sky-800"
                    >
                      {mark.label}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* جسم المسطرة المدرجة */}
            <rect
              x="146"
              y="162"
              width="50"
              height={TABLE_TOP_Y - 188}
              rx="2"
              fill="url(#rulerGrad)"
              stroke="#475569"
              strokeWidth="1.4"
            />
            {renderRulerTicks()}

            {/* تسمية المسطرة المدرجة */}
            <text
              x="123"
              y="315"
              textAnchor="middle"
              className="text-[13px] font-bold fill-slate-800"
            >
              مسطرة
            </text>
            <text
              x="123"
              y="333"
              textAnchor="middle"
              className="text-[13px] font-bold fill-slate-800"
            >
              مدرجة
            </text>
            <text
              x="123"
              y="351"
              textAnchor="middle"
              direction="ltr"
              className="font-mono text-[10.5px] fill-slate-500"
            >
              ({rulerUnit === RulerUnit.Centimeter ? 'cm' : 'mm'})
            </text>
          </g>

          {/* خط الاتزان الأصلي (F = 0N) للمقارنة البصرية الواضحة لمقدار الاستطالة ΔL */}
          {showZeroLine && (
            <g>
              <line
                x1="196"
                y1={ZERO_POINTER_Y}
                x2={SPRING_X + 64}
                y2={ZERO_POINTER_Y}
                stroke="#0284c7"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity="0.7"
              />
              {currentElongationCm > 0.08 && (
                <g>
                  {/* قوس/سهم يوضح مقدار الزيادة الحاصلة ΔL بين الصفر والمؤشر الحالي */}
                  <line
                    x1={SPRING_X + 54}
                    y1={ZERO_POINTER_Y}
                    x2={SPRING_X + 54}
                    y2={pointerY}
                    stroke="#0284c7"
                    strokeWidth="1.6"
                  />
                  <line
                    x1={SPRING_X + 49}
                    y1={ZERO_POINTER_Y}
                    x2={SPRING_X + 59}
                    y2={ZERO_POINTER_Y}
                    stroke="#0284c7"
                    strokeWidth="1.6"
                  />
                  <line
                    x1={SPRING_X + 49}
                    y1={pointerY}
                    x2={SPRING_X + 59}
                    y2={pointerY}
                    stroke="#0284c7"
                    strokeWidth="1.6"
                  />
                  <text
                    x={SPRING_X + 63}
                    y={(ZERO_POINTER_Y + pointerY) / 2 + 4}
                    textAnchor="start"
                    direction="ltr"
                    className="font-mono text-[11px] font-semibold fill-sky-700"
                  >
                    ΔL = {Math.max(0, currentElongationCm).toFixed(2)} cm
                  </text>
                </g>
              )}
            </g>
          )}

          {/* ==================== منطقة الإرشاد المغناطيسي عند سحب ثقل نحو النابض ==================== */}
          {dragState?.type === 'BENCH_WEIGHT' && (
            <g className="pointer-events-none">
              {/* خط المحور الشاقولي للنابض */}
              <line
                x1={SPRING_X}
                y1={hookTipY}
                x2={SPRING_X}
                y2={TABLE_TOP_Y - 12}
                stroke={isHoveringDropTarget ? '#0284c7' : '#94a3b8'}
                strokeWidth={isHoveringDropTarget ? 2 : 1.2}
                strokeDasharray="5 5"
              />
              {/* حلقة هدف التعليق الشاقولي */}
              <circle
                cx={SPRING_X}
                cy={nextAttachPreviewY}
                r={isHoveringDropTarget ? 28 : 22}
                fill={isHoveringDropTarget ? '#e0f2fe' : '#f1f5f9'}
                fillOpacity={isHoveringDropTarget ? 0.8 : 0.55}
                stroke={isHoveringDropTarget ? '#0284c7' : '#64748b'}
                strokeWidth={isHoveringDropTarget ? 2.2 : 1.4}
                strokeDasharray={isHoveringDropTarget ? 'none' : '4 3'}
              />
              <text
                x={SPRING_X}
                y={nextAttachPreviewY + 4}
                textAnchor="middle"
                className={`text-[10.5px] font-bold ${
                  isHoveringDropTarget ? 'fill-sky-800' : 'fill-slate-600'
                }`}
              >
                {isHoveringDropTarget ? 'أفلت للتعليق' : 'علّق هنا'}
              </text>
            </g>
          )}

          {/* ==================== النابض الحلزوني والمؤشر ==================== */}
          <g id="helical-spring">
            {/* حلقة التثبيت العلوية بحامل الحديد */}
            <circle
              cx={SPRING_X}
              cy={CLAMP_Y + 4}
              r="5"
              fill="none"
              stroke="#334155"
              strokeWidth="2.8"
            />
            <line
              x1={SPRING_X}
              y1={CLAMP_Y + 9}
              x2={SPRING_X + coilRadius}
              y2={COIL_START_Y}
              stroke="#334155"
              strokeWidth="3.2"
              strokeLinecap="round"
            />

            {/* النصف الخلفي لحلقات النابض */}
            {backCoilsPaths.map((d, idx) => (
              <path
                key={`back-${idx}`}
                d={d}
                fill="none"
                stroke="#475569"
                strokeWidth="3.6"
                strokeLinecap="round"
              />
            ))}

            {/* النصف الأمامي اللامع لحلقات النابض */}
            {frontCoilsPaths.map((d, idx) => (
              <path
                key={`front-${idx}`}
                d={d}
                fill="none"
                stroke="url(#springWireGrad)"
                strokeWidth="4.3"
                strokeLinecap="round"
              />
            ))}

            {/* الساق السفلية للنابض المتصلة بالحلقة الأخيرة والمؤشر */}
            <path
              d={`M ${SPRING_X + coilRadius} ${coilEndY} C ${SPRING_X + coilRadius} ${coilEndY + 5}, ${SPRING_X} ${coilEndY + 4}, ${SPRING_X} ${pointerY}`}
              fill="none"
              stroke="#334155"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <line
              x1={SPRING_X}
              y1={pointerY}
              x2={SPRING_X}
              y2={hookTipY}
              stroke="#334155"
              strokeWidth="3.2"
              strokeLinecap="round"
            />

            {/* تسمية النابض */}
            <text
              x={SPRING_X + 38}
              y={(COIL_START_Y + coilEndY) / 2}
              textAnchor="start"
              className="text-[14px] font-bold fill-slate-800"
            >
              نابض حلزوني
            </text>

            {/* المؤشر الأفقي (يشير من الحلقة الأخيرة السفلى نحو المسطرة المدرجة والورقة) */}
            <g id="spring-pointer">
              <line
                x1={SPRING_X}
                y1={pointerY}
                x2={204}
                y2={pointerY}
                stroke="#dc2626"
                strokeWidth="2.4"
              />
              {/* رأس سهم المؤشر */}
              <polygon
                points={`197,${pointerY} 207,${pointerY - 4.5} 207,${pointerY + 4.5}`}
                fill="#dc2626"
              />
              {/* عقدة تثبيت المؤشر على النابض */}
              <circle
                cx={SPRING_X}
                cy={pointerY}
                r="4.2"
                fill="#dc2626"
                stroke="#ffffff"
                strokeWidth="1.2"
              />
              <text
                x={SPRING_X + 36}
                y={pointerY + 4}
                textAnchor="start"
                className="text-[13px] font-bold fill-rose-700"
              >
                مؤشر
              </text>
            </g>

            {/* خطاف التعليق السفلي (قابل للسحب بالماوس أيضاً لشد النابض يدوياً) */}
            <g
              onPointerDown={handleStartSpringPull}
              className="cursor-ns-resize"
            >
              <path
                d={`M ${SPRING_X} ${hookTipY} C ${SPRING_X} ${hookTipY + 8}, ${SPRING_X - 8} ${hookTipY + 9}, ${SPRING_X - 7} ${hookTipY + 3}`}
                fill="none"
                stroke="#1e293b"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              {/* منطقة لمس شفافة لتسهيل مسك الخطاف */}
              <circle cx={SPRING_X} cy={hookTipY + 3} r="13" fill="transparent" />
            </g>
          </g>

          {/* ==================== متجهات القوى المتبادلة (قوة الثقل وقوة المرونة المعيدة) ==================== */}
          {showForceVectors && totalForceN > 0 && (
            <g className="pointer-events-none">
              {(() => {
                const arrowLen = Math.min(82, 22 + totalForceN * 95);
                const vx = SPRING_X - 38;
                return (
                  <>
                    {/* قوة المرونة المعيدة لأعلى (قوى التجاذب الجزيئي) */}
                    <line
                      x1={vx}
                      y1={pointerY - 6}
                      x2={vx}
                      y2={pointerY - 6 - arrowLen}
                      stroke="#059669"
                      strokeWidth="2.6"
                    />
                    <polygon
                      points={`${vx},${pointerY - 13 - arrowLen} ${vx - 5},${pointerY - 4 - arrowLen} ${vx + 5},${pointerY - 4 - arrowLen}`}
                      fill="#059669"
                    />
                    <text
                      x={vx - 8}
                      y={pointerY - 12 - arrowLen / 2}
                      textAnchor="end"
                      className="text-[10px] font-bold fill-emerald-700"
                    >
                      قوة المرونة
                    </text>

                    {/* قوة الثقل الخارجي لأسفل */}
                    <line
                      x1={vx}
                      y1={pointerY + 8}
                      x2={vx}
                      y2={pointerY + 8 + arrowLen}
                      stroke="#d97706"
                      strokeWidth="2.6"
                    />
                    <polygon
                      points={`${vx},${pointerY + 15 + arrowLen} ${vx - 5},${pointerY + 6 + arrowLen} ${vx + 5},${pointerY + 6 + arrowLen}`}
                      fill="#d97706"
                    />
                    <text
                      x={vx - 8}
                      y={pointerY + 14 + arrowLen / 2}
                      textAnchor="end"
                      direction="ltr"
                      className="font-mono text-[10px] font-bold fill-amber-700"
                    >
                      F = {totalForceN.toFixed(1)}N
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          {/* ==================== الأثقال المعلقة شاقولياً بالنابض ==================== */}
          {apparatusMode === ApparatusMode.ChainedWeights ? (
            /* وضع الشكل (3-2): تعليق الأثقال بالتتابع واحداً تحت الآخر شاقولياً */
            <g id="chained-hanging-weights">
              {attachedWeights.map((weight, idx) => {
                // إذا كان المستخدم يسحب هذا الثقل خارج محور النابض فلا نرسمه في السلسلة بل يتبع الماوس
                const isBeingDraggedAway =
                  dragState?.type === 'ATTACHED_WEIGHT' &&
                  dragState.weightId === weight.id &&
                  isDetachingAttachedWeight;

                if (isBeingDraggedAway) return null;

                const wy = hookTipY + 18 + idx * 32;
                return (
                  <g
                    key={weight.id}
                    onPointerDown={(e) =>
                      handleStartDragAttachedWeight(e, weight, SPRING_X, wy)
                    }
                    className="cursor-grab active:cursor-grabbing"
                  >
                    {renderWeightGraphic(weight, SPRING_X, wy, {
                      showTopHook: true,
                      showBottomRing: true,
                    })}
                  </g>
                );
              })}

              {attachedWeights.length > 0 && (
                <text
                  x={SPRING_X + 34}
                  y={hookTipY + 22 + (attachedWeights.length - 1) * 16}
                  textAnchor="start"
                  className="text-[12.5px] font-semibold fill-slate-700"
                >
                  {attachedWeights.length === 1 ? 'ثقل معلق' : `أثقال معلقة (${totalForceN.toFixed(1)}N)`}
                </text>
              )}
            </g>
          ) : (
            /* وضع الشكل (2-2): كفة الميزان والأثقال بداخلها */
            <g id="scale-pan-mode">
              {/* خيطا تعليق كفة الميزان */}
              <line
                x1={SPRING_X}
                y1={hookTipY + 4}
                x2={SPRING_X - 38}
                y2={panPlateY}
                stroke="#475569"
                strokeWidth="1.8"
              />
              <line
                x1={SPRING_X}
                y1={hookTipY + 4}
                x2={SPRING_X + 38}
                y2={panPlateY}
                stroke="#475569"
                strokeWidth="1.8"
              />
              {/* صحن كفة الميزان */}
              <path
                d={`M ${SPRING_X - 44} ${panPlateY - 3} L ${SPRING_X - 38} ${panPlateY + 4} L ${SPRING_X + 38} ${panPlateY + 4} L ${SPRING_X + 44} ${panPlateY - 3} Z`}
                fill="#64748b"
                stroke="#1e293b"
                strokeWidth="1.4"
                onPointerDown={handleStartSpringPull}
                className="cursor-ns-resize"
              />
              <text
                x={SPRING_X + 52}
                y={panPlateY + 2}
                textAnchor="start"
                className="text-[13px] font-bold fill-slate-800"
              >
                كفة الميزان
              </text>

              {/* الأثقال الموضوعة فوق كفة الميزان */}
              {attachedWeights.map((weight, idx) => {
                const isBeingDraggedAway =
                  dragState?.type === 'ATTACHED_WEIGHT' &&
                  dragState.weightId === weight.id &&
                  isDetachingAttachedWeight;

                if (isBeingDraggedAway) return null;

                // ترتيب الأثقال بشكل متراص أنيق داخل كفة الميزان
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                const offsetX = attachedWeights.length === 1 ? 0 : col === 0 ? -15 : 15;
                const wx = SPRING_X + offsetX;
                const wy = panPlateY - 12 - row * 20;

                return (
                  <g
                    key={weight.id}
                    onPointerDown={(e) =>
                      handleStartDragAttachedWeight(e, weight, wx, wy)
                    }
                    className="cursor-grab active:cursor-grabbing"
                  >
                    {renderWeightGraphic(weight, wx, wy, {
                      showTopHook: false,
                      showBottomRing: false,
                      compactInPan: true,
                    })}
                  </g>
                );
              })}
            </g>
          )}

          {/* ==================== حامل الأثقال على المنضدة (الأثقال المتاحة للرفع بالماوس) ==================== */}
          <g id="bench-weights-rack">
            {/* رف ثانوي صغير للأثقال الإضافية على يمين المنضدة */}
            <rect
              x="466"
              y={TABLE_TOP_Y - 54}
              width="250"
              height="6"
              rx="2"
              fill="#cbd5e1"
              stroke="#94a3b8"
              strokeWidth="1"
            />
            <rect x="480" y={TABLE_TOP_Y - 48} width="6" height="48" fill="#94a3b8" />
            <rect x="696" y={TABLE_TOP_Y - 48} width="6" height="48" fill="#94a3b8" />

            <text
              x="591"
              y={TABLE_TOP_Y - 116}
              textAnchor="middle"
              className="text-[12.5px] font-bold fill-slate-700"
            >
              الأثقال المتساوية (كل ثقل = 0.1N)
            </text>

            {weights.map((weight) => {
              const slotPos = getBenchSlotPosition(weight.slotIndex);
              const isCurrentlyDraggedFromBench =
                dragState?.type === 'BENCH_WEIGHT' &&
                dragState.weightId === weight.id;

              if (weight.isAttached || isCurrentlyDraggedFromBench) {
                // رسم موضع فارغ هادئ على المنضدة يدل على مكان الثقل الأصلي
                return (
                  <g key={`slot-${weight.id}`} opacity="0.4">
                    <rect
                      x={slotPos.x - 16}
                      y={slotPos.y - 10}
                      width="32"
                      height="20"
                      rx="3"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                  </g>
                );
              }

              return (
                <g
                  key={weight.id}
                  onPointerDown={(e) =>
                    handleStartDragBenchWeight(e, weight, slotPos.x, slotPos.y)
                  }
                  className="cursor-grab active:cursor-grabbing hover:opacity-95"
                >
                  {/* هالة تفاعلية شفافة لتسهيل الالتقاط بالماوس */}
                  <rect
                    x={slotPos.x - 26}
                    y={slotPos.y - 26}
                    width="52"
                    height="46"
                    fill="transparent"
                  />
                  {renderWeightGraphic(weight, slotPos.x, slotPos.y, {
                    showTopHook: true,
                    showBottomRing: false,
                  })}
                </g>
              );
            })}
          </g>

          {/* ==================== الثقل المسحوب حالياً تحت مؤشر الماوس ==================== */}
          {draggedWeightObj &&
            draggedCenter &&
            (dragState?.type === 'BENCH_WEIGHT' || isDetachingAttachedWeight) && (
              <g className="pointer-events-none">
                {renderWeightGraphic(
                  draggedWeightObj,
                  draggedCenter.x,
                  draggedCenter.y,
                  {
                    showTopHook: true,
                    showBottomRing: apparatusMode === ApparatusMode.ChainedWeights,
                    isDragged: true,
                  }
                )}
              </g>
            )}
        </svg>
      </div>

      {/* شريط تحكم سفلي سريع للوصول الشامل (لوحة المفاتيح أو الإضافة/الإزالة السريعة) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <span>تحكم سريع بالأثقال إلى جانب السحب بالماوس:</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={attachedWeights.length >= weights.length}
            onClick={() => {
              const nextAvailable = weights.find((w) => !w.isAttached);
              if (nextAvailable) onAttachWeight(nextAvailable.id);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>تعليق ثقل (0.1N+)</span>
          </button>

          <button
            type="button"
            disabled={attachedWeights.length === 0}
            onClick={() => {
              const lastAttached = attachedWeights[attachedWeights.length - 1];
              if (lastAttached) onDetachWeight(lastAttached.id);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>رفع ثقل للمنضدة (0.1N-)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
