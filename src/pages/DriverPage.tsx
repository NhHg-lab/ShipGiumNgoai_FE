import React, { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, Polyline } from 'react-leaflet';
import L from 'leaflet';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { fetchOsrmRoadRoute, OsrmRouteResult } from '../utils/osrmRouting';
import {
  Camera,
  Check,
  Play,
  Square,
  X,
} from 'lucide-react';

const driverIcon = new L.DivIcon({
  className: 'custom-driver-icon',
  html: `<div style="background:#059669;color:#ffffff;padding:3px 8px;border-radius:6px;font-weight:600;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,0.22);border:1.5px solid #ffffff;white-space:nowrap;">Vị trí của bạn</div>`,
  iconSize: [96, 24],
  iconAnchor: [48, 12],
});

const vendorIcon = new L.DivIcon({
  className: 'custom-vendor-icon',
  html: `<div style="background:#1e293b;color:#ffffff;padding:3px 8px;border-radius:6px;font-weight:600;font-size:11px;box-shadow:0 2px 4px rgba(0,0,0,0.18);border:1.5px solid #ffffff;white-space:nowrap;">Điểm bán</div>`,
  iconSize: [74, 24],
  iconAnchor: [37, 12],
});

const customerIcon = new L.DivIcon({
  className: 'custom-customer-icon',
  html: `<div style="background:#ffffff;color:#0f172a;padding:3px 8px;border-radius:6px;font-weight:600;font-size:11px;box-shadow:0 2px 4px rgba(0,0,0,0.18);border:1.5px solid #0f172a;white-space:nowrap;">Khách hàng</div>`,
  iconSize: [82, 24],
  iconAnchor: [41, 12],
});

