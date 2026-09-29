import { useEffect, useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Factory,
  Warehouse,
  Boxes,
  ClipboardList,
  Truck,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Play,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Package,
  Store,
  ChevronDown,
  Layers,
  Sparkles,
  PhoneCall,
  MapPin,
  RefreshCw,
  X,
  FileCheck2,
  Printer,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";
import {
  erpStore,
  Warehouse as WarehouseType,
  Product,
  Recipe,
  ProductionBatch,
  StockMovement,
  Order,
} from "@/lib/erpStore";
import PrintableInvoiceModal from "@/components/PrintableInvoiceModal";

type DashboardTab = "overview" | "manufacturing" | "warehouses" | "orders" | "movements";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("manufacturing");
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Production Execution Form
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [productionQty, setProductionQty] = useState<number>(20);
  const [rawWhId, setRawWhId] = useState("wh-raw-01");
  const [pkgWhId, setPkgWhId] = useState("wh-pkg-02");
  const [distWhId, setDistWhId] = useState("wh-dist-03");
  const [productionNotes, setProductionNotes] = useState("");

  // Production Planner & Shortage Calculator state
  const [plannerRecipeId, setPlannerRecipeId] = useState("");
  const [plannerQty, setPlannerQty] = useState<number>(50);

  // Selected Order for Invoice Print
  const [orderForPrint, setOrderForPrint] = useState<Order | null>(null);

  // Transfer Form Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferProductId, setTransferProductId] = useState("");
  const [transferFromWh, setTransferFromWh] = useState("wh-dist-03");
  const [transferToWh, setTransferToWh] = useState("van-01");
  const [transferQuantity, setTransferQuantity] = useState<number>(10);

  // Selected Order for Status Update Modal
  const [orderModal, setOrderModal] = useState<Order | null>(null);
  const [newOrderStatus, setNewOrderStatus] = useState<Order["status"]>("قيد التجهيز");
  const [assignedVehicle, setAssignedVehicle] = useState("VAN-01");

  // Sync with erpStore
  const loadState = () => {
    setWarehouses(erpStore.getWarehouses());
    setProducts(erpStore.getProducts());
    setRecipes(erpStore.getRecipes());
    setBatches(erpStore.getBatches());
    setMovements(erpStore.getMovements());
    setOrders(erpStore.getOrders());

    const r = erpStore.getRecipes();
    if (r.length && !selectedRecipeId) {
      setSelectedRecipeId(r[0].id);
    }
    if (r.length && !plannerRecipeId) {
      setPlannerRecipeId(r[0].id);
    }
  };

  useEffect(() => {
    loadState();
    return erpStore.subscribe(loadState);
  }, []);

  const plannerCalc = useMemo(() => {
    const targetRecipeId = plannerRecipeId || selectedRecipeId;
    if (!targetRecipeId) return null;
    return erpStore.calculateBOMRequirements(targetRecipeId, plannerQty);
  }, [plannerRecipeId, selectedRecipeId, plannerQty, products, warehouses]);

  const lowStockAlerts = useMemo(() => {
    return erpStore.getLowStockAlerts();
  }, [products, warehouses]);

  // Selected Recipe details
  const activeRecipe = useMemo(() => {
    return recipes.find((r) => r.id === selectedRecipeId);
  }, [recipes, selectedRecipeId]);

  // Ingredients required for currently selected quantity
  const requiredIngredients = useMemo(() => {
    if (!activeRecipe) return [];
    const multiplier = productionQty / (activeRecipe.output_quantity || 1);
    return activeRecipe.items.map((item) => {
      const required = item.required_quantity * multiplier;
      const targetWh = item.item_type === "packaging" ? pkgWhId : rawWhId;
      const available = erpStore.getStock(item.ingredient_id, targetWh);
      const isSufficient = available >= required;
      return {
        ...item,
        required,
        available,
        isSufficient,
        targetWhName: warehouses.find((w) => w.id === targetWh)?.name || "",
      };
    });
  }, [activeRecipe, productionQty, rawWhId, pkgWhId, warehouses]);

  const canExecuteProduction = useMemo(() => {
    return (
      requiredIngredients.length > 0 &&
      productionQty > 0 &&
      requiredIngredients.every((item) => item.isSufficient)
    );
  }, [requiredIngredients, productionQty]);

  // Handle execute production
  const handleExecuteProduction = () => {
    if (!selectedRecipeId) {
      toast.error("يرجى اختيار وصفة التصنيع أولاً");
      return;
    }
    const result = erpStore.executeProduction({
      recipeId: selectedRecipeId,
      quantity: Number(productionQty),
      rawWarehouseId: rawWhId,
      packagingWarehouseId: pkgWhId,
      distributionWarehouseId: distWhId,
      notes: productionNotes.trim() || undefined,
    });

    if (result.success) {
      toast.success(result.message);
      setProductionNotes("");
    } else {
      toast.error(result.message);
    }
  };

  // Handle transfer
  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProductId) {
      toast.error("اختر الصنف المراد تحويله");
      return;
    }
    const result = erpStore.transferStock({
      productId: transferProductId,
      fromWarehouseId: transferFromWh,
      toWarehouseId: transferToWh,
      quantity: Number(transferQuantity),
      reference: `تحويل بضاعة لسيارة التوزيع`,
    });
    if (result.success) {
      toast.success(result.message);
      setIsTransferModalOpen(false);
    } else {
      toast.error(result.message);
    }
  };

  // Handle Order Status Update
  const handleUpdateOrderStatus = () => {
    if (!orderModal) return;

    let repName: string | undefined;
    let repPhone: string | undefined;
    let vehicleName: string | undefined;

    if (newOrderStatus === "خرج للشحن") {
      const v = warehouses.find((w) => w.code === assignedVehicle);
      if (v) {
        repName = v.rep_name;
        repPhone = v.rep_phone;
        vehicleName = v.name;
      }
    }

    erpStore.updateOrderStatus(
      orderModal.id,
      newOrderStatus,
      `تم تحديث الحالة إلى ${newOrderStatus} وإسناد الشحنة`,
      repName,
      repPhone,
      vehicleName
    );

    toast.success(`تم تحديث حالة الطلب #${orderModal.order_number}`);
    setOrderModal(null);
  };

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-[#1c3e34]" dir="rtl">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#e5ebe5] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#256149] to-[#174332] text-white flex items-center justify-center font-black text-2xl shadow-sm">
              P
            </div>
            <div>
              <div className="text-lg font-black text-[#1b3e34] leading-tight">
                لوحة تشغيل وإدارة مصنع بيور
              </div>
              <div className="text-[10px] text-[#6a877b] font-bold">
                PURE Food System • إدارة دورة التصنيع والمخازن الرباعية
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-3">
            <Link
              href="/store"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#256149] hover:bg-[#1a4a37] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Store size={15} />
              <span>زيارة متجر التجار</span>
            </Link>
            <Link
              href="/tracking"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-[#edf4f0] hover:bg-[#dfeee5] text-[#256149] text-xs font-bold rounded-xl transition-colors"
            >
              <Truck size={15} />
              <span>تتبع الطلبات</span>
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto border-t border-[#f0f3f0] pt-1">
          <button
            onClick={() => setActiveTab("manufacturing")}
            className={`px-4 py-2.5 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "manufacturing"
                ? "border-[#c75e3a] text-[#c75e3a]"
                : "border-transparent text-[#6e857b] hover:text-[#1b3e34]"
            }`}
          >
            <Factory size={16} />
            <span>دورة التصنيع والوصفات (BOM)</span>
          </button>

          <button
            onClick={() => setActiveTab("warehouses")}
            className={`px-4 py-2.5 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "warehouses"
                ? "border-[#c75e3a] text-[#c75e3a]"
                : "border-transparent text-[#6e857b] hover:text-[#1b3e34]"
            }`}
          >
            <Warehouse size={16} />
            <span>المخازن الأربعة والأرصدة</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2.5 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "orders"
                ? "border-[#c75e3a] text-[#c75e3a]"
                : "border-transparent text-[#6e857b] hover:text-[#1b3e34]"
            }`}
          >
            <ClipboardList size={16} />
            <span>طلبات التجار ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("movements")}
            className={`px-4 py-2.5 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "movements"
                ? "border-[#c75e3a] text-[#c75e3a]"
                : "border-transparent text-[#6e857b] hover:text-[#1b3e34]"
            }`}
          >
            <ArrowRightLeft size={16} />
            <span>سجل حركة المخزون</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ===================== TAB 1: MANUFACTURING (دورة التصنيع والوصفات) ===================== */}
        {activeTab === "manufacturing" && (
          <div className="space-y-6">
            {/* Header intro */}
            <div className="bg-linear-to-r from-[#1c3e34] to-[#256149] text-white p-6 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold text-[#fce0c5] mb-2">
                  <Sparkles size={14} />
                  <span>محرك دورة التصنيع وخصم المواد الخام والتغليف تلقائياً</span>
                </div>
                <h2 className="text-xl font-black">
                  دورة الإنتاج ووصفات المنتجات (Bill of Materials)
                </h2>
                <p className="text-xs text-[#c6dfd4] mt-1 max-w-2xl leading-relaxed">
                  عند تشغيل دورة التصنيع، يتم التحقق من توفر المواد في <b>مخزن المواد الخام</b> و<b>مخزن التغليف</b>، وخصمها تلقائياً وإضافة المنتج النهائي ككراتين تامة في <b>مخزن التوزيع</b>.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  className="px-4 py-2.5 bg-white text-[#1c3e34] hover:bg-[#edf5f0] text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <ArrowRightLeft size={15} />
                  <span>تحويل بضاعة للمناديب</span>
                </button>
              </div>
            </div>

            {/* Production Grid: Left Recipe Execution, Right BOM Breakdown & Batches */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Recipe Selector & Execution Box */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-[#e2e8e2] p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-[#1c3e34] flex items-center gap-2">
                      <Factory size={18} className="text-[#c75e3a]" />
                      <span>بدء دورة تصنيع جديدة</span>
                    </h3>
                    <span className="text-[10px] font-bold text-[#256149] bg-[#eef7f2] px-2 py-1 rounded-md">
                      فحص فوري للأرصدة
                    </span>
                  </div>

                  {/* Recipe Picker */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#446357] mb-1">
                        اختر وصفة المنتج النهائي *
                      </label>
                      <select
                        value={selectedRecipeId}
                        onChange={(e) => setSelectedRecipeId(e.target.value)}
                        className="w-full p-2.5 text-xs bg-[#f6f9f7] border border-[#d2ddd6] rounded-xl font-bold text-[#1c3e34] focus:outline-none focus:border-[#256149]"
                      >
                        {recipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.product_name})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity to produce */}
                    <div>
                      <label className="block text-xs font-bold text-[#446357] mb-1">
                        الكمية المطلوب تصنيعها ({activeRecipe?.unit || "كرتونة"}) *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="10000"
                          value={productionQty}
                          onChange={(e) => setProductionQty(Math.max(1, Number(e.target.value)))}
                          className="w-full p-2.5 text-sm font-black bg-[#f6f9f7] border border-[#d2ddd6] rounded-xl text-[#1c3e34] focus:outline-none focus:border-[#256149]"
                        />
                        <span className="text-xs font-bold text-[#627d72] whitespace-nowrap">
                          {activeRecipe?.unit}
                        </span>
                      </div>
                    </div>

                    {/* Target Warehouses */}
                    <div className="p-3.5 bg-[#f5f8f5] rounded-2xl border border-[#dde7df] space-y-2 text-xs">
                      <div className="text-[11px] font-bold text-[#256149]">
                        مسار خصم وإيداع المخازن للدورة:
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#557064]">
                        <span>خصم الخامات من:</span>
                        <b className="text-[#1c3e34]">مخزن المواد الخام (WH-RAW)</b>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#557064]">
                        <span>خصم مواد التغليف من:</span>
                        <b className="text-[#1c3e34]">مخزن مواد التعبئة (WH-PKG)</b>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#557064]">
                        <span>إضافة المنتج النهائي التام إلى:</span>
                        <b className="text-[#256149]">مخزن التوزيع (WH-DIST)</b>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-bold text-[#446357] mb-1">
                        ملاحظات الدورة أو رقم الوجبة (اختياري)
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: تشغيلة توريد الأسبوع الأول"
                        value={productionNotes}
                        onChange={(e) => setProductionNotes(e.target.value)}
                        className="w-full p-2 text-xs bg-[#f6f9f7] border border-[#d2ddd6] rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Execution Button */}
                <div className="mt-6 pt-4 border-t border-[#edf1ed]">
                  <button
                    onClick={handleExecuteProduction}
                    disabled={!canExecuteProduction}
                    className={`w-full py-3.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
                      canExecuteProduction
                        ? "bg-[#256149] hover:bg-[#1a4a37] text-white hover:scale-101 cursor-pointer"
                        : "bg-[#e2e7e3] text-[#8e9f96] cursor-not-allowed"
                    }`}
                  >
                    <Play size={16} />
                    <span>
                      {canExecuteProduction
                        ? `تنفيذ دورة تصنيع (${productionQty} ${activeRecipe?.unit}) والخصم الفوري`
                        : "الرصيد غير كافٍ في المخازن لتشغيل هذه الكمية"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Recipe Components Breakdown (BOM Ingredients) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white rounded-3xl border border-[#e2e8e2] p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-black text-[#1c3e34]">
                        مكونات الوصفة المطلوبة لتصنيع ({productionQty} {activeRecipe?.unit})
                      </h3>
                      <p className="text-xs text-[#6e857b] mt-0.5">
                        {activeRecipe?.description}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#c75e3a]">
                      {activeRecipe?.items.length} مكونات
                    </span>
                  </div>

                  {/* Components Table */}
                  <div className="divide-y divide-[#edf1ed] border border-[#e4ebe5] rounded-2xl overflow-hidden">
                    {requiredIngredients.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 flex items-center justify-between text-xs transition-colors ${
                          item.isSufficient ? "bg-white" : "bg-[#fdf3f2]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              item.item_type === "packaging"
                                ? "bg-[#fbf1ea] text-[#c75e3a]"
                                : "bg-[#edf5f0] text-[#256149]"
                            }`}
                          >
                            {item.item_type === "packaging" ? "تغليف" : "خام"}
                          </div>
                          <div>
                            <div className="font-extrabold text-[#1c3e34]">
                              {item.ingredient_name}
                            </div>
                            <div className="text-[11px] text-[#71887e]">
                              مسحوبة من: {item.targetWhName}
                            </div>
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="font-black text-[#1c3e34]">
                            المطلوب: {item.required.toFixed(2)} {item.unit}
                          </div>
                          <div
                            className={`text-[11px] font-bold ${
                              item.isSufficient ? "text-[#2b8a4f]" : "text-[#c75e3a]"
                            }`}
                          >
                            المتاح بالمخزن: {item.available.toFixed(2)} {item.unit}{" "}
                            {item.isSufficient ? "✓" : "(عجز مخزون ⚠️)"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Batches History */}
                <div className="bg-white rounded-3xl border border-[#e2e8e2] p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-[#1c3e34] flex items-center gap-2">
                      <FileCheck2 size={17} className="text-[#256149]" />
                      <span>سجل دورات التصنيع المنفذة بالمصنع</span>
                    </h3>
                    <span className="text-xs text-[#71887e]">
                      {batches.length} تشغيلات سابقة
                    </span>
                  </div>

                  <div className="space-y-3">
                    {batches.slice(0, 4).map((batch) => (
                      <div
                        key={batch.id}
                        className="p-3.5 bg-[#fbfcfb] border border-[#e5ebe5] rounded-2xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#eef7f2] text-[#256149] flex items-center justify-center font-bold">
                            <Factory size={18} />
                          </div>
                          <div>
                            <div className="font-black text-[#1c3e34]">
                              {batch.product_name}
                            </div>
                            <div className="text-[10px] text-[#738a80]">
                              كود: <span className="font-mono">{batch.batch_number}</span> •{" "}
                              {new Date(batch.created_at).toLocaleDateString("ar-EG")}
                            </div>
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="font-black text-[#256149]">
                            + {batch.quantity} كرتونة لمخزن التوزيع
                          </div>
                          <span className="inline-block mt-0.5 px-2 py-0.5 bg-[#edf7ed] text-[#2b8a4f] text-[10px] font-extrabold rounded-md">
                            مكتملة ومخصومة ✓
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Smart Production Planner & Shortage Calculator */}
                {plannerCalc && (
                  <div className="bg-white rounded-3xl border border-[#e2e8e2] p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#f0f6f3] text-[#256149] flex items-center justify-center font-bold">
                          <Calculator size={17} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-[#1c3e34]">
                            حاسبة تخطيط الإنتاج والنواقص الذكية
                          </h3>
                          <p className="text-[11px] text-[#6e857b]">
                            احسب احتياجات أي طلبية واكتشف عجز الخامات وتكلفة الإنتاج قبل التشغيل
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#c75e3a] bg-[#fff3ee] px-2.5 py-1 rounded-md">
                        مبيعات متوقعة: {plannerCalc.estimatedRevenue.toFixed(0)} ج.م
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-[11px] font-bold text-[#446357] mb-1">
                          الوصفة المستهدفة:
                        </label>
                        <select
                          value={plannerRecipeId}
                          onChange={(e) => setPlannerRecipeId(e.target.value)}
                          className="w-full p-2 text-xs bg-[#f6f9f7] border border-[#d2ddd6] rounded-xl font-bold"
                        >
                          {recipes.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#446357] mb-1">
                          الكمية المستهدفة ({plannerCalc.recipe.unit}):
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={plannerQty}
                          onChange={(e) => setPlannerQty(Math.max(1, Number(e.target.value)))}
                          className="w-full p-2 text-xs bg-[#f6f9f7] border border-[#d2ddd6] rounded-xl font-black"
                        />
                      </div>
                    </div>

                    <div className="divide-y divide-[#edf1ed] border border-[#e4ebe5] rounded-2xl overflow-hidden text-xs">
                      {plannerCalc.items.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 flex items-center justify-between ${
                            item.isSufficient ? "bg-white" : "bg-[#fdf3f2]"
                          }`}
                        >
                          <div>
                            <span className="font-extrabold text-[#1c3e34]">{item.ingredient_name}</span>
                            <span className="text-[10px] text-[#788e84] mr-2">
                              (المطلوب: {item.required.toFixed(2)} {item.unit})
                            </span>
                          </div>
                          <div>
                            {item.isSufficient ? (
                              <span className="text-[11px] font-bold text-[#2b8a4f] bg-[#eef7f2] px-2 py-0.5 rounded-md">
                                متوفر بالمخزن ({item.available.toFixed(1)} {item.unit}) ✓
                              </span>
                            ) : (
                              <span className="text-[11px] font-black text-[#c75e3a] bg-[#ffeeeb] px-2 py-0.5 rounded-md">
                                عجز مخزون: {item.shortage.toFixed(2)} {item.unit} مطلوب شراؤها! ⚠️
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: WAREHOUSES (المخازن الأربعة والأرصدة) ===================== */}
        {activeTab === "warehouses" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#1c3e34]">
                  هيكلة المخازن الأربعة (المواد الخام، التغليف، التوزيع، سيارات المناديب)
                </h2>
                <p className="text-xs text-[#6e857b]">
                  متابعة أرصدة كل مخزن بدقة لمنع العجز وحساب تكلفة الإنتاج
                </p>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(true)}
                className="px-4 py-2 bg-[#256149] hover:bg-[#1a4a37] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <ArrowRightLeft size={14} />
                <span>تحويل بين المخازن</span>
              </button>
            </div>

            {/* The 4 Warehouses Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {warehouses.map((wh) => {
                const getWhBadge = (type: WarehouseType["warehouse_type"]) => {
                  switch (type) {
                    case "raw_material":
                      return { label: "1. مخزن المواد الخام", bg: "bg-[#eaf4ee] text-[#256149]" };
                    case "packaging":
                      return { label: "2. مخزن مواد التغليف", bg: "bg-[#faeee6] text-[#c75e3a]" };
                    case "distribution":
                      return { label: "3. مخزن التوزيع التام", bg: "bg-[#e8f1ff] text-[#1f66be]" };
                    case "vehicle":
                      return { label: "4. سيارة مندوب توزيع", bg: "bg-[#fff6e6] text-[#b37012]" };
                  }
                };

                const badge = getWhBadge(wh.warehouse_type);

                // Count items in this warehouse
                const itemsCount = erpStore
                  .getStockBalances()
                  .filter((s) => s.warehouse_id === wh.id && s.quantity > 0).length;

                return (
                  <div
                    key={wh.id}
                    className="bg-white rounded-3xl border border-[#e2e8e2] p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="font-mono text-xs text-[#7d9389] font-bold">{wh.code}</span>
                      </div>
                      <h3 className="text-sm font-extrabold text-[#1c3e34] leading-snug">
                        {wh.name}
                      </h3>
                      <div className="text-[11px] text-[#6e857b] mt-1 flex items-center gap-1">
                        <MapPin size={12} className="text-[#a1b5ad]" />
                        <span>{wh.location}</span>
                      </div>

                      {wh.rep_name && (
                        <div className="mt-3 p-2 bg-[#f6f9f7] rounded-xl text-[11px] text-[#2d5244]">
                          <b>المندوب المسؤول:</b> {wh.rep_name} ({wh.rep_phone})
                        </div>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#f0f3f0] flex items-center justify-between text-xs">
                      <span className="text-[#758c82]">عدد الأصناف:</span>
                      <span className="font-black text-[#1c3e34]">{itemsCount} أصناف مخزنة</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Warehouse Stock Matrix / Balances Table */}
            <div className="bg-white rounded-3xl border border-[#e2e8e2] p-6 shadow-xs">
              <h3 className="text-sm font-black text-[#1c3e34] mb-4">
                جدول أرصدة المواد والمنتجات في كل المخازن:
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-[#e9efe9] text-[#71887e] bg-[#fbfcfb]">
                      <th className="p-3">كود الصنف</th>
                      <th className="p-3">اسم المنتج / الخامة</th>
                      <th className="p-3">نوع الصنف</th>
                      <th className="p-3">الوحدة</th>
                      <th className="p-3">مخزن المواد الخام</th>
                      <th className="p-3">مخزن التغليف</th>
                      <th className="p-3">مخزن التوزيع</th>
                      <th className="p-3">سيارة شرق القاهرة</th>
                      <th className="p-3">سيارة الجيزة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf1ed]">
                    {products.map((p) => {
                      const rawQty = erpStore.getStock(p.id, "wh-raw-01");
                      const pkgQty = erpStore.getStock(p.id, "wh-pkg-02");
                      const distQty = erpStore.getStock(p.id, "wh-dist-03");
                      const van1Qty = erpStore.getStock(p.id, "van-01");
                      const van2Qty = erpStore.getStock(p.id, "van-02");

                      return (
                        <tr key={p.id} className="hover:bg-[#fbfcfb]">
                          <td className="p-3 font-mono font-bold text-[#82998f]">{p.sku}</td>
                          <td className="p-3 font-extrabold text-[#1c3e34]">{p.name}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                p.product_type === "finished"
                                  ? "bg-[#eaf4ee] text-[#256149]"
                                  : p.product_type === "raw_material"
                                  ? "bg-[#faeee6] text-[#c75e3a]"
                                  : "bg-[#edf3ff] text-[#1c64b8]"
                              }`}
                            >
                              {p.product_type === "finished"
                                ? "منتج تام"
                                : p.product_type === "raw_material"
                                ? "مادة خام"
                                : "مادة تغليف"}
                            </span>
                          </td>
                          <td className="p-3 text-[#647c72]">{p.unit}</td>
                          <td className="p-3 font-bold text-[#1c3e34]">
                            {rawQty > 0 ? `${rawQty} ${p.unit}` : "—"}
                          </td>
                          <td className="p-3 font-bold text-[#1c3e34]">
                            {pkgQty > 0 ? `${pkgQty} ${p.unit}` : "—"}
                          </td>
                          <td className="p-3 font-bold text-[#256149]">
                            {distQty > 0 ? `${distQty} ${p.unit}` : "—"}
                          </td>
                          <td className="p-3 font-bold text-[#1f66be]">
                            {van1Qty > 0 ? `${van1Qty} ${p.unit}` : "—"}
                          </td>
                          <td className="p-3 font-bold text-[#1f66be]">
                            {van2Qty > 0 ? `${van2Qty} ${p.unit}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: ORDERS (طلبات التجار وإسناد الشحن) ===================== */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#1c3e34]">
                  إدارة طلبات التجار والمحلات التجارية
                </h2>
                <p className="text-xs text-[#6e857b]">
                  اعتماد الطلبات، التجهيز من مخزن التوزيع، وتحميل البضاعة لسيارات المناديب
                </p>
              </div>
              <div className="text-xs font-bold text-[#256149] bg-[#eef7f2] px-3 py-1.5 rounded-xl">
                إجمالي الطلبات: {orders.length}
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-3xl border border-[#e2e8e2] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-[#e9efe9] text-[#71887e] bg-[#fbfcfb]">
                      <th className="p-3.5">رقم الطلب</th>
                      <th className="p-3.5">اسم المتجر والمسؤول</th>
                      <th className="p-3.5">الهاتف والعنوان</th>
                      <th className="p-3.5">الأصناف</th>
                      <th className="p-3.5">الإجمالي</th>
                      <th className="p-3.5">المندوب والسيارة</th>
                      <th className="p-3.5">الحالة</th>
                      <th className="p-3.5">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf1ed]">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#fbfcfb]">
                        <td className="p-3.5 font-mono font-bold text-[#c75e3a]">
                          #{ord.order_number}
                        </td>
                        <td className="p-3.5">
                          <div className="font-extrabold text-[#1c3e34]">{ord.business_name}</div>
                          {ord.contact_name && (
                            <div className="text-[11px] text-[#788e84]">{ord.contact_name}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-[#1c3e34]">{ord.phone}</div>
                          <div className="text-[11px] text-[#788e84] max-w-xs truncate">
                            {ord.address}
                          </div>
                        </td>
                        <td className="p-3.5 text-[#5e746a]">
                          {ord.items.map((i) => `${i.product_name} (${i.quantity})`).join(", ")}
                        </td>
                        <td className="p-3.5 font-black text-[#1b4e3c]">
                          {ord.total.toFixed(2)} ج.م
                        </td>
                        <td className="p-3.5">
                          {ord.representative_name ? (
                            <div>
                              <div className="font-bold text-[#1c3e34]">
                                {ord.representative_name}
                              </div>
                              <div className="text-[10px] text-[#6e857b]">
                                {ord.vehicle_name || "سيارة التوزيع"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#a4b4ad] text-[11px]">لم يتم التعيين</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                              ord.status === "تم التسليم"
                                ? "bg-[#edf7ed] text-[#2b8a4f]"
                                : ord.status === "خرج للشحن"
                                ? "bg-[#e8f3ff] text-[#1c64b8]"
                                : ord.status === "قيد التجهيز"
                                ? "bg-[#fff7e6] text-[#b36b12]"
                                : "bg-[#f5f5f5] text-[#6d7572]"
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setOrderModal(ord);
                                setNewOrderStatus(ord.status);
                              }}
                              className="px-2.5 py-1.5 bg-[#edf4f0] hover:bg-[#256149] hover:text-white text-[#256149] font-bold rounded-lg transition-colors text-[11px] whitespace-nowrap cursor-pointer"
                            >
                              تحديث الحالة
                            </button>
                            <button
                              onClick={() => setOrderForPrint(ord)}
                              title="طباعة الفاتورة الضريبية"
                              className="p-1.5 bg-[#f5f8f5] hover:bg-[#e2ebe5] text-[#256149] border border-[#d6dfd9] rounded-lg transition-colors cursor-pointer"
                            >
                              <Printer size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: MOVEMENTS (سجل حركة المخزون الكلي) ===================== */}
        {activeTab === "movements" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#1c3e34]">
                  كشف وسجل حركات المخزون (Stock Audit Ledger)
                </h2>
                <p className="text-xs text-[#6e857b]">
                  توثيق فوري لكل حركة تصنيع، صرف خامات، بيع، أو تحويل لسيارات المناديب
                </p>
              </div>
              <span className="text-xs font-bold text-[#627d72]">
                {movements.length} حركات مسجلة
              </span>
            </div>

            <div className="bg-white rounded-3xl border border-[#e2e8e2] overflow-hidden shadow-xs">
              <div className="divide-y divide-[#edf1ed]">
                {movements.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#82998f]">
                    لم يتم تسجيل حركات مخزنية بعد. قم بتشغيل دورة تصنيع لتسجيل الحركات الأولى.
                  </div>
                ) : (
                  movements.map((mov) => {
                    const isIn = mov.movement_type === "production_in" || mov.movement_type === "opening";
                    return (
                      <div
                        key={mov.id}
                        className="p-4 flex items-center justify-between text-xs hover:bg-[#fbfcfb]"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                              isIn ? "bg-[#eaf4ee] text-[#256149]" : "bg-[#faeee6] text-[#c75e3a]"
                            }`}
                          >
                            {isIn ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          <div>
                            <div className="font-extrabold text-[#1c3e34]">
                              {mov.product_name}
                            </div>
                            <div className="text-[11px] text-[#71887e]">
                              {mov.reference} •{" "}
                              {mov.from_warehouse_name && `من: ${mov.from_warehouse_name} `}
                              {mov.to_warehouse_name && `إلى: ${mov.to_warehouse_name}`}
                            </div>
                          </div>
                        </div>

                        <div className="text-left">
                          <div
                            className={`font-black ${
                              isIn ? "text-[#256149]" : "text-[#c75e3a]"
                            }`}
                          >
                            {isIn ? "+" : "−"} {mov.quantity}
                          </div>
                          <div className="text-[10px] text-[#869990]">
                            {new Date(mov.created_at).toLocaleTimeString("ar-EG", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Transfer Stock between Warehouses (تحويل بضاعة لسيارات التوزيع) */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#dce3de] animate-in zoom-in-95">
            <div className="p-5 bg-linear-to-r from-[#1c3e34] to-[#256149] text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">تحويل بضاعة بين المخازن</h3>
                <p className="text-xs text-[#c6ded3] mt-0.5">شحن سيارات المناديب من مخزن التوزيع</p>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2d473e] mb-1">
                  اختر الصنف المراد نقله *
                </label>
                <select
                  value={transferProductId}
                  onChange={(e) => setTransferProductId(e.target.value)}
                  className="w-full p-2.5 text-xs bg-[#f6f9f7] border border-[#d6dfd9] rounded-xl font-bold"
                  required
                >
                  <option value="">-- اختر الصنف --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2d473e] mb-1">
                    من مخزن (المصدر) *
                  </label>
                  <select
                    value={transferFromWh}
                    onChange={(e) => setTransferFromWh(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#f6f9f7] border border-[#d6dfd9] rounded-xl"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2d473e] mb-1">
                    إلى مخزن (الوجهة) *
                  </label>
                  <select
                    value={transferToWh}
                    onChange={(e) => setTransferToWh(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#f6f9f7] border border-[#d6dfd9] rounded-xl"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2d473e] mb-1">
                  الكمية المراد تحويلها *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full p-2.5 text-xs bg-[#f6f9f7] border border-[#d6dfd9] rounded-xl font-bold"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#256149] hover:bg-[#1a4a37] text-white text-xs font-black rounded-xl shadow-md transition-colors"
                >
                  تأكيد النقل والتحويل
                </button>
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-3 bg-[#e8eee9] hover:bg-[#dbe4dd] text-[#344d44] text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Order Status & Assign Vehicle */}
      {orderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#dce3de] animate-in zoom-in-95">
            <div className="p-5 bg-linear-to-r from-[#1c3e34] to-[#256149] text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">تحديث حالة الطلب #{orderModal.order_number}</h3>
                <p className="text-xs text-[#c6ded3] mt-0.5">{orderModal.business_name}</p>
              </div>
              <button onClick={() => setOrderModal(null)} className="p-1 hover:bg-white/10 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2d473e] mb-1">
                  اختر الحالة الجديدة *
                </label>
                <select
                  value={newOrderStatus}
                  onChange={(e) => setNewOrderStatus(e.target.value as Order["status"])}
                  className="w-full p-2.5 text-xs bg-[#f6f9f7] border border-[#d6dfd9] rounded-xl font-bold"
                >
                  <option value="معلق">معلق</option>
                  <option value="قيد التجهيز">قيد التجهيز (صرف من مخزن التوزيع)</option>
                  <option value="خرج للشحن">خرج للشحن (مع سيارة المندوب)</option>
                  <option value="تم التسليم">تم التسليم بنجاح</option>
                  <option value="ملغي">ملغي</option>
                </select>
              </div>

              {newOrderStatus === "خرج للشحن" && (
                <div>
                  <label className="block text-xs font-bold text-[#2d473e] mb-1">
                    إسناد إلى سيارة ومندوب التوزيع:
                  </label>
                  <select
                    value={assignedVehicle}
                    onChange={(e) => setAssignedVehicle(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#f6f9f7] border border-[#d6dfd9] rounded-xl font-bold"
                  >
                    <option value="VAN-01">سيارة شرق القاهرة (VAN-01) — م. أحمد حسن (01012345678)</option>
                    <option value="VAN-02">سيارة الجيزة والهرم (VAN-02) — م. كريم محمود (01128893210)</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleUpdateOrderStatus}
                  className="flex-1 py-3 bg-[#256149] hover:bg-[#1a4a37] text-white text-xs font-black rounded-xl shadow-md transition-colors"
                >
                  حفظ وتحديث التتبع فوراً
                </button>
                <button
                  type="button"
                  onClick={() => setOrderModal(null)}
                  className="px-4 py-3 bg-[#e8eee9] hover:bg-[#dbe4dd] text-[#344d44] text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {orderForPrint && (
        <PrintableInvoiceModal
          order={orderForPrint}
          onClose={() => setOrderForPrint(null)}
        />
      )}
    </div>
  );
}
