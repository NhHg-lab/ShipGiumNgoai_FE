import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { X } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [shiftOpen, setShiftOpen] = useState<boolean>(true);
  const [todayHours, setTodayHours] = useState<string>('18:00 - 23:00');
  const [bannerMsg, setBannerMsg] = useState<string>('');
  const [toast, setToast] = useState<string | null>(null);

  const formatVnd = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';

  const loadAdmin = async () => {
    try {
      const res = await axiosClient.get('/admin/dashboard');
      setData(res.data);
      if (res.data?.shiftConfig) {
        setShiftOpen(res.data.shiftConfig.shiftOpen);
        setTodayHours(res.data.shiftConfig.todayCustomHours);
        if (!bannerMsg) {
          setBannerMsg(res.data.shiftConfig.statusBannerMessage);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAdmin();
    const timer = setInterval(loadAdmin, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveShiftConfig = async (openOverride?: boolean) => {
    const targetOpen = openOverride !== undefined ? openOverride : shiftOpen;
    const defaultMsg = targetOpen
      ? `Hệ thống đang mở ca (${todayHours})`
      : `Tạm nghỉ ca hôm nay, dự kiến mở lại lúc ${todayHours}`;

    await axiosClient.post('/admin/shift-config', {
      shiftOpen: targetOpen,
      todayCustomHours: todayHours,
      statusBannerMessage: bannerMsg || defaultMsg,
    });
    setShiftOpen(targetOpen);
    setBannerMsg(defaultMsg);
    await loadAdmin();
    setToast(
      targetOpen
        ? 'Đã mở ca hoạt động và gửi thông báo cho khách hàng đăng ký chờ.'
        : 'Đã chuyển sang trạng thái tạm đóng ca.'
    );
  };

  const handleVerifyDriver = async (profileId: number, status: 'APPROVED' | 'REJECTED') => {
    await axiosClient.post(`/admin/drivers/${profileId}/verify`, {
      status,
      interviewNotes:
        status === 'APPROVED'
          ? 'Đã phỏng vấn trực tiếp và duyệt hồ sơ'
          : 'Không đạt phỏng vấn',
    });
    await loadAdmin();
    setToast(`Đã cập nhật hồ sơ tài xế #${profileId}: ${status}`);
  };

  const handleStrikeDriver = async (profileId: number) => {
    const res = await axiosClient.post(`/admin/drivers/${profileId}/strike`, {
      reason: 'Vi phạm quy tắc ứng xử với người bán hoặc khách hàng',
    });
    await loadAdmin();
    setToast(res.data.message);
  };

  const handleApproveVendor = async (vendorId: number, approvalStatus: string, closedToday: boolean) => {
    await axiosClient.post(`/admin/vendors/${vendorId}/approve`, {
      approvalStatus,
      closedToday,
    });
    await loadAdmin();
    setToast('Đã cập nhật trạng thái điểm bán.');
  };

  const handleApproveWithdrawal = async (id: number) => {
    await axiosClient.post(`/admin/withdrawals/${id}/approve`);
    await loadAdmin();
    setToast(`Đã xác nhận chuyển khoản cho yêu cầu rút tiền #${id}.`);
  };

  if (!data) {
    return <div className="p-8 text-center text-xs text-slate-500">Đang tải dữ liệu quản trị...</div>;
  }

  const inputClass =
    'w-full px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-900';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {toast && (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-md flex items-center justify-between text-xs">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Row 1: Shift Config + Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Khung giờ hoạt động (18:00 – 23:00)</h2>
              <p className="text-xs text-slate-400">Điều chỉnh giờ mở ca linh hoạt theo lịch rảnh mỗi ngày</p>
            </div>
            <button
              onClick={() => handleSaveShiftConfig(!shiftOpen)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium ${
                shiftOpen
                  ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {shiftOpen ? 'Tạm đóng ca' : 'Mở ca hoạt động'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Khung giờ hôm nay</label>
              <input
                type="text"
                value={todayHours}
                onChange={(e) => setTodayHours(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Thông báo trạng thái</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bannerMsg}
                  onChange={(e) => setBannerMsg(e.target.value)}
                  className={inputClass}
                />
                <button
                  onClick={() => handleSaveShiftConfig(shiftOpen)}
                  className="px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shrink-0"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
              Đối soát quỹ nền tảng
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Doanh thu ròng (3.500đ/đơn):</span>
                <strong className="text-slate-900 font-semibold">
                  {formatVnd(data.shiftConfig?.platformRevenueBalance || 0)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quỹ hỗ trợ rủi ro xăng (1.500đ/đơn):</span>
                <strong className="text-slate-900 font-semibold">
                  {formatVnd(data.shiftConfig?.riskFundBalance || 0)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khách đăng ký nhận thông báo:</span>
                <strong className="text-slate-900 font-semibold">
                  {data.shiftConfig?.waitingNotificationSubscribers || 0}
                </strong>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
            Tiền món ăn được hạch toán riêng vào khoản thu hộ - chi hộ.
          </p>
        </div>
      </div>

      {/* Row 2: Blacklist Attempt Logs */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Nhật ký chặn tự động Blacklist ({data.blacklistAttemptLogs?.length || 0})
            </h3>
            <p className="text-xs text-slate-400">
              Lưu lại IP, số CCCD, SĐT và thời điểm khi đối tượng bị cấm cố tình đăng ký lại
            </p>
          </div>
        </div>

        {data.blacklistAttemptLogs?.length === 0 ? (
          <div className="text-xs text-slate-400 py-2">
            Chưa ghi nhận lượt đăng ký trái phép nào từ danh sách đen.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.blacklistAttemptLogs.map((log: any) => (
              <div
                key={log.id}
                className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-medium text-slate-900">{log.alertMessage}</div>
                  <div className="text-slate-400">
                    IP: <code>{log.ipAddress}</code> · Ảnh CCCD: <code>{log.cccdFrontSnapshot}</code> · {log.attemptedAt}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[11px] font-medium">
                  Đã chặn tự động
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Row 3: Driver Profiles & 3-Strike Management */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Quản lý hồ sơ tài xế &amp; Kỷ luật 3 gậy ({data.driverProfiles?.length || 0})
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {data.driverProfiles?.map((dp: any) => (
            <div
              key={dp.id}
              className="py-3 flex flex-wrap items-center justify-between gap-4 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{dp.user?.fullName}</span>
                  <span className="text-slate-500">{dp.user?.phone}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
                    CCCD: {dp.cccdNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                    {dp.verificationStatus}
                  </span>
                </div>
                <div className="text-slate-500">
                  Biển số: {dp.vehiclePlate} · Tiền mặt: {formatVnd(dp.cashOnHand)} · Đánh giá: {dp.ratingAvg}/5 · Vi phạm:{' '}
                  <strong className={dp.strikeCount > 0 ? 'text-red-600' : 'text-slate-900'}>
                    {dp.strikeCount}/3
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {dp.verificationStatus === 'PENDING_INTERVIEW' && (
                  <button
                    onClick={() => handleVerifyDriver(dp.id, 'APPROVED')}
                    className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium"
                  >
                    Duyệt sau phỏng vấn
                  </button>
                )}
                {dp.strikeCount < 3 && (
                  <button
                    onClick={() => handleStrikeDriver(dp.id)}
                    className="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium"
                  >
                    Phạt +1 gậy ({dp.strikeCount + 1}/3)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Customer Reports */}
        {data.reviewsAndReports?.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              Phản hồi &amp; báo cáo từ khách hàng ({data.reviewsAndReports.length})
            </div>
            <div className="divide-y divide-slate-100">
              {data.reviewsAndReports.map((r: any) => (
                <div key={r.id} className="py-2 text-xs text-slate-600 flex items-center justify-between">
                  <div>
                    <strong className="text-slate-900">Đơn #{r.orderId}</strong> · Tài xế: {r.driver?.fullName} · {r.rating}/5 sao ·{' '}
                    <span className={r.reportTag !== 'NONE' ? 'text-red-600 font-medium' : 'text-slate-500'}>
                      {r.reportTag}
                    </span>{' '}
                    {r.comment && `— "${r.comment}"`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Row 4: Vendors & Withdrawals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
            Điểm bán trên bản đồ
          </h3>

          <div className="divide-y divide-slate-100">
            {[...(data.pendingVendors || []), ...(data.approvedVendors || [])].map((v: any) => (
              <div
                key={v.id}
                className="py-2.5 flex items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-medium text-slate-900">
                    {v.name}{' '}
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 ml-1">
                      {v.approvalStatus}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    Đóng góp: {v.displayContributor} · {v.closedToday ? 'Đang tạm nghỉ' : 'Đang mở bán'}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {v.approvalStatus === 'PENDING' && (
                    <button
                      onClick={() => handleApproveVendor(v.id, 'APPROVED', false)}
                      className="px-2.5 py-1 rounded bg-slate-900 text-white font-medium"
                    >
                      Duyệt
                    </button>
                  )}
                  {v.closedToday && (
                    <button
                      onClick={() => handleApproveVendor(v.id, 'APPROVED', false)}
                      className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 font-medium"
                    >
                      Mở bán lại
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
            Yêu cầu rút tiền về ngân hàng ({data.withdrawals?.length || 0})
          </h3>

          {data.withdrawals?.length === 0 ? (
            <div className="text-xs text-slate-400 py-4 text-center">
              Chưa có yêu cầu rút tiền nào.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.withdrawals.map((w: any) => (
                <div
                  key={w.id}
                  className="py-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium text-slate-900">
                      {w.user?.fullName} ({w.walletType}) — {formatVnd(w.amount)}
                    </div>
                    <div className="text-slate-400">
                      {w.bankName} · {w.bankAccountNumber} · {w.status}
                    </div>
                  </div>
                  {w.status === 'PENDING' && (
                    <button
                      onClick={() => handleApproveWithdrawal(w.id)}
                      className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium shrink-0"
                    >
                      Xác nhận đã chuyển
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
