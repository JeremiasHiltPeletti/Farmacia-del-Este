import React, { useState } from 'react';
import { X, Upload, Play, CheckCircle, AlertTriangle, FileJson, Info } from 'lucide-react';
import { ImportRow, DryRunResult, DryRunRow } from './types';
import { executeDryRun, executeImport } from './importService';

interface ReferenceImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferenceImporterModal: React.FC<ReferenceImporterModalProps> = ({ isOpen, onClose }) => {
  const [jsonText, setJsonText] = useState('');
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleDryRun = async () => {
    try {
      setIsProcessing(true);
      const parsed: Partial<ImportRow>[] = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error('El JSON debe ser un array de objetos.');
      
      const result = await executeDryRun(parsed);
      setDryRunResult(result);
    } catch (err: any) {
      alert(`Error al procesar JSON: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!dryRunResult) return;
    try {
      setIsProcessing(true);
      const count = await executeImport(dryRunResult);
      setImportSuccessCount(count);
    } catch (err: any) {
      alert(`Error al importar: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setJsonText('');
    setDryRunResult(null);
    setImportSuccessCount(null);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3 text-gray-800">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Importador de Referencias</h2>
              <p className="text-xs text-gray-500 font-medium">Herramienta administrativa para actualizar la base de medicamentos.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
          
          {importSuccessCount !== null ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Importación Exitosa</h3>
              <p className="text-gray-600">Se han procesado e insertado/actualizado {importSuccessCount} registros en el Catálogo de Referencia.</p>
              <button 
                onClick={reset}
                className="mt-4 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-colors"
              >
                Importar otro archivo
              </button>
            </div>
          ) : !dryRunResult ? (
            // Formulario de entrada
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-sm flex gap-3">
                <Info size={20} className="shrink-0 text-blue-500" />
                <p>
                  Pega un array JSON con el dataset a importar. El campo identificador (<code className="font-bold bg-blue-100 px-1 rounded">barcode</code>, <code className="font-bold bg-blue-100 px-1 rounded">code</code>, <code className="font-bold bg-blue-100 px-1 rounded">ean</code> o <code className="font-bold bg-blue-100 px-1 rounded">gtin</code>) es obligatorio.
                  No se modificará el catálogo real de la farmacia.
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <FileJson size={16} /> Array JSON
                </label>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder="[\n  {\n    &#34;barcode&#34;: &#34;7791234567890&#34;,\n    &#34;commercialName&#34;: &#34;Nombre...&#34;\n  }\n]"
                  className="w-full h-64 p-4 font-mono text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  spellCheck={false}
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleDryRun}
                  disabled={isProcessing || !jsonText.trim()}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  <Play size={16} />
                  <span>Analizar y Simular (Dry Run)</span>
                </button>
              </div>
            </div>
          ) : (
            // Resultados del Dry Run
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{dryRunResult.totalRecords}</p>
                </div>
                <div className="bg-green-50 border border-green-100 p-4 rounded-2xl">
                  <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Nuevos</p>
                  <p className="text-2xl font-bold text-green-700">{dryRunResult.newRecords}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Actualizables</p>
                  <p className="text-2xl font-bold text-blue-700">{dryRunResult.updatableRecords}</p>
                </div>
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Rechazados</p>
                  <p className="text-xl font-bold text-red-700">
                    {dryRunResult.invalidRecords + dryRunResult.duplicatedInFile + dryRunResult.conflictingRecords}
                  </p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 z-10">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-gray-600">Código</th>
                        <th className="px-4 py-3 font-semibold text-gray-600">Nombre</th>
                        <th className="px-4 py-3 font-semibold text-gray-600">Acción</th>
                        <th className="px-4 py-3 font-semibold text-gray-600">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dryRunResult.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-xs">{row.normalizedBarcode || row.parsedRow.barcode || '-'}</td>
                          <td className="px-4 py-2 truncate max-w-[200px]">{row.parsedRow.commercialName || '-'}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                              ${row.action === 'NEW' ? 'bg-green-100 text-green-700' : 
                                row.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' : 
                                row.action === 'UNCHANGED' ? 'bg-gray-100 text-gray-600' :
                                'bg-red-100 text-red-700'}`}
                            >
                              {row.action}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-500 truncate max-w-[200px]">{row.reason || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between border-t border-gray-100 pt-4 mt-6">
                <button
                  onClick={() => setDryRunResult(null)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  Volver / Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={isProcessing || (dryRunResult.newRecords + dryRunResult.updatableRecords === 0)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  <Upload size={16} />
                  <span>Importar {dryRunResult.newRecords + dryRunResult.updatableRecords} registros seguros</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
