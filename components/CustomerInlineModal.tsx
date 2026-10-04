import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context';
import { Icons } from './Icon.tsx';
import { Customer } from '../types';
import { Button } from './Button.tsx';
import { generateUUID } from '../utils';

interface CustomerInlineModalProps {
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
  initialName?: string;
  editingCustomerId?: string;
}

export const CustomerInlineModal: React.FC<CustomerInlineModalProps> = ({ onClose, onCustomerCreated, initialName = '', editingCustomerId }) => {
  const { addCustomer, updateCustomer, customers } = useApp();
  
  const editingCustomer = editingCustomerId ? customers.find(c => c.id === editingCustomerId) : null;

  const [formData, setFormData] = useState({
    dni: editingCustomer?.dni || '',
    name: editingCustomer?.name || initialName,
    lastName: editingCustomer?.lastName || '',
    phone: editingCustomer?.phone || '',
    email: editingCustomer?.email || '',
    address: editingCustomer?.address || '',
    socialWork: editingCustomer?.socialWork || '',
    affiliateNumber: editingCustomer?.affiliateNumber || '',
  });

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
      archived: editingCustomer ? editingCustomer.archived : false,
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date(),
      updatedAt: new Date(),
    };

    if (editingCustomer) {
      await updateCustomer(customerData);
    } else {
      await addCustomer(customerData);
    }
    onCustomerCreated(customerData);
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-800">{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
          <Button
            variant="icon"
            size="icon"
            onClick={onClose}
            icon={<Icons.Close size={20} />}
            className="rounded-full"
          />
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="customer-name" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</label>
              <input
                id="customer-name"
                name="name"
                type="text"
                autoComplete="given-name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z\sáéíóúÁÉÍÓÚñÑ]/g, '') })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 capitalize font-medium text-gray-800"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="customer-lastName" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Apellido</label>
              <input
                id="customer-lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value.replace(/[^a-zA-Z\sáéíóúÁÉÍÓÚñÑ]/g, '') })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 capitalize font-medium text-gray-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="customer-dni" className="text-xs font-bold text-gray-500 uppercase tracking-wider">DNI</label>
              <input
                id="customer-dni"
                name="dni"
                type="text"
                required
                value={formData.dni}
                onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="customer-phone" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Teléfono</label>
              <input
                id="customer-phone"
                name="phone"
                type="text"
                autoComplete="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9+\-\s]/g, '') })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="customer-address" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dirección (Opcional)</label>
            <input
              id="customer-address"
              name="address"
              type="text"
              autoComplete="street-address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium text-gray-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="customer-socialWork" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Obra Social (Opcional)</label>
              <input
                id="customer-socialWork"
                name="socialWork"
                type="text"
                value={formData.socialWork}
                onChange={(e) => setFormData({ ...formData, socialWork: e.target.value.replace(/[^a-zA-Z\sáéíóúÁÉÍÓÚñÑ0-9-]/g, '') })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 uppercase font-medium text-gray-800"
                placeholder="Ej: PAMI, IOMA, OSDE"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="customer-affiliateNumber" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nº Afiliado (Opcional)</label>
              <input
                id="customer-affiliateNumber"
                name="affiliateNumber"
                type="text"
                value={formData.affiliateNumber}
                onChange={(e) => setFormData({ ...formData, affiliateNumber: e.target.value.replace(/[^a-zA-Z0-9\-\/]/g, '') })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="lg"
            >
              Crear Cliente
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
