import { Product } from '../../types';
import { normalizeBarcode, validateBarcode } from './barcodeValidator';
import { ScanResult, ExternalPharmaceuticalSource, ReferenceProduct } from './types';
import { db } from '../../firebase';
import { collection, query, where, limit, getDocs } from '../../mockFirestore';

/**
 * Busca un producto en la lista local por coincidencia de código normalizado.
 * Soporta productos que tengan o no código.
 */
export function findProductByBarcode(products: Product[], rawBarcode: string): Product | null {
  const normalized = normalizeBarcode(rawBarcode);
  if (!normalized) return null;

  return products.find(p => {
    if (!p.code) return false;
    return normalizeBarcode(p.code) === normalized;
  }) || null;
}

/**
 * Busca un producto en el catálogo de referencia en Firestore.
 */
export async function findReferenceProductByBarcode(rawBarcode: string): Promise<ReferenceProduct | null> {
  const normalized = normalizeBarcode(rawBarcode);
  if (!normalized) return null;

  try {
    const q = query(collection(db, "referenceProducts"), where("code", "==", normalized), limit(1));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty && snapshot.docs.length > 0) {
      return snapshot.docs[0].data() as ReferenceProduct;
    }
  } catch (err) {
    console.error("Error buscando en referenceProducts:", err);
  }
  return null;
}

/**
 * Verifica si un código de barras ya pertenece a otro producto en el catálogo.
 * Permite excluir el producto actual en caso de edición.
 */
export function isBarcodeAssignedToOtherProduct(
  products: Product[],
  rawBarcode: string,
  currentProductId?: string
): Product | null {
  const normalized = normalizeBarcode(rawBarcode);
  if (!normalized) return null;

  return products.find(p => {
    if (currentProductId && p.id === currentProductId) return false;
    if (!p.code) return false;
    return normalizeBarcode(p.code) === normalized;
  }) || null;
}

/**
 * Fuente farmacéutica externa (Stub extensible para fases posteriores).
 * En esta fase NO realiza llamadas reales, scraping ni consultas simuladas.
 */
export const externalPharmaceuticalSourceStub: ExternalPharmaceuticalSource = {
  sourceName: 'ExternalPharmaceuticalSource (Desactivada en Fase 2)',
  searchByBarcode: async (_barcode: string): Promise<Partial<ReferenceProduct> | null> => {
    // Fase 2: siempre retorna null.
    return null;
  },
};

/**
 * Procesa un código de barras de manera desacoplada de la interfaz (USB, teclado o futura cámara).
 *
 * Flujo Fase 2:
 * 1. Normalizar y validar sintaxis / dígito verificador.
 * 2. Buscar en el catálogo local de Farmacia del Este (FOUND_LOCAL).
 * 3. Buscar en el Catálogo de Referencia en Firestore (FOUND_REFERENCE).
 * 4. Si no existe, invocar la fuente externa (desactivada).
 * 5. Devolver ScanResult para que la UI reaccione correspondientemente.
 */
export async function processBarcode(
  rawBarcode: string,
  localProducts: Product[]
): Promise<ScanResult> {
  const validation = validateBarcode(rawBarcode);

  if (!validation.isValid) {
    return {
      status: 'INVALID_CODE',
      code: validation.normalizedCode,
      product: null,
      error: validation.error || 'Código de barras inválido',
    };
  }

  const normalized = validation.normalizedCode;

  // Paso 1: Búsqueda local en el catálogo de Farmacia del Este
  const localProduct = findProductByBarcode(localProducts, normalized);
  if (localProduct) {
    return {
      status: 'FOUND_LOCAL',
      code: normalized,
      product: localProduct,
    };
  }

  // Paso 2: Búsqueda en el Catálogo de Referencia (Medicamentos conocidos sin stock local)
  const referenceProduct = await findReferenceProductByBarcode(normalized);
  if (referenceProduct) {
    return {
      status: 'FOUND_REFERENCE',
      code: normalized,
      product: null,
      referenceProduct
    };
  }

  // Paso 3: Fuente externa (desactivada)
  const _externalData = await externalPharmaceuticalSourceStub.searchByBarcode(normalized);

  // Paso 4: No encontrado en ningún lado
  return {
    status: 'NOT_FOUND',
    code: normalized,
    product: null,
  };
}
