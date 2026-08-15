import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Truck, Plus, Pencil, Trash2, X, Phone, Mail, MapPin, StickyNote } from 'lucide-react';
import { suppliersService, type Supplier } from '@/core/api/services';
import { useCanMutate } from '@/shared/hooks';
import { useERP } from '@/core/context/useERP';
import { notifyReadOnlyBlocked } from '@/shared/utils';

function clearFields(setters: {
  setName: (v: string) => void;
  setPhone: (v: string) => void;
  setEmail: (v: string) => void;
  setAddress: (v: string) => void;
  setNotes: (v: string) => void;
}) {
  setters.setName('');
  setters.setPhone('');
  setters.setEmail('');
  setters.setAddress('');
  setters.setNotes('');
}

export default function Suppliers() {
  const canMutate = useCanMutate();
  const { suppliers, refreshCatalogs } = useERP();
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = useCallback(() => {
    clearFields({ setName, setPhone, setEmail, setAddress, setNotes });
    setEditing(null);
    setFormOpen(false);
  }, []);

  const openCreate = () => {
    if (!canMutate) {
      notifyReadOnlyBlocked();
      return;
    }
    setEditing(null);
    clearFields({ setName, setPhone, setEmail, setAddress, setNotes });
    setFormOpen(true);
  };

  const openEdit = (row: Supplier) => {
    if (!canMutate) {
      notifyReadOnlyBlocked();
      return;
    }
    setEditing(row);
    setName(row.name);
    setPhone(row.phone ?? '');
    setEmail(row.email ?? '');
    setAddress(row.address ?? '');
    setNotes(row.notes ?? '');
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canMutate) return;

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName) {
      toast.error('Supplier name is required');
      return;
    }
    if (!trimmedPhone) {
      toast.error('Contact number is required');
      return;
    }
    if (!trimmedAddress) {
      toast.error('Address is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: trimmedName,
        phone: trimmedPhone,
        address: trimmedAddress,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (editing) {
        await suppliersService.update(editing.id, payload);
        toast.success('Supplier updated');
      } else {
        await suppliersService.create(payload);
        toast.success('Supplier added');
      }
      await refreshCatalogs();
      resetForm();
    } catch {
      toast.error(editing ? 'Failed to update supplier' : 'Failed to add supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (row: Supplier) => {
    if (!canMutate) return;
    if (!window.confirm(`Delete supplier "${row.name}"?`)) return;
    try {
      await suppliersService.delete(row.id);
      await refreshCatalogs();
      toast.success('Supplier deleted');
    } catch {
      toast.error('Failed to delete supplier');
    }
  };

  useEffect(() => {
    void refreshCatalogs();
  }, [refreshCatalogs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Truck size={24} className="text-cyan-600" />
            Suppliers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage supplier contact details — used in Product Costs and purchase records.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-700"
        >
          <Plus size={16} />
          Add Supplier
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800">{editing ? 'Edit Supplier' : 'New Supplier'}</h2>
            <button type="button" onClick={resetForm} className="p-2 rounded-lg hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Name *</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase">Contact *</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone or mobile"
                className="mt-1 w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Optional"
                className="mt-1 w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Address *</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional — delivery hours, account number, etc."
                rows={2}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl border border-slate-200">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-semibold disabled:opacity-60"
            >
              {loading ? 'Saving…' : editing ? 'Save Changes' : 'Add Supplier'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {suppliers.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            No suppliers yet. Add one here or from Product Costs — both use the same list.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {suppliers.map((row) => (
              <li key={row.id} className="p-4 flex flex-col sm:flex-row sm:items-start gap-3 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{row.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
                    {row.phone && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone size={14} className="text-slate-400 shrink-0" />
                        {row.phone}
                      </span>
                    )}
                    {row.email && (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail size={14} className="text-slate-400 shrink-0" />
                        {row.email}
                      </span>
                    )}
                    {row.address && (
                      <span className="inline-flex items-center gap-1.5 sm:col-span-2">
                        <MapPin size={14} className="text-slate-400 shrink-0" />
                        {row.address}
                      </span>
                    )}
                  </div>
                  {row.notes && (
                    <p className="mt-2 text-xs text-slate-500 inline-flex items-start gap-1.5">
                      <StickyNote size={12} className="text-slate-400 mt-0.5 shrink-0" />
                      {row.notes}
                    </p>
                  )}
                </div>
                {canMutate && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-white"
                      aria-label={`Edit ${row.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(row)}
                      className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${row.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
