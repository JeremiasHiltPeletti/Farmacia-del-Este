
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context';
import { Icons, getCategoryIcon, ICON_OPTIONS } from '../components/Icon.tsx';
import { Button } from '../components/Button.tsx';
import { Role, Category } from '../types';

const COLOR_OPTIONS = [
  // Pastels
  { name: 'Red', class: 'bg-red-100 text-red-800' },
  { name: 'Orange', class: 'bg-orange-100 text-orange-800' },
  { name: 'Amber', class: 'bg-amber-100 text-amber-800' },
  { name: 'Yellow', class: 'bg-yellow-100 text-yellow-800' },
  { name: 'Lime', class: 'bg-lime-100 text-lime-800' },
  { name: 'Green', class: 'bg-green-100 text-green-800' },
  { name: 'Emerald', class: 'bg-emerald-100 text-emerald-800' },
  { name: 'Teal', class: 'bg-teal-100 text-teal-800' },
  { name: 'Cyan', class: 'bg-cyan-100 text-cyan-800' },
  { name: 'Sky', class: 'bg-sky-100 text-sky-800' },
  { name: 'Blue', class: 'bg-blue-100 text-blue-800' },
  { name: 'Indigo', class: 'bg-indigo-100 text-indigo-800' },
  { name: 'Violet', class: 'bg-violet-100 text-violet-800' },
  { name: 'Purple', class: 'bg-purple-100 text-purple-800' },
  { name: 'Fuchsia', class: 'bg-fuchsia-100 text-fuchsia-800' },
  { name: 'Pink', class: 'bg-pink-100 text-pink-800' },
  { name: 'Rose', class: 'bg-rose-100 text-rose-800' },
  
  // Solids / Darks / Vivids
  { name: 'Black', class: 'bg-gray-900 text-white' },
  { name: 'Solid Red', class: 'bg-red-500 text-white' },
  { name: 'Solid Orange', class: 'bg-orange-500 text-white' },
  { name: 'Solid Amber', class: 'bg-amber-500 text-white' },
  { name: 'Solid Green', class: 'bg-emerald-600 text-white' },
  { name: 'Solid Teal', class: 'bg-teal-600 text-white' },
  { name: 'Solid Blue', class: 'bg-blue-600 text-white' },
  { name: 'Solid Indigo', class: 'bg-indigo-600 text-white' },
  { name: 'Solid Purple', class: 'bg-purple-600 text-white' },
  { name: 'Solid Pink', class: 'bg-pink-500 text-white' },
];

