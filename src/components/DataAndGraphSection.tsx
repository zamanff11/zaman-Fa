import React from 'react';
import { Download, ListPlus, Trash2 } from 'lucide-react';
import { RecordedReading } from '../types/physics';

interface DataAndGraphSectionProps {
  readings: RecordedReading[];
  currentForceN: number;
  currentElongationCm: number;
  springConstantK: number;
  onFillStandardReadings: () => void;
  onDeleteReading: (id: string) => void;
  onClearReadings: () => void;
}

export const DataAndGraphSection: React.FC<DataAndGraphSectionProps> = ({
  readings,
  currentForceN,
  currentElongationCm,
  springConstantK,
  onFillStandardReadings,
  onDeleteReading,
  onClearReadings,
}) => {
  // تصدير النتائج بصيغة CSV
  const handleDownloadCsv = () => {
    if (readings.length === 0) return;
    const headers = [
      'رقم القراءة',
      'عدد الأثقال',
      'القوة المؤثرة F (N)',
      'الاستطالة ΔL (cm)',
      'ثابت المرونة k (N/m)',
    ];
    const rows = readings.map((r, i) => [
      i + 1,
      r.weightsCount,
      r.forceN.toFixed(2),
      r.elongationCm.toFixed(2),
      r.springConstantNPerM.toFixed(2),
    ]);
    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hookes-law-readings.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // إعدادات الرسم البياني لقانون هوك (F بدلالة ΔL)
  const chartW = 520;
  const chartH = 320;
  const padLeft = 58;
  const padRight = 28;
  const padTop = 24;
  const padBottom = 48;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const maxForce = 0.65; // نيوتن
  const maxElongCm = Math.max(2.0, (0.6 / springConstantK) * 100 * 1.08);

  const toPlotX = (cm: number) =>
    padLeft + Math.min(1, Math.max(0, cm / maxElongCm)) * plotW;
  const toPlotY = (f: number) =>
    padTop + plotH - Math.min(1, Math.max(0, f / maxForce)) * plotH;

  // نهاية الخط المستقيم النظري لقانون هوك F = k * (ΔL / 100)
  const lineEndCm = Math.min(maxElongCm, (maxForce / springConstantK) * 100);
  const lineEndForce = (springConstantK * lineEndCm) / 100;

  const yTicks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
  const xStep = maxElongCm <= 2.2 ? 0.3 : 0.5;
  const xTicks: number[] = [];
  for (let v = 0; v <= maxElongCm + 0.01; v += xStep) {
    xTicks.push(Number(v.toFixed(1)));
  }

  return (
    <section id="readings" className="scroll-mt-20 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">
            جدول القراءات والعلاقة الطردية (قانون هوك)
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl">
            يوضح الجدول والمنحني البياني أن الزيادة الحاصلة في طول النابض (ΔL) تتناسب طردياً مع قوة الشد المؤثرة (F) ضمن حد المرونة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onFillStandardReadings}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ListPlus className="w-3.5 h-3.5 text-sky-600" />
            <span>إدراج قراءات الكتاب النموذجية</span>
          </button>

          <button
            type="button"
            disabled={readings.length === 0}
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-700" />
            <span>تنزيل CSV</span>
          </button>

          {readings.length > 0 && (
            <button
              type="button"
              onClick={onClearReadings}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح الجدول</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* جدول القياسات المسجلة */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-3.5 px-4 whitespace-nowrap">#</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">عدد الأثقال</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">القوة المؤثرة F (N)</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">الاستطالة ΔL (cm)</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">النسبة F / ΔL (N/m)</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {readings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 px-6 text-center text-slate-500 text-sm">
                      لا توجد قراءات مسجلة بعد. ارفع ثقلاً بالماوس وعلّقه بالنابض ثم اضغط «تسجيل القراءة الحالية في الجدول»، أو اضغط «إدراج قراءات الكتاب النموذجية».
                    </td>
                  </tr>
                ) : (
                  readings.map((row, idx) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-800">
                        {row.weightsCount}
                      </td>
                      <td
                        dir="ltr"
                        className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900 text-right"
                      >
                        {row.forceN.toFixed(2)} N
                      </td>
                      <td
                        dir="ltr"
                        className="py-3 px-4 font-mono tabular-nums font-semibold text-sky-700 text-right"
                      >
                        {row.elongationCm.toFixed(2)} cm
                      </td>
                      <td
                        dir="ltr"
                        className="py-3 px-4 font-mono tabular-nums text-slate-700 text-right"
                      >
                        {row.forceN === 0
                          ? '—'
                          : `${row.springConstantNPerM.toFixed(1)} N/m`}
                      </td>
                      <td className="py-3 px-4 text-left">
                        <button
                          type="button"
                          onClick={() => onDeleteReading(row.id)}
                          aria-label={`حذف القراءة رقم ${idx + 1}`}
                          className="text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>الاستنتاج العملي: النسبة بين القوة المؤثرة ومقدار الاستطالة تبقى مقداراً ثابتاً هو ثابت مرونة النابض (k).</span>
            <span dir="ltr" className="font-mono tabular-nums font-semibold text-slate-900">
              k = {springConstantK.toFixed(1)} N/m
            </span>
          </div>
        </div>

        {/* المنحني البياني الحي للعلاقة الطردية */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-slate-900">
              المنحني البياني للعلاقة بين (F) و (ΔL)
            </h3>
            <span className="text-xs text-slate-500">خط مستقيم يمر بنقطة الأصل</span>
          </div>

          <div dir="ltr" className="w-full">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-auto block"
              role="img"
              aria-label="الرسم البياني لقانون هوك يمثل القوة المؤثرة مقابل الاستطالة"
            >
              {/* خطوط الشبكة الأفقية وتدريجات المحور الصادي F */}
              {yTicks.map((fVal) => {
                const py = toPlotY(fVal);
                return (
                  <g key={`y-${fVal}`}>
                    <line
                      x1={padLeft}
                      y1={py}
                      x2={padLeft + plotW}
                      y2={py}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 8}
                      y={py + 3.5}
                      textAnchor="end"
                      className="font-mono text-[10px] fill-slate-500"
                    >
                      {fVal.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* خطوط الشبكة الشاقولية وتدريجات المحور السيني ΔL */}
              {xTicks.map((cmVal) => {
                const px = toPlotX(cmVal);
                return (
                  <g key={`x-${cmVal}`}>
                    <line
                      x1={px}
                      y1={padTop}
                      x2={px}
                      y2={padTop + plotH}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={px}
                      y={padTop + plotH + 16}
                      textAnchor="middle"
                      className="font-mono text-[10px] fill-slate-500"
                    >
                      {cmVal === 0 ? '0' : cmVal.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* المحوران المتعامدان */}
              <line
                x1={padLeft}
                y1={padTop}
                x2={padLeft}
                y2={padTop + plotH}
                stroke="#334155"
                strokeWidth="1.5"
              />
              <line
                x1={padLeft}
                y1={padTop + plotH}
                x2={padLeft + plotW}
                y2={padTop + plotH}
                stroke="#334155"
                strokeWidth="1.5"
              />

              {/* تسميات المحاور */}
              <text
                x={padLeft + plotW / 2}
                y={chartH - 8}
                textAnchor="middle"
                className="text-[11.5px] font-semibold fill-slate-700"
              >
                مقدار الزيادة في الطول ΔL (cm)
              </text>
              <text
                x={16}
                y={padTop + plotH / 2}
                textAnchor="middle"
                transform={`rotate(-90, 16, ${padTop + plotH / 2})`}
                className="text-[11.5px] font-semibold fill-slate-700"
              >
                القوة المؤثرة F (N)
              </text>

              {/* الخط المستقيم النظري لقانون هوك */}
              <line
                x1={toPlotX(0)}
                y1={toPlotY(0)}
                x2={toPlotX(lineEndCm)}
                y2={toPlotY(lineEndForce)}
                stroke="#0284c7"
                strokeWidth="2.2"
                strokeDasharray="5 4"
                opacity="0.7"
              />

              {/* النقاط المسجلة في الجدول */}
              {readings.map((r) => (
                <circle
                  key={r.id}
                  cx={toPlotX(r.elongationCm)}
                  cy={toPlotY(r.forceN)}
                  r="4.5"
                  fill="#0f172a"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              ))}

              {/* موقع حالة النابض الحية الآن */}
              <g>
                <line
                  x1={toPlotX(Math.max(0, currentElongationCm))}
                  y1={padTop + plotH}
                  x2={toPlotX(Math.max(0, currentElongationCm))}
                  y2={toPlotY(currentForceN)}
                  stroke="#0284c7"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <line
                  x1={padLeft}
                  y1={toPlotY(currentForceN)}
                  x2={toPlotX(Math.max(0, currentElongationCm))}
                  y2={toPlotY(currentForceN)}
                  stroke="#0284c7"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={toPlotX(Math.max(0, currentElongationCm))}
                  cy={toPlotY(currentForceN)}
                  r="6"
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            </svg>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>النقطة الزرقاء تمثل الحالة الآنية للنابض</span>
            <span>النقاط الداكنة تمثل القراءات المسجلة</span>
          </div>
        </div>
      </div>
    </section>
  );
};
