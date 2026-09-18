import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, ImagePlus, PackagePlus, RefreshCw, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";

type Product = { id: string; sku: string; name: string; product_type: "finished" | "raw_material" | "packaging"; unit: string; sale_price: number; discount_percent: number; image_url: string | null; is_active: boolean };
type WarehouseRow = { id: string; code: string; name: string; warehouse_type: string };
type Balance = { product_id: string; warehouse_id: string; quantity: number; reserved_quantity: number };

const typeLabels: Record<Product["product_type"], string> = { finished: "منتج نهائي", raw_material: "مادة خام", packaging: "مادة تغليف" };
const readImage = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = reject; reader.readAsDataURL(file); });

export default function InventoryModule() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ sku: "", name: "", product_type: "finished" as Product["product_type"], unit: "قطعة", sale_price: "", discount_percent: "0", image: null as File | null });
  const [stockForm, setStockForm] = useState({ product_id: "", warehouse_id: "", quantity: "", movement_type: "opening" });
  const uploadImage = trpc.media.uploadStoreImage.useMutation();

  const load = async () => {
    const [{ data: ps, error: pe }, { data: ws, error: we }, { data: bs, error: be }] = await Promise.all([
      supabase.from("erp_products").select("id,sku,name,product_type,unit,sale_price,discount_percent,image_url,is_active").order("created_at", { ascending: false }),
      supabase.from("erp_warehouses").select("id,code,name,warehouse_type").order("name"),
      supabase.from("erp_stock_balances").select("product_id,warehouse_id,quantity,reserved_quantity"),
    ]);
    if (pe || we || be) return toast.error("تعذر تحميل بيانات المخازن — طبّق ملف migration أولاً");
    setProducts((ps || []) as Product[]); setWarehouses((ws || []) as WarehouseRow[]); setBalances((bs || []) as Balance[]);
    if (!selectedWarehouse && ws?.[0]) setSelectedWarehouse(ws[0].id);
  };
  useEffect(() => { void load(); }, []);

  const warehouseById = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w])), [warehouses]);
  const balanceFor = (productId: string, warehouseId: string) => balances.find((b) => b.product_id === productId && b.warehouse_id === warehouseId)?.quantity || 0;
  const createProduct = async () => {
    if (!form.sku.trim() || !form.name.trim()) return toast.error("أدخل كود المنتج واسمه");
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (form.image) { const dataBase64 = await readImage(form.image); const uploaded = await uploadImage.mutateAsync({ fileName: form.image.name, contentType: form.image.type as "image/png" | "image/jpeg" | "image/webp", dataBase64 }); image_url = uploaded.url; }
      const { error } = await supabase.from("erp_products").insert({ sku: form.sku.trim(), name: form.name.trim(), product_type: form.product_type, unit: form.unit, sale_price: Number(form.sale_price) || 0, discount_percent: Number(form.discount_percent) || 0, image_url });
      if (error) throw error;
      toast.success("تمت إضافة المنتج"); setForm({ sku: "", name: "", product_type: "finished", unit: "قطعة", sale_price: "", discount_percent: "0", image: null }); await load();
    } catch { toast.error("تعذر إضافة المنتج — تأكد من الصلاحيات والـ migration"); } finally { setBusy(false); }
  };
  const adjustStock = async () => {
    const quantity = Number(stockForm.quantity);
    if (!stockForm.product_id || !stockForm.warehouse_id || !quantity || quantity < 0) return toast.error("اختر المنتج والمخزن وأدخل كمية صحيحة");
    setBusy(true);
    const { error } = await supabase.rpc("erp_adjust_stock", { p_product_id: stockForm.product_id, p_warehouse_id: stockForm.warehouse_id, p_delta: quantity, p_movement_type: stockForm.movement_type, p_reference: "إضافة يدوية من لوحة الإدارة" });
    setBusy(false); if (error) return toast.error(error.message || "تعذر تحديث الرصيد");
    toast.success("تمت إضافة الكمية للمخزن"); setStockForm({ ...stockForm, quantity: "" }); await load();
  };
  const transfer = async (productId: string, fromId: string, toId: string, quantity: number): Promise<void> => {
    if (!fromId || !toId || fromId === toId || quantity <= 0) { toast.error("اختر مخزنين مختلفين وكمية صحيحة"); return; }
    if (balanceFor(productId, fromId) < quantity) { toast.error("الكمية المتاحة في المخزن المصدر غير كافية"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("erp_transfer_stock", { p_product_id: productId, p_from_warehouse_id: fromId, p_to_warehouse_id: toId, p_quantity: quantity, p_reference: "تحويل من لوحة الإدارة" });
    setBusy(false); if (error) { toast.error(error.message || "تعذر تنفيذ التحويل"); return; } toast.success("تم التحويل بين المخازن"); await load();
  };
  return <div className="page-stack">
    <div className="page-intro"><div><div className="eyebrow">الكتالوج والمخازن</div><h2>المنتجات والكميات</h2><p>أضف المنتج بصورته وسعره وخصمه، ثم وزّع الكميات بين الخام والباكدجنج والتوزيع والمتجر.</p></div><button className="secondary-button" onClick={() => void load()}><RefreshCw size={15} /> تحديث</button></div>
    <div className="settings-layout">
      <div className="panel"><div className="panel-header"><div><span className="panel-kicker">كتالوج المنتجات</span><h3>إضافة منتج جديد</h3></div><PackagePlus size={20} /></div><div className="form-grid-2"><input placeholder="كود SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /><input placeholder="اسم المنتج" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><select value={form.product_type} onChange={(e) => setForm({ ...form, product_type: e.target.value as Product["product_type"] })}><option value="finished">منتج نهائي للمتجر</option><option value="raw_material">مادة خام للمخزن الرئيسي</option><option value="packaging">مادة تعبئة وتغليف</option></select><input placeholder="وحدة القياس: كجم / قطعة" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /><input type="number" min="0" placeholder="سعر البيع" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} /><input type="number" min="0" max="100" placeholder="الخصم %" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} /></div><label className="upload-image-button mt-3"><ImagePlus size={15} /> {form.image ? form.image.name : "اختيار صورة المنتج"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })} /></label><button className="primary-button mt-3" disabled={busy} onClick={() => void createProduct()}>حفظ المنتج</button></div>
      <div className="panel"><div className="panel-header"><div><span className="panel-kicker">إضافة رصيد</span><h3>إضافة مواد للمخزن</h3></div><Warehouse size={20} /></div><div className="form-grid-2"><select value={stockForm.product_id} onChange={(e) => setStockForm({ ...stockForm, product_id: e.target.value })}><option value="">اختر المنتج أو الخام</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} — {typeLabels[p.product_type]}</option>)}</select><select value={stockForm.warehouse_id} onChange={(e) => setStockForm({ ...stockForm, warehouse_id: e.target.value })}><option value="">اختر المخزن</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select><input type="number" min="0" placeholder="الكمية" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} /><select value={stockForm.movement_type} onChange={(e) => setStockForm({ ...stockForm, movement_type: e.target.value })}><option value="opening">رصيد افتتاحي</option><option value="purchase">شراء</option><option value="return">مرتجع</option></select></div><button className="primary-button mt-3" disabled={busy} onClick={() => void adjustStock()}>إضافة للمخزن</button><p className="settings-help">كل إضافة تُسجّل في سجل حركة المخزون، ويمكن بعد ذلك تحويلها بين المخزن الرئيسي والباكدجنج والتوزيع والمتجر.</p></div>
    </div>
    <div className="panel"><div className="panel-header"><div><span className="panel-kicker">الأرصدة الحالية</span><h3>توزيع الكميات حسب المخزن</h3></div><select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)}>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div><div className="product-stock-grid">{products.map((p) => <div className="product-stock-card" key={p.id}>{p.image_url ? <img src={p.image_url} alt="" /> : <div className="product-stock-placeholder"><PackagePlus size={22} /></div>}<div className="min-w-0 flex-1"><b>{p.name}</b><span>{p.sku} • {typeLabels[p.product_type]}</span><strong>{balanceFor(p.id, selectedWarehouse)} {p.unit}</strong></div><StockTransfer product={p} warehouses={warehouses} currentWarehouse={selectedWarehouse} currentQty={balanceFor(p.id, selectedWarehouse)} onTransfer={transfer} /></div>)}</div></div>
  </div>;
}
function StockTransfer({ product, warehouses, currentWarehouse, currentQty, onTransfer }: { product: Product; warehouses: WarehouseRow[]; currentWarehouse: string; currentQty: number; onTransfer: (productId: string, fromId: string, toId: string, quantity: number) => Promise<void> }) {
  const [to, setTo] = useState(""); const [quantity, setQuantity] = useState("");
  return <div className="stock-transfer"><span>متاح: {currentQty}</span><select value={to} onChange={(e) => setTo(e.target.value)}><option value="">تحويل إلى...</option>{warehouses.filter((w) => w.id !== currentWarehouse).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select><button className="icon-button" title="تنفيذ التحويل" onClick={() => void onTransfer(product.id, currentWarehouse, to, Number(quantity))}><ArrowRightLeft size={14} /></button><input type="number" min="0" placeholder="كمية" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>;
}
