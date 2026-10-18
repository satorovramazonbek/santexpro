import React, { useState } from 'react';
import { X, Flame, ShieldCheck, UserCheck } from 'lucide-react';
import { api } from '../api/client';
import { User } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register({
          username,
          password,
          email,
          first_name: firstName,
        });
        onLoginSuccess(res.user);
        onClose();
      } else {
        const res = await api.login(username, password);
        onLoginSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Xatolik yuz berdi. Qayta urinib ko‘ring.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login('usta_xasan', 'santex2026');
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError("Demo foydalanuvchiga ulanishda xatolik: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login('admin', 'admin2026');
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError("Admin sifatida ulanishda xatolik: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="liquid-glass-menu rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">SantexPro Tizimi</h2>
              <p className="text-xs text-blue-100">Muhandislar va santexniklar platformasi</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex border-b border-slate-200 mb-6">
            <button
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                !isRegister ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Kirish
            </button>
            <button
              onClick={() => { setIsRegister(true); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                isRegister ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Ro‘yxatdan o‘tish
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ism va familiya</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Xasan Muhandis"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Foydalanuvchi logini (username)</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="usta_xasan"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Elektron pochta (ixtiyoriy)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="xasan@santexpro.uz"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Maxfiy parol</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors shadow-xs disabled:opacity-50"
            >
              {loading ? "Bajarilmoqda..." : isRegister ? "Ro‘yxatdan o‘tish" : "Tizimga kirish"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 space-y-2">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-colors border border-slate-200"
            >
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Usta-muhandis sifatida kirish (<b>usta_xasan</b>)</span>
            </button>

            <button
              type="button"
              onClick={handleAdminLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-semibold py-2.5 rounded-lg text-xs transition-colors border border-indigo-200"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Tizim administratori sifatida kirish (<b>admin</b>)</span>
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              Admin hisobida Sayt Admin Paneli ochiladi va katalog/jihozlar boshqariladi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
