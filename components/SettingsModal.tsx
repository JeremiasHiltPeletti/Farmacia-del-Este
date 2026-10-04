
import React, { useEffect, useState } from 'react';
import { Icons } from './Icon.tsx';
import { useApp } from '../context';
import { playAlertSound } from '../utils.ts'; 

// --- UPDATED PRESETS (Abstract, Nature, Shapes - No People) ---
const BACKGROUND_PRESETS = [
    // Abstract / Gradients
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=150&q=80',

    // Nature / Minimal
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=150&q=80',

    // Previous Additions
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1534081333815-ae5019106622?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1437482078695-73f5ca6c96e2?auto=format&fit=crop&w=150&q=80',

    // New Additions (More Landscapes)
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?auto=format&fit=crop&w=150&q=80',
];

// Colors for Initials
const INITIAL_COLORS = [
    { name: 'Teal', bg: '14b8a6', fg: 'fff' },
    { name: 'Blue', bg: '3b82f6', fg: 'fff' },
    { name: 'Purple', bg: '8b5cf6', fg: 'fff' },
    { name: 'Rose', bg: 'f43f5e', fg: 'fff' },
    { name: 'Orange', bg: 'f97316', fg: 'fff' },
    { name: 'Black', bg: '111827', fg: 'fff' },
    { name: 'Gray', bg: 'EBF4FF', fg: '7F9CF5' }, // Original Light
];

export const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { notificationSound, setNotificationSound, currentUser, updateCurrentUser } = useApp();
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'PROFILE'>('GENERAL');

  // Profile Edit State
  const [editName, setEditName] = useState(currentUser.name);
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar);
  const [editPin, setEditPin] = useState('');

  // Lock body scroll on mount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSoundSelect = (tone: string) => {
    setNotificationSound(tone);
    window.dispatchEvent(new CustomEvent('previewSound', { detail: tone }));
  };

  const handleSave = () => {
    // Save Profile Changes
    if (activeTab === 'PROFILE') {
        updateCurrentUser({
            name: editName,
            avatar: editAvatar,
            pin: editPin && editPin.length === 4 ? editPin : currentUser.pin || '1234',
        });
        playAlertSound('Éxito');
    }
    onClose();
  };

  const sounds = [
    'Campana Clásica', 'Alerta Digital', 'Elegante', 'Cristalino', 
    'Eco Suave', 'Melodía Feliz', 'Gota de Agua', 'Éxito'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 touch-none">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
           <h2 className="text-xl font-bold text-gray-800">Configuración</h2>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <Icons.Close size={24} />
           </button>
        </div>

        <div className="flex border-b border-gray-100 px-6">
           <button 
             onClick={() => setActiveTab('GENERAL')}
             className={`py-3 px-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'GENERAL' ? 'text-[#0ea5e9] border-[#0ea5e9]' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
           >
             General
           </button>
           <button 
             onClick={() => setActiveTab('PROFILE')}
             className={`py-3 px-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'PROFILE' ? 'text-[#0ea5e9] border-[#0ea5e9]' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
           >
             Perfil
           </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
           
           {/* === GENERAL TAB === */}
           {activeTab === 'GENERAL' && (
             <>
               {/* App Sounds */}
               <div>
                  <h3 className="font-bold text-gray-800 mb-2">Sonidos</h3>
                  <div className="space-y-3">
                        {sounds.map((tone, i) => {
                           const isSelected = notificationSound === tone;
                           return (
                               <div 
                                 key={i} 
                                 onClick={() => handleSoundSelect(tone)}
                                 className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                                   isSelected 
                                   ? 'border-blue-200 bg-blue-50' 
                                   : 'border-gray-100 hover:border-gray-200'
                                 }`}
                               >
                                  <div className="flex items-center gap-3">
                                     <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#0ea5e9]' : 'bg-gray-200'}`}></div>
                                     <span className={`text-sm font-medium ${isSelected ? 'text-[#0ea5e9]' : 'text-gray-700'}`}>{tone}</span>
                                  </div>
                                  {isSelected && <Icons.Play size={16} className="text-[#0ea5e9]" />}
                               </div>
                           );
                        })}
                  </div>
               </div>
             </>
           )}

           {/* === PROFILE TAB === */}
           {activeTab === 'PROFILE' && (
             <div className="space-y-8">
               
               {/* Name Edit */}
               <div>
                 <label htmlFor="field-52vb6v" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre para mostrar</label>
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-2 border-gray-100 overflow-hidden shrink-0">
                       <img src={editAvatar} alt="Current" className="w-full h-full object-cover" />
                    </div>
                    <input id="field-52vb6v" name="field-52vb6v" 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] transition-all"
                      placeholder="Tu nombre"
                    />
                 </div>
               </div>

               {/* Avatar Selection */}
               <div>
                  <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Color de Iniciales</div>
                  <div className="flex flex-wrap gap-3 mb-6">
                      {INITIAL_COLORS.map((col) => {
                          const url = `https://ui-avatars.com/api/?name=${editName}&background=${col.bg}&color=${col.fg}&rounded=true&bold=true`;
                          return (
                            <button
                                key={col.name}
                                onClick={() => setEditAvatar(url)}
                                className={`w-10 h-10 rounded-full overflow-hidden transition-all relative ${
                                    editAvatar === url ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                                }`}
                                style={{ backgroundColor: `#${col.bg}` }}
                            >
                                <img src={url} alt={col.name} className="w-full h-full object-cover" />
                            </button>
                          );
                      })}
                  </div>

                  <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">O Elige un Fondo</div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                     {BACKGROUND_PRESETS.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => setEditAvatar(url)}
                          className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all relative group ${
                             editAvatar === url ? 'border-[#0ea5e9] ring-2 ring-[#0ea5e9] ring-offset-2 scale-105' : 'border-transparent hover:scale-105'
                          }`}
                        >
                           <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                           {editAvatar === url && (
                             <div className="absolute inset-0 bg-[#0ea5e9]/20 flex items-center justify-center">
                                <div className="bg-[#0ea5e9] text-white p-1 rounded-full">
                                  <Icons.Check size={14} />
                                </div>
                             </div>
                           )}
                        </button>
                     ))}
                  </div>
               </div>

               {/* PIN Setup */}
               <div className="pt-6 border-t border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4">Seguridad de Acceso</h3>
                  <div>
                    <label htmlFor="field-uu1mok" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nuevo PIN de 4 dígitos</label>
                    <input id="field-uu1mok" name="field-uu1mok" 
                      type="password" 
                      inputMode="numeric"
                      maxLength={4}
                      value={editPin}
                      onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full max-w-[200px] bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-xl tracking-[0.5em] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] transition-all"
                      placeholder=""
                      autoComplete="new-password"
                    />
                    <p className="text-gray-400 text-xs mt-2 font-medium">Usa solo 4 números.</p>
                  </div>
               </div>

             </div>
           )}

        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white z-10">
           <button onClick={onClose} className="text-gray-500 font-bold px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors">
              Cancelar
           </button>
           <button onClick={handleSave} className="bg-[#0ea5e9] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#0284c7] shadow-lg shadow-blue-200 transition-all active:scale-95">
              Guardar Ajustes
           </button>
        </div>
      </div>
    </div>
  );
};
