
import React, { useState, useEffect } from 'react';
import { useApp } from '../context';
import { Icons } from '../components/Icon.tsx';
import { logoBase64 } from '../components/logoBase64.ts';
import { User } from '../types';

export const Login: React.FC = () => {
  const { users, switchUser, login } = useApp();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState(false);

  const handleUserSelect = (user: User) => {
    if (user.pin) {
      setSelectedUser(user);
      setEnteredPin('');
      setError(false);
    } else {
      switchUser(user.id);
      login();
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser?.pin === enteredPin) {
      switchUser(selectedUser.id);
      login();
    } else {
      setError(true);
      setEnteredPin('');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#f0f9ff] flex flex-col">
      {/* Top Bar - Safe Area Aware */}
      <div className="flex items-center justify-center px-4 relative z-10 pt-[env(safe-area-inset-top)] min-h-[4rem]">
          <div className="h-16 flex items-center justify-center gap-2">
             <img src={logoBase64} alt="Logo" className="w-6 h-6 object-contain" />
             <span className="text-teal-600 font-bold text-sm tracking-widest uppercase">Farmacia del Este</span>
          </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 pb-[env(safe-area-inset-bottom)]">
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-500/5 p-8 w-full max-w-sm text-center border border-white relative overflow-hidden">
          
          {selectedUser ? (
            <div className="animate-in slide-in-from-right-4 fade-in duration-300">
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-6 left-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
              >
                <Icons.ChevronLeft size={20} />
              </button>
              
              <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center rounded-full shadow-sm border border-blue-50 overflow-hidden">
                <img src={selectedUser.avatar} alt={selectedUser.name} className="w-full h-full object-cover" />
              </div>

              <h1 className="text-2xl font-bold text-gray-800 mb-2">Hola, {selectedUser.name}</h1>
              <p className="text-gray-400 text-sm mb-8 font-medium">Ingresa tu PIN de 4 dígitos</p>

              <form onSubmit={handlePinSubmit} className="space-y-6">
                <div>
                  <label htmlFor="pin-input" className="sr-only">PIN de 4 dígitos</label>
                  <input
                    id="pin-input"
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={enteredPin}
                    onChange={(e) => {
                      setEnteredPin(e.target.value.replace(/\D/g, ''));
                      setError(false);
                    }}
                    autoFocus
                    placeholder="••••"
                    autoComplete="new-password"
                    className={`text-center text-4xl tracking-widest font-mono w-full bg-gray-50 border ${error ? 'border-red-300 text-red-500 focus:border-red-400 focus:ring-red-100' : 'border-gray-100 focus:border-teal-400 focus:ring-teal-100'} p-4 rounded-2xl outline-none focus:ring-4 transition-all duration-300`}
                  />
                  {error && <p className="text-red-500 text-sm mt-3 animate-pulse font-medium">PIN incorrecto</p>}
                  {!error && <p className="text-gray-400 text-sm mt-3 font-medium">El PIN por defecto es 1234</p>}
                </div>
                
                <button
                  type="submit"
                  disabled={enteredPin.length < 4}
                  className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-500/20 disabled:shadow-none transition-all"
                >
                  Continuar
                </button>
              </form>
            </div>
          ) : (
            <div className="animate-in slide-in-from-left-4 fade-in duration-300">
              {/* Logo Image restored with Circular Background */}
              <div className="w-28 h-28 mx-auto mb-8 flex items-center justify-center bg-[#f0f9ff] rounded-full shadow-sm border border-blue-50 p-6">
                 <img 
                   src={logoBase64} 
                   alt="Logo Farmacia" 
                   fetchPriority="high"
                   decoding="sync"
                   className="w-full h-full object-contain drop-shadow-sm" 
                 />
              </div>

              <h1 className="text-2xl font-bold text-gray-800 mb-2">Bienvenido</h1>
              <p className="text-gray-400 text-sm mb-10 font-medium">Selecciona tu perfil para comenzar</p>

              <div className="space-y-4">
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="w-full flex items-center gap-4 p-2 pr-4 rounded-[1.2rem] border border-transparent hover:border-blue-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all group duration-300"
                  >
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-teal-600 font-bold shadow-sm group-hover:bg-teal-500 group-hover:text-white transition-colors overflow-hidden">
                       <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-gray-600 group-hover:text-gray-900">{user.name}</span>
                    <Icons.ChevronRight className="ml-auto text-gray-300 group-hover:text-teal-400" size={20} />
                  </button>
                ))}
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};
