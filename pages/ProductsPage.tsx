import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ScanLine } from 'lucide-react';
import { useApp } from '../context';
import { Icons } from '../components/Icon.tsx';
import { Product, Role } from '../types';
import { ProductInlineModal } from '../components/ProductInlineModal.tsx';
import { Button } from '../components/Button.tsx';
import { normalizeSearchText } from '../utils';
import { BarcodeScannerModal, normalizeBarcode, ReferenceProduct, ReferenceImporterModal } from '../modules/barcode';

export const ProductsPage: React.FC = () => {
  const { products, deleteProduct, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [preloadedCode, setPreloadedCode] = useState<string>('');
  const [preloadedData, setPreloadedData] = useState<Partial<ReferenceProduct> | undefined>(undefined);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const cleanTerm = searchTerm.trim();
    const normalizedBarcodeTerm = normalizeBarcode(cleanTerm);
    const lowerTerm = normalizeSearchText(cleanTerm);

    return products.filter((p) => {
      // Búsqueda por código de barras comercial
      if (p.code && normalizedBarcodeTerm) {
        const normCode = normalizeBarcode(p.code);
        if (normCode === normalizedBarcodeTerm || normCode.includes(normalizedBarcodeTerm)) {
          return true;
        }
      }
      return (
        normalizeSearchText(p.name).includes(lowerTerm) ||
        (p.category && normalizeSearchText(p.category).includes(lowerTerm)) ||
        (p.activeIngredient && normalizeSearchText(p.activeIngredient).includes(lowerTerm)) ||
        (p.concentration && normalizeSearchText(p.concentration).includes(lowerTerm))
      );
    });
  }, [products, searchTerm]);

  const handleOpenModal = (product?: Product, initialBarcode?: string, initialData?: Partial<ReferenceProduct>) => {
    setEditingProduct(product || null);
    setPreloadedCode(initialBarcode || '');
    setPreloadedData(initialData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setPreloadedCode('');
    setPreloadedData(undefined);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const executeDelete = async () => {
    if (deleteId) {
      await deleteProduct(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Catálogo de Productos</h1>
          <p className="text-gray-400 font-medium mt-1">Gestiona el inventario y catálogo progresivo de la farmacia.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {currentUser?.role === 'ADMIN' && (
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setIsImporterOpen(true)}
              className="flex-1 sm:flex-none border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Importar Referencias
            </Button>
          )}
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setIsScannerOpen(true)}
            icon={<ScanLine size={18} className="text-teal-600" />}
            className="flex-1 sm:flex-none border-teal-200 text-teal-700 hover:bg-teal-50"
          >
            Escanear producto
          </Button>
          <Button
            size="lg"
            onClick={() => handleOpenModal()}
            icon={<Icons.Plus size={18} />}
            className="flex-1 sm:flex-none"
          >
            Alta Rápida
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <label htmlFor="products-search" className="sr-only">Buscar productos</label>
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              id="products-search"
              name="products-search"
              type="text"
              placeholder="Buscar por nombre, principio activo, código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-gray-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Producto</th>
                <th className="p-4 font-medium">Categoría</th>
                <th className="p-4 font-medium">Proveedor</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    No se encontraron productos.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">
                        {product.name} {product.concentration} {product.unit}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {[product.activeIngredient, product.presentation, product.laboratory].filter(Boolean).join(' · ')}
                      </div>
                      {product.code && <div className="text-xs text-gray-400 font-mono mt-0.5">Cód: {product.code}</div>}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {product.habitualSupplier || '-'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="icon"
                          size="icon"
                          onClick={() => handleOpenModal(product)}
                          icon={<Icons.Pencil size={16} />}
                        />
                        {currentUser.role === Role.ADMIN && (
                          <Button
                            variant="iconDanger"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                            icon={<Icons.Delete size={16} />}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <ProductInlineModal
          onClose={handleCloseModal}
          editingProduct={editingProduct}
          initialCode={preloadedCode}
          initialData={preloadedData}
        />
      )}

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        onOpenProduct={(product) => {
          handleOpenModal(product);
        }}
        onAddProduct={(code) => {
          handleOpenModal(undefined, code);
        }}
        onAddReferenceProduct={(refProduct) => {
          handleOpenModal(undefined, refProduct.code, refProduct);
        }}
      />

      <ReferenceImporterModal 
        isOpen={isImporterOpen} 
        onClose={() => setIsImporterOpen(false)} 
      />

      {/* Delete Confirmation Modal (Standardized - rounded-[2rem]) */}
      {deleteId && createPortal(
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 touch-none">
            <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 flex flex-col items-center">
               <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 shadow-sm">
                  <Icons.Delete size={24} />
               </div>
               <h3 className="text-xl font-bold text-center text-gray-800 mb-2">¿Eliminar producto?</h3>
               <p className="text-gray-500 text-center mb-6 text-sm">
                  Esta acción no se puede deshacer. El producto será eliminado del catálogo.
               </p>
               <div className="flex gap-3 w-full">
                  <Button 
                    variant="secondary"
                    size="lg"
                    fullWidth
                    onClick={() => setDeleteId(null)}
                  >
                     Cancelar
                  </Button>
                  <Button 
                    variant="danger"
                    size="lg"
                    fullWidth
                    onClick={executeDelete}
                  >
                     Eliminar
                  </Button>
               </div>
            </div>
         </div>,
         document.body
      )}
    </div>
  );
};
