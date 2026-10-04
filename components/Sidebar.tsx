
import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Icons } from './Icon.tsx';
import { useApp } from '../context';
import { Role } from '../types';
import { logoBase64 } from './logoBase64.ts';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onOpenSettings }) => {
  const { currentUser, logout } = useApp();

  // Lock body scroll when sidebar is open on mobile/tablet
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // UPDATED: Added lg: prefix to hover states
  const navClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group ${
      isActive 
        ? 'bg-teal-500 text-white shadow-lg shadow-teal-200 lg:translate-x-1' 
        : 'text-gray-400 lg:hover:bg-gray-50 lg:hover:text-gray-600'
    }`;

  const handleLinkClick = () => {
    // Close sidebar on mobile AND tablet (< 1024px) when a link is clicked
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile/Tablet Backdrop Overlay - touch-none prevents background scroll */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-md z-40 transition-opacity duration-300 lg:hidden touch-none ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Container (Static on Desktop LG+, Fixed Off-Canvas on Mobile/Tablet) */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col h-full border-r border-gray-50 shadow-2xl lg:shadow-none transition-transform duration-300 ease-out
        lg:static lg:translate-x-0
        pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Header / Brand */}
        <div className="h-20 flex items-center justify-between px-6 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            {/* Logo Image - Smaller size, no background */}
            <img 
               src={logoBase64} 
               alt="Logo" 
               className="w-9 h-9 object-contain" 
            />
            <div className="font-bold text-gray-800 flex flex-col leading-none">
               <span className="text-lg tracking-tight">Farmacia</span>
               <span className="text-[10px] text-gray-400 uppercase tracking-widest">Del Este</span>
            </div>
          </div>
          
          {/* Mobile/Tablet Close Button */}
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-500 lg:hidden">
            <Icons.Close size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-6 space-y-2 py-6 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-bold text-gray-300 uppercase tracking-wider px-4 mb-2">Menu Principal</div>
          
          <NavLink to="/dashboard" onClick={handleLinkClick} className={navClass}>
            <Icons.Dashboard size={20} />
            Dashboard
          </NavLink>
          <NavLink to="/tasks" onClick={handleLinkClick} className={navClass}>
            <Icons.List size={20} />
            Tareas
          </NavLink>
          <NavLink to="/calendar" onClick={handleLinkClick} className={navClass}>
            <Icons.CalendarDays size={20} />
            Calendario
          </NavLink>
          
          <NavLink to="/categories" onClick={handleLinkClick} className={navClass}>
            <Icons.Tag size={20} />
            Categorías
          </NavLink>

          <NavLink to="/notices" onClick={handleLinkClick} className={navClass}>
            <Icons.Megaphone size={20} />
            Avisos
          </NavLink>
          
          <NavLink to="/compensatory" onClick={handleLinkClick} className={navClass}>
            <Icons.Scale size={20} />
            Compensatorio
          </NavLink>

          <div className="text-xs font-bold text-gray-300 uppercase tracking-wider px-4 mb-2 mt-6">Operaciones</div>

          <NavLink to="/products" onClick={handleLinkClick} className={navClass}>
            <Icons.Tag size={20} />
            Catálogo
          </NavLink>

          <NavLink to="/orders" onClick={handleLinkClick} className={navClass}>
            <Icons.ShoppingCart size={20} />
            Pedidos
          </NavLink>

        </nav>

        {/* User Profile Footer */}
        <div className="p-6 mt-auto border-t border-gray-50 shrink-0">
          <div className="bg-[#f0fdfa] rounded-3xl p-5 relative overflow-hidden group border border-teal-50">
             <div className="absolute top-0 right-0 p-3 opacity-10 text-teal-600">
                <Icons.Plus size={60} />
             </div>
             
             <div className="flex items-center gap-3 relative z-10 mb-4">
                 <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                 <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{currentUser.name}</p>
                 </div>
             </div>
             
             <div className="flex gap-2 relative z-10">
                <button 
                  onClick={() => { onOpenSettings(); onClose(); }} 
                  className="flex-1 bg-white py-2 rounded-xl text-xs font-bold text-gray-600 lg:hover:text-teal-600 transition-colors shadow-sm flex items-center justify-center gap-1"
                >
                   <Icons.Settings size={14} /> Ajustes
                </button>
                <button 
                  onClick={logout} 
                  className="hidden lg:flex w-10 items-center justify-center bg-red-50 rounded-xl text-red-400 lg:hover:bg-red-100 transition-colors"
                >
                   <Icons.Logout size={16} />
                </button>
             </div>
          </div>
        </div>
      </div>
    </>
  );
};
