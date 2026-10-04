import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context';
import { Icons } from './Icon.tsx';
import { Product } from '../types';
import { Button } from './Button.tsx';
import { generateUUID } from '../utils';
import { normalizeBarcode, isBarcodeAssignedToOtherProduct, ReferenceProduct } from '../modules/barcode';

interface ProductInlineModalProps {
  onClose: () => void;
  onProductCreated?: (product: Product) => void;
  initialName?: string;
  initialCode?: string;
  initialData?: Partial<ReferenceProduct>;
  editingProduct?: Product | null;
}

const normalizeText = (text?: string) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\bmg\b/g, ' mg ')
    .replace(/\bx\s*(\d+)/g, ' x$1 ')
    .replace(/\bcomp\b|\bcomprimidos\b/g, ' comp ')
    .replace(/\s+/g, ' ')
    .trim();
};

const SOLID_FORMS = ['comprimidos', 'cápsulas', 'sobres', 'ampollas', 'óvulos'];
const LIQUID_FORMS = ['jarabe', 'gotas', 'solución', 'suspensión', 'spray', 'inyectable', 'frasco'];
const SEMISOLID_FORMS = ['crema', 'gel', 'pomada'];

const normalizePharmaceuticalForm = (val: string) => {
  const lower = val.toLowerCase().trim();
  if (!lower) return '';
  if (/^comp/.test(lower)) return 'comprimidos';
  if (/^c[aá]ps/.test(lower)) return 'cápsulas';
  if (/^jar/.test(lower)) return 'jarabe';
  if (/^got/.test(lower)) return 'gotas';
  if (/^crem/.test(lower)) return 'crema';
  if (/^sol/.test(lower)) return 'solución';
  if (/^susp/.test(lower)) return 'suspensión';
  if (/^amp/.test(lower)) return 'ampollas';
  if (/^sob/.test(lower)) return 'sobres';
  if (/^pom/.test(lower)) return 'pomada';
  if (/^iny/.test(lower)) return 'inyectable';
  if (/^[oó]v/.test(lower)) return 'óvulos';
  return val;
};

const normalizePresentationQuantity = (form: string, qty: string) => {
  const trimmed = qty.trim();
  if (!trimmed) return '';
  const isNumeric = /^\d+$/.test(trimmed);
  
  const normForm = normalizePharmaceuticalForm(form);
  
  if (SOLID_FORMS.includes(normForm)) {
    if (isNumeric) return `x${trimmed}`;
  } else if (LIQUID_FORMS.includes(normForm)) {
    if (isNumeric) return `${trimmed} ml`;
  } else if (SEMISOLID_FORMS.includes(normForm)) {
    if (isNumeric) return `${trimmed} g`;
  }
  return trimmed;
};

const validatePresentationQuantity = (form: string, qty: string) => {
  const lowerQty = qty.toLowerCase();
  const normForm = normalizePharmaceuticalForm(form);
  
  if (SOLID_FORMS.includes(normForm) && (lowerQty.includes('ml') || lowerQty.includes(' g'))) {
    return 'Inconsistencia: Forma sólida con unidad de volumen/peso.';
  }
  if (LIQUID_FORMS.includes(normForm) && (lowerQty.includes('x') || lowerQty.includes(' g'))) {
    return 'Inconsistencia: Forma líquida con unidad incorrecta.';
  }
  if (SEMISOLID_FORMS.includes(normForm) && (lowerQty.includes('x') || lowerQty.includes('ml'))) {
    return 'Inconsistencia: Forma semisólida con unidad incorrecta.';
  }
  return null;
};

const parsePresentation = (pres: string) => {
  if (!pres) return { form: '', qty: '' };
  const lower = pres.toLowerCase();
  const allForms = [...SOLID_FORMS, ...LIQUID_FORMS, ...SEMISOLID_FORMS];
  
  for (const form of allForms) {
    if (lower.startsWith(form)) {
      return {
        form: form,
        qty: pres.substring(form.length).trim()
      };
    }
  }
  
  const parts = pres.split(' ');
  if (parts.length > 1) {
     const possibleForm = normalizePharmaceuticalForm(parts[0]);
     if (allForms.includes(possibleForm)) {
        return { form: possibleForm, qty: parts.slice(1).join(' ') };
     }
  }
  
  return { form: '', qty: pres };
};

