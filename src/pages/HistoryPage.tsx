import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  ExternalLink,
  Search,
  Trash2,
  ArrowUpDown,
  HardDrive,
  PlusCircle,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';
import { useEstate } from '../context/EstateContext';
import { MLModelType } from '../types/estate';
import { formatCurrency, formatDateShort, formatNumber } from '../utils/formatters';
import { downloadSamplePropertyCSVTemplate } from '../utils/csvSchema';
import { CSVImportModal } from '../components/csv/CSVImportModal';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    history,
    deleteHistoryItem,
    clearHistory,
    loadHistoryItemIntoResults,
    exportHistoryCSV,
    currency,
  } = useEstate();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modelFilter, setModelFilter] = useState<'all' | MLModelType>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  const filteredHistory = useMemo(() => {
    return history
      .filter((item) => {
        if (modelFilter !== 'all' && item.primaryModel !== modelFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchArea = String(item.inputs.area).includes(q);
          const matchFurn = item.inputs.furnishingstatus.toLowerCase().includes(q);
          const matchModel = item.primaryModel.toLowerCase().includes(q);
          const matchPrice = String(item.primaryPrice).includes(q);
          return matchArea || matchFurn || matchModel || matchPrice;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        if (sortOrder === 'oldest') {
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        }
        if (sortOrder === 'highest') {
          return b.primaryPrice - a.primaryPrice;
        }
        return a.primaryPrice - b.primaryPrice;
      });
  }, [history, modelFilter, searchQuery, sortOrder]);

  const handleExportCSV = () => {
    exportHistoryCSV(filteredHistory);
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#FF6B4A]">
            <HardDrive className="w-3.5 h-3.5" />
            <span>Browser Local Persistence · 12-Feature Housing.csv Schema</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#11151C] dark:text-[#F1F5F9] mt-1 font-display">
            Property Valuation History
          </h1>
          <p className="text-sm text-[#5E6D82] dark:text-[#94A3B8] mt-1">
            Import property datasets from CSV, search historical ML valuations, or export prediction
            history to CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={downloadSamplePropertyCSVTemplate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#5E6D82] dark:text-[#CBD5E1] bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30 hover:border-[#FF6B4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#FF6B4A]" />
            <span>CSV Template</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            data-testid="open-csv-import-btn"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#11151C] dark:text-white bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30 hover:border-[#FF6B4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#FF6B4A]" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            disabled={filteredHistory.length === 0}
            onClick={handleExportCSV}
            data-testid="export-history-csv-btn"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#11151C] dark:text-white bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30 hover:border-[#FF6B4A] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#FF6B4A]" />
            <span>Export CSV ({filteredHistory.length})</span>
          </button>

          {history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/predict')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#FF6B4A] hover:bg-[#E85838] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Prediction</span>
          </button>
        </div>
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#78879B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by square footage, furnishing status, model, or price..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/30 text-[#11151C] dark:text-white focus:outline-none focus:border-[#FF6B4A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter by ML Algorithm */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/25">
            {(
              [
                { key: 'all', label: 'All Models' },
                { key: 'linear_regression', label: 'Linear Regression' },
                { key: 'decision_tree', label: 'Decision Tree' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setModelFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  modelFilter === tab.key
                    ? 'bg-[#FF6B4A] text-white'
                    : 'text-[#5E6D82] dark:text-[#94A3B8] hover:text-[#11151C] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#78879B]" />
            <select
              aria-label="Sort prediction history"
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as 'newest' | 'oldest' | 'highest' | 'lowest')
              }
              className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/30 text-[#11151C] dark:text-[#CBD5E1]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Valuation</option>
              <option value="lowest">Lowest Valuation</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Data Table or Empty State */}
      {filteredHistory.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 text-center space-y-4">
          <div className="text-lg font-bold text-[#11151C] dark:text-white font-display">
            No Matching Valuation Records
          </div>
          <p className="text-xs text-[#5E6D82] dark:text-[#94A3B8] max-w-md mx-auto">
            {history.length === 0
              ? 'Your local prediction history is currently empty. Run your first property valuation to store and compare estimates here.'
              : 'No prediction entries matched your current search or algorithm filter.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-[#11151C] dark:text-white bg-slate-100 dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/30 hover:border-[#FF6B4A] cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#FF6B4A]" />
              <span>Import CSV File</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/predict')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF6B4A] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Log First Valuation</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/25 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#78879B]/20 bg-slate-50/70 dark:bg-[#11151C]/60 text-[#5E6D82] dark:text-[#94A3B8]">
                  <th className="py-3.5 px-4 font-semibold">Date & Timestamp</th>
                  <th className="py-3.5 px-4 font-semibold">Property Specs</th>
                  <th className="py-3.5 px-4 font-semibold">Amenities & Furnishing</th>
                  <th className="py-3.5 px-4 font-semibold">Selected ML Model</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Estimated Price</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Quick Compare</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-[#78879B]/20">
                {filteredHistory.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-[#11151C]/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono tabular-nums text-[#5E6D82] dark:text-[#94A3B8] whitespace-nowrap">
                      {formatDateShort(item.timestamp)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#11151C] dark:text-white font-mono tabular-nums">
                        {formatNumber(item.inputs.area)} sq ft
                      </div>
                      <div className="text-[11px] text-[#5E6D82] dark:text-[#94A3B8]">
                        {item.inputs.bedrooms} Beds · {item.inputs.bathrooms} Baths ·{' '}
                        {item.inputs.stories} Stories · {item.inputs.parking} Parking
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5E6D82] dark:text-[#CBD5E1]">
                      <span className="capitalize font-medium">{item.inputs.furnishingstatus}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="text-[11px] text-[#78879B]">
                        {[
                          item.inputs.mainroad === 'yes' && 'Main Road',
                          item.inputs.airconditioning === 'yes' && 'AC',
                          item.inputs.prefarea === 'yes' && 'Pref Area',
                          item.inputs.basement === 'yes' && 'Basement',
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Standard'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#11151C] dark:text-white whitespace-nowrap">
                      {item.primaryModel === 'linear_regression'
                        ? 'Linear Regression'
                        : 'Decision Tree Regressor'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-[#FF6B4A] whitespace-nowrap">
                      {formatCurrency(item.primaryPrice, currency)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#5E6D82] dark:text-[#CBD5E1] whitespace-nowrap">
                      {item.secondaryPrice ? (
                        <span title={`Alternative (${item.secondaryModel})`}>
                          {formatCurrency(item.secondaryPrice, currency)}
                        </span>
                      ) : (
                        <span className="text-[#78879B]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            loadHistoryItemIntoResults(item);
                            navigate('/results');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[#FF6B4A] hover:bg-[#FF6B4A]/10 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteHistoryItem(item.id)}
                          aria-label="Delete history record"
                          className="p-1 rounded-md text-[#78879B] hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSelectSingleProperty={() => navigate('/predict')}
      />
    </div>
  );
};
