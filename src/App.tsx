import React, { useCallback, useState } from 'react';
import { Header } from './components/Header';
import { SpringStage } from './components/SpringStage';
import { ControlDeck } from './components/ControlDeck';
import { DataAndGraphSection } from './components/DataAndGraphSection';
import { ComparisonAndTheorySection } from './components/ComparisonAndTheorySection';
import {
  ApparatusMode,
  PaperMark,
  RecordedReading,
  RulerUnit,
  WeightItem,
} from './types/physics';

const TEXTBOOK_SPRING_K = 100 / 3; // 33.3333 N/m => استطالة 0.3 cm لكل ثقل 0.1N كما في الشكل (3-2)

const createInitialWeights = (): WeightItem[] =>
  Array.from({ length: 6 }, (_, idx) => ({
    id: `weight-${idx + 1}`,
    forceN: 0.1,
    label: '0.1N',
    slotIndex: idx,
    isAttached: false,
    attachOrder: -1,
  }));

const INITIAL_PAPER_MARKS: PaperMark[] = [
  {
    id: 'mark-zero',
    elongationCm: 0,
    forceN: 0,
    label: '0N',
  },
];

export default function App() {
  const [weights, setWeights] = useState<WeightItem[]>(createInitialWeights);
  const [apparatusMode, setApparatusMode] = useState<ApparatusMode>(
    ApparatusMode.ChainedWeights
  );
  const [rulerUnit, setRulerUnit] = useState<RulerUnit>(RulerUnit.Centimeter);
  const [springConstantK, setSpringConstantK] =
    useState<number>(TEXTBOOK_SPRING_K);
  const [dampingRatio, setDampingRatio] = useState<number>(6.5);
  const [paperMarks, setPaperMarks] =
    useState<PaperMark[]>(INITIAL_PAPER_MARKS);
  const [readings, setReadings] = useState<RecordedReading[]>([]);
  const [autoRecord, setAutoRecord] = useState<boolean>(true);
  const [liveElongationCm, setLiveElongationCm] = useState<number>(0);

  const attachedWeights = weights
    .filter((w) => w.isAttached)
    .sort((a, b) => a.attachOrder - b.attachOrder);

  const totalForceN = Number(
    attachedWeights.reduce((sum, w) => sum + w.forceN, 0).toFixed(2)
  );

  // إضافة علامة تأشير على الورقة خلف النابض
  const handleAddPaperMark = useCallback(
    (elongationCm: number, forceN: number) => {
      setPaperMarks((prev) => {
        const exists = prev.some(
          (m) => Math.abs(m.elongationCm - elongationCm) < 0.04
        );
        if (exists) return prev;
        return [
          ...prev,
          {
            id: `mark-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            elongationCm,
            forceN,
            label: `${forceN.toFixed(1)}N`,
          },
        ];
      });
    },
    []
  );

  // إدراج سجل في جدول القراءات
  const appendReadingRecord = useCallback(
    (count: number, force: number, elongCm: number, kVal: number) => {
      setReadings((prev) => {
        const duplicate = prev.some(
          (r) =>
            Math.abs(r.forceN - force) < 0.005 &&
            Math.abs(r.elongationCm - elongCm) < 0.015
        );
        if (duplicate) return prev;

        const computedK =
          force > 0 && elongCm > 0 ? force / (elongCm / 100) : kVal;

        const nextRow: RecordedReading = {
          id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          index: prev.length + 1,
          weightsCount: count,
          forceN: force,
          elongationCm: Number(elongCm.toFixed(2)),
          springConstantNPerM: Number(computedK.toFixed(2)),
          timestamp: new Date().toLocaleTimeString('ar-IQ', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };

        return [...prev, nextRow].sort((a, b) => a.forceN - b.forceN);
      });
    },
    []
  );

  // تعليق ثقل في النابض الحلزوني شاقولياً
  const handleAttachWeight = useCallback(
    (weightId: string) => {
      setWeights((prev) => {
        const target = prev.find((w) => w.id === weightId);
        if (!target || target.isAttached) return prev;

        const currentAttached = prev.filter((w) => w.isAttached);
        const maxOrder = currentAttached.reduce(
          (max, w) => Math.max(max, w.attachOrder),
          -1
        );

        const nextWeights = prev.map((w) =>
          w.id === weightId
            ? { ...w, isAttached: true, attachOrder: maxOrder + 1 }
            : w
        );

        const newAttachedCount = currentAttached.length + 1;
        const newForce = Number(
          nextWeights
            .filter((w) => w.isAttached)
            .reduce((sum, w) => sum + w.forceN, 0)
            .toFixed(2)
        );
        const eqElongationCm = Number(
          ((newForce / springConstantK) * 100).toFixed(2)
        );

        if (autoRecord) {
          appendReadingRecord(
            newAttachedCount,
            newForce,
            eqElongationCm,
            springConstantK
          );
          handleAddPaperMark(eqElongationCm, newForce);
        }

        return nextWeights;
      });
    },
    [autoRecord, springConstantK, appendReadingRecord, handleAddPaperMark]
  );

  // فصل ثقل وإعادته إلى المنضدة
  const handleDetachWeight = useCallback((weightId: string) => {
    setWeights((prev) => {
      const remainingAttached = prev
        .filter((w) => w.isAttached && w.id !== weightId)
        .sort((a, b) => a.attachOrder - b.attachOrder);

      const orderMap = new Map<string, number>();
      remainingAttached.forEach((w, idx) => orderMap.set(w.id, idx));

      return prev.map((w) => {
        if (w.id === weightId) {
          return { ...w, isAttached: false, attachOrder: -1 };
        }
        if (w.isAttached) {
          return { ...w, attachOrder: orderMap.get(w.id) ?? 0 };
        }
        return w;
      });
    });
  }, []);

  // تسجيل القراءة الحالية يدوياً
  const handleRecordCurrentReading = () => {
    const cleanElongCm = Number(Math.max(0, liveElongationCm).toFixed(2));
    appendReadingRecord(
      attachedWeights.length,
      totalForceN,
      cleanElongCm,
      springConstantK
    );
    handleAddPaperMark(cleanElongCm, totalForceN);
  };

  // تعبئة قراءات النشاط النموذجية كما في الشكل (3-2)
  const handleFillStandardReadings = () => {
    const standardCounts = [0, 1, 2, 3, 4];
    const generated: RecordedReading[] = standardCounts.map((c, idx) => {
      const f = Number((c * 0.1).toFixed(2));
      const dl = Number(((f / springConstantK) * 100).toFixed(2));
      return {
        id: `std-${idx}-${Date.now()}`,
        index: idx + 1,
        weightsCount: c,
        forceN: f,
        elongationCm: dl,
        springConstantNPerM: Number(springConstantK.toFixed(2)),
        timestamp: 'قياسي',
      };
    });
    setReadings(generated);
  };

  // اختيار عدد محدد من الأثقال من قسم مقارنة الأشكال
  const handleSelectWeightCount = (count: number) => {
    const clamped = Math.max(0, Math.min(weights.length, count));
    setWeights((prev) =>
      prev.map((w, idx) =>
        idx < clamped
          ? { ...w, isAttached: true, attachOrder: idx }
          : { ...w, isAttached: false, attachOrder: -1 }
      )
    );
  };

  // تطبيق القيم المحسوبة من حاسبة قانون هوك على النابض
  const handleApplyCalculatorLoad = (forceN: number, newK: number) => {
    setSpringConstantK(newK);
    const neededCount = Math.max(0, Math.min(weights.length, Math.round(forceN / 0.1)));
    handleSelectWeightCount(neededCount);
  };

  // إعادة ضبط المختبر بالكامل
  const handleResetLab = () => {
    setWeights(createInitialWeights());
    setSpringConstantK(TEXTBOOK_SPRING_K);
    setDampingRatio(6.5);
    setPaperMarks(INITIAL_PAPER_MARKS);
    setLiveElongationCm(0);
  };

  const handleLiveElongationChange = useCallback((elongCm: number) => {
    setLiveElongationCm(elongCm);
  }, []);

  const hasZeroPaperMark = paperMarks.some((m) => Math.abs(m.forceN) < 0.01);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header onResetLab={handleResetLab} />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-8 space-y-12">
        {/* لافتة بارزة وواضحة بأسماء المبرمجين */}
        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5 text-center shadow-xs">
          <p className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 leading-relaxed">
            تمت برمجته بواسطة الأخوان{' '}
            <span className="text-sky-700">زيد ومهند زمان فاضل الخفاجي</span>
          </p>
        </div>

        {/* القسم الأول: المختبر التفاعلي (مرحلة المحاكاة + لوحة الضبط) */}
        <section id="lab" className="scroll-mt-20 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>نشاط فيزيائي تفاعلي</span>
                <span aria-hidden="true">·</span>
                <span>مفهوم المرونة وقانون هوك</span>
                <span aria-hidden="true">·</span>
                <span>أثقال متساوية مقدار كل منها 0.1N</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                محاكاة النابض الحلزوني وتعليق الأثقال شاقولياً
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 max-w-md">
              التقط أي ثقل بالماوس من فوق المنضدة وارفعه لتعليقه في النابض الحلزوني شاقولياً، وراقب حركة المؤشر أمام المسطرة المدرجة.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-8">
              <SpringStage
                weights={weights}
                apparatusMode={apparatusMode}
                onChangeApparatusMode={setApparatusMode}
                rulerUnit={rulerUnit}
                onChangeRulerUnit={setRulerUnit}
                springConstantK={springConstantK}
                dampingRatio={dampingRatio}
                paperMarks={paperMarks}
                onAddPaperMark={handleAddPaperMark}
                onClearPaperMarks={() => setPaperMarks([])}
                onAttachWeight={handleAttachWeight}
                onDetachWeight={handleDetachWeight}
                onLiveElongationChange={handleLiveElongationChange}
              />
            </div>

            <div className="lg:col-span-4 flex">
              <ControlDeck
                attachedCount={attachedWeights.length}
                totalForceN={totalForceN}
                liveElongationCm={liveElongationCm}
                springConstantK={springConstantK}
                onChangeSpringConstantK={setSpringConstantK}
                dampingRatio={dampingRatio}
                onChangeDampingRatio={setDampingRatio}
                hasZeroPaperMark={hasZeroPaperMark}
                recordedCount={readings.length}
                autoRecord={autoRecord}
                onToggleAutoRecord={setAutoRecord}
                onRecordCurrentReading={handleRecordCurrentReading}
              />
            </div>
          </div>
        </section>

        {/* القسم الثاني: جدول النتائج والمنحني البياني */}
        <DataAndGraphSection
          readings={readings}
          currentForceN={totalForceN}
          currentElongationCm={liveElongationCm}
          springConstantK={springConstantK}
          onFillStandardReadings={handleFillStandardReadings}
          onDeleteReading={(id) =>
            setReadings((prev) => prev.filter((r) => r.id !== id))
          }
          onClearReadings={() => setReadings([])}
        />

        {/* القسم الثالث والرابع: مقارنة الأشكال (3-2) وحاسبة قانون هوك */}
        <ComparisonAndTheorySection
          springConstantK={springConstantK}
          attachedCount={attachedWeights.length}
          onSelectWeightCount={handleSelectWeightCount}
          onApplyCalculatorLoad={handleApplyCalculatorLoad}
        />
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1440px] mx-auto px-6 py-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-right">
            <p className="font-display text-lg sm:text-xl font-bold text-slate-900">
              تمت برمجته بواسطة الأخوان{' '}
              <span className="text-sky-700">زيد ومهند زمان فاضل الخفاجي</span>
            </p>
            <p className="text-xs text-slate-500">
              مختبر المرونة وقانون هوك — محاكاة تفاعلية للنابض الحلزوني والأثقال الشاقولية
            </p>
          </div>
          <a
            href="#lab"
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-4 whitespace-nowrap shrink-0"
          >
            العودة إلى أعلى المنصة
          </a>
        </div>
      </footer>
    </div>
  );
}
