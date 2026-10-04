
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icon.tsx';

// --- Utils ---
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

interface DateInputProps {
  value: string; // YYYY-MM-DD
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
}

export const DateInput: React.FC<DateInputProps> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Parse initial value or default to today
  const parseDate = (val: string) => {
    if (!val) return new Date();
    const [y, m, d] = val.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // State for the calendar view (navigation)
  const [viewDate, setViewDate] = useState(parseDate(value));
  // State for the currently selected date (temp until confirmed)
  const [selectedDate, setSelectedDate] = useState<Date>(parseDate(value));

  // Sync state when value prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const d = parseDate(value);
      setSelectedDate(d);
      setViewDate(d);
    }
  }, [isOpen, value]);

  // --- Logic ---

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  
  const getFirstDayOfMonth = (year: number, month: number) => {
    // JS getDay(): 0 = Sunday. We want 0 = Monday.
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; 
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  const confirmSelection = () => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    
    const event = {
      target: { value: `${y}-${m}-${d}` }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(event);
    setIsOpen(false);
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const handleMonthSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(parseInt(e.target.value));
    setViewDate(newDate);
  };

  const handleYearSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(viewDate);
    newDate.setFullYear(parseInt(e.target.value));
    setViewDate(newDate);
  };

  // --- Render Helpers ---

  // Generate Year Options (e.g., current year - 5 to + 5)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDayIndex = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
  const blanks = Array(firstDayIndex).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Display Format - Compact for Mobile
  const formattedDisplay = selectedDate ? 
    selectedDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 
    'Fecha';

  return (
    <div className="relative">
      {label && <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</div>}
      
      {/* Input Trigger */}
      <div 
        onClick={() => setIsOpen(true)} 
        className={`relative cursor-pointer group transition-all ${isOpen ? 'ring-2 ring-teal-500 rounded-xl' : ''}`}
      >
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500 pointer-events-none transition-transform group-hover:scale-110">
          <Icons.Calendar size={18} />
        </div>
        <div className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-3 py-3 font-bold text-gray-700 text-sm shadow-sm flex items-center capitalize select-none truncate">
           {formattedDisplay}
        </div>
        {/* Hidden native input for form compatibility if needed */}
        <input id="field-bt82c9" name="field-bt82c9" type="hidden" value={value} />
      </div>

      {/* Calendar Popup (PORTAL) */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 touch-none" onClick={() => setIsOpen(false)}>
           <div 
             className="bg-white rounded-2xl shadow-2xl w-[320px] max-w-full overflow-hidden animate-in zoom-in-95 duration-200 p-4 border border-gray-100"
             onClick={(e) => e.stopPropagation()}
           >
               {/* Header: Selectors & Navigation */}
               <div className="flex items-center justify-between mb-4">
                  <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-teal-600 transition-colors">
                     <Icons.ChevronLeft size={20} />
                  </button>
                  
                  <div className="flex gap-2">
                     {/* Month Select */}
                     <div className="relative group">
                        <select 
                          value={viewDate.getMonth()} 
                          onChange={handleMonthSelect}
                          className="appearance-none bg-gray-50 border border-gray-200 hover:border-teal-300 text-gray-700 text-sm font-bold py-1 px-3 pr-6 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          {MONTHS.map((m, i) => (
                            <option key={m} value={i}>{m}</option>
                          ))}
                        </select>
                     </div>
                     
                     {/* Year Select */}
                     <div className="relative group">
                        <select 
                          value={viewDate.getFullYear()} 
                          onChange={handleYearSelect}
                          className="appearance-none bg-gray-50 border border-gray-200 hover:border-teal-300 text-gray-700 text-sm font-bold py-1 px-3 pr-6 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          {years.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                     </div>
                  </div>

                  <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-teal-600 transition-colors">
                     <Icons.ChevronRight size={20} />
                  </button>
               </div>

               {/* Weekdays Header */}
               <div className="grid grid-cols-7 mb-2">
                  {WEEKDAYS.map(day => (
                     <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase py-1">
                        {day}
                     </div>
                  ))}
               </div>

               {/* Days Grid */}
               <div className="grid grid-cols-7 gap-1 mb-6">
                  {blanks.map((_, i) => <div key={`blank-${i}`} />)}
                  
                  {days.map(day => {
                     const currentDayDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                     const isSelected = 
                        selectedDate.getDate() === day && 
                        selectedDate.getMonth() === viewDate.getMonth() && 
                        selectedDate.getFullYear() === viewDate.getFullYear();
                     
                     const isToday = 
                        new Date().getDate() === day &&
                        new Date().getMonth() === viewDate.getMonth() &&
                        new Date().getFullYear() === viewDate.getFullYear();

                     return (
                        <button
                          key={day}
                          onClick={() => handleDayClick(day)}
                          className={`
                            h-9 w-full rounded-lg text-sm font-medium transition-all flex items-center justify-center
                            ${isSelected 
                              ? 'bg-teal-500 text-white shadow-md shadow-teal-200 font-bold scale-105' 
                              : 'text-gray-700 hover:bg-gray-100 hover:text-teal-600'
                            }
                            ${!isSelected && isToday ? 'text-teal-500 font-bold border border-teal-100' : ''}
                          `}
                        >
                           {day}
                        </button>
                     );
                  })}
               </div>

               {/* Footer Actions */}
               <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-3 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                     Cancelar
                  </button>
                  <button 
                    onClick={confirmSelection}
                    className="flex-1 py-3 text-xs font-bold bg-teal-500 text-white rounded-xl hover:bg-teal-600 shadow-lg shadow-teal-200 transition-all"
                  >
                     Seleccionar
                  </button>
               </div>
           </div>
        </div>,
        document.body
      )}
    </div>
  );
};

