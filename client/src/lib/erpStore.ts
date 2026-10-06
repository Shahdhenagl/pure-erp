import { supabase } from "./supabase";

export type WarehouseType = "raw_material" | "packaging" | "distribution" | "vehicle";

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  warehouse_type: WarehouseType;
  location: string;
  rep_name?: string;
  rep_phone?: string;
}

export type ProductType = "finished" | "raw_material" | "packaging";

export interface Product {
  id: string;
  sku: string;
  name: string;
  product_type: ProductType;
  unit: string;
  sale_price: number;
  discount_percent: number;
  image_url: string;
  category?: string;
  description?: string;
}

export interface StockBalance {
  product_id: string;
  warehouse_id: string;
  quantity: number;
}

export interface RecipeItem {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  required_quantity: number; // e.g. 0.1 kg (100g)
  unit: string; // كجم، جم، قطعة
  item_type: "raw_material" | "packaging";
}

export interface Recipe {
  id: string;
  product_id: string;
  product_name: string;
  name: string;
  output_quantity: number; // e.g. 1 (carton or unit)
  unit: string; // كرتونة
  description?: string;
  items: RecipeItem[];
}

export interface ProductionBatch {
  id: string;
  batch_number: string;
  recipe_id: string;
  recipe_name: string;
  product_id: string;
  product_name: string;
  quantity: number;
  raw_warehouse_id: string;
  packaging_warehouse_id: string;
  distribution_warehouse_id: string;
  status: "completed" | "in_progress" | "cancelled";
  notes?: string;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  from_warehouse_id?: string;
  from_warehouse_name?: string;
  to_warehouse_id?: string;
  to_warehouse_name?: string;
  quantity: number;
  movement_type: "opening" | "production_in" | "production_out" | "transfer" | "sale" | "adjustment";
  reference: string;
  created_at: string;
}

export interface WarehouseProfile {
  warehouse: Warehouse;
  total_items: number;
  total_quantity: number;
  movement_count: number;
  last_movement_at?: string;
  balances: { product: Product; quantity: number }[];
  recent_movements: StockMovement[];
}

export type OrderStatus = "معلق" | "قيد التجهيز" | "خرج للشحن" | "تم التسليم" | "ملغي";

export interface OrderItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
}

export interface Order {
  id: string;
  order_number: string;
  business_name: string;
  contact_name?: string;
  phone: string;
  address: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  total: number;
  status: OrderStatus;
  items: OrderItem[];
  representative_name?: string;
  representative_phone?: string;
  vehicle_name?: string;
  created_at: string;
  events?: { status: string; note: string; created_at: string }[];
}

export interface Trader {
  id: string;
  phone: string;
  business_name: string;
  contact_name?: string;
}

// Initial Standard Warehouses (4 official categories)
const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: "wh-raw-01",
    code: "WH-RAW",
    name: "مخزن المواد الخام الغذائية",
    warehouse_type: "raw_material",
    location: "عنبر أ - مجمع مصنع بيور",
  },
  {
    id: "wh-pkg-02",
    code: "WH-PKG",
    name: "مخزن مواد التعبئة والتغليف",
    warehouse_type: "packaging",
    location: "عنبر التعبئة والكرتون",
  },
  {
    id: "wh-dist-03",
    code: "WH-DIST",
    name: "مخزن التوزيع والمنتجات التامة",
    warehouse_type: "distribution",
    location: "مستودع الشحن الرئيسي",
  },
  {
    id: "van-01",
    code: "VAN-01",
    name: "سيارة توزيع شرق القاهرة",
    warehouse_type: "vehicle",
    location: "خط سير: مصر الجديدة - مدينة نصر",
    rep_name: "أحمد حسن",
    rep_phone: "01012345678",
  },
  {
    id: "van-02",
    code: "VAN-02",
    name: "سيارة توزيع الجيزة والهرم",
    warehouse_type: "vehicle",
    location: "خط سير: الدقي - الهرم - أكتوبر",
    rep_name: "كريم محمود",
    rep_phone: "01128893210",
  },
];

