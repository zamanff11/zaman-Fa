import React from 'react';
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  RotateCcw,
  Sliders,
} from 'lucide-react';

interface ControlDeckProps {
  attachedCount: number;
  totalForceN: number;
  liveElongationCm: number;
  springConstantK: number;
  onChangeSpringConstantK: (k: number) => void;
  dampingRatio: number;
  onChangeDampingRatio: (d: number) => void;
  hasZeroPaperMark: boolean;
  recordedCount: number;
  autoRecord: boolean;
  onToggleAutoRecord: (val: boolean) => void;
  onRecordCurrentReading: () => void;
}

const TEXTBOOK_K = 100 / 3; // 33.3333 N/m => 0.30 cm per 0.1N

export const ControlDeck: React.FC<ControlDeckProps> = ({
  attachedCount,
  totalForceN,
  liveElongationCm,
  springConstantK,
  onChangeSpringConstantK,
  dampingRatio,
  onChangeDampingRatio,
  hasZeroPaperMark,
  recordedCount,
  autoRecord,
  onToggleAutoRecord,
  onRecordCurrentReading,
}) => {
  const isTextbookK = Math.abs(springConstantK - TEXTBOOK_K) < 0.25;
  const cmPer01N = (0.1 / springConstantK) * 100;

  // تتبع خطوات النشاط الأربع كما وردت في صفحة الكتاب (صفحة 16)
  const steps = [
    {
      id: 1,
      title: '01. الترتيب والتأشير الصفري (F = 0N)',
      desc: 'تثبيت النابض شاقولياً بحامل الحديد وتأشير موقع الحلقة السفلى عند الصفر على الورقة.',
      done: hasZeroPaperMark || attachedCount > 0 || recordedCount > 0,
    },
    {
      id: 2,
      title: '02. تعليق الثقل الأول (0.1N)',
      desc: 'ارفع ثقلاً مقداره 0.1N بالماوس وعلّقه بالنابض وسجّل الزيادة الحاصلة (0.3 cm قياسياً).',
      done: attachedCount >= 1 || recordedCount >= 1,
    },
    {
      id: 3,
      title: '03. مضاعفة الثقل المعلق (0.2N)',
      desc: 'علّق ثقلاً ثانياً ليصبح الكلي 0.2N ولاحظ تضاعف الزيادة إلى ضعف السابقة (0.6 cm).',
      done: attachedCount >= 2 || recordedCount >= 2,
    },
    {
      id: 4,
      title: '04. التكرار بالتتابع وتسجيل القراءات',
      desc: 'كرّر العملية باستعمال أثقال عدة بالتتابع وسجّل القراءات لتمثيل خط هوك البياني.',
      done: attachedCount >= 3 || recordedCount >= 3,
    },
  ];

  return (
    <aside className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-6">
      {/* القسم الأول: تسجيل القراءة الحالية */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">
            تسجيل القياسات المختبرية
          </h2>
          <span
            dir="ltr"
            className="text-xs font-mono tabular-nums text-slate-500"
          >
            F = k · ΔL
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100 text-sm">
          <div>
            <p className="text-xs text-slate-500 mb-1">القوة المطبقة (F)</p>
            <p dir="ltr" className="font-mono tabular-nums text-lg font-semibold text-slate-900 text-right">
              {totalForceN.toFixed(2)} N
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">الاستطالة الحالية (ΔL)</p>
            <p dir="ltr" className="font-mono tabular-nums text-lg font-semibold text-sky-700 text-right">
              {Math.max(0, liveElongationCm).toFixed(2)} cm
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRecordCurrentReading}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-sky-600 rounded-xl hover:bg-sky-700 active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap"
        >
          <ClipboardList className="w-4 h-4" />
          <span>تسجيل القراءة الحالية في الجدول</span>
        </button>

        <label className="flex items-center justify-between gap-3 text-xs text-slate-600 cursor-pointer select-none pt-1">
          <span>تسجيل القراءات تلقائياً عند تعليق كل ثقل</span>
          <input
            type="checkbox"
            checked={autoRecord}
            onChange={(e) => onToggleAutoRecord(e.target.checked)}
            className="w-4 h-4 rounded accent-sky-600 cursor-pointer"
          />
        </label>
      </div>

      {/* القسم الثاني: ضبط خصائص النابض والتخميد */}
      <div className="pt-5 border-t border-slate-200 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              معاملات النابض الحلزوني
            </h3>
          </div>
          {!isTextbookK && (
            <button
              type="button"
              onClick={() => onChangeSpringConstantK(TEXTBOOK_K)}
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900 underline underline-offset-4 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>معايرة الكتاب</span>
            </button>
          )}
        </div>

        {/* منزلق ثابت مرونة النابض k */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="spring-k-slider" className="font-medium text-slate-700">
              ثابت مرونة النابض (k)
            </label>
            <span dir="ltr" className="font-mono tabular-nums font-semibold text-slate-900">
              {springConstantK.toFixed(1)} N/m ({cmPer01N.toFixed(2)} cm / 0.1N)
            </span>
          </div>
          <input
            id="spring-k-slider"
            type="range"
            min={16.67}
            max={100}
            step={0.33}
            value={springConstantK}
            onChange={(e) => onChangeSpringConstantK(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>نابض مرن (استطالة أكبر)</span>
            <span>نابض صلب (استطالة أقل)</span>
          </div>
        </div>

        {/* منزلق تخميد التذبذب */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="damping-slider" className="font-medium text-slate-700">
              تخميد الحركة التوافقية
            </label>
            <span dir="ltr" className="font-mono tabular-nums font-semibold text-slate-900">
              {dampingRatio.toFixed(1)} s⁻¹
            </span>
          </div>
          <input
            id="damping-slider"
            type="range"
            min={1.5}
            max={15}
            step={0.5}
            value={dampingRatio}
            onChange={(e) => onChangeDampingRatio(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>اهتزاز مستمر</span>
            <span>استقرار سريع</span>
          </div>
        </div>
      </div>

      {/* القسم الثالث: خطوات النشاط التفاعلية من الكتاب المنهجي */}
      <div className="pt-5 border-t border-slate-200 space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            خطوات النشاط: مفهوم المرونة
          </h3>
          <span className="text-xs text-slate-500 tabular-nums">
            أُنجز {steps.filter((s) => s.done).length} / {steps.length}
          </span>
        </div>

        <ol className="space-y-3">
          {steps.map((step) => (
            <li key={step.id} className="flex items-start gap-2.5 text-xs">
              {step.done ? (
                <CheckCircle2
                  aria-label="مكتمل"
                  className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                />
              ) : (
                <Circle
                  aria-label="قيد التنفيذ"
                  className="w-4 h-4 text-slate-300 shrink-0 mt-0.5"
                />
              )}
              <div className="space-y-0.5">
                <p
                  className={`font-semibold ${
                    step.done ? 'text-slate-900' : 'text-slate-700'
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
};
