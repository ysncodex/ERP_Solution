import { useState } from 'react';
import { Lock } from 'lucide-react';
import type { ManagerPasswordModalProps } from './Modal.types';
import { validateRolePassword } from '@/shared/utils';

/**
 * ManagerPasswordModal Component
 * Requires owner authorization for sensitive operations by default.
 */
export function ManagerPasswordModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title,
  requiredRole = 'owner',
}: ManagerPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const roleLabel = requiredRole === 'owner' ? 'Owner' : 'Manager';

  const handleSubmit = () => {
    if (validateRolePassword(requiredRole, password)) {
      setPassword('');
      setError('');
      onConfirm();
      onClose();
    } else {
      setError(`Incorrect password. ${roleLabel} authorization required.`);
    }
  };

  const handleClose = () => {
    onClose();
    setPassword('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-amber-100 p-3 rounded-xl text-amber-600">
            <Lock size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500">{roleLabel} authorization required</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
              {roleLabel} Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={`Enter ${roleLabel.toLowerCase()} password`}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
            {error && (
              <p className="text-xs text-rose-500 mt-1 font-medium">{error}</p>
            )}
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 shadow-lg shadow-amber-200 transition-colors"
            >
              Authorize
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
