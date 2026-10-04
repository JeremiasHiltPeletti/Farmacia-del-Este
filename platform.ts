
import { Capacitor } from '@capacitor/core';

// Detectar si corre en iOS/Android nativo
export const isNative = Capacitor.isNativePlatform();

// Detectar si el entorno soporta Service Workers (Solo Web/PWA, no nativo)
export const canUseServiceWorker =
  !isNative &&
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator;
