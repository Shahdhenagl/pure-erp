import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Truck,
  Search,
  CheckCircle2,
  Clock,
  PhoneCall,
  PackageCheck,
  ShoppingBag,
  ArrowRight,
  MapPin,
  Calendar,
  AlertCircle,
  Check,
  ChevronLeft,
  Store,
  Printer,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { erpStore, Order, Trader } from "@/lib/erpStore";
import PrintableInvoiceModal from "@/components/PrintableInvoiceModal";

export default function TrackingPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [traderOrders, setTraderOrders] = useState<Order[]>([]);
  const [trader, setTrader] = useState<Trader | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Check URL parameters for prefilled order
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderParam = urlParams.get("order");
    if (orderParam) {
      setSearchQuery(orderParam);
      const match = erpStore.findOrder(orderParam);
      if (match) {
        setSelectedOrder(match);
      }
    }
  }, []);

  // Listen to store updates
  useEffect(() => {
    const t = erpStore.getTrader();
    setTrader(t);
    if (t) {
      setTraderOrders(erpStore.getOrdersForPhone(t.phone));
    } else {
      // Default to first few recent orders for easy demo
      setTraderOrders(erpStore.getOrders().slice(0, 5));
    }

    return erpStore.subscribe(() => {
      const updatedTrader = erpStore.getTrader();
      setTrader(updatedTrader);
      if (updatedTrader) {
        setTraderOrders(erpStore.getOrdersForPhone(updatedTrader.phone));
      } else {
        setTraderOrders(erpStore.getOrders().slice(0, 5));
      }
      if (selectedOrder) {
        const refreshed = erpStore.findOrder(selectedOrder.order_number);
        if (refreshed) setSelectedOrder(refreshed);
      }
    });
  }, [selectedOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchAttempted(true);
    const match = erpStore.findOrder(searchQuery.trim());
    setSelectedOrder(match || null);
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "تم التسليم":
        return "bg-[#edf7ed] text-[#2b8a4f] border-[#c1e6cd]";
      case "خرج للشحن":
        return "bg-[#e8f3ff] text-[#1c64b8] border-[#bedcff]";
      case "قيد التجهيز":
        return "bg-[#fff7e6] text-[#b36b12] border-[#fce3b8]";
      case "معلق":
        return "bg-[#f5f5f5] text-[#6d7572] border-[#dedede]";
      case "ملغي":
        return "bg-[#fdeeed] text-[#b53128] border-[#f8c6c4]";
    }
  };

  // Steps definition for timeline
  const steps: { key: Order["status"]; label: string; desc: string }[] = [
    { key: "معلق", label: "تم استلام الطلب", desc: "تم تأكيد طلبك في النظام وجاري مراجعته" },
    { key: "قيد التجهيز", label: "قيد التجهيز بالمصنع", desc: "صرف وتجهيز البضاعة من مخزن التوزيع" },
    { key: "خرج للشحن", label: "خرج للشحن والتوصيل", desc: "الشحنة على سيارة التوزيع مع المندوب" },
    { key: "تم التسليم", label: "تم التسليم بنجاح", desc: "تم تسليم الطلب للتاجر واستلام الفاتورة" },
  ];

  const getStepState = (stepKey: Order["status"], currentStatus: Order["status"]) => {
    const orderRanks: Record<Order["status"], number> = {
      معلق: 1,
      "قيد التجهيز": 2,
      "خرج للشحن": 3,
      "تم التسليم": 4,
      ملغي: 0,
    };
    const currentRank = orderRanks[currentStatus] || 1;
    const stepRank = orderRanks[stepKey] || 1;

    if (currentRank > stepRank) return "completed";
    if (currentRank === stepRank) return "current";
    return "pending";
  };

  return (
    <div className="min-h-screen bg-[#fafaf7] text-[#1b342e]" dir="rtl">
      {/* Top Header */}
      <header className="bg-white border-b border-[#e6eae6] sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link href="/store" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#256149] text-white flex items-center justify-center font-black text-xl">
              P
            </div>
            <div>
              <div className="text-base font-black text-[#1b3e34] leading-tight">
                بيور <span className="text-[#c75e3a]">PURE</span>
              </div>
              <div className="text-[10px] text-[#718b80] font-bold">تتبع طلبات التجار والمحلات</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/store"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#256149] bg-[#edf5f0] hover:bg-[#e1efe8] rounded-xl transition-colors"
            >
              <ShoppingBag size={14} />
              <span>العودة للمتجر</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Title & Search Bar */}
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#edf5f0] text-[#256149] mx-auto flex items-center justify-center mb-3">
            <Truck size={24} />
          </div>
          <h1 className="text-2xl font-black text-[#1c3e34]">تتبع خط سير طلباتك</h1>
          <p className="text-xs text-[#6e857b] mt-1.5">
            اكتب رقم الطلب (مثال: <span className="font-mono font-bold text-[#c75e3a]">ORD-24091</span>) أو رقم الهاتف لمتابعة موقع شحنتك ومندوب التوصيل
          </p>

          <form onSubmit={handleSearch} className="mt-5 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="أدخل رقم الطلب أو رقم الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-3 text-xs bg-white border border-[#d6dfd8] rounded-xl shadow-xs focus:outline-none focus:border-[#256149]"
              />
              <Search size={16} className="absolute right-3.5 top-3.5 text-[#85978f]" />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-[#256149] hover:bg-[#1b4a37] text-white text-xs font-black rounded-xl shadow-sm transition-colors"
            >
              تتبع الطلب
            </button>
          </form>
        </div>

        {/* Selected Order Tracking Detail */}
        {selectedOrder ? (
          <div className="bg-white rounded-3xl border border-[#e0e7e1] p-6 sm:p-8 shadow-sm mb-8 animate-in fade-in-50">
            {/* Order Card Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#edf1ed] gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black font-mono text-[#c75e3a]">
                    #{selectedOrder.order_number}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold border ${getStatusColor(
                      selectedOrder.status
                    )}`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <div className="text-xs text-[#678076] mt-1 flex items-center gap-2">
                  <Store size={14} className="text-[#9ab1a6]" />
                  <span>{selectedOrder.business_name}</span>
                  {selectedOrder.contact_name && <span>• {selectedOrder.contact_name}</span>}
                  <span>• هاتف: {selectedOrder.phone}</span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-xs text-[#80948b]">تاريخ الطلب</div>
                <div className="text-xs font-bold text-[#23453b]">
                  {new Date(selectedOrder.created_at).toLocaleDateString("ar-EG", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>

            {/* Quick Action Buttons: 1-Click Reorder & Print Invoice */}
            <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3 bg-[#f8faf8] p-3 rounded-2xl border border-[#e5ebe6]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const items = selectedOrder.items.map((i) => ({
                      productId: i.product_id,
                      quantity: i.quantity,
                    }));
                    erpStore.setPendingReorder(items);
                    toast.success("تم تجهيز أصناف هذا الطلب في سلة الشراء!");
                    setLocation("/store?open_cart=true");
                  }}
                  className="px-4 py-2 bg-[#256149] hover:bg-[#1b4d3a] text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={14} />
                  <span>إعادة طلب هذه الكمية مجدداً (طلب سريع)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-3.5 py-2 bg-white hover:bg-[#edf5f0] text-[#1c3e34] border border-[#d0ded5] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} className="text-[#c75e3a]" />
                  <span>طباعة الفاتورة / إيصال الاستلام</span>
                </button>
              </div>
            </div>

            {/* Representative & Vehicle Card (if shipped or assigned) */}
            {selectedOrder.representative_name && (
              <div className="mt-6 bg-[#f4f8f5] border border-[#dce7e0] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#256149] text-white flex items-center justify-center font-bold">
                    <Truck size={20} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#256149]">مندوب التوصيل الميداني:</div>
                    <div className="text-sm font-black text-[#1b3e34]">
                      {selectedOrder.representative_name}
                    </div>
                    {selectedOrder.vehicle_name && (
                      <div className="text-xs text-[#5f7a6f]">{selectedOrder.vehicle_name}</div>
                    )}
                  </div>
                </div>

                {selectedOrder.representative_phone && (
                  <a
                    href={`tel:${selectedOrder.representative_phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#cbe0d3] hover:bg-[#eaf4ee] text-[#1e523e] rounded-xl text-xs font-black shadow-xs transition-colors"
                  >
                    <PhoneCall size={14} className="text-[#256149]" />
                    <span>اتصال بالمندوب ({selectedOrder.representative_phone})</span>
                  </a>
                )}
              </div>
            )}

            {/* Timeline Progress Tracker */}
            <div className="mt-8">
              <h3 className="text-xs font-extrabold text-[#2a4d41] mb-6">مراحل الشحن والتسليم:</h3>
              <div className="relative">
                {/* Timeline Bar */}
                <div className="hidden sm:block absolute top-5 right-6 left-6 h-1 bg-[#e8eee9] -z-0" />

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 relative z-10">
                  {steps.map((step, idx) => {
                    const state = getStepState(step.key, selectedOrder.status);
                    return (
                      <div key={step.key} className="flex sm:flex-col items-center sm:items-center gap-4 sm:gap-2 text-right sm:text-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                            state === "completed"
                              ? "bg-[#256149] text-white shadow-sm"
                              : state === "current"
                              ? "bg-[#c75e3a] text-white ring-4 ring-[#fae4db]"
                              : "bg-[#e8ece8] text-[#86968f]"
                          }`}
                        >
                          {state === "completed" ? <Check size={18} /> : idx + 1}
                        </div>
                        <div>
                          <div
                            className={`text-xs font-black ${
                              state === "current"
                                ? "text-[#c75e3a]"
                                : state === "completed"
                                ? "text-[#256149]"
                                : "text-[#7b8c85]"
                            }`}
                          >
                            {step.label}
                          </div>
                          <div className="text-[10px] text-[#83968e] mt-0.5 max-w-xs">{step.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Items Breakdown */}
            <div className="mt-8 pt-6 border-t border-[#edf1ed]">
              <h3 className="text-xs font-extrabold text-[#2a4d41] mb-3">الأصناف المطلوبة بالفاتورة:</h3>
              <div className="divide-y divide-[#f0f3f0] border border-[#e5ebe6] rounded-2xl overflow-hidden">
                {selectedOrder.items.map((item, index) => (
                  <div
                    key={index}
                    className="p-3.5 bg-[#fbfcfb] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#1c3e34]">{item.product_name}</span>
                      <span className="text-[#6d8279] mr-2">
                        × {item.quantity} كرتونة
                      </span>
                    </div>
                    <div className="font-black text-[#1b4e3c]">
                      {(item.unit_price * item.quantity).toFixed(2)} ج.م
                    </div>
                  </div>
                ))}
                <div className="p-4 bg-[#f4f7f4] flex items-center justify-between text-sm font-black text-[#1c3e34]">
                  <span>إجمالي قيمة الطلب:</span>
                  <span className="text-base text-[#c75e3a]">{selectedOrder.total.toFixed(2)} ج.م</span>
                </div>
              </div>
            </div>

            {/* Address & Notes */}
            <div className="mt-5 p-4 bg-[#f8faf8] border border-[#e5ece7] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#526c62]">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-[#c75e3a] shrink-0" />
                <span>
                  <b>عنوان التوصيل:</b> {selectedOrder.address}
                </span>
              </div>
              {selectedOrder.notes && (
                <div className="text-[#805e2d] bg-[#fef8ed] px-3 py-1.5 rounded-lg border border-[#f5e6cb]">
                  <b>ملاحظة:</b> {selectedOrder.notes}
                </div>
              )}
            </div>
          </div>
        ) : searchAttempted ? (
          <div className="bg-white rounded-3xl border border-[#e6ebe6] p-10 text-center max-w-md mx-auto mb-8 shadow-xs">
            <AlertCircle size={40} className="text-[#c75e3a] mx-auto mb-3" />
            <h3 className="text-base font-black text-[#1c3e34]">لم يتم العثور على طلب بهذا الرقم</h3>
            <p className="text-xs text-[#738a80] mt-1">
              تأكد من كتابة رقم الطلب بصيغة صحيحة (مثال: ORD-24091) أو رقم هاتف التاجر المسجل.
            </p>
          </div>
        ) : null}

        {/* Recent / Merchant Orders Quick Selection List */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-[#1b3e34]">
              {trader ? `طلبات متجر ${trader.business_name}:` : "آخر الطلبات المسجلة في النظام:"}
            </h2>
            <span className="text-xs text-[#6e857b]">اضغط على أي طلب لعرض تفاصيله وموقعه</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {traderOrders.map((ord) => (
              <button
                key={ord.id}
                onClick={() => {
                  setSelectedOrder(ord);
                  setSearchQuery(ord.order_number);
                }}
                className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                  selectedOrder?.id === ord.id
                    ? "bg-[#f2f8f4] border-[#256149] shadow-sm"
                    : "bg-white border-[#e4ebe5] hover:border-[#256149] hover:shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-xs text-[#c75e3a]">
                      #{ord.order_number}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getStatusColor(
                        ord.status
                      )}`}
                    >
                      {ord.status}
                    </span>
                  </div>
                  <div className="font-extrabold text-xs text-[#1c3e34]">{ord.business_name}</div>
                  <div className="text-[11px] text-[#788e84] truncate mt-0.5">{ord.address}</div>
                </div>

                <div className="mt-4 pt-2 border-t border-[#edf1ed] flex items-center justify-between text-xs">
                  <span className="font-black text-[#1b4e3c]">{ord.total.toFixed(2)} ج.م</span>
                  <span className="text-[10px] text-[#8ea097] flex items-center gap-1">
                    <span>عرض التفاصيل</span>
                    <ChevronLeft size={12} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Printable Invoice Modal */}
      {isPrintModalOpen && selectedOrder && (
        <PrintableInvoiceModal
          order={selectedOrder}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
}
