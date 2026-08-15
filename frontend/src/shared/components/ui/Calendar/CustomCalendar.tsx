import { useLayoutEffect, useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { STORAGE_KEYS } from '@/shared/utils/constants';
import {
  businessDateKey,
  businessTodayDateRange,
  parseBusinessDate,
  todayBusinessKey,
} from '@/shared/utils/businessDate';

// --- Types ---
type DateRange = {
  from: Date | null;
  to: Date | null;
};

type Preset = {
  label: string;
  getValue: () => DateRange;
};

interface RangeCalendarProps {
  value?: DateRange;
  onRangeChange?: (range: DateRange) => void;
  className?: string;
  align?: 'left' | 'right';
}

// --- Date Helper Functions ---
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const isSameDay = (d1: Date | null, d2: Date | null) => {
  if (!d1 || !d2) return false;
  return businessDateKey(d1) === businessDateKey(d2);
};

const isDateBetween = (date: Date, start: Date | null, end: Date | null) => {
  if (!start || !end) return false;
  const key = businessDateKey(date);
  return key > businessDateKey(start) && key < businessDateKey(end);
};

const formatDate = (date: Date | null): string => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateShort = (date: Date | null): string => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function persistRange(range: DateRange) {
  if (typeof window === 'undefined') return;
  if (range.from && range.to) {
    localStorage.setItem(
      STORAGE_KEYS.DATE_RANGE,
      JSON.stringify({ from: range.from.toISOString(), to: range.to.toISOString() })
    );
  } else {
    localStorage.removeItem(STORAGE_KEYS.DATE_RANGE);
  }
}

function applyRange(range: DateRange, onRangeChange?: (r: DateRange) => void) {
  persistRange(range);
  onRangeChange?.(range);
}

function businessDayDate(year: number, monthIndex: number, day: number): Date {
  const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return parseBusinessDate(key);
}

function shiftBusinessDayKey(key: string, deltaDays: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0, 0));
  return shifted.toISOString().slice(0, 10);
}

