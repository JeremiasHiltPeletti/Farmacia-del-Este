import React, { useState, useMemo, useEffect, useRef } from "react";
import { useApp } from "../context";
import { Icons, getCategoryIcon } from "../components/Icon.tsx";
import { Button } from "../components/Button.tsx";
import { Task, Priority, TaskStatus, Role, Attachment, EventType, CalendarEvent, Category,} from "../types";
import { TaskDetailModal } from "../components/TaskDetailModal.tsx";
import { USERS } from "../constants";
import { DateInput, TimeSelect } from "../components/CustomInputs.tsx";
import { fileToBase64, generateUUID } from "../utils.ts";
import { RichTextEditor } from "../components/RichTextEditor.tsx";

const formatDateKey = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const CalendarPage: React.FC = () => {
  const {
    tasks,
    addTask,
    categories,
    currentUser,
    calendarEvents,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    getUser,
  } = useApp();
  const isAdmin = currentUser.role === Role.ADMIN;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("09:00");
  const [newTaskDate, setNewTaskDate] = useState<string>("");
  const [newTaskCategoryId, setNewTaskCategoryId] = useState<string>("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>(
    Priority.MEDIUM,
  );
  const [newAttachments, setNewAttachments] = useState<Attachment[]>([]);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    assignees?: string;
  }>({});
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState<EventType>(EventType.NOTE);
  const [eventIsPrivate, setEventIsPrivate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectionDate, setSelectionDate] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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
    if (sortedCategories.length > 0 && !newTaskCategoryId) {
      setNewTaskCategoryId(sortedCategories[0].id);
    }
  }, [sortedCategories, newTaskCategoryId]);

  useEffect(() => {
    if (showTaskModal || showEventModal || selectionDate) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showTaskModal, showEventModal, selectionDate]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const blanks = Array(firstDay).fill(null);
    const days = Array.from(
      { length: daysInMonth },
      (_, i) => new Date(year, month, i + 1),
    );
    return [...blanks, ...days];
  }, [currentDate]);

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => setCurrentDate(new Date());

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
        setFormErrors((prev) => ({ ...prev, assignees: undefined }));
      return newIds;
    });
  };

  const toggleGeneral = () => {
    if (USERS.every((u) => assignedIds.includes(u.id))) {
      setAssignedIds([]);
    } else {
      setAssignedIds(USERS.map((u) => u.id));
      setFormErrors((prev) => ({ ...prev, assignees: undefined }));
    }
  };

  const openTaskModal = (date?: Date) => {
    const d = date || new Date();
    setNewTaskDate(formatDateKey(d));
    setNewTaskTime("09:00");
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewAttachments([]);
    setNewTaskPriority(Priority.MEDIUM);
    setAssignedIds([]);
    setFormErrors({});
    if (sortedCategories.length > 0)
      setNewTaskCategoryId(sortedCategories[0].id);
    setShowTaskModal(true);
  };

  const openEventModal = (date?: Date, eventToEdit?: CalendarEvent) => {
    setShowDeleteConfirm(false);

    if (eventToEdit) {
      setEditingEventId(eventToEdit.id);
      setEventTitle(eventToEdit.title);
      setEventDate(eventToEdit.date);
      setEventType(eventToEdit.type);
      setEventIsPrivate(eventToEdit.isPrivate || false);
    } else {
      setEditingEventId(null);
      const d = date || new Date();
      setEventDate(formatDateKey(d));
      setEventTitle("");
      setEventType(EventType.NOTE);
      setEventIsPrivate(false);
    }
    setShowEventModal(true);
  };

  const handleCreateTask = () => {
    const errors: { title?: string; assignees?: string } = {};
    if (!newTaskTitle.trim()) errors.title = "El título es obligatorio";
    if (assignedIds.length === 0)
      errors.assignees = "Debes asignar al menos una persona";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (!newTaskCategoryId) return;

    const [y, m, d] = newTaskDate.split("-").map(Number);
    let finalDate = new Date(y, m - 1, d);
    const now = new Date();
    if (finalDate.toDateString() === now.toDateString()) {
      finalDate = now;
    }

    const newTask: Task = {
      id: generateUUID(),
      title: newTaskTitle,
      description: newTaskDesc,
      categoryId: newTaskCategoryId,
      priority: newTaskPriority,
      status: TaskStatus.PENDING,
      dueTime: newTaskTime,
      isRecurringInstance: false,
      assignedToIds: assignedIds,
      checklist: [],
      comments: [],
      attachments: newAttachments,
      createdAt: finalDate,
    };

    addTask(newTask);
    setShowTaskModal(false);
  };

  const handleSaveEvent = () => {
    if (!eventTitle.trim()) return;

    if (editingEventId) {
      const updatedEvent: CalendarEvent = {
        id: editingEventId,
        date: eventDate,
        title: eventTitle,
        type: eventType,
        isPrivate: isAdmin ? eventIsPrivate : false,
        createdBy:
          calendarEvents.find((e) => e.id === editingEventId)?.createdBy ||
          currentUser.id,
      };
      updateCalendarEvent(updatedEvent);
    } else {
      const newEvent: CalendarEvent = {
        id: generateUUID(),
        date: eventDate,
        title: eventTitle,
        type: eventType,
        isPrivate: isAdmin ? eventIsPrivate : false,
        createdBy: currentUser.id,
      };
      addCalendarEvent(newEvent);
    }

    setShowEventModal(false);
  };

  const confirmDeleteEvent = () => {
    if (editingEventId) {
      deleteCalendarEvent(editingEventId);
      setShowEventModal(false);
    }
  };

  const visibleEvents = useMemo(() => {
    if (currentUser.role === Role.ADMIN) return calendarEvents;
    return calendarEvents.filter((e) => !e.isPrivate);
  }, [calendarEvents, currentUser.role]);

  const getTasksForDate = (date: Date) => {
    return tasks.filter((t) => {
      const taskDate = new Date(t.createdAt);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getEventsForDate = (date: Date) => {
    const dateKey = formatDateKey(date);
    return visibleEvents.filter((e) => e.date === dateKey);
  };

  const weekDayNames = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

  const getEventColor = (evt: CalendarEvent) => {
    const privacyStyle = evt.isPrivate ? "border-dashed" : "";

    switch (evt.type) {
      case EventType.HOLIDAY:
        return `bg-rose-100 text-rose-700 border-rose-200 ${privacyStyle}`;
      case EventType.NOTE:
        return `bg-violet-100 text-violet-700 border-violet-200 ${privacyStyle}`;
      default:
        return `bg-sky-100 text-sky-700 border-sky-200 ${privacyStyle}`;
    }
  };

  const getEventPlaceholder = () => {
    switch (eventType) {
      case EventType.HOLIDAY:
        return "Ej: Feriado Nacional, Cierre por Inventario...";
      default:
        return "Escribe una nota o recordatorio...";
    }
  };

  const handleCellClick = (date: Date) => {
    if (!isAdmin) return;
    setSelectionDate(date);
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col max-w-[1600px] mx-auto relative">
      {}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Calendario
          </h1>
          <p className="text-gray-400 font-medium mt-1">
            Planificación mensual
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => openEventModal()}
              className="flex-1 sm:flex-none bg-violet-100 text-violet-700 border border-violet-200 px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 lg:hover:bg-violet-200 transition-colors"
            >
              <Icons.Calendar size={20} />{" "}
              <span className="inline">Nota / Feriado</span>
            </button>
            <button
              onClick={() => openTaskModal()}
              className="flex-1 sm:flex-none bg-teal-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 lg:hover:bg-teal-600 shadow-lg shadow-teal-200 transition-all lg:active:scale-95"
            >
              <Icons.Plus size={20} /> <span className="inline">Nueva Tarea</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between p-6 border-b border-gray-100 gap-4 shrink-0 bg-white z-10">
          <div className="flex items-center gap-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-baseline gap-2 capitalize">
              {currentDate.toLocaleDateString("es-ES", { month: "long" })}
              <span className="text-gray-300 font-normal text-xl">
                {currentDate.getFullYear()}
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-50 rounded-xl border border-gray-100 p-1">
              <button
                onClick={handlePrev}
                className="p-2 lg:hover:bg-white lg:hover:shadow-sm rounded-lg transition-all text-gray-500"
              >
                <Icons.ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNext}
                className="p-2 lg:hover:bg-white lg:hover:shadow-sm rounded-lg transition-all text-gray-500"
              >
                <Icons.ChevronRight size={18} />
              </button>
            </div>
            <button
              onClick={handleToday}
              className="px-4 py-2 bg-teal-50 text-teal-600 text-sm font-bold rounded-xl lg:hover:bg-teal-100 transition-colors"
            >
              Hoy
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50/30">
          <div className="min-w-[800px] flex flex-col">
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
              {weekDayNames.map((d) => (
                <div
                  key={d}
                  className="py-3 text-center text-xs font-bold text-gray-400 tracking-wider"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)]">
              {monthData.map((date, i) => {
                if (!date)
                  return (
                    <div
                      key={i}
                      className="bg-gray-50/50 border-b border-r border-gray-100"
                    ></div>
                  );

                const isToday =
                  new Date().toDateString() === date.toDateString();
                const dateTasks = getTasksForDate(date);
                const dateEvents = getEventsForDate(date);

                return (
                  <div
                    key={i}
                    onClick={() => handleCellClick(date)}
                    className={`border-b border-r border-gray-100 p-2 min-h-[80px] sm:min-h-[120px] relative lg:hover:bg-white transition-colors group ${isAdmin ? 'cursor-pointer' : ''} flex flex-col gap-1`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                          isToday
                            ? "bg-teal-500 text-white shadow-md shadow-teal-200"
                            : "text-gray-700 lg:group-hover:bg-gray-100"
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      {isAdmin && (
                        <div className="hidden md:flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEventModal(date);
                            }}
                            className="p-1.5 bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 hover:shadow-sm transition-colors"
                            title="Agregar Nota / Feriado"
                          >
                            <Icons.Calendar size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openTaskModal(date);
                            }}
                            className="p-1.5 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 hover:shadow-sm transition-colors"
                            title="Agregar Tarea"
                          >
                            <Icons.Plus size={18} />
                          </button>
                        </div>
                      )}
                    </div>

                    {dateEvents.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isAdmin) openEventModal(undefined, evt);
                        }}
                        className={`px-2 py-1.5 rounded-md border text-[11px] font-bold flex justify-between items-center group/evt shadow-sm mb-1 ${isAdmin ? 'cursor-pointer lg:hover:opacity-80' : ''} transition-opacity ${getEventColor(evt)}`}
                        title={evt.title}
                      >
                        <span className="truncate leading-tight flex items-center gap-1">
                          {evt.isPrivate && <Icons.Lock size={10} />}{" "}
                          {evt.title}
                        </span>
                      </div>
                    ))}

                    <div className="flex-col gap-1 flex">
                      {dateTasks.map((task) => {
                        const cat = categories.find(
                          (c) => c.id === task.categoryId,
                        );
                        return (
                          <div
                            key={task.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTaskId(task.id);
                            }}
                            className="bg-white border-l-2 p-1.5 shadow-sm rounded-r-md cursor-pointer lg:hover:shadow-md transition-all border-gray-200 flex items-center gap-1"
                            style={{
                              borderLeftColor: cat?.color
                                ? undefined
                                : "#cbd5e1",
                            }}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold text-gray-700 truncate">
                                {task.title}
                              </p>
                              {task.assignedToIds.length > 0 && (
                                <p className="text-[8px] text-gray-400 truncate mt-0.5">
                                  {task.assignedToIds
                                    .map((id) => getUser(id)?.name || "Usuario")
                                    .join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selectionDate && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none"
          onClick={() => setSelectionDate(null)}
        >
          <div
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 flex flex-col gap-4 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-2">
              <h3 className="font-bold text-gray-800 text-lg capitalize">
                {selectionDate.toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>
              <p className="text-gray-400 text-sm">¿Qué deseas agregar?</p>
            </div>

            <button
              onClick={() => {
                openTaskModal(selectionDate);
                setSelectionDate(null);
              }}
              className="w-full py-4 bg-teal-500 text-white rounded-xl font-bold shadow-lg shadow-teal-200 lg:hover:bg-teal-600 transition-all lg:active:scale-95 flex items-center justify-center gap-3"
            >
              <Icons.Plus size={24} /> Nueva Tarea
            </button>

            <button
              onClick={() => {
                openEventModal(selectionDate);
                setSelectionDate(null);
              }}
              className="w-full py-4 bg-violet-100 text-violet-700 rounded-xl font-bold border border-violet-200 lg:hover:bg-violet-200 transition-all lg:active:scale-95 flex items-center justify-center gap-3"
            >
              <Icons.Calendar size={24} /> Nota / Feriado
            </button>

            <button
              onClick={() => setSelectionDate(null)}
              className="w-full py-3 text-gray-400 font-bold mt-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {showTaskModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4 shrink-0">
              <h2 className="text-2xl font-bold text-gray-800">Nueva Tarea</h2>
              <Button
                variant="icon"
                size="icon"
                onClick={() => setShowTaskModal(false)}
                icon={<Icons.Close size={24} />}
                className="rounded-full"
              />
            </div>
            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1 px-1">
              <div>
                <label htmlFor="field-lldyem" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Título <span className="text-red-500">*</span>
                </label>
                <input id="field-lldyem" name="field-lldyem"
                  autoFocus
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => {
                    setNewTaskTitle(e.target.value);
                    if (e.target.value.trim())
                      setFormErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  placeholder="Ej: Revisar stock antibióticos"
                  className={`w-full bg-gray-50 border rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
                    formErrors.title
                      ? "border-red-500 ring-1 ring-red-500"
                      : "border-gray-200"
                  }`}
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
                  value={newTaskDesc}
                  onChange={setNewTaskDesc}
                  placeholder="Instrucciones adicionales, detalles importantes (puedes usar listas, negrita, etc)..."
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-[1.4]">
                  <DateInput
                    label="Fecha"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <TimeSelect
                    label="Hora"
                    value={newTaskTime}
                    onChange={(e) => setNewTaskTime(e.target.value)}
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
                      onClick={() => setNewTaskPriority(p)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize ${
                        newTaskPriority === p
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
                      onClick={() => setNewTaskCategoryId(cat.id)}
                      className={`p-3 rounded-xl border flex items-center gap-2 transition-all text-left ${
                        newTaskCategoryId === cat.id
                          ? `${cat.color} border-current shadow-md ring-1 ring-offset-2 ring-transparent`
                          : "bg-white border-gray-100 lg:hover:border-gray-200 text-gray-500"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${newTaskCategoryId === cat.id ? "bg-white/30" : "bg-gray-100"}`}
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
                <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Asignar a <span className="text-red-500">*</span>
                </div>
                <div
                  className={`p-2 rounded-xl transition-all ${formErrors.assignees ? "bg-red-50 border border-red-200" : ""}`}
                >
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={toggleGeneral}
                      className={`px-3 py-2 rounded-lg border flex items-center gap-2 transition-all ${USERS.every((u) => assignedIds.includes(u.id)) ? "bg-teal-500 text-white" : "bg-white text-gray-500"}`}
                    >
                      <Icons.Users size={12} />{" "}
                      <span className="font-bold text-xs">General</span>
                    </button>
                    {USERS.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => toggleAssignee(user.id)}
                        className={`px-3 py-2 rounded-lg border flex items-center gap-2 transition-all ${assignedIds.includes(user.id) ? "bg-teal-50 border-teal-200 text-teal-700" : "bg-white text-gray-500"}`}
                      >
                        <img
                          src={user.avatar}
                          className="w-5 h-5 rounded-full"
                        />{" "}
                        <span className="font-bold text-xs">{user.name}</span>
                      </button>
                    ))}
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
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-400 lg:hover:border-teal-400 lg:hover:text-teal-500 lg:hover:bg-teal-50 transition-all gap-2"
                    >
                      <Icons.Attach size={24} />
                      <span className="text-xs font-bold">
                        Subir foto o documento
                      </span>
                    </button>
                    <input id="field-e2ekfd" name="field-e2ekfd"
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
            <div className="pt-6 mt-6 border-t border-gray-100 shrink-0 flex justify-end gap-4">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setShowTaskModal(false)}
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
        </div>
      )}

      {showEventModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-6 md:p-8 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] relative overflow-hidden">
            {showDeleteConfirm && (
              <div
                className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <div
                  className="bg-white rounded-[2rem] shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 flex flex-col items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 shadow-sm">
                    <Icons.Delete size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">
                    ¿Eliminar Nota?
                  </h2>
                  <p className="text-gray-500 mb-6 max-w-xs text-center text-sm">
                    Esta acción es permanente y no se puede deshacer.
                  </p>

                  <div className="flex gap-3 w-full">
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="danger"
                      size="lg"
                      onClick={confirmDeleteEvent}
                      className="flex-1"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4 shrink-0">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingEventId ? "Editar Anotación" : "Nueva Anotación"}
              </h2>
              <Button
                variant="icon"
                size="icon"
                onClick={() => setShowEventModal(false)}
                icon={<Icons.Close size={24} />}
                className="rounded-full"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
              <div>
                <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Fecha
                </div>
                <DateInput
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div>
                <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Tipo
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEventType(EventType.NOTE)}
                    className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all ${eventType === EventType.NOTE ? "bg-violet-100 text-violet-700 border-violet-300 ring-1 ring-violet-300" : "bg-white text-gray-500 border-gray-200"}`}
                  >
                    Nota
                  </button>
                  <button
                    onClick={() => setEventType(EventType.HOLIDAY)}
                    className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all ${eventType === EventType.HOLIDAY ? "bg-rose-100 text-rose-700 border-rose-300 ring-1 ring-rose-300" : "bg-white text-gray-500 border-gray-200"}`}
                  >
                    Feriado / Cierre
                  </button>
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div
                    className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${eventIsPrivate ? "bg-teal-500" : "bg-gray-300"}`}
                    onClick={() => setEventIsPrivate(!eventIsPrivate)}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${eventIsPrivate ? "translate-x-4" : "translate-x-0"}`}
                    ></div>
                  </div>
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setEventIsPrivate(!eventIsPrivate)}
                  >
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      {eventIsPrivate ? (
                        <Icons.Lock size={14} />
                      ) : (
                        <Icons.Users size={14} />
                      )}
                      {eventIsPrivate
                        ? "Privado (Solo Admin)"
                        : "Visible para Todos"}
                    </p>
                    <p className="text-[10px] text-gray-400 leading-tight">
                      {eventIsPrivate
                        ? "Solo tú podrás ver esta nota."
                        : "Todos los empleados verán esto en el calendario."}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <div className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Título / Texto <span className="text-red-500">*</span>
                </div>
                <textarea
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder={getEventPlaceholder()}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 h-24 resize-none"
                />
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowEventModal(false)}
                className="flex-1 py-3 text-gray-500 font-bold lg:hover:bg-gray-50 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEvent}
                className="flex-1 py-3 bg-violet-600 text-white font-bold rounded-xl lg:hover:bg-violet-700 shadow-lg shadow-violet-200"
              >
                {editingEventId ? "Guardar Cambios" : "Guardar"}
              </button>
              {editingEventId && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-3 bg-red-50 text-red-500 lg:hover:bg-red-100 rounded-xl transition-colors"
                  title="Eliminar"
                >
                  <Icons.Delete size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
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
