import { useState, useRef } from 'react';
import { X, Plus, Upload, FileText, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

interface AddQueryModalProps {
  onClose: () => void;
}

type Mode = 'choose' | 'manual' | 'csv';

const ASSIGNEES = ['Aarav Sharma', 'Priya Patel', 'Rohit Mehta', 'Sneha Iyer', 'Vikram Nair', 'Ananya Reddy', 'Karan Malhotra', 'Divya Joshi'];

function today() {
  return new Date().toISOString().split('T')[0];
}

export function AddQueryModal({ onClose }: AddQueryModalProps) {
  const [mode, setMode] = useState<Mode>('choose');

  // Manual form
  const [emails, setEmails] = useState<string[]>(['']);
  const [queryText, setQueryText] = useState('');
  const [queryDate, setQueryDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assigneeOpen, setAssigneeOpen] = useState(false);

  // CSV form
  const [csvType, setCsvType] = useState<'conference-lead' | 'query-lead' | ''>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addEmail = () => setEmails((prev) => [...prev, '']);
  const updateEmail = (idx: number, val: string) =>
    setEmails((prev) => prev.map((e, i) => (i === idx ? val : e)));
  const removeEmail = (idx: number) =>
    setEmails((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const filteredAssignees = ASSIGNEES.filter(a =>
    a.toLowerCase().includes(assigneeQuery.toLowerCase())
  );

  const handleManualSubmit = () => {
    const missingEmail = !emails[0]?.trim();
    const missingQuery = !queryText.trim();
    if (missingEmail || missingQuery) {
      toast.error(`${missingEmail ? 'Email' : ''}${missingEmail && missingQuery ? ' and ' : ''}${missingQuery ? 'Query' : ''} ${missingEmail && missingQuery ? 'are' : 'is'} required.`);
      return;
    }
    const date = queryDate || today();
    toast.success(`Query added for ${date}.`);
    onClose();
  };

  const handleCsvUpload = () => {
    if (!csvType) { toast.error('Please select a lead type.'); return; }
    if (!csvFile) { toast.error('Please choose a CSV file.'); return; }
    toast.success(`"${csvFile.name}" uploaded successfully.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Add Query</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Choose mode */}
        {mode === 'choose' && (
          <div className="p-6 flex flex-col gap-3">
            <button
              onClick={() => setMode('manual')}
              className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Add Entry Manually</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Fill in query details via form</p>
              </div>
            </button>
            <button
              onClick={() => setMode('csv')}
              className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-green-50 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                <Upload className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Upload CSV</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Bulk import from a CSV file</p>
              </div>
            </button>
          </div>
        )}

        {/* Manual entry form */}
        {mode === 'manual' && (
          <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

            {/* Email(s) — required */}
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                Email(s) <span className="text-red-500">*</span>
              </label>
              {emails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(idx, e.target.value)}
                    placeholder="user@example.com"
                    className="flex-1 h-8 text-sm"
                  />
                  {emails.length > 1 && (
                    <button onClick={() => removeEmail(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {idx === emails.length - 1 && (
                    <button onClick={addEmail} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors" title="Add another email">
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Query — required */}
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                Query <span className="text-red-500">*</span>
              </label>
              <textarea
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Describe the query…"
                rows={4}
                className="w-full text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Date — optional, defaults to today */}
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Query Date <span className="text-gray-400 font-normal">(defaults to today)</span>
              </label>
              <Input
                type="date"
                value={queryDate}
                onChange={(e) => setQueryDate(e.target.value)}
                placeholder={today()}
                className="h-8 text-sm w-48"
              />
            </div>

            {/* Assignee — searchable */}
            <div className="relative">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Assignee</label>
              <Input
                value={assigneeQuery}
                onChange={(e) => { setAssigneeQuery(e.target.value); setAssignee(''); setAssigneeOpen(true); }}
                onFocus={() => setAssigneeOpen(true)}
                onBlur={() => setTimeout(() => setAssigneeOpen(false), 150)}
                placeholder="Type to search…"
                className="h-8 text-sm"
              />
              {assignee && (
                <span className="absolute right-2.5 top-[2.1rem] text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Check className="h-3 w-3" /> {assignee}
                </span>
              )}
              {assigneeOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {filteredAssignees.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-400">No matches</p>
                  ) : (
                    filteredAssignees.map((a) => (
                      <button
                        key={a}
                        onMouseDown={() => { setAssignee(a); setAssigneeQuery(a); setAssigneeOpen(false); }}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        {a}
                        {assignee === a && <Check className="h-3.5 w-3.5 text-blue-500" />}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setMode('choose')}>Back</Button>
              <Button size="sm" onClick={handleManualSubmit}>Add Entry</Button>
            </div>
          </div>
        )}

        {/* CSV upload form */}
        {mode === 'csv' && (
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Lead Type</label>
              <div className="flex flex-col gap-2">
                {[
                  { value: 'conference-lead', label: 'Conference Lead' },
                  { value: 'query-lead', label: 'Query Lead' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                    {/* Force light-theme checkbox regardless of app theme */}
                    <div
                      onClick={() => setCsvType(csvType === opt.value ? '' : opt.value as 'conference-lead' | 'query-lead')}
                      className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                        csvType === opt.value
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {csvType === opt.value && (
                        <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-none stroke-white stroke-2">
                          <polyline points="1,4 3.5,6.5 9,1" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">CSV File</label>
              <div
                className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                {csvFile ? (
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{csvFile.name}</p>
                ) : (
                  <p className="text-sm text-gray-400">Click to browse or drop a CSV file here</p>
                )}
                <input ref={fileRef} type="file" accept=".csv" className="hidden"
                  onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setMode('choose')}>Back</Button>
              <Button size="sm" onClick={handleCsvUpload}>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Upload
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
