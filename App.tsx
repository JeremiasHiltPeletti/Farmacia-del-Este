
import React, { useState, useRef, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context';
import { Sidebar } from './components/Sidebar.tsx';
import { Login } from './pages/Login.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { TasksPage } from './pages/Tasks.tsx';
import { CalendarPage } from './pages/CalendarPage.tsx';
import { CategoriesPage } from './pages/CategoriesPage.tsx';
import { NoticesPage } from './pages/NoticesPage.tsx';
import { CompensatoryPage } from './pages/CompensatoryPage.tsx'; 
import { ProductsPage } from './pages/ProductsPage.tsx';
import { CustomersPage } from './pages/CustomersPage.tsx';
import { OrdersPage } from './pages/OrdersPage.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { Icons } from './components/Icon.tsx';
import { ChatBubble } from './components/ChatBubble.tsx';
import { TaskDetailModal } from './components/TaskDetailModal.tsx';
import { TaskStatus } from './types';
import { playAlertSound, unlockAudioContext, sendSystemNotification, getAudioContext } from './utils.ts';
import { requestFcmToken } from './firebase.ts';
import { logoBase64 } from './components/logoBase64.ts';

// --- TOAST NOTIFICATION COMPONENT ---
interface ToastProps {
    title: string;
    body?: string;
    onView: () => void;
    onClose: () => void;
}

const ReminderToast: React.FC<ToastProps> = ({ title, body, onView, onClose }) => {
    return (
        <div className="fixed bottom-20 right-4 sm:bottom-4 z-[9999] bg-white rounded-2xl shadow-2xl border-l-4 border-teal-500 p-4 max-w-[90vw] sm:max-w-sm animate-in slide-in-from-right duration-500 flex items-start gap-4 mr-0 sm:mr-4 cursor-pointer" onClick={onView}>
             <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 animate-pulse">
                <Icons.Clock size={20} />
             </div>
             <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-800 text-sm mb-1">{title}</h4>
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{body || 'Revisa tus tareas pendientes'}</p>
                <div className="flex gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onView(); }}
                        className="text-[10px] font-bold bg-teal-500 text-white px-3 py-1.5 rounded-lg hover:bg-teal-600 transition-colors"
                    >
                        Ver Tarea
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="text-[10px] font-bold text-gray-400 px-3 py-1.5 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
             </div>
             <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-gray-300 hover:text-gray-500">
                <Icons.Close size={14} />
             </button>
        </div>
    );
};


// --- MAIN APP LAYOUT (With Logic) ---
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Detection State: Desktop vs Mobile
  const [isDesktopDevice, setIsDesktopDevice] = useState(() => {
      if (typeof window !== 'undefined') {
          return window.innerWidth >= 1024;
      }
      return false;
  });
  
  // Reminder State
  const [reminderTask, setReminderTask] = useState<{id: string, title: string, body: string} | null>(null);
  const [showTaskDetailId, setShowTaskDetailId] = useState<string | null>(null);

  const { notifications, currentUser, markAllNotificationsAsRead, markNotificationAsRead, tasks, notificationSound } = useApp();
  const notifRef = useRef<HTMLDivElement>(null);
  
  // ROBUST NOTIFICATION TRACKING
  const appMountTime = useRef<Date>(new Date());
  const lastProcessedNotifId = useRef<string | null>(null);

  // SCHEDULED TASKS TRACKING (To avoid ringing multiple times for same minute)
  const alertedTasksRef = useRef<Set<string>>(new Set());

  // --- AUDIO UNLOCKER ---
  useEffect(() => {
    const handleFirstClick = () => {
        unlockAudioContext();
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
        
        window.removeEventListener('click', handleFirstClick);
        window.removeEventListener('keydown', handleFirstClick);
        window.removeEventListener('touchstart', handleFirstClick);
    };

    window.addEventListener('click', handleFirstClick);
    window.addEventListener('keydown', handleFirstClick);
    window.addEventListener('touchstart', handleFirstClick);
    return () => {
        window.removeEventListener('click', handleFirstClick);
        window.removeEventListener('keydown', handleFirstClick);
        window.removeEventListener('touchstart', handleFirstClick);
    };
  }, []);

  // Request Notifications (optional for native push)
  useEffect(() => {
     requestFcmToken().catch(() => {});
  }, []);

  // Screen resize listener
  useEffect(() => {
    const handleResize = () => setIsDesktopDevice(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 1. REAL-TIME NOTIFICATION WATCHER (New Incoming DB Notifications) ---
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const myNotifs = notifications
        .filter(n => n.userId === currentUser.id)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (myNotifs.length === 0) return;

    const latest = myNotifs[0];

    if (latest.id === lastProcessedNotifId.current) return;
    lastProcessedNotifId.current = latest.id;

    // Is this notification NEWER than when we opened the app?
    const isNewArrival = latest.timestamp.getTime() > appMountTime.current.getTime();

    if (isNewArrival && !latest.read) {
        playAlertSound(notificationSound);
        setReminderTask({
            id: latest.relatedTaskId || '',
            title: 'Nueva Notificación',
            body: latest.text
        });

        sendSystemNotification('Nueva Tarea', latest.text, () => {
            if (latest.relatedTaskId) setShowTaskDetailId(latest.relatedTaskId);
        });
    }
  }, [notifications, currentUser.id, notificationSound]);


  // --- 2. SCHEDULED TASK WATCHER (Alarm Clock Logic) ---
  useEffect(() => {
    const checkScheduledTasks = () => {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();

        tasks.forEach(task => {
            // 1. Basic Filters
            if (!task.assignedToIds.includes(currentUser.id)) return;
            if (task.status === TaskStatus.COMPLETED) return;
            if (!task.dueTime) return;

            // 2. Date Comparison (Ignore Time, Check Calendar Day)
            const taskDate = new Date(task.createdAt);
            const isSameDay = taskDate.toDateString() === now.toDateString();

            if (!isSameDay) return;

            // 3. Time Comparison (Parse Integers to be Safe)
            const [taskH, taskM] = task.dueTime.split(':').map(Number);
            
            // Check match (Current time == Task time)
            if (taskH === currentHours && taskM === currentMinutes) {
                
                // 4. Dedup (Don't ring twice for same task)
                if (!alertedTasksRef.current.has(task.id)) {
                    // Force Audio Context Wake Up
                    const ctx = getAudioContext();
                    if(ctx && ctx.state === 'suspended') ctx.resume();

                    playAlertSound(notificationSound);
                    
                    setReminderTask({
                        id: task.id,
                        title: '⏰ Recordatorio',
                        body: `Es hora de realizar: ${task.title}`
                    });
                    
                    sendSystemNotification('⏰ Recordatorio', `Es hora de realizar: ${task.title}`, () => {
                         setShowTaskDetailId(task.id);
                    });

                    // Mark as alerted
                    alertedTasksRef.current.add(task.id);
                }
            }
        });
    };

    // Check every 5 seconds to ensure we catch the minute change quickly
    const intervalId = setInterval(checkScheduledTasks, 5000);
    
    // Initial check on mount
    checkScheduledTasks();

    return () => clearInterval(intervalId);
  }, [tasks, currentUser.id, notificationSound]);


  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const myNotifications = notifications.filter(n => n.userId === currentUser.id).sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
  const unreadCount = myNotifications.filter(n => !n.read).length;

  return (
    <div className="flex h-[100dvh] bg-[#f8fafc] overflow-hidden font-sans">
      
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onOpenSettings={() => setShowSettings(true)} 
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative transition-all duration-300 h-full">
        
        {/* Header */}
        <header className="shrink-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-50 md:border-none pt-[env(safe-area-inset-top)] transition-all">
           <div className="max-w-[1200px] mx-auto h-16 flex items-center justify-between px-4 sm:px-8">
              
              <div className="flex items-center gap-3 lg:hidden">
                 <button 
                   onClick={() => setIsSidebarOpen(true)}
                   className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                 >
                    <Icons.Menu size={24} />
                 </button>
                 <div className="flex items-center gap-2">
                   <img src={logoBase64} alt="Logo" className="w-8 h-8 object-contain" />
                   <div className="font-bold text-gray-800 flex flex-col leading-none">
                      <span className="text-base tracking-tight">Farmacia</span>
                      <span className="text-[9px] text-gray-400 uppercase tracking-widest">Del Este</span>
                   </div>
                 </div>
              </div>

              <div className="hidden lg:block"></div> 

              <div className="flex items-center gap-3">
                  {isDesktopDevice && (
                    <div className="relative" ref={notifRef}>
                        <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all shadow-sm relative ${
                            showNotifications 
                            ? 'bg-teal-500 text-white border-teal-500' 
                            : 'bg-white border-gray-100 text-gray-400 hover:text-gray-600 hover:border-gray-200'
                        }`}
                        >
                        <Icons.Bell size={18} />
                        {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                                {unreadCount}
                            </div>
                        )}
                        </button>

                        {showNotifications && (
                        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-in fade-in zoom-in-95 duration-200 z-50">
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-50">
                                <h3 className="font-bold text-gray-800">Notificaciones</h3>
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {myNotifications.length === 0 ? (
                                    <div className="text-center py-6">
                                    <Icons.Bell className="mx-auto text-gray-200 mb-2" size={24} />
                                    <p className="text-xs text-gray-400">Sin notificaciones nuevas</p>
                                    </div>
                                ) : (
                                    myNotifications.map(notif => (
                                    <div 
                                        key={notif.id} 
                                        onClick={() => {
                                            markNotificationAsRead(notif.id);
                                            if(notif.relatedTaskId) {
                                                setShowTaskDetailId(notif.relatedTaskId);
                                                setShowNotifications(false);
                                            }
                                        }}
                                        className={`p-3 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${
                                        notif.read ? 'bg-white opacity-60 hover:opacity-100' : 'bg-teal-50 border border-teal-100'
                                        }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.read ? 'bg-gray-300' : 'bg-green-500'}`}></div>
                                        <div>
                                            <p className={`text-xs leading-snug ${notif.read ? 'text-gray-500 font-medium' : 'text-gray-800 font-bold'}`}>
                                                {notif.text}
                                            </p>
                                            <span className="text-[10px] text-gray-400 mt-1 block">
                                                {notif.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    </div>
                                    ))
                                )}
                            </div>

                            {myNotifications.length > 0 && (
                                <div className="pt-3 mt-3 border-t border-gray-50">
                                    <button 
                                        onClick={markAllNotificationsAsRead}
                                        disabled={unreadCount === 0}
                                        className={`w-full text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-95 ${
                                            unreadCount > 0 
                                            ? 'text-teal-600 hover:text-teal-700 hover:bg-teal-50' 
                                            : 'text-gray-400 cursor-default opacity-50 bg-gray-50'
                                        }`}
                                    >
                                        <Icons.CheckSimple size={14} />
                                        Marcar todas como leídas
                                    </button>
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                  )}
              </div>
           </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth overscroll-contain pb-[calc(env(safe-area-inset-bottom)+20px)]">
          <div className="max-w-[1200px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <ChatBubble />
      
      {reminderTask && (
        <ReminderToast 
            title={reminderTask.title} 
            body={reminderTask.body}
            onClose={() => setReminderTask(null)}
            onView={() => {
                if(reminderTask.id) setShowTaskDetailId(reminderTask.id);
                setReminderTask(null);
            }}
        />
      )}

      {showTaskDetailId && (
          <TaskDetailModal 
            taskId={showTaskDetailId} 
            onClose={() => setShowTaskDetailId(null)} 
          />
      )}
      
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isLoggedIn } = useApp();

  if (!isLoggedIn) {
    return <Login />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/notices" element={<NoticesPage />} />
        <Route path="/compensatory" element={<CompensatoryPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
      </Routes>
    </AppLayout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
};

export default App;
