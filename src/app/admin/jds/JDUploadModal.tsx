'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { parseJobDescriptionFileAction } from './actions';
import { ParsedJobDescription } from '@/lib/jd-doc-parser';

interface JDUploadModalProps {
  onParsed?: (data: ParsedJobDescription) => void;
  triggerButton?: React.ReactNode;
}

export default function JDUploadModal({ onParsed, triggerButton }: JDUploadModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectedFile = (selected: File) => {
    setError(null);
    const lower = selected.name.toLowerCase();
    if (!lower.endsWith('.docx') && !lower.endsWith('.doc')) {
      setError('Please select a valid Word document (.docx or .doc).');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      return;
    }
    setFile(selected);
  };

  const handleUploadAndParse = async () => {
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await parseJobDescriptionFileAction(formData);

      if (res.success && res.data) {
        setSuccessInfo(`Successfully parsed "${res.filename}"!`);
        if (onParsed) {
          onParsed(res.data);
          setTimeout(() => {
            setIsOpen(false);
            setFile(null);
            setSuccessInfo(null);
          }, 600);
        } else {
          // If invoked from the catalog page, store in sessionStorage and redirect to /admin/jds/new
          sessionStorage.setItem('pendingParsedJd', JSON.stringify(res.data));
          router.push('/admin/jds/new');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse document. Please check the file format.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {triggerButton ? (
        <div onClick={() => setIsOpen(true)}>{triggerButton}</div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer"
        >
          <UploadCloud className="w-4 h-4 text-blue-800" />
          <span>Upload Word JD (.docx/.doc)</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4 text-blue-800" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Upload & Parse Job Description
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Supports Microsoft Word format (.docx and .doc)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setFile(null);
                  setError(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successInfo && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{successInfo}</span>
                </div>
              )}

              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 mb-1">
                  <UploadCloud className="w-6 h-6" />
                </div>

                {file ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900">{file.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB • Click or drag another file to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">
                      Drag & drop your Word JD document here
                    </p>
                    <p className="text-[11px] text-slate-500">
                      or click to browse from your computer (.docx or .doc)
                    </p>
                  </div>
                )}
              </div>

              {/* Structure Explanation */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">What will be extracted:</div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  <li><strong>Job Title</strong> & <strong>Reports To</strong> (auto-linked to supervisor JD)</li>
                  <li><strong>Position Summary / Overview</strong></li>
                  <li><strong>Major Responsibilities & Duties</strong> (individual bullet items)</li>
                  <li><strong>Skills & Attributes</strong> and <strong>Qualifications</strong></li>
                </ul>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setFile(null);
                  setError(null);
                }}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUploadAndParse}
                disabled={!file || isLoading}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing Document...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Parse into JD Editor</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
