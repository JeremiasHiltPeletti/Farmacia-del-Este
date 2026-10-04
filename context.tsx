// context.tsx
import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from "react";

import {
  Task,
  Category,
  User,
  RecurringTemplate,
  Message,
  Role,
  TaskStatus,
  MessageType,
  Notice,
  Notification,
  Conversation,
  CalendarEvent,
  CompensatoryEntry,
  Product,
  Customer,
  Order,
} from "./types";

import { USERS, INITIAL_CATEGORIES } from "./constants";
import { db } from "./firebase";

import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  setDoc,
  Timestamp,
  writeBatch,
} from "./mockFirestore";

import {
  upsertReminderForTask,
  cancelPendingRemindersForTask,
} from "./reminders";

/* =====================================================
   🔔 SONIDO POR USUARIO (POR PC)
   ===================================================== */

const SOUND_KEY = (userId: string) => `FE_SOUND_${userId}`;

const getStoredSound = (userId: string) => {
  try {
    return localStorage.getItem(SOUND_KEY(userId)) || "Campana Clásica";
  } catch {
    return "Campana Clásica";
  }
};

/* =====================================================
   TYPES
   ===================================================== */

interface AppContextType {
  currentUser: User;
  users: User[];
  switchUser: (userId: string) => void;
  updateCurrentUser: (updates: Partial<User>) => void;

  tasks: Task[];
  categories: Category[];
  templates: RecurringTemplate[];
  messages: Message[];
  conversations: Conversation[];
  notices: Notice[];
  notifications: Notification[];
  calendarEvents: CalendarEvent[];
  compensatoryEntries: CompensatoryEntry[];
  products: Product[];
  customers: Customer[];
  orders: Order[];

  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;

  addTask: (task: Task) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;