// Initial Products across the 3 categories
const INITIAL_PRODUCTS: Product[] = [
  // 1. Finished Products (في مخزن التوزيع وتظهر بالمتجر)
  {
    id: "prod-fin-01",
    sku: "PURE-CC-80",
    name: "كريم كراميل بيور 80 جم (كرتونة 24 عبوة)",
    product_type: "finished",
    unit: "كرتونة",
    sale_price: 312,
    discount_percent: 0,
    image_url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663954061026/wlEDRjhCdHZnSQSf.jpg",
    category: "كريم كراميل ومعلبات",
    description: "كريم كراميل ناعم وغني مصنوع من أجود المكونات الطبيعية ومناسب للحلويات المنزلية والمطاعم.",
  },
  {
    id: "prod-fin-02",
    sku: "PURE-JS-70",
    name: "جيلي فراولة بيور 70 جم (كرتونة 24 عبوة)",
    product_type: "finished",
    unit: "كرتونة",
    sale_price: 216,
    discount_percent: 5,
    image_url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663954061026/fTElKTnUYqOAcnwm.jpg",
    category: "جيلي وسناكس",
    description: "جيلي فراولة طبيعي بدون ألوان صناعية ضارة، نكهة منعشة قوية ومحبوبة للأطفال والكبار.",
  },
  {
    id: "prod-fin-03",
    sku: "PURE-JM-70",
    name: "جيلي مانجو بيور 70 جم (كرتونة 24 عبوة)",
    product_type: "finished",
    unit: "كرتونة",
    sale_price: 216,
    discount_percent: 0,
    image_url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663954061026/JswAJFsRXMahPIGp.jpg",
    category: "جيلي وسناكس",
    description: "جيلي مانجو بنكهة الفواكه الاستوائية الطبيعية، يذوب بسهولة وسريع التحضير.",
  },
  {
    id: "prod-fin-04",
    sku: "PURE-CR-250",
    name: "خلطة كريسبي حار بيور 250 جم (كرتونة 12 كيس)",
    product_type: "finished",
    unit: "كرتونة",
    sale_price: 156,
    discount_percent: 0,
    image_url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663954061026/sGorlmJyZAyNqfPb.jpg",
    category: "بهارات وخلطات",
    description: "خلطة تتبيل وقرمشة الدجاج الحارة بمزيج توابل شرقية سرية تعطي قرمشة ذهبية مثالية.",
  },
  {
    id: "prod-fin-05",
    sku: "PURE-RB-5",
    name: "أرز بسمتي هندي ممتاز 1121 (شيكارة 5 كجم)",
    product_type: "finished",
    unit: "شيكارة",
    sale_price: 425,
    discount_percent: 0,
    image_url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663954061026/vkChUIXzgYMlVSkp.jpg",
    category: "بقوليات ومكسرات",
    description: "أرز بسمتي هندي حبة طويلة أصلي معتق، خالي من الشوائب ورائحة عطرة فريدة.",
  },

  // 2. Raw Materials (في مخزن المواد الخام)
  {
    id: "raw-sugar",
    sku: "RAW-SUGAR",
    name: "سكر أبيض نقي مطحون",
    product_type: "raw_material",
    unit: "كجم",
    sale_price: 32,
    discount_percent: 0,
    image_url: "",
  },
  {
    id: "raw-straw",
    sku: "RAW-STRAWBERRY",
    name: "مركز نكهة فراولة طبيعية مركزة",
    product_type: "raw_material",
    unit: "كجم",
    sale_price: 180,
    discount_percent: 0,
    image_url: "",
  },
  {
    id: "raw-mango",
    sku: "RAW-MANGO",
    name: "مركز نكهة مانجو استوائية",
    product_type: "raw_material",
    unit: "كجم",
    sale_price: 195,
    discount_percent: 0,
    image_url: "",
  },
  {
    id: "raw-gelatin",
    sku: "RAW-GELATIN",
    name: "جيلاتين بقري حلال غذائي 240 بلوم",
    product_type: "raw_material",
    unit: "كجم",
    sale_price: 350,
    discount_percent: 0,
    image_url: "",
  },
  {
    id: "raw-caramel-flav",
    sku: "RAW-CARAMEL",
    name: "بودرة كراميل وحليب مجفف",
    product_type: "raw_material",
    unit: "كجم",
    sale_price: 240,
    discount_percent: 0,
    image_url: "",
  },
  {
    id: "raw-spices",
    sku: "RAW-SPICES",
    name: "مزيج بهارات كريسبي وتوابل حارة",
    product_type: "raw_material",
    unit: "كجم",
    sale_price: 120,
    discount_percent: 0,
    image_url: "",
  },

  // 3. Packaging Materials (في مخزن مواد التغليف)
  {
    id: "pkg-cc-box",
    sku: "PKG-CC-BOX",
    name: "عبوة داخلية كرتونية كريم كراميل 80 جم",
    product_type: "packaging",
    unit: "قطعة",
    sale_price: 1.5,
    discount_percent: 0,
    image_url: "",
  },
  {
    id: "pkg-jelly-pouch",
    sku: "PKG-JELLY-POUCH",
    name: "كيس ألومنيوم مبطن لجيلي الفواكه",
    product_type: "packaging",
    unit: "قطعة",
    sale_price: 0.8,
    discount_percent: 0,
    image_url: "",
  },
  {
    id: "pkg-outer-carton",
    sku: "PKG-OUTER-CARTON",
    name: "كرتونة شحن خارجية مقواة (سعة 24 عبوة)",
    product_type: "packaging",
    unit: "كرتونة",
    sale_price: 14,
    discount_percent: 0,
    image_url: "",
  },
  {
    id: "pkg-seal-tape",
    sku: "PKG-TAPE",
    name: "شريط لاصق لوجو بيور مختوم",
    product_type: "packaging",
    unit: "بكرة",
    sale_price: 25,
    discount_percent: 0,
    image_url: "",
  },
];

