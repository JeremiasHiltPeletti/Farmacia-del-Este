import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context';
import { Icons } from '../components/Icon.tsx';
import { Order, OrderItem, OrderGeneralStatus, OrderItemStatus, Product, Customer, Priority, Role } from '../types';
import { CustomerInlineModal } from '../components/CustomerInlineModal.tsx';
import { ProductInlineModal } from '../components/ProductInlineModal.tsx';
import { CustomerSelect } from '../components/CustomerSelect.tsx';
import { CustomerManagerModal } from '../components/CustomerManagerModal.tsx';
import { Button } from '../components/Button.tsx';
import { generateUUID, normalizeSearchText } from '../utils';

export const OrdersPage: React.FC = () => {
  const { orders, products, customers, addOrder, updateOrder, deleteOrder, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterCustomer, setFilterCustomer] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Modals for inline creation
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCustomerManager, setShowCustomerManager] = useState(false);
  const [activeLineIndexForCustomer, setActiveLineIndexForCustomer] = useState<number | null>(null);
  const [initialCustomerName, setInitialCustomerName] = useState('');

  // Form State
  const [supplier, setSupplier] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [status, setStatus] = useState<OrderGeneralStatus>(OrderGeneralStatus.DRAFT);
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Product Search State
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Unique suppliers for filter
  const uniqueSuppliers = useMemo(() => {
    const suppliers = new Set(orders.map(o => o.supplier));
    return Array.from(suppliers).sort();
  }, [orders]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen || deleteId || showCustomerModal || showProductModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen, deleteId, showCustomerModal, showProductModal]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Filtros exactos
      if (filterSupplier && o.supplier !== filterSupplier) return false;
      if (filterStatus && o.status !== filterStatus) return false;
      if (filterPriority && o.priority !== filterPriority) return false;
      if (filterCustomer && !o.items.some(item => item.customerId === filterCustomer)) return false;

      // Búsqueda por texto
      if (!searchTerm) return true;
      
      const searchLower = normalizeSearchText(searchTerm);
      
      // Coincidencia en datos generales del pedido
      if (normalizeSearchText(o.orderNumber).includes(searchLower) || normalizeSearchText(o.supplier).includes(searchLower)) {
        return true;
      }

      // Coincidencia profunda en las líneas (producto o cliente)
      return o.items.some(item => {
        const product = products.find(p => p.id === item.productId);
        if (product && normalizeSearchText(product.name).includes(searchLower)) return true;
        
        if (item.customerId) {
          const customer = customers.find(c => c.id === item.customerId);
          if (customer) {
            const customerName = normalizeSearchText(`${customer.name} ${customer.lastName}`);
            if (customerName.includes(searchLower)) return true;
          }
        }
        return false;
      });
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [orders, searchTerm, filterSupplier, filterStatus, filterPriority, filterCustomer, products, customers]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    const lower = normalizeSearchText(productSearch);
    return products.filter(p => 
      normalizeSearchText(p.name).includes(lower) ||
      (p.code && normalizeSearchText(p.code).includes(lower)) ||
      (p.activeIngredient && normalizeSearchText(p.activeIngredient).includes(lower))
    ).slice(0, 5);
  }, [products, productSearch]);

  const handleOpenModal = (order?: Order) => {
    if (order) {
      setEditingOrder(order);
      setSupplier(order.supplier);
      setPriority(order.priority);
      setStatus(order.status);
      setNotes(order.notes || '');
      setOrderItems(order.items);
    } else {
      setEditingOrder(null);
      setSupplier('');
      setPriority(Priority.MEDIUM);
      setStatus(OrderGeneralStatus.DRAFT);
      setNotes('');
      setOrderItems([]);
    }
    setProductSearch('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
  };

  const handleAddProductToOrder = (product: Product) => {
    setOrderItems([...orderItems, {
      id: generateUUID(),
      productId: product.id,
      quantity: 1,
      status: OrderItemStatus.PENDING,
      notes: ''
    }]);
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleUpdateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...orderItems];
    const item = { ...newItems[index], [field]: value };

    // Lógica automática de sugerencia de estado según cantidad recibida
    if (field === 'receivedQuantity') {
      const received = value as number;
      const ordered = item.quantity;
      
      if (received === 0) {
        item.status = status === OrderGeneralStatus.DRAFT ? OrderItemStatus.PENDING : OrderItemStatus.ORDERED;
      } else if (received > 0 && received < ordered) {
        item.status = OrderItemStatus.PARTIALLY_RECEIVED;
      } else if (received >= ordered) {
        item.status = OrderItemStatus.RECEIVED;
      }
    }

    newItems[index] = item;
    setOrderItems(newItems);
  };

  const getAvailableItemStatuses = (generalStatus: OrderGeneralStatus, item: OrderItem) => {
    const hasCustomer = !!item.customerId;
    const received = item.receivedQuantity || 0;
    
    let allowed: OrderItemStatus[] = [];
    
    switch (generalStatus) {
      case OrderGeneralStatus.DRAFT:
        allowed = [OrderItemStatus.PENDING, OrderItemStatus.CANCELLED];
        break;
      case OrderGeneralStatus.PENDING:
        allowed = [OrderItemStatus.PENDING, OrderItemStatus.ORDERED, OrderItemStatus.CANCELLED];
        break;
      case OrderGeneralStatus.SENT_TO_SUPPLIER:
        allowed = [OrderItemStatus.ORDERED, OrderItemStatus.PARTIALLY_RECEIVED, OrderItemStatus.RECEIVED, OrderItemStatus.CANCELLED];
        break;
      case OrderGeneralStatus.PARTIALLY_RECEIVED:
      case OrderGeneralStatus.COMPLETED:
        allowed = [
          OrderItemStatus.ORDERED, 
          OrderItemStatus.PARTIALLY_RECEIVED, 
          OrderItemStatus.RECEIVED, 
          OrderItemStatus.RESERVED, 
          OrderItemStatus.DELIVERED, 
          OrderItemStatus.CANCELLED
        ];
        break;
      case OrderGeneralStatus.CANCELLED:
        allowed = [OrderItemStatus.CANCELLED];
        break;
      default:
        allowed = Object.values(OrderItemStatus);
    }
    
    if (!hasCustomer) {
      allowed = allowed.filter(s => s !== OrderItemStatus.RESERVED && s !== OrderItemStatus.DELIVERED);
    }
    
    if (received === 0) {
      allowed = allowed.filter(s => s !== OrderItemStatus.RESERVED && s !== OrderItemStatus.DELIVERED);
    }
    
    if (!allowed.includes(item.status)) {
      allowed.push(item.status);
    }
    
    return allowed;
  };

  const getStatusLabel = (status: OrderItemStatus) => {
    switch (status) {
      case OrderItemStatus.PENDING: return 'Pendiente';
      case OrderItemStatus.ORDERED: return 'Pedido';
      case OrderItemStatus.PARTIALLY_RECEIVED: return 'Recibido parcial';
      case OrderItemStatus.RECEIVED: return 'Recibido';
      case OrderItemStatus.RESERVED: return 'Reservado';
      case OrderItemStatus.DELIVERED: return 'Entregado';
      case OrderItemStatus.CANCELLED: return 'Cancelado';
      default: return status;
    }
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!supplier || orderItems.length === 0) return;

    try {
      const orderData: Order = {
        id: editingOrder ? editingOrder.id : generateUUID(),
        orderNumber: editingOrder ? editingOrder.orderNumber : `PROV-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        supplier,
        priority,
        status,
        items: orderItems.map(item => {
          const cleanItem = { ...item };
          Object.keys(cleanItem).forEach(key => {
            if (cleanItem[key as keyof OrderItem] === undefined) {
              delete cleanItem[key as keyof OrderItem];
            }
          });
          return cleanItem;
        }),
        notes: notes || '',
        createdAt: editingOrder?.createdAt || new Date(),
        updatedAt: new Date(),
        createdBy: editingOrder?.createdBy || currentUser.id,
      };

      // Remove undefined fields from orderData
      Object.keys(orderData).forEach(key => {
        if (orderData[key as keyof Order] === undefined) {
          delete orderData[key as keyof Order];
        }
      });

      if (editingOrder) {
        await updateOrder(orderData);
      } else {
        await addOrder(orderData);
      }
      setIsModalOpen(false);
      setEditingOrder(null);
    } catch (error) {
      console.error("Error saving order:", error);
      alert("Hubo un error al guardar el pedido. Por favor, intenta de nuevo.");
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
  };

  const executeDelete = async () => {
    if (deleteId) {
      await deleteOrder(deleteId);
      setDeleteId(null);
    }
  };

  const getGeneralStatusColor = (status: OrderGeneralStatus) => {
    switch (status) {
      case OrderGeneralStatus.DRAFT: return 'bg-gray-100 text-gray-800';
      case OrderGeneralStatus.PENDING: return 'bg-yellow-100 text-yellow-800';
      case OrderGeneralStatus.SENT_TO_SUPPLIER: return 'bg-blue-100 text-blue-800';
      case OrderGeneralStatus.PARTIALLY_RECEIVED: return 'bg-purple-100 text-purple-800';
      case OrderGeneralStatus.COMPLETED: return 'bg-green-100 text-green-800';
      case OrderGeneralStatus.CANCELLED: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGeneralStatusLabel = (status: OrderGeneralStatus) => {
    switch (status) {
      case OrderGeneralStatus.DRAFT: return 'Borrador';
      case OrderGeneralStatus.PENDING: return 'Pendiente';
      case OrderGeneralStatus.SENT_TO_SUPPLIER: return 'Enviado al proveedor';
      case OrderGeneralStatus.PARTIALLY_RECEIVED: return 'Recibido parcial';
      case OrderGeneralStatus.COMPLETED: return 'Recibido completo';
      case OrderGeneralStatus.CANCELLED: return 'Cancelado';
      default: return status;
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.LOW: return 'bg-gray-100 text-gray-700';
      case Priority.MEDIUM: return 'bg-orange-100 text-orange-800';
      case Priority.HIGH: return 'bg-red-100 text-red-800 font-bold';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case Priority.LOW: return 'Normal';
      case Priority.MEDIUM: return 'Alta';
      case Priority.HIGH: return 'Urgente';
      default: return priority;
    }
  };

  const getItemStatusLabel = (status: OrderItemStatus) => {
    switch (status) {
      case OrderItemStatus.PENDING: return 'Pendiente';
      case OrderItemStatus.ORDERED: return 'Pedido';
      case OrderItemStatus.PARTIALLY_RECEIVED: return 'Recibido parcial';
      case OrderItemStatus.RECEIVED: return 'Recibido';
      case OrderItemStatus.RESERVED: return 'Reservado';
      case OrderItemStatus.DELIVERED: return 'Entregado';
      case OrderItemStatus.CANCELLED: return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Pedidos a Proveedores</h1>
          <p className="text-gray-400 font-medium mt-1">Gestiona encargos, recepción y asignación de productos a clientes.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setShowCustomerManager(true)}
            icon={<Icons.Users size={18} />}
            className="flex-1 sm:flex-none"
          >
            Gestionar Clientes
          </Button>
          <Button
            size="lg"
            onClick={() => handleOpenModal()}
            icon={<Icons.Plus size={18} />}
            className="flex-1 sm:flex-none"
          >
            Nuevo Pedido
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <label htmlFor="orders-search" className="sr-only">Buscar pedido</label>
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              id="orders-search"
              name="orders-search"
              type="text"
              placeholder="Buscar por pedido, proveedor, producto o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-gray-800"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <label htmlFor="filter-supplier" className="sr-only">Filtrar por proveedor</label>
              <select
                id="filter-supplier"
                name="filter-supplier"
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="appearance-none px-3 pr-8 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm bg-white"
              >
                <option value="">Todos los proveedores</option>
                {uniqueSuppliers.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <Icons.ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
            <div className="relative">
              <label htmlFor="filter-status" className="sr-only">Filtrar por estado</label>
              <select
                id="filter-status"
                name="filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none px-3 pr-8 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm bg-white"
              >
                <option value="">Todos los estados</option>
                <option value={OrderGeneralStatus.DRAFT}>Borrador</option>
                <option value={OrderGeneralStatus.PENDING}>Pendiente</option>
                <option value={OrderGeneralStatus.SENT_TO_SUPPLIER}>Enviado al proveedor</option>
                <option value={OrderGeneralStatus.PARTIALLY_RECEIVED}>Recibido parcial</option>
                <option value={OrderGeneralStatus.COMPLETED}>Recibido completo</option>
                <option value={OrderGeneralStatus.CANCELLED}>Cancelado</option>
              </select>
              <Icons.ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
            <div className="relative">
              <label htmlFor="filter-priority" className="sr-only">Filtrar por prioridad</label>
              <select
                id="filter-priority"
                name="filter-priority"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="appearance-none px-3 pr-8 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm bg-white"
              >
                <option value="">Todas las prioridades</option>
                <option value={Priority.LOW}>Normal</option>
                <option value={Priority.MEDIUM}>Alta</option>
                <option value={Priority.HIGH}>Urgente</option>
              </select>
              <Icons.ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
            <div className="relative">
              <label htmlFor="filter-customer" className="sr-only">Filtrar por cliente</label>
              <select
                id="filter-customer"
                name="filter-customer"
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                className="appearance-none px-3 pr-8 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm bg-white max-w-[200px] truncate"
              >
                <option value="">Todos los clientes</option>
                {customers.filter(c => !c.archived || filterCustomer === c.id).map(c => (
                  <option key={c.id} value={c.id}>{c.lastName}, {c.name}</option>
                ))}
              </select>
              <Icons.ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Pedido</th>
                <th className="p-4 font-medium">Fecha</th>
                <th className="p-4 font-medium">Proveedor</th>
                <th className="p-4 font-medium">Prioridad</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium">Líneas</th>
                <th className="p-4 font-medium max-w-[200px]">Observaciones</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    No se encontraron pedidos.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-sm font-mono font-medium text-gray-800">{order.orderNumber}</td>
                      <td className="p-4 text-sm text-gray-600">
                        {order.createdAt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="p-4 font-medium text-gray-800">
                        {order.supplier}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                          {getPriorityLabel(order.priority)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGeneralStatusColor(order.status)}`}>
                          {getGeneralStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-600 flex flex-wrap items-center gap-1.5">
                          {(() => {
                            const total = order.items.length;
                            if (total === 0) {
                              return <span className="font-medium text-gray-500">Sin líneas</span>;
                            }

                            const pending = order.items.filter(i => (i.quantity - (i.receivedQuantity || 0)) > 0).length;
                            const reserved = order.items.filter(i => i.status === OrderItemStatus.RESERVED).length;
                            const delivered = order.items.filter(i => i.status === OrderItemStatus.DELIVERED).length;
                            const customerItems = order.items.filter(i => i.customerId).length;
                            
                            const isResolved = pending === 0;

                            const parts = [];
                            if (customerItems > 0) {
                              parts.push(
                                <span key="customer" className="text-blue-600 font-medium flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                  <Icons.Users size={12} />
                                  {customerItems} {customerItems === 1 ? 'encargo' : 'encargos'}
                                </span>
                              );
                            }
                            if (pending > 0) {
                              parts.push(
                                <span key="pending" className="text-orange-600 font-medium flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                  {pending} {pending === 1 ? 'pendiente' : 'pendientes'}
                                </span>
                              );
                            }
                            if (reserved > 0) {
                              parts.push(
                                <span key="reserved" className="text-purple-600 font-medium">
                                  {reserved} {reserved === 1 ? 'reservada' : 'reservadas'}
                                </span>
                              );
                            }
                            if (delivered > 0) {
                              parts.push(
                                <span key="delivered" className="text-teal-600 font-medium">
                                  {delivered} {delivered === 1 ? 'entregada' : 'entregadas'}
                                </span>
                              );
                            }

                            return (
                              <>
                                <span className="font-medium text-gray-800">
                                  {total} {total === 1 ? 'línea' : 'líneas'}
                                </span>
                                <span className="text-gray-300">·</span>
                                {isResolved ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                    <Icons.Check size={12} className="mr-1" /> Completo
                                  </span>
                                ) : (
                                  parts.map((part, idx) => (
                                    <React.Fragment key={idx}>
                                      {idx > 0 && <span className="text-gray-300">·</span>}
                                      {part}
                                    </React.Fragment>
                                  ))
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600 max-w-[200px] truncate" title={order.notes || ''}>
                        {order.notes || '-'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="icon"
                            size="icon"
                            onClick={() => handleOpenModal(order)}
                            icon={<Icons.Pencil size={16} />}
                          />
                          {currentUser.role === Role.ADMIN && (
                            <Button
                              variant="iconDanger"
                              size="icon"
                              onClick={() => confirmDelete(order.id)}
                              icon={<Icons.Delete size={16} />}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl p-6 md:p-8 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4 shrink-0">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingOrder ? `Editar Pedido ${editingOrder.orderNumber}` : 'Nuevo Pedido a Proveedor'}
              </h2>
              <Button 
                variant="icon" 
                size="icon" 
                onClick={handleCloseModal} 
                icon={<Icons.Close size={24} />} 
                className="rounded-full"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
              {/* Encabezado del Pedido */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="field-qz63wo" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Proveedor *</label>
                  <input id="field-qz63wo" name="field-qz63wo"
                    type="text"
                    required
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="Ej: Droguería Sur"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="order-status" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estado General</label>
                  <div className="relative">
                    <select
                      id="order-status"
                      name="order-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as OrderGeneralStatus)}
                      className="appearance-none w-full px-3 pr-8 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                    >
                      <option value={OrderGeneralStatus.DRAFT}>Borrador</option>
                      <option value={OrderGeneralStatus.PENDING}>Pendiente</option>
                      <option value={OrderGeneralStatus.SENT_TO_SUPPLIER}>Enviado al proveedor</option>
                      <option value={OrderGeneralStatus.PARTIALLY_RECEIVED}>Recibido parcial</option>
                      <option value={OrderGeneralStatus.COMPLETED}>Recibido completo</option>
                      <option value={OrderGeneralStatus.CANCELLED}>Cancelado</option>
                    </select>
                    <Icons.ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="order-priority" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Prioridad</label>
                  <div className="relative">
                    <select
                      id="order-priority"
                      name="order-priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="appearance-none w-full px-3 pr-8 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                    >
                      <option value={Priority.LOW}>Normal</option>
                      <option value={Priority.MEDIUM}>Alta</option>
                      <option value={Priority.HIGH}>Urgente</option>
                    </select>
                    <Icons.ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              {/* Buscador Inteligente de Productos */}
              <div className="space-y-2 bg-teal-50/50 p-4 rounded-xl border border-teal-100">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-bold text-teal-800 uppercase tracking-wider">Agregar Productos</div>
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowProductModal(true)}
                    className="text-teal-600 hover:text-teal-700 hover:bg-teal-100/50"
                    icon={<Icons.Plus size={14} />}
                  >
                    Crear Producto Nuevo
                  </Button>
                </div>
                <div className="relative">
                  <div className="relative">
                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input id="field-rxxcs2" name="field-rxxcs2"
                      type="text"
                      placeholder="Buscar producto por nombre, principio activo o código..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium text-gray-800"
                    />
                  </div>
                  
                  {showProductDropdown && productSearch && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {filteredProducts.length > 0 ? (
                        <ul className="max-h-60 overflow-y-auto">
                          {filteredProducts.map(product => (
                            <li 
                              key={product.id}
                              onClick={() => handleAddProductToOrder(product)}
                              className="px-4 py-2 hover:bg-teal-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                            >
                              <div>
                                <div className="font-medium text-gray-900">{product.name} {product.concentration} {product.unit}</div>
                                <div className="text-sm text-gray-500 mt-0.5">
                                  {[product.activeIngredient, product.presentation, product.laboratory].filter(Boolean).join(' · ')}
                                </div>
                                {product.code && <div className="text-xs text-gray-400 font-mono mt-0.5">Cód: {product.code}</div>}
                              </div>
                              <div className="text-teal-600">
                                <Icons.Plus size={18} />
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No se encontraron productos. <Button variant="ghost" size="sm" onClick={() => setShowProductModal(true)} className="text-teal-600 font-bold underline p-0 h-auto hover:bg-transparent">Crear nuevo</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de Productos en el Pedido */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto min-h-[350px]">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="p-3 font-medium w-[20%]">Producto</th>
                        <th className="p-3 font-medium text-center w-20">Pedida</th>
                        <th className="p-3 font-medium text-center w-20">Recibida</th>
                        <th className="p-3 font-medium text-center w-20">Pendiente</th>
                        <th className="p-3 font-medium w-[20%]">Cliente (Opcional)</th>
                        <th className="p-3 font-medium w-32">Estado</th>
                        <th className="p-3 font-medium text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orderItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-gray-500 text-sm">
                            No hay productos en el pedido.
                          </td>
                        </tr>
                      ) : (
                        orderItems.map((item, index) => {
                          const product = products.find(p => p.id === item.productId);
                          const isOverReceived = (item.receivedQuantity || 0) > item.quantity;
                          const pendingQuantity = Math.max(0, item.quantity - (item.receivedQuantity || 0));
                          const availableStatuses = getAvailableItemStatuses(status, item);
                          
                          return (
                            <tr key={item.id} className={item.customerId ? "bg-blue-50/50 border-l-2 border-l-blue-500" : "bg-white"}>
                              <td className="p-3">
                                <div className="font-medium text-gray-800 text-sm">{product?.name || 'Producto Desconocido'}</div>
                                <div className="text-xs text-gray-500">{product?.presentation}</div>
                              </td>
                              <td className="p-3">
                                <label htmlFor={`qty-${index}`} className="sr-only">Cantidad Pedida</label>
                                <input id={`qty-${index}`} name={`qty-${index}`}
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1.5 text-center rounded-lg border border-gray-200 focus:outline-none focus:border-teal-500 text-sm"
                                />
                              </td>
                              <td className="p-3">
                                <label htmlFor={`recv-${index}`} className="sr-only">Cantidad Recibida</label>
                                <input id={`recv-${index}`} name={`recv-${index}`}
                                  type="number"
                                  min="0"
                                  value={item.receivedQuantity || 0}
                                  onChange={(e) => handleUpdateItem(index, 'receivedQuantity', parseInt(e.target.value) || 0)}
                                  className={`w-full px-2 py-1.5 text-center rounded-lg border focus:outline-none text-sm ${isOverReceived ? 'border-red-400 focus:border-red-500 bg-red-50 text-red-700' : 'border-gray-200 focus:border-teal-500'}`}
                                  title={isOverReceived ? "La cantidad recibida supera la pedida" : ""}
                                />
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${pendingQuantity > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-500'}`}>
                                  {pendingQuantity}
                                </span>
                              </td>
                              <td className="p-3">
                                <CustomerSelect
                                  id={`customer-select-${index}`}
                                  value={item.customerId || ''}
                                  onChange={(customerId) => handleUpdateItem(index, 'customerId', customerId)}
                                  customers={customers}
                                  onAddNew={(typedName) => {
                                    setInitialCustomerName(typedName);
                                    setActiveLineIndexForCustomer(index);
                                    setShowCustomerModal(true);
                                  }}
                                />
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <label htmlFor={`order-item-status-${index}`} className="sr-only">Estado del item</label>
                                    <select
                                      id={`order-item-status-${index}`}
                                      name={`order-item-status-${index}`}
                                      value={item.status}
                                      onChange={(e) => handleUpdateItem(index, 'status', e.target.value as OrderItemStatus)}
                                      className="appearance-none w-full px-2 pr-8 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-teal-500 text-sm bg-white"
                                    >
                                      {availableStatuses.map(s => (
                                        <option key={s} value={s}>{getStatusLabel(s)}</option>
                                      ))}
                                    </select>
                                    <Icons.ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                                  </div>
                                  {item.customerId && item.status !== OrderItemStatus.DELIVERED && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateItem(index, 'status', OrderItemStatus.DELIVERED)}
                                      className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                      title="Marcar como Entregado"
                                    >
                                      <Icons.Check size={18} />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <Button
                                  variant="iconDanger"
                                  size="icon"
                                  onClick={() => handleRemoveItem(index)}
                                  icon={<Icons.Close size={16} />}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                      {orderItems.length > 0 && (
                        <tr className="h-64 bg-transparent border-none">
                          <td colSpan={7}></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Resumen Operativo */}
              {orderItems.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-wrap gap-6 text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-500 font-medium">Total Líneas</span>
                    <span className="font-bold text-gray-800 text-lg">{orderItems.length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 font-medium">Unidades Pedidas</span>
                    <span className="font-bold text-gray-800 text-lg">{orderItems.reduce((acc, item) => acc + item.quantity, 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 font-medium">Unidades Recibidas</span>
                    <span className="font-bold text-gray-800 text-lg">{orderItems.reduce((acc, item) => acc + (item.receivedQuantity || 0), 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 font-medium">Unidades Pendientes</span>
                    <span className="font-bold text-yellow-600 text-lg">{orderItems.reduce((acc, item) => acc + Math.max(0, item.quantity - (item.receivedQuantity || 0)), 0)}</span>
                  </div>
                  <div className="flex flex-col border-l border-gray-200 pl-6">
                    <span className="text-gray-500 font-medium">Líneas Reservadas</span>
                    <span className="font-bold text-purple-600 text-lg">{orderItems.filter(i => i.status === OrderItemStatus.RESERVED).length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 font-medium">Líneas Entregadas</span>
                    <span className="font-bold text-green-600 text-lg">{orderItems.filter(i => i.status === OrderItemStatus.DELIVERED).length}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="order-notes" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Observaciones Generales</label>
                <textarea
                  id="order-notes"
                  name="order-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none h-20"
                  placeholder="Instrucciones especiales para el pedido completo..."
                />
              </div>

            </div>

            <div className="pt-6 mt-6 border-t border-gray-100 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-xs text-gray-400 font-mono">
                {editingOrder ? (
                  <>
                    Creado: {editingOrder.createdAt.toLocaleString('es-AR')} <br/>
                    Última act.: {new Date().toLocaleString('es-AR')}
                  </>
                ) : (
                  'Nuevo pedido'
                )}
              </div>
              <div className="flex justify-end gap-4 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={handleCloseModal}
                  className="flex-1 sm:flex-none"
                >
                  Cancelar
                </Button>
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={!supplier || orderItems.length === 0}
                  className="flex-1 sm:flex-none"
                >
                  {editingOrder ? 'Guardar Cambios' : 'Crear Pedido'}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modales Inline */}
      {showCustomerManager && (
        <CustomerManagerModal onClose={() => setShowCustomerManager(false)} />
      )}

      {showCustomerModal && (
        <CustomerInlineModal 
          initialName={initialCustomerName}
          onClose={() => {
            setShowCustomerModal(false);
            setActiveLineIndexForCustomer(null);
            setInitialCustomerName('');
          }}
          onCustomerCreated={(customer) => {
            if (activeLineIndexForCustomer !== null) {
              handleUpdateItem(activeLineIndexForCustomer, 'customerId', customer.id);
            }
            setShowCustomerModal(false);
            setActiveLineIndexForCustomer(null);
            setInitialCustomerName('');
          }}
        />
      )}

      {showProductModal && (
        <ProductInlineModal 
          onClose={() => setShowProductModal(false)}
          initialName={productSearch}
          onProductCreated={(product) => {
            handleAddProductToOrder(product);
            setShowProductModal(false);
          }}
        />
      )}

      {/* Modal de Confirmación de Eliminación */}
      {deleteId && createPortal(
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none">
            <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 flex flex-col items-center">
               <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 shadow-sm">
                  <Icons.Delete size={24} />
               </div>
               <h3 className="text-xl font-bold text-center text-gray-800 mb-2">¿Eliminar pedido?</h3>
               <p className="text-gray-500 text-center mb-6 text-sm">
                  Esta acción no se puede deshacer. Se eliminará el pedido y todas sus líneas de productos.
               </p>
               <div className="flex gap-3 w-full">
                  <Button 
                    variant="secondary"
                    size="lg"
                    fullWidth
                    onClick={() => setDeleteId(null)}
                  >
                     Cancelar
                  </Button>
                  <Button 
                    variant="danger"
                    size="lg"
                    fullWidth
                    onClick={executeDelete}
                  >
                     Eliminar
                  </Button>
               </div>
            </div>
         </div>,
         document.body
      )}
    </div>
  );
};
