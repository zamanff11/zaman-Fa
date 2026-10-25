import React, { useState } from 'react';
import { BookOpen, Calculator, Play } from 'lucide-react';

interface ComparisonAndTheorySectionProps {
  springConstantK: number;
  attachedCount: number;
  onSelectWeightCount: (count: number) => void;
  onApplyCalculatorLoad: (forceN: number, newK: number) => void;
}

enum SolveTarget {
  Elongation = 'ELONGATION',
  Force = 'FORCE',
  ConstantK = 'CONSTANT_K',
}

export const ComparisonAndTheorySection: React.FC<
  ComparisonAndTheorySectionProps
> = ({
  springConstantK,
  attachedCount,
  onSelectWeightCount,
  onApplyCalculatorLoad,
}) => {
  const [showTextbookImage, setShowTextbookImage] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  // حالة حاسبة قانون هوك
  const [solveTarget, setSolveTarget] = useState<SolveTarget>(
    SolveTarget.Elongation
  );
  const [calcForceN, setCalcForceN] = useState<number>(0.2);
  const [calcK, setCalcK] = useState<number>(33.33);
  const [calcElongCm, setCalcElongCm] = useState<number>(0.6);

  // حساب النتيجة الرياضية بناءً على المجهول المختار
  const computedResult = (() => {
    if (solveTarget === SolveTarget.Elongation) {
      const deltaM = calcForceN / Math.max(1, calcK);
      const deltaCm = deltaM * 100;
      return {
        formula: 'ΔL = F / k',
        substitution: `${calcForceN.toFixed(2)} N ÷ ${calcK.toFixed(2)} N/m`,
        resultText: `${deltaCm.toFixed(2)} cm (${deltaM.toFixed(4)} m)`,
        forceToApply: calcForceN,
        kToApply: calcK,
      };
    }
    if (solveTarget === SolveTarget.Force) {
      const deltaM = calcElongCm / 100;
      const force = calcK * deltaM;
      return {
        formula: 'F = k · ΔL',
        substitution: `${calcK.toFixed(2)} N/m × ${deltaM.toFixed(4)} m`,
        resultText: `${force.toFixed(2)} N`,
        forceToApply: force,
        kToApply: calcK,
      };
    }
    const deltaM = Math.max(0.0005, calcElongCm / 100);
    const kVal = calcForceN / deltaM;
    return {
      formula: 'k = F / ΔL',
      substitution: `${calcForceN.toFixed(2)} N ÷ ${deltaM.toFixed(4)} m`,
      resultText: `${kVal.toFixed(2)} N/m`,
      forceToApply: calcForceN,
      kToApply: Math.min(100, Math.max(16.67, kVal)),
    };
  })();

  // حالات المقارنة الأربعة المحاكية للشكل (3-2) في الكتاب
  const statesComparison = [0, 1, 2, 3];

  const renderMiniSpringColumn = (count: number) => {
    const force = Number((count * 0.1).toFixed(1));
    const elongCm = (force / springConstantK) * 100;
    const zeroY = 74;
    const pxPerCm = 46;
    const pointerY = zeroY + Math.min(2.1, elongCm) * pxPerCm;
    const coils = 10;
    const startY = 26;
    const endY = Math.max(46, pointerY - 8);
    const pitch = (endY - startY) / coils;
    const sx = 92;
    const isActive = attachedCount === count;

    const coilPath: string[] = [];
    for (let i = 0; i < coils; i++) {
      const y0 = startY + i * pitch;
      const ym = y0 + pitch * 0.5;
      const y1 = y0 + pitch;
      coilPath.push(
        `M ${sx + 9} ${y0} C ${sx + 9} ${y0 + 2}, ${sx - 9} ${ym - 2}, ${sx - 9} ${ym} C ${sx - 9} ${ym + 2}, ${sx + 9} ${y1 - 2}, ${sx + 9} ${y1}`
      );
    }

    return (
      <button
        key={count}
        type="button"
        onClick={() => onSelectWeightCount(count)}
        className={`group text-right p-4 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-between ${
          isActive
            ? 'bg-sky-50/60 border-sky-500'
            : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-white'
        }`}
      >
        <div className="w-full flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-slate-700">
            {count === 0
              ? 'بدون ثقل'
              : count === 1
              ? 'ثقل واحد'
              : count === 2
              ? 'ثقلان'
              : 'ثلاثة أثقال'}
          </span>
          <span
            dir="ltr"
            className="font-mono tabular-nums font-bold text-slate-900"
          >
            F = {force.toFixed(1)}N
          </span>
        </div>

        <svg
          viewBox="0 0 145 225"
          className="w-full max-w-[150px] h-auto"
          aria-hidden="true"
        >
          {/* حامل الحديد العلوي */}
          <rect x="58" y="12" width="68" height="7" rx="2" fill="#334155" />
          <line x1={sx} y1="19" x2={sx + 9} y2={startY} stroke="#334155" strokeWidth="2" />

          {/* المسطرة المدرجة المصغرة كما في الشكل (3-2) */}
          <rect
            x="22"
            y="64"
            width="30"
            height="120"
            rx="1.5"
            fill="#ffffff"
            stroke="#475569"
            strokeWidth="1.2"
          />
          {[0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8].map((tickCm) => {
            const ty = zeroY + tickCm * pxPerCm;
            return (
              <g key={tickCm}>
                <line
                  x1="52"
                  y1={ty}
                  x2="44"
                  y2={ty}
                  stroke="#0f172a"
                  strokeWidth="1.2"
                />
                <text
                  x="41"
                  y={ty + 3}
                  textAnchor="end"
                  className="font-mono text-[8.5px] fill-slate-700"
                >
                  {tickCm === 0 ? '0' : tickCm.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* حلقات النابض */}
          <path
            d={coilPath.join(' ')}
            fill="none"
            stroke="#334155"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <line x1={sx + 9} y1={endY} x2={sx} y2={pointerY + 6} stroke="#334155" strokeWidth="2" />

          {/* المؤشر الأحمر */}
          <line
            x1={sx}
            y1={pointerY}
            x2="54"
            y2={pointerY}
            stroke="#dc2626"
            strokeWidth="1.8"
          />
          <polygon
            points={`52,${pointerY} 58,${pointerY - 3} 58,${pointerY + 3}`}
            fill="#dc2626"
          />

          {/* الأثقال المعلقة بالتتابع W */}
          {Array.from({ length: count }).map((_, wIdx) => {
            const wy = pointerY + 14 + wIdx * 22;
            return (
              <g key={wIdx} transform={`translate(${sx}, ${wy})`}>
                <line x1="0" y1="-8" x2="0" y2="-5" stroke="#334155" strokeWidth="1.6" />
                <rect
                  x="-10"
                  y="-5"
                  width="20"
                  height="14"
                  rx="1.5"
                  fill="#1e293b"
                />
                <text
                  x="0"
                  y="4.5"
                  textAnchor="middle"
                  className="font-mono text-[8px] font-bold fill-white"
                >
                  w
                </text>
              </g>
            );
          })}
        </svg>

        <div className="w-full pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs mt-2">
          <span className="text-slate-500">الزيادة ΔL:</span>
          <span
            dir="ltr"
            className="font-mono tabular-nums font-semibold text-sky-700"
          >
            {elongCm.toFixed(2)} cm
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-12">
      {/* القسم الثالث: مقارنة الأشكال المتتابعة كما في الشكل (3-2) والمرجع العلمي */}
      <section id="comparison" className="scroll-mt-20 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900">
              مقارنة مراحل الاستطالة بالتتابع — محاكاة الشكل (3-2)
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              اضغط على أي مرحلة لتطبيقها فوراً على النابض الرئيسي وملاحظة كيف تصبح الزيادة في طول النابض ضعف أو ثلاثة أضعاف الزيادة الأولى بانتظام.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowTextbookImage((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-sky-600" />
            <span>
              {showTextbookImage
                ? 'إخفاء صفحة الكتاب المرفقة'
                : 'عرض صفحة الكتاب المرفقة للمقارنة'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {statesComparison.map((count) => renderMiniSpringColumn(count))}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          {/* الشرح الفيزيائي لقوى التجاذب الجزيئي من صفحة الكتاب */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm leading-relaxed text-slate-700">
            <div className="space-y-1.5">
              <h3 className="font-bold text-slate-900">
                التفسير الجزيئي لمفهوم المرونة
              </h3>
              <p>
                إن السلك أو النابض الذي يعلق به ثقل يقاوم هذه القوة الخارجية المؤثرة فيه بقوة منشؤها قوى التجاذب الجزيئي بين جزيئات المادة نفسها، والتي تظهر نتيجة حدوث التغيير في شكل الجسم أو طوله، وتحاول إعادة الجسم إلى حالته الأصلية بعد زوال القوى المؤثرة.
              </p>
            </div>
            <div className="space-y-1.5 md:border-r md:border-slate-200 md:pr-8">
              <h3 className="font-bold text-slate-900">
                نص قانون روبرت هوك (Hooke&apos;s Law)
              </h3>
              <p>
                الزيادة الحاصلة في طول النابض تتناسب طردياً مع قوة الشد المؤثرة ضمن حد المرونة. وعند إزالة الأثقال المعلقة يعود المؤشر إلى التدريج الصفري تماماً ما دام الإجهاد لم يتجاوز حد المرونة للنابض.
              </p>
            </div>
          </div>

          {/* عرض صورة صفحة الكتاب المرفقة عند الطلب مع بديل آمن */}
          {showTextbookImage && (
            <div className="pt-5 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-3">
                الصفحة المرجعية المرفقة (نشاط مفهوم المرونة — شكل 2-2 وشكل 3-2):
              </p>
              {!imgError ? (
                <div className="max-w-xl mx-auto rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src="/assets/aistudio/________________a0113a60.jpg"
                    alt="صفحة الكتاب المدرسي لنشاط مفهوم المرونة وقانون هوك الشكل 2-2 والشكل 3-2"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-full h-auto object-contain max-h-[540px]"
                  />
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-slate-100 text-center text-sm text-slate-600">
                  نشاط مفهوم المرونة — الشكل (2-2) والشكل (3-2) لقانون هوك
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* القسم الرابع: حاسبة قانون هوك التفاعلية */}
      <section id="calculator" className="scroll-mt-20 space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">
            حاسبة قانون هوك الرياضية
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl">
            احسب أي متغير مجهول في العلاقة الرياضية (F = k · ΔL) وطبق القيم مباشرة على النابض الحلزوني في الأعلى.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 ml-2">
                المتغير المراد حسابه:
              </span>
              <div
                role="group"
                aria-label="اختيار المجهول الرياضي"
                className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => setSolveTarget(SolveTarget.Elongation)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    solveTarget === SolveTarget.Elongation
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  الاستطالة (ΔL)
                </button>
                <button
                  type="button"
                  onClick={() => setSolveTarget(SolveTarget.Force)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    solveTarget === SolveTarget.Force
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  القوة المؤثرة (F)
                </button>
                <button
                  type="button"
                  onClick={() => setSolveTarget(SolveTarget.ConstantK)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    solveTarget === SolveTarget.ConstantK
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ثابت المرونة (k)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {solveTarget !== SolveTarget.Force && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="calc-force"
                    className="block text-xs font-medium text-slate-700"
                  >
                    القوة المؤثرة F (بالنيوتن N)
                  </label>
                  <input
                    id="calc-force"
                    type="number"
                    min={0}
                    max={0.6}
                    step={0.1}
                    value={calcForceN}
                    onChange={(e) =>
                      setCalcForceN(Math.max(0, Number(e.target.value)))
                    }
                    className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
              )}

              {solveTarget !== SolveTarget.ConstantK && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="calc-k"
                    className="block text-xs font-medium text-slate-700"
                  >
                    ثابت مرونة النابض k (N/m)
                  </label>
                  <input
                    id="calc-k"
                    type="number"
                    min={10}
                    max={100}
                    step={0.5}
                    value={calcK}
                    onChange={(e) =>
                      setCalcK(Math.max(1, Number(e.target.value)))
                    }
                    className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
              )}

              {solveTarget !== SolveTarget.Elongation && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="calc-elong"
                    className="block text-xs font-medium text-slate-700"
                  >
                    مقدار الاستطالة ΔL (بالسنتيمتر cm)
                  </label>
                  <input
                    id="calc-elong"
                    type="number"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={calcElongCm}
                    onChange={(e) =>
                      setCalcElongCm(Math.max(0.05, Number(e.target.value)))
                    }
                    className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 pt-6 lg:pt-0 border-t lg:border-t-0 lg:border-r border-slate-200 lg:pr-8 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                <Calculator className="w-4 h-4 text-sky-600" />
                <span>خطوات التعويض الرياضي</span>
              </span>
              <span dir="ltr" className="font-mono font-semibold text-slate-800">
                {computedResult.formula}
              </span>
            </div>

            <div className="space-y-1 text-left" dir="ltr">
              <p className="text-xs font-mono text-slate-500">
                = {computedResult.substitution}
              </p>
              <p className="text-xl font-mono tabular-nums font-bold text-sky-700">
                = {computedResult.resultText}
              </p>
            </div>

            <a
              href="#lab"
              onClick={() =>
                onApplyCalculatorLoad(
                  computedResult.forceToApply,
                  computedResult.kToApply
                )
              }
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>محاكاة هذه القيم على النابض الحلزوني</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
