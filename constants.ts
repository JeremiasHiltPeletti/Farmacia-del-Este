
import { Category, Role, User } from './types';

export const USERS: User[] = [
  { id: 'u1', name: 'Rocio', role: Role.ADMIN, avatar: 'https://ui-avatars.com/api/?name=Rocio&background=EBF4FF&color=7F9CF5', pin: '1234' },
  { id: 'u2', name: 'Rita', role: Role.EMPLOYEE, avatar: 'https://ui-avatars.com/api/?name=Rita&background=EBF4FF&color=7F9CF5', pin: '1234' },
  { id: 'u3', name: 'Alexia', role: Role.EMPLOYEE, avatar: 'https://ui-avatars.com/api/?name=Alexia&background=EBF4FF&color=7F9CF5', pin: '1234' },
  { id: 'u4', name: 'Verónica', role: Role.EMPLOYEE, avatar: 'https://ui-avatars.com/api/?name=Veronica&background=EBF4FF&color=7F9CF5', pin: '1234' },
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'c1', name: 'General', color: 'bg-blue-100 text-blue-800', icon: 'Store' },
  { id: 'c2', name: 'Stock', color: 'bg-cyan-100 text-cyan-800', icon: 'Box' },
  { id: 'c3', name: 'Vencimientos', color: 'bg-red-100 text-red-800', icon: 'Calendar' },
  { id: 'c4', name: 'Recetas', color: 'bg-purple-100 text-purple-800', icon: 'FileText' },
];

export const INITIAL_PRODUCTS: any[] = [
  { id: 'p1', code: '7791234567890', name: 'Ibupirac', activeIngredient: 'Ibuprofeno', concentration: '400', unit: 'mg', presentation: 'Comprimidos x10', laboratory: 'Pfizer', category: 'Analgésicos', habitualSupplier: 'Droguería Sur', price: 1500, stock: 25, requiresLotAndExpiration: true, isTraceable: false, status: 'ACTIVE', createdAt: new Date('2023-01-01T10:00:00Z') },
  { id: 'p2', code: '7790987654321', name: 'Amoxidal', activeIngredient: 'Amoxicilina', concentration: '500', unit: 'mg', presentation: 'Comprimidos x21', laboratory: 'Roemmers', category: 'Antibióticos', habitualSupplier: 'Droguería del Sud', price: 4200, stock: 12, requiresLotAndExpiration: true, isTraceable: true, status: 'ACTIVE', createdAt: new Date('2023-01-02T10:00:00Z') },
  { id: 'p3', code: '7791122334455', name: 'Tafirol', activeIngredient: 'Paracetamol', concentration: '1', unit: 'g', presentation: 'Comprimidos x30', laboratory: 'Genomma', category: 'Analgésicos', habitualSupplier: 'Droguería Sur', price: 2100, stock: 50, requiresLotAndExpiration: true, isTraceable: false, status: 'ACTIVE', createdAt: new Date('2023-01-03T10:00:00Z') },
  { id: 'p4', code: '7792233445566', name: 'Actron', activeIngredient: 'Ibuprofeno', concentration: '600', unit: 'mg', presentation: 'Cápsulas blandas x10', laboratory: 'Bayer', category: 'Analgésicos', habitualSupplier: 'Droguería del Sud', price: 1800, stock: 30, requiresLotAndExpiration: true, isTraceable: false, status: 'ACTIVE', createdAt: new Date('2023-01-04T10:00:00Z') },
  { id: 'p5', code: '7793344556677', name: 'Losartan', activeIngredient: 'Losartan Potásico', concentration: '50', unit: 'mg', presentation: 'Comprimidos x30', laboratory: 'Baliarda', category: 'Antihipertensivos', habitualSupplier: 'Droguería Sur', price: 3500, stock: 15, requiresLotAndExpiration: true, isTraceable: true, status: 'ACTIVE', createdAt: new Date('2023-01-05T10:00:00Z') },
];

export const INITIAL_CUSTOMERS: any[] = [
  { id: 'cu1', dni: '12345678', name: 'Juan', lastName: 'Pérez', phone: '1122334455', email: 'juan.perez@example.com', address: 'Av. Siempre Viva 123', socialWork: 'OSDE', affiliateNumber: '12345-6', createdAt: new Date('2023-01-01T10:00:00Z') },
  { id: 'cu2', dni: '87654321', name: 'María', lastName: 'Gómez', phone: '1155443322', email: 'maria.gomez@example.com', address: 'Calle Falsa 123', socialWork: 'PAMI', affiliateNumber: '654321-0', createdAt: new Date('2023-01-02T10:00:00Z') },
  { id: 'cu3', dni: '11223344', name: 'Carlos', lastName: 'López', phone: '1199887766', email: 'carlos.lopez@example.com', address: 'Av. Libertador 456', socialWork: 'IOMA', affiliateNumber: '998877/1', createdAt: new Date('2023-01-03T10:00:00Z') },
];