export const CategoriesPage: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory, currentUser } = useApp();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    color: COLOR_OPTIONS[0].class,
    icon: ICON_OPTIONS[0]
  });

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen || deleteId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen, deleteId]);

  // --- Sorting Logic ---
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
       const getRank = (cat: Category) => {
           const id = cat.id;
           const name = cat.name.trim().toLowerCase();
           
           // Rank 0: General (Fixed Top)
           if (id === 'c1' || name === 'general') return 0;
           
           // Rank 2, 3, 4: Specific Defaults (Fixed Bottom Order)
           if (id === 'c4' || name === 'recetas') return 2;
           if (id === 'c3' || name === 'vencimientos') return 3;
           if (id === 'c2' || name === 'stock') return 4;
           
           // Rank 1: Custom/New Categories (In between)
           return 1; 
       };
       
       const rankA = getRank(a);
       const rankB = getRank(b);
       
       // Sort by Rank Group first
       if (rankA !== rankB) return rankA - rankB;
       
       // If ranks are equal (mainly for Rank 1 - New Categories), sort by ID descending (Newest first)
       // Assuming custom IDs are timestamps or similar incrementing values.
       return b.id.localeCompare(a.id);
    });
  }, [categories]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ name: '', color: COLOR_OPTIONS[0].class, icon: ICON_OPTIONS[0] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, color: cat.color, icon: cat.icon });
    setIsModalOpen(true);
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
  };

  const executeDelete = () => {
    if (deleteId) {
      deleteCategory(deleteId);
      setDeleteId(null);
    }
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    if (editingId) {
      updateCategory({
        id: editingId,
        ...formData
      });
    } else {
      addCategory({
        id: Date.now().toString(),
        ...formData
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col max-w-[1200px] mx-auto">
      {/* Header Updated for Consistency & Mobile Layout */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Categorías</h1>
          <p className="text-gray-400 font-medium mt-1">Gestiona las etiquetas de tus tareas</p>
        </div>
        
        <Button
          size="lg"
          onClick={handleOpenCreate}
          className="w-full sm:w-auto"
          icon={<Icons.Plus size={20} />}
        >
          <span className="inline">Nueva Categoría</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCategories.map(cat => (
          <div key={cat.id} className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-gray-100 flex items-center justify-between group lg:hover:shadow-md transition-all">
             <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-sm ${cat.color}`}>
                   {getCategoryIcon(cat.icon)}
                </div>
                <div>
                   <h3 className="font-bold text-gray-800 text-lg">{cat.name}</h3>
                </div>
             </div>
             
             <div className="flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <Button
                  variant="icon"
                  size="icon"
                  onClick={() => handleOpenEdit(cat)}
                  icon={<Icons.Settings size={20} />}
                />
                <Button
                  variant="iconDanger"
                  size="icon"
                  onClick={() => confirmDelete(cat.id)}
                  icon={<Icons.Delete size={20} />}
                />
             </div>
          </div>
        ))}
        
        {/* Empty State for Non-Admins if empty */}
        {sortedCategories.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400">
             No hay categorías definidas.
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none">
           <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
              
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                 <h2 className="text-xl font-bold text-gray-800">{editingId ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
                 <Button
                   variant="icon"
                   size="icon"
                   onClick={() => setIsModalOpen(false)}
                   icon={<Icons.Close size={24} />}
                   className="rounded-full"
                 />
              </div>

              <div className="overflow-y-auto p-8 space-y-8 px-8">
                 {/* Name Input */}
                 <div>
                    <label htmlFor="field-xumkb7" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Nombre</label>
                    <input id="field-xumkb7" name="field-xumkb7" 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ej: Urgencias"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                      autoFocus
                    />
                 </div>

                 {/* Icon Picker */}
                 <div>
                    <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Icono</div>
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar p-2">
                       {ICON_OPTIONS.map(iconName => (
                          <button
                            key={iconName}
                            onClick={() => setFormData({...formData, icon: iconName})}
                            className={`aspect-square rounded-xl flex items-center justify-center transition-all ${
                              formData.icon === iconName 
                              ? 'bg-gray-800 text-white shadow-lg lg:scale-105' 
                              : 'bg-gray-50 text-gray-400 lg:hover:bg-gray-100 lg:hover:text-gray-600'
                            }`}
                          >
                             {getCategoryIcon(iconName)}
                          </button>
                       ))}
                    </div>
                 </div>

                 {/* Color Picker */}
                 <div>
                    <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Color</div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-1">
                       {COLOR_OPTIONS.map((color) => (
                          <button
                            key={color.name}
                            onClick={() => setFormData({...formData, color: color.class})}
                            className={`h-12 rounded-xl flex items-center justify-center transition-all border-2 ${
                              formData.color === color.class 
                              ? 'border-gray-800 lg:scale-105 shadow-md' 
                              : 'border-transparent lg:hover:scale-105'
                            } ${color.class}`}
                            title={color.name}
                          >
                             {formData.color === color.class && <Icons.Check size={18} />}
                          </button>
                       ))}
                    </div>
                 </div>

                 {/* Preview */}
                 <div className="bg-gray-50 rounded-2xl p-6 flex justify-center">
                    <div className="bg-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
                       <span className={`p-1.5 rounded-md ${formData.color}`}>
                          {getCategoryIcon(formData.icon)}
                       </span>
                       <span className="font-bold text-gray-800">{formData.name || 'Nombre Categoría'}</span>
                    </div>
                 </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex gap-4">
                 <Button
                   variant="ghost"
                   size="lg"
                   onClick={() => setIsModalOpen(false)}
                   className="flex-1"
                 >
                    Cancelar
                 </Button>
                 <Button
                   size="lg"
                   onClick={handleSave}
                   className="flex-1"
                 >
                    Guardar
                 </Button>
              </div>

           </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Standardized - rounded-[2rem]) */}
      {deleteId && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none">
            <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 flex flex-col items-center">
               <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 shadow-sm">
                  <Icons.Delete size={24} />
               </div>
               <h3 className="text-xl font-bold text-center text-gray-800 mb-2">¿Eliminar categoría?</h3>
               <p className="text-gray-500 text-center mb-6 text-sm">
                  Esta acción no se puede deshacer. Las tareas asociadas perderán su categoría.
               </p>
               <div className="flex gap-3 w-full">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setDeleteId(null)}
                    className="flex-1"
                  >
                     Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    size="lg"
                    onClick={executeDelete}
                    className="flex-1"
                  >
                     Eliminar
                  </Button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};