export const ProductInlineModal: React.FC<ProductInlineModalProps> = ({ 
  onClose, 
  onProductCreated, 
  initialName = '', 
  initialCode = '',
  initialData,
  editingProduct = null 
}) => {
  const { addProduct, updateProduct, products } = useApp();
  const [internalEditingProduct, setInternalEditingProduct] = useState<Product | null>(editingProduct);
  const [showAdvanced, setShowAdvanced] = useState(!!editingProduct || !!initialCode || !!initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeDuplicateError, setCodeDuplicateError] = useState<Product | null>(null);
  
  const initialParsedPresentation = parsePresentation(internalEditingProduct?.presentation || initialData?.presentation || '');

  const [formData, setFormData] = useState({
    code: internalEditingProduct?.code || initialData?.code || initialCode || '',
    name: internalEditingProduct?.name || initialData?.name || initialName,
    activeIngredient: internalEditingProduct?.activeIngredient || initialData?.activeIngredient || '',
    concentration: internalEditingProduct?.concentration || initialData?.concentration || '',
    unit: internalEditingProduct?.unit || '',
    pharmaceuticalForm: initialParsedPresentation.form || initialData?.pharmaceuticalForm || '',
    presentationQuantity: initialParsedPresentation.qty,
    laboratory: internalEditingProduct?.laboratory || initialData?.laboratory || '',
    category: internalEditingProduct?.category || '',
    habitualSupplier: internalEditingProduct?.habitualSupplier || '',
    price: internalEditingProduct?.price?.toString() || '0',
    stock: internalEditingProduct?.stock?.toString() || '0',
    description: internalEditingProduct?.description || '',
    requiresLotAndExpiration: internalEditingProduct?.requiresLotAndExpiration || false,
    isTraceable: internalEditingProduct?.isTraceable || false,
  });

  // Prevención de duplicados y sugerencias
  const { strongDuplicates, suggestions } = useMemo(() => {
    if (!formData.name && !formData.code) return { strongDuplicates: [], suggestions: [] };
    
    const normName = normalizeText(formData.name);
    const normCode = normalizeBarcode(formData.code || '');
    
    if (normName.length < 3 && !normCode) return { strongDuplicates: [], suggestions: [] };

    const strong: Product[] = [];
    const weak: Product[] = [];

    products.forEach(p => {
      if (internalEditingProduct && p.id === internalEditingProduct.id) return;
      
      const pNormName = normalizeText(p.name);
      const pCode = p.code ? normalizeBarcode(p.code) : '';
      
      let isStrong = false;
      let isWeak = false;

      // 1. Coincidencia exacta de código
      if (normCode && pCode && normCode === pCode) {
        isStrong = true;
      } 
      // 2. Coincidencia fuerte de nombre (>= 4 caracteres)
      else if (normName.length >= 4 && pNormName === normName) {
        const normConc = normalizeText(formData.concentration);
        const pNormConc = normalizeText(p.concentration);
        const normPres = normalizeText(`${formData.pharmaceuticalForm} ${formData.presentationQuantity}`.trim());
        const pNormPres = normalizeText(p.presentation);
        
        // Si coinciden concentración y presentación (o están vacíos)
        if ((!normConc || normConc === pNormConc) && (!normPres || normPres === pNormPres)) {
           isStrong = true;
        } else {
           isWeak = true;
        }
      } 
      // 3. Coincidencia débil (subcadena)
      else if (normName.length >= 3 && (pNormName.includes(normName) || normName.includes(pNormName))) {
        isWeak = true;
      }

      if (isStrong) {
        strong.push(p);
      } else if (isWeak) {
        weak.push(p);
      }
    });

    return { 
      strongDuplicates: strong.slice(0, 2), 
      suggestions: weak.filter(w => !strong.find(s => s.id === w.id)).slice(0, 4) 
    };
  }, [formData.name, formData.code, formData.concentration, formData.pharmaceuticalForm, formData.presentationQuantity, products, internalEditingProduct]);

  const handleUseExisting = (product: Product) => {
    if (onProductCreated) {
      onProductCreated(product);
    } else {
      const parsed = parsePresentation(product.presentation || '');
      setInternalEditingProduct(product);
      setFormData({
        code: product.code || '',
        name: product.name,
        activeIngredient: product.activeIngredient || '',
        concentration: product.concentration || '',
        unit: product.unit || '',
        pharmaceuticalForm: parsed.form,
        presentationQuantity: parsed.qty,
        laboratory: product.laboratory || '',
        category: product.category || '',
        habitualSupplier: product.habitualSupplier || '',
        price: product.price?.toString() || '0',
        stock: product.stock?.toString() || '0',
        description: product.description || '',
        requiresLotAndExpiration: product.requiresLotAndExpiration || false,
        isTraceable: product.isTraceable || false,
      });
      setShowAdvanced(true);
    }
  };

  const capitalizeFirstLetter = (str: string) => {
    if (!str) return '';
    const trimmed = str.trim();
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const handleSubmit = async (e: React.FormEvent, keepOpen = false) => {
    e.preventDefault();
    if (!formData.name || !formData.category) return;

    setIsSubmitting(true);

    try {
      const normalizedCode = normalizeBarcode(formData.code || '');

      // Validación estricta de unicidad de código
      if (normalizedCode) {
        const existingWithCode = isBarcodeAssignedToOtherProduct(
          products,
          normalizedCode,
          internalEditingProduct?.id
        );
        if (existingWithCode) {
          setCodeDuplicateError(existingWithCode);
          setIsSubmitting(false);
          return;
        }
      }

      const finalPresentation = `${formData.pharmaceuticalForm} ${formData.presentationQuantity}`.trim();

      const productData: Product = {
        id: internalEditingProduct ? internalEditingProduct.id : generateUUID(),
        code: normalizedCode,
        name: capitalizeFirstLetter(formData.name) || '',
        activeIngredient: capitalizeFirstLetter(formData.activeIngredient) || '',
        concentration: formData.concentration || '',
        unit: formData.unit || '',
        presentation: finalPresentation || '',
        laboratory: formData.laboratory || '',
        category: capitalizeFirstLetter(formData.category) || '',
        habitualSupplier: formData.habitualSupplier || '',
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock, 10) || 0,
        description: formData.description || '',
        requiresLotAndExpiration: formData.requiresLotAndExpiration || false,
        isTraceable: formData.isTraceable || false,
        status: internalEditingProduct?.status || 'ACTIVE',
        createdAt: internalEditingProduct?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      // Remove undefined fields just in case
      Object.keys(productData).forEach(key => {
        if (productData[key as keyof Product] === undefined) {
          delete productData[key as keyof Product];
        }
      });

      if (internalEditingProduct) {
        await updateProduct(productData);
      } else {
        await addProduct(productData);
      }
      
      if (onProductCreated) {
        onProductCreated(productData);
      }
      
      if (keepOpen) {
        // Reset form for next product
        setFormData({
          code: '',
          name: '',
          activeIngredient: '',
          concentration: '',
          unit: '',
          pharmaceuticalForm: '',
          presentationQuantity: '',
          laboratory: '',
          category: formData.category, // Keep category
          habitualSupplier: formData.habitualSupplier, // Keep supplier
          price: '0',
          stock: '0',
          description: '',
          requiresLotAndExpiration: false,
          isTraceable: false,
        });
        setInternalEditingProduct(null);
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Hubo un error al guardar el producto. Por favor, intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl p-6 md:p-8 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4 shrink-0">
          <h2 className="text-2xl font-bold text-gray-800">
            {internalEditingProduct ? 'Editar Producto' : 'Alta Rápida de Producto'}
          </h2>
          <Button
            variant="icon"
            size="icon"
            onClick={onClose}
            icon={<Icons.Close size={24} />}
            className="rounded-full"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar -mx-2 px-2">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Alerta de Código Duplicado */}
            {codeDuplicateError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 animate-in fade-in duration-150">
                <div className="flex items-start gap-3">
                  <Icons.AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                  <div className="w-full">
                    <h4 className="text-sm font-bold text-red-800">Este código ya pertenece a otro producto</h4>
                    <p className="text-xs text-red-600 mb-3">No se permiten códigos de barras duplicados en el catálogo de la farmacia.</p>
                    <div className="bg-white border border-red-100 rounded-lg p-3 flex justify-between items-center shadow-xs">
                      <div>
                        <div className="font-bold text-gray-800 text-sm">
                          {codeDuplicateError.name} {codeDuplicateError.concentration} {codeDuplicateError.unit}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          Código: {codeDuplicateError.code} {codeDuplicateError.laboratory ? ` · ${codeDuplicateError.laboratory}` : ''}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setCodeDuplicateError(null);
                          handleUseExisting(codeDuplicateError);
                        }}
                        className="bg-red-100 text-red-700 hover:bg-red-200 font-semibold"
                      >
                        {onProductCreated ? 'Seleccionar producto' : 'Abrir producto'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Alerta de Duplicados Fuertes */}
            {!internalEditingProduct && !isSubmitting && strongDuplicates.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Icons.AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                  <div className="w-full">
                    <h4 className="text-sm font-bold text-red-800">Ya existe un producto muy similar</h4>
                    <p className="text-xs text-red-600 mb-3">Revisa si es el que intentas crear para evitar duplicados.</p>
                    <div className="space-y-2">
                      {strongDuplicates.map(p => (
                        <div key={p.id} className="bg-white border border-red-100 rounded-lg p-3 flex justify-between items-center shadow-sm">
                          <div>
                            <div className="font-bold text-gray-800 text-sm">{p.name} {p.concentration}</div>
                            <div className="text-xs text-gray-500">{p.presentation} {p.laboratory ? ` - ${p.laboratory}` : ''}</div>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleUseExisting(p)}
                            className="bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            {onProductCreated ? 'Seleccionar' : 'Editar'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sugerencias Relacionadas */}
            {!internalEditingProduct && !isSubmitting && strongDuplicates.length === 0 && suggestions.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Icons.Search className="text-blue-500 shrink-0 mt-0.5" size={20} />
                  <div className="w-full">
                    <h4 className="text-sm font-bold text-blue-800">Productos similares encontrados</h4>
                    <p className="text-xs text-blue-600 mb-3">Quizás estabas buscando alguno de estos:</p>
                    <div className="space-y-2">
                      {suggestions.map(p => (
                        <div key={p.id} className="bg-white border border-blue-100 rounded-lg p-3 flex justify-between items-center shadow-sm">
                          <div>
                            <div className="font-bold text-gray-800 text-sm">{p.name} {p.concentration}</div>
                            <div className="text-xs text-gray-500">{p.presentation} {p.laboratory ? ` - ${p.laboratory}` : ''}</div>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleUseExisting(p)}
                            className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            {onProductCreated ? 'Seleccionar' : 'Editar'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Campos Prioritarios */}
            <div className="space-y-5">
              <h4 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">Campos Principales</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="field-le0s7m" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre Comercial *</label>
                  <input id="field-le0s7m" name="field-le0s7m"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-gray-800 capitalize"
                    placeholder="Ej: Ibupirac"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="field-66uxc9" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Principio Activo</label>
                  <input id="field-66uxc9" name="field-66uxc9"
                    type="text"
                    value={formData.activeIngredient}
                    onChange={(e) => setFormData({ ...formData, activeIngredient: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-gray-800 capitalize"
                    placeholder="Ej: Ibuprofeno"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="field-hnzbl7" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Concentración</label>
                  <input id="field-hnzbl7" name="field-hnzbl7"
                    type="text"
                    value={formData.concentration}
                    onChange={(e) => setFormData({ ...formData, concentration: e.target.value.replace(/[^0-9.,/]/g, '') })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    placeholder="Ej: 400"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="field-9y31u9" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Unidad</label>
                  <input id="field-9y31u9" name="field-9y31u9"
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value.replace(/[^a-zA-Z\s%]/g, '') })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    placeholder="Ej: mg"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-4">
                  <label htmlFor="field-rija36" className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Forma Farmacéutica</label>
                  <input id="field-rija36" name="field-rija36"
                    type="text"
                    list="pharmaceutical-forms"
                    value={formData.pharmaceuticalForm}
                    onChange={(e) => setFormData({ ...formData, pharmaceuticalForm: e.target.value.replace(/[^a-zA-Z\sáéíóúÁÉÍÓÚñÑ]/g, '') })}
                    onBlur={(e) => setFormData({ ...formData, pharmaceuticalForm: normalizePharmaceuticalForm(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    placeholder="Ej: comprimidos, jarabe..."
                  />
                  <datalist id="pharmaceutical-forms">
                    <option value="comprimidos" />
                    <option value="cápsulas" />
                    <option value="jarabe" />
                    <option value="gotas" />
                    <option value="crema" />
                    <option value="gel" />
                    <option value="pomada" />
                    <option value="ampollas" />
                    <option value="sobres" />
                    <option value="solución" />
                    <option value="suspensión" />
                    <option value="inyectable" />
                  </datalist>
                </div>
                <div className="space-y-1.5 sm:col-span-4">
                  <label htmlFor="field-i8vq6o" className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Cantidad / Presentación</label>
                  <input id="field-i8vq6o" name="field-i8vq6o"
                    type="text"
                    value={formData.presentationQuantity}
                    onChange={(e) => setFormData({ ...formData, presentationQuantity: e.target.value })}
                    onBlur={(e) => setFormData({ ...formData, presentationQuantity: normalizePresentationQuantity(formData.pharmaceuticalForm, e.target.value) })}
                    className={`w-full px-4 py-2.5 rounded-xl border ${validatePresentationQuantity(formData.pharmaceuticalForm, formData.presentationQuantity) ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-200 focus:ring-teal-500/20 focus:border-teal-500'} focus:outline-none focus:ring-2 transition-all`}
                    placeholder={
                      SOLID_FORMS.includes(normalizePharmaceuticalForm(formData.pharmaceuticalForm)) ? 'Ej: x10, x30' :
                      LIQUID_FORMS.includes(normalizePharmaceuticalForm(formData.pharmaceuticalForm)) ? 'Ej: 15 ml, 120 ml' :
                      SEMISOLID_FORMS.includes(normalizePharmaceuticalForm(formData.pharmaceuticalForm)) ? 'Ej: 20 g, 30 g' :
                      'Ej: x10, 120 ml'
                    }
                  />
                  {validatePresentationQuantity(formData.pharmaceuticalForm, formData.presentationQuantity) ? (
                    <p className="text-[10px] text-red-500 font-medium">{validatePresentationQuantity(formData.pharmaceuticalForm, formData.presentationQuantity)}</p>
                  ) : (
                    <p className="text-[10px] text-gray-400">
                      {SOLID_FORMS.includes(normalizePharmaceuticalForm(formData.pharmaceuticalForm)) ? 'Ej: x10, x20, x30' :
                       LIQUID_FORMS.includes(normalizePharmaceuticalForm(formData.pharmaceuticalForm)) ? 'Ej: 15 ml, 120 ml' :
                       SEMISOLID_FORMS.includes(normalizePharmaceuticalForm(formData.pharmaceuticalForm)) ? 'Ej: 20 g, 30 g' :
                       'Cantidad o volumen'}
                    </p>
                  )}
                </div>
                <div className="sm:col-span-12 bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center gap-3">
                  <Icons.Info size={18} className="text-gray-400 shrink-0" />
                  <p className="text-sm text-gray-600">
                    Resultado final: <span className="font-bold text-gray-800">{`${formData.pharmaceuticalForm} ${formData.presentationQuantity}`.trim() || '-'}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="field-87qwe9" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Laboratorio</label>
                  <input id="field-87qwe9" name="field-87qwe9"
                    type="text"
                    value={formData.laboratory}
                    onChange={(e) => setFormData({ ...formData, laboratory: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    placeholder="Ej: Roemmers"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="field-uoqm3s" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Categoría *</label>
                  <input id="field-uoqm3s" name="field-uoqm3s"
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value.replace(/[^a-zA-Z\sáéíóúÁÉÍÓÚñÑ]/g, '') })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-gray-800 capitalize"
                    placeholder="Ej: Analgésicos"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="field-0y5637" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Código de Barras (EAN / GTIN)</label>
                <input id="field-0y5637" name="field-0y5637"
                  type="text"
                  value={formData.code}
                  onChange={(e) => {
                    setCodeDuplicateError(null);
                    setFormData({ ...formData, code: e.target.value });
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono text-sm transition-all"
                  placeholder="Ej: 7798112991585"
                />
              </div>
            </div>

            {/* Toggle Campos Adicionales */}
            <div className="pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                icon={showAdvanced ? <Icons.ChevronUp size={18} /> : <Icons.ChevronDown size={18} />}
              >
                {showAdvanced ? 'Ocultar campos adicionales' : 'Mostrar campos adicionales'}
              </Button>
            </div>

            {/* Campos Adicionales */}
            {showAdvanced && (
              <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-1.5">
                  <label htmlFor="field-we7dbj" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Proveedor Habitual</label>
                  <input id="field-we7dbj" name="field-we7dbj"
                    type="text"
                    value={formData.habitualSupplier}
                    onChange={(e) => setFormData({ ...formData, habitualSupplier: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-gray-800 capitalize"
                    placeholder="Ej: Droguería Sur"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="field-1hdtm6" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Precio ($)</label>
                    <input id="field-1hdtm6" name="field-1hdtm6"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value.replace(/[^0-9.]/g, '') })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="field-pfq1eo" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stock Actual</label>
                    <input id="field-pfq1eo" name="field-pfq1eo"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-6 pt-2">
                  <label htmlFor="field-sltv80" className="flex items-center gap-2 cursor-pointer">
                    <input id="field-sltv80" name="field-sltv80"
                      type="checkbox"
                      checked={formData.requiresLotAndExpiration}
                      onChange={(e) => setFormData({ ...formData, requiresLotAndExpiration: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">Requiere Lote/Vto</span>
                  </label>
                  <label htmlFor="field-ii5wqx" className="flex items-center gap-2 cursor-pointer">
                    <input id="field-ii5wqx" name="field-ii5wqx"
                      type="checkbox"
                      checked={formData.isTraceable}
                      onChange={(e) => setFormData({ ...formData, isTraceable: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">Es Trazable</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notas / Descripción</div>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none h-24 transition-all"
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="pt-6 mt-6 border-t border-gray-100 shrink-0 flex justify-end gap-4">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onClose}
          >
            Cancelar
          </Button>
          {!internalEditingProduct && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={isSubmitting}
              onClick={(e) => {
                const form = document.getElementById('product-form') as HTMLFormElement;
                if (form.checkValidity()) {
                  // We'll handle this in a custom way
                  handleSubmit(e as any, true);
                } else {
                  form.reportValidity();
                }
              }}
            >
              Guardar y añadir otro
            </Button>
          )}
          <Button
            type="submit"
            form="product-form"
            size="lg"
            disabled={isSubmitting}
            icon={isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin block" /> : undefined}
          >
            {isSubmitting ? 'Guardando...' : (internalEditingProduct ? 'Guardar Cambios' : 'Crear Producto')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