// Standard Recipes (الوصفات القياسية للبضاعة التامة)
const INITIAL_RECIPES: Recipe[] = [
  {
    id: "recipe-cc-80",
    product_id: "prod-fin-01",
    product_name: "كريم كراميل بيور 80 جم (كرتونة 24 عبوة)",
    name: "وصفة كرتونة كريم كراميل (24 عبوة × 80 جم)",
    output_quantity: 1, // 1 carton
    unit: "كرتونة",
    description: "لكل كرتونة كاملة (24 عبوة): 1.5 كجم سكر + 0.4 كجم بودرة كراميل + 24 عبوة داخلية + 1 كرتونة شحن",
    items: [
      {
        id: "item-1",
        ingredient_id: "raw-sugar",
        ingredient_name: "سكر أبيض نقي مطحون",
        required_quantity: 1.5, // 1.5 kg per carton
        unit: "كجم",
        item_type: "raw_material",
      },
      {
        id: "item-2",
        ingredient_id: "raw-caramel-flav",
        ingredient_name: "بودرة كراميل وحليب مجفف",
        required_quantity: 0.45, // 450g per carton
        unit: "كجم",
        item_type: "raw_material",
      },
      {
        id: "item-3",
        ingredient_id: "pkg-cc-box",
        ingredient_name: "عبوة داخلية كرتونية كريم كراميل 80 جم",
        required_quantity: 24, // 24 boxes
        unit: "قطعة",
        item_type: "packaging",
      },
      {
        id: "item-4",
        ingredient_id: "pkg-outer-carton",
        ingredient_name: "كرتونة شحن خارجية مقواة (سعة 24 عبوة)",
        required_quantity: 1, // 1 shipping box
        unit: "كرتونة",
        item_type: "packaging",
      },
    ],
  },
  {
    id: "recipe-jelly-straw",
    product_id: "prod-fin-02",
    product_name: "جيلي فراولة بيور 70 جم (كرتونة 24 عبوة)",
    name: "وصفة كرتونة جيلي فراولة (24 عبوة × 70 جم)",
    output_quantity: 1,
    unit: "كرتونة",
    description: "لكل كرتونة: 1.2 كجم سكر + 0.25 كجم مركز فراولة + 0.3 كجم جيلاتين + 24 كيس + 1 كرتونة شحن",
    items: [
      {
        id: "item-j1",
        ingredient_id: "raw-sugar",
        ingredient_name: "سكر أبيض نقي مطحون",
        required_quantity: 1.2,
        unit: "كجم",
        item_type: "raw_material",
      },
      {
        id: "item-j2",
        ingredient_id: "raw-straw",
        ingredient_name: "مركز نكهة فراولة طبيعية مركزة",
        required_quantity: 0.25,
        unit: "كجم",
        item_type: "raw_material",
      },
      {
        id: "item-j3",
        ingredient_id: "raw-gelatin",
        ingredient_name: "جيلاتين بقري حلال غذائي 240 بلوم",
        required_quantity: 0.3,
        unit: "كجم",
        item_type: "raw_material",
      },
      {
        id: "item-j4",
        ingredient_id: "pkg-jelly-pouch",
        ingredient_name: "كيس ألومنيوم مبطن لجيلي الفواكه",
        required_quantity: 24,
        unit: "قطعة",
        item_type: "packaging",
      },
      {
        id: "item-j5",
        ingredient_id: "pkg-outer-carton",
        ingredient_name: "كرتونة شحن خارجية مقواة (سعة 24 عبوة)",
        required_quantity: 1,
        unit: "كرتونة",
        item_type: "packaging",
      },
    ],
  },
  {
    id: "recipe-jelly-mango",
    product_id: "prod-fin-03",
    product_name: "جيلي مانجو بيور 70 جم (كرتونة 24 عبوة)",
    name: "وصفة كرتونة جيلي مانجو (24 عبوة × 70 جم)",
    output_quantity: 1,
    unit: "كرتونة",
    description: "لكل كرتونة: 1.2 كجم سكر + 0.25 كجم نكهة مانجو + 0.3 كجم جيلاتين + 24 كيس + 1 كرتونة",
    items: [
      {
        id: "item-m1",
        ingredient_id: "raw-sugar",
        ingredient_name: "سكر أبيض نقي مطحون",
        required_quantity: 1.2,
        unit: "كجم",
        item_type: "raw_material",
      },
      {
        id: "item-m2",
        ingredient_id: "raw-mango",
        ingredient_name: "مركز نكهة مانجو استوائية",
        required_quantity: 0.25,
        unit: "كجم",
        item_type: "raw_material",
      },
      {
        id: "item-m3",
        ingredient_id: "raw-gelatin",
        ingredient_name: "جيلاتين بقري حلال غذائي 240 بلوم",
        required_quantity: 0.3,
        unit: "كجم",
        item_type: "raw_material",
      },
      {
        id: "item-m4",
        ingredient_id: "pkg-jelly-pouch",
        ingredient_name: "كيس ألومنيوم مبطن لجيلي الفواكه",
        required_quantity: 24,
        unit: "قطعة",
        item_type: "packaging",
      },
      {
        id: "item-m5",
        ingredient_id: "pkg-outer-carton",
        ingredient_name: "كرتونة شحن خارجية مقواة (سعة 24 عبوة)",
        required_quantity: 1,
        unit: "كرتونة",
        item_type: "packaging",
      },
    ],
  },
];