  addCategory: (cat: Category) => Promise<void>;
  updateCategory: (cat: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addTemplate: (template: RecurringTemplate) => void;

  addCalendarEvent: (event: CalendarEvent) => Promise<void>;
  updateCalendarEvent: (event: CalendarEvent) => Promise<void>;
  deleteCalendarEvent: (id: string) => Promise<void>;

  addCompensatoryEntry: (entry: CompensatoryEntry) => Promise<void>;
  updateCompensatoryEntry: (entry: CompensatoryEntry) => Promise<void>;
  deleteCompensatoryEntry: (id: string) => Promise<void>;

  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  addOrder: (order: Order) => Promise<void>;
  updateOrder: (order: Order) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;

  startConversation: (participantIds: string[]) => Promise<string>;
  sendMessage: (
    conversationId: string,
    content: string,
    type: MessageType,
  ) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;

  addNotice: (notice: Notice) => Promise<void>;
  updateNotice: (notice: Notice) => Promise<void>;
  deleteNotice: (id: string) => Promise<void>;

  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;

  notificationSound: string;
  setNotificationSound: (sound: string) => void;

  getCategory: (id: string) => Category | undefined;
  getUser: (id: string) => User | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};

/* =====================================================
   HELPERS
   ===================================================== */

const convertDate = (date: any): Date => {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  if (date instanceof Timestamp) return date.toDate();
  if (typeof date === "string") return new Date(date);
  if (date && typeof date.seconds === "number") return new Date(date.seconds * 1000);
  return new Date();
};

const normalizeHHMM = (v: any) => {
  if (!v) return "";
  const m = String(v).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const hh = String(m[1]).padStart(2, "0");
  const mm = String(m[2]).padStart(2, "0");
  return `${hh}:${mm}`;
};

/**
 * scheduledAt = fecha de la tarea (createdAt) + dueTime
 */
const buildScheduledAtFromDueTime = (
  baseDate: Date,
  dueTime?: string,
): Date | null => {
  const t = normalizeHHMM(dueTime);
  if (!t) return null;

  const [hh, mm] = t.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;

  const scheduled = new Date(baseDate);
  scheduled.setSeconds(0, 0);
  scheduled.setHours(hh, mm, 0, 0);
  return scheduled;
};

const computeScheduledFields = (task: Task) => {
  const scheduled = buildScheduledAtFromDueTime(task.createdAt, task.dueTime);
  return {
    scheduledAtTs: scheduled ? Timestamp.fromDate(scheduled) : null,
    notifiedAtTs: null as any,
  };
};

/* =====================================================
   PROVIDER
   ===================================================== */

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [users, setUsers] = useState<User[]>(USERS);
  const [currentUser, setCurrentUser] = useState<User>(USERS[0]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [compensatoryEntries, setCompensatoryEntries] = useState<
    CompensatoryEntry[]
  >([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  /* =======================
     🔔 SONIDO POR USUARIO
     ======================= */

  const [notificationSound, setNotificationSoundState] = useState<string>(() =>
    getStoredSound(USERS[0].id),
  );

  useEffect(() => {
    if (!currentUser?.id) return;
    setNotificationSoundState(getStoredSound(currentUser.id));
  }, [currentUser?.id]);

  const setNotificationSound = (sound: string) => {
    if (!currentUser?.id) return;
    setNotificationSoundState(sound);
    try {
      localStorage.setItem(SOUND_KEY(currentUser.id), sound);
    } catch {}
  };

  /* =======================
     FIRESTORE SUBSCRIPTIONS
     ======================= */

  useEffect(() => {
    const q = query(collection(db, "categories"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats = snapshot.docs.map(
        (d) => ({ ...d.data(), id: d.id }) as Category,
      );

      if (cats.length === 0 && snapshot.metadata.hasPendingWrites === false) {
        const batch = writeBatch(db);
        INITIAL_CATEGORIES.forEach((c) => {
          batch.set(doc(db, "categories", c.id), c);
        });
        batch.commit();
      } else {
        setCategories(cats);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map((d) => {
        const data: any = d.data();
        return {
          ...data,
          id: d.id,
          createdAt: convertDate(data.createdAt),
          completedAt: data.completedAt
            ? convertDate(data.completedAt)
            : undefined,
          scheduledAt: data.scheduledAt
            ? convertDate(data.scheduledAt)
            : undefined,
          notifiedAt: data.notifiedAt ? convertDate(data.notifiedAt) : null,
          comments: (data.comments || []).map((c: any) => ({
            ...c,
            timestamp: convertDate(c.timestamp),
          })),
        } as Task;
      });

      setAllTasks(loaded);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotices(
        snapshot.docs.map(
          (docSnap) =>
            ({
              ...docSnap.data(),
              id: docSnap.id,
              createdAt: convertDate((docSnap.data() as any).createdAt),
            }) as Notice,
        ),
      );
    }, (error) => {
      console.error("Error fetching notices:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "conversations"),
      orderBy("lastMessageTimestamp", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setConversations(
        snapshot.docs.map(
          (docSnap) =>
            ({
              ...docSnap.data(),
              id: docSnap.id,
              lastMessageTimestamp: convertDate(
                (docSnap.data() as any).lastMessageTimestamp,
              ),
            }) as Conversation,
        ),
      );
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map(
          (docSnap) =>
            ({
              ...docSnap.data(),
              id: docSnap.id,
              timestamp: convertDate((docSnap.data() as any).timestamp),
            }) as Message,
        ),
      );
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      orderBy("timestamp", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(
        snapshot.docs.map(
          (docSnap) =>
            ({
              ...docSnap.data(),
              id: docSnap.id,
              timestamp: convertDate((docSnap.data() as any).timestamp),
            }) as Notification,
        ),
      );
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "calendar_events"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(
        (docSnap) => ({ ...docSnap.data(), id: docSnap.id }) as CalendarEvent,
      );
      setCalendarEvents(events);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "compensatory_entries"),
      orderBy("date", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map((docSnap) => {
        const data: any = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          date: convertDate(data.date),
          createdAt: convertDate(data.createdAt),
        } as CompensatoryEntry;
      });
      setCompensatoryEntries(entries);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "products"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          createdAt: convertDate(d.createdAt),
          updatedAt: d.updatedAt ? convertDate(d.updatedAt) : undefined,
        } as Product;
      });
      setProducts(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "customers"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          createdAt: convertDate(d.createdAt),
          updatedAt: d.updatedAt ? convertDate(d.updatedAt) : undefined,
        } as Customer;
      });
      setCustomers(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "orders"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          createdAt: convertDate(d.createdAt),
          updatedAt: d.updatedAt ? convertDate(d.updatedAt) : undefined,
        } as Order;
      });
      setOrders(data);
    });
    return () => unsubscribe();
  }, []);

  /* =======================
     AUTH / USER
     ======================= */

  const switchUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) setCurrentUser(user);
  };

  const updateCurrentUser = (updates: Partial<User>) => {
    setCurrentUser((prev) => ({ ...prev, ...updates }));
    setUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.id === currentUser.id ? { ...u, ...updates } : u,
      ),
    );
  };

  const login = () => setIsLoggedIn(true);
  const logout = () => setIsLoggedIn(false);

  /* =======================
     TASKS VISIBLES
     ======================= */

  const visibleTasks = useMemo(() => {
    if (currentUser.role === Role.ADMIN) {
      return allTasks;
    }
    return allTasks.filter(
      (task) =>
        task.createdBy === currentUser.id ||
        task.assignedToIds.includes(currentUser.id)
    );
  }, [allTasks, currentUser]);

  /* =======================
     TASK CRUD + REMINDERS
     ======================= */

  const addTask = async (task: Task) => {
    const normalizedTask: Task = {
      ...task,
      dueTime: normalizeHHMM(task.dueTime),
      createdBy: currentUser.id, // Set the creator
    };
    const scheduled = computeScheduledFields(normalizedTask);

    const taskData: any = {
      ...normalizedTask,
      description: normalizedTask.description || "",
      createdAt: Timestamp.fromDate(normalizedTask.createdAt),
      completedAt: normalizedTask.completedAt
        ? Timestamp.fromDate(normalizedTask.completedAt)
        : null,
      scheduledAt: scheduled.scheduledAtTs,
      notifiedAt: scheduled.notifiedAtTs,
    };

    await setDoc(doc(db, "tasks", normalizedTask.id), taskData);

    const promises = normalizedTask.assignedToIds
      .filter((id) => id !== currentUser.id)
      .filter((id) => {
        const u = users.find((user) => user.id === id);
        return u?.role !== Role.ADMIN;
      })
      .map((assignedUserId) =>
        addDoc(collection(db, "notifications"), {
          userId: assignedUserId,
          text: `Nueva tarea asignada: ${normalizedTask.title}`,
          read: false,
          timestamp: Timestamp.now(),
          relatedTaskId: normalizedTask.id,
        }),
      );

    await Promise.all(promises);

    try {
      await upsertReminderForTask(normalizedTask);
    } catch (err) {
      // Error handling
    }
  };

  const updateTask = async (task: Task) => {
    const prev = allTasks.find((t) => t.id === task.id);
    const normalizedTask: Task = {
      ...task,
      dueTime: normalizeHHMM(task.dueTime),
    };

    const dueTimeChanged =
      (prev?.dueTime || "") !== (normalizedTask.dueTime || "");
    const prevDate = prev?.createdAt
      ? new Date(prev.createdAt).toDateString()
      : "";
    const nextDate = new Date(normalizedTask.createdAt).toDateString();
    const dateChanged = prevDate !== nextDate;

    const taskData: any = {
      ...normalizedTask,
      createdAt: Timestamp.fromDate(normalizedTask.createdAt),
      completedAt: normalizedTask.completedAt
        ? Timestamp.fromDate(normalizedTask.completedAt)
        : null,
      comments: (normalizedTask.comments || []).map((c: any) => ({
        ...c,
        timestamp: Timestamp.fromDate(convertDate(c.timestamp)),
      })),
    };

    if (dueTimeChanged || dateChanged) {
      const scheduled = computeScheduledFields(normalizedTask);
      taskData.scheduledAt = scheduled.scheduledAtTs;
      taskData.notifiedAt = scheduled.notifiedAtTs;
    }

    await updateDoc(doc(db, "tasks", normalizedTask.id), taskData);

    try {
      await upsertReminderForTask(normalizedTask);
    } catch (err) {
      // Error handling
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await cancelPendingRemindersForTask(id);
    } catch (err) {
      // Error handling
    }
    await deleteDoc(doc(db, "tasks", id));
  };

  const toggleTaskStatus = async (id: string) => {
    const task = allTasks.find((t) => t.id === id);
    if (!task) return;

    const newStatus =
      task.status === TaskStatus.COMPLETED
        ? TaskStatus.PENDING
        : TaskStatus.COMPLETED;

    const completedAtTs =
      newStatus === TaskStatus.COMPLETED ? Timestamp.now() : null;

    await updateDoc(doc(db, "tasks", id), {
      status: newStatus,
      completedAt: completedAtTs,
    });

    const updatedTask: Task = {
      ...task,
      status: newStatus,
      completedAt: newStatus === TaskStatus.COMPLETED ? new Date() : undefined,
    };

    try {
      if (newStatus === TaskStatus.COMPLETED) {
        await cancelPendingRemindersForTask(id);
      } else {
        await upsertReminderForTask(updatedTask);
      }
    } catch (err) {
      // Error handling
    }

    if (newStatus === TaskStatus.COMPLETED) {
      const admins = users.filter((u) => u.role === Role.ADMIN);
      const promises = admins.map((admin) => {
        if (admin.id === currentUser.id) return null;
        return addDoc(collection(db, "notifications"), {
          userId: admin.id,
          text: `✅ ${currentUser.name} completó: ${task.title}`,
          read: false,
          timestamp: Timestamp.now(),
          relatedTaskId: task.id,
        });
      });
      await Promise.all(promises);
    }
  };

  /* =======================
     CATEGORY CRUD
     ======================= */

  const addCategory = async (cat: Category) => {
    await setDoc(doc(db, "categories", cat.id), cat);
  };

  const updateCategory = async (cat: Category) => {
    await updateDoc(doc(db, "categories", cat.id), { ...cat });
  };

  const deleteCategory = async (id: string) => {
    await deleteDoc(doc(db, "categories", id));
  };

  /* =======================
     TEMPLATES
     ======================= */

  const addTemplate = (template: RecurringTemplate) => {
    setTemplates((prev) => [...prev, template]);
  };

  /* =======================
     CALENDAR
     ======================= */

  const addCalendarEvent = async (event: CalendarEvent) => {
    await setDoc(doc(db, "calendar_events", event.id), event);
  };

  const updateCalendarEvent = async (event: CalendarEvent) => {
    await updateDoc(doc(db, "calendar_events", event.id), { ...event });
  };

  const deleteCalendarEvent = async (id: string) => {
    await deleteDoc(doc(db, "calendar_events", id));
  };

  /* =======================
     COMPENSATORY
     ======================= */

  const addCompensatoryEntry = async (entry: CompensatoryEntry) => {
    await setDoc(doc(db, "compensatory_entries", entry.id), {
      ...entry,
      date: Timestamp.fromDate(entry.date),
      createdAt: Timestamp.fromDate(entry.createdAt),
    });
  };

  const updateCompensatoryEntry = async (entry: CompensatoryEntry) => {
    await updateDoc(doc(db, "compensatory_entries", entry.id), {
      ...entry,
      date: Timestamp.fromDate(entry.date),
    });
  };

  const deleteCompensatoryEntry = async (id: string) => {
    await deleteDoc(doc(db, "compensatory_entries", id));
  };

  /* =======================
     PRODUCTS
     ======================= */
  const addProduct = async (product: Product) => {
    await setDoc(doc(db, "products", product.id), {
      ...product,
      createdAt: Timestamp.fromDate(convertDate(product.createdAt)),
      updatedAt: product.updatedAt ? Timestamp.fromDate(convertDate(product.updatedAt)) : null,
    });
  };

  const updateProduct = async (product: Product) => {
    await updateDoc(doc(db, "products", product.id), {
      ...product,
      createdAt: Timestamp.fromDate(convertDate(product.createdAt)),
      updatedAt: product.updatedAt ? Timestamp.fromDate(convertDate(product.updatedAt)) : null,
    });
  };

  const deleteProduct = async (id: string) => {
    await deleteDoc(doc(db, "products", id));
  };

  /* =======================
     CUSTOMERS
     ======================= */
  const addCustomer = async (customer: Customer) => {
    await setDoc(doc(db, "customers", customer.id), {
      ...customer,
      createdAt: Timestamp.fromDate(convertDate(customer.createdAt)),
      updatedAt: customer.updatedAt ? Timestamp.fromDate(convertDate(customer.updatedAt)) : null,
    });
  };

  const updateCustomer = async (customer: Customer) => {
    await updateDoc(doc(db, "customers", customer.id), {
      ...customer,
      createdAt: Timestamp.fromDate(convertDate(customer.createdAt)),
      updatedAt: customer.updatedAt ? Timestamp.fromDate(convertDate(customer.updatedAt)) : null,
    });
  };

  const deleteCustomer = async (id: string) => {
    await deleteDoc(doc(db, "customers", id));
  };

  /* =======================
     ORDERS
     ======================= */
  const addOrder = async (order: Order) => {
    await setDoc(doc(db, "orders", order.id), {
      ...order,
      createdAt: Timestamp.fromDate(convertDate(order.createdAt)),
      updatedAt: order.updatedAt ? Timestamp.fromDate(convertDate(order.updatedAt)) : null,
    });
  };

  const updateOrder = async (order: Order) => {
    await updateDoc(doc(db, "orders", order.id), {
      ...order,
      createdAt: Timestamp.fromDate(convertDate(order.createdAt)),
      updatedAt: order.updatedAt ? Timestamp.fromDate(convertDate(order.updatedAt)) : null,
    });
  };

  const deleteOrder = async (id: string) => {
    await deleteDoc(doc(db, "orders", id));
  };

  /* =======================
     CHAT
     ======================= */

  const startConversation = async (
    participantIds: string[],
  ): Promise<string> => {
    const sortedIds = [...participantIds, currentUser.id].sort();
    const existing = conversations.find((c) => {
      const cSorted = [...c.participants].sort();
      return JSON.stringify(cSorted) === JSON.stringify(sortedIds);
    });
    if (existing) return existing.id;

    const newConv: Conversation = {
      id: "",
      participants: sortedIds,
      type: sortedIds.length > 2 ? "GROUP" : "DIRECT",
      lastMessageTimestamp: new Date(),
      lastMessage: "Chat creado",
    };

    const { id, ...convData } = newConv;

    const ref = await addDoc(collection(db, "conversations"), {
      ...convData,
      lastMessageTimestamp: Timestamp.now(),
    });

    return ref.id;
  };

  const sendMessage = async (
    conversationId: string,
    content: string,
    type: MessageType,
  ) => {
    if (!conversationId) return;

    await addDoc(collection(db, "messages"), {
      userId: currentUser.id,
      conversationId,
      type,
      content,
      timestamp: Timestamp.now(),
      isEdited: false,
    });

    await updateDoc(doc(db, "conversations", conversationId), {
      lastMessage: type === MessageType.AUDIO ? "🎤 Audio" : content,
      lastMessageTimestamp: Timestamp.now(),
    });
  };

  const deleteMessage = async (messageId: string) => {
    if (!messageId) return;
    await deleteDoc(doc(db, "messages", messageId));
  };

  const editMessage = async (messageId: string, newContent: string) => {
    await updateDoc(doc(db, "messages", messageId), {
      content: newContent,
      isEdited: true,
    });
  };

  /* =======================
     NOTICES
     ======================= */

  const addNotice = async (notice: Notice) => {
    await setDoc(doc(db, "notices", notice.id), {
      ...notice,
      createdAt: Timestamp.fromDate(notice.createdAt),
    });
  };

  const updateNotice = async (notice: Notice) => {
    await updateDoc(doc(db, "notices", notice.id), {
      text: notice.text,
    });
  };

  const deleteNotice = async (id: string) => {
    await deleteDoc(doc(db, "notices", id));
  };

  /* =======================
     NOTIFICATIONS
     ======================= */

  const markNotificationAsRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  const markAllNotificationsAsRead = async () => {
    const pending = notifications.filter(
      (n) => n.userId === currentUser.id && !n.read,
    );
    await Promise.all(
      pending.map((n) =>
        updateDoc(doc(db, "notifications", n.id), { read: true }),
      ),
    );
  };

  /* =======================
     HELPERS
     ======================= */

  const getCategory = (id: string) => categories.find((c) => c.id === id);
  const getUser = (id: string) => users.find((u) => u.id === id);

  /* =======================
     PROVIDER VALUE
     ======================= */

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        switchUser,
        updateCurrentUser,

        tasks: visibleTasks,
        categories,
        templates,
        messages,
        conversations,
        notices,
        notifications,
        calendarEvents,
        compensatoryEntries,
        products,
        customers,
        orders,

        isLoggedIn,
        login,
        logout,

        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,

        addCategory,
        updateCategory,
        deleteCategory,

        addTemplate,

        addCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,

        addCompensatoryEntry,
        updateCompensatoryEntry,
        deleteCompensatoryEntry,

        addProduct,
        updateProduct,
        deleteProduct,

        addCustomer,
        updateCustomer,
        deleteCustomer,

        addOrder,
        updateOrder,
        deleteOrder,

        startConversation,
        sendMessage,
        deleteMessage,
        editMessage,

        addNotice,
        updateNotice,
        deleteNotice,

        markNotificationAsRead,
        markAllNotificationsAsRead,

        notificationSound,
        setNotificationSound,

        getCategory,
        getUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};