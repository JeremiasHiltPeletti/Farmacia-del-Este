import React, { useState, useEffect, useRef } from 'react';
import { 
  ScanLine, 
  Search, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  PlusCircle, 
  RotateCcw,
  ExternalLink,
  Package,
  Barcode as BarcodeIcon,
  Database
} from 'lucide-react';
import { Product } from '../../types';
import { processBarcode } from './barcodeService';
import { normalizeBarcode } from './barcodeValidator';
import { ScanResult, ReferenceProduct } from './types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProduct: (product: Product) => void;
  onAddProduct: (preloadedBarcode: string) => void;
  onAddReferenceProduct: (referenceProduct: ReferenceProduct) => void;
  products: Product[];
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onOpenProduct,
  onAddProduct,
  onAddReferenceProduct,
  products,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autoenfocar el input cada vez que se abre el modal o se reinicia la búsqueda
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      // Limpiar estado al cerrar
      setInputValue('');
      setResult(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Manejo de tecla Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleReset = () => {
    setInputValue('');
    setResult(null);
    setIsProcessing(false);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleExecuteScan = async (codeToScan?: string) => {
    const targetCode = (codeToScan !== undefined ? codeToScan : inputValue).trim();
    if (!targetCode) return;

    setIsProcessing(true);
    try {
      const scanResult = await processBarcode(targetCode, products);
      setResult(scanResult);
    } catch (err) {
      setResult({
        status: 'INVALID_CODE',
        code: targetCode,
        product: null,
        error: 'Ocurrió un error inesperado al procesar el código.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecuteScan();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center shadow-xs">
              <ScanLine size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Escanear producto</h2>
              <p className="text-xs text-gray-500">Lector USB / Bluetooth o ingreso manual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-colors"
            title="Cerrar (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Input de captura */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Código de barras (EAN / GTIN)
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-gray-400 pointer-events-none">
                <BarcodeIcon size={20} />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (result) setResult(null); // Limpiar resultado previo al cambiar texto
                }}
                onKeyDown={handleKeyDown}
                placeholder="Escanee o ingrese código y presione Enter..."
                autoComplete="off"
                spellCheck={false}
                className="w-full pl-11 pr-24 py-3 bg-gray-50/60 hover:bg-gray-50 focus:bg-white border border-gray-300 focus:border-teal-500 rounded-xl text-base font-mono font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
              />
              <div className="absolute right-2 flex items-center gap-1">
                {inputValue && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Borrar campo"
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleExecuteScan()}
                  disabled={!inputValue.trim() || isProcessing}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 text-white disabled:text-gray-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Search size={14} />
                  <span>Buscar</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>El lector dispara la búsqueda automáticamente al presionar Enter.</span>
              <span className="font-mono text-gray-500 font-semibold">{normalizeBarcode(inputValue).length} dígitos</span>
            </p>
          </div>

          {/* Estado de error de validación */}
          {result?.status === 'INVALID_CODE' && (
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 animate-in fade-in duration-150">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">
                    {result.error || 'Código de barras inválido.'}
                  </p>
                  <p className="text-xs text-amber-700">
                    Código recibido: <span className="font-mono font-bold">{result.code}</span>
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 underline underline-offset-2"
                >
                  <RotateCcw size={13} />
                  Volver a escanear
                </button>
              </div>
            </div>
          )}

          {/* Estado: PRODUCTO ENCONTRADO (Farmacia del Este) */}
          {result?.status === 'FOUND_LOCAL' && result.product && (
            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Producto Encontrado</span>
                </div>
                <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-semibold">
                  {result.code}
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                  {result.product.name}
                  {result.product.concentration && ` ${result.product.concentration}`}
                  {result.product.unit && ` ${result.product.unit}`}
                </h3>

                {result.product.activeIngredient && (
                  <p className="text-sm font-medium text-emerald-950">
                    <span className="text-emerald-700 text-xs uppercase font-semibold">Principio activo: </span>
                    {result.product.activeIngredient}
                  </p>
                )}

                <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs text-gray-600 pt-1">
                  {result.product.presentation && (
                    <div>
                      <span className="text-gray-400">Presentación: </span>
                      <span className="font-medium text-gray-700">{result.product.presentation}</span>
                    </div>
                  )}
                  {result.product.laboratory && (
                    <div>
                      <span className="text-gray-400">Laboratorio: </span>
                      <span className="font-medium text-gray-700">{result.product.laboratory}</span>
                    </div>
                  )}
                  {result.product.category && (
                    <div>
                      <span className="text-gray-400">Categoría: </span>
                      <span className="font-medium text-gray-700">{result.product.category}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenProduct(result.product!);
                  }}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <ExternalLink size={16} />
                  <span>Ver / Editar producto</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={15} />
                  <span>Escanear otro</span>
                </button>
              </div>
            </div>
          )}

          {/* Estado: PRODUCTO IDENTIFICADO (Catálogo de Referencia) */}
          {result?.status === 'FOUND_REFERENCE' && result.referenceProduct && (
            <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                  <Database size={16} className="text-blue-600" />
                  <span>Producto Identificado</span>
                </div>
                <span className="text-xs font-mono bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md font-semibold">
                  {result.code}
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                  {result.referenceProduct.name}
                  {result.referenceProduct.concentration && ` ${result.referenceProduct.concentration}`}
                </h3>

                {result.referenceProduct.activeIngredient && (
                  <p className="text-sm font-medium text-blue-950">
                    <span className="text-blue-700 text-xs uppercase font-semibold">Principio activo: </span>
                    {result.referenceProduct.activeIngredient}
                  </p>
                )}

                <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs text-gray-600 pt-1">
                  {result.referenceProduct.presentation && (
                    <div>
                      <span className="text-gray-400">Presentación: </span>
                      <span className="font-medium text-gray-700">{result.referenceProduct.presentation}</span>
                    </div>
                  )}
                  {result.referenceProduct.laboratory && (
                    <div>
                      <span className="text-gray-400">Laboratorio: </span>
                      <span className="font-medium text-gray-700">{result.referenceProduct.laboratory}</span>
                    </div>
                  )}
                  {result.referenceProduct.pharmaceuticalForm && (
                    <div>
                      <span className="text-gray-400">Forma: </span>
                      <span className="font-medium text-gray-700">{result.referenceProduct.pharmaceuticalForm}</span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-blue-800 leading-relaxed bg-white/60 p-2.5 rounded-lg border border-blue-100">
                Este producto <span className="font-semibold">todavía no está agregado</span> al catálogo de Farmacia del Este. Puedes darlo de alta ahora con sus datos precargados.
              </p>

              {/* Botones de acción */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAddReferenceProduct(result.referenceProduct!);
                  }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <PlusCircle size={16} />
                  <span>Agregar al catálogo</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-white hover:bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={15} />
                  <span>Escanear otro</span>
                </button>
              </div>
            </div>
          )}

          {/* Estado: PRODUCTO NO ENCONTRADO */}
          {result?.status === 'NOT_FOUND' && (
            <div className="p-5 rounded-2xl bg-orange-50/60 border border-orange-200/80 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-orange-100 pb-3">
                <div className="flex items-center gap-2 text-orange-900 font-bold text-xs uppercase tracking-wider">
                  <Package size={16} className="text-orange-600" />
                  <span>Producto no encontrado</span>
                </div>
                <span className="text-xs font-mono bg-orange-100 text-orange-900 px-2 py-0.5 rounded-md font-semibold">
                  {result.code}
                </span>
              </div>

              <p className="text-xs text-orange-800 leading-relaxed">
                El código <span className="font-mono font-bold text-orange-950">{result.code}</span> es válido pero no existe en el catálogo actual ni en las bases de referencia. Puedes darlo de alta manualmente.
              </p>

              {/* Botones de acción */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const codeToAdd = result.code;
                    onClose();
                    onAddProduct(codeToAdd);
                  }}
                  className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <PlusCircle size={16} />
                  <span>Alta manual</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-white hover:bg-orange-50 text-orange-900 border border-orange-200 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={15} />
                  <span>Escanear otro</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Farmacia del Este • Gestión de códigos EAN/GTIN</span>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 font-medium px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

