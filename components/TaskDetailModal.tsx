
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context';
import { Icons, getCategoryIcon } from './Icon.tsx';
import { TaskStatus, Priority, Attachment, Role, Category } from '../types';
import { USERS } from '../constants';
import { DateInput, TimeSelect } from './CustomInputs.tsx';
import { fileToBase64, generateUUID } from '../utils.ts';
import { RichTextEditor } from './RichTextEditor.tsx';

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ taskId, onClose }) => {
  const { tasks, updateTask, deleteTask, getCategory, getUser, currentUser, toggleTaskStatus, categories } = useApp();
  const task = tasks.find(t => t.id === taskId);
  
  // Modes: View, Edit, DeleteConfirm
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Image Preview State (Lightbox)
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // View Mode State
  const [commentText, setCommentText] = useState('');

  // Edit Mode State
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>(Priority.MEDIUM);
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);
  
  // Validation State
  const [formErrors, setFormErrors] = useState<{title?: string, assignees?: string}>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll on mount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // --- Sorting Logic for Categories (Consistent across App) ---
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
       const getRank = (cat: Category) => {
           const id = cat.id;
           const name = cat.name.trim().toLowerCase();
           
           if (id === 'c1' || name === 'general') return 0;
           if (id === 'c4' || name === 'recetas') return 2;
           if (id === 'c3' || name === 'vencimientos') return 3;
           if (id === 'c2' || name === 'stock') return 4;
           return 1; 
       };
       
       const rankA = getRank(a);
       const rankB = getRank(b);
       
       if (rankA !== rankB) return rankA - rankB;
       return b.id.localeCompare(a.id);
    });
  }, [categories]);

  // Initialize Edit State when entering Edit Mode
  useEffect(() => {
    if (task) {
      setEditTitle(task.title);
      setEditDesc(task.description || '');
      
      // Parse Date
      const d = new Date(task.createdAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setEditDate(`${y}-${m}-${day}`);
      
      setEditTime(task.dueTime || '');
      setEditPriority(task.priority);
      setEditCategoryId(task.categoryId);
      setEditAssignees(task.assignedToIds);
      setEditAttachments(task.attachments || []);
    }
  }, [task, isEditing]);

  // Reset errors when closing edit mode
  useEffect(() => {
     if(!isEditing) setFormErrors({});
  }, [isEditing]);

  if (!task) return null;

  const category = getCategory(task.categoryId);
  const isAdmin = currentUser.role === Role.ADMIN;

  // --- Handlers ---

  const handleDelete = () => {
    deleteTask(task.id);
    onClose();
  };

  const handleSave = () => {
    const errors: {title?: string, assignees?: string} = {};
    if (!editTitle.trim()) errors.title = "El título es obligatorio";
    if (editAssignees.length === 0) errors.assignees = "Debes asignar al menos una persona";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Reconstruct Date
    const [y, m, d] = editDate.split('-').map(Number);
    const newDate = new Date(y, m - 1, d);

    updateTask({
      ...task,
      title: editTitle,
      description: editDesc,
      createdAt: newDate,
      dueTime: editTime,
      priority: editPriority,
      categoryId: editCategoryId,
      assignedToIds: editAssignees,
      attachments: editAttachments
    });

    setIsEditing(false);
  };

  // Checklist & Comments (View Mode Only)
  const toggleChecklistItem = (itemId: string) => {
    const updatedChecklist = task.checklist.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    updateTask({ ...task, checklist: updatedChecklist });
  };

  const addComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: generateUUID(),
      userId: currentUser.id,
      text: commentText,
      timestamp: new Date()
    };
    updateTask({ ...task, comments: [...task.comments, newComment] });
    setCommentText('');
  };

  // Edit Mode Helpers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      
      const newAtts: Attachment[] = [];
      
      for (const file of files) {
          try {
              const base64 = await fileToBase64(file);
              newAtts.push({
                id: generateUUID(),
                name: file.name,
                url: base64,
                type: file.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
                size: file.size
              });
          } catch (err) {
              alert(`Error al subir ${file.name}: ${(err as Error).message}`);
          }
      }
      
      setEditAttachments(prev => [...prev, ...newAtts]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setEditAttachments(prev => prev.filter(a => a.id !== id));
  };

  const toggleAssignee = (uid: string) => {
    setEditAssignees(prev => {
        const newIds = prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid];
        if (newIds.length > 0) setFormErrors(prev => ({...prev, assignees: undefined}));
        return newIds;
    });
  };
  
  const toggleGeneralAssignee = () => {
    const allUsers = USERS; 
    const allIds = allUsers.map(u => u.id);
    const allSelected = allIds.every(id => editAssignees.includes(id));
    
    if (allSelected) {
        setEditAssignees([]);
    } else {
        setEditAssignees(allIds);
        setFormErrors(prev => ({...prev, assignees: undefined}));
    }
  };

  // --- Render ---

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 touch-none">
      
      {/* --- Lightbox / Image Previewer --- */}
      {previewImage && (
         <div 
           className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-2 animate-in fade-in duration-200"
           onClick={() => setPreviewImage(null)}
         >
             <button 
               className="absolute top-4 right-4 mt-[env(safe-area-inset-top)] p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-all z-50"
               onClick={(e) => {
                 e.stopPropagation();
                 setPreviewImage(null);
               }}
             >
                <Icons.Close size={24} />
             </button>
             
             <img 
               src={previewImage} 
               alt="Preview" 
               className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
               onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image
             />
         </div>
      )}

      {/* Delete Confirmation Modal (Standardized Fixed Style - Z-70) */}
      {showDeleteConfirm && isAdmin && (
         <div 
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none"
            onClick={() => setShowDeleteConfirm(false)}
         >
            <div 
                className="bg-white rounded-[2rem] shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 shadow-sm">
                    <Icons.Delete size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">¿Eliminar Tarea?</h2>
                <p className="text-gray-500 mb-6 max-w-xs text-center text-sm">
                    Esta acción es permanente y no se puede deshacer.
                </p>
                
                <div className="flex gap-3 w-full">
                    <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl lg:hover:bg-gray-200 transition-colors"
                    >
                    Cancelar
                    </button>
                    <button 
                    onClick={handleDelete}
                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl lg:hover:bg-red-600 shadow-lg shadow-red-200 transition-all lg:active:scale-95"
                    >
                    Eliminar
                    </button>
                </div>
            </div>
         </div>
      )}

      <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
             {/* Read-only view of category/priority in View Mode */}
             {!isEditing && (
               <>
                 <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${category?.color || 'bg-gray-100 text-gray-500'} flex items-center gap-1.5`}>
                   {category && getCategoryIcon(category.icon)}
                   {category?.name}
                 </span>
                 {task.priority === Priority.HIGH && (
                    <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full border border-red-100">
                       <Icons.Alert size={12} /> Alta
                    </span>
                 )}
                 {task.priority === Priority.MEDIUM && (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                       <Icons.Activity size={12} /> Media
                    </span>
                 )}
                 {task.priority === Priority.LOW && (
                    <span className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-slate-50 px-2 py-1 rounded-full border border-gray-100">
                       <Icons.ChevronDown size={12} /> Baja
                    </span>
                 )}
               </>
             )}
             {isEditing && <span className="text-lg font-bold text-gray-800">Editar Tarea</span>}
          </div>
          
          <div className="flex items-center gap-2">
            {!isEditing && isAdmin && (
              <>
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="p-2 text-gray-400 lg:hover:text-teal-600 lg:hover:bg-teal-50 rounded-full transition-colors"
                  title="Editar"
                >
                  <Icons.Edit size={20} />
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(true)} 
                  className="p-2 text-gray-400 lg:hover:text-red-500 lg:hover:bg-red-50 rounded-full transition-colors"
                  title="Eliminar"
                >
                  <Icons.Delete size={20} />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 lg:hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
              <Icons.Close size={24} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 custom-scrollbar">
           {/* ... existing content ... */}
           {isEditing && isAdmin ? (
             /* ============ EDIT FORM (ADMIN ONLY) ============ */
             <div className="space-y-6">
                {/* Title */}
                <div>
                  <label htmlFor="field-0nb59o" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Título <span className="text-red-500">*</span></label>
                  <input id="field-0nb59o" name="field-0nb59o" 
                    type="text"
                    value={editTitle}
                    onChange={(e) => {
                        setEditTitle(e.target.value);
                        if(e.target.value.trim()) setFormErrors(prev => ({...prev, title: undefined}));
                    }}
                    className={`w-full bg-gray-50 border rounded-xl px-4 py-3 font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
                        formErrors.title ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 focus:border-transparent'
                    }`}
                  />
                  {formErrors.title && (
                    <p className="text-red-500 text-[10px] font-bold mt-1 flex items-center gap-1">
                        <Icons.Alert size={10} /> {formErrors.title}
                    </p>
                  )}
                </div>

                {/* Description - RICH TEXT EDITOR */}
                <div>
                   <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notas / Descripción</div>
                   <RichTextEditor
                     value={editDesc}
                     onChange={setEditDesc}
                     placeholder="Instrucciones adicionales..."
                   />
                </div>

                {/* Date/Time (Custom Inputs) */}
                <div className="flex gap-3">
                  <div className="flex-[1.4]">
                    <DateInput 
                      label="Fecha"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <TimeSelect
                      label="Hora"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Priority */}
                <div>
                   <div className="flex justify-between items-center mb-2">
                       <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Prioridad</div>
                   </div>
                   <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
                      {[Priority.LOW, Priority.MEDIUM, Priority.HIGH].map(p => (
                        <button
                          key={p}
                          onClick={() => setEditPriority(p)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize ${
                            editPriority === p 
                            ? (p === Priority.HIGH ? 'bg-red-500 text-white shadow' 
                               : p === Priority.MEDIUM ? 'bg-amber-500 text-white shadow'
                               : 'bg-gray-500 text-white shadow')
                            : 'text-gray-400 lg:hover:text-gray-600 lg:hover:bg-gray-50'
                          }`}
                        >
                          {p === Priority.LOW ? 'Baja' : p === Priority.MEDIUM ? 'Media' : 'Alta'}
                        </button>
                      ))}
                   </div>
                </div>

                {/* Category - UPDATED TO GRID STYLE WITH SORTING */}
                <div>
                   <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Categoría</div>
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {sortedCategories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setEditCategoryId(cat.id)}
                          className={`p-3 rounded-xl border flex items-center gap-2 transition-all text-left ${
                              editCategoryId === cat.id 
                              ? `${cat.color} border-current shadow-md ring-1 ring-offset-2 ring-transparent` 
                              : 'bg-white border-gray-100 lg:hover:border-gray-200 text-gray-500'
                           }`}
                        >
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${editCategoryId === cat.id ? 'bg-white/30' : 'bg-gray-100'}`}>
                             {getCategoryIcon(cat.icon)}
                          </div>
                          <span className="font-bold text-xs truncate">{cat.name}</span>
                        </button>
                      ))}
                   </div>
                </div>

                {/* Assignees */}
                <div>
                   <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Asignar a <span className="text-red-500">*</span></div>
                   <div className={`p-2 rounded-xl transition-all ${formErrors.assignees ? 'bg-red-50 border border-red-200' : ''}`}>
                       <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={toggleGeneralAssignee}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all shrink-0 ${
                                USERS.every(u => editAssignees.includes(u.id))
                                ? 'bg-teal-500 text-white border-teal-500'
                                : 'bg-white border-gray-200 text-gray-500'
                                }`}
                            >
                                <Icons.Users size={14} /> General
                            </button>
                            {USERS.map(u => (
                                <button
                                key={u.id}
                                onClick={() => toggleAssignee(u.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all shrink-0 ${
                                    editAssignees.includes(u.id)
                                    ? 'bg-teal-50 border-teal-200 text-teal-700'
                                    : 'bg-white border-gray-200 text-gray-500'
                                }`}
                                >
                                <img src={u.avatar} className="w-5 h-5 rounded-full" />
                                {u.name}
                                </button>
                            ))}
                       </div>
                   </div>
                    {formErrors.assignees && (
                        <p className="text-red-500 text-[10px] font-bold mt-1 flex items-center gap-1 ml-2">
                           <Icons.Alert size={10} /> {formErrors.assignees}
                        </p>
                    )}
                </div>

                {/* Attachments */}
                <div>
                   <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Adjuntar Archivos</div>
                   <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                         <button 
                           onClick={() => fileInputRef.current?.click()}
                           className="flex-1 border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-400 lg:hover:border-teal-400 lg:hover:text-teal-500 lg:hover:bg-teal-50 transition-all gap-2"
                         >
                            <Icons.Attach size={24} />
                            <span className="text-xs font-bold">Subir foto o documento</span>
                         </button>
                         {/* Hidden File Input */}
                         <input id="field-zjs1x0" name="field-zjs1x0" 
                           type="file" 
                           ref={fileInputRef} 
                           onChange={handleFileSelect} 
                           className="hidden" 
                           accept="image/*,.pdf,.doc,.docx"
                           multiple
                         />
                      </div>

                      {/* Preview List */}
                      {editAttachments.length > 0 && (
                        <div className="space-y-2">
                           {editAttachments.map(att => (
                             <div key={att.id} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                {att.type === 'IMAGE' ? (
                                  <img src={att.url} alt="preview" className="w-10 h-10 rounded-lg object-cover cursor-pointer" onClick={() => setPreviewImage(att.url)} />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-gray-200 text-gray-400">
                                    <Icons.Doc size={20} />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-700 truncate">{att.name}</p>
                                </div>
                                <button onClick={() => removeAttachment(att.id)} className="p-2 lg:hover:text-red-500 text-gray-400">
                                  <Icons.Close size={16} />
                                </button>
                             </div>
                           ))}
                        </div>
                      )}
                   </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                   <button 
                     onClick={() => setIsEditing(false)}
                     className="flex-1 py-3 bg-gray-50 text-gray-500 font-bold rounded-xl lg:hover:bg-gray-100 transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handleSave}
                     className="flex-1 py-3 bg-teal-500 text-white font-bold rounded-xl lg:hover:bg-teal-600 shadow-lg shadow-teal-200 transition-all lg:active:scale-95"
                   >
                     Guardar Cambios
                   </button>
                </div>
             </div>
           ) : (
             /* ============ VIEW MODE ============ */
             <div className="space-y-6">
                {/* Title & Desc */}
                <div>
                   <h2 className={`text-2xl font-bold text-gray-800 leading-tight mb-2 ${task.status === TaskStatus.COMPLETED ? 'line-through text-gray-400' : ''}`}>
                      {task.title}
                   </h2>
                   
                   {/* HTML Content Renderer */}
                   {task.description ? (
                      <div 
                        className="text-gray-600 text-sm leading-relaxed 
                        [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-2 
                        [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-2 
                        [&>li]:mb-1
                        [&>b]:font-bold 
                        [&>i]:italic 
                        [&>u]:underline"
                        dangerouslySetInnerHTML={{ __html: task.description }}
                      />
                   ) : (
                      <p className="text-gray-400 text-sm italic">Sin notas adicionales.</p>
                   )}
                </div>

                {/* Meta Grid */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fecha Límite</p>
                      <div className="flex items-center gap-2">
                         <Icons.Calendar size={16} className="text-teal-500" />
                         <span className="font-bold text-gray-700">
                            {new Date(task.createdAt).toLocaleDateString()}
                         </span>
                      </div>
                   </div>
                   <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Hora</p>
                      <div className="flex items-center gap-2">
                         <Icons.Clock size={16} className="text-teal-500" />
                         <span className="font-bold text-gray-700">{task.dueTime || '--:--'}</span>
                      </div>
                   </div>
                </div>

                {/* Assigned To */}
                <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Asignado a</p>
                   <div className="flex flex-wrap gap-2">
                      {task.assignedToIds.map(uid => {
                         const u = getUser(uid);
                         return u ? (
                            <div key={uid} className="flex items-center gap-2 bg-white border border-gray-200 pr-3 rounded-full p-1">
                               <img src={u.avatar} className="w-6 h-6 rounded-full" />
                               <span className="text-xs font-bold text-gray-700">{u.name}</span>
                            </div>
                         ) : null;
                      })}
                   </div>
                </div>

                {/* Attachments View */}
                {task.attachments && task.attachments.length > 0 && (
                   <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Adjuntos</p>
                      <div className="grid grid-cols-2 gap-2">
                         {task.attachments.map(att => (
                            <div 
                              key={att.id} 
                              onClick={() => att.type === 'IMAGE' && setPreviewImage(att.url)}
                              className={`flex items-center gap-3 p-2 rounded-xl border border-gray-100 bg-gray-50 ${att.type === 'IMAGE' ? 'cursor-pointer lg:hover:bg-gray-100' : ''}`}
                            >
                               {att.type === 'IMAGE' ? (
                                  <img src={att.url} className="w-10 h-10 rounded-lg object-cover" />
                               ) : (
                                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-gray-200 text-gray-400">
                                     <Icons.Doc size={20} />
                                  </div>
                               )}
                               <div className="min-w-0">
                                  <p className="text-xs font-bold text-gray-700 truncate">{att.name}</p>
                                  <p className="text-[10px] text-gray-400">{(att.size ? (att.size / 1024).toFixed(0) + ' KB' : '')}</p>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                )}
                
                {/* Checklist (Interactive) */}
                {task.checklist.length > 0 && (
                   <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Checklist</p>
                      <div className="space-y-2">
                         {task.checklist.map(item => (
                            <div 
                              key={item.id}
                              onClick={() => toggleChecklistItem(item.id)}
                              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white lg:active:scale-[0.99] transition-transform cursor-pointer"
                            >
                               {item.completed ? (
                                  <div className="text-teal-500"><Icons.Check size={20} /></div>
                               ) : (
                                  <div className="text-gray-300"><Icons.Uncheck size={20} /></div>
                               )}
                               <span className={`text-sm font-medium ${item.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                  {item.text}
                               </span>
                            </div>
                         ))}
                      </div>
                   </div>
                )}

                {/* Action Button */}
                <button 
                  onClick={() => {
                     toggleTaskStatus(task.id);
                     if(task.status !== TaskStatus.COMPLETED) onClose();
                  }}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all lg:active:scale-95 ${
                     task.status === TaskStatus.COMPLETED 
                     ? 'bg-green-100 text-green-700 shadow-green-100' 
                     : 'bg-teal-500 text-white shadow-teal-200 lg:hover:bg-teal-600'
                  }`}
                >
                   {task.status === TaskStatus.COMPLETED ? (
                      <>
                         <Icons.Check size={20} /> Tarea Completada
                      </>
                   ) : (
                      <>
                         <Icons.CheckSimple size={20} /> Marcar como Hecha
                      </>
                   )}
                </button>
             </div>
           )}
        </div>
      </div>
    </div>,
    document.body
  );
};