interface TimeSelectProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  label?: string;
}

export const TimeSelect: React.FC<TimeSelectProps> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Helpers to parse "HH:mm" -> { h, m, period }
  const parseTime = (val: string) => {
    if (!val) return { h: 9, m: 0, period: 'AM' };
    const [h24, m] = val.split(':').map(Number);
    const period = h24 >= 12 ? 'PM' : 'AM';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { h: h12, m, period };
  };

  const { h, m, period } = parseTime(value);

  const updateTime = (newH: number, newM: number, newPeriod: string) => {
    let h24 = newH;
    if (newPeriod === 'PM' && h24 !== 12) h24 += 12;
    if (newPeriod === 'AM' && h24 === 12) h24 = 0;
    
    const timeString = `${h24.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
    
    // Simulate event for parent component
    const event = {
      target: { value: timeString }
    } as React.ChangeEvent<HTMLSelectElement>;
    
    onChange(event);
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10...

  return (
    <div className="relative">
      {label && <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</div>}
      
      {/* Trigger Area */}
      <div 
        onClick={() => setIsOpen(true)} 
        className={`relative cursor-pointer group transition-all ${isOpen ? 'ring-2 ring-teal-500 rounded-xl' : ''}`}
      >
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500 pointer-events-none transition-transform group-hover:scale-110">
          <Icons.Clock size={18} />
        </div>
        <div className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-8 py-3 font-bold text-gray-700 text-sm shadow-sm flex items-center select-none truncate">
           {h}:{m.toString().padStart(2, '0')} {period}
        </div>
        <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
           <Icons.ChevronDown size={16} />
        </div>
      </div>

      {/* Custom Dropdown (PORTAL - Centered) */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 touch-none" onClick={() => setIsOpen(false)}>
           <div 
             className="bg-white rounded-2xl shadow-2xl w-[320px] max-w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col p-4 border border-gray-100"
             onClick={(e) => e.stopPropagation()}
           >
              {/* Header */}
              <div className="text-center pb-4 mb-2 border-b border-gray-50">
                  <h3 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-1">
                      {h}:{m.toString().padStart(2, '0')} 
                      <span className="text-xl text-teal-500 bg-teal-50 px-2 py-0.5 rounded-lg ml-1">{period}</span>
                  </h3>
              </div>
               
               {/* AM/PM Switcher */}
               <div className="flex bg-gray-50 p-1.5 rounded-xl mb-4">
                  {['AM', 'PM'].map(p => (
                    <button 
                      key={p}
                      onClick={() => updateTime(h, m, p)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                        period === p 
                        ? 'bg-white text-teal-600 shadow-sm' 
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
               </div>
               
               {/* Columns */}
               <div className="flex h-48 mb-4 border rounded-xl overflow-hidden border-gray-100">
                  {/* Hours Column */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-white border-r border-gray-50">
                     <div className="px-1 py-1">
                        <div className="text-[10px] text-gray-300 font-bold uppercase text-center py-2 sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-gray-50">Hora</div>
                        {hours.map(hour => (
                          <button
                            key={hour}
                            onClick={() => updateTime(hour, m, period)}
                            className={`w-full text-center py-2.5 rounded-lg text-sm font-bold transition-all mb-1 ${
                              h === hour 
                              ? 'bg-teal-50 text-teal-600' 
                              : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {hour}
                          </button>
                        ))}
                     </div>
                  </div>

                  {/* Minutes Column */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                     <div className="px-1 py-1">
                        <div className="text-[10px] text-gray-300 font-bold uppercase text-center py-2 sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-gray-50">Min</div>
                        {minutes.map(minute => (
                          <button
                            key={minute}
                            onClick={() => updateTime(h, minute, period)}
                            className={`w-full text-center py-2.5 rounded-lg text-sm font-bold transition-all mb-1 ${
                              m === minute 
                              ? 'bg-teal-50 text-teal-600' 
                              : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {minute.toString().padStart(2, '0')}
                          </button>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Done Button */}
               <button 
                   onClick={() => setIsOpen(false)}
                   className="w-full py-3 bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-200 hover:bg-teal-600 transition-all active:scale-95"
               >
                   Listo
               </button>
           </div>
        </div>,
        document.body
      )}
    </div>
  );
};
