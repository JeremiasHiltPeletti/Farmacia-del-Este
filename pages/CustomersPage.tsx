import React, { useState, useMemo } from 'react';
import { useApp } from '../context';
import { Icons } from '../components/Icon.tsx';
import { Button } from '../components/Button.tsx';
import { Customer, Role } from '../types';
import { generateUUID } from '../utils';

export const CustomersPage: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    dni: '',
    name: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    socialWork: '',
    affiliateNumber: '',
  });

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;

    const normalize = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

    const searchTokens = normalize(searchTerm).split(' ').filter(Boolean);

    const scoredCustomers = customers.map(c => {
      const customerStr = `${c.name} ${c.lastName} ${c.dni} ${c.phone || ''}`;
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
      .map(sc => sc.customer);
  }, [customers, searchTerm]);

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        dni: customer.dni,
        name: customer.name,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        socialWork: customer.socialWork || '',
        affiliateNumber: customer.affiliateNumber || '',
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        dni: '',
        name: '',
        lastName: '',
        phone: '',
        email: '',
        address: '',
        socialWork: '',
        affiliateNumber: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dni || !formData.name || !formData.lastName || !formData.phone) return;

    const customerData: Customer = {
      id: editingCustomer ? editingCustomer.id : generateUUID(),
      dni: formData.dni,
      name: formData.name,
      lastName: formData.lastName,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      socialWork: formData.socialWork,
      affiliateNumber: formData.affiliateNumber,
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date(),
    };

    if (editingCustomer) {
      await updateCustomer(customerData);
    } else {
      await addCustomer(customerData);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
      await deleteCustomer(id);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Registro de Clientes</h1>
          <p className="text-gray-400 font-medium mt-1">Gestiona la base de datos de clientes y sus obras sociales.</p>
        </div>
        <Button
          size="lg"
          onClick={() => handleOpenModal()}
          icon={<Icons.Plus size={18} />}
          className="flex-1 sm:flex-none"
        >
          Nuevo Cliente
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <label htmlFor="customers-search" className="sr-only">Buscar clientes</label>
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              id="customers-search"
              name="customers-search"
              type="text"
              placeholder="Buscar por nombre, apellido, DNI o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-gray-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">DNI</th>
                <th className="p-4 font-medium">Contacto</th>
                <th className="p-4 font-medium">Obra Social</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-gray-800">{customer.lastName}, {customer.name}</div>
                      {customer.address && <div className="text-xs text-gray-500 truncate max-w-xs">{customer.address}</div>}
                    </td>
                    <td className="p-4 text-sm text-gray-600 font-mono">{customer.dni}</td>
                    <td className="p-4 text-sm text-gray-600">
                      <div>{customer.phone}</div>
                      {customer.email && <div className="text-xs text-gray-400">{customer.email}</div>}
                    </td>
                    <td className="p-4 text-sm">
                      {customer.socialWork ? (
                        <div>
                          <span className="font-medium text-gray-800">{customer.socialWork}</span>
                          {customer.affiliateNumber && <div className="text-xs text-gray-500">Afiliado: {customer.affiliateNumber}</div>}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Particular</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="icon"
                          size="icon"
                          onClick={() => handleOpenModal(customer)}
                          icon={<Icons.Pencil size={16} />}
                        />
                        {currentUser.role === Role.ADMIN && (
                          <Button
                            variant="iconDanger"
                            size="icon"
                            onClick={() => handleDelete(customer.id)}
                            icon={<Icons.Delete size={16} />}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4 shrink-0">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <Button
                variant="icon"
                size="icon"
                onClick={handleCloseModal}
                icon={<Icons.Close size={24} />}
                className="rounded-full"
              />
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="customer-page-name" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</label>
                  <input id="customer-page-name" name="customer-page-name"
                    type="text"
                    required
                    autoComplete="given-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="customer-page-lastname" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Apellido</label>
                  <input id="customer-page-lastname" name="customer-page-lastname"
                    type="text"
                    required
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="customer-page-dni" className="text-xs font-bold text-gray-500 uppercase tracking-wider">DNI</label>
                  <input id="customer-page-dni" name="customer-page-dni"
                    type="text"
                    required
                    value={formData.dni}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="customer-page-phone" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Teléfono</label>
                  <input id="customer-page-phone" name="customer-page-phone"
                    type="text"
                    required
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="customer-page-address" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dirección (Opcional)</label>
                <input id="customer-page-address" name="customer-page-address"
                  type="text"
                  autoComplete="street-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="customer-page-socialwork" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Obra Social (Opcional)</label>
                  <input id="customer-page-socialwork" name="customer-page-socialwork"
                    type="text"
                    value={formData.socialWork}
                    onChange={(e) => setFormData({ ...formData, socialWork: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="Ej: PAMI, IOMA, OSDE"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="customer-page-affiliate" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nº Afiliado (Opcional)</label>
                  <input id="customer-page-affiliate" name="customer-page-affiliate"
                    type="text"
                    value={formData.affiliateNumber}
                    onChange={(e) => setFormData({ ...formData, affiliateNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-100 shrink-0 flex justify-end gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={handleCloseModal}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="lg"
                >
                  {editingCustomer ? 'Guardar Cambios' : 'Crear Cliente'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
