import { db } from '../../firebase';
import { collection, query, where, getDocs, writeBatch, doc } from '../../mockFirestore';
import { ReferenceProduct, ImportRow, DryRunResult, DryRunRow, ImportAction } from './types';
import { normalizeBarcode, validateBarcode } from './barcodeValidator';
import { generateUUID } from '../../utils';

const CHUNK_SIZE = 30; // Firestore "in" queries are limited to 30 elements
const BATCH_SIZE = 500; // Firestore batch write limit

function cleanString(str?: string | null): string | undefined {
  if (!str) return undefined;
  const trimmed = str.trim().replace(/\s+/g, ' ');
  return trimmed === '' ? undefined : trimmed;
}

function computeMerge(existing: ReferenceProduct, incoming: Partial<ReferenceProduct>): { merged: Partial<ReferenceProduct>; isChanged: boolean; isConflict: boolean } {
  let isChanged = false;
  let isConflict = false;
  const merged = { ...existing };

  // Detect conflict heavily based on commercial name divergence
  const incomingName = incoming.name?.toLowerCase();
  const existingName = existing.name.toLowerCase();
  if (incomingName && incomingName !== existingName) {
    // Very basic conflict check. Could be expanded.
    if (!existingName.includes(incomingName) && !incomingName.includes(existingName)) {
      isConflict = true;
    }
  }

  // Smart merge fields (don't overwrite truthy with falsy)
  const mergeableFields: (keyof ReferenceProduct)[] = [
    'name', 'activeIngredient', 'concentration', 'presentation',
    'pharmaceuticalForm', 'laboratory', 'troquel', 'source', 'sourceUrl'
  ];

  for (const field of mergeableFields) {
    if (incoming[field] && incoming[field] !== existing[field]) {
      merged[field] = incoming[field] as any;
      isChanged = true;
    }
  }

  return { merged, isChanged, isConflict };
}