// Initial Stock Balances
const INITIAL_STOCK: StockBalance[] = [
  // Raw materials in WH-RAW
  { product_id: "raw-sugar", warehouse_id: "wh-raw-01", quantity: 850 }, // 850 kg
  { product_id: "raw-straw", warehouse_id: "wh-raw-01", quantity: 120 }, // 120 kg
  { product_id: "raw-mango", warehouse_id: "wh-raw-01", quantity: 95 }, // 95 kg
  { product_id: "raw-gelatin", warehouse_id: "wh-raw-01", quantity: 180 }, // 180 kg
  { product_id: "raw-caramel-flav", warehouse_id: "wh-raw-01", quantity: 210 }, // 210 kg
  { product_id: "raw-spices", warehouse_id: "wh-raw-01", quantity: 160 }, // 160 kg

  // Packaging materials in WH-PKG
  { product_id: "pkg-cc-box", warehouse_id: "wh-pkg-02", quantity: 4800 }, // 4800 pcs
  { product_id: "pkg-jelly-pouch", warehouse_id: "wh-pkg-02", quantity: 7200 }, // 7200 pcs
  { product_id: "pkg-outer-carton", warehouse_id: "wh-pkg-02", quantity: 850 }, // 850 cartons
  { product_id: "pkg-seal-tape", warehouse_id: "wh-pkg-02", quantity: 120 }, // 120 rolls

  // Finished Goods in WH-DIST (Distribution Warehouse)
  { product_id: "prod-fin-01", warehouse_id: "wh-dist-03", quantity: 145 }, // 145 cartons
  { product_id: "prod-fin-02", warehouse_id: "wh-dist-03", quantity: 210 }, // 210 cartons
  { product_id: "prod-fin-03", warehouse_id: "wh-dist-03", quantity: 98 }, // 98 cartons
  { product_id: "prod-fin-04", warehouse_id: "wh-dist-03", quantity: 64 }, // 64 cartons
  { product_id: "prod-fin-05", warehouse_id: "wh-dist-03", quantity: 42 }, // 42 bags

  // Finished Goods in Vehicle Van 01 (East Cairo)
  { product_id: "prod-fin-01", warehouse_id: "van-01", quantity: 20 },
  { product_id: "prod-fin-02", warehouse_id: "van-01", quantity: 25 },

  // Finished Goods in Vehicle Van 02 (Giza)
  { product_id: "prod-fin-01", warehouse_id: "van-02", quantity: 15 },
  { product_id: "prod-fin-03", warehouse_id: "van-02", quantity: 18 },
];

