import React from 'react';

interface HeaderProps {
  onResetLab: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onResetLab }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#lab"
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600"
        >
          مختبر المرونة وقانون هوك
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <a
            href="#lab"
            className="hover:text-slate-900 hover:underline underline-offset-8 decoration-sky-600 decoration-2 transition-colors whitespace-nowrap shrink-0"
          >
            المختبر التفاعلي
          </a>
          <a
            href="#readings"
            className="hover:text-slate-900 hover:underline underline-offset-8 decoration-sky-600 decoration-2 transition-colors whitespace-nowrap shrink-0"
          >
            جدول القراءات
          </a>
          <a
            href="#comparison"
            className="hover:text-slate-900 hover:underline underline-offset-8 decoration-sky-600 decoration-2 transition-colors whitespace-nowrap shrink-0"
          >
            مقارنة الأشكال
          </a>
          <a
            href="#calculator"
            className="hover:text-slate-900 hover:underline underline-offset-8 decoration-sky-600 decoration-2 transition-colors whitespace-nowrap shrink-0"
          >
            حاسبة هوك
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onResetLab}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:scale-[0.99] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            إعادة ضبط المختبر
          </button>
        </div>
      </div>
    </header>
  );
};