export async function executeDryRun(dataset: Partial<ImportRow>[]): Promise<DryRunResult> {
  const result: DryRunResult = {
    totalRecords: dataset.length,
    validRecords: 0,
    invalidRecords: 0,
    duplicatedInFile: 0,
    existingRecords: 0,
    newRecords: 0,
    updatableRecords: 0,
    conflictingRecords: 0,
    rows: []
  };

  const codeToFileRowsMap = new Map<string, DryRunRow[]>();

  // Pass 1: Parse and validate within file
  for (let i = 0; i < dataset.length; i++) {
    const rawRow = dataset[i];
    const extractedBarcode = rawRow.barcode ?? rawRow.code ?? rawRow.ean ?? rawRow.gtin;
    const rawBarcode = extractedBarcode ? String(extractedBarcode) : undefined;
    const normalizedCode = rawBarcode ? normalizeBarcode(rawBarcode) : undefined;
    const commercialName = cleanString(rawRow.commercialName);

    const dryRow: DryRunRow = {
      originalIndex: i,
      parsedRow: rawRow,
      normalizedBarcode: normalizedCode,
      action: 'INVALID'
    };

    if (!normalizedCode) {
      dryRow.reason = 'Barcode requerido';
      result.invalidRecords++;
    } else if (!validateBarcode(normalizedCode).isValid) {
      dryRow.reason = 'Barcode inválido';
      result.invalidRecords++;
    } else if (!commercialName) {
      dryRow.reason = 'Nombre comercial requerido';
      result.invalidRecords++;
    } else {
      if (!codeToFileRowsMap.has(normalizedCode)) {
        codeToFileRowsMap.set(normalizedCode, []);
      }
      codeToFileRowsMap.get(normalizedCode)!.push(dryRow);
    }
    result.rows.push(dryRow);
  }

  // Handle internal duplicates
  const uniqueValidCodes: string[] = [];
  for (const [code, rows] of codeToFileRowsMap.entries()) {
    if (rows.length > 1) {
      // Keep the first one, mark others as duplicate
      rows[0].action = 'NEW'; // Temp action, will verify against DB
      uniqueValidCodes.push(code);
      for (let i = 1; i < rows.length; i++) {
        rows[i].action = 'DUPLICATE';
        rows[i].reason = 'Duplicado dentro del archivo';
        result.duplicatedInFile++;
      }
    } else {
      rows[0].action = 'NEW';
      uniqueValidCodes.push(code);
    }
  }

  // Pass 2: Check Firestore in chunks of 30
  const existingProductsByCode = new Map<string, ReferenceProduct>();
  for (let i = 0; i < uniqueValidCodes.length; i += CHUNK_SIZE) {
    const chunk = uniqueValidCodes.slice(i, i + CHUNK_SIZE);
    try {
      const q = query(collection(db, "referenceProducts"), where("code", "in", chunk));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach((d: any) => {
        const data = d.data() as ReferenceProduct;
        existingProductsByCode.set(data.code, { ...data, id: d.id });
      });
    } catch (err) {
      console.error("Error querying batch of referenceProducts", err);
    }
  }

  // Pass 3: Evaluate Actions
  for (const dryRow of result.rows) {
    if (dryRow.action !== 'NEW') continue; // Skip invalid/duplicates

    const code = dryRow.normalizedBarcode!;
    const existing = existingProductsByCode.get(code);

    const mappedIncoming: Partial<ReferenceProduct> = {
      code,
      name: cleanString(dryRow.parsedRow.commercialName),
      activeIngredient: cleanString(dryRow.parsedRow.activeIngredient),
      concentration: cleanString(dryRow.parsedRow.concentration),
      pharmaceuticalForm: cleanString(dryRow.parsedRow.pharmaceuticalForm),
      presentation: cleanString(dryRow.parsedRow.presentation),
      laboratory: cleanString(dryRow.parsedRow.laboratory),
      troquel: cleanString(dryRow.parsedRow.troquel),
      source: cleanString(dryRow.parsedRow.source),
      sourceUrl: cleanString(dryRow.parsedRow.sourceUrl),
      sourceUpdatedAt: dryRow.parsedRow.sourceUpdatedAt ? new Date(dryRow.parsedRow.sourceUpdatedAt) : undefined
    };

    if (existing) {
      result.existingRecords++;
      dryRow.existingReference = existing;

      const { merged, isChanged, isConflict } = computeMerge(existing, mappedIncoming);
      
      if (isConflict) {
        dryRow.action = 'CONFLICT';
        dryRow.reason = 'Nombre comercial difiere significativamente';
        result.conflictingRecords++;
      } else if (isChanged) {
        dryRow.action = 'UPDATE';
        dryRow.mergedData = merged;
        result.updatableRecords++;
      } else {
        dryRow.action = 'UNCHANGED';
        dryRow.reason = 'Datos ya están actualizados';
      }
    } else {
      dryRow.action = 'NEW';
      dryRow.mergedData = mappedIncoming;
      result.newRecords++;
    }

    if (dryRow.action === 'NEW' || dryRow.action === 'UPDATE') {
      result.validRecords++;
    }
  }

  return result;
}

export async function executeImport(dryRunResult: DryRunResult): Promise<number> {
  const actionsToProcess = dryRunResult.rows.filter(r => r.action === 'NEW' || r.action === 'UPDATE');
  let processedCount = 0;

  for (let i = 0; i < actionsToProcess.length; i += BATCH_SIZE) {
    const batchList = actionsToProcess.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const row of batchList) {
      const isUpdate = row.action === 'UPDATE';
      const docId = isUpdate && row.existingReference ? row.existingReference.id : generateUUID();
      const ref = doc(db, 'referenceProducts', docId);

      const payload = {
        ...row.mergedData,
        id: docId,
        importedAt: new Date(),
        updatedAt: new Date(),
      };

      batch.set(ref, payload);
      processedCount++;
    }

    await batch.commit();
  }

  return processedCount;
}
