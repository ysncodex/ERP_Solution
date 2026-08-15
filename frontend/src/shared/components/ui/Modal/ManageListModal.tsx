import { useMemo, useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import type { ManageListModalProps } from './Modal.types';

export function ManageListModal({
  isOpen,
  onClose,
  title,
  items,
  emptyText = 'No items yet.',
  onRename,
  onDelete,
}: ManageListModalProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const handleClose = () => {
    setEditing(null);
    setDraft('');
    onClose();
  };

  const startEdit = (value: string) => {
    setEditing(value);
    setDraft(value);
  };

  const saveEdit = () => {
    if (!editing) return;
    onRename(editing, draft);
    setEditing(null);
    setDraft('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500">Edit or remove saved options</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="max-h-[380px] overflow-y-auto">
            {sorted.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">{emptyText}</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {sorted.map((value) => {
                  const isEditing = editing?.toLowerCase() === value.toLowerCase();
                  return (
                    <li key={value} className="flex items-center gap-2 p-3 hover:bg-slate-50">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                          />
                        ) : (
                          <div className="text-sm font-semibold text-slate-700 truncate">{value}</div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={saveEdit}
                            className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50"
                            title="Save"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => { setEditing(null); setDraft(''); }}
                            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(value)}
                            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => onDelete(value)}
                            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-5">
          <button
            onClick={handleClose}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
