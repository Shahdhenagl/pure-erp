import { Printer, X, CheckCircle2, Truck, Store, MapPin, Phone } from "lucide-react";
import { Order } from "@/lib/erpStore";

interface PrintableInvoiceModalProps {
  order: Order;
  onClose: () => void;
}

export default function PrintableInvoiceModal({ order, onClose }: PrintableInvoiceModalProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#d2ded6] my-auto">
        {/* Modal Controls (Not printed) */}
        <div className="p-4 bg-[#1c3e34] text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-[#f5c697]" />
            <h3 className="font-extrabold text-sm">فاتورة ضريبية وإيصال استلام بضاعة</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#256149] hover:bg-[#1a4a37] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer size={14} />
              <span>طباعة فورية</span>
            </button>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div id="printable-invoice" className="p-6 sm:p-8 text-[#1b342e] text-xs bg-white">
          {/* Header */}
          <div className="flex items-start justify-between pb-5 border-b-2 border-[#1c3e34]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#1c3e34] text-white flex items-center justify-center font-black text-2xl">
                P
              </div>
              <div>
                <h1 className="text-lg font-black text-[#1c3e34] leading-tight">
                  مصنع بيور للمنتجات الغذائية
                </h1>
                <div className="text-[10px] text-[#59756b] font-bold">
                  PURE FOOD SYSTEM • إدارة المبيعات وتجارة الجملة
                </div>
                <div className="text-[9px] text-[#8aa096] mt-0.5">
                  س.ت: 89412 • ب.ض: 421-980-312 • المصنع: مجمع الصناعات الغذائية
                </div>
              </div>
            </div>

            <div className="text-left">
              <div className="inline-block bg-[#f4f8f5] border border-[#d6e3db] px-3 py-1 rounded-lg">
                <span className="text-[10px] text-[#718b80] block font-bold">رقم الفاتورة / الطلب</span>
                <span className="font-mono text-sm font-black text-[#c75e3a]">#{order.order_number}</span>
              </div>
              <div className="text-[10px] text-[#7d9389] mt-1 font-bold">
                {new Date(order.created_at).toLocaleDateString("ar-EG", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>

          {/* Customer & Delivery Van Info */}
          <div className="grid grid-cols-2 gap-4 my-5 p-4 bg-[#fbfdfb] border border-[#e4ece5] rounded-2xl">
            {/* Merchant Details */}
            <div>
              <div className="text-[10px] font-extrabold text-[#256149] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Store size={12} />
                <span>بيانات العميل والمحل</span>
              </div>
              <div className="text-xs font-black text-[#1c3e34]">{order.business_name}</div>
              {order.contact_name && (
                <div className="text-[11px] text-[#546e63]">المسؤول: {order.contact_name}</div>
              )}
              <div className="text-[11px] text-[#546e63]">هاتف: {order.phone}</div>
              <div className="text-[11px] text-[#546e63] mt-0.5">العنوان: {order.address}</div>
            </div>

            {/* Van & Rep Details */}
            <div>
              <div className="text-[10px] font-extrabold text-[#256149] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Truck size={12} />
                <span>سيارة ومندوب التوزيع</span>
              </div>
              <div className="text-xs font-black text-[#1c3e34]">
                {order.representative_name || "قسم التوزيع المركزي"}
              </div>
              <div className="text-[11px] text-[#546e63]">
                السيارة: {order.vehicle_name || "سيارة التوزيع الميداني (VAN)"}
              </div>
              {order.representative_phone && (
                <div className="text-[11px] text-[#546e63]">
                  هاتف المندوب: {order.representative_phone}
                </div>
              )}
              <div className="text-[11px] text-[#2b8a4f] font-bold mt-0.5">
                حالة الإيصال: {order.status}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="my-5 border border-[#e2eae3] rounded-2xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#f2f7f3] border-b border-[#e2eae3] text-[#3e5e51]">
                  <th className="p-2.5">م</th>
                  <th className="p-2.5">الصنف والوصف</th>
                  <th className="p-2.5 text-center">الكمية</th>
                  <th className="p-2.5 text-center">سعر الكرتونة</th>
                  <th className="p-2.5 text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf3ee]">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#fcfdfc]">
                    <td className="p-2.5 text-[#7c9187] font-mono">{idx + 1}</td>
                    <td className="p-2.5 font-bold text-[#1c3e34]">{item.product_name}</td>
                    <td className="p-2.5 text-center font-black text-[#1c3e34]">
                      {item.quantity} كرتونة
                    </td>
                    <td className="p-2.5 text-center text-[#557064]">
                      {item.unit_price.toFixed(2)} ج.م
                    </td>
                    <td className="p-2.5 text-left font-black text-[#1c3e34]">
                      {(item.unit_price * item.quantity).toFixed(2)} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end my-4">
            <div className="w-64 space-y-1.5 p-3.5 bg-[#f5f8f5] rounded-xl border border-[#dde7df] text-xs">
              <div className="flex justify-between text-[#597368]">
                <span>المجموع الفرعي:</span>
                <span>{order.total.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-[#597368]">
                <span>شحن سيارة التوزيع:</span>
                <span className="text-[#2b8a4f] font-bold">مجاني</span>
              </div>
              <div className="flex justify-between text-sm font-black text-[#1c3e34] pt-2 border-t border-[#d8e3db]">
                <span>صافي الفاتورة:</span>
                <span className="text-[#c75e3a]">{order.total.toFixed(2)} ج.م</span>
              </div>
            </div>
          </div>

          {/* Signatures & Receipt Acknowledgment */}
          <div className="mt-8 pt-6 border-t border-[#edf1ed] grid grid-cols-2 gap-8 text-[11px] text-[#4d665b]">
            <div className="border border-dashed border-[#ccd9cf] p-4 rounded-xl text-center">
              <div className="font-bold mb-8">توقيع وخاتم المستلم (المحل / التاجر):</div>
              <div className="text-[10px] text-[#8ea097]">................................................</div>
            </div>
            <div className="border border-dashed border-[#ccd9cf] p-4 rounded-xl text-center">
              <div className="font-bold mb-8">توقيع مندوب سيارة التوزيع:</div>
              <div className="text-[10px] text-[#8ea097]">................................................</div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-6 text-center text-[10px] text-[#7d9389]">
            شكرًا لتعاملكم مع مصنع بيور للأغذية • البضاعة المباعة تخضع للمواصفات القياسية للجودة
          </div>
        </div>
      </div>
    </div>
  );
}
