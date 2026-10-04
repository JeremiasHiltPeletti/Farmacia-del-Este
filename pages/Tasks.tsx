import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../context";
import { Icons, getCategoryIcon } from "../components/Icon.tsx";
import { Button } from "../components/Button.tsx";
import {
  TaskStatus,
  Priority,
  Role,
  Task,
  Attachment,
  Category,
} from "../types";
import { TaskDetailModal } from "../components/TaskDetailModal.tsx";
import { DateInput, TimeSelect } from "../components/CustomInputs.tsx";
import { USERS } from "../constants";
import { fileToBase64, generateUUID } from "../utils.ts";
import { RichTextEditor } from "../components/RichTextEditor.tsx";

interface FilterState {
  categoryId: string | null;
  assigneeId: string | null;
  status: TaskStatus | null;
  date: string | null;
}

export const TasksPage: React.FC = () => {
  const { tasks, categories, currentUser, addTask } = useApp();

  const isAdmin = currentUser.role === Role.ADMIN;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    categoryId: null,
    assigneeId: null,
    status: null,
    date: null,
  });

  const [newTaskData, setNewTaskData] = useState({
    title: "",
    description: "",
    date: (() => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    })(),
    time: "09:00",
    categoryId: "",
    priority: Priority.MEDIUM,
  });

  const [newAttachments, setNewAttachments] = useState<Attachment[]>([]);
  const assignableUsers = USERS;
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    assignees?: string;
  }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [tempFilters, setTempFilters] = useState<FilterState>({
    categoryId: null,
    assigneeId: null,
    status: null,
    date: null,
  });

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const getRank = (cat: Category) => {
        const id = cat.id;
        const name = cat.name.trim().toLowerCase();
        if (id === "c1" || name === "general") return 0;
        if (id === "c4" || name === "recetas") return 2;
        if (id === "c3" || name === "vencimientos") return 3;
        if (id === "c2" || name === "stock") return 4;
        return 1;
      };

      const rankA = getRank(a);
      const rankB = getRank(b);

      if (rankA !== rankB) return rankA - rankB;
      return b.id.localeCompare(a.id);
    });
  }, [categories]);

  useEffect(() => {
    if (showFilterModal) {
      setTempDate(new Date(selectedDate));
      setTempFilters({ ...filters });
    }
  }, [showFilterModal, selectedDate, filters]);

  useEffect(() => {
    if (showCreateModal || showFilterModal)
      document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showCreateModal, showFilterModal]);

  useEffect(() => {
    if (
      showCreateModal &&
      !newTaskData.categoryId &&
      sortedCategories.length > 0
    ) {
      setNewTaskData((prev) => ({
        ...prev,
        categoryId: sortedCategories[0].id,
      }));
    }
    if (showCreateModal) {
      setAssignedIds([]);
      setFormErrors({});
    }
  }, [showCreateModal, sortedCategories, newTaskData.categoryId]);

  const formatInputDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const parseInputDate = (value: string) => {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const formatLocalToday = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const processedFiles: Attachment[] = [];

      for (const file of files) {
        try {
          const base64 = await fileToBase64(file);
          processedFiles.push({
            id: generateUUID(),
            name: file.name,
            url: base64,
            type: file.type.startsWith("image/") ? "IMAGE" : "DOCUMENT",
            size: file.size,
          });
        } catch (err) {
          alert(`Error al subir ${file.name}: ${(err as Error).message}`);
        }
      }

      setNewAttachments((prev) => [...prev, ...processedFiles]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setNewAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleAssignee = (userId: string) => {
    setAssignedIds((prev) => {
      const newIds = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      if (newIds.length > 0)
        setFormErrors((prev2) => ({ ...prev2, assignees: undefined }));
      return newIds;
    });
  };

  const isAllSelected =
    assignableUsers.length > 0 &&
    assignableUsers.every((u) => assignedIds.includes(u.id));

  const toggleGeneral = () => {
    if (isAllSelected) {
      setAssignedIds([]);
    } else {
      setAssignedIds(assignableUsers.map((u) => u.id));
      setFormErrors((prev) => ({ ...prev, assignees: undefined }));
    }
  };

  const handleApplyFilters = () => {
    setSelectedDate(tempDate);
    setFilters({
      ...tempFilters,
      assigneeId: isAdmin ? tempFilters.assigneeId : null,
    });
    setShowFilterModal(false);
  };

  const handleClearTempFilters = () => {
    setTempFilters({
      categoryId: null,
      assigneeId: null,
      status: null,
      date: null,
    });
  };

  const handleCreateTask = () => {
    const errors: { title?: string; assignees?: string } = {};
    if (!newTaskData.title.trim()) errors.title = "El título es obligatorio";
    if (assignedIds.length === 0)
      errors.assignees = "Debes asignar al menos una persona";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    let createdAtDate = parseInputDate(newTaskData.date);
    const now = new Date();

    if (
      createdAtDate.getDate() === now.getDate() &&
      createdAtDate.getMonth() === now.getMonth() &&
      createdAtDate.getFullYear() === now.getFullYear()
    ) {
      createdAtDate = now;
    }

    const newTask: Task = {
      id: generateUUID(),
      title: newTaskData.title,
      description: newTaskData.description,
      categoryId: newTaskData.categoryId,
      priority: newTaskData.priority,
      status: TaskStatus.PENDING,
      dueTime: newTaskData.time,
      isRecurringInstance: false,
      assignedToIds: assignedIds,
      checklist: [],
      comments: [],
      attachments: newAttachments,
      createdAt: createdAtDate,
    };

    addTask(newTask);
    setShowCreateModal(false);
    setNewTaskData({
      title: "",
      description: "",
      date: formatLocalToday(),
      time: "09:00",
      categoryId: sortedCategories[0]?.id || "",
      priority: Priority.MEDIUM,
    });
    setNewAttachments([]);
    setAssignedIds([]);
    setFormErrors({});
    setSelectedDate(createdAtDate);
  };

  const dateStrip = useMemo(() => {
    const days = [];
    for (let i = -2; i <= 3; i++) {
      const d = new Date(selectedDate);
      d.setDate(selectedDate.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDate]);

  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const visibleTasks = useMemo(() => {
    if (isAdmin) return tasks;
    return tasks.filter((t) => t.assignedToIds.includes(currentUser.id));
  }, [tasks, isAdmin, currentUser.id]);

  const filteredTasks = useMemo(() => {
    return visibleTasks
      .filter((task) => {
        if (filters.date) {
          const tDate = new Date(task.createdAt);
          const selected = parseInputDate(filters.date);
          const isSameDay =
            tDate.getDate() === selected.getDate() &&
            tDate.getMonth() === selected.getMonth() &&
            tDate.getFullYear() === selected.getFullYear();
          if (!isSameDay) return false;
        }

        if (filters.categoryId && task.categoryId !== filters.categoryId)
          return false;

        if (
          isAdmin &&
          filters.assigneeId &&
          !task.assignedToIds.includes(filters.assigneeId)
        )
          return false;

        if (filters.status && task.status !== filters.status) return false;

        return true;
      })
      .sort((a, b) => {
        const aTime = a.dueTime || "";
        const bTime = b.dueTime || "";
        const timeCmp = aTime.localeCompare(bTime);
        if (timeCmp !== 0) return timeCmp;

        const aCreated = new Date(a.createdAt).getTime();
        const bCreated = new Date(b.createdAt).getTime();
        return bCreated - aCreated;
      });
  }, [visibleTasks, filters, isAdmin]);

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const handleDateStripSelect = (d: Date) => {
    setSelectedDate(d);
    const dateStr = formatInputDate(d);
    setFilters((prev) => ({ ...prev, date: dateStr }));
    if (showFilterModal) setTempFilters((prev) => ({ ...prev, date: dateStr }));
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col max-w-[1000px] mx-auto relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Mis Tareas
          </h1>
          <p className="text-gray-400 font-medium mt-1">
            {filters.date
              ? parseInputDate(filters.date).toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })
              : "Mostrando todas las fechas"}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowFilterModal(true)}
            className={`px-4 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border ${
              activeFiltersCount > 0
                ? "bg-teal-50 border-teal-200 text-teal-600"
                : "bg-white border-gray-200 text-gray-500 lg:hover:bg-gray-50"
            }`}
          >
            <Icons.Filter size={20} />
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="bg-teal-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {currentUser.role === Role.ADMIN && (
            <Button
              size="lg"
              onClick={() => setShowCreateModal(true)}
              className="flex-1 sm:flex-none"
              icon={<Icons.Plus size={20} />}
            >
              <span className="inline">Nueva</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center gap-2 mb-6 select-none">
        {dateStrip.map((d, i) => {
          const isActive = filters.date
            ? formatInputDate(d) === filters.date
            : false;
          const isToday = d.toDateString() === new Date().toDateString();

          return (
            <button
              key={i}
              onClick={() => handleDateStripSelect(d)}
              className={`flex flex-col items-center justify-center flex-1 h-20 rounded-[1.25rem] transition-all duration-300 border ${
                isActive
                  ? "bg-teal-500 text-white shadow-lg shadow-teal-200 lg:scale-105 border-teal-500 z-10"
                  : "bg-white text-gray-400 lg:hover:bg-gray-50 border-transparent lg:hover:border-gray-100"
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isActive ? "opacity-80" : "opacity-60"}`}
              >
                {isToday ? "Hoy" : weekDays[d.getDay()]}
              </span>
              <span
                className={`text-xl font-bold ${isActive ? "text-white" : "text-gray-800"}`}
              >
                {d.getDate()}
              </span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-white mt-1"></div>
              )}
            </button>
          );
        })}
      </div>

      {filters.date && (
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setFilters((prev) => ({ ...prev, date: null }))}
            className="text-xs font-bold text-gray-500 bg-white border border-gray-200 px-4 py-2 rounded-xl lg:hover:bg-gray-50 transition-colors"
          >
            Quitar filtro de fecha
          </button>
        </div>
      )}

      <div className="space-y-4 flex-1 overflow-y-auto pb-20 no-scrollbar">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center opacity-50">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
              <Icons.List size={40} />
            </div>
            <p className="text-gray-500 font-bold">
              No hay tareas con estos filtros
            </p>
            <p className="text-sm text-gray-400">
              Prueba cambiando los filtros
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-end px-2">
              <h3 className="text-gray-600 font-bold uppercase tracking-widest text-xs">
                {filteredTasks.length}{" "}
                {filteredTasks.length === 1 ? "Tarea" : "Tareas"} Encontradas
              </h3>
            </div>

            {filteredTasks.map((task) => {
              const cat = categories.find((c) => c.id === task.categoryId);
              const created = new Date(task.createdAt);

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="bg-white p-2 pr-6 rounded-[2rem] shadow-sm flex items-center gap-5 lg:hover:shadow-md transition-all group cursor-pointer border border-transparent lg:hover:border-teal-100 relative overflow-hidden"
                >
                  <div
                    className={`w-20 h-20 rounded-[1.5rem] flex flex-col items-center justify-center shrink-0 transition-colors ${
                      task.status === TaskStatus.COMPLETED
                        ? "bg-teal-50 text-teal-400"
                        : "bg-gray-50 text-gray-500 lg:group-hover:bg-teal-50 lg:group-hover:text-teal-500"
                    }`}
                  >
                    <Icons.Clock size={20} className="mb-1 opacity-70" />
                    <span className="text-xs font-bold">
                      {task.dueTime || "--:--"}
                    </span>
                  </div>

                  <div className="flex-1 py-2 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={`font-bold text-gray-800 text-lg truncate ${
                          task.status === TaskStatus.COMPLETED
                            ? "line-through text-gray-400"
                            : ""
                        }`}
                      >
                        {task.title}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {cat && (
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${cat.color}`}
                        >
                          {getCategoryIcon(cat.icon)}
                          {cat.name}
                        </span>
                      )}

                      {task.priority === Priority.HIGH && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-100 flex items-center gap-1">
                          <Icons.Alert size={10} /> Alta
                        </span>
                      )}
                      {task.priority === Priority.MEDIUM && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 flex items-center gap-1">
                          <Icons.Activity size={10} /> Media
                        </span>
                      )}
                      {task.priority === Priority.LOW && (
                        <span className="text-[10px] font-bold text-gray-500 bg-slate-50 px-2 py-1 rounded-lg border border-gray-100 flex items-center gap-1">
                          <Icons.ChevronDown size={10} /> Baja
                        </span>
                      )}

                      {task.attachments.length > 0 && (
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg flex items-center gap-1">
                          <Icons.Attach size={10} /> {task.attachments.length}
                        </span>
                      )}

                      {isAdmin && (
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                          {created.toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        task.status === TaskStatus.COMPLETED
                          ? "bg-teal-500 text-white shadow-lg shadow-teal-200"
                          : "bg-white border-2 border-gray-100 text-gray-300 lg:group-hover:border-teal-400 lg:group-hover:text-teal-500"
                      }`}
                    >
                      <Icons.Check size={24} />
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {showFilterModal && createPortal(
        <div className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-4xl bg-gray-50/95 rounded-[2rem] shadow-2xl border border-white/40 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]">
            <div className="flex justify-between items-center px-6 pt-6 pb-4 shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Filtros Avanzados
                </h2>
                <p className="text-xs font-bold text-gray-400 mt-1">
                  Ajusta los filtros y aplica
                </p>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-2 bg-white shadow-sm rounded-full text-gray-500 lg:hover:bg-gray-100"
              >
                <Icons.Close size={24} />
              </button>
            </div>

            <div className="px-6 pb-4 flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">
                    Fecha
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setTempFilters((f) => ({ ...f, date: null }))
                      }
                      className={`py-3 rounded-xl border font-bold text-sm transition-all ${
                        tempFilters.date === null
                          ? "bg-teal-50 border-teal-500 text-teal-700"
                          : "bg-white border-gray-100 text-gray-600"
                      }`}
                    >
                      Todas
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setTempFilters((f) => ({
                          ...f,
                          date: formatInputDate(tempDate),
                        }))
                      }
                      className={`py-3 rounded-xl border font-bold text-sm transition-all ${
                        tempFilters.date !== null
                          ? "bg-teal-50 border-teal-500 text-teal-700"
                          : "bg-white border-gray-100 text-gray-600"
                      }`}
                    >
                      Elegir
                    </button>
                  </div>

                  {tempFilters.date !== null && (
                    <div className="mt-4">
                      <DateInput
                        label="Ir a fecha"
                        value={formatInputDate(tempDate)}
                        onChange={(e) => {
                          if (e.target.value) {
                            const d = parseInputDate(e.target.value);
                            setTempDate(d);
                            setTempFilters((f) => ({
                              ...f,
                              date: formatInputDate(d),
                            }));
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">
                    Estado
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setTempFilters((f) => ({
                          ...f,
                          status:
                            f.status === TaskStatus.PENDING
                              ? null
                              : TaskStatus.PENDING,
                        }))
                      }
                      className={`py-3 rounded-xl border font-bold text-sm transition-all ${
                        tempFilters.status === TaskStatus.PENDING
                          ? "bg-teal-50 border-teal-500 text-teal-700"
                          : "bg-white border-gray-100 text-gray-600"
                      }`}
                    >
                      Pendientes
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTempFilters((f) => ({
                          ...f,
                          status:
                            f.status === TaskStatus.COMPLETED
                              ? null
                              : TaskStatus.COMPLETED,
                        }))
                      }
                      className={`py-3 rounded-xl border font-bold text-sm transition-all ${
                        tempFilters.status === TaskStatus.COMPLETED
                          ? "bg-teal-50 border-teal-500 text-teal-700"
                          : "bg-white border-gray-100 text-gray-600"
                      }`}
                    >
                      Completadas
                    </button>
                  </div>
                </div>

                <div>
                  <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">
                    Categoría
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sortedCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          setTempFilters((f) => ({
                            ...f,
                            categoryId: f.categoryId === cat.id ? null : cat.id,
                          }))
                        }
                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                          tempFilters.categoryId === cat.id
                            ? "bg-gray-800 text-white border-gray-800"
                            : "bg-white border-gray-200 text-gray-600"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {isAdmin && (
                  <div>
                    <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">
                      Asignado a
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {USERS.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() =>
                            setTempFilters((f) => ({
                              ...f,
                              assigneeId:
                                f.assigneeId === user.id ? null : user.id,
                            }))
                          }
                          className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                            tempFilters.assigneeId === user.id
                              ? "bg-gray-800 text-white border-gray-800"
                              : "bg-white border-gray-200 text-gray-600"
                          }`}
                        >
                          {user.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-white/60 backdrop-blur-sm shrink-0 flex gap-4">
              <Button
                variant="secondary"
                size="lg"
                onClick={handleClearTempFilters}
                className="flex-1"
              >
                Limpiar
              </Button>
              <Button
                size="lg"
                onClick={handleApplyFilters}
                className="flex-1"
              >
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl p-6 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
              <h2 className="text-2xl font-bold text-gray-800">Nueva Tarea</h2>
              <Button
                variant="icon"
                size="icon"
                onClick={() => setShowCreateModal(false)}
                icon={<Icons.Close size={24} />}
                className="rounded-full"
              />
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1 px-1">
              <div>
                <label htmlFor="field-s1jmw9" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Título <span className="text-red-500">*</span>
                </label>
                <input id="field-s1jmw9" name="field-s1jmw9"
                  type="text"
                  value={newTaskData.title}
                  onChange={(e) => {
                    setNewTaskData({ ...newTaskData, title: e.target.value });
                    if (e.target.value.trim())
                      setFormErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  placeholder="Ej: Reponer estantería B"
                  className={`w-full bg-gray-50 border rounded-xl px-4 py-3 font-bold text-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
                    formErrors.title
                      ? "border-red-500 ring-1 ring-red-500"
                      : "border-gray-200 focus:border-transparent"
                  }`}
                  autoFocus
                />
                {formErrors.title && (
                  <p className="text-red-500 text-[10px] font-bold mt-1 flex items-center gap-1">
                    <Icons.Alert size={10} /> {formErrors.title}
                  </p>
                )}
              </div>

              <div>
                <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Notas Extra
                </div>
                <RichTextEditor
                  value={newTaskData.description}
                  onChange={(html) =>
                    setNewTaskData({ ...newTaskData, description: html })
                  }
                  placeholder="Instrucciones adicionales, detalles importantes (puedes usar listas, negrita, etc)..."
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-[1.4]">
                  <DateInput
                    label="Fecha"
                    value={newTaskData.date}
                    onChange={(e) =>
                      setNewTaskData({ ...newTaskData, date: e.target.value })
                    }
                  />
                </div>
                <div className="flex-1">
                  <TimeSelect
                    label="Hora"
                    value={newTaskData.time}
                    onChange={(e) =>
                      setNewTaskData({ ...newTaskData, time: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Prioridad
                  </div>
                </div>
                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
                  {[Priority.LOW, Priority.MEDIUM, Priority.HIGH].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() =>
                        setNewTaskData({ ...newTaskData, priority: p })
                      }
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize ${
                        newTaskData.priority === p
                          ? p === Priority.HIGH
                            ? "bg-red-500 text-white shadow"
                            : p === Priority.MEDIUM
                              ? "bg-amber-500 text-white shadow"
                              : "bg-gray-500 text-white shadow"
                          : "text-gray-400 lg:hover:text-gray-600 lg:hover:bg-gray-50"
                      }`}
                    >
                      {p === Priority.LOW
                        ? "Baja"
                        : p === Priority.MEDIUM
                          ? "Media"
                          : "Alta"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Categoría
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {sortedCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() =>
                        setNewTaskData({ ...newTaskData, categoryId: cat.id })
                      }
                      className={`p-3 rounded-xl border flex items-center gap-2 transition-all text-left ${
                        newTaskData.categoryId === cat.id
                          ? `${cat.color} border-current shadow-md ring-1 ring-offset-2 ring-transparent`
                          : "bg-white border-gray-100 lg:hover:border-gray-200 text-gray-500"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          newTaskData.categoryId === cat.id
                            ? "bg-white/30"
                            : "bg-gray-100"
                        }`}
                      >
                        {getCategoryIcon(cat.icon)}
                      </div>
                      <span className="font-bold text-xs truncate">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Asignar a <span className="text-red-500">*</span>
                </div>
                <div
                  className={`p-2 rounded-xl transition-all ${formErrors.assignees ? "bg-red-50 border border-red-200" : ""}`}
                >
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={toggleGeneral}
                      className={`px-3 py-2 rounded-lg border flex items-center gap-2 transition-all lg:active:scale-95 shrink-0 ${
                        isAllSelected
                          ? "bg-teal-500 text-white border-teal-500 shadow-md shadow-teal-200"
                          : "bg-white border-gray-200 text-gray-500 lg:hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isAllSelected
                            ? "bg-white/20 text-white"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        <Icons.Users size={12} />
                      </div>
                      <span className="font-bold text-xs">General</span>
                      {isAllSelected && (
                        <Icons.Check size={12} className="ml-1" />
                      )}
                    </button>

                    {assignableUsers.map((user) => {
                      const isSelected = assignedIds.includes(user.id);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => toggleAssignee(user.id)}
                          className={`px-3 py-2 rounded-lg border flex items-center gap-2 transition-all lg:active:scale-95 shrink-0 ${
                            isSelected
                              ? "bg-teal-50 border-teal-200 text-teal-700 shadow-sm"
                              : "bg-white border-gray-200 text-gray-500 lg:hover:border-gray-300"
                          }`}
                        >
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-5 h-5 rounded-full border border-gray-100"
                          />
                          <span className="font-bold text-xs">{user.name}</span>
                          {isSelected && (
                            <Icons.Check
                              size={12}
                              className="text-teal-500 ml-1"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formErrors.assignees && (
                  <p className="text-red-500 text-[10px] font-bold mt-1 flex items-center gap-1 ml-2">
                    <Icons.Alert size={10} /> {formErrors.assignees}
                  </p>
                )}
              </div>

              <div>
                <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Adjuntar Archivos
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-400 lg:hover:border-teal-400 lg:hover:text-teal-500 lg:hover:bg-teal-50 transition-all gap-2"
                    >
                      <Icons.Attach size={24} />
                      <span className="text-xs font-bold">
                        Subir foto o documento
                      </span>
                    </button>

                    <input id="field-s5z920" name="field-s5z920"
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                      multiple
                    />
                  </div>

                  {newAttachments.length > 0 && (
                    <div className="space-y-2">
                      {newAttachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100"
                        >
                          {att.type === "IMAGE" ? (
                            <img
                              src={att.url}
                              alt="preview"
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-gray-200 text-gray-400">
                              <Icons.Doc size={20} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-700 truncate">
                              {att.name}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="p-2 lg:hover:text-red-500 text-gray-400"
                          >
                            <Icons.Close size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 mt-2 border-t border-gray-100 flex gap-3">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                size="lg"
                onClick={handleCreateTask}
                className="flex-1"
              >
                Crear Tarea
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
};