export const INITIAL_NOTICES: any[] = [
  { id: 'n1', text: 'Reunión de equipo a las 14:00 hs', createdAt: new Date() },
  { id: 'n2', text: 'Llegó el pedido de Droguería Sur, revisar faltantes.', createdAt: new Date(Date.now() - 3600000) },
  { id: 'n3', text: 'Llegan vacunas antigripales del PAMI', createdAt: new Date(Date.now() - 7200000) },
];

export const INITIAL_COMPENSATORY: any[] = [
  { id: 'comp1', employeeId: 'u3', type: 'CREDIT', amount: 1, date: new Date(Date.now() - 86400000 * 5), note: 'Cubrió turno tarde', createdAt: new Date() },
  { id: 'comp2', employeeId: 'u3', type: 'CREDIT', amount: 0.5, date: new Date(Date.now() - 86400000 * 2), note: 'Feriado trabajado medio día', createdAt: new Date() },
  { id: 'comp3', employeeId: 'u3', type: 'TAKEN', amount: 1, date: new Date(Date.now() - 86400000 * 1), note: 'Trámite personal', createdAt: new Date() },
  
  { id: 'comp4', employeeId: 'u4', type: 'CREDIT', amount: 1, date: new Date(Date.now() - 86400000 * 10), note: 'Sábado a la tarde', createdAt: new Date() },
  { id: 'comp5', employeeId: 'u4', type: 'CREDIT', amount: 1, date: new Date(Date.now() - 86400000 * 4), note: 'Feriado nacional', createdAt: new Date() },
];

export const INITIAL_TASKS: any[] = [
  { id: 't1', title: 'Revisar vencimientos de analgésicos', description: 'Revisar estante 3', categoryId: 'c3', priority: 'HIGH', status: 'PENDING', dueTime: '10:00', isRecurringInstance: false, assignedToIds: ['u2', 'u3'], checklist: [{id: 'chk1', text: 'Estante 3A', completed: false}, {id: 'chk2', text: 'Estante 3B', completed: false}], comments: [], attachments: [], createdAt: new Date(), createdBy: 'u1' },
  { id: 't2', title: 'Ingresar stock de Droguería Sur', description: 'Factura A-001-12345', categoryId: 'c2', priority: 'MEDIUM', status: 'PENDING', dueTime: '11:30', isRecurringInstance: false, assignedToIds: ['u4'], checklist: [], comments: [], attachments: [], createdAt: new Date(), createdBy: 'u1' },
  { id: 't3', title: 'Acomodar estantería de perfumería', description: 'Nuevos ingresos', categoryId: 'c1', priority: 'LOW', status: 'PENDING', dueTime: '14:00', isRecurringInstance: false, assignedToIds: ['u2'], checklist: [], comments: [], attachments: [], createdAt: new Date(), createdBy: 'u1' },
  { id: 't4', title: 'Cargar recetas de PAMI', description: 'Del día anterior', categoryId: 'c4', priority: 'HIGH', status: 'PENDING', dueTime: '16:00', isRecurringInstance: false, assignedToIds: ['u3', 'u4'], checklist: [], comments: [], attachments: [], createdAt: new Date(), createdBy: 'u1' },
  { id: 't5', title: 'Controlar caja chica', description: 'Cierre parcial', categoryId: 'c1', priority: 'MEDIUM', status: 'PENDING', dueTime: '18:30', isRecurringInstance: false, assignedToIds: ['u1'], checklist: [], comments: [], attachments: [], createdAt: new Date(), createdBy: 'u1' },
  { id: 'tc1', title: 'Limpieza de exhibidores', description: '', categoryId: 'c1', priority: 'LOW', status: 'COMPLETED', dueTime: '08:00', isRecurringInstance: false, assignedToIds: ['u2'], checklist: [], comments: [], attachments: [], createdAt: new Date(), completedAt: new Date(Date.now() - 3600000 * 2), createdBy: 'u1' },
  { id: 'tc2', title: 'Pedidos especiales', description: 'Llamar a clientes', categoryId: 'c1', priority: 'MEDIUM', status: 'COMPLETED', dueTime: '09:00', isRecurringInstance: false, assignedToIds: ['u3'], checklist: [], comments: [], attachments: [], createdAt: new Date(), completedAt: new Date(Date.now() - 3600000), createdBy: 'u1' },
  { id: 'tc3', title: 'Inventario de antibióticos', description: '', categoryId: 'c2', priority: 'HIGH', status: 'COMPLETED', dueTime: '10:00', isRecurringInstance: false, assignedToIds: ['u4'], checklist: [], comments: [], attachments: [], createdAt: new Date(), completedAt: new Date(Date.now() - 1800000), createdBy: 'u1' },
  { id: 'tc4', title: 'Revisar devoluciones', description: '', categoryId: 'c2', priority: 'LOW', status: 'COMPLETED', dueTime: '11:00', isRecurringInstance: false, assignedToIds: ['u2'], checklist: [], comments: [], attachments: [], createdAt: new Date(Date.now() - 86400000 * 4), completedAt: new Date(Date.now() - 86400000 * 4 + 1800000), createdBy: 'u1' },
  { id: 'tc5', title: 'Control de heladera', description: 'Temperaturas', categoryId: 'c3', priority: 'HIGH', status: 'COMPLETED', dueTime: '12:00', isRecurringInstance: false, assignedToIds: ['u3'], checklist: [], comments: [], attachments: [], createdAt: new Date(Date.now() - 86400000 * 5), completedAt: new Date(Date.now() - 86400000 * 5 + 5400000), createdBy: 'u1' },
  { id: 'tc6', title: 'Facturación quincenal', description: '', categoryId: 'c1', priority: 'HIGH', status: 'COMPLETED', dueTime: '13:00', isRecurringInstance: false, assignedToIds: ['u4'], checklist: [], comments: [], attachments: [], createdAt: new Date(Date.now() - 86400000 * 6), completedAt: new Date(Date.now() - 86400000 * 6 + 14400000), createdBy: 'u1' },
  { id: 'tc7', title: 'Actualizar precios OSDE', description: '', categoryId: 'c4', priority: 'MEDIUM', status: 'COMPLETED', dueTime: '14:00', isRecurringInstance: false, assignedToIds: ['u2'], checklist: [], comments: [], attachments: [], createdAt: new Date(Date.now() - 86400000 * 7), completedAt: new Date(Date.now() - 86400000 * 7 + 3600000), createdBy: 'u1' },
  { id: 'tc8', title: 'Cierre de mes', description: '', categoryId: 'c1', priority: 'HIGH', status: 'COMPLETED', dueTime: '15:00', isRecurringInstance: false, assignedToIds: ['u3'], checklist: [], comments: [], attachments: [], createdAt: new Date(Date.now() - 86400000 * 8), completedAt: new Date(Date.now() - 86400000 * 8 + 18000000), createdBy: 'u1' },
  ...Array.from({ length: 12 }).map((_, i) => ({
    id: `tc9_${i}`,
    title: `Tarea completada extra ${i+1}`,
    description: '',
    categoryId: 'c1',
    priority: 'LOW',
    status: 'COMPLETED',
    dueTime: '10:00',
    isRecurringInstance: false,
    assignedToIds: [i % 2 === 0 ? 'u2' : 'u3'],
    checklist: [],
    comments: [],
    attachments: [],
    createdAt: new Date(Date.now() - 86400000 * (i + 1)),
    completedAt: new Date(Date.now() - 86400000 * (i + 1) + 3600000 * ((i % 3) + 1)),
    createdBy: 'u1'
  }))
];

