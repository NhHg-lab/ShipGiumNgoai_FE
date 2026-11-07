import React, { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, Polyline } from 'react-leaflet';
import L from 'leaflet';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { fetchOsrmRoadRoute, OsrmRouteResult } from '../utils/osrmRouting';
import {
  MapPin,
  Plus,
  QrCode,
  Wallet,
  AlertCircle,
  ExternalLink,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const vendorIcon = new L.DivIcon({
  className: 'custom-vendor-icon',
  html: `<div style="background:#1e293b;color:#ffffff;padding:3px 8px;border-radius:6px;font-weight:600;font-size:11px;box-shadow:0 2px 4px rgba(0,0,0,0.18);border:1.5px solid #ffffff;white-space:nowrap;">Điểm bán</div>`,
  iconSize: [74, 24],
  iconAnchor: [37, 12],
});

const driverIcon = new L.DivIcon({
  className: 'custom-driver-icon',
  html: `<div style="background:#059669;color:#ffffff;padding:3px 8px;border-radius:6px;font-weight:600;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,0.22);border:1.5px solid #ffffff;white-space:nowrap;">Tài xế</div>`,
  iconSize: [64, 24],
  iconAnchor: [32, 12],
});

const customerIcon = new L.DivIcon({
  className: 'custom-customer-icon',
  html: `<div style="background:#ffffff;color:#0f172a;padding:3px 8px;border-radius:6px;font-weight:600;font-size:11px;box-shadow:0 2px 4px rgba(0,0,0,0.18);border:1.5px solid #0f172a;white-space:nowrap;">Vị trí nhận</div>`,
  iconSize: [78, 24],
  iconAnchor: [39, 12],
});

export const CustomerPage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [shiftConfig, setShiftConfig] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [selectedDishId, setSelectedDishId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [deliveryType, setDeliveryType] = useState<'INSTANT' | 'FLEXIBLE'>('INSTANT');
  const [paymentMethod, setPaymentMethod] = useState<'VIETQR' | 'CUSTOMER_WALLET'>('VIETQR');
  const [deliveryAddress, setDeliveryAddress] = useState('268 Lý Thường Kiệt, Quận 10, TP.HCM');
  const [vendorGiftAmount, setVendorGiftAmount] = useState<number>(0);
  const [driverTipAmount, setDriverTipAmount] = useState<number>(0);
  const [quote, setQuote] = useState<any>(null);

  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [nearbyAlternatives, setNearbyAlternatives] = useState<any[]>([]);
  const [driverLiveLoc, setDriverLiveLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [vendorToCustomerRoute, setVendorToCustomerRoute] = useState<OsrmRouteResult | null>(null);
  const [driverToVendorRoute, setDriverToVendorRoute] = useState<OsrmRouteResult | null>(null);

  // Modals & Alerts
  const [toast, setToast] = useState<string | null>(null);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [countdownSec, setCountdownSec] = useState<number>(180);

  // Contribute Vendor Form
  const [contribName, setContribName] = useState('');
  const [contribStory, setContribStory] = useState('');
  const [contribAddress, setContribAddress] = useState('');
  const [contribHours, setContribHours] = useState('18:00 - 23:00');
  const [contribCreator, setContribCreator] = useState('');
  const [contribAnon, setContribAnon] = useState(false);
  const [contribDishName, setContribDishName] = useState('');
  const [contribDishPrice, setContribDishPrice] = useState(20000);

  // Withdraw Form
  const [withdrawAmount, setWithdrawAmount] = useState(30000);
  const [bankName, setBankName] = useState('MB Bank');
  const [bankAccount, setBankAccount] = useState('0901111111');

  // Review Form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTag, setReviewTag] = useState('NONE');
  const [reviewComment, setReviewComment] = useState('');

  // Option 2/3 state
  const [gasTipInput, setGasTipInput] = useState(15000);
  const [altVendorId, setAltVendorId] = useState<number | null>(null);
  const [altDishId, setAltDishId] = useState<number | null>(null);

  const formatVnd = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';

  const loadData = async () => {
    try {
      const [shiftRes, vendorRes] = await Promise.all([
        axiosClient.get('/public/shift-status'),
        axiosClient.get('/public/vendors'),
      ]);
      setShiftConfig(shiftRes.data);
      setVendors(vendorRes.data);

      if (!selectedVendor && vendorRes.data.length > 0) {
        const firstOpen = vendorRes.data.find((v: any) => !v.closedToday) || vendorRes.data[0];
        setSelectedVendor(firstOpen);
        if (firstOpen.dishes?.length > 0) {
          setSelectedDishId(firstOpen.dishes[0].id);
        }
      }

      if (user) {
        const ordersRes = await axiosClient.get('/orders/my');
        setMyOrders(ordersRes.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 4000);
    return () => clearInterval(timer);
  }, [user]);

  const activeOrder = myOrders[0];
  useEffect(() => {
    if (activeOrder?.driver?.id) {
      axiosClient
        .get(`/public/drivers/${activeOrder.driver.id}/location`)
        .then((res) => {
          if (res.data?.lat && res.data?.lng) {
            setDriverLiveLoc({ lat: res.data.lat, lng: res.data.lng });
          }
        })
        .catch(() => {});
    }
  }, [activeOrder]);

  // OSRM route: Vendor -> Customer
  const targetVendorForMap = activeOrder?.vendor || selectedVendor;
  useEffect(() => {
    if (!targetVendorForMap?.latitude || !targetVendorForMap?.longitude) {
      setVendorToCustomerRoute(null);
      return;
    }
    fetchOsrmRoadRoute([
      { lat: targetVendorForMap.latitude, lng: targetVendorForMap.longitude },
      { lat: 10.7726, lng: 106.6579 },
    ]).then((route) => {
      if (route) setVendorToCustomerRoute(route);
    });
  }, [targetVendorForMap?.id, targetVendorForMap?.latitude, targetVendorForMap?.longitude]);

  // OSRM route: Driver -> Vendor (or Customer)
  useEffect(() => {
    if (!driverLiveLoc || !targetVendorForMap?.latitude) {
      setDriverToVendorRoute(null);
      return;
    }
    const destination =
      activeOrder?.status === 'PURCHASED_DELIVERING'
        ? { lat: 10.7726, lng: 106.6579 }
        : { lat: targetVendorForMap.latitude, lng: targetVendorForMap.longitude };

    fetchOsrmRoadRoute([
      { lat: driverLiveLoc.lat, lng: driverLiveLoc.lng },
      destination,
    ]).then((route) => {
      if (route) setDriverToVendorRoute(route);
    });
  }, [
    driverLiveLoc?.lat,
    driverLiveLoc?.lng,
    targetVendorForMap?.latitude,
    targetVendorForMap?.longitude,
    activeOrder?.status,
  ]);

  // Nearby alternatives when vendor is closed
  useEffect(() => {
    if (activeOrder?.status === 'VENDOR_CLOSED_WAITING_CUSTOMER' && activeOrder?.vendor?.id) {
      axiosClient
        .get(`/public/vendors/${activeOrder.vendor.id}/nearby-alternatives`)
        .then((res) => {
          setNearbyAlternatives(res.data || []);
          if (res.data?.length > 0) {
            setAltVendorId(res.data[0].id);
            setAltDishId(res.data[0].dishes?.[0]?.id || null);
          }
        })
        .catch(() => {});
    }
  }, [activeOrder?.status, activeOrder?.vendor?.id]);

  // Countdown timer when status === WAITING_TOPUP_DIFF
  useEffect(() => {
    if (activeOrder?.status !== 'WAITING_TOPUP_DIFF') {
      setCountdownSec(180);
      return;
    }
    const interval = setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          axiosClient.post(`/orders/${activeOrder.id}/cancel-topup-diff`).then(() => loadData());
          return 180;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeOrder?.status, activeOrder?.id]);

  // Quote calculation
  useEffect(() => {
    if (!selectedVendor || !selectedDishId) return;
    axiosClient
      .post('/orders/quote', {
        vendorId: selectedVendor.id,
        deliveryType,
        deliveryLat: 10.7726,
        deliveryLng: 106.6579,
        vendorGiftAmount,
        driverTipAmount,
        items: [{ dishId: selectedDishId, quantity }],
      })
      .then((res) => setQuote(res.data))
      .catch(() => {});
  }, [selectedVendor, selectedDishId, quantity, deliveryType, vendorGiftAmount, driverTipAmount]);

  const handleSubscribeShift = async () => {
    const res = await axiosClient.post('/public/shift-status/subscribe');
    setToast(res.data.message);
    loadData();
  };

  const handleCreateOrder = async () => {
    if (!user) {
      setToast('Vui lòng đăng nhập trước khi đặt đơn.');
      return;
    }
    try {
      await axiosClient.post('/orders', {
        vendorId: selectedVendor.id,
        deliveryType,
        paymentMethod,
        deliveryAddress,
        deliveryLat: 10.7726,
        deliveryLng: 106.6579,
        vendorGiftAmount,
        driverTipAmount,
        items: [{ dishId: selectedDishId, quantity }],
      });
      await refreshUser();
      await loadData();
      setToast('Đã tạo đơn hàng thành công.');
    } catch (err: any) {
      setToast(err?.response?.data?.message || 'Không thể tạo đơn hàng');
    }
  };

  const handleConfirmVietQr = async (orderId: number) => {
    await axiosClient.post(`/orders/${orderId}/confirm-payment`);
    await loadData();
    setToast('Đã xác nhận thanh toán vào ví tạm giữ (Escrow). Đang tìm tài xế...');
  };

  const handleClosedOptionChoice = async (
    orderId: number,
    option: 'OPTION_1_REFUND_100' | 'OPTION_2_TIP_GAS' | 'OPTION_3_SWITCH_VENDOR'
  ) => {
    try {
      await axiosClient.post(`/orders/${orderId}/customer-closed-choice`, {
        option,
        gasTipAmount: gasTipInput,
        newVendorId: altVendorId,
        newDishId: altDishId,
        newQuantity: 1,
      });
      await refreshUser();
      await loadData();
      setToast('Đã lưu lựa chọn xử lý đơn hàng.');
    } catch (err: any) {
      setToast(err?.response?.data?.message || 'Lỗi xử lý lựa chọn');
    }
  };

  const handleConfirmTopupDiff = async (orderId: number) => {
    await axiosClient.post(`/orders/${orderId}/confirm-topup-diff`);
    await loadData();
    setToast('Đã thanh toán phần chênh lệch. Tài xế đang di chuyển sang điểm bán mới.');
  };

  const handleCancelTopupDiff = async (orderId: number) => {
    await axiosClient.post(`/orders/${orderId}/cancel-topup-diff`);
    await loadData();
    setToast('Đã hủy đổi quán và quay lại chọn phương án hoàn tiền.');
  };

  const handleReviewDriver = async (orderId: number) => {
    try {
      const res = await axiosClient.post(`/orders/${orderId}/review`, {
        rating: reviewRating,
        reportTag: reviewTag,
        comment: reviewComment,
      });
      setToast(res.data.message);
      setReviewComment('');
    } catch (err: any) {
      setToast(err?.response?.data?.message || 'Lỗi gửi đánh giá');
    }
  };

  const handleContributeVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axiosClient.post('/public/vendors/contribute', {
        name: contribName,
        story: contribStory,
        addressText: contribAddress,
        sellingHours: contribHours,
        contributorName: contribCreator,
        anonymousContributor: contribAnon,
        dishes: [{ name: contribDishName || 'Món ăn của Ngoại', estimatedPrice: contribDishPrice }],
      });
      setToast(res.data.message);
      setShowContributeModal(false);
      setContribName('');
      setContribStory('');
      setContribAddress('');
    } catch (err: any) {
      setToast(err?.response?.data?.message || 'Lỗi gửi đóng góp');
    }
  };

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axiosClient.post('/wallets/withdraw', {
        amount: withdrawAmount,
        bankName,
        bankAccountNumber: bankAccount,
        accountHolderName: user?.fullName || 'KHACH HANG',
      });
      setToast(res.data.message);
      setShowWithdrawModal(false);
      await refreshUser();
    } catch (err: any) {
      setToast(err?.response?.data?.message || 'Lỗi yêu cầu rút tiền');
    }
  };

  const inputClass =
    'w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-900';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Toast */}
      {toast && (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-md flex items-center justify-between text-xs">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Compact Shift Status Bar */}
      {shiftConfig && (
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                shiftConfig.shiftOpen ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            <div className="text-xs">
              <span className="font-medium text-slate-900">{shiftConfig.statusBannerMessage}</span>
              <span className="text-slate-400 ml-2">
                ({shiftConfig.todayCustomHours})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!shiftConfig.shiftOpen && (
              <button
                onClick={handleSubscribeShift}
                className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
              >
                Nhận thông báo khi mở ca ({shiftConfig.waitingNotificationSubscribers})
              </button>
            )}
            <button
              onClick={() => setShowContributeModal(true)}
              className="px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Đóng góp điểm bán
            </button>
            {user && (
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5 text-slate-500" />
                Ví hoàn tiền: <strong className="text-slate-900">{formatVnd(user.customerWalletBalance)}</strong>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Order Section */}
      {activeOrder && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="space-y-0.5">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Đơn hàng #{activeOrder.id}
              </div>
              <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span>{activeOrder.vendor?.name}</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                  {activeOrder.status}
                </span>
              </div>
            </div>
            <div className="text-right text-xs">
              <div className="text-slate-500">
                Tạm giữ (Escrow): <strong className="text-slate-900 font-semibold">{formatVnd(activeOrder.totalEscrowAmount)}</strong>
              </div>
              <div className="text-slate-400">
                {activeOrder.deliveryType === 'INSTANT' ? 'Giao nhanh' : 'Giao linh hoạt'}
              </div>
            </div>
          </div>

          {/* Pending Payment */}
          {activeOrder.status === 'PENDING_PAYMENT' && (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <QrCode className="w-9 h-9 text-slate-700 shrink-0" />
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold text-slate-900">
                    Thanh toán VietQR vào ví tạm giữ (Escrow)
                  </div>
                  <div className="text-slate-600">
                    Số tiền: <strong>{formatVnd(activeOrder.totalEscrowAmount)}</strong> · Nội dung: <code>SGN{activeOrder.id}</code>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleConfirmVietQr(activeOrder.id)}
                className="px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
              >
                Xác nhận đã chuyển khoản (Giả lập Webhook)
              </button>
            </div>
          )}

          {/* Case B1: Vendor Closed Today -> 3 Options */}
          {activeOrder.status === 'VENDOR_CLOSED_WAITING_CUSTOMER' && (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-4">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold text-slate-900">
                    Điểm bán {activeOrder.vendor?.name} hôm nay nghỉ hoặc hết hàng sớm
                  </div>
                  <p className="text-slate-500 mt-0.5">
                    Vui lòng chọn 1 trong 3 phương án xử lý số tiền {formatVnd(activeOrder.totalEscrowAmount)} đang tạm giữ:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Option 1 */}
                <div className="bg-white rounded-md p-3.5 border border-slate-200 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">1. Hoàn tiền 100%</div>
                    <p className="text-xs text-slate-500 mt-1">
                      Hoàn toàn bộ {formatVnd(activeOrder.totalEscrowAmount)} về ví hoàn tiền của bạn. Quỹ nền tảng hỗ trợ xăng cho tài xế.
                    </p>
                  </div>
                  <button
                    onClick={() => handleClosedOptionChoice(activeOrder.id, 'OPTION_1_REFUND_100')}
                    className="w-full py-2 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-medium"
                  >
                    Hoàn 100% về ví
                  </button>
                </div>

                {/* Option 2 */}
                <div className="bg-white rounded-md p-3.5 border border-slate-200 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">2. Hỗ trợ xăng cho tài xế</div>
                    <p className="text-xs text-slate-500 mt-1">
                      Trích một phần hỗ trợ tài xế đã chạy tới điểm bán, phần còn lại hoàn về ví:
                    </p>
                    <input
                      type="number"
                      step={5000}
                      min={5000}
                      value={gasTipInput}
                      onChange={(e) => setGasTipInput(Number(e.target.value))}
                      className="mt-2 w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs"
                    />
                  </div>
                  <button
                    onClick={() => handleClosedOptionChoice(activeOrder.id, 'OPTION_2_TIP_GAS')}
                    className="w-full py-2 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-medium"
                  >
                    Hỗ trợ {formatVnd(gasTipInput)} xăng
                  </button>
                </div>

                {/* Option 3 */}
                <div className="bg-white rounded-md p-3.5 border border-slate-900 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">3. Đổi sang điểm bán gần đó</div>
                    <p className="text-xs text-slate-500 mt-1">
                      Chọn một điểm bán khác gần vị trí tài xế đang đứng:
                    </p>
                    <select
                      value={altVendorId || ''}
                      onChange={(e) => {
                        const vId = Number(e.target.value);
                        setAltVendorId(vId);
                        const found = nearbyAlternatives.find((v) => v.id === vId);
                        if (found?.dishes?.length > 0) setAltDishId(found.dishes[0].id);
                      }}
                      className="mt-2 w-full px-2 py-1.5 rounded border border-slate-200 text-xs"
                    >
                      {nearbyAlternatives.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.distanceKm}km)
                        </option>
                      ))}
                    </select>

                    {altVendorId && (
                      <select
                        value={altDishId || ''}
                        onChange={(e) => setAltDishId(Number(e.target.value))}
                        className="mt-1.5 w-full px-2 py-1.5 rounded border border-slate-200 text-xs"
                      >
                        {nearbyAlternatives
                          .find((v) => v.id === altVendorId)
                          ?.dishes?.map((d: any) => (
                            <option key={d.id} value={d.id}>
                              {d.name} - {formatVnd(d.estimatedPrice)}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                  <button
                    onClick={() => handleClosedOptionChoice(activeOrder.id, 'OPTION_3_SWITCH_VENDOR')}
                    className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
                  >
                    Đổi sang điểm bán này
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Option 3 Waiting Topup Diff */}
          {activeOrder.status === 'WAITING_TOPUP_DIFF' && (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-900">
                  Món mới tại {activeOrder.vendor?.name} chênh lệch thêm{' '}
                  <span className="text-red-600">{formatVnd(activeOrder.pendingTopupDiffAmount)}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-slate-200 text-slate-800 text-xs font-medium">
                  Còn lại: {countdownSec}s
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleConfirmTopupDiff(activeOrder.id)}
                  className="px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
                >
                  Thanh toán bù {formatVnd(activeOrder.pendingTopupDiffAmount)}
                </button>
                <button
                  onClick={() => handleCancelTopupDiff(activeOrder.id)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 hover:bg-white text-slate-700 text-xs font-medium"
                >
                  Quay lại chọn hoàn tiền
                </button>
              </div>
            </div>
          )}

          {/* Purchase Proof Image */}
          {activeOrder.purchaseProofImageUrl && (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-md">
              <img
                src={activeOrder.purchaseProofImageUrl}
                alt="Proof"
                className="w-16 h-12 object-cover rounded border border-slate-200"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-900">Tài xế đã mua hàng tại điểm bán</div>
                <div className="text-slate-500">Đang trên đường giao đến địa chỉ của bạn.</div>
              </div>
            </div>
          )}

          {/* Review Driver */}
          {(activeOrder.status === 'COMPLETED' || activeOrder.status === 'CANCELLED_REFUNDED') &&
            activeOrder.driver && (
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-2.5">
                <div className="text-xs font-semibold text-slate-900">
                  Đánh giá tài xế ({activeOrder.driver.fullName})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className={inputClass}
                  >
                    <option value={5}>5 sao - Rất tốt</option>
                    <option value={4}>4 sao - Tốt</option>
                    <option value={3}>3 sao - Bình thường</option>
                    <option value={2}>2 sao - Kém</option>
                    <option value={1}>1 sao - Vi phạm</option>
                  </select>

                  <select
                    value={reviewTag}
                    onChange={(e) => setReviewTag(e.target.value)}
                    className={inputClass}
                  >
                    <option value="NONE">Không có vi phạm</option>
                    <option value="DISRESPECT_VENDOR">Thiếu tôn trọng người bán</option>
                    <option value="RUDE_TO_CUSTOMER">Thái độ kém với khách hàng</option>
                    <option value="FRAUD_SUSPECTED">Nghi ngờ gian lận</option>
                  </select>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Ghi chú thêm..."
                      className={inputClass}
                    />
                    <button
                      onClick={() => handleReviewDriver(activeOrder.id)}
                      className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shrink-0"
                    >
                      Gửi
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Main Grid: Left Map + Vendors | Right Checkout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns */}
        <div className="lg:col-span-7 space-y-4">
          {/* Map Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
              <span className="font-semibold text-slate-900">Bản đồ lộ trình thực tế</span>
              <div className="flex items-center gap-3 text-slate-500">
                {vendorToCustomerRoute && (
                  <span>
                    Quãng đường: <strong className="text-slate-900">{vendorToCustomerRoute.distanceKm} km</strong> (~{vendorToCustomerRoute.durationMinutes} phút)
                  </span>
                )}
                {driverToVendorRoute && (
                  <span className="text-emerald-700 font-medium">
                    Tài xế cách đích: {driverToVendorRoute.distanceKm} km
                  </span>
                )}
              </div>
            </div>

            <div className="h-[340px] rounded-md overflow-hidden border border-slate-100">
              <MapContainer center={[10.7762, 106.6838]} zoom={14} scrollWheelZoom={true}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Customer Pin */}
                <Marker position={[10.7726, 106.6579]} icon={customerIcon}>
                  <Popup>Vị trí nhận hàng (268 Lý Thường Kiệt)</Popup>
                </Marker>

                {/* Vendors Pins */}
                {vendors.map((v) => (
                  <Marker
                    key={v.id}
                    position={[v.latitude, v.longitude]}
                    icon={vendorIcon}
                    eventHandlers={{
                      click: () => {
                        setSelectedVendor(v);
                        if (v.dishes?.length > 0) setSelectedDishId(v.dishes[0].id);
                      },
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-0.5">
                        <div className="font-semibold text-slate-900">{v.name}</div>
                        <div className="text-slate-500">{v.addressText}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Road Route: Vendor -> Customer */}
                {vendorToCustomerRoute && vendorToCustomerRoute.coordinates.length > 1 && (
                  <Polyline
                    positions={vendorToCustomerRoute.coordinates}
                    pathOptions={{
                      color: '#0f172a',
                      weight: 4,
                      opacity: 0.8,
                    }}
                  />
                )}

                {/* Driver Live Pin & Road Route */}
                {driverLiveLoc && (
                  <>
                    <Marker position={[driverLiveLoc.lat, driverLiveLoc.lng]} icon={driverIcon}>
                      <Popup>Vị trí tài xế hiện tại</Popup>
                    </Marker>
                    {driverToVendorRoute && driverToVendorRoute.coordinates.length > 1 && (
                      <Polyline
                        positions={driverToVendorRoute.coordinates}
                        pathOptions={{
                          color: '#059669',
                          weight: 4,
                          opacity: 0.9,
                          dashArray: activeOrder?.status === 'PURCHASED_DELIVERING' ? undefined : '6, 6',
                        }}
                      />
                    )}
                  </>
                )}
              </MapContainer>
            </div>
          </div>

          {/* Vendor List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Điểm bán của các cụ ({vendors.length})
              </h2>
            </div>

            {vendors.map((v) => {
              const isSelected = selectedVendor?.id === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => {
                    setSelectedVendor(v);
                    if (v.dishes?.length > 0) setSelectedDishId(v.dishes[0].id);
                  }}
                  className={`bg-white rounded-lg p-4 border transition cursor-pointer flex flex-col sm:flex-row gap-4 ${
                    isSelected
                      ? 'border-slate-900 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {v.avatarUrl && (
                    <img
                      src={v.avatarUrl}
                      alt={v.name}
                      className="w-full sm:w-28 h-24 object-cover rounded-md shrink-0 bg-slate-100"
                    />
                  )}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900 text-sm">{v.name}</h3>
                      {v.closedToday ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[11px] font-medium shrink-0">
                          Tạm nghỉ hôm nay
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-medium shrink-0">
                          {v.sellingHours}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2">{v.story}</p>

                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{v.addressText}</span>
                    </div>

                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>
                        Người đóng góp: <strong className="font-medium text-slate-700">{v.displayContributor}</strong>
                      </span>
                      {v.sourceVideoUrl && (
                        <a
                          href={v.sourceVideoUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-0.5 font-medium"
                        >
                          Video gốc <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Columns: Order Checkout */}
        <div className="lg:col-span-5">
          {selectedVendor && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 sticky top-20 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Đặt mua hộ
                </div>
                <h2 className="text-base font-semibold text-slate-900 mt-0.5">
                  {selectedVendor.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{selectedVendor.addressText}</p>
              </div>

              {/* 1. Dish selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Chọn món</label>
                {selectedVendor.dishes?.map((dish: any) => (
                  <label
                    key={dish.id}
                    className={`flex items-center justify-between p-2.5 rounded-md border cursor-pointer transition text-xs ${
                      selectedDishId === dish.id
                        ? 'border-slate-900 bg-slate-50 font-medium text-slate-900'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="dish"
                        checked={selectedDishId === dish.id}
                        onChange={() => setSelectedDishId(dish.id)}
                        className="text-slate-900 focus:ring-0"
                      />
                      <span>{dish.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{formatVnd(dish.estimatedPrice)}</span>
                  </label>
                ))}
              </div>

              {/* Quantity & Optional Tips */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Số lượng</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Biếu thêm cụ</label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={vendorGiftAmount}
                    onChange={(e) => setVendorGiftAmount(Math.max(0, Number(e.target.value)))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Tip tài xế</label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={driverTipAmount}
                    onChange={(e) => setDriverTipAmount(Math.max(0, Number(e.target.value)))}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* 2. Delivery Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Hình thức giao</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('INSTANT')}
                    className={`p-2.5 rounded-md border text-left transition ${
                      deliveryType === 'INSTANT'
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900">Giao nhanh (15k)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Tài xế sẵn tiền mặt</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('FLEXIBLE')}
                    className={`p-2.5 rounded-md border text-left transition ${
                      deliveryType === 'FLEXIBLE'
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900">Linh hoạt (12k)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Tiết kiệm 3.000đ</div>
                  </button>
                </div>
              </div>

              {/* 3. Delivery Address */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Địa chỉ nhận hàng</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* 4. Payment Method */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Thanh toán tạm giữ (Escrow)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('VIETQR')}
                    className={`p-2 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'VIETQR'
                        ? 'border-slate-900 bg-slate-50 text-slate-900'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    VietQR
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CUSTOMER_WALLET')}
                    className={`p-2 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'CUSTOMER_WALLET'
                        ? 'border-slate-900 bg-slate-50 text-slate-900'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    Ví ({formatVnd(user?.customerWalletBalance || 0)})
                  </button>
                </div>
              </div>

              {/* Price Quote Breakdown */}
              {quote && (
                <div className="bg-slate-50 rounded-md p-3 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Tiền mua hộ trả cụ (100%):</span>
                    <span className="font-medium text-slate-900">{formatVnd(quote.reimbursementAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Phí giao hàng ({quote.distanceKm} km):</span>
                    <span className="font-medium text-slate-900">{formatVnd(quote.shippingFee)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Phí vận hành &amp; quỹ rủi ro:</span>
                    <span className="font-medium text-slate-900">{formatVnd(quote.platformFee)}</span>
                  </div>
                  {quote.driverTipAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tip tài xế:</span>
                      <span className="font-medium text-slate-900">{formatVnd(quote.driverTipAmount)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-semibold text-slate-900">
                    <span>Tổng thanh toán:</span>
                    <span>{formatVnd(quote.totalEscrowAmount)}</span>
                  </div>
                </div>
              )}

              {user ? (
                <button
                  type="button"
                  disabled={selectedVendor.closedToday}
                  onClick={handleCreateOrder}
                  className="w-full py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium text-xs transition"
                >
                  {selectedVendor.closedToday ? 'Điểm bán đang tạm nghỉ' : 'Đặt đơn ngay'}
                </button>
              ) : (
                <Link
                  to="/login"
                  className="block w-full py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-center font-medium text-xs"
                >
                  Đăng nhập để đặt đơn
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Contribute Vendor */}
      {showContributeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <form
            onSubmit={handleContributeVendor}
            className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-5 space-y-3.5 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Đóng góp điểm bán mới</h3>
              <button
                type="button"
                onClick={() => setShowContributeModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="Tên gọi điểm bán & món bán"
              value={contribName}
              onChange={(e) => setContribName(e.target.value)}
              className={inputClass}
            />
            <textarea
              rows={2}
              placeholder="Mô tả hoàn cảnh hoặc ghi chú..."
              value={contribStory}
              onChange={(e) => setContribStory(e.target.value)}
              className={inputClass}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                required
                placeholder="Địa chỉ bán"
                value={contribAddress}
                onChange={(e) => setContribAddress(e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Khung giờ (18:00 - 23:00)"
                value={contribHours}
                onChange={(e) => setContribHours(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Tên món chính"
                value={contribDishName}
                onChange={(e) => setContribDishName(e.target.value)}
                className={inputClass}
              />
              <input
                type="number"
                placeholder="Giá dự kiến (VNĐ)"
                value={contribDishPrice}
                onChange={(e) => setContribDishPrice(Number(e.target.value))}
                className={inputClass}
              />
            </div>

            <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-medium text-slate-700">Thông tin người đóng góp (không bắt buộc)</div>
              <input
                type="text"
                disabled={contribAnon}
                placeholder="Tên của bạn (để trống sẽ hiển thị ẩn danh)"
                value={contribCreator}
                onChange={(e) => setContribCreator(e.target.value)}
                className={inputClass}
              />
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contribAnon}
                  onChange={(e) => setContribAnon(e.target.checked)}
                />
                <span>Hiển thị là "Một người tốt ẩn danh"</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowContributeModal(false)}
                className="px-3.5 py-1.5 rounded-md border border-slate-200 text-slate-700 text-xs font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium"
              >
                Gửi duyệt
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: Withdraw Wallet */}
      {showWithdrawModal && user && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <form
            onSubmit={handleWithdrawRequest}
            className="bg-white border border-slate-200 rounded-lg max-w-sm w-full p-5 space-y-3.5 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Rút tiền từ ví hoàn tiền</h3>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Số dư khả dụng: <strong className="text-slate-900">{formatVnd(user.customerWalletBalance)}</strong>
            </p>
            <input
              type="number"
              min={10000}
              required
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              placeholder="Số tiền rút"
              className={inputClass}
            />
            <input
              type="text"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Tên ngân hàng"
              className={inputClass}
            />
            <input
              type="text"
              required
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="Số tài khoản"
              className={inputClass}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="px-3.5 py-1.5 rounded-md border border-slate-200 text-slate-700 text-xs font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium"
              >
                Gửi yêu cầu
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
