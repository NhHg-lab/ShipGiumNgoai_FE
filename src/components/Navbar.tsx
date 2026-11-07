import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Wallet } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const formatVnd = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';

  const navItemClass = (path: string) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition ${
      location.pathname.startsWith(path)
        ? 'bg-slate-900 text-white'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-semibold text-xs tracking-tight">
              SGN
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                Ship Giùm Ngoại
              </span>
              <span className="hidden md:inline text-xs text-slate-400">
                18:00 – 23:00
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <Link to="/customer" className={navItemClass('/customer')}>
              Khách hàng
            </Link>
            <Link to="/driver" className={navItemClass('/driver')}>
              Tài xế
            </Link>
            {user?.role === 'ADMIN' && (
              <Link to="/admin" className={navItemClass('/admin')}>
                Quản trị
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-xs text-slate-700">
                <Wallet className="w-3.5 h-3.5 text-slate-500" />
                {user.role === 'DRIVER' ? (
                  <span>
                    Ví tài xế: <strong className="font-semibold text-slate-900">{formatVnd(user.driverWalletBalance)}</strong>
                  </span>
                ) : (
                  <span>
                    Ví hoàn tiền: <strong className="font-semibold text-slate-900">{formatVnd(user.customerWalletBalance)}</strong>
                  </span>
                )}
              </div>

              <div className="text-right hidden md:block">
                <div className="text-xs font-medium text-slate-900 leading-none">{user.fullName}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {user.role} · {user.phone}
                </div>
              </div>

              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
