
import { canUseServiceWorker } from './platform';

// --- SOUND UTILS (Web Audio API) ---

// Singleton AudioContext to allow unlocking via user interaction
let audioCtx: AudioContext | null = null;

export const getAudioContext = () => {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  return audioCtx;
};

// Function to unlock audio context on first user interaction
export const unlockAudioContext = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(err => {
      // Error handling
    });
  }
};

export const playAlertSound = (type: string) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Try to resume if suspended (might fail if no user interaction yet, but handled by unlockAudioContext globally)
  if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
  }

  const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, vol: number = 0.1) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
    osc.stop(startTime + duration);
  };

  const now = ctx.currentTime;

  switch (type) {
    case 'Campana Clásica':
      playTone(523.25, 'sine', now, 1.5); // C5
      setTimeout(() => playTone(659.25, 'sine', ctx.currentTime, 1.5), 200); // E5
      break;
    case 'Alerta Digital':
      playTone(880, 'square', now, 0.1, 0.05);
      setTimeout(() => playTone(880, 'square', ctx.currentTime, 0.1, 0.05), 150);
      setTimeout(() => playTone(880, 'square', ctx.currentTime, 0.1, 0.05), 300);
      break;
    case 'Elegante':
      playTone(440, 'triangle', now, 0.8);
      setTimeout(() => playTone(554.37, 'triangle', ctx.currentTime, 0.8), 200); // C#5
      break;
    case 'Cristalino':
      playTone(1200, 'sine', now, 0.5);
      setTimeout(() => playTone(2000, 'sine', ctx.currentTime, 0.5), 100);
      break;
    case 'Eco Suave':
      playTone(300, 'sine', now, 2);
      break;
    case 'Melodía Feliz':
      // Major Triad Arpeggio (C - E - G)
      playTone(523.25, 'sine', now, 0.4); 
      setTimeout(() => playTone(659.25, 'sine', ctx.currentTime, 0.4), 100);
      setTimeout(() => playTone(783.99, 'sine', ctx.currentTime, 0.8), 200);
      break;
    case 'Gota de Agua':
      // High pitch sine with very fast decay
      playTone(1500, 'sine', now, 0.2, 0.1);
      break;
    case 'Éxito':
      // Two positive tones
      playTone(600, 'sine', now, 0.2);
      setTimeout(() => playTone(1000, 'sine', ctx.currentTime, 0.6), 100);
      break;
    default:
      playTone(440, 'sine', now, 0.5);
  }
};

// --- ID HELPER ---
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const normalizeSearchText = (text: string) => {
  if (!text) return '';
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

// --- FILE HELPERS ---

const COMPRESSION_MAX_WIDTH = 1000;
const COMPRESSION_MAX_HEIGHT = 1000;
const COMPRESSION_QUALITY = 0.6;

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > COMPRESSION_MAX_WIDTH) {
            height *= COMPRESSION_MAX_WIDTH / width;
            width = COMPRESSION_MAX_WIDTH;
          }
        } else {
          if (height > COMPRESSION_MAX_HEIGHT) {
            width *= COMPRESSION_MAX_HEIGHT / height;
            height = COMPRESSION_MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error("Canvas context not supported"));
            return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with reduced quality
        const dataUrl = canvas.toDataURL('image/jpeg', COMPRESSION_QUALITY);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const fileToBase64 = async (file: File): Promise<string> => {
  // If it's an image, compress it
  if (file.type.startsWith('image/')) {
      try {
          const compressed = await compressImage(file);
          // Safety check: Firestore doc limit is 1MB. Base64 is ~4/3 larger than binary.
          // We leave some buffer for other task data. Limit attachment to ~950KB string length.
          if (compressed.length > 950000) { 
              throw new Error("La imagen es demasiado grande incluso después de comprimir.");
          }
          return compressed;
      } catch (e) {
          throw e;
      }
  }

  // If it's a document, just convert but check size
  return new Promise((resolve, reject) => {
    if (file.size > 800 * 1024) { // 800KB Limit for non-images
        reject(new Error("El documento excede el límite de 800KB."));
        return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// --- SYSTEM NOTIFICATION UTIL ---
export const sendSystemNotification = (title: string, body: string, onClick?: () => void) => {
  if (!('Notification' in window)) return;

  // Cast to any to avoid TS error: vibrate is not in NotificationOptions in some libs
  const options: any = {
      body: body,
      icon: './pwa_icon.png?v=9', // Asegura usar la versión cacheada
      badge: './pwa_icon.png?v=9',
      vibrate: [200, 100, 200],
      tag: 'farmacia-task-' + Date.now(), // Tag único para no reemplazar notificaciones anteriores
      renotify: true, // Forzar que vibre/suene de nuevo
      requireInteraction: true // Pide al sistema que no la oculte automáticamente
  };

  if (Notification.permission === 'granted') {
    // INTENTO 1: Usar Service Worker (Solo en Web/PWA)
    if (canUseServiceWorker && navigator.serviceWorker.ready) {
       navigator.serviceWorker.ready.then(registration => {
         registration.showNotification(title, options);
       }).catch(err => {
         // Fallback a notificación normal
         new Notification(title, options);
       });
    } else {
       // INTENTO 2: API Estándar (Desktop/Navegador simple o Nativo si soportado)
       const notification = new Notification(title, options);
       notification.onclick = () => {
          window.focus();
          if (onClick) onClick();
          notification.close();
       };
    }
  }
};
