
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context';
import { Icons } from '../components/Icon.tsx';
import { Role, CompensatoryEntry } from '../types';
import { DateInput } from '../components/CustomInputs.tsx';
import { generateUUID } from '../utils.ts';
import { USERS } from '../constants';

export const CompensatoryPage: React.FC = () => {
  const { currentUser, compensatoryEntries, addCompensatoryEntry, updateCompensatoryEntry, deleteCompensatoryEntry, users } = useApp();
  
  // State for Selection
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // State for Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // Nuevo estado para editar
  
  // State for Delete Confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [entryType, setEntryType] = useState<'CREDIT' | 'TAKEN'>('CREDIT');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [entryAmount, setEntryAmount] = useState<number>(1);
  const [entryNote, setEntryNote] = useState('');

  const employees = useMemo(() => {
    if (currentUser.role === Role.ADMIN) {
      return users;
    }
    return users.filter(u => u.id === currentUser.id);
  }, [users, currentUser]);

  // Set default employee on mount
  useEffect(() => {
      if (employees.length > 0 && !selectedEmployeeId) {
          setSelectedEmployeeId(employees[0].id);
      }
  }, [employees]);

  // Derived Data
  const employeeEntries = useMemo(() => {
      if (!selectedEmployeeId) return [];
      return compensatoryEntries.filter(e => e.employeeId === selectedEmployeeId);
  }, [compensatoryEntries, selectedEmployeeId]);

  const stats = useMemo(() => {
      let credit = 0;
      let taken = 0;
      employeeEntries.forEach(e => {
          if (e.type === 'CREDIT') credit += e.amount;
          else taken += e.amount;
      });
      return { credit, taken, balance: credit - taken };
  }, [employeeEntries]);

  // Handlers
  const handleOpenModal = (type: 'CREDIT' | 'TAKEN') => {
      setEditingId(null); // Reset editing state
      setEntryType(type);
      setEntryDate(new Date().toISOString().split('T')[0]);
      setEntryAmount(1);
      setEntryNote('');
      setShowModal(true);
  };

  const handleEditEntry = (entry: CompensatoryEntry) => {
      setEditingId(entry.id);
      setEntryType(entry.type);
      
      const d = entry.date;
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setEntryDate(dateStr);
      
      setEntryAmount(entry.amount);
      setEntryNote(entry.note);
      setShowModal(true);
  };

  const handleSaveEntry = () => {
      if (!selectedEmployeeId) return;

      const [y, m, d] = entryDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);

      if (editingId) {
          // Update Mode
          // Encontrar el original para preservar createdAt
          const original = compensatoryEntries.find(e => e.id === editingId);
          if (original) {
              const updatedEntry: CompensatoryEntry = {
                  ...original,
                  date: dateObj,
                  type: entryType,
                  amount: entryAmount,
                  note: entryNote,
              };
              updateCompensatoryEntry(updatedEntry);
          }
      } else {
          // Create Mode
          const newEntry: CompensatoryEntry = {
              id: generateUUID(),
              employeeId: selectedEmployeeId,
              date: dateObj,
              type: entryType,
              amount: entryAmount,
              note: entryNote,
              createdAt: new Date()
          };
          addCompensatoryEntry(newEntry);
      }

      setShowModal(false);
  };

  const handleDeleteEntry = (id: string) => {
      setDeleteId(id);
  };

  const confirmDelete = () => {
      if (deleteId) {
          deleteCompensatoryEntry(deleteId);
          setDeleteId(null);
      }
  };

  const selectedEmployee = users.find(u => u.id === selectedEmployeeId);

  return (
    <div className="p-4 sm:p-6 pb-20 sm:pb-20 flex flex-col max-w-[1200px] mx-auto min-h-full">
      
      {/* Header */}
      <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
             Compensatorio
          </h1>
          <p className="text-gray-400 font-medium mt-1">Gestión de días libres y créditos laborales.</p>
      </div>

      {/* Employee Selector (Tabs) - FIX: Added px-6 (mobile) and sm:px-4 (desktop) to fix clipping */}
      <div className="flex items-center gap-4 mb-8 overflow-x-auto py-8 -mx-4 px-6 sm:mx-0 sm:px-4 no-scrollbar">
          {employees.map(u => (
              <button
                  key={u.id}
                  onClick={() => setSelectedEmployeeId(u.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all shrink-0 ${
                      selectedEmployeeId === u.id
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200 scale-105 z-10'
                          : 'bg-white border-gray-100 text-gray-500 lg:hover:border-emerald-200 lg:hover:text-emerald-500'
                  }`}
              >
                  <img src={u.avatar} className="w-8 h-8 rounded-full border-2 border-white/30" alt={u.name} />
                  <span className="font-bold text-sm">{u.name}</span>
              </button>
          ))}
      </div>

      {selectedEmployeeId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Stats & Actions */}
              <div className="space-y-6">
                  {/* Balance Card */}
                  <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-100 relative overflow-hidden">
                      <div className="relative z-10">
                          <p className="text-emerald-50 font-bold text-sm uppercase tracking-wider mb-2">Saldo a Favor</p>
                          <div className="flex items-baseline gap-2">
                              <span className={`text-6xl font-bold tracking-tighter ${stats.balance < 0 ? 'text-rose-200' : 'text-white'}`}>
                                  {stats.balance > 0 ? '+' : ''}{stats.balance}
                              </span>
                              <span className="text-xl font-medium opacity-90">días</span>
                          </div>
                          
                          <div className="mt-8 flex gap-8 border-t border-white/20 pt-6">
                              <div>
                                  <div className="flex items-center gap-2 text-emerald-100 mb-1">
                                      <Icons.TrendingUp size={16} /> <span className="text-xs font-bold uppercase">A favor</span>
                                  </div>
                                  <span className="text-2xl font-bold">{stats.credit}</span>
                              </div>
                              <div>
                                  <div className="flex items-center gap-2 text-emerald-100 mb-1">
                                      <Icons.TrendingDown size={16} /> <span className="text-xs font-bold uppercase">Tomados</span>
                                  </div>
                                  <span className="text-2xl font-bold">{stats.taken}</span>
                              </div>
                          </div>
                      </div>
                      {/* Abstract Circles */}
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-900/10 rounded-full blur-xl"></div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-4">
                      <button 
                          onClick={() => handleOpenModal('CREDIT')}
                          className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 lg:hover:bg-emerald-100 lg:hover:border-emerald-200 lg:hover:shadow-md transition-all group"
                      >
                          <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-sm lg:group-hover:scale-110 transition-transform">
                              <Icons.Plus size={24} />
                          </div>
                          <span className="font-bold text-emerald-700 text-sm">Día a favor</span>
                      </button>

                      <button 
                          onClick={() => handleOpenModal('TAKEN')}
                          className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 lg:hover:bg-orange-100 lg:hover:border-orange-200 lg:hover:shadow-md transition-all group"
                      >
                          <div className="w-12 h-12 bg-orange-400 text-white rounded-full flex items-center justify-center shadow-sm lg:group-hover:scale-110 transition-transform">
                              <Icons.Calendar size={24} />
                          </div>
                          <span className="font-bold text-orange-700 text-sm">Registrar Tomado</span>
                      </button>
                  </div>
              </div>

              {/* Right Column: History */}
              <div className="lg:col-span-2">
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
                      <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                          <h3 className="font-bold text-gray-700 flex items-center gap-2">
                              <Icons.History size={20} className="text-gray-400" /> Historial
                          </h3>
                          <span className="text-xs font-bold bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-500">
                              {employeeEntries.length} registros
                          </span>
                      </div>
                      
                      <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                          {employeeEntries.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                  <Icons.Scale size={48} className="mb-4 opacity-20" />
                                  <p className="text-sm font-medium">Sin movimientos registrados</p>
                              </div>
                          ) : (
                              employeeEntries.map(entry => (
                                  <div key={entry.id} className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl lg:hover:bg-gray-50 border border-transparent lg:hover:border-gray-100 transition-all">
                                      <div className="flex items-center gap-4 w-full sm:w-auto">
                                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm shrink-0 ${
                                              entry.type === 'CREDIT' 
                                                ? 'bg-emerald-100 text-emerald-600' 
                                                : 'bg-orange-100 text-orange-600'
                                          }`}>
                                              {entry.type === 'CREDIT' ? '+' : '-'}{entry.amount}
                                          </div>
                                          
                                          {/* Contenido Texto Mobile/Desktop */}
                                          <div className="flex-1 min-w-0 sm:w-48 lg:w-auto">
                                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                                                  <p className="font-bold text-gray-800 text-sm">
                                                      {entry.type === 'CREDIT' ? 'Día a favor' : 'Día Tomado'}
                                                  </p>
                                                  <span className="text-xs text-gray-400 font-medium sm:ml-2">
                                                      {entry.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                  </span>
                                              </div>
                                              <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                  {entry.note || 'Sin nota'}
                                              </p>
                                          </div>
                                      </div>

                                      {/* Action Buttons - Always visible on mobile, visible on hover desktop */}
                                      <div className="flex items-center justify-end gap-2 w-full sm:w-auto sm:ml-auto lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                                           <button 
                                              onClick={() => handleEditEntry(entry)}
                                              className="p-2 text-gray-400 lg:hover:text-emerald-500 lg:hover:bg-emerald-50 rounded-lg transition-colors"
                                              title="Editar registro"
                                          >
                                              <Icons.Edit size={18} />
                                          </button>
                                          <button 
                                              onClick={() => handleDeleteEntry(entry.id)}
                                              className="p-2 text-gray-400 lg:hover:text-red-500 lg:hover:bg-red-50 rounded-lg transition-colors"
                                              title="Eliminar registro"
                                          >
                                              <Icons.Delete size={18} />
                                          </button>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              </div>

          </div>
      )}

      {/* Modal: Create / Edit */}
      {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
                      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                          {editingId ? (
                              <>
                                <Icons.Edit size={24} className="text-gray-400" /> Editar Registro
                              </>
                          ) : (
                              entryType === 'CREDIT' 
                                ? <><div className="w-3 h-3 rounded-full bg-emerald-500" /> Registrar Día a Favor</> 
                                : <><div className="w-3 h-3 rounded-full bg-orange-500" /> Registrar Día Tomado</>
                          )}
                      </h2>
                      <button onClick={() => setShowModal(false)} className="p-2 lg:hover:bg-gray-100 rounded-full text-gray-400">
                          <Icons.Close size={20} />
                      </button>
                  </div>

                  <div className="space-y-6">
                      <DateInput 
                          label="Fecha del evento" 
                          value={entryDate} 
                          onChange={(e) => setEntryDate(e.target.value)} 
                      />

                      <div>
                          <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cantidad (Días)</div>
                          <div className="flex gap-3">
                              <button 
                                  onClick={() => setEntryAmount(1)}
                                  className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${
                                      entryAmount === 1 
                                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200' 
                                          : 'bg-white text-gray-500 border-gray-200 lg:hover:border-emerald-200 lg:hover:text-emerald-600'
                                  }`}
                              >
                                  1 Día (Completo)
                              </button>
                              <button 
                                  onClick={() => setEntryAmount(0.5)}
                                  className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${
                                      entryAmount === 0.5 
                                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200' 
                                          : 'bg-white text-gray-500 border-gray-200 lg:hover:border-emerald-200 lg:hover:text-emerald-600'
                                  }`}
                              >
                                  0.5 (Medio Día)
                              </button>
                          </div>
                      </div>

                      <div>
                          <label htmlFor="field-d13ygu" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nota</label>
                          <input id="field-d13ygu" name="field-d13ygu" 
                              type="text" 
                              value={entryNote}
                              onChange={(e) => setEntryNote(e.target.value)}
                              placeholder={entryType === 'CREDIT' ? "Ej: Trabajó feriado, cubrió a compañera..." : "Ej: Vacaciones, asuntos personales..."}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                          />
                      </div>
                  </div>

                  <div className="mt-8 flex gap-3">
                      <button 
                          onClick={() => setShowModal(false)} 
                          className="flex-1 py-3 bg-gray-50 text-gray-500 font-bold rounded-xl lg:hover:bg-gray-100"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={handleSaveEntry} 
                          className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all lg:active:scale-95 ${
                              entryType === 'CREDIT' 
                                  ? 'bg-emerald-500 lg:hover:bg-emerald-600 shadow-emerald-200' 
                                  : 'bg-orange-500 lg:hover:bg-orange-600 shadow-orange-200'
                          }`}
                      >
                          {editingId ? 'Actualizar' : 'Guardar'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Modal: Delete Confirmation (Standardized - rounded-[2rem]) */}
      {deleteId && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none">
            <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 flex flex-col items-center">
               <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 shadow-sm">
                  <Icons.Delete size={24} />
               </div>
               <h2 className="text-xl font-bold text-gray-800 mb-2">¿Eliminar registro?</h2>
               <p className="text-gray-500 mb-6 max-w-xs text-center text-sm">
                  Esta acción es permanente y afectará el saldo del empleado.
               </p>
               <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setDeleteId(null)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl lg:hover:bg-gray-200 transition-colors"
                  >
                     Cancelar
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl lg:hover:bg-red-600 shadow-lg shadow-red-200 transition-all lg:active:scale-95"
                  >
                     Eliminar
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};