export const DriverPage: React.FC = () => {
  const { user, driverProfile, refreshUser } = useAuth();

  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [cashInput, setCashInput] = useState<number>(driverProfile?.cashOnHand || 350000);
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [autoDriveActive, setAutoDriveActive] = useState<boolean>(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: 10.7795,
    lng: 106.6885,
  });
  const [roadRoute, setRoadRoute] = useState<OsrmRouteResult | null>(null);
  const [routeStepIndex, setRouteStepIndex] = useState<number>(0);
  const [toast, setToast] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState(100000);
  const [bankAccount, setBankAccount] = useState('0902222222 - MB Bank');

  const formatVnd = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';

  const loadDriverData = async () => {
    try {
      const [availRes, myRes] = await Promise.all([
        axiosClient.get('/driver/orders/available'),
        axiosClient.get('/orders/my'),
      ]);
      setAvailableOrders(availRes.data || []);
      setMyOrders(myRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDriverData();
    const timer = setInterval(loadDriverData, 3500);
    return () => clearInterval(timer);
  }, []);

  const activeOrder = myOrders.find(
    (o) =>
      o.status === 'DRIVER_ASSIGNED' ||
      o.status === 'PURCHASED_DELIVERING' ||
      o.status === 'VENDOR_CLOSED_WAITING_CUSTOMER' ||
      o.status === 'WAITING_TOPUP_DIFF'
  );

  // OSRM street route for driver
  const previewVendor = activeOrder?.vendor || availableOrders[0]?.order?.vendor;
  useEffect(() => {
    const vLat = previewVendor?.latitude || 10.7732;
    const vLng = previewVendor?.longitude || 106.6754;
    const cLat = activeOrder?.deliveryLat || 10.7726;
    const cLng = activeOrder?.deliveryLng || 106.6579;

    const waypoints =
      activeOrder?.status === 'PURCHASED_DELIVERING'
        ? [
            { lat: currentCoords.lat, lng: currentCoords.lng },
            { lat: cLat, lng: cLng },
          ]
        : [
            { lat: currentCoords.lat, lng: currentCoords.lng },
            { lat: vLat, lng: vLng },
            { lat: cLat, lng: cLng },
          ];

    fetchOsrmRoadRoute(waypoints).then((res) => {
      if (res && res.coordinates.length > 1) {
        setRoadRoute(res);
        setRouteStepIndex(0);
      }
    });
  }, [previewVendor?.id, activeOrder?.id, activeOrder?.status]);

  // Real HTML5 watchPosition GPS
  useEffect(() => {
    if (!gpsActive || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentCoords({ lat, lng });
        axiosClient
          .post('/driver/location', {
            driverId: user?.id,
            orderId: activeOrder?.id || 0,
            lat,
            lng,
          })
          .catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [gpsActive, activeOrder?.id, user?.id]);

  // Step along real OSRM road coordinates
  const stepAlongRealRoad = async (showMessage = true) => {
    if (!roadRoute || roadRoute.coordinates.length === 0) return;

    const nextIdx = (routeStepIndex + 1) % roadRoute.coordinates.length;
    const [nextLat, nextLng] = roadRoute.coordinates[nextIdx];
    const formattedLat = Number(nextLat.toFixed(6));
    const formattedLng = Number(nextLng.toFixed(6));

    setRouteStepIndex(nextIdx);
    setCurrentCoords({ lat: formattedLat, lng: formattedLng });

    await axiosClient
      .post('/driver/location', {
        driverId: user?.id,
        orderId: activeOrder?.id || 0,
        lat: formattedLat,
        lng: formattedLng,
      })
      .catch(() => {});

    if (showMessage) {
      setToast(
        `Đã di chuyển trên mặt đường tới (${formattedLat}, ${formattedLng}) [${nextIdx + 1}/${roadRoute.coordinates.length}]`
      );
    }
  };

  useEffect(() => {
    if (!autoDriveActive || !roadRoute || roadRoute.coordinates.length === 0) return;
    const timer = setInterval(() => {
      stepAlongRealRoad(false);
    }, 1200);
    return () => clearInterval(timer);
  }, [autoDriveActive, roadRoute, routeStepIndex, activeOrder?.id, user?.id]);

  const handleUpdateCash = async () => {
    await axiosClient.post('/driver/profile/update-cash', {
      cashOnHand: cashInput,
      online: true,
    });
    await refreshUser();
    await loadDriverData();
    setToast(`Đã cập nhật tiền mặt mang theo: ${formatVnd(cashInput)}`);
  };

  const handleAcceptOrder = async (orderId: number) => {
    try {
      await axiosClient.post(`/driver/orders/${orderId}/accept`);
      await loadDriverData();
      setToast(`Đã nhận đơn #${orderId}.`);
    } catch (err: any) {
      setToast(err?.response?.data?.message || 'Không thể nhận đơn');
    }
  };

  const handleConfirmPurchase = async (orderId: number) => {
    await axiosClient.post(`/driver/orders/${orderId}/confirm-purchase`, {
      purchaseProofImageUrl:
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
    });
    await refreshUser();
    await loadDriverData();
    setToast('Đã xác nhận mua hàng tại điểm bán.');
  };

  const handleReportVendorClosed = async (orderId: number) => {
    await axiosClient.post(`/driver/orders/${orderId}/report-vendor-closed`, {
      closedProofImageUrl:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
    });
    await loadDriverData();
    setToast('Đã báo cáo điểm bán nghỉ hôm nay và gửi 3 lựa chọn cho khách hàng.');
  };

  const handleCompleteDelivery = async (orderId: number) => {
    await axiosClient.post(`/driver/orders/${orderId}/complete`);
    await refreshUser();
    await loadDriverData();
    setToast('Hoàn thành đơn hàng. Tiền đã giải ngân về ví tài xế.');
  };

  const handleDriverWithdraw = async () => {
    try {
      const res = await axiosClient.post('/wallets/withdraw', {
        amount: withdrawAmount,
        bankName: 'MB Bank',
        bankAccountNumber: bankAccount,
        accountHolderName: user?.fullName || 'SHIPPER',
      });
      setToast(res.data.message);
      await refreshUser();
    } catch (err: any) {
      setToast(err?.response?.data?.message || 'Lỗi rút tiền');
    }
  };

  const inputClass =
    'px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-900';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {toast && (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-md flex items-center justify-between text-xs">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top 3 Control Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Cash on hand */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900">Tiền mặt mang theo</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
              {driverProfile?.verificationStatus || 'APPROVED'}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              step={50000}
              value={cashInput}
              onChange={(e) => setCashInput(Number(e.target.value))}
              className={`flex-1 font-semibold ${inputClass}`}
            />
            <button
              onClick={handleUpdateCash}
              className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
            >
              Cập nhật
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Đơn giao nhanh yêu cầu tiền mặt ≥ tiền món ăn.
          </p>
        </div>

        {/* Card 2: Road-Snapped GPS Controls */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900">Định vị trên mặt đường</span>
            <span className="text-[11px] text-slate-400 font-mono">
              {currentCoords.lat}, {currentCoords.lng}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setAutoDriveActive(!autoDriveActive)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 ${
                autoDriveActive
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {autoDriveActive ? (
                <>
                  <Square className="w-3 h-3" /> Dừng chạy
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" /> Tự động chạy theo đường
                </>
              )}
            </button>
            <button
              onClick={() => stepAlongRealRoad(true)}
              className="px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium"
            >
              Nhích 1 bước
            </button>
            <button
              onClick={() => setGpsActive(!gpsActive)}
              className={`px-2.5 py-1.5 rounded-md border text-xs font-medium ${
                gpsActive
                  ? 'border-slate-900 bg-slate-100 text-slate-900'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {gpsActive ? 'GPS thật: Bật' : 'GPS thật'}
            </button>
          </div>
        </div>

        {/* Card 3: Driver Wallet */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900">
              Ví tài xế: {formatVnd(user?.driverWalletBalance || 0)}
            </span>
            <span className="text-[11px] text-slate-500">
              Vi phạm: <strong className="text-slate-900">{driverProfile?.strikeCount || 0}/3</strong>
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              step={20000}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              className={`w-24 font-medium ${inputClass}`}
            />
            <input
              type="text"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className={`flex-1 ${inputClass}`}
            />
            <button
              onClick={handleDriverWithdraw}
              className="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-medium shrink-0"
            >
              Rút
            </button>
          </div>
        </div>
      </div>

      {/* Active Order Card */}
      {activeOrder && (
        <div className="bg-white border border-slate-900 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="space-y-0.5">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Đơn đang thực hiện #{activeOrder.id}
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                Điểm mua: {activeOrder.vendor?.name} ({activeOrder.vendor?.addressText})
              </h3>
              <p className="text-xs text-slate-500">
                Giao đến: {activeOrder.deliveryAddress} ({activeOrder.distanceKm} km)
              </p>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <div className="text-slate-500">
                Tiền mặt ứng trả điểm bán:{' '}
                <strong className="text-slate-900 font-semibold">
                  {formatVnd(activeOrder.foodAmount + activeOrder.vendorGiftAmount)}
                </strong>
              </div>
              <div className="text-slate-500">
                Nhận về ví khi hoàn tất:{' '}
                <strong className="text-emerald-700 font-semibold">
                  {formatVnd(
                    activeOrder.foodAmount +
                      activeOrder.vendorGiftAmount +
                      activeOrder.shippingFee +
                      activeOrder.driverTipAmount
                  )}
                </strong>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {activeOrder.status === 'DRIVER_ASSIGNED' && (
              <>
                <button
                  onClick={() => handleConfirmPurchase(activeOrder.id)}
                  className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Xác nhận đã trả tiền mặt &amp; chụp ảnh món ăn
                </button>

                <button
                  onClick={() => handleReportVendorClosed(activeOrder.id)}
                  className="px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs"
                >
                  Báo cáo điểm bán nghỉ hôm nay
                </button>
              </>
            )}

            {activeOrder.status === 'VENDOR_CLOSED_WAITING_CUSTOMER' && (
              <div className="w-full p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Đang chờ khách hàng chọn phương án xử lý (Hoàn tiền / Hỗ trợ xăng / Đổi điểm bán gần đó)...
              </div>
            )}

            {activeOrder.status === 'WAITING_TOPUP_DIFF' && (
              <div className="w-full p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Khách hàng đã chọn đổi sang {activeOrder.vendor?.name} và đang thanh toán phần chênh lệch {formatVnd(activeOrder.pendingTopupDiffAmount)}...
              </div>
            )}

            {activeOrder.status === 'PURCHASED_DELIVERING' && (
              <button
                onClick={() => handleCompleteDelivery(activeOrder.id)}
                className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Xác nhận đã giao hàng &amp; nhận giải ngân về ví
              </button>
            )}
          </div>
        </div>
      )}

      {/* Map + Available Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map 7 cols */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
            <span className="font-semibold text-slate-900">Bản đồ dẫn đường</span>
            {roadRoute && (
              <span className="text-slate-500">
                Lộ trình: <strong className="text-slate-900">{roadRoute.distanceKm} km</strong> (~{roadRoute.durationMinutes} phút) · Điểm {routeStepIndex + 1}/{roadRoute.coordinates.length}
              </span>
            )}
          </div>
          <div className="h-[320px] rounded-md overflow-hidden border border-slate-100">
            <MapContainer center={[10.7755, 106.675]} zoom={14} scrollWheelZoom={true}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[currentCoords.lat, currentCoords.lng]} icon={driverIcon}>
                <Popup>Vị trí hiện tại của bạn</Popup>
              </Marker>
              {previewVendor && (
                <Marker
                  position={[previewVendor.latitude, previewVendor.longitude]}
                  icon={vendorIcon}
                >
                  <Popup>{previewVendor.name}</Popup>
                </Marker>
              )}
              <Marker
                position={[
                  activeOrder?.deliveryLat || 10.7726,
                  activeOrder?.deliveryLng || 106.6579,
                ]}
                icon={customerIcon}
              >
                <Popup>Điểm giao khách hàng</Popup>
              </Marker>
              {roadRoute && roadRoute.coordinates.length > 1 && (
                <Polyline
                  positions={roadRoute.coordinates}
                  pathOptions={{
                    color: '#0f172a',
                    weight: 4,
                    opacity: 0.85,
                  }}
                />
              )}
            </MapContainer>
          </div>
        </div>

        {/* Available Orders 5 cols */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Đơn hàng đang chờ nhận ({availableOrders.length})
          </h2>

          {availableOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-xs text-slate-400">
              Hiện chưa có đơn mới. Bạn có thể đặt thử một đơn bên tab Khách hàng để kiểm tra.
            </div>
          ) : (
            availableOrders.map((item, idx) => {
              const o = item.order;
              return (
                <div
                  key={o.id || idx}
                  className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">Đơn #{o.id}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
                      {o.deliveryType === 'INSTANT' ? 'Giao nhanh' : 'Linh hoạt'}
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-medium text-slate-900">
                      Mua tại: {o.vendor?.name}
                    </div>
                    <div className="text-slate-500">Giao tới: {o.deliveryAddress}</div>
                    <div className="text-slate-500 pt-1">
                      Cần ứng tiền mặt: <strong className="text-slate-900">{formatVnd(item.cashNeededForVendor)}</strong> · Phí ship:{' '}
                      <strong className="text-emerald-700">{formatVnd(o.shippingFee)}</strong>
                    </div>
                  </div>

                  <button
                    disabled={!item.canAccept}
                    onClick={() => handleAcceptOrder(o.id)}
                    className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-medium transition"
                  >
                    {item.canAccept ? 'Nhận đơn' : 'Không đủ tiền mặt để ứng'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
