
export enum Role {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE'
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum MessageType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT'
}

// Nuevos tipos para el Calendario
export enum EventType {
  HOLIDAY = 'HOLIDAY', // Feriado / Cierre (Rojo)
  NOTE = 'NOTE'        // Nota General (Violeta/Azul)
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: EventType;
  isPrivate: boolean; // Si es true, solo lo ve el Admin
  createdBy: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  pin?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string; // Tailwind class like 'bg-red-500'
  icon: string; // Lucide icon name
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  timestamp: Date;
}

export interface Attachment {
  id: string;
  name: string;
  url: string; // Blob URL or remote URL
  type: 'IMAGE' | 'DOCUMENT';
  size?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string; // Used for "Notas Extra"
  categoryId: string;
  priority: Priority;
  status: TaskStatus;
  dueTime?: string; // HH:mm format for timeline
  isRecurringInstance: boolean;
  assignedToIds: string[];
  checklist: ChecklistItem[];
  comments: Comment[];
  attachments: Attachment[];
  createdAt: Date;
  createdBy?: string; // Added to track who created the task
  completedAt?: Date; // Added for metrics
}

export interface Conversation {
  id: string;
  participants: string[]; // User IDs
  lastMessage?: string;
  lastMessageTimestamp?: Date;
  type: 'DIRECT' | 'GROUP';
  groupName?: string; // Optional for groups
}

export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  type: MessageType;
  content: string; // Text or Base64 audio / URL
  timestamp: Date;
  isEdited?: boolean;
}

export interface Notice {
  id: string;
  text: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string; // The recipient
  text: string;
  read: boolean;
  timestamp: Date;
  relatedTaskId?: string; // Optional link to task
}

export interface RecurringTemplate {
  id: string;
  title: string;
  categoryId: string;
  priority: Priority;
  dueTime?: string;
  assignedToIds: string[];
  checklist: ChecklistItem[];
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  daysOfWeek?: number[]; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  isActive: boolean;
  createdAt: Date;
}

// NUEVO: Compensatorio / Días Libres
export interface CompensatoryEntry {
  id: string;
  employeeId: string;
  date: Date; // Fecha del evento (día trabajado extra o día tomado)
  type: 'CREDIT' | 'TAKEN'; // CREDIT = Ganado (Se le debe), TAKEN = Tomado (Ya lo usó)
  amount: number; // 0.5 (Medio día) o 1.0 (Día completo)
  note: string;
  createdAt: Date;
}

// NUEVO: Catálogo de Productos
export interface Product {
  id: string;
  code: string; // Código de barras o SKU
  name: string; // Nombre comercial
  activeIngredient?: string; // Principio activo
  concentration?: string; // Concentración
  unit?: string; // Unidad
  presentation?: string; // Presentación
  laboratory?: string; // Laboratorio
  category: string;
  habitualSupplier?: string; // Proveedor habitual
  requiresLotAndExpiration?: boolean; // Requiere lote/vencimiento
  isTraceable?: boolean; // Es trazable
  status?: 'ACTIVE' | 'INACTIVE';
  description?: string;
  price: number;
  stock: number;
  createdAt: Date;
  updatedAt?: Date;
}

// NUEVO: Clientes
export interface Customer {
  id: string;
  dni: string;
  name: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  socialWork?: string; // Obra social
  affiliateNumber?: string; // Número de afiliado
  observations?: string;
  archived?: boolean; // NUEVO: Para borrado lógico
  createdAt: Date;
  updatedAt?: Date;
}

// NUEVO: Pedidos a Proveedores
export enum OrderGeneralStatus {
  DRAFT = 'DRAFT', // Borrador
  PENDING = 'PENDING', // Pendiente
  SENT_TO_SUPPLIER = 'SENT_TO_SUPPLIER', // Enviado al proveedor
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED', // Recibido parcial
  COMPLETED = 'COMPLETED', // Recibido completo
  CANCELLED = 'CANCELLED' // Cancelado
}

export enum OrderItemStatus {
  PENDING = 'PENDING', // Pendiente
  ORDERED = 'ORDERED', // Pedido
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED', // Recibido parcial
  RECEIVED = 'RECEIVED', // Recibido
  RESERVED = 'RESERVED', // Reservado para cliente
  DELIVERED = 'DELIVERED', // Entregado al cliente
  CANCELLED = 'CANCELLED' // Cancelado
}

export interface OrderItem {
  id: string; // ID único de la línea
  productId: string;
  quantity: number;
  receivedQuantity?: number; // Cantidad recibida
  customerId?: string; // Cliente asociado (opcional)
  status: OrderItemStatus;
  notes?: string;
  unitPrice?: number; // Para mantener compatibilidad si se requiere
  discount?: number;
}

export interface Order {
  id: string;
  orderNumber: string; // Un número legible para el usuario
  supplier: string; // Proveedor
  priority: Priority;
  status: OrderGeneralStatus;
  items: OrderItem[];
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string; // ID del empleado que tomó el pedido
}
