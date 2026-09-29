import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  ShoppingBag,
  Search,
  User,
  Truck,
  CheckCircle2,
  X,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Package,
  PhoneCall,
  LayoutDashboard,
  Store as StoreIcon,
  ChevronDown,
  Sparkles,
  Layers,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { erpStore, Product, Trader, Order } from "@/lib/erpStore";

export default function StorePage() {
  const [, setLocation] = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [trader, setTrader] = useState<Trader | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Cart: Map of productId -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  // Account Form
  const [accountTab, setAccountTab] = useState<"login" | "signup">("login");
  const [accountPhone, setAccountPhone] = useState("");
  const [accountBusinessName, setAccountBusinessName] = useState("");
  const [accountContactName, setAccountContactName] = useState("");
  const [accountPassword, setAccountPassword] = useState("");

  // Checkout Form
  const [checkoutForm, setCheckoutForm] = useState({
    businessName: "",
    contactName: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);

  // Sync state with erpStore and handle pending reorder
  useEffect(() => {
    setProducts(erpStore.getFinishedProducts());
    setTrader(erpStore.getTrader());

    const pending = erpStore.getPendingReorder();
    if (pending && pending.length > 0) {
      const nextCart: Record<string, number> = {};
      pending.forEach((item) => {
        nextCart[item.productId] = item.quantity;
      });
      setCart(nextCart);
      setIsCartOpen(true);
      erpStore.clearPendingReorder();
      toast.success("تم تجهيز أصناف طلبيتك السابقة في السلة بنجاح!");
    }

    return erpStore.subscribe(() => {
      setProducts(erpStore.getFinishedProducts());
      setTrader(erpStore.getTrader());
    });
  }, []);

  // Sync trader info into checkout form
  useEffect(() => {
    if (trader) {
      setCheckoutForm((prev) => ({
        ...prev,
        businessName: trader.business_name || prev.businessName,
        contactName: trader.contact_name || prev.contactName,
        phone: trader.phone || prev.phone,
      }));
    }
  }, [trader]);

  // Categories
  const categories = ["الكل", "جيلي وسناكس", "كريم كراميل ومعلبات", "بهارات وخلطات", "بقوليات ومكسرات"];

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === "الكل" || p.category === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        p.name.includes(searchQuery.trim()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (productId: string) => {
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
    toast.success("تمت الإضافة إلى سلة الشراء");
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const cartItemsCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const cartDetails = useMemo(() => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return null;
        const price = product.sale_price * (1 - product.discount_percent / 100);
        return { product, quantity, price, lineTotal: price * quantity };
      })
      .filter(Boolean) as { product: Product; quantity: number; price: number; lineTotal: number }[];
  }, [cart, products]);

  const cartTotal = cartDetails.reduce((sum, item) => sum + item.lineTotal, 0);

  // Account actions
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountPhone.trim()) {
      toast.error("يرجى إدخال رقم الهاتف");
      return;
    }
    if (accountTab === "signup" && !accountBusinessName.trim()) {
      toast.error("يرجى إدخال اسم المحل أو المنشأة التجارية");
      return;
    }

    const t = erpStore.traderLogin(accountPhone, accountBusinessName || undefined);
    toast.success(accountTab === "signup" ? `مرحبًا بك تاجرنا العزيز في بيور!` : `تم تسجيل الدخول بنجاح`);
    setIsAccountOpen(false);
  };

  const handleLogout = () => {
    erpStore.traderLogout();
    toast.info("تم تسجيل الخروج");
  };

  // Order Placement
  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cartDetails.length) {
      toast.error("سلة التسوق فارغة");
      return;
    }
    if (!checkoutForm.businessName.trim() || !checkoutForm.phone.trim() || !checkoutForm.address.trim()) {
      toast.error("يرجى استكمال البيانات الإلزامية: اسم المتجر، الهاتف، والعنوان");
      return;
    }

    const res = erpStore.createOrder({
      businessName: checkoutForm.businessName.trim(),
      contactName: checkoutForm.contactName.trim() || undefined,
      phone: checkoutForm.phone.trim(),
      address: checkoutForm.address.trim(),
      notes: checkoutForm.notes.trim() || undefined,
      items: cartDetails.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    });

    if (res.success) {
      setPlacedOrderNumber(res.orderNumber);
      setCart({});
      setIsCheckoutOpen(false);
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf7] text-[#1b342e]" dir="rtl">
      {/* Top Notice Bar */}
      <div className="bg-[#1c3e35] text-[#d4e6df] py-1.5 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#39ba6d] animate-pulse" />
            <span>متجر مصنع بيور لتجارة الجملة — توريد مباشر من خطوط الإنتاج للمحلات والتجار</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/admin" className="text-[#f5c697] hover:underline flex items-center gap-1 font-bold">
              <LayoutDashboard size={13} />
              <span>لوحة الإدارة والتشغيل</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Store Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e6eae6] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/store" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#2f7a5b] to-[#1d523d] flex items-center justify-center text-white font-extrabold text-2xl shadow-sm">
              P
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-[#1c3d34] leading-tight">
                بيور <span className="text-[#c75e3a]">PURE</span>
              </div>
              <div className="text-[10px] font-bold text-[#628578] tracking-widest">
                FOOD SYSTEM • متجر الجملة
              </div>
            </div>
          </Link>

          {/* Quick Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="ابحث عن منتج، كرتونة، كود SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2 text-xs bg-[#f4f7f4] border border-[#d9e2db] rounded-full focus:outline-none focus:border-[#2f7a5b] focus:bg-white transition-colors"
              />
              <Search size={16} className="absolute right-3.5 top-2.5 text-[#7a8f87]" />
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Tracking Link */}
            <Link
              href="/tracking"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#2d5c4e] bg-[#edf4f0] hover:bg-[#dfeee5] rounded-xl transition-colors"
            >
              <Truck size={15} />
              <span>تتبع طلباتي</span>
            </Link>

            {/* Merchant Account Button */}
            <button
              onClick={() => setIsAccountOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#1c3e35] border border-[#d2ded6] hover:bg-[#f3f7f4] rounded-xl transition-colors"
            >
              <User size={15} className="text-[#c75e3a]" />
              <span className="hidden sm:inline">
                {trader ? trader.business_name : "حساب التاجر"}
              </span>
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-[#286b51] hover:bg-[#205741] rounded-xl shadow-xs transition-colors"
            >
              <ShoppingBag size={16} />
              <span className="hidden sm:inline">السلة</span>
              {cartItemsCount > 0 && (
                <span className="w-5 h-5 flex items-center justify-center bg-[#c75e3a] text-white text-[11px] font-extrabold rounded-full">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="ابحث عن منتج بالجملة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 text-xs bg-[#f4f7f4] border border-[#d9e2db] rounded-full focus:outline-none"
            />
            <Search size={16} className="absolute right-3.5 top-2.5 text-[#7a8f87]" />
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-[#173e33] via-[#215444] to-[#2c6e5a] text-white p-6 sm:p-10 shadow-lg">
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold text-[#fce0c5] mb-4">
              <Sparkles size={14} />
              <span>مباشرة من المصنع • بدون وسيط</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              أصناف غذائية متميزة <br />
              <span className="text-[#f5a774]">بأسعار الجملة المباشرة</span> لتجارتك
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-[#c8ded5] leading-relaxed">
              منتجات بيور الطبيعية: كريم كراميل، جيلي فواكه طبيعي، خلطات تتبيل الدجاج، وبسمتي هندي معتمد. جاهزة للشحن الفوري من مخزن التوزيع بسيارات المناديب.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#products"
                className="px-5 py-2.5 bg-[#d46d45] hover:bg-[#be5a33] text-white font-bold text-xs rounded-xl transition-transform hover:scale-105 shadow-md"
              >
                تصفح المنتجات الآن
              </a>
              <Link
                href="/tracking"
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl backdrop-blur-md transition-colors"
              >
                تتبع طلبيتك السابقة
              </Link>
            </div>
          </div>

          {/* Badges Floating on Banner */}
          <div className="hidden lg:flex absolute left-10 bottom-8 items-center gap-4 z-10">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-[#f7c28c]">100%</div>
              <div className="text-[10px] text-[#cfe3d9]">مكونات طبيعية</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-[#f7c28c]">24-48h</div>
              <div className="text-[10px] text-[#cfe3d9]">توصيل للمحلات</div>
            </div>
          </div>
        </div>
      </section>

      {/* Placed Order Success Notification */}
      {placedOrderNumber && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
          <div className="bg-[#e9f7ee] border-2 border-[#54ba7f] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={32} className="text-[#2b9657] shrink-0" />
              <div>
                <h4 className="text-sm font-extrabold text-[#174e2d]">
                  تم تأكيد طلبك بنجاح! رقم الطلب:{" "}
                  <span className="font-mono text-[#c75e3a] text-base">{placedOrderNumber}</span>
                </h4>
                <p className="text-xs text-[#416b50] mt-0.5">
                  تم خصم الكمية من مخزن التوزيع وجاري إرسالها لسيارة المندوب لتوصيلها إلى متجركم.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/tracking?order=${placedOrderNumber}`}
                className="px-4 py-2 bg-[#2b9657] text-white text-xs font-bold rounded-xl hover:bg-[#227e48]"
              >
                تتبع حالة الشحنة
              </Link>
              <button
                onClick={() => setPlacedOrderNumber(null)}
                className="p-2 text-[#4d705c] hover:bg-[#d8eedf] rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-[#1b3e34]">كتالوج المنتجات الجاهزة</h2>
            <p className="text-xs text-[#71887e]">أسعار الجملة للكرتونة والكميات التجارية المتاحة فوراً في مخزن التوزيع</p>
          </div>
          <div className="text-xs font-bold text-[#5c7a6f]">
            {filteredProducts.length} منتج متوفر
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-[#256149] text-white shadow-sm"
                  : "bg-white text-[#556e64] hover:bg-[#ecf2ed] border border-[#e1e7e2]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map((product) => {
            const inCartQty = cart[product.id] || 0;
            const finalPrice = product.sale_price * (1 - product.discount_percent / 100);
            const distStock = erpStore.getStock(product.id, "wh-dist-03");

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-[#e4eae4] overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Product Image */}
                  <div className="relative h-44 bg-[#f2f5f2] overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#235643] border border-[#d6dfd8]">
                      {product.unit}
                    </div>
                    {product.discount_percent > 0 && (
                      <div className="absolute top-2.5 left-2.5 bg-[#c75e3a] text-white px-2 py-0.5 rounded-lg text-[10px] font-black">
                        خصم {product.discount_percent}%
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="p-4">
                    <div className="text-[10px] font-mono text-[#82998f] mb-1">{product.sku}</div>
                    <h3 className="text-sm font-extrabold text-[#193a30] line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-[11px] text-[#6d8279] line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                </div>

                {/* Pricing & Add to Cart */}
                <div className="p-4 pt-0">
                  <div className="flex items-baseline justify-between py-2 border-t border-[#f0f3f0]">
                    <div>
                      <div className="text-base font-black text-[#1b4e3c]">
                        {finalPrice.toFixed(2)} <span className="text-xs font-normal">ج.م</span>
                      </div>
                      {product.discount_percent > 0 && (
                        <div className="text-[10px] text-[#99a6a1] line-through">
                          {product.sale_price.toFixed(2)} ج.م
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-[#3ea169] bg-[#eef7f2] px-2 py-1 rounded-md">
                      متاح: {distStock} {product.unit}
                    </div>
                  </div>

                  {/* Actions */}
                  {inCartQty === 0 ? (
                    <button
                      onClick={() => addToCart(product.id)}
                      className="w-full mt-2 py-2.5 bg-[#256149] hover:bg-[#1c4d3a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus size={15} />
                      <span>إضافة للطلب</span>
                    </button>
                  ) : (
                    <div className="w-full mt-2 flex items-center justify-between bg-[#f0f5f2] border border-[#d2ded6] rounded-xl p-1">
                      <button
                        onClick={() => updateQuantity(product.id, -1)}
                        className="w-8 h-8 flex items-center justify-center bg-white hover:bg-[#ffded8] text-[#c75e3a] rounded-lg transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <div className="text-xs font-black text-[#1c3e34]">
                        {inCartQty} <span className="text-[10px] font-normal text-[#597067]">{product.unit}</span>
                      </div>
                      <button
                        onClick={() => updateQuantity(product.id, 1)}
                        className="w-8 h-8 flex items-center justify-center bg-[#256149] hover:bg-[#1b4937] text-white rounded-lg transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Floating Bottom Cart Bar (if items in cart) */}
      {cartItemsCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:w-96 z-30">
          <div className="bg-[#1b3e34] text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-4 border border-[#3b6659]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#c75e3a] flex items-center justify-center font-black text-sm">
                {cartItemsCount}
              </div>
              <div>
                <div className="text-xs font-bold">سلة الشراء جاهزة</div>
                <div className="text-sm font-black text-[#f7c28c]">
                  {cartTotal.toFixed(2)} ج.م
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              className="px-4 py-2 bg-white text-[#1b3e34] hover:bg-[#ecf3ee] text-xs font-black rounded-xl transition-colors flex items-center gap-1.5"
            >
              <span>مراجعة الطلب</span>
              <ArrowLeft size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="p-4 border-b border-[#e6eae6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-[#256149]" />
                <h3 className="font-extrabold text-sm text-[#1b3e34]">سلة طلبات الجملة</h3>
                <span className="text-xs bg-[#eef5f1] text-[#256149] px-2 py-0.5 rounded-full font-bold">
                  {cartItemsCount} أصناف
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 hover:bg-[#f0f2f0] rounded-lg text-[#6d7c76]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartDetails.length === 0 ? (
                <div className="text-center py-12 text-[#85978f]">
                  <Package size={40} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">السلة فارغة حالياً</p>
                </div>
              ) : (
                cartDetails.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-3 p-3 bg-[#f9faf9] border border-[#e5ebe6] rounded-xl"
                  >
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-14 h-14 rounded-lg object-cover bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#1b3e34] truncate">
                        {item.product.name}
                      </div>
                      <div className="text-[11px] text-[#697f76]">
                        {item.price.toFixed(2)} ج.م / {item.product.unit}
                      </div>
                      <div className="text-xs font-black text-[#1b4e3c] mt-0.5">
                        الإجمالي: {item.lineTotal.toFixed(2)} ج.م
                      </div>
                    </div>
                    {/* Controls */}
                    <div className="flex items-center gap-1.5 bg-white border border-[#d6dfd9] rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-6 h-6 flex items-center justify-center text-[#c75e3a] hover:bg-[#ffeeea] rounded"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-[#1b3e34]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-6 h-6 flex items-center justify-center text-[#256149] hover:bg-[#eef5f1] rounded"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary & Checkout Button */}
            {cartDetails.length > 0 && (
              <div className="p-4 border-t border-[#e6eae6] bg-[#f8faf8]">
                <div className="flex items-center justify-between text-xs text-[#5e746b] mb-1">
                  <span>إجمالي المنتجات ({cartItemsCount}):</span>
                  <span>{cartTotal.toFixed(2)} ج.م</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#5e746b] mb-3">
                  <span>مصاريف الشحن والتوصيل بالسيارة:</span>
                  <span className="text-[#2b9657] font-bold">مجاني للطلبات التجارية</span>
                </div>
                <div className="flex items-center justify-between text-base font-black text-[#1b3e34] pt-2 border-t border-[#e2e7e3] mb-4">
                  <span>المبلغ الإجمالي:</span>
                  <span className="text-[#c75e3a]">{cartTotal.toFixed(2)} ج.م</span>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full py-3 bg-[#256149] hover:bg-[#1b4d3a] text-white text-xs font-black rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <span>متابعة إتمام الطلب</span>
                  <ArrowLeft size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal (بيانات التوصيل السهلة) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#dce3de] animate-in zoom-in-95">
            <div className="p-5 bg-linear-to-r from-[#1c3e34] to-[#2a614e] text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">إتمام طلب الجملة والتوصيل</h3>
                <p className="text-xs text-[#c4dbd2] mt-0.5">سيتم تجهيز البضاعة فوراً من مخزن التوزيع</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOrderSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2d473e] mb-1">
                  اسم المحل أو السوبر ماركت *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: سوبر ماركت الإيمان"
                  value={checkoutForm.businessName}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, businessName: e.target.value })}
                  className="w-full p-2.5 text-xs bg-[#f6f9f7] border border-[#d6dfd9] rounded-xl focus:outline-none focus:border-[#256149]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2d473e] mb-1">
                    اسم المسؤول / صاحب المحل
                  </label>
                  <input
                    type="text"
                    placeholder="الاسم بالكامل"
                    value={checkoutForm.contactName}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, contactName: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f6f9f7] border border-[#d6dfd9] rounded-xl focus:outline-none focus:border-[#256149]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2d473e] mb-1">
                    رقم الهاتف للتواصل *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="01xxxxxxxxx"
                    value={checkoutForm.phone}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f6f9f7] border border-[#d6dfd9] rounded-xl focus:outline-none focus:border-[#256149]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2d473e] mb-1">
                  عنوان المحل وتفاصيل التوصيل *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="المحافظة، المنطقة، اسم الشارع، علامة مميزة بجوار المحل"
                  value={checkoutForm.address}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                  className="w-full p-2.5 text-xs bg-[#f6f9f7] border border-[#d6dfd9] rounded-xl focus:outline-none focus:border-[#256149]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2d473e] mb-1">
                  ملاحظات إضافية للمندوب (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: يرجى التسليم قبل الساعة 4 عصراً"
                  value={checkoutForm.notes}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                  className="w-full p-2.5 text-xs bg-[#f6f9f7] border border-[#d6dfd9] rounded-xl focus:outline-none focus:border-[#256149]"
                />
              </div>

              <div className="bg-[#f0f6f2] p-3 rounded-xl border border-[#d8e5dd] flex items-center justify-between text-xs">
                <span className="font-bold text-[#244c3c]">إجمالي الفاتورة المطلوبة:</span>
                <span className="text-base font-black text-[#c75e3a]">{cartTotal.toFixed(2)} ج.م</span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#256149] hover:bg-[#1a4a37] text-white text-xs font-black rounded-xl shadow-md transition-colors"
                >
                  تأكيد وإرسال الطلب للمصنع
                </button>
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-4 py-3 bg-[#e8eee9] hover:bg-[#dbe4dd] text-[#344d44] text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merchant Account Modal (تسجيل دخول وإنشاء حساب للتاجر) */}
      {isAccountOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#dce3de] animate-in zoom-in-95">
            <div className="p-5 bg-linear-to-r from-[#1c3e34] to-[#255746] text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">بوابة حسابات التجار</h3>
                <p className="text-xs text-[#c6ded3] mt-0.5">سجل دخولك لحفظ بيانات محلك ومتابعة طلباتك</p>
              </div>
              <button
                onClick={() => setIsAccountOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {trader ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#eef7f2] text-[#256149] mx-auto flex items-center justify-center">
                  <StoreIcon size={32} />
                </div>
                <div>
                  <h4 className="text-base font-black text-[#1b3e34]">{trader.business_name}</h4>
                  <p className="text-xs text-[#6e857b] mt-1">الهاتف المسجل: {trader.phone}</p>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <Link
                    href="/tracking"
                    onClick={() => setIsAccountOpen(false)}
                    className="w-full py-2.5 bg-[#256149] text-white text-xs font-bold rounded-xl hover:bg-[#1a4a37] text-center"
                  >
                    عرض كل طلباتي السابقة
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full py-2.5 bg-[#ffeeea] text-[#c75e3a] text-xs font-bold rounded-xl hover:bg-[#fedbd3]"
                  >
                    تسجيل الخروج من الحساب
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                {/* Tabs */}
                <div className="flex border-b border-[#e4eae4] mb-4">
                  <button
                    onClick={() => setAccountTab("login")}
                    className={`flex-1 pb-2.5 text-xs font-bold border-b-2 transition-colors ${
                      accountTab === "login"
                        ? "border-[#256149] text-[#256149]"
                        : "border-transparent text-[#7e9188]"
                    }`}
                  >
                    تسجيل الدخول
                  </button>
                  <button
                    onClick={() => setAccountTab("signup")}
                    className={`flex-1 pb-2.5 text-xs font-bold border-b-2 transition-colors ${
                      accountTab === "signup"
                        ? "border-[#256149] text-[#256149]"
                        : "border-transparent text-[#7e9188]"
                    }`}
                  >
                    إنشاء حساب تاجر جديد
                  </button>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-3">
                  {accountTab === "signup" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-[#2d473e] mb-1">
                          اسم المحل أو السوبر ماركت *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: ماركت البركة"
                          value={accountBusinessName}
                          onChange={(e) => setAccountBusinessName(e.target.value)}
                          className="w-full p-2.5 text-xs bg-[#f6f9f7] border border-[#d6dfd9] rounded-xl focus:outline-none focus:border-[#256149]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#2d473e] mb-1">
                          اسم المسؤول
                        </label>
                        <input
                          type="text"
                          placeholder="الاسم"
                          value={accountContactName}
                          onChange={(e) => setAccountContactName(e.target.value)}
                          className="w-full p-2.5 text-xs bg-[#f6f9f7] border border-[#d6dfd9] rounded-xl focus:outline-none focus:border-[#256149]"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-[#2d473e] mb-1">
                      رقم الهاتف *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="01xxxxxxxxx"
                      value={accountPhone}
                      onChange={(e) => setAccountPhone(e.target.value)}
                      className="w-full p-2.5 text-xs bg-[#f6f9f7] border border-[#d6dfd9] rounded-xl focus:outline-none focus:border-[#256149]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2d473e] mb-1">
                      كلمة المرور *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      className="w-full p-2.5 text-xs bg-[#f6f9f7] border border-[#d6dfd9] rounded-xl focus:outline-none focus:border-[#256149]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-4 py-3 bg-[#256149] hover:bg-[#1a4a37] text-white text-xs font-black rounded-xl shadow-md transition-colors"
                  >
                    {accountTab === "login" ? "تسجيل الدخول" : "إنشاء الحساب وتفعيله"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Store Footer */}
      <footer className="mt-16 bg-white border-t border-[#e2e8e3] py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#6e857c]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#256149] text-white flex items-center justify-center font-black">
              P
            </div>
            <div>
              <div className="font-extrabold text-[#1c3e34]">مصنع بيور للمنتجات الغذائية — PURE Food System</div>
              <div>جميع الحقوق محفوظة © {new Date().getFullYear()}</div>
            </div>
          </div>
          <div className="flex items-center gap-6 font-bold">
            <Link href="/store" className="hover:text-[#256149]">المتجر</Link>
            <Link href="/tracking" className="hover:text-[#256149]">تتبع الطلبات</Link>
            <Link href="/admin" className="text-[#c75e3a] hover:underline">لوحة تحكم المصنع</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
