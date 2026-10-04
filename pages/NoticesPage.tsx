
import React, { useState } from 'react';
import { useApp } from '../context';
import { Icons } from '../components/Icon.tsx';
import { Role, Notice } from '../types';

export const NoticesPage: React.FC = () => {
  const { notices, addNotice, updateNotice, deleteNotice, currentUser } = useApp();
  const [newNoticeText, setNewNoticeText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSave = () => {
    if (!newNoticeText.trim()) return;

    if (editingId) {
        // Find original to keep date or update logic as needed
        const original = notices.find(n => n.id === editingId);
        if (original) {
            updateNotice({
                ...original,
                text: newNoticeText
            });
        }
        setEditingId(null);
    } else {
        addNotice({
            id: Date.now().toString(),
            text: newNoticeText,
            createdAt: new Date()
        });
    }
    setNewNoticeText('');
  };

  const handleEditClick = (notice: Notice) => {
      setNewNoticeText(notice.text);
      setEditingId(notice.id);
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setNewNoticeText('');
  };

  const confirmDelete = () => {
      if (deleteId) {
          deleteNotice(deleteId);
          setDeleteId(null);
      }
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col max-w-[800px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Gestión de Avisos</h1>
          <p className="text-gray-400 font-medium mt-1">Estos mensajes aparecerán en el Dashboard de todos los empleados.</p>
        </div>
      </div>

      {/* Input Area */}
      <div className={`rounded-[1.5rem] p-4 shadow-sm border mb-6 transition-colors ${editingId ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-100'}`}>
         <div className={`block text-xs font-bold uppercase tracking-wider mb-3 ${editingId ? 'text-teal-600' : 'text-gray-500'}`}>
             {editingId ? 'Editando Aviso' : 'Nuevo Aviso'}
         </div>
         
         {/* Layout: Column on Mobile, Row on Desktop */}
         <div className="flex flex-col sm:flex-row gap-3">
            <input id="field-j6aqjz" name="field-j6aqjz" 
              type="text" 
              value={newNoticeText}
              onChange={(e) => setNewNoticeText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Ej: Mañana inventario general a las 8:00..."
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              autoFocus={!!editingId}
            />
            
            <div className="flex gap-3 sm:w-auto">
                {editingId && (
                    <button 
                        onClick={handleCancelEdit} 
                        className="flex-1 sm:flex-none bg-white text-gray-500 px-4 py-3 rounded-xl font-bold flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition-all"
                    >
                        <Icons.Close size={20} />
                    </button>
                )}

                <button 
                    onClick={handleSave} 
                    className="flex-1 sm:flex-none bg-teal-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-teal-600 shadow-lg shadow-teal-200 transition-all active:scale-95"
                >
                    {editingId ? <Icons.Check size={20} /> : <Icons.Plus size={20} />} 
                    <span>{editingId ? 'Guardar' : 'Publicar'}</span>
                </button>
            </div>
         </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider px-2">Avisos Activos ({notices.length})</h2>
        
        {notices.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[1.5rem] border border-dashed border-gray-200">
                <Icons.Megaphone size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 font-medium">No hay avisos publicados</p>
            </div>
        ) : (
            notices.map(notice => (
            <div key={notice.id} className={`rounded-[1.5rem] p-4 shadow-sm border flex items-start justify-between group hover:shadow-md transition-all ${editingId === notice.id ? 'bg-teal-50 border-teal-200 ring-2 ring-teal-500 ring-offset-2' : 'bg-white border-gray-100'}`}>
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <Icons.Megaphone size={20} />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 text-lg leading-snug">{notice.text}</p>
                        <p className="text-xs text-gray-400 mt-1">Publicado: {notice.createdAt.toLocaleDateString()} {notice.createdAt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => handleEditClick(notice)}
                        className="p-2 text-gray-300 hover:text-teal-500 hover:bg-teal-50 rounded-xl transition-colors"
                        title="Editar aviso"
                        disabled={!!editingId && editingId !== notice.id}
                    >
                        <Icons.Edit size={20} />
                    </button>
                    <button 
                        onClick={() => setDeleteId(notice.id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Eliminar aviso"
                        disabled={!!editingId}
                    >
                        <Icons.Delete size={20} />
                    </button>
                </div>
            </div>
            ))
        )}
      </div>

      {/* Delete Confirmation Modal (Standardized - rounded-[2rem]) */}
      {deleteId && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none">
            <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 flex flex-col items-center">
               <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 shadow-sm">
                  <Icons.Delete size={24} />
               </div>
               <h2 className="text-xl font-bold text-gray-800 mb-2">¿Eliminar aviso?</h2>
               <p className="text-gray-500 mb-6 max-w-xs text-center text-sm">
                  Esta acción es permanente y no se puede deshacer.
               </p>
               <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setDeleteId(null)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                     Cancelar
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-95"
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
