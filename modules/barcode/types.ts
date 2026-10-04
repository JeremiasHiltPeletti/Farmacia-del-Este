import { Product } from '../../types';

export type BarcodeFormat = 'EAN-13' | 'EAN-8' | 'UPC-A' | 'GENERIC_BARCODE' | 'UNKNOWN';

export interface BarcodeValidationResult {
  isValid: boolean;
  normalizedCode: string;
  format: BarcodeFormat;
  error?: string;
}

export interface ReferenceProduct {
  id: string; // Generado o importado
  code: string; // EAN/GTIN normalizado
  name: string; // Nombre comercial
  activeIngredient?: string;
  concentration?: string;
  presentation?: string; 
  pharmaceuticalForm?: string;
  laboratory?: string;
  troquel?: string;
  source?: string; // Ej: 'VNM', 'Importacion_CSV'
  sourceUrl?: string;
  sourceUpdatedAt?: Date;
  importedAt?: Date;
  updatedAt: Date;
}

export type ImportAction = 'NEW' | 'UPDATE' | 'UNCHANGED' | 'INVALID' | 'DUPLICATE' | 'CONFLICT';

export interface ImportRow {
  barcode?: string;
  code?: string;
  ean?: string;
  gtin?: string;
  commercialName: string;
  activeIngredient?: string;
  concentration?: string;
  pharmaceuticalForm?: string;
  presentation?: string;
  laboratory?: string;
  troquel?: string;
  source?: string;
  sourceUrl?: string;
  sourceUpdatedAt?: string;
}

export interface DryRunRow {
  originalIndex: number;
  parsedRow: Partial<ImportRow>;
  normalizedBarcode?: string;
  action: ImportAction;
  reason?: string;
  existingReference?: ReferenceProduct;
  mergedData?: Partial<ReferenceProduct>;
}

export interface DryRunResult {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicatedInFile: number;
  existingRecords: number;
  newRecords: number;
  updatableRecords: number;
  conflictingRecords: number;
  rows: DryRunRow[];
}

export type ScanStatus = 'IDLE' | 'SCANNING' | 'FOUND_LOCAL' | 'FOUND_REFERENCE' | 'NOT_FOUND' | 'INVALID_CODE';

export interface ScanResult {
  status: ScanStatus;
  code: string;
  product: Product | null;
  referenceProduct?: ReferenceProduct | null;
  error?: string;
}

export interface ExternalPharmaceuticalSource {
  sourceName: string;
  searchByBarcode: (barcode: string) => Promise<Partial<ReferenceProduct> | null>;
}
