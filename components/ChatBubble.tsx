import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { useApp } from "../context";
import { Icons } from "./Icon";
import { MessageType } from "../types";
import { fileToBase64 } from "../utils";

type ViewState = "LIST" | "ROOM";

let sharedAudioContext: AudioContext | null = null;
function getSharedAudioContext() {
  if (typeof window === "undefined") return null;
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioContext;
}

function useFixedAudio(src: string) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setReady(false);

    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {}

    const onMeta = () => {
      const d = audio.duration;
      if (d && d !== Infinity && !isNaN(d)) setDuration(d);
      if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) setReady(true);
    };
    const onLoadedData = () => {
      const d = audio.duration;
      if (d && d !== Infinity && !isNaN(d)) setDuration(d);
      setReady(true);
    };
    const onCan = () => {
      const d = audio.duration;
      if (d && d !== Infinity && !isNaN(d)) setDuration(d);
      setReady(true);
    };
    const onTime = () => setProgress(audio.currentTime || 0);
    const onEnd = () => {
      setIsPlaying(false);
      setProgress(0);
      try {
        audio.currentTime = 0;
      } catch {}
    };
    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onErr = () => {
      setReady(false);
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("loadeddata", onLoadedData);
    audio.addEventListener("canplay", onCan);
    audio.addEventListener("canplaythrough", onCan);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("error", onErr);

    try {
      audio.src = src;
    } catch {}

    audio.load();

    const t = window.setTimeout(() => {
      if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) setReady(true);
    }, 800);

    return () => {
      window.clearTimeout(t);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("loadeddata", onLoadedData);
      audio.removeEventListener("canplay", onCan);
      audio.removeEventListener("canplaythrough", onCan);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("error", onErr);
      try {
        audio.pause();
      } catch {}
    };
  }, [src]);

  const togglePlay = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const audio = audioRef.current;
      if (!audio || !src) return;

      if (!audio.src) {
        try {
          audio.src = src;
          audio.load();
        } catch {}
      }

      if (!audio.paused && !audio.ended) {
        try {
          audio.pause();
        } catch {}
        setIsPlaying(false);
        return;
      }

      try {
        const p = audio.play();
        if (p && typeof (p as any).then === "function") await p;
        setReady(true);
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
        setReady(false);
      }
    },
    [src]
  );

  const fmt = useCallback((t: number) => {
    if (!t || isNaN(t) || !isFinite(t)) return "0:00";
    return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  }, []);

  return { audioRef, isPlaying, progress, duration, ready, togglePlay, fmt };
}

const Spinner = memo(({ size }: { size: number }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
));

interface AudioPlayerProps {
  src: string;
  isPreview?: boolean;
  onDelete?: () => void;
  onSend?: () => void;
  disabled?: boolean;
}

const AudioPlayer = memo(({ src, isPreview = false, onDelete, onSend, disabled = false }: AudioPlayerProps) => {
  const { audioRef, isPlaying, progress, duration, ready, togglePlay, fmt } = useFixedAudio(src);

  if (isPreview) {
    return (
      <div className="flex-1 flex items-center gap-3 bg-white rounded-full px-2 py-1.5 shadow-sm min-w-0 animate-in fade-in duration-200">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete?.();
          }}
          className="p-2 text-red-500 lg:hover:bg-red-50 rounded-full transition-colors shrink-0"
        >
          <Icons.Delete size={20} />
        </button>
        <div className="flex-1 flex items-center justify-center gap-3 bg-gray-100 rounded-full px-4 py-2">
          <button
            type="button"
            onClick={togglePlay}
            className={`text-gray-600 flex-shrink-0 transition-colors ${disabled ? "opacity-40 cursor-not-allowed" : "lg:hover:text-teal-600"}`}
            disabled={disabled}
          >
            {!ready ? <Spinner size={20} /> : isPlaying ? <Icons.Pause size={20} className="fill-current" /> : <Icons.Play size={20} className="fill-current" />}
          </button>
          <div className="text-sm font-bold text-gray-600 min-w-[35px] text-center">{fmt(isPlaying ? progress : duration)}</div>
          <audio ref={audioRef} preload="auto" playsInline className="hidden" />
        </div>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSend?.();
          }}
          className="p-2 bg-[#008069] text-white rounded-full shadow-sm lg:hover:scale-105 transition-transform shrink-0"
        >
          <Icons.Send size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-[160px] py-1">
      <button
        type="button"
        onClick={disabled ? undefined : togglePlay}
        disabled={disabled}
        className={`w-9 h-9 flex items-center justify-center bg-gray-200 rounded-full text-gray-500 transition-colors shrink-0 ${!disabled ? "lg:hover:bg-gray-300" : "opacity-50"}`}
      >
        {!ready ? <Spinner size={14} /> : isPlaying ? <Icons.Pause size={14} className="fill-current" /> : <Icons.Play size={14} className="fill-current" />}
      </button>
      <div className="flex-1 flex flex-col justify-center gap-1.5 pt-1">
        <div className="h-1 bg-gray-300/50 rounded-full w-full overflow-hidden relative">
          <div className="absolute top-0 left-0 h-full bg-gray-500 transition-all duration-100" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
        </div>
        <div className="text-[10px] text-gray-400 font-medium">{fmt(duration)}</div>
      </div>
      <audio ref={audioRef} preload="auto" playsInline className="hidden" />
    </div>
  );
});