const INITIAL_BATCHES: ProductionBatch[] = [
  {
    id: "batch-101",
    batch_number: "BATCH-260928-CC",
    recipe_id: "recipe-cc-80",
    recipe_name: "وصفة كرتونة كريم كراميل (24 عبوة × 80 جم)",
    product_id: "prod-fin-01",
    product_name: "كريم كراميل بيور 80 جم",
    quantity: 50,
    raw_warehouse_id: "wh-raw-01",
    packaging_warehouse_id: "wh-pkg-02",
    distribution_warehouse_id: "wh-dist-03",
    status: "completed",
    notes: "تشغيلة رقم 101 المعتمدة لطلبات التجار الأسبوعية",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: "batch-102",
    batch_number: "BATCH-260929-JS",
    recipe_id: "recipe-jelly-straw",
    recipe_name: "وصفة كرتونة جيلي فراولة (24 عبوة × 70 جم)",
    product_id: "prod-fin-02",
    product_name: "جيلي فراولة بيور 70 جم",
    quantity: 80,
    raw_warehouse_id: "wh-raw-01",
    packaging_warehouse_id: "wh-pkg-02",
    distribution_warehouse_id: "wh-dist-03",
    status: "completed",
    notes: "تشغيلة جيلي فراولة - فحص الجودة مطابق للمواصفات",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: "ord-1",
    order_number: "ORD-24091",
    business_name: "سوبر ماركت الإيمان",
    contact_name: "أ/ محمود عبد الفتاح",
    phone: "01012345678",
    address: "القاهرة - مدينة نصر - شارع عباس العقاد بجوار البنك الأهلي",
    total: 4820,
    status: "خرج للشحن",
    representative_name: "أحمد حسن",
    representative_phone: "01012345678",
    vehicle_name: "سيارة توزيع شرق القاهرة (VAN-01)",
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    notes: "برجاء التسليم قبل العصر مع فحص تواريخ الصلاحية",
    items: [
      { product_id: "prod-fin-01", product_name: "كريم كراميل بيور 80 جم", unit_price: 312, quantity: 10 },
      { product_id: "prod-fin-02", product_name: "جيلي فراولة بيور 70 جم", unit_price: 205.2, quantity: 8 },
    ],
    events: [
      { status: "تم الاستلام", note: "تم إنشاء الطلب بنجاح عبر المتجر الإلكتروني", created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString() },
      { status: "قيد التجهيز", note: "تمت مراجعة الطلب وصرف البضاعة من مخزن التوزيع", created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString() },
      { status: "خرج للشحن", note: "الشحنة مع المندوب أحمد حسن على سيارة VAN-01 وفي طريقها إليكم", created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    ],
  },
  {
    id: "ord-2",
    order_number: "ORD-24090",
    business_name: "ماركت أولاد رجب",
    contact_name: "كابتن تامر",
    phone: "01128893210",
    address: "الجيزة - الدقي - ميدان المساحة",
    total: 2340,
    status: "قيد التجهيز",
    representative_name: "كريم محمود",
    representative_phone: "01128893210",
    vehicle_name: "سيارة توزيع الجيزة (VAN-02)",
    created_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    notes: "فواتير ضريبية مطلوبة",
    items: [
      { product_id: "prod-fin-02", product_name: "جيلي فراولة بيور 70 جم", unit_price: 205.2, quantity: 6 },
      { product_id: "prod-fin-03", product_name: "جيلي مانجو بيور 70 جم", unit_price: 216, quantity: 5 },
    ],
    events: [
      { status: "تم الاستلام", note: "تم استلام الطلب", created_at: new Date(Date.now() - 1000 * 60 * 75).toISOString() },
      { status: "قيد التجهيز", note: "جاري تحميل الأصناف", created_at: new Date(Date.now() - 1000 * 60 * 40).toISOString() },
    ],
  },
  {
    id: "ord-3",
    order_number: "ORD-24089",
    business_name: "محمود عطية للتجارة",
    contact_name: "الحاج عطية",
    phone: "01274409182",
    address: "شبرا - شارع الترعة البولاقية",
    total: 3120,
    status: "تم التسليم",
    representative_name: "أحمد حسن",
    representative_phone: "01012345678",
    vehicle_name: "سيارة توزيع شرق القاهرة (VAN-01)",
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    items: [
      { product_id: "prod-fin-01", product_name: "كريم كراميل بيور 80 جم", unit_price: 312, quantity: 10 },
    ],
    events: [
      { status: "تم الاستلام", note: "تم استلام الطلب", created_at: new Date(Date.now() - 3600000 * 6).toISOString() },
      { status: "تم التسليم", note: "تم تسليم الطلب واستلام القيمة نقداً", created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
    ],
  },
];

// Helper for storage persistence
const STORAGE_PREFIX = "pure_erp_v2_";
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveToStorage<T>(key: string, data: T) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch {
    // Ignore storage quota
  }
}

function loadProductsWithCurrentImages(): Product[] {
  const stored = loadFromStorage<Product[]>("products", INITIAL_PRODUCTS);
  const currentImages = new Map(INITIAL_PRODUCTS.map((product) => [product.id, product.image_url]));
  return stored.map((product) => {
    const currentImage = currentImages.get(product.id);
    const isLegacyImage = !product.image_url || product.image_url.includes("images.unsplash.com") || product.image_url.includes("/manus-storage/");
    return currentImage && isLegacyImage ? { ...product, image_url: currentImage } : product;
  });
}

// Global in-memory state with persistence
let _warehouses: Warehouse[] = loadFromStorage("warehouses", INITIAL_WAREHOUSES);
let _products: Product[] = loadProductsWithCurrentImages();
let _stock: StockBalance[] = loadFromStorage("stock", INITIAL_STOCK);
let _recipes: Recipe[] = loadFromStorage("recipes", INITIAL_RECIPES);
let _batches: ProductionBatch[] = loadFromStorage("batches", INITIAL_BATCHES);
let _orders: Order[] = loadFromStorage("orders", INITIAL_ORDERS);
let _movements: StockMovement[] = loadFromStorage("movements", []);
let _trader: Trader | null = loadFromStorage("trader", null);
let _pendingReorder: { productId: string; quantity: number }[] | null = null;

const listeners = new Set<() => void>();
function notify() {
  saveToStorage("warehouses", _warehouses);
  saveToStorage("products", _products);
  saveToStorage("stock", _stock);
  saveToStorage("recipes", _recipes);
  saveToStorage("batches", _batches);
  saveToStorage("orders", _orders);
  saveToStorage("movements", _movements);
  saveToStorage("trader", _trader);
  listeners.forEach((fn) => fn());
}

export const erpStore = {
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  getWarehouses(): Warehouse[] {
    return _warehouses;
  },

  getProducts(): Product[] {
    return _products;
  },

  getFinishedProducts(): Product[] {
    return _products.filter((p) => p.product_type === "finished");
  },

  getRawMaterials(): Product[] {
    return _products.filter((p) => p.product_type === "raw_material");
  },

  getPackagingMaterials(): Product[] {
    return _products.filter((p) => p.product_type === "packaging");
  },

  getStockBalances(): StockBalance[] {
    return _stock;
  },

  getStock(productId: string, warehouseId: string): number {
    const match = _stock.find((s) => s.product_id === productId && s.warehouse_id === warehouseId);
    return match ? match.quantity : 0;
  },

  getRecipes(): Recipe[] {
    return _recipes;
  },

  getBatches(): ProductionBatch[] {
    return _batches;
  },

  getOrders(): Order[] {
    return _orders;
  },

  getMovements(): StockMovement[] {
    return _movements;
  },

  getWarehouseProfile(warehouseId: string): WarehouseProfile | null {
    const warehouse = _warehouses.find((item) => item.id === warehouseId);
    if (!warehouse) return null;
    const balances = _stock
      .filter((item) => item.warehouse_id === warehouseId && item.quantity !== 0)
      .map((item) => ({
        product: _products.find((product) => product.id === item.product_id),
        quantity: item.quantity,
      }))
      .filter((item): item is { product: Product; quantity: number } => Boolean(item.product));
    const recentMovements = _movements.filter(
      (movement) => movement.from_warehouse_id === warehouseId || movement.to_warehouse_id === warehouseId
    );
    return {
      warehouse,
      total_items: balances.length,
      total_quantity: balances.reduce((sum, item) => sum + item.quantity, 0),
      movement_count: recentMovements.length,
      last_movement_at: recentMovements[0]?.created_at,
      balances,
      recent_movements: recentMovements.slice(0, 20),
    };
  },

  adjustStock(params: {
    productId: string;
    warehouseId: string;
    countedQuantity: number;
    reason: string;
    reference?: string;
  }): { success: boolean; message: string; difference?: number } {
    if (params.countedQuantity < 0 || !Number.isFinite(params.countedQuantity)) {
      return { success: false, message: "كمية الجرد لا يمكن أن تكون سالبة" };
    }
    if (!params.reason.trim()) return { success: false, message: "اكتب سبب الجرد أو التسوية" };
    const warehouse = _warehouses.find((item) => item.id === params.warehouseId);
    const product = _products.find((item) => item.id === params.productId);
    if (!warehouse || !product) return { success: false, message: "المخزن أو الصنف غير موجود" };
    const currentQuantity = this.getStock(params.productId, params.warehouseId);
    const difference = Number((params.countedQuantity - currentQuantity).toFixed(4));
    if (difference === 0) {
      _movements.unshift({
        id: `mov-${Date.now()}-${Math.random()}`,
        product_id: product.id,
        product_name: product.name,
        to_warehouse_id: warehouse.id,
        to_warehouse_name: warehouse.name,
        quantity: 0,
        movement_type: "adjustment",
        reference: `${params.reference || "جرد مخزني"} — لا يوجد فرق — ${params.reason.trim()}`,
        created_at: new Date().toISOString(),
      });
      notify();
      return { success: true, message: "تم حفظ الجرد بدون فرق", difference: 0 };
    }
    const balanceIndex = _stock.findIndex((item) => item.product_id === product.id && item.warehouse_id === warehouse.id);
    if (balanceIndex >= 0) _stock[balanceIndex] = { ..._stock[balanceIndex], quantity: params.countedQuantity };
    else _stock.push({ product_id: product.id, warehouse_id: warehouse.id, quantity: params.countedQuantity });
    _movements.unshift({
      id: `mov-${Date.now()}-${Math.random()}`,
      product_id: product.id,
      product_name: product.name,
      ...(difference > 0
        ? { to_warehouse_id: warehouse.id, to_warehouse_name: warehouse.name }
        : { from_warehouse_id: warehouse.id, from_warehouse_name: warehouse.name }),
      quantity: Math.abs(difference),
      movement_type: "adjustment",
      reference: `${params.reference || "جرد مخزني"} — ${difference > 0 ? "زيادة" : "عجز"} — ${params.reason.trim()}`,
      created_at: new Date().toISOString(),
    });
    notify();
    return {
      success: true,
      message: `تم اعتماد الجرد وتسجيل ${difference > 0 ? "زيادة" : "عجز"} قدرها ${Math.abs(difference)} ${product.unit}`,
      difference,
    };
  },

  getTrader(): Trader | null {
    return _trader;
  },

  setTrader(trader: Trader | null) {
    _trader = trader;
    notify();
  },

  // 1. Production Execution (دورة التصنيع)
  // Deducts raw materials from raw warehouse
  // Deducts packaging from packaging warehouse
  // Adds finished product to distribution warehouse
  executeProduction(params: {
    recipeId: string;
    quantity: number;
    rawWarehouseId: string;
    packagingWarehouseId: string;
    distributionWarehouseId: string;
    notes?: string;
  }): { success: boolean; message: string; batchNumber?: string } {
    const recipe = _recipes.find((r) => r.id === params.recipeId);
    if (!recipe) return { success: false, message: "الوصفة غير موجودة" };
    if (params.quantity <= 0) return { success: false, message: "كمية التصنيع يجب أن تكون أكبر من الصفر" };

    const multiplier = params.quantity / (recipe.output_quantity || 1);

    // 1. Verify stock availability
    for (const item of recipe.items) {
      const required = item.required_quantity * multiplier;
      const targetWh = item.item_type === "packaging" ? params.packagingWarehouseId : params.rawWarehouseId;
      const available = this.getStock(item.ingredient_id, targetWh);
      if (available < required) {
        return {
          success: false,
          message: `عفوًا، رصيد ${item.ingredient_name} غير كافٍ. المطلوب: ${required} ${item.unit}، والمتاح: ${available} ${item.unit}`,
        };
      }
    }

    const batchNumber = `BATCH-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 2. Deduct materials
    for (const item of recipe.items) {
      const required = item.required_quantity * multiplier;
      const targetWh = item.item_type === "packaging" ? params.packagingWarehouseId : params.rawWarehouseId;
      const whName = _warehouses.find((w) => w.id === targetWh)?.name || "";

      // Deduct
      _stock = _stock.map((s) => {
        if (s.product_id === item.ingredient_id && s.warehouse_id === targetWh) {
          return { ...s, quantity: Math.max(0, s.quantity - required) };
        }
        return s;
      });

      // Record movement
      _movements.unshift({
        id: `mov-${Date.now()}-${Math.random()}`,
        product_id: item.ingredient_id,
        product_name: item.ingredient_name,
        from_warehouse_id: targetWh,
        from_warehouse_name: whName,
        quantity: required,
        movement_type: "production_out",
        reference: `صرف خامات تشغيلة #${batchNumber}`,
        created_at: new Date().toISOString(),
      });
    }

    // 3. Add finished product to distribution warehouse
    const distWh = _warehouses.find((w) => w.id === params.distributionWarehouseId);
    let foundDist = false;
    _stock = _stock.map((s) => {
      if (s.product_id === recipe.product_id && s.warehouse_id === params.distributionWarehouseId) {
        foundDist = true;
        return { ...s, quantity: s.quantity + params.quantity };
      }
      return s;
    });

    if (!foundDist) {
      _stock.push({
        product_id: recipe.product_id,
        warehouse_id: params.distributionWarehouseId,
        quantity: params.quantity,
      });
    }

    // Record movement for finished goods
    _movements.unshift({
      id: `mov-${Date.now()}-${Math.random()}`,
      product_id: recipe.product_id,
      product_name: recipe.product_name,
      to_warehouse_id: params.distributionWarehouseId,
      to_warehouse_name: distWh?.name || "مخزن التوزيع",
      quantity: params.quantity,
      movement_type: "production_in",
      reference: `إنتاج تشغيلة #${batchNumber}`,
      created_at: new Date().toISOString(),
    });

    // 4. Save Batch
    const newBatch: ProductionBatch = {
      id: `batch-${Date.now()}`,
      batch_number: batchNumber,
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      product_id: recipe.product_id,
      product_name: recipe.product_name,
      quantity: params.quantity,
      raw_warehouse_id: params.rawWarehouseId,
      packaging_warehouse_id: params.packagingWarehouseId,
      distribution_warehouse_id: params.distributionWarehouseId,
      status: "completed",
      notes: params.notes,
      created_at: new Date().toISOString(),
    };
    _batches.unshift(newBatch);

    notify();
    return {
      success: true,
      message: `تمت دورة الإنتاج بنجاح (${batchNumber}). تم خصم الخامات ومواد التغليف وإضافة ${params.quantity} ${recipe.unit} إلى ${distWh?.name || "مخزن التوزيع"}.`,
      batchNumber,
    };
  },

  // 2. Transfer between warehouses (e.g. from Distribution to Vehicle Van)
  transferStock(params: {
    productId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    quantity: number;
    reference?: string;
  }): { success: boolean; message: string } {
    if (params.fromWarehouseId === params.toWarehouseId) {
      return { success: false, message: "لا يمكن التحويل لنفس المخزن" };
    }
    const available = this.getStock(params.productId, params.fromWarehouseId);
    if (available < params.quantity) {
      return { success: false, message: `الرصيد في المخزن المصدر غير كافٍ. المتاح: ${available}` };
    }

    const prod = _products.find((p) => p.id === params.productId);
    const fromWh = _warehouses.find((w) => w.id === params.fromWarehouseId);
    const toWh = _warehouses.find((w) => w.id === params.toWarehouseId);

    // Deduct from source
    _stock = _stock.map((s) => {
      if (s.product_id === params.productId && s.warehouse_id === params.fromWarehouseId) {
        return { ...s, quantity: s.quantity - params.quantity };
      }
      return s;
    });

    // Add to destination
    let foundDest = false;
    _stock = _stock.map((s) => {
      if (s.product_id === params.productId && s.warehouse_id === params.toWarehouseId) {
        foundDest = true;
        return { ...s, quantity: s.quantity + params.quantity };
      }
      return s;
    });
    if (!foundDest) {
      _stock.push({
        product_id: params.productId,
        warehouse_id: params.toWarehouseId,
        quantity: params.quantity,
      });
    }

    _movements.unshift({
      id: `mov-${Date.now()}`,
      product_id: params.productId,
      product_name: prod?.name || "منتج",
      from_warehouse_id: params.fromWarehouseId,
      from_warehouse_name: fromWh?.name,
      to_warehouse_id: params.toWarehouseId,
      to_warehouse_name: toWh?.name,
      quantity: params.quantity,
      movement_type: "transfer",
      reference: params.reference || `تحويل من ${fromWh?.code} إلى ${toWh?.code}`,
      created_at: new Date().toISOString(),
    });

    notify();
    return { success: true, message: "تم تحويل البضاعة بنجاح" };
  },

  // 3. Create or Edit Recipe
  saveRecipe(recipe: Recipe) {
    const idx = _recipes.findIndex((r) => r.id === recipe.id);
    if (idx >= 0) {
      _recipes[idx] = recipe;
    } else {
      _recipes.push(recipe);
    }
    notify();
  },

  // 4. Submit Order from Storefront (فلو الشراء السهل)
  createOrder(params: {
    businessName: string;
    contactName?: string;
    phone: string;
    address: string;
    notes?: string;
    items: { productId: string; quantity: number }[];
  }): { success: boolean; orderNumber: string; message: string } {
    if (!params.items.length) {
      return { success: false, orderNumber: "", message: "السلة فارغة" };
    }

    const orderNumber = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const orderItems: OrderItem[] = [];
    let total = 0;

    // Default distribution warehouse
    const distWh = _warehouses.find((w) => w.warehouse_type === "distribution") || _warehouses[2];

    for (const item of params.items) {
      const prod = _products.find((p) => p.id === item.productId);
      if (!prod) continue;
      const unitPrice = prod.sale_price * (1 - prod.discount_percent / 100);
      const lineTotal = unitPrice * item.quantity;
      total += lineTotal;

      orderItems.push({
        product_id: prod.id,
        product_name: prod.name,
        unit_price: unitPrice,
        quantity: item.quantity,
      });

      // Deduct from distribution warehouse
      _stock = _stock.map((s) => {
        if (s.product_id === prod.id && s.warehouse_id === distWh.id) {
          return { ...s, quantity: Math.max(0, s.quantity - item.quantity) };
        }
        return s;
      });

      _movements.unshift({
        id: `mov-${Date.now()}-${Math.random()}`,
        product_id: prod.id,
        product_name: prod.name,
        from_warehouse_id: distWh.id,
        from_warehouse_name: distWh.name,
        quantity: item.quantity,
        movement_type: "sale",
        reference: `طلب متجر #${orderNumber} — ${params.businessName}`,
        created_at: new Date().toISOString(),
      });
    }

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      order_number: orderNumber,
      business_name: params.businessName,
      contact_name: params.contactName,
      phone: params.phone,
      address: params.address,
      notes: params.notes,
      total,
      status: "معلق",
      items: orderItems,
      created_at: new Date().toISOString(),
      events: [
        {
          status: "تم استلام الطلب",
          note: "تم استلام طلبكم في مصنع بيور وجاري مراجعته لاعتماده للتجهيز",
          created_at: new Date().toISOString(),
        },
      ],
    };

    _orders.unshift(newOrder);
    notify();

    return {
      success: true,
      orderNumber,
      message: `تم تأكيد طلبك بنجاح! رقم الطلب: ${orderNumber}`,
    };
  },

  // 5. Update Order Status & Assign Vehicle/Rep
  updateOrderStatus(orderId: string, status: OrderStatus, note?: string, repName?: string, repPhone?: string, vehicleName?: string) {
    _orders = _orders.map((order) => {
      if (order.id === orderId || order.order_number === orderId) {
        const events = order.events ? [...order.events] : [];
        events.push({
          status,
          note: note || `تغيرت حالة الطلب إلى: ${status}`,
          created_at: new Date().toISOString(),
        });
        return {
          ...order,
          status,
          representative_name: repName || order.representative_name,
          representative_phone: repPhone || order.representative_phone,
          vehicle_name: vehicleName || order.vehicle_name,
          events,
        };
      }
      return order;
    });
    notify();
  },

  // 6. Trader Auth helpers
  traderLogin(phone: string, businessName?: string): Trader {
    const cleanPhone = phone.trim().replace(/[^0-9+]/g, "");
    const trader: Trader = {
      id: `trader-${cleanPhone}`,
      phone: cleanPhone,
      business_name: businessName || "متجر الأمل",
      contact_name: "التاجر المعتمد",
    };
    this.setTrader(trader);
    return trader;
  },

  traderLogout() {
    this.setTrader(null);
  },

  // Get orders for a specific phone
  getOrdersForPhone(phone: string): Order[] {
    const cleanPhone = phone.trim().replace(/[^0-9+]/g, "");
    return _orders.filter((o) => o.phone.replace(/[^0-9+]/g, "") === cleanPhone);
  },

  // Find single order by number or phone
  findOrder(query: string): Order | undefined {
    const q = query.trim().toUpperCase();
    return _orders.find((o) => o.order_number.toUpperCase() === q || o.phone.includes(q));
  },

  // 7. Reorder pending storage
  setPendingReorder(items: { productId: string; quantity: number }[]) {
    _pendingReorder = items;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("pure_pending_reorder", JSON.stringify(items));
      }
    } catch {}
  },

  getPendingReorder(): { productId: string; quantity: number }[] | null {
    if (_pendingReorder) return _pendingReorder;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = localStorage.getItem("pure_pending_reorder");
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return null;
  },

  clearPendingReorder() {
    _pendingReorder = null;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem("pure_pending_reorder");
      }
    } catch {}
  },

  // 8. Smart Production Planner & Shortage Calculator
  calculateBOMRequirements(recipeId: string, quantity: number) {
    const recipe = _recipes.find((r) => r.id === recipeId);
    if (!recipe) return null;

    const multiplier = quantity / (recipe.output_quantity || 1);
    let hasShortage = false;

    const items = recipe.items.map((item) => {
      const targetWhId = item.item_type === "packaging" ? "wh-pkg-02" : "wh-raw-01";
      const available = this.getStock(item.ingredient_id, targetWhId);
      const required = item.required_quantity * multiplier;
      const shortage = Math.max(0, required - available);
      if (shortage > 0) hasShortage = true;

      return {
        ...item,
        required,
        available,
        shortage,
        isSufficient: shortage === 0,
      };
    });

    const finishedProduct = _products.find((p) => p.id === recipe.product_id);
    const unitPrice = finishedProduct ? finishedProduct.sale_price * (1 - finishedProduct.discount_percent / 100) : 0;
    const estimatedRevenue = unitPrice * quantity;

    return {
      recipe,
      quantity,
      finishedProduct,
      estimatedRevenue,
      hasShortage,
      items,
    };
  },

  // 9. Low Stock Warnings
  getLowStockAlerts() {
    const alerts: { product: Product; warehouse: Warehouse; quantity: number; threshold: number }[] = [];
    const rawWh = _warehouses.find((w) => w.id === "wh-raw-01");
    const pkgWh = _warehouses.find((w) => w.id === "wh-pkg-02");

    this.getRawMaterials().forEach((prod) => {
      const qty = this.getStock(prod.id, "wh-raw-01");
      const threshold = 100; // 100 kg threshold
      if (qty < threshold && rawWh) {
        alerts.push({ product: prod, warehouse: rawWh, quantity: qty, threshold });
      }
    });

    this.getPackagingMaterials().forEach((prod) => {
      const qty = this.getStock(prod.id, "wh-pkg-02");
      const threshold = 1000; // 1000 pcs threshold
      if (qty < threshold && pkgWh) {
        alerts.push({ product: prod, warehouse: pkgWh, quantity: qty, threshold });
      }
    });

    return alerts;
  },
};
