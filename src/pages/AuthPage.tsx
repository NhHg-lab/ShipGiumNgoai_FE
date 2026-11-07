import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, registerCustomer, registerDriver } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'LOGIN' | 'REGISTER_CUSTOMER' | 'REGISTER_DRIVER'>('LOGIN');
  const [phone, setPhone] = useState('0901111111');
  const [password, setPassword] = useState('123456');
  const [fullName, setFullName] = useState('');
  const [cccdNumber, setCccdNumber] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('59-X1 686.86');
  const [cashOnHand, setCashOnHand] = useState(300000);
  const [cccdFrontPath, setCccdFrontPath] = useState('captured_cccd_front.jpg');
  const [cccdBackPath, setCccdBackPath] = useState('captured_cccd_back.jpg');
  const [agreedCashTerms, setAgreedCashTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleQuickLogin = async (demoPhone: string, targetRoute: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(demoPhone, '123456');
      navigate(targetRoute);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (tab === 'LOGIN') {
        const u = await login(phone, password);
        if (u.role === 'ADMIN') navigate('/admin');
        else if (u.role === 'DRIVER') navigate('/driver');
        else navigate('/customer');
      } else if (tab === 'REGISTER_CUSTOMER') {
        await registerCustomer(phone, fullName, password);
        navigate('/customer');
      } else {
        await registerDriver({
          phone,
          fullName,
          password,
          cccdNumber,
          cccdFrontPath,
          cccdBackPath,
          vehiclePlate,
          cashOnHand,
          agreedCashTerms,
        });
        setSuccessMsg(
          'Đã gửi hồ sơ đăng ký tài xế. Hệ thống đã ghi nhận và chờ quản trị viên hẹn phỏng vấn trực tiếp.'
        );
        setTimeout(() => navigate('/driver'), 1200);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra, vui lòng kiểm tra lại');
    } finally {
      setSubmitting(false);
    }
  };

  const fillBlacklistedDriverTest = () => {
    setTab('REGISTER_DRIVER');
    setPhone('0907778888');
    setFullName('Trần Văn Gian Lận');
    setCccdNumber('079099888777');
    setPassword('123456');
    setError(null);
  };

  const inputClass =
    'w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900';

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
      {/* Quick Demo Switcher */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900">
            Đăng nhập nhanh (Tài khoản mẫu JWT)
          </span>
          <span className="text-[11px] text-slate-400">Mật khẩu mặc định: 123456</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin('0901111111', '/customer')}
            className="p-2.5 rounded-md border border-slate-200 hover:border-slate-900 text-left transition bg-slate-50/50 hover:bg-white"
          >
            <div className="text-xs font-semibold text-slate-900">Khách hàng</div>
            <div className="text-[11px] text-slate-500 mt-0.5">0901111111</div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('0902222222', '/driver')}
            className="p-2.5 rounded-md border border-slate-200 hover:border-slate-900 text-left transition bg-slate-50/50 hover:bg-white"
          >
            <div className="text-xs font-semibold text-slate-900">Tài xế (Shipper)</div>
            <div className="text-[11px] text-slate-500 mt-0.5">0902222222</div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('0909999999', '/admin')}
            className="p-2.5 rounded-md border border-slate-200 hover:border-slate-900 text-left transition bg-slate-50/50 hover:bg-white"
          >
            <div className="text-xs font-semibold text-slate-900">Quản trị viên</div>
            <div className="text-[11px] text-slate-500 mt-0.5">0909999999</div>
          </button>
        </div>
      </div>

      {/* Auth Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-md text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setTab('LOGIN');
              setError(null);
            }}
            className={`py-2 rounded transition ${
              tab === 'LOGIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('REGISTER_CUSTOMER');
              setPhone('');
              setFullName('');
              setError(null);
            }}
            className={`py-2 rounded transition ${
              tab === 'REGISTER_CUSTOMER'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đăng ký khách
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('REGISTER_DRIVER');
              setPhone('');
              setFullName('');
              setCccdNumber('');
              setError(null);
            }}
            className={`py-2 rounded transition ${
              tab === 'REGISTER_DRIVER'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đăng ký tài xế
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-xs">
              {successMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Số điện thoại</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901111111"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mật khẩu</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {tab !== 'LOGIN' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Họ và tên</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên đầy đủ"
                className={inputClass}
              />
            </div>
          )}

          {tab === 'REGISTER_DRIVER' && (
            <div className="space-y-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <span>
                  Hồ sơ yêu cầu CCCD + SĐT và hẹn phỏng vấn trực tiếp trước khi kích hoạt.
                </span>
                <button
                  type="button"
                  onClick={fillBlacklistedDriverTest}
                  className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-medium shrink-0"
                >
                  Thử CCCD Blacklist
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Số CCCD</label>
                  <input
                    type="text"
                    required
                    value={cccdNumber}
                    onChange={(e) => setCccdNumber(e.target.value)}
                    placeholder="12 số CCCD"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Biển số xe</label>
                  <input
                    type="text"
                    required
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tiền mặt mang theo
                  </label>
                  <input
                    type="number"
                    required
                    min={200000}
                    step={50000}
                    value={cashOnHand}
                    onChange={(e) => setCashOnHand(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ảnh CCCD mặt trước
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) =>
                      setCccdFrontPath(e.target.files?.[0]?.name || 'captured_cccd_front.jpg')
                    }
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-200 file:bg-slate-50 file:text-slate-700 file:font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ảnh CCCD mặt sau
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) =>
                      setCccdBackPath(e.target.files?.[0]?.name || 'captured_cccd_back.jpg')
                    }
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-200 file:bg-slate-50 file:text-slate-700 file:font-medium"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedCashTerms}
                  onChange={(e) => setAgreedCashTerms(e.target.checked)}
                  required
                  className="mt-0.5 rounded border-slate-300 text-slate-900"
                />
                <span>
                  Cam kết chuẩn bị sẵn 200.000đ – 500.000đ tiền mặt để ứng mua hàng cho các cụ và tuân thủ quy tắc ứng xử (vi phạm 3 lần sẽ bị khóa vĩnh viễn).
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium text-sm transition"
          >
            {submitting
              ? 'Đang xử lý...'
              : tab === 'LOGIN'
              ? 'Đăng nhập'
              : tab === 'REGISTER_CUSTOMER'
              ? 'Tạo tài khoản khách hàng'
              : 'Gửi hồ sơ đăng ký tài xế'}
          </button>
        </form>
      </div>
    </div>
  );
};
