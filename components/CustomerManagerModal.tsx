import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context';
import { Icons } from './Icon.tsx';
import { Button } from './Button.tsx';
import { CustomerInlineModal } from './CustomerInlineModal.tsx';
import { normalizeSearchText } from '../utils';

interface CustomerManagerModalProps {
  onClose: () => void;
}

export const CustomerManagerModal: React.FC<CustomerManagerModalProps> = ({ onClose }) => {
  const { customers, orders, updateCustomer, deleteCustomer } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    let result = customers;
    if (searchTerm) {
      const lowerSearch = normalizeSearchText(searchTerm);
      result = result.filter(c => 
        normalizeSearchText(c.name).includes(lowerSearch) || 
        normalizeSearchText(c.lastName).includes(lowerSearch) ||
        normalizeSearchText(c.dni).includes(lowerSearch)
      );
    }
    // Sort: active first, then archived, then alphabetically
    return result.sort((a, b) => {
      if (a.archived === b.archived) {
        return a.lastName.localeCompare(b.lastName);
      }
      return a.archived ? 1 : -1;
    });
  }, [customers, searchTerm]);

  const isCustomerInUse = (customerId: string) => {
    return orders.some(order => order.items.some(item => item.customerId === customerId));
  };

  const handleToggleArchive = async (customerId: string, currentArchived: boolean) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      await updateCustomer({ ...customer, archived: !currentArchived });
    }
  };

  const handleDelete = async (customerId: string) => {
    setCustomerToDelete(customerId);
  };

  const confirmDelete = async () => {
    if (customerToDelete) {
      await deleteCustomer(customerToDelete);
      setCustomerToDelete(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none">
      <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center shadow-sm">
              <Icons.Users size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Gestión de Clientes</h2>
              <p className="text-sm text-gray-500">Administra, edita o archiva clientes existentes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setIsCreatingCustomer(true)} 
              icon={<Icons.Plus size={18} />}
            >
              Nuevo Cliente
            </Button>
            <Button variant="icon" onClick={onClose} icon={<Icons.Close size={20} />} />
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <label htmlFor="customer-search-input" className="sr-only">Buscar cliente</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Icons.Search size={18} />
            </div>
            <input
              id="customer-search-input"
              name="customer-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, apellido o DNI..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-gray-800"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/30">
          <div className="space-y-2">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No se encontraron clientes.
              </div>
            ) : (
              filteredCustomers.map(customer => {
                const inUse = isCustomerInUse(customer.id);
                return (
                  <div key={customer.id} className={`bg-white border rounded-xl p-4 flex items-center justify-between transition-colors ${customer.archived ? 'border-gray-200 opacity-60' : 'border-gray-200 hover:border-teal-200 shadow-sm'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${customer.archived ? 'text-gray-500' : 'text-gray-800'}`}>
                          {customer.lastName}, {customer.name}
                        </h3>
                        {customer.archived && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                            Archivado
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                        <span>DNI: {customer.dni}</span>
                        {customer.phone && <span>Tel: {customer.phone}</span>}
                        {inUse && (
                          <span className="text-xs text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Icons.Check size={12} /> En uso
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingCustomer(customer.id)}
                      >
                        Editar
                      </Button>
                      
                      {inUse ? (
                        <Button
                          variant={customer.archived ? "primary" : "secondary"}
                          size="sm"
                          onClick={() => handleToggleArchive(customer.id, !!customer.archived)}
                        >
                          {customer.archived ? 'Desarchivar' : 'Archivar'}
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(customer.id)}
                        >
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {editingCustomer && (
        <CustomerInlineModal
          initialName=""
          editingCustomerId={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onCustomerCreated={() => setEditingCustomer(null)}
        />
      )}

      {isCreatingCustomer && (
        <CustomerInlineModal
          initialName={searchTerm}
          onClose={() => setIsCreatingCustomer(false)}
          onCustomerCreated={() => setIsCreatingCustomer(false)}
        />
      )}

      {customerToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none">
          <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 flex flex-col items-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 shadow-sm">
              <Icons.Delete size={24} />
            </div>
            <h3 className="text-xl font-bold text-center text-gray-800 mb-2">¿Eliminar cliente?</h3>
            <p className="text-gray-500 text-center mb-6 text-sm">
              Esta acción no se puede deshacer. Se eliminará el cliente permanentemente.
            </p>
            <div className="flex gap-3 w-full">
              <Button 
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => setCustomerToDelete(null)}
              >
                Cancelar
              </Button>
              <Button 
                variant="danger"
                size="lg"
                fullWidth
                onClick={confirmDelete}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
