import React, { useState, useEffect } from 'react';
import {
  FileCode2,
  Upload,
  Download,
  RefreshCw,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sliders,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';

export const ExcelAutomation: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'clean' | 'compare' | 'templates'>('clean');

  // Single file cleaning state
  const [file, setFile] = useState<File | null>(null);
  const [inspectData, setInspectData] = useState<any | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<any | null>(null);

  // Cleaning options
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [normalizeDates, setNormalizeDates] = useState(true);
  const [normalizeAmounts, setNormalizeAmounts] = useState(true);
  const [dropEmptyRows, setDropEmptyRows] = useState(true);

  // Compare 2 sheets state
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [compareKey, setCompareKey] = useState('Invoice No');
  const [tolerance, setTolerance] = useState(0.0);
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<any | null>(null);

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const tmpls = await api.getExcelTemplates();
        setTemplates(tmpls);
      } catch (err) {
        console.error(err);
      }
    }
    loadTemplates();
  }, []);

  const handleInspect = async (selectedFile: File) => {
    setFile(selectedFile);
    setInspecting(true);
    setProcessResult(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await api.inspectExcel(formData);
      setInspectData(res);
    } catch (err: any) {
      alert(`Inspection failed: ${err.message}`);
    } finally {
      setInspecting(false);
    }
  };

  const handleProcessClean = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append(
        'options',
        JSON.stringify({
          remove_duplicates: removeDuplicates,
          normalize_dates: normalizeDates,
          normalize_amounts: normalizeAmounts,
          drop_empty_rows: dropEmptyRows,
        })
      );
      const res = await api.processExcel(formData);
      setProcessResult(res);
    } catch (err: any) {
      alert(`Cleaning failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadCleaned = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append(
      'options',
      JSON.stringify({
        remove_duplicates: removeDuplicates,
        normalize_dates: normalizeDates,
        normalize_amounts: normalizeAmounts,
        drop_empty_rows: dropEmptyRows,
      })
    );
    await api.downloadCleanedExcel(formData, `Cleaned_${file.name}`);
  };

  const handleCompare = async () => {
    if (!fileA || !fileB) return;
    setComparing(true);
    try {
      const formData = new FormData();
      formData.append('file_a', fileA);
      formData.append('file_b', fileB);
      formData.append('key_column', compareKey);
      formData.append('tolerance', tolerance.toString());
      const res = await api.compareExcelSheets(formData);
      setCompareResult(res);
    } catch (err: any) {
      alert(`Comparison failed: ${err.message}`);
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-none">
      {/* Top Header */}
      <div className="bg-white dark:bg-[#131C2E] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-brand-600" />
            <span>Excel Workflow Automation Engine</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-detects columns, normalizes dirty accounting data, removes duplicates, compares 2 sheets & runs templates.
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveMode('clean')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeMode === 'clean' ? 'bg-navy-900 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-navy-900'
            }`}
          >
            Clean & Normalize
          </button>
          <button
            onClick={() => setActiveMode('compare')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeMode === 'compare' ? 'bg-navy-900 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-navy-900'
            }`}
          >
            2-Sheet Compare
          </button>
          <button
            onClick={() => setActiveMode('templates')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeMode === 'templates' ? 'bg-navy-900 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-navy-900'
            }`}
          >
            Saved Templates
          </button>
        </div>
      </div>

      {/* MODE 1: CLEAN & NORMALIZE */}
      {activeMode === 'clean' && (
        <div className="space-y-5">
          {/* File Upload Zone */}
          <div className="bg-white dark:bg-[#131C2E] p-6 rounded-xl border-2 border-dashed border-slate-300 text-center hover:border-brand-500 transition-colors">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-slate-800">Upload Excel or CSV File to Inspect Schema</h3>
            <p className="text-[11px] text-slate-500 mt-1">Supports XLSX, XLS, and CSV files</p>

            <label className="mt-3 inline-flex items-center px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-xs transition-colors">
              <span>Choose File</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleInspect(e.target.files[0]);
                }}
                className="hidden"
              />
            </label>
            {file && <p className="text-xs font-bold text-brand-600 mt-2">Selected: {file.name}</p>}
          </div>

          {inspecting && (
            <div className="bg-white dark:bg-[#131C2E] p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-600" />
              Scanning column data types, nulls, and duplicate records...
            </div>
          )}

          {inspectData && (
            <div className="space-y-5">
              {/* Inspection Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Rows</p>
                  <p className="text-xl font-bold text-navy-950 mt-1">{inspectData.total_rows}</p>
                </div>
                <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Columns</p>
                  <p className="text-xl font-bold text-navy-950 mt-1">{inspectData.total_columns}</p>
                </div>
                <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-rose-600 uppercase">Duplicate Rows</p>
                  <p className="text-xl font-bold text-rose-600 mt-1">{inspectData.duplicate_rows}</p>
                </div>
                <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-brand-600 uppercase">Sheets Detected</p>
                  <p className="text-xl font-bold text-brand-600 mt-1">{inspectData.available_sheets.length}</p>
                </div>
              </div>

              {/* Automation Rules Configuration */}
              <div className="bg-white dark:bg-[#131C2E] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-3">
                  Configurable Transformation Pipeline
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={removeDuplicates}
                      onChange={(e) => setRemoveDuplicates(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <div>
                      <p className="font-bold text-slate-800">Deduplicate</p>
                      <p className="text-[10px] text-slate-400">Eliminate identical rows</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={normalizeDates}
                      onChange={(e) => setNormalizeDates(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <div>
                      <p className="font-bold text-slate-800">Normalize Dates</p>
                      <p className="text-[10px] text-slate-400">Convert to YYYY-MM-DD</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={normalizeAmounts}
                      onChange={(e) => setNormalizeAmounts(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <div>
                      <p className="font-bold text-slate-800">Normalize Currency</p>
                      <p className="text-[10px] text-slate-400">Strip symbols, handle brackets</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dropEmptyRows}
                      onChange={(e) => setDropEmptyRows(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <div>
                      <p className="font-bold text-slate-800">Drop Empty Rows</p>
                      <p className="text-[10px] text-slate-400">Remove all-blank lines</p>
                    </div>
                  </label>
                </div>

                <div className="mt-4 flex items-center justify-end space-x-2">
                  <button
                    onClick={handleProcessClean}
                    disabled={processing}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : ''}`} />
                    <span>{processing ? 'Processing...' : 'Run Pipeline & Preview'}</span>
                  </button>

                  <button
                    onClick={handleDownloadCleaned}
                    className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Cleaned XLSX</span>
                  </button>
                </div>
              </div>

              {/* Cleaned Data Preview Table */}
              {processResult && (
                <div className="bg-white dark:bg-[#131C2E] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                  <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
                        Cleaned Data Live Preview
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {processResult.stats.duplicates_removed} duplicates removed • {processResult.stats.date_columns_normalized.length} date cols parsed • {processResult.stats.amount_columns_normalized.length} amount cols normalized
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {processResult.total_rows} Clean Rows
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-[#1A253A] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold sticky top-0">
                        <tr>
                          {processResult.columns.map((c: string) => (
                            <th key={c} className="py-2.5 px-3 whitespace-nowrap">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {processResult.preview.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]">
                            {processResult.columns.map((c: string) => (
                              <td key={c} className="py-2 px-3 whitespace-nowrap text-slate-800">
                                {row[c] !== null ? String(row[c]) : '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: 2-SHEET COMPARE */}
      {activeMode === 'compare' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#131C2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
              Compare Two Excel Sheets / Ledgers
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A253A]">
                <label className="block text-xs font-bold text-slate-700 mb-1">Sheet A (Master / Books)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setFileA(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-navy-900 file:text-white"
                />
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A253A]">
                <label className="block text-xs font-bold text-slate-700 mb-1">Sheet B (External / Statement)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setFileB(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-navy-900 file:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unique Key Column (e.g. Invoice No / ID)</label>
                <input
                  type="text"
                  value={compareKey}
                  onChange={(e) => setCompareKey(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Difference Tolerance (₹)</label>
                <input
                  type="number"
                  value={tolerance}
                  onChange={(e) => setTolerance(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            <button
              onClick={handleCompare}
              disabled={comparing || !fileA || !fileB}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              {comparing ? 'Comparing Datasets...' : 'Run 2-Sheet Comparison'}
            </button>
          </div>

          {compareResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Common Keys</p>
                  <p className="text-xl font-bold text-navy-950 mt-1">{compareResult.common_records}</p>
                </div>
                <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase">100% Identical</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{compareResult.identical_records}</p>
                </div>
                <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-rose-600 uppercase">Cell Modifications</p>
                  <p className="text-xl font-bold text-rose-600 mt-1">{compareResult.modified_records_count}</p>
                </div>
                <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-amber-600 uppercase">Missing in Sheet B</p>
                  <p className="text-xl font-bold text-amber-600 mt-1">{compareResult.only_in_sheet_a_count}</p>
                </div>
              </div>

              {/* Sample Modified Records */}
              {compareResult.modified_samples.length > 0 && (
                <div className="bg-white dark:bg-[#131C2E] rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-2">
                    Discrepancy Detail (Cell-level Modifications)
                  </h4>
                  <div className="space-y-2">
                    {compareResult.modified_samples.map((mod: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#1A253A] border border-slate-200 dark:border-slate-800 text-xs">
                        <span className="font-bold text-brand-700">Key: {mod.key}</span>
                        <div className="mt-1 space-y-1 text-slate-600 dark:text-slate-400">
                          {Object.entries(mod.modifications).map(([col, diff]: [string, any]) => (
                            <div key={col} className="flex items-center space-x-2 text-[11px]">
                              <span className="font-semibold text-slate-800">{col}:</span>
                              <span>Sheet A: <b className="text-navy-900">{String(diff.sheet_a)}</b></span>
                              <span>vs</span>
                              <span>Sheet B: <b className="text-rose-600">{String(diff.sheet_b)}</b></span>
                              {diff.diff !== undefined && (
                                <span className="text-rose-600 font-bold">(Diff: ₹{diff.diff})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODE 3: REUSABLE TEMPLATES */}
      {activeMode === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="bg-white dark:bg-[#131C2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                  {tmpl.workflow_type}
                </span>
                <span className="text-[10px] text-slate-400">Created: {tmpl.created_at?.slice(0, 10)}</span>
              </div>
              <h4 className="text-xs font-bold text-navy-950">{tmpl.name}</h4>
              <p className="text-[11px] text-slate-500">{tmpl.description}</p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Run
                </span>
                <button
                  onClick={() => {
                    setActiveMode('clean');
                    alert(`Loaded template: ${tmpl.name}`);
                  }}
                  className="px-3 py-1 bg-navy-900 hover:bg-navy-800 text-white rounded text-[11px] font-semibold"
                >
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