interface MsgItemProps {
  msg: any;
  isMe: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  showContextMenu: boolean;
  menuOpenDirection: "up" | "down";
  isGroup: boolean;
  senderName?: string;
  onPressStart(id: string): void;
  onPressEnd(): void;
  onPointerUp(e: React.PointerEvent, id: string, type: MessageType): void;
  onClick(id: string, type: MessageType): void;
  onContextMenu(e: React.MouseEvent, id: string): void;
  onEditSetup(e: React.MouseEvent, id: string, content: string): void;
  onEnterSelection(e: React.MouseEvent, id: string): void;
  onDeleteSingle(id: string): void;
  onCloseMenu(): void;
  onImagePreview(src: string): void;
}

const MessageItem = memo(
  ({
    msg,
    isMe,
    isSelected,
    isSelectionMode,
    showContextMenu,
    menuOpenDirection,
    isGroup,
    senderName,
    onPressStart,
    onPressEnd,
    onPointerUp,
    onClick,
    onContextMenu,
    onEditSetup,
    onEnterSelection,
    onDeleteSingle,
    onCloseMenu,
    onImagePreview,
  }: MsgItemProps) => (
    <div
      className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1 relative select-none`}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") onPressStart(msg.id);
      }}
      onPointerUp={(e) => onPointerUp(e, msg.id, msg.type)}
      onPointerMove={onPressEnd}
      onPointerCancel={onPressEnd}
      onClick={() => onClick(msg.id, msg.type)}
      style={{ touchAction: "manipulation" }}
    >
      <div
        className={`relative max-w-[85%] rounded-lg text-sm shadow-sm flex flex-col cursor-pointer border-2
        ${isMe ? "bg-[#d9fdd3] rounded-tr-none" : "bg-white rounded-tl-none"}
        ${isSelected ? "bg-teal-50 border-teal-500/50" : "border-transparent"}
        ${msg.type === MessageType.IMAGE ? "p-1" : "p-1.5 px-2"}`}
        onContextMenu={(e) => onContextMenu(e, msg.id)}
      >
        {showContextMenu && !isSelectionMode && (
          <div
            className={`absolute right-0 bg-white rounded-lg shadow-xl border border-gray-100 py-1 w-36 z-50 overflow-hidden animate-in fade-in duration-150
          ${menuOpenDirection === "up" ? "bottom-full mb-1 origin-bottom-right" : "top-6 origin-top-right"}`}
          >
            {msg.type === MessageType.TEXT && isMe && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEditSetup(e as any, msg.id, msg.content);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-2"
              >
                <Icons.Edit size={14} /> Editar
              </button>
            )}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEnterSelection(e as any, msg.id);
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-teal-600 text-xs font-bold flex items-center gap-2"
            >
              <Icons.CheckSimple size={14} /> Seleccionar
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteSingle(msg.id);
              }}
              className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-500 text-xs font-bold flex items-center gap-2"
            >
              <Icons.Delete size={14} /> Eliminar
            </button>
            <div className="border-t my-1" />
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCloseMenu();
              }}
              className="w-full text-center py-1 text-xs text-gray-400"
            >
              Cancelar
            </button>
          </div>
        )}

        {isGroup && !isMe && <p className="text-[10px] font-bold text-orange-600 px-1 mb-0.5">{senderName}</p>}

        {msg.type === MessageType.TEXT && <p className="text-gray-800 whitespace-pre-wrap leading-snug px-1 pt-1 pb-1">{msg.content}</p>}
        {msg.type === MessageType.AUDIO && <AudioPlayer src={msg.content} disabled={isSelectionMode} />}
        {msg.type === MessageType.IMAGE && (
          <div className="relative">
            <img
              src={msg.content}
              alt="Shared"
              className="rounded-lg max-w-[200px] max-h-[300px] object-cover"
              loading="lazy"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none", touchAction: "manipulation" }}
              onClick={(e) => {
                if (isSelectionMode) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                onImagePreview(msg.content);
              }}
            />
            {isSelectionMode && <div className="absolute inset-0 bg-transparent" />}
          </div>
        )}
        {msg.type === MessageType.DOCUMENT && (
          <a
            href={isSelectionMode ? undefined : msg.content}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-gray-100 p-2 rounded-lg max-w-[220px] lg:hover:bg-gray-200 transition-colors"
            onClick={(e) => isSelectionMode && e.preventDefault()}
          >
            <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center text-red-500 shrink-0 border">
              <Icons.Doc size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-700 truncate">Documento Adjunto</p>
              <p className="text-[10px] text-gray-400">Toca para abrir</p>
            </div>
          </a>
        )}
        <div
          className={`flex items-center justify-end gap-1 px-1 ${msg.type === MessageType.IMAGE ? "absolute bottom-2 right-2 bg-black/40 px-1.5 py-0.5 rounded-full backdrop-blur-sm" : ""}`}
        >
          {msg.isEdited && <span className={`text-[9px] italic ${msg.type === MessageType.IMAGE ? "text-white/80" : "text-gray-400"}`}>editado</span>}
          <span className={`text-[10px] ${msg.type === MessageType.IMAGE ? "text-white" : "text-gray-400"}`}>
            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {isMe && <Icons.CheckSimple size={12} className={msg.type === MessageType.IMAGE ? "text-white" : "text-blue-500"} />}
        </div>
      </div>
    </div>
  )
);

interface MsgListProps {
  messages: any[];
  currentUserId: string;
  selectedMsgIds: Set<string>;
  isSelectionMode: boolean;
  contextMenuMsgId: string | null;
  menuOpenDirection: "up" | "down";
  activeConversation: any;
  getUser(id: string): any;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onPressStart(id: string): void;
  onPressEnd(): void;
  onPointerUp(e: React.PointerEvent, id: string, type: MessageType): void;
  onClick(id: string, type: MessageType): void;
  onContextMenu(e: React.MouseEvent, id: string): void;
  onEditSetup(e: React.MouseEvent, id: string, content: string): void;
  onEnterSelection(e: React.MouseEvent, id: string): void;
  onDeleteSingle(id: string): void;
  onCloseMenu(): void;
  onImagePreview(src: string): void;
}

const MessageList = memo((p: MsgListProps) => (
  <div className="relative z-10 p-4 pb-2 flex flex-col gap-2 min-h-full justify-end">
    {p.messages.map((msg) => (
      <MessageItem
        key={msg.id}
        msg={msg}
        isMe={msg.userId === p.currentUserId}
        isSelected={p.selectedMsgIds.has(msg.id)}
        isSelectionMode={p.isSelectionMode}
        showContextMenu={p.contextMenuMsgId === msg.id}
        menuOpenDirection={p.menuOpenDirection}
        isGroup={p.activeConversation?.type === "GROUP"}
        senderName={p.getUser(msg.userId)?.name}
        onPressStart={p.onPressStart}
        onPressEnd={p.onPressEnd}
        onPointerUp={p.onPointerUp}
        onClick={p.onClick}
        onContextMenu={p.onContextMenu}
        onEditSetup={p.onEditSetup}
        onEnterSelection={p.onEnterSelection}
        onDeleteSingle={p.onDeleteSingle}
        onCloseMenu={p.onCloseMenu}
        onImagePreview={p.onImagePreview}
      />
    ))}
    <div ref={p.messagesEndRef} />
  </div>
));

type WavRecorder = {
  start: () => Promise<void>;
  stop: () => Promise<string>;
  cancel: () => void;
  isRunning: () => boolean;
};

function createWavRecorder(getStream: () => Promise<MediaStream>): WavRecorder {
  let ac: AudioContext | null = null;
  let src: MediaStreamAudioSourceNode | null = null;
  let proc: ScriptProcessorNode | null = null;
  let running = false;
  let starting = false;
  let buffers: Float32Array[] = [];
  let sampleRate = 44100;

  const reset = () => {
    buffers = [];
  };

  const close = async () => {
    try { proc?.disconnect(); } catch {}
    try { src?.disconnect(); } catch {}
    // DO NOT close the shared AudioContext
    proc = null;
    src = null;
    ac = null;
  };

  const encodeWav = (chunks: Float32Array[], sr: number) => {
    let len = 0;
    for (const c of chunks) len += c.length;

    const pcm16 = new Int16Array(len);
    let offset = 0;
    for (const c of chunks) {
      for (let i = 0; i < c.length; i++) {
        let s = c[i];
        if (s > 1) s = 1;
        else if (s < -1) s = -1;
        pcm16[offset++] = s < 0 ? (s * 0x8000) | 0 : (s * 0x7fff) | 0;
      }
    }

    const wavBytes = new Uint8Array(44 + pcm16.byteLength);
    const dv = new DataView(wavBytes.buffer);

    const writeStr = (p: number, s: string) => {
      for (let i = 0; i < s.length; i++) dv.setUint8(p + i, s.charCodeAt(i));
    };

    writeStr(0, "RIFF");
    dv.setUint32(4, 36 + pcm16.byteLength, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true);
    dv.setUint16(22, 1, true);
    dv.setUint32(24, sr, true);
    dv.setUint32(28, sr * 2, true);
    dv.setUint16(32, 2, true);
    dv.setUint16(34, 16, true);
    writeStr(36, "data");
    dv.setUint32(40, pcm16.byteLength, true);

    wavBytes.set(new Uint8Array(pcm16.buffer), 44);

    let bin = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < wavBytes.length; i += chunkSize) {
      bin += String.fromCharCode(...wavBytes.subarray(i, i + chunkSize));
    }
    const b64 = btoa(bin);
    return `data:audio/wav;base64,${b64}`;
  };

  return {
    start: async () => {
      if (running || starting) return;
      starting = true;

      try {
        ac = getSharedAudioContext();
        if (ac && ac.state !== "running") {
          try { await ac.resume(); } catch {}
        }
        sampleRate = ac?.sampleRate || 44100;

        const stream = await getStream();

        if (!starting) return;

        src = ac!.createMediaStreamSource(stream);
        proc = ac!.createScriptProcessor(4096, 1, 1);

        reset();
        proc.onaudioprocess = (e) => {
          if (!running) return;
          const input = e.inputBuffer.getChannelData(0);
          buffers.push(new Float32Array(input));
        };

        src.connect(proc);
        proc.connect(ac!.destination);

        running = true;
      } finally {
        starting = false;
      }
    },
    stop: async () => {
      starting = false;
      if (!running) return "";
      running = false;
      const out = encodeWav(buffers, sampleRate);
      reset();
      await close();
      return out;
    },
    cancel: () => {
      starting = false;
      running = false;
      reset();
      void close();
    },
    isRunning: () => running,
  };
}

interface ComposerProps {
  editingMsgId: string | null;
  editingContent: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onSendText(text: string): void;
  onSendAudio(base64: string): void;
  onCancelEdit(): void;
  onFileClick(): void;
  stopRecordingRef: React.MutableRefObject<() => void>;
  ensureMicStream: () => Promise<MediaStream>;
  scheduleMicRelease: () => void;
  cancelMicRelease: () => void;
}

const Composer = memo(({ editingMsgId, editingContent, inputRef, onSendText, onSendAudio, onCancelEdit, onFileClick, stopRecordingRef, ensureMicStream, scheduleMicRelease, cancelMicRelease }: ComposerProps) => {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isVisualRecording, setIsVisualRecording] = useState(false); // Immediate visual feedback
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  const timerRef = useRef<HTMLSpanElement>(null);
  const tickRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  const downAtRef = useRef(0);
  const HOLD_MS = 300; // Reduced to 300ms for better responsiveness
  const isLockedRef = useRef(false);
  const isHoldingRef = useRef(false);

  const startingRef = useRef(false);
  const shouldStopAfterStartRef = useRef(false);

  const base64Ref = useRef<string | null>(null);
  const recRef = useRef<WavRecorder | null>(null);

  useEffect(() => {
    setText(editingContent);
  }, [editingContent]);

  const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    intervalRef.current = window.setInterval(() => {
      tickRef.current += 1;
      if (timerRef.current) timerRef.current.textContent = fmtSec(tickRef.current);
    }, 1000);
  }, [stopTimer]);

  const stopRec = useCallback(
    async (immediate = false) => {
      startingRef.current = false;
      shouldStopAfterStartRef.current = false;

      stopTimer();
      setIsRecording(false);
      setIsVisualRecording(false);

      const r = recRef.current;
      if (!r) {
        scheduleMicRelease();
        return;
      }

      if (immediate) {
        r.cancel();
        scheduleMicRelease();
        return;
      }

      // Add a tiny delay before actually stopping the recorder to catch the tail end of the audio
      await new Promise(resolve => setTimeout(resolve, 150));

      const b64 = await r.stop();
      base64Ref.current = b64 || null;
      if (b64) setAudioPreviewUrl(b64);
      scheduleMicRelease();
    },
    [stopTimer, scheduleMicRelease]
  );

  useEffect(() => {
    stopRecordingRef.current = () => {
      void stopRec(true);
    };
  }, [stopRec, stopRecordingRef]);

  useEffect(() => {
    return () => {
      void stopRec(true);
    };
  }, [stopRec]);

  const startRec = useCallback(async () => {
    if (isRecording || startingRef.current) return;
    startingRef.current = true;

    cancelMicRelease();

    (document.activeElement as HTMLElement | null)?.blur();

    tickRef.current = 0;
    if (timerRef.current) timerRef.current.textContent = "0:00";
    base64Ref.current = null;
    setAudioPreviewUrl(null);

    // OPTIMISTIC UI: Show recording state immediately without waiting for stream
    setIsVisualRecording(true);
    startTimer();

    try {
      // This await is what causes the delay in iOS, so we do it AFTER updating visual state
      const stream = await ensureMicStream();
      
      // If user cancelled while we were waiting
      if (!startingRef.current && !isVisualRecording) {
         return;
      }
      
      if (!recRef.current) recRef.current = createWavRecorder(ensureMicStream);
      await recRef.current.start();
      setIsRecording(true);
    } catch {
      startingRef.current = false;
      setIsRecording(false);
      setIsVisualRecording(false);
      stopTimer();
      scheduleMicRelease();
      return;
    }

    startingRef.current = false;

    if (shouldStopAfterStartRef.current) {
      shouldStopAfterStartRef.current = false;
      void stopRec(false);
    }
  }, [ensureMicStream, isRecording, isVisualRecording, startTimer, stopTimer, stopRec, scheduleMicRelease, cancelMicRelease]);

  const handleDeleteAudio = useCallback(() => {
    void stopRec(true);
    base64Ref.current = null;
    setAudioPreviewUrl(null);
    tickRef.current = 0;
  }, [stopRec]);

  const handleSendAudio = useCallback(() => {
    const b64 = base64Ref.current;
    if (!b64) return;
    setAudioPreviewUrl(null);
    base64Ref.current = null;
    onSendAudio(b64);
  }, [onSendAudio]);

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    onSendText(text);
    setText("");
  }, [text, onSendText]);

  useEffect(() => {
    if (!editingMsgId) return;
    return () => onCancelEdit();
  }, [editingMsgId, onCancelEdit]);

  const isMobileDevice = useIsMobile(); // We can use the existing useIsMobile hook

  const onMicPress = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}

      const ac = getSharedAudioContext();
      if (ac && ac.state !== "running") {
        ac.resume().catch(() => {});
      }

      downAtRef.current = Date.now();
      isHoldingRef.current = true;

      if (isVisualRecording || startingRef.current) {
        // If already recording, a press means we want to stop (tap-to-stop)
        if (startingRef.current) {
          shouldStopAfterStartRef.current = true;
        } else {
          // Add a tiny delay before stopping to prevent cutting off the last word
          setTimeout(() => {
            void stopRec(false);
          }, 300);
        }
        isLockedRef.current = false;
        isHoldingRef.current = false;
      } else {
        // Start recording
        isLockedRef.current = false;
        void startRec();
      }
    },
    [isVisualRecording, startRec, stopRec]
  );

  const onMicRelease = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}

      if (!isHoldingRef.current) return;
      isHoldingRef.current = false;

      // Desktop/Tablet: Ignore release events completely, only rely on the next tap to stop
      if (!isMobileDevice) {
        isLockedRef.current = true;
        return;
      }

      // Mobile: Handle hold-to-record logic
      const duration = Date.now() - downAtRef.current;

      // If it was a quick tap (< HOLD_MS), we lock it into recording mode
      if (duration < HOLD_MS) {
        isLockedRef.current = true;
        return;
      }

      // If it was a long press (>= HOLD_MS), releasing should stop the recording
      // BUT only if we are actually locked or recording
      if (isLockedRef.current) {
          // If it was locked by a previous tap, releasing shouldn't stop it
          // It should only stop on the NEXT tap (handled in onMicPress)
          return;
      }

      if (startingRef.current) {
        shouldStopAfterStartRef.current = true;
        return;
      }
      
      if (isVisualRecording) {
        // Add a tiny delay before stopping to prevent cutting off the last word
        setTimeout(() => {
          void stopRec(false);
        }, 300);
      }
    },
    [isVisualRecording, stopRec, isMobileDevice]
  );

  if (audioPreviewUrl) {
    return <AudioPlayer key={audioPreviewUrl} src={audioPreviewUrl} isPreview onDelete={handleDeleteAudio} onSend={handleSendAudio} />;
  }

  return (
    <>
      <div className="w-11 h-11 flex items-center justify-center shrink-0">
        {!isRecording && (
          <button type="button" onClick={onFileClick} className="w-11 h-11 flex items-center justify-center text-gray-500 lg:hover:text-gray-700 transition-colors">
            <Icons.Plus size={24} />
          </button>
        )}
      </div>

      <div className="flex-1 h-11 bg-white rounded-full flex items-center px-4 shadow-sm border border-transparent focus-within:border-gray-300 transition-colors min-w-0">
        {isVisualRecording ? (
          <div className="flex-1 flex items-center justify-center gap-3">
            <div className="flex items-end gap-1 h-6">
              <div className="w-1 bg-red-500 rounded-full animate-[bounce_1s_infinite] h-2" />
              <div className="w-1 bg-red-500 rounded-full animate-[bounce_1.2s_infinite] h-4" />
              <div className="w-1 bg-red-500 rounded-full animate-[bounce_0.8s_infinite] h-3" />
            </div>
            <span className="text-red-500 font-bold text-base tracking-widest animate-pulse">
              GRABANDO <span ref={timerRef}>0:00</span>
            </span>
          </div>
        ) : (
          <>
          <label htmlFor="chat-text-input" className="sr-only">Mensaje</label>
          <input
            id="chat-text-input"
            name="chat-text-input"
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Mensaje"
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-800 placeholder-gray-400 min-w-0"
          />
          </>
        )}
      </div>

      <div className="w-11 h-11 flex items-center justify-center shrink-0">
        {(text.trim() || editingMsgId) && !isVisualRecording ? (
          <button type="button" onClick={handleSend} className="w-11 h-11 flex items-center justify-center bg-[#008069] text-white rounded-full shadow-sm lg:hover:scale-105 transition-transform">
            {editingMsgId ? <Icons.Check size={20} /> : <Icons.Send size={20} />}
          </button>
        ) : (
          <button
            type="button"
            onPointerDown={onMicPress}
            onPointerUp={onMicRelease}
            onPointerCancel={onMicRelease}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className={`w-11 h-11 flex items-center justify-center rounded-full shadow-sm transition-transform select-none cursor-pointer ${
              isVisualRecording ? "bg-red-500 text-white scale-110 shadow-red-200" : "bg-[#008069] text-white lg:hover:scale-105"
            }`}
            style={{ 
              touchAction: "none", 
              WebkitUserSelect: "none", 
              WebkitTouchCallout: "none", 
              userSelect: "none" 
            }}
          >
            {isVisualRecording ? <Icons.MicOff size={20} /> : <Icons.Mic size={20} />}
          </button>
        )}
      </div>
    </>
  );
});

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    apply();
    if (typeof (mq as any).addEventListener === "function") {
      (mq as any).addEventListener("change", onChange);
      return () => (mq as any).removeEventListener("change", onChange);
    }
    (mq as any).addListener(onChange);
    return () => (mq as any).removeListener(onChange);
  }, []);
  return isMobile;
}

function useViewportVars(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const w = window;
    const root = document.documentElement;
    const vv = w.visualViewport;
    const set = () => {
      root.style.setProperty("--vvh", `${(vv?.height ?? w.innerHeight) * 0.01}px`);
      root.style.setProperty("--vvt", `${vv?.offsetTop ?? 0}px`);
    };
    const sch = () => {
      set();
      requestAnimationFrame(set);
      setTimeout(set, 50);
      setTimeout(set, 250);
    };
    sch();
    vv?.addEventListener("resize", sch);
    vv?.addEventListener("scroll", sch);
    w.addEventListener("resize", sch);
    w.addEventListener("orientationchange", sch);
    w.addEventListener("focusin", sch);
    w.addEventListener("focusout", sch);
    w.addEventListener("pageshow", sch);
    return () => {
      vv?.removeEventListener("resize", sch);
      vv?.removeEventListener("scroll", sch);
      w.removeEventListener("resize", sch);
      w.removeEventListener("orientationchange", sch);
      w.removeEventListener("focusin", sch);
      w.removeEventListener("focusout", sch);
      w.removeEventListener("pageshow", sch);
    };
  }, [active]);
}

function useElHeightVar(ref: React.RefObject<HTMLElement>, name: string, active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const set = () => root.style.setProperty(name, `${Math.ceil(el.getBoundingClientRect().height || 0)}px`);
    set();
    const RO = (window as any).ResizeObserver as typeof ResizeObserver | undefined;
    let ro: ResizeObserver | null = null;
    if (RO) {
      ro = new RO(set);
      ro.observe(el);
    } else window.addEventListener("resize", set as EventListener, { passive: true } as any);
    return () => {
      ro?.disconnect();
      if (!ro) window.removeEventListener("resize", set as EventListener);
      root.style.setProperty(name, "0px");
    };
  }, [ref, name, active]);
}

export const ChatBubble: React.FC = () => {
  const { messages, sendMessage, deleteMessage, editMessage, conversations, startConversation, currentUser, getUser, users } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ViewState>("LIST");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stopRecordingRef = useRef<() => void>(() => {});

  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const lpTimerRef = useRef<number | null>(null);
  const ignoreClickRef = useRef(false);
  const isSelModeRef = useRef(false);
  const lpTriggeredRef = useRef(false);
  const lastTouchRef = useRef(0);

  const [ctxMenuId, setCtxMenuId] = useState<string | null>(null);
  const [menuDir, setMenuDir] = useState<"up" | "down">("down");
  const [editMsgId, setEditMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [confirmDel, setConfirmDel] = useState<{ type: "BATCH" | "SINGLE"; id?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const micStreamRef = useRef<MediaStream | null>(null);
  const micStreamPromiseRef = useRef<Promise<MediaStream> | null>(null);
  const micReleaseTimerRef = useRef<number | null>(null);

  const cancelMicRelease = useCallback(() => {
    if (micReleaseTimerRef.current) {
      clearTimeout(micReleaseTimerRef.current);
      micReleaseTimerRef.current = null;
    }
  }, []);

  const hardReleaseMicStream = useCallback(() => {
    cancelMicRelease();
    const s = micStreamRef.current;
    micStreamRef.current = null;
    micStreamPromiseRef.current = null;
    s?.getTracks().forEach((t) => t.stop());
  }, [cancelMicRelease]);

  const scheduleMicRelease = useCallback(() => {
    cancelMicRelease();
    micReleaseTimerRef.current = window.setTimeout(() => {
      hardReleaseMicStream();
    }, 12000);
  }, [cancelMicRelease, hardReleaseMicStream]);

  const ensureMicStream = useCallback(async () => {
    cancelMicRelease();

    const s = micStreamRef.current;
    if (s && s.getTracks().some((t) => t.readyState === "live")) return s;

    if (!micStreamPromiseRef.current) {
      micStreamPromiseRef.current = navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    }

    const stream = await micStreamPromiseRef.current;
    micStreamRef.current = stream;
    micStreamPromiseRef.current = null;
    return stream;
  }, [cancelMicRelease]);

  const isMobile = useIsMobile();
  useViewportVars(isOpen && isMobile);
  useElHeightVar(composerRef as unknown as React.RefObject<HTMLElement>, "--composerH", isOpen);

  const contacts = useMemo(() => users.filter((u: any) => u.id !== currentUser.id), [users, currentUser.id]);
  const msgs = useMemo(() => (activeConvId ? messages.filter((m: any) => m.conversationId === activeConvId) : []), [messages, activeConvId]);
  const activeConv = useMemo(() => conversations.find((c: any) => c.id === activeConvId), [conversations, activeConvId]);
  const isSelMode = selectedMsgIds.size > 0;

  const kb = useCallback(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    inputRef.current?.blur();
  }, []);
  const scrollEnd = useCallback((b: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior: b });
  }, []);

  useEffect(() => {
    const m = document.querySelector('meta[name="theme-color"]');
    m?.setAttribute("content", isOpen ? "#008069" : "#f0f9ff");
    return () => {
      m?.setAttribute("content", "#f0f9ff");
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && view === "ROOM" && !isSelMode) scrollEnd("auto");
  }, [isOpen, view, isSelMode, msgs, scrollEnd]);

  useEffect(() => {
    if (!isOpen) {
      stopRecordingRef.current();
      hardReleaseMicStream();
      setSelMode(false);
    }
  }, [isOpen, hardReleaseMicStream]);

  useEffect(() => {
    if (previewImg || confirmDel) {
      document.body.style.overflow = "hidden";
      return;
    }
    document.body.style.overflow = isOpen && isMobile ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [previewImg, confirmDel, isOpen, isMobile]);

  useEffect(() => {
    if (!isOpen || !isMobile || view !== "ROOM") return;
    const el = inputRef.current;
    if (!el) return;
    const onFocus = () => {
      scrollEnd("auto");
      requestAnimationFrame(() => scrollEnd("auto"));
      setTimeout(() => scrollEnd("auto"), 60);
      setTimeout(() => scrollEnd("auto"), 320);
    };
    el.addEventListener("focus", onFocus);
    return () => el.removeEventListener("focus", onFocus);
  }, [isOpen, isMobile, view, activeConvId, scrollEnd]);

  const setSelMode = useCallback((on: boolean) => {
    isSelModeRef.current = on;
    if (!on) setSelectedMsgIds(new Set());
    if (on) {
      setCtxMenuId(null);
      setEditMsgId(null);
    }
  }, []);

  const handleContactClick = useCallback(
    async (uid: string) => {
      try { void ensureMicStream(); scheduleMicRelease(); } catch {}
      const ex = conversations.find((c: any) => c.type === "DIRECT" && c.participants.includes(currentUser.id) && c.participants.includes(uid));
      setActiveConvId(ex ? ex.id : await startConversation([uid]));
      setView("ROOM");
      setSelMode(false);
      requestAnimationFrame(() => scrollEnd("auto"));
    },
    [conversations, currentUser.id, startConversation, setSelMode, scrollEnd, ensureMicStream, scheduleMicRelease]
  );

  const handleBack = useCallback(() => {
    stopRecordingRef.current();
    if (isSelModeRef.current) {
      setSelMode(false);
      return;
    }
    setView("LIST");
    setActiveConvId(null);
    setEditMsgId(null);
    setEditContent("");
    kb();
  }, [setSelMode, kb]);

  const togSel = useCallback((id: string) => {
    setSelectedMsgIds((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const onPressStart = useCallback(
    (id: string) => {
      ignoreClickRef.current = false;
      lpTriggeredRef.current = false;
      if (isSelModeRef.current) return;
      lpTimerRef.current = window.setTimeout(() => {
        lpTriggeredRef.current = true;
        ignoreClickRef.current = true;
        setSelMode(true);
        togSel(id);
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    },
    [setSelMode, togSel]
  );

  const onPressEnd = useCallback(() => {
    if (lpTimerRef.current) {
      clearTimeout(lpTimerRef.current);
      lpTimerRef.current = null;
    }
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent, id: string, type: MessageType) => {
      onPressEnd();
      if (e.pointerType === "touch") {
        lastTouchRef.current = Date.now();
        e.preventDefault();
        if (lpTriggeredRef.current) {
          lpTriggeredRef.current = false;
          ignoreClickRef.current = false;
          return;
        }
        if (isSelModeRef.current && type !== MessageType.IMAGE) togSel(id);
        return;
      }
      if (Date.now() - lastTouchRef.current < 450) return;
      if (ignoreClickRef.current) {
        ignoreClickRef.current = false;
        return;
      }
      if (isSelMode && type !== MessageType.IMAGE) togSel(id);
    },
    [onPressEnd, togSel, isSelMode]
  );

  const onMsgClick = useCallback(
    (id: string, type: MessageType) => {
      if (Date.now() - lastTouchRef.current < 450) return;
      if (ignoreClickRef.current) {
        ignoreClickRef.current = false;
        return;
      }
      if (isSelMode && type !== MessageType.IMAGE) togSel(id);
    },
    [isSelMode, togSel]
  );

  const onCtxMenu = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      if (isSelMode) return;
      setMenuDir(window.innerHeight - e.currentTarget.getBoundingClientRect().bottom < 200 ? "up" : "down");
      setCtxMenuId(id);
    },
    [isSelMode]
  );

  const onEditSetup = useCallback((e: React.MouseEvent, id: string, content: string) => {
    e.preventDefault();
    e.stopPropagation();
    setEditMsgId(id);
    setEditContent(content);
    setCtxMenuId(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const onEnterSel = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      setSelMode(true);
      togSel(id);
      setCtxMenuId(null);
    },
    [setSelMode, togSel]
  );

  const onDelSingle = useCallback((id: string) => {
    setCtxMenuId(null);
    setConfirmDel({ type: "SINGLE", id });
  }, []);
  const onCloseMenu = useCallback(() => setCtxMenuId(null), []);
  const onImgPreview = useCallback((src: string) => setPreviewImg(src), []);

  const onBatchDel = useCallback(
    (e?: React.SyntheticEvent) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      if (selectedMsgIds.size > 0) setConfirmDel({ type: "BATCH" });
    },
    [selectedMsgIds.size]
  );

  const execDelete = useCallback(() => {
    if (!confirmDel) return;
    setConfirmDel(null);
    if (confirmDel.type === "BATCH") {
      selectedMsgIds.forEach((id) => deleteMessage(id));
      setSelMode(false);
    } else if (confirmDel.type === "SINGLE" && confirmDel.id) deleteMessage(confirmDel.id);
  }, [confirmDel, selectedMsgIds, deleteMessage, setSelMode]);

  const onSendText = useCallback(
    (text: string) => {
      if (!activeConvId || !text.trim()) return;
      if (editMsgId) {
        editMessage(editMsgId, text);
        setEditMsgId(null);
        setEditContent("");
      } else sendMessage(activeConvId, text, MessageType.TEXT);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        scrollEnd("auto");
      });
    },
    [activeConvId, editMsgId, editMessage, sendMessage, scrollEnd]
  );

  const onSendAudio = useCallback(
    (base64: string) => {
      if (!activeConvId) return;
      sendMessage(activeConvId, base64, MessageType.AUDIO);
      requestAnimationFrame(() => scrollEnd("auto"));
    },
    [activeConvId, sendMessage, scrollEnd]
  );

  const onFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length || !activeConvId) return;
      const file = e.target.files[0];
      try {
        const b64 = await fileToBase64(file);
        sendMessage(activeConvId, b64, file.type.startsWith("image/") ? MessageType.IMAGE : MessageType.DOCUMENT);
        if (fileInputRef.current) fileInputRef.current.value = "";
        requestAnimationFrame(() => scrollEnd("auto"));
      } catch (err) {
        alert("Error: " + (err as Error).message);
      }
    },
    [activeConvId, sendMessage, scrollEnd]
  );

  const onCancelEdit = useCallback(() => {
    setEditMsgId(null);
    setEditContent("");
  }, []);
  const onFileClick = useCallback(() => fileInputRef.current?.click(), []);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{ bottom: "calc(2rem + env(safe-area-inset-bottom))" }}
        className="fixed sm:bottom-[calc(0.5rem+env(safe-area-inset-bottom))] right-4 sm:right-6 h-14 w-14 bg-[#25D366] rounded-full shadow-lg flex items-center justify-center text-white z-30 lg:hover:scale-110 transition-transform"
      >
        <Icons.Chat size={28} />
      </button>
    );
  }

  return (
    <>
      {previewImg && (
        <div
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex items-center justify-center p-2 animate-in fade-in duration-200"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPreviewImg(null);
          }}
          style={{ touchAction: "manipulation" }}
        >
          <button
            type="button"
            className="absolute top-4 right-4 mt-[env(safe-area-inset-top)] p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm z-50"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPreviewImg(null);
            }}
          >
            <Icons.Close size={24} />
          </button>
          <img
            src={previewImg}
            alt="Full preview"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </div>
      )}

      {confirmDel && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirmDel(null);
          }}
          style={{ touchAction: "manipulation" }}
        >
          <div
            className="bg-white rounded-[2rem] shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 flex flex-col items-center"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{ touchAction: "manipulation" }}
          >
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 shadow-sm">
              <Icons.Delete size={24} />
            </div>
            <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
              {confirmDel.type === "BATCH" ? `¿Eliminar ${selectedMsgIds.size} mensajes?` : "¿Eliminar mensaje?"}
            </h2>
            <p className="text-gray-500 text-center mb-6 text-sm">Esta acción es permanente y no se puede deshacer.</p>
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirmDel(null);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl lg:hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  execDelete();
                }}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl lg:hover:bg-red-600 shadow-lg shadow-red-200"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="fixed z-[200] flex flex-col overflow-hidden shadow-2xl overscroll-none bg-[#008069] sm:bg-[#efeae2] sm:border sm:border-gray-200 sm:rounded-[20px] rounded-none"
        style={
          isMobile
            ? { left: 0, right: 0, top: 0, bottom: 0, width: "100%", height: "100svh", paddingTop: "env(safe-area-inset-top)" }
            : { right: "1rem", bottom: "1rem", width: "400px", height: "600px" }
        }
      >
        <div className="text-white px-4 pt-4 pb-3 flex items-center justify-between shadow-sm shrink-0 z-20 bg-[#008069]">
          <div className="flex items-center gap-3">
            {view === "ROOM" ? (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBack();
                }}
                className="lg:hover:bg-black/10 p-1 rounded-full"
              >
                {isSelMode ? <Icons.Close size={24} /> : <Icons.ChevronLeft size={24} />}
              </button>
            ) : (
              <h3 className="font-bold text-lg text-white">Chat</h3>
            )}

            {isSelMode ? (
              <span className="font-bold text-lg">{selectedMsgIds.size}</span>
            ) : view === "ROOM" && activeConv ? (
              <div className="flex items-center gap-2">
                {activeConv.type === "DIRECT" ? (
                  <img
                    src={getUser(activeConv.participants.find((id: string) => id !== currentUser.id) || "")?.avatar}
                    className="w-8 h-8 rounded-full bg-white"
                    alt=""
                    draggable={false}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white text-teal-600 flex items-center justify-center">
                    <Icons.Users size={16} />
                  </div>
                )}
                <span className="font-bold truncate max-w-[150px]">
                  {activeConv.type === "DIRECT"
                    ? getUser(activeConv.participants.find((id: string) => id !== currentUser.id) || "")?.name
                    : "Grupo"}
                </span>
              </div>
            ) : null}
          </div>

          {isSelMode ? (
            <button type="button" onPointerDown={(e) => onBatchDel(e)} className="lg:hover:bg-black/10 p-2 rounded-full">
              <Icons.Delete size={24} />
            </button>
          ) : (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
                kb();
              }}
              className="lg:hover:bg-black/10 p-1 rounded-full"
            >
              <Icons.Close size={24} />
            </button>
          )}
        </div>

        <div
          className="flex-1 overflow-y-auto relative bg-[#efeae2] bg-opacity-90 scroll-smooth"
          style={{ paddingBottom: "var(--composerH, 60px)" }}
          onPointerDownCapture={(e) => {
            if (e.pointerType !== "touch" || isSelModeRef.current) return;
            if (composerRef.current?.contains(e.target as HTMLElement)) return;
            kb();
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
              backgroundSize: "400px",
            }}
          />

          {view === "LIST" && (
            <div className="relative z-10 pb-2">
              {contacts.map((user: any) => (
                <div
                  key={user.id}
                  onClick={() => handleContactClick(user.id)}
                  className="bg-white flex items-center gap-4 p-4 border-b border-gray-100 lg:hover:bg-gray-50 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                    <img src={user.avatar} className="w-full h-full object-cover" alt={user.name} draggable={false} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 text-gray-800 truncate">{user.name}</h4>
                  </div>
                  <Icons.ChevronRight size={18} className="text-gray-300" />
                </div>
              ))}
            </div>
          )}

          {view === "ROOM" && (
            <MessageList
              messages={msgs}
              currentUserId={currentUser.id}
              selectedMsgIds={selectedMsgIds}
              isSelectionMode={isSelMode}
              contextMenuMsgId={ctxMenuId}
              menuOpenDirection={menuDir}
              activeConversation={activeConv}
              getUser={getUser}
              messagesEndRef={messagesEndRef}
              onPressStart={onPressStart}
              onPressEnd={onPressEnd}
              onPointerUp={onPointerUp}
              onClick={onMsgClick}
              onContextMenu={onCtxMenu}
              onEditSetup={onEditSetup}
              onEnterSelection={onEnterSel}
              onDeleteSingle={onDelSingle}
              onCloseMenu={onCloseMenu}
              onImagePreview={onImgPreview}
            />
          )}
        </div>

        {view === "ROOM" && !isSelMode && (
          <div
            ref={composerRef}
            className="bg-[#f0f2f5] absolute left-0 right-0 bottom-0 z-20 flex items-center gap-2 px-3 h-[calc(64px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]"
          >
            <Composer
              editingMsgId={editMsgId}
              editingContent={editContent}
              inputRef={inputRef}
              onSendText={onSendText}
              onSendAudio={onSendAudio}
              onCancelEdit={onCancelEdit}
              onFileClick={onFileClick}
              stopRecordingRef={stopRecordingRef}
              ensureMicStream={ensureMicStream}
              scheduleMicRelease={scheduleMicRelease}
              cancelMicRelease={cancelMicRelease}
            />
            <label htmlFor="chat-file-input" className="sr-only">Subir archivo</label>
            <input id="chat-file-input" name="chat-file-input" type="file" ref={fileInputRef} onChange={onFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx" />
          </div>
        )}

        {view === "ROOM" && isSelMode && (
          <div
            className="bg-[#f0f2f5] p-2 flex items-center justify-center z-20 min-h-[60px] absolute left-0 right-0 bottom-0"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Modo Selección</span>
          </div>
        )}
      </div>
    </>
  );
};
