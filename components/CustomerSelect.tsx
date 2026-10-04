import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Customer } from '../types';
import { Icons } from './Icon.tsx';

interface CustomerSelectProps {
  value: string;
  onChange: (customerId: string) => void;
  onAddNew: (typedName: string) => void;
  customers: Customer[];
  id?: string;
}

export const CustomerSelect: React.FC<CustomerSelectProps> = ({ value, onChange, onAddNew, customers, id = "customer-select" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedCustomer = useMemo(() => customers.find(c => c.id === value), [customers, value]);

  useEffect(() => {
    if (selectedCustomer && !isOpen) {
      setSearchTerm(`${selectedCustomer.lastName}, ${selectedCustomer.name}`);
    } else if (!value && !isOpen) {
      setSearchTerm('');
    }
  }, [selectedCustomer, value, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedCustomer) {
          setSearchTerm(`${selectedCustomer.lastName}, ${selectedCustomer.name}`);
        } else {
          setSearchTerm('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedCustomer]);

  const filteredCustomers = useMemo(() => {
    // Filtrar clientes archivados, excepto si es el cliente actualmente seleccionado
    const activeCustomers = customers.filter(c => !c.archived || c.id === value);

    if (!searchTerm.trim()) return activeCustomers.slice(0, 8);
    
    const normalize = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

    const searchTokens = normalize(searchTerm).split(' ').filter(Boolean);

    const scoredCustomers = activeCustomers.map(c => {
      const customerStr = `${c.name} ${c.lastName} ${c.dni}`;
      const customerTokens = normalize(customerStr).split(' ').filter(Boolean);

      let score = 0;
      let allTokensMatched = true;

      for (const sToken of searchTokens) {
        let tokenMatched = false;
        let bestTokenScore = 0;

        for (const cToken of customerTokens) {
          if (cToken === sToken) {
            tokenMatched = true;
            bestTokenScore = Math.max(bestTokenScore, 10);
          } else if (cToken.startsWith(sToken)) {
            tokenMatched = true;
            bestTokenScore = Math.max(bestTokenScore, 5);
          } else if (cToken.includes(sToken)) {
            tokenMatched = true;
            bestTokenScore = Math.max(bestTokenScore, 1);
          }
        }

        if (!tokenMatched) {
          allTokensMatched = false;
          break;
        }
        score += bestTokenScore;
      }

      return { customer: c, score, allTokensMatched };
    });

    return scoredCustomers
      .filter(sc => sc.allTokensMatched)
      .sort((a, b) => b.score - a.score)
      .map(sc => sc.customer)
      .slice(0, 8);
  }, [customers, searchTerm, value]);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative flex items-center">
        <label htmlFor={id} className="sr-only">Seleccionar Cliente</label>
        <input
          id={id}
          name={id}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (e.target.value === '') {
              onChange('');
            }
          }}
          onFocus={() => {
            setIsOpen(true);
            if (selectedCustomer) {
              setSearchTerm(''); // Clear to allow searching easily
            }
          }}
          placeholder="Buscar o crear..."
          className="w-full px-2 py-1.5 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:border-teal-500 text-sm bg-white font-medium text-gray-800"
        />
        <div className="absolute right-2 text-gray-400 pointer-events-none">
          <Icons.ChevronDown size={14} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full min-w-[200px] mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden flex flex-col">
          <ul className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
            <li 
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer border-b border-gray-50"
            >
              Sin cliente (Stock)
            </li>
            
            {filteredCustomers.map(c => (
              <li 
                key={c.id}
                onClick={() => {
                  onChange(c.id);
                  setIsOpen(false);
                }}
                className={`px-3 py-2 text-sm hover:bg-teal-50 cursor-pointer ${c.archived ? 'opacity-50' : ''}`}
              >
                <div className="font-medium text-gray-800">
                  {c.lastName}, {c.name} {c.archived && <span className="text-xs font-normal text-red-500 ml-1">(Archivado)</span>}
                </div>
                <div className="text-xs text-gray-500">DNI: {c.dni}</div>
              </li>
            ))}
            
            {searchTerm && filteredCustomers.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500 text-center">
                No se encontraron clientes
              </li>
            )}
          </ul>
          
          <div 
            onClick={() => {
              onAddNew(searchTerm);
              setIsOpen(false);
            }}
            className="p-2 bg-gray-50 border-t border-gray-100 hover:bg-teal-50 cursor-pointer flex items-center justify-center gap-1 text-sm font-medium text-teal-600 transition-colors"
          >
            <Icons.Plus size={16} />
            Crear "{searchTerm || 'Nuevo'}"
          </div>
        </div>
      )}
    </div>
  );
};