export const INITIAL_ORDERS: any[] = [
  { id: 'o1', orderNumber: 'PED-0001', supplier: 'Droguería Sur', priority: 'HIGH', status: 'PENDING', items: [{ id: 'oi1', productId: 'p1', quantity: 10, status: 'PENDING' }, { id: 'oi2', productId: 'p3', quantity: 5, status: 'PENDING' }], notes: 'Urgente para el fin de semana', createdAt: new Date(), createdBy: 'u2' },
  { id: 'o2', orderNumber: 'PED-0002', supplier: 'Droguería del Sud', priority: 'MEDIUM', status: 'DRAFT', items: [{ id: 'oi3', productId: 'p2', quantity: 3, status: 'PENDING', customerId: 'cu1' }], notes: 'Encargo especial cliente Juan Pérez', createdAt: new Date(), createdBy: 'u3' },
];

export const INITIAL_REFERENCE_PRODUCTS: any[] = [
  { 
    id: 'ref1', 
    code: '7796285200589', 
    name: 'Supositorios de Glicerina Adultos', 
    activeIngredient: 'Glicerina', 
    pharmaceuticalForm: 'Supositorios', 
    presentation: 'x10', 
    laboratory: 'Elea', 
    source: 'pilot_verified', 
    updatedAt: new Date() 
  },
  { 
    id: 'ref2', 
    code: '7792183186376', 
    name: 'Somit', 
    activeIngredient: 'Zolpidem', 
    concentration: '10 mg', 
    pharmaceuticalForm: 'Comprimidos', 
    presentation: 'x30', 
    laboratory: 'Gador', 
    troquel: '3580793',
    source: 'pilot_verified', 
    updatedAt: new Date() 
  },
  { 
    id: 'ref3', 
    code: '7795334000170', 
    name: 'Kritel', 
    activeIngredient: 'Picosulfato de sodio', 
    concentration: '7.5 mg/ml', 
    pharmaceuticalForm: 'Gotas orales', 
    presentation: '20 ml', 
    laboratory: 'Monserrat',
    source: 'pilot_verified', 
    updatedAt: new Date() 
  },
  { 
    id: 'ref4', 
    code: '7791829018583', 
    name: 'Ovulol UD', 
    activeIngredient: 'Levonorgestrel', 
    concentration: '1.5 mg', 
    pharmaceuticalForm: 'Comprimido', 
    presentation: 'x1',
    source: 'pilot_verified', 
    updatedAt: new Date() 
  },
  { 
    id: 'ref5', 
    code: '7795338013589', 
    name: 'Clonagin', 
    activeIngredient: 'Clonazepam', 
    concentration: '1 mg', 
    pharmaceuticalForm: 'Comprimidos', 
    presentation: 'x60',
    source: 'pilot_verified', 
    updatedAt: new Date() 
  }
];


