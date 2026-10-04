import { BarcodeValidationResult, BarcodeFormat } from './types';

/**
 * Normaliza el código de barras eliminando espacios y guiones accidentales,
 * preservando estrictamente el valor como string.
 */
export function normalizeBarcode(rawInput: string): string {
  if (!rawInput) return '';
  // Elimina espacios, saltos de línea, tabulaciones y guiones
  return rawInput
    .trim()
    .replace(/[\s\-\u2010-\u2015]/g, '');
}

/**
 * Valida el dígito verificador de un código EAN-13 estándar.
 * Algoritmo:
 * - Suma de dígitos en posiciones impares (índices 0, 2, 4, 6, 8, 10) * 1
 * - Suma de dígitos en posiciones pares (índices 1, 3, 5, 7, 9, 11) * 3
 * - Checksum = (10 - (sumaTotal % 10)) % 10
 */
export function calculateEAN13CheckDigit(first12Digits: string): number {
  let oddSum = 0;
  let evenSum = 0;

  for (let i = 0; i < 12; i++) {
    const digit = parseInt(first12Digits[i], 10);
    if (i % 2 === 0) {
      oddSum += digit;
    } else {
      evenSum += digit;
    }
  }

  const totalSum = oddSum + (evenSum * 3);
  return (10 - (totalSum % 10)) % 10;
}

/**
 * Valida si un string de 13 dígitos cumple estrictamente con EAN-13.
 */
export function isEAN13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  const declaredCheckDigit = parseInt(code[12], 10);
  const calculatedCheckDigit = calculateEAN13CheckDigit(code.slice(0, 12));
  return declaredCheckDigit === calculatedCheckDigit;
}

/**
 * Valida un código de barras de manera extensible.
 * Si tiene 13 dígitos numéricos, aplica validación estricta EAN-13.
 * Si tiene otro formato estándar (EAN-8, UPC-A, o alfanumérico válido), lo evalúa.
 */
export function validateBarcode(rawInput: string): BarcodeValidationResult {
  const normalized = normalizeBarcode(rawInput);

  if (!normalized) {
    return {
      isValid: false,
      normalizedCode: '',
      format: 'UNKNOWN',
      error: 'El código no puede estar vacío.',
    };
  }

  // 1. Caso de 13 dígitos (potencial EAN-13)
  if (/^\d{13}$/.test(normalized)) {
    if (isEAN13(normalized)) {
      return {
        isValid: true,
        normalizedCode: normalized,
        format: 'EAN-13',
      };
    } else {
      return {
        isValid: false,
        normalizedCode: normalized,
        format: 'EAN-13',
        error: 'Este código de barras parece inválido. Revisa el código o intenta escanear nuevamente.',
      };
    }
  }

  // 2. Caso EAN-8
  if (/^\d{8}$/.test(normalized)) {
    return {
      isValid: true,
      normalizedCode: normalized,
      format: 'EAN-8',
    };
  }

  // 3. Caso UPC-A (12 dígitos numéricos)
  if (/^\d{12}$/.test(normalized)) {
    return {
      isValid: true,
      normalizedCode: normalized,
      format: 'UPC-A',
    };
  }

  // 4. Códigos genéricos alfanuméricos válidos (ej: DataMatrix / códigos internos entre 4 y 30 caracteres)
  if (/^[A-Za-z0-9_-]{4,30}$/.test(normalized)) {
    return {
      isValid: true,
      normalizedCode: normalized,
      format: 'GENERIC_BARCODE',
    };
  }

  return {
    isValid: false,
    normalizedCode: normalized,
    format: 'UNKNOWN',
    error: 'Formato de código no reconocido. Verifique los caracteres.',
  };
}