// --- Component ---
export default function RangeCalendar({
  value,
  onRangeChange,
  className = '',
  align = 'left',
}: RangeCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [tempRange, setTempRange] = useState<DateRange>({ from: null, to: null });

  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const currentRange = value ?? businessTodayDateRange();
  const currentRangeFromKey = currentRange.from?.getTime() ?? -1;
  const currentRangeToKey = currentRange.to?.getTime() ?? -1;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedAnchor = anchorRef.current?.contains(target);
      const clickedPanel = panelRef.current?.contains(target);

      if (!clickedAnchor && !clickedPanel) {
        setIsOpen(false);
        setTempRange({ from: currentRange.from, to: currentRange.to });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [currentRangeFromKey, currentRangeToKey, currentRange.from, currentRange.to]);

  const panelWidth = useMemo(() => {
    if (typeof window === 'undefined') return 420;
    return Math.min(420, Math.max(280, window.innerWidth - 16));
  }, []);

  // Position the dropdown panel relative to the trigger, but fixed to viewport.
  useLayoutEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined') return;

    const anchorEl = anchorRef.current;
    if (!anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();

      const gap = 8;
      let left = align === 'right' ? rect.right - panelWidth : rect.left;
      let top = rect.bottom + gap;

      left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));

      const panelRect = panelRef.current?.getBoundingClientRect();
      const panelHeight = panelRect?.height ?? 420;

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < panelHeight + gap && spaceAbove > panelHeight + gap) {
        top = rect.top - panelHeight - gap;
      }

      top = Math.max(8, Math.min(top, window.innerHeight - panelHeight - 8));

      setPanelStyle({
        position: 'fixed',
        left,
        top,
        width: panelWidth,
        zIndex: 60,
      });
    };

    updatePosition();
    requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, align, panelWidth]);

  const handleDayClick = (day: number) => {
    const clickedDate = businessDayDate(viewDate.getFullYear(), viewDate.getMonth(), day);

    let newRange: DateRange = { ...tempRange };

    if (!newRange.from || (newRange.from && newRange.to)) {
      newRange = { from: clickedDate, to: null };
    } else if (clickedDate < newRange.from) {
      newRange = { from: clickedDate, to: newRange.from };
    } else {
      newRange = { from: newRange.from, to: clickedDate };
    }
    setTempRange(newRange);
  };

  const handleApply = () => {
    if (!tempRange.from || !tempRange.to) return;

    const normalizedRange = {
      from: parseBusinessDate(businessDateKey(tempRange.from)),
      to: parseBusinessDate(businessDateKey(tempRange.to)),
    };

    setIsOpen(false);
    applyRange(normalizedRange, onRangeChange);
  };

  const handleClear = () => {
    const todayRange = businessTodayDateRange();
    setTempRange(todayRange);
    applyRange(todayRange, onRangeChange);
  };

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDayOfWeek = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptySlots = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const todayKey = todayBusinessKey();

  const presets: Preset[] = [
    {
      label: 'Today',
      getValue: () => businessTodayDateRange(),
    },
    {
      label: 'Last 7 Days',
      getValue: () => ({
        from: parseBusinessDate(shiftBusinessDayKey(todayKey, -6)),
        to: parseBusinessDate(todayKey),
      }),
    },
    {
      label: 'This Month',
      getValue: () => {
        const [y, m] = todayKey.split('-').map(Number);
        const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
        return { from: parseBusinessDate(monthStart), to: parseBusinessDate(todayKey) };
      },
    },
    {
      label: 'Last Month',
      getValue: () => {
        const [y, m] = todayKey.split('-').map(Number);
        const prevMonthStart =
          m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, '0')}-01`;
        const prevMonthEnd = shiftBusinessDayKey(`${y}-${String(m).padStart(2, '0')}-01`, -1);
        return { from: parseBusinessDate(prevMonthStart), to: parseBusinessDate(prevMonthEnd) };
      },
    },
    {
      label: 'This Quarter',
      getValue: () => {
        const [y, m] = todayKey.split('-').map(Number);
        const quarter = Math.floor((m - 1) / 3);
        const qStartMonth = quarter * 3 + 1;
        const qStart = `${y}-${String(qStartMonth).padStart(2, '0')}-01`;
        return { from: parseBusinessDate(qStart), to: parseBusinessDate(todayKey) };
      },
    },
    {
      label: 'This Year',
      getValue: () => {
        const y = todayKey.split('-')[0];
        return { from: parseBusinessDate(`${y}-01-01`), to: parseBusinessDate(todayKey) };
      },
    },
  ];

  const applyPreset = (preset: Preset) => {
    const newRange = preset.getValue();
    setTempRange(newRange);
    if (newRange.from) setViewDate(new Date(newRange.from));
    setIsOpen(false);
    applyRange(newRange, onRangeChange);
  };

  const isTodayOnly =
    currentRange.from &&
    currentRange.to &&
    isSameDay(currentRange.from, currentRange.to) &&
    businessDateKey(currentRange.from) === todayKey;

  const triggerLabel =
    currentRange.from && currentRange.to ? (
      isTodayOnly ? (
        <span className="text-indigo-600 font-semibold">Today</span>
      ) : (
        <>
          <span className="text-indigo-600 font-semibold">
            {formatDateShort(currentRange.from)}
          </span>
          <span className="mx-1.5 text-slate-400">→</span>
          <span className="text-indigo-600 font-semibold">{formatDateShort(currentRange.to)}</span>
        </>
      )
    ) : currentRange.from ? (
      <>
        <span className="text-indigo-600 font-semibold">{formatDateShort(currentRange.from)}</span>
        <span className="mx-1.5 text-slate-400">→</span>
        <span className="text-slate-400">Select end</span>
      </>
    ) : (
      <span className="text-slate-600">Today</span>
    );

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <div className="relative inline-flex" ref={anchorRef}>
        <button
          onClick={() => {
            setIsOpen((prev) => {
              const next = !prev;
              if (next) {
                setTempRange(currentRange);
                if (currentRange.from) {
                  setViewDate(new Date(currentRange.from));
                } else {
                  setViewDate(parseBusinessDate(todayBusinessKey()));
                }
              }
              return next;
            });
          }}
          className={`
            flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border shadow-sm transition-all
            ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow'}
            ${currentRange.from ? 'pr-10' : ''}
          `}
        >
          <Calendar
            className={`w-4 h-4 ${isOpen || currentRange.from ? 'text-indigo-600' : 'text-slate-500'}`}
          />
          <span className="text-sm font-medium text-slate-700">{triggerLabel}</span>
        </button>
        {currentRange.from && !isTodayOnly && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors z-10"
            aria-label="Reset to today"
          >
            <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
          </button>
        )}
      </div>

      {isOpen &&
        (typeof document !== 'undefined'
          ? createPortal(
              <>
                <div
                  className="fixed inset-0 z-50 bg-black/20 sm:hidden"
                  onClick={() => {
                    setIsOpen(false);
                    setTempRange(currentRange);
                  }}
                />

                <div
                  ref={panelRef}
                  style={panelStyle}
                  className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 p-2.5 sm:p-3 border-b border-slate-200">
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                      {presets.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className="px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 whitespace-nowrap shadow-sm transition-all flex-shrink-0"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <button
                        type="button"
                        onClick={() => changeMonth(-1)}
                        className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                      </button>
                      <span className="font-bold text-slate-800 text-sm sm:text-base">
                        {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeMonth(1)}
                        className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
                        aria-label="Next month"
                      >
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 mb-2">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                        <div key={d} className="text-center text-xs font-bold text-slate-500 py-1">
                          {d}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {emptySlots.map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {daysArray.map((day) => {
                        const date = businessDayDate(
                          viewDate.getFullYear(),
                          viewDate.getMonth(),
                          day
                        );
                        const isStart = isSameDay(date, tempRange.from);
                        const isEnd = isSameDay(date, tempRange.to);
                        const inRange = isDateBetween(date, tempRange.from, tempRange.to);
                        const today = businessDateKey(date) === todayKey;
                        const isPast = businessDateKey(date) < todayKey;

                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleDayClick(day)}
                            className={`
                              h-8 sm:h-9 w-full text-xs font-medium relative transition-all
                              ${isStart || isEnd ? 'bg-indigo-600 text-white font-bold shadow-md z-10' : ''}
                              ${isStart ? 'rounded-l-lg' : ''}
                              ${isEnd ? 'rounded-r-lg' : ''}
                              ${inRange && !isStart && !isEnd ? 'bg-indigo-100 text-indigo-700' : ''}
                              ${!isStart && !isEnd && !inRange ? 'hover:bg-slate-100 rounded-lg text-slate-700' : ''}
                              ${today && !isStart && !isEnd ? 'ring-2 ring-indigo-400 text-indigo-600 font-bold' : ''}
                              ${isPast && !isStart && !isEnd && !inRange && !today ? 'text-slate-400' : ''}
                            `}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div className="flex-1">
                        <div className="text-xs text-slate-500 font-medium">Selected Range:</div>
                        <div className="text-sm font-semibold text-slate-700 mt-0.5">
                          {tempRange.from && tempRange.to ? (
                            <>
                              {formatDate(tempRange.from)}{' '}
                              <span className="text-slate-400 mx-1">→</span>
                              {formatDate(tempRange.to)}
                            </>
                          ) : tempRange.from ? (
                            <>
                              {formatDate(tempRange.from)}{' '}
                              <span className="text-slate-400 mx-1">→</span>{' '}
                              <span className="text-slate-400">Select end date</span>
                            </>
                          ) : (
                            <span className="text-slate-400">Select start date</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setTempRange(currentRange);
                            setIsOpen(false);
                          }}
                          className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleApply}
                          disabled={!tempRange.from || !tempRange.to}
                          className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>,
              document.body
            )
          : null)}
    </div>
  );
}
