
import React, { useState, useMemo } from 'react';
import { useApp } from '../context';
import { Icons } from '../components/Icon.tsx';
import { TaskStatus, Priority, Role } from '../types';
import { TaskDetailModal } from '../components/TaskDetailModal.tsx';
import { USERS } from '../constants';

export const Dashboard: React.FC = () => {
  const { tasks, categories, notices, currentUser, getUser } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // --- Real-time Calculations (Only shown to Admin) ---
  
  // 1. Compliance (Efectividad General)
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
  const compliance = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  // 2. Completed Last 7 Days (Metrics)
  const completed7DaysCount = useMemo(() => {
     const sevenDaysAgo = new Date();
     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
     return completedTasks.filter(t => t.completedAt && new Date(t.completedAt) > sevenDaysAgo).length;
  }, [completedTasks]);

  // 3. Average Time (Smart Display: Minutes or Hours)
  const avgTimeData = useMemo(() => {
     let totalMs = 0;
     let count = 0;
     
     completedTasks.forEach(t => {
        if (t.completedAt) {
           const end = new Date(t.completedAt).getTime();
           const start = new Date(t.createdAt).getTime();
           const duration = end - start;
           
           // Ensure positive duration and realistic data
           if (duration >= 0) {
              totalMs += duration;
              count++;
           }
        }
     });

     if (count === 0) return { value: '0', unit: 'min' };

     const avgMs = totalMs / count;
     const avgMinutes = avgMs / (1000 * 60);

     if (avgMinutes < 60) {
         // If averaged minutes is less than 1 but greater than 0, show "< 1" or just "1"
         // To avoid confusion, let's round up to 1 if it's small but exists
         const displayVal = avgMinutes > 0 && avgMinutes < 1 ? '< 1' : Math.round(avgMinutes).toString();
         
         return { 
             value: displayVal, 
             unit: 'min' 
         };
     } else {
         // Show in hours if 60 mins or more
         return { 
             value: (avgMinutes / 60).toFixed(1), 
             unit: 'hs' 
         };
     }
  }, [completedTasks]);

  // 4. Employee Stats
  const employeeStats = useMemo(() => {
     return USERS.map(user => {
        const userTasks = tasks.filter(t => t.assignedToIds.includes(user.id));
        const completed = userTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
        const total = userTasks.length;
        return {
           user,
           total,
           completed
        };
     });
  }, [tasks]);

  const busiestEmployee = [...employeeStats].sort((a,b) => b.total - a.total)[0];
  const mostEfficientEmployee = [...employeeStats].sort((a,b) => b.completed - a.completed)[0];

  // --- Filter Today's Agenda ---
  const todayTasks = tasks.filter(t => {
     if (!t.dueTime) return false;
     
     // Only show pending tasks, or tasks completed today
     if (t.status === TaskStatus.COMPLETED) {
        if (!t.completedAt) return false;
        const completedDate = new Date(t.completedAt);
        const today = new Date();
        return completedDate.getDate() === today.getDate() && 
               completedDate.getMonth() === today.getMonth() && 
               completedDate.getFullYear() === today.getFullYear();
     }
     
     return true;
  }).sort((a,b) => (a.dueTime || '').localeCompare(b.dueTime || ''));


  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm flex justify-between items-center relative overflow-hidden">
         <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Hola, {currentUser.name} 👋</h1>
            <p className="text-gray-500 text-sm sm:text-base">Aquí está el resumen de operaciones para hoy.</p>
         </div>
         
         <div className="hidden md:flex relative z-10 items-center">
            <div className="text-right px-6 border-l-2 border-teal-50">
               <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Fecha Actual</div>
               <div className="font-bold text-gray-800 text-2xl capitalize tracking-tight">
                 {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
               </div>
            </div>
         </div>
         
         {/* Abstract Decoration */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      </div>

      {/* KPI Cards Row - SOLO VISIBLE PARA ADMIN */}
      {currentUser.role === Role.ADMIN && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Green Card - Compliance */}
            <div className="col-span-1 bg-gradient-to-br from-teal-400 to-cyan-500 text-white p-6 rounded-[2rem] shadow-xl shadow-teal-100 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
                        <Icons.Chart className="text-white w-6 h-6" />
                    </div>
                    <span className="text-teal-50 font-medium text-sm bg-white/10 px-3 py-1 rounded-full">General</span>
                </div>
                <div>
                    <div className="text-5xl font-bold mb-2 tracking-tight">{compliance}%</div>
                    <span className="text-teal-100 font-medium opacity-90">Efectividad Global</span>
                </div>
            </div>
            {/* Circles */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 border-8 border-white/10 rounded-full"></div>
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
            </div>

            {/* Stats Grid */}
            <div className="col-span-2 grid grid-cols-2 gap-4 sm:gap-6">
                {/* Completed Tasks Count */}
                <div className="bg-white p-4 sm:p-6 rounded-[2rem] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  {/* Header: Stack on Mobile (flex-col-reverse), Row on Desktop */}
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-start mb-2 sm:mb-4 gap-2">
                      <span className="text-gray-400 text-xs sm:text-sm font-bold uppercase tracking-wider leading-tight">Completadas</span>
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                          <Icons.Check size={16} />
                      </div>
                  </div>
                  <div className="flex items-end gap-3">
                      <span className="text-4xl font-bold text-gray-800">{completed7DaysCount}</span>
                      <span className="text-xs text-emerald-500 font-bold bg-emerald-50 px-2 py-1 rounded-lg mb-1 whitespace-nowrap">7 días</span>
                  </div>
                </div>

                {/* Average Time */}
                <div className="bg-white p-4 sm:p-6 rounded-[2rem] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  {/* Header: Stack on Mobile (flex-col-reverse), Row on Desktop */}
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-start mb-2 sm:mb-4 gap-2">
                      <span className="text-gray-400 text-xs sm:text-sm font-bold uppercase tracking-wider leading-tight">Tiempo Promedio</span>
                      <div className="w-8 h-8 rounded-full bg-cyan-50 text-cyan-500 flex items-center justify-center shrink-0">
                          <Icons.Clock size={16} />
                      </div>
                  </div>
                  <div className="flex items-end gap-3">
                      <span className="text-4xl font-bold text-gray-800">{avgTimeData.value}</span>
                      <span className="text-sm text-gray-400 font-bold mb-1">{avgTimeData.unit}</span>
                  </div>
                </div>
                
                {/* Employee Performance Widget */}
                <div className="col-span-2 bg-white p-6 rounded-[2rem] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    
                    {/* Most Tasks (Load) */}
                    <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center relative">
                        <Icons.Briefcase size={24} />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Mayor Carga</h3>
                        {busiestEmployee && busiestEmployee.total > 0 ? (
                            <div className="flex items-center gap-2">
                            <img src={busiestEmployee.user.avatar} className="w-6 h-6 rounded-full border border-gray-100" />
                            <span className="font-bold text-gray-800">{busiestEmployee.user.name}</span>
                            <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{busiestEmployee.total}</span>
                            </div>
                        ) : (
                            <span className="text-sm text-gray-400 italic">--</span>
                        )}
                    </div>
                    </div>

                    {/* Vertical Divider (Hidden on mobile) */}
                    <div className="hidden sm:block w-px h-10 bg-gray-100"></div>

                    {/* Most Efficient (Completed) */}
                    <div className="flex items-center gap-4 flex-1 sm:justify-end">
                    <div className="text-right order-2 sm:order-1">
                        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Más Eficiente</h3>
                        {mostEfficientEmployee && mostEfficientEmployee.completed > 0 ? (
                            <div className="flex items-center gap-2 sm:justify-end">
                            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{mostEfficientEmployee.completed}</span>
                            <span className="font-bold text-gray-800">{mostEfficientEmployee.user.name}</span>
                            <img src={mostEfficientEmployee.user.avatar} className="w-6 h-6 rounded-full border border-gray-100" />
                            </div>
                        ) : (
                            <span className="text-sm text-gray-400 italic">--</span>
                        )}
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center relative order-1 sm:order-2">
                        <Icons.Clean size={24} />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white"></div>
                    </div>
                    </div>

                </div>
            </div>
        </div>
      )}

      {/* Timeline with "Bubble" style - Visible to everyone (filtered by context) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Timeline Column */}
         <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
               <div className="w-2 h-8 rounded-full bg-teal-500"></div>
               Agenda de Hoy
            </h2>

            <div className="space-y-6 relative">
               {/* Connecting Line */}
               <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-gray-200 border-l border-dashed border-gray-300"></div>

               {todayTasks.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-200">
                     <p className="text-gray-400">Sin tareas pendientes para hoy</p>
                  </div>
               ) : (
                  todayTasks.map((task, i) => {
                     const cat = categories.find(c => c.id === task.categoryId);
                     return (
                        <div key={task.id} className="relative z-10 flex gap-6 group">
                           {/* Time Bubble */}
                           <div className="w-16 flex flex-col items-center">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shadow-sm transition-all group-hover:scale-110 ${
                                 task.priority === Priority.HIGH 
                                 ? 'bg-red-50 text-red-500 border border-red-100' 
                                 : 'bg-white text-teal-600 border border-teal-100'
                              }`}>
                                 {task.dueTime?.split(':')[0]}<span className="text-[10px] mx-[1px] relative -top-[1px]">:</span>{task.dueTime?.split(':')[1]}
                              </div>
                           </div>

                           {/* Task Bubble Card */}
                           <div 
                              onClick={() => setSelectedTaskId(task.id)}
                              className="flex-1"
                            >
                              <div className={`bg-white p-4 sm:p-5 rounded-3xl shadow-[0_4px_20px_-12px_rgba(0,0,0,0.1)] border border-gray-50 hover:border-teal-200 hover:shadow-lg transition-all cursor-pointer flex items-center justify-between group-hover:-translate-y-1 ${task.status === TaskStatus.COMPLETED ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                 <div>
                                    <h4 className={`font-bold text-gray-800 mb-1 ${task.status === TaskStatus.COMPLETED ? 'line-through' : ''}`}>{task.title}</h4>
                                    <div className="flex items-center gap-2 mt-2">
                                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat?.color?.replace('text-', 'text-opacity-80 text-') || 'bg-gray-100 text-gray-500'}`}>
                                          {cat?.name}
                                       </span>
                                       {task.priority === Priority.HIGH && (
                                          <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                                             <Icons.Alert size={10} /> Urgente
                                          </span>
                                       )}
                                       {task.assignedToIds.length > 0 && (
                                          <span className="text-[10px] font-bold text-blue-500 flex items-center gap-1 border border-blue-100 bg-blue-50 px-2 py-0.5 rounded-full">
                                             <Icons.User size={10} /> 
                                             {task.assignedToIds.map(id => getUser(id)?.name || 'Usuario').join(', ')}
                                          </span>
                                       )}
                                       {task.status === TaskStatus.COMPLETED && (
                                           <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 border border-emerald-100 bg-emerald-50 px-2 py-0.5 rounded-full">
                                               <Icons.Check size={10} /> Hecha
                                           </span>
                                       )}
                                    </div>
                                 </div>
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${task.status === TaskStatus.COMPLETED ? 'bg-emerald-100 text-emerald-500' : 'bg-gray-50 text-gray-300 group-hover:bg-teal-50 group-hover:text-teal-500'}`}>
                                    {task.status === TaskStatus.COMPLETED ? <Icons.Check size={20} /> : <Icons.ChevronRight size={20} />}
                                 </div>
                              </div>
                           </div>
                        </div>
                     )
                  })
               )}
            </div>
         </div>

         {/* Side Widgets - Avisos - Visible to everyone */}
         <div className="space-y-6">
            <div className="bg-teal-900 text-white p-6 rounded-[2rem] relative overflow-hidden">
               <div className="relative z-10">
                  <h3 className="font-bold text-lg mb-1 text-white">Avisos Farmacia</h3>
                  <p className="text-teal-200 text-xs mb-4">Boletín interno</p>
                  
                  <div className="space-y-3">
                     {notices.length === 0 ? (
                        <p className="text-sm text-teal-300 italic opacity-80">No hay avisos recientes.</p>
                     ) : (
                        notices.map(notice => (
                           <div key={notice.id} className="bg-white/10 p-3 rounded-xl backdrop-blur-sm text-sm border border-white/5">
                              <p className="opacity-90 leading-snug">{notice.text}</p>
                           </div>
                        ))
                     )}
                  </div>
               </div>
               <Icons.Leaf className="absolute -bottom-8 -right-8 text-white/5 w-40 h-40" />
            </div>
         </div>
      </div>
      
      {/* Modal */}
      {selectedTaskId && (
         <TaskDetailModal 
            taskId={selectedTaskId} 
            onClose={() => setSelectedTaskId(null)} 
         />
      )}
    </div>
  );
};
