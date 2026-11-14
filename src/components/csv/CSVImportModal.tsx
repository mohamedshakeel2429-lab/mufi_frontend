import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Play,
  Sparkles,
  Upload,
  X,
  ArrowRight,
} from 'lucide-react';
import {
  CSVParseResult,
  ParsedCSVPropertyRow,
  PROPERTY_SCHEMA_COLUMNS,
  downloadSamplePropertyCSVTemplate,
  parsePropertyCSV,
} from '../../utils/csvSchema';
import { MLModelType, PropertyInput } from '../../types/estate';
import { useEstate } from '../../context/EstateContext';
import { mlEngine } from '../../services/mlEngine';
import { formatCurrency, formatNumber } from '../../utils/formatters';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSingleProperty?: (inputs: PropertyInput, model?: MLModelType) => void;
  onBatchImported?: (count: number) => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  onSelectSingleProperty,
  onBatchImported,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    selectedModel,
    currency,
    importCSVRowsToHistory,
    setCurrentInputs,
    setSelectedModel,
    addToast,
  } = useEstate();

  const [fileName, setFileName] = useState<string>('');
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [batchModel, setBatchModel] = useState<MLModelType>(selectedModel);
  const [includeQuickCompare, setIncludeQuickCompare] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileContent = (name: string, content: string) => {
    setFileName(name);
    const result = parsePropertyCSV(content);
    setParseResult(result);

    if (result.validRows.length > 0) {
      addToast(
        'CSV Parsed Successfully',
        `Validated ${result.validRows.length} property ${
          result.validRows.length === 1 ? 'row' : 'rows'
        } from "${name}".`,
        'info'
      );
    } else if (result.errors.length > 0) {
      addToast('CSV Schema Error', result.errors[0].message, 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      handleFileContent(file.name, text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      handleFileContent(file.name, text);
    };
    reader.readAsText(file);
  };

  const handleLoadRowIntoForm = (row: ParsedCSVPropertyRow) => {
    setCurrentInputs(row.inputs);
    if (row.model) {
      setSelectedModel(row.model);
    }
    if (onSelectSingleProperty) {
      onSelectSingleProperty(row.inputs, row.model);
    }
    addToast(
      'Property Loaded into Form',
      `Applied ${formatNumber(row.inputs.area)} sq.ft. (${row.inputs.bedrooms} Beds, ${
        row.inputs.furnishingstatus
      }) from CSV Row #${row.rowNumber}.`,
      'success'
    );
    onClose();
  };

  const handleBatchImport = () => {
    if (!parseResult || parseResult.validRows.length === 0) return;
    const imported = importCSVRowsToHistory(
      parseResult.validRows,
      batchModel,
      includeQuickCompare
    );
    if (onBatchImported) {
      onBatchImported(imported.length);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#11151C]/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-import-modal-title"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-[#78879B]/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF632B]/12 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-[#FF632B]" />
            </div>
            <div>
              <h2
                id="csv-import-modal-title"
                className="text-lg font-extrabold text-[#11151C] dark:text-[#F1F5F9] font-display"
              >
                Import Property Data from CSV
              </h2>
              <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8]">
                Upload a CSV adhering to the 12-feature Housing.csv schema to populate the form or
                batch-run ML valuations.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close CSV import modal"
            className="p-2 rounded-xl text-[#5E6D82] hover:text-[#11151C] dark:text-[#94A3B8] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#11151C] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Expected Schema Bar + Sample Template Download */}
          <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#11151C] border border-slate-200/80 dark:border-[#78879B]/25 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold text-[#11151C] dark:text-[#F1F5F9]">
                Required Property Schema Columns (12 Features)
              </div>
              <button
                type="button"
                onClick={downloadSamplePropertyCSVTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#FF632B] bg-[#FF632B]/10 hover:bg-[#FF632B]/20 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample CSV Template</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PROPERTY_SCHEMA_COLUMNS.map((col) => {
                const isMissing = parseResult?.missingSchemaColumns.includes(col);
                return (
                  <span
                    key={col}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border ${
                      parseResult
                        ? isMissing
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-white dark:bg-[#181E27] border-slate-200 dark:border-[#78879B]/25 text-[#5E6D82] dark:text-[#CBD5E1]'
                    }`}
                  >
                    {col}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Drag and Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-[#FF632B] bg-[#FF632B]/5'
                : 'border-slate-300 dark:border-[#78879B]/40 hover:border-[#FF632B] bg-[#F8FAFC]/60 dark:bg-[#11151C]/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
              data-testid="csv-file-input"
            />
            <div className="w-12 h-12 rounded-2xl bg-[#FF632B]/10 text-[#FF632B] flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-[#11151C] dark:text-white">
              {fileName ? `Loaded: ${fileName}` : 'Click to select a CSV file or drag & drop here'}
            </div>
            <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8] mt-1">
              Supports Housing.csv format, custom property lists, or exported ESTATIQ AI history
              CSVs
            </p>
          </div>

          {/* Validation Summary & Parsed Rows Preview */}
          {parseResult && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/25">
                <div className="flex items-center gap-2.5 text-xs">
                  {parseResult.validRows.length > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span className="font-bold text-[#11151C] dark:text-white">
                    {parseResult.validRows.length} Valid Property{' '}
                    {parseResult.validRows.length === 1 ? 'Record' : 'Records'} Ready
                  </span>
                  {parseResult.missingSchemaColumns.length > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      ({parseResult.missingSchemaColumns.length} optional/missing columns defaulted)
                    </span>
                  )}
                </div>

                {/* Batch Model Configuration */}
                {parseResult.validRows.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#5E6D82] dark:text-[#94A3B8]">Primary Model:</span>
                      <select
                        value={batchModel}
                        onChange={(e) => setBatchModel(e.target.value as MLModelType)}
                        className="px-2.5 py-1 rounded-lg font-medium bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30 text-[#11151C] dark:text-white"
                      >
                        <option value="linear_regression">Linear Regression</option>
                        <option value="decision_tree">Decision Tree</option>
                      </select>
                    </div>

                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-[#11151C] dark:text-[#CBD5E1]">
                      <input
                        type="checkbox"
                        checked={includeQuickCompare}
                        onChange={(e) => setIncludeQuickCompare(e.target.checked)}
                        className="accent-[#FF632B] rounded"
                      />
                      <span>Include Quick Compare</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Error List if any */}
              {parseResult.errors.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 space-y-1 text-xs text-red-600 dark:text-red-400">
                  {parseResult.errors.slice(0, 5).map((err, i) => (
                    <div key={i}>{err.message}</div>
                  ))}
                </div>
              )}

              {/* Preview Table */}
              {parseResult.validRows.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-[#78879B]/25 overflow-hidden">
                  <div className="max-h-64 overflow-x-auto overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-[#11151C] text-[#5E6D82] dark:text-[#94A3B8] border-b border-slate-200 dark:border-[#78879B]/20">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Row</th>
                          <th className="py-2.5 px-3 font-semibold">Area (sq.ft.)</th>
                          <th className="py-2.5 px-3 font-semibold">Beds/Baths/Stories</th>
                          <th className="py-2.5 px-3 font-semibold">Amenities</th>
                          <th className="py-2.5 px-3 font-semibold">Furnishing</th>
                          <th className="py-2.5 px-3 font-semibold text-right">
                            Est. Price ({batchModel === 'linear_regression' ? 'Linear' : 'Tree'})
                          </th>
                          <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 dark:divide-[#78879B]/20 bg-white dark:bg-[#181E27]">
                        {parseResult.validRows.slice(0, 50).map((row) => {
                          const modelToUse = row.model || batchModel;
                          const previewPred = mlEngine.predict(row.inputs, modelToUse);
                          return (
                            <tr
                              key={row.rowNumber}
                              className="hover:bg-slate-50 dark:hover:bg-[#11151C]/50"
                            >
                              <td className="py-2.5 px-3 font-mono text-[#78879B]">
                                #{row.rowNumber}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-[#11151C] dark:text-white">
                                {formatNumber(row.inputs.area)}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[#5E6D82] dark:text-[#CBD5E1]">
                                {row.inputs.bedrooms}B · {row.inputs.bathrooms}Ba ·{' '}
                                {row.inputs.stories}St · {row.inputs.parking}P
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-[#5E6D82] dark:text-[#94A3B8]">
                                {[
                                  row.inputs.mainroad === 'yes' && 'Road',
                                  row.inputs.airconditioning === 'yes' && 'AC',
                                  row.inputs.prefarea === 'yes' && 'Pref',
                                  row.inputs.basement === 'yes' && 'Bsmt',
                                  row.inputs.guestroom === 'yes' && 'Guest',
                                  row.inputs.hotwaterheating === 'yes' && 'HotW',
                                ]
                                  .filter(Boolean)
                                  .join(', ') || 'None'}
                              </td>
                              <td className="py-2.5 px-3 capitalize text-[#11151C] dark:text-[#CBD5E1]">
                                {row.inputs.furnishingstatus}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-[#FF632B]">
                                {formatCurrency(previewPred.predicted_price, currency, true)}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleLoadRowIntoForm(row)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#11151C] dark:text-white bg-slate-100 dark:bg-[#11151C] hover:bg-[#FF632B] hover:text-white transition-colors cursor-pointer"
                                >
                                  <span>Use in Form</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-[#78879B]/20 bg-[#F8FAFC] dark:bg-[#11151C] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5E6D82] dark:text-[#94A3B8] hover:text-[#11151C] dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            {parseResult && parseResult.validRows.length === 1 && (
              <button
                type="button"
                onClick={() => handleLoadRowIntoForm(parseResult.validRows[0])}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#11151C] dark:text-white bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30 hover:border-[#FF632B] transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-[#FF632B]" />
                <span>Load into Prediction Form</span>
              </button>
            )}

            <button
              type="button"
              disabled={!parseResult || parseResult.validRows.length === 0}
              onClick={handleBatchImport}
              data-testid="confirm-csv-import-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#FF7A45] to-[#FF5520] hover:from-[#FF632B] hover:to-[#E84310] disabled:opacity-40 transition-all shadow-md shadow-[#FF632B]/25 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {parseResult && parseResult.validRows.length > 0
                  ? `Evaluate & Save ${parseResult.validRows.length} ${
                      parseResult.validRows.length === 1 ? 'Property' : 'Properties'
                    } to History`
                  : 'Evaluate & Save to History'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
