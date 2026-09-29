import { describe, expect, it, beforeEach } from "vitest";
import { erpStore } from "../client/src/lib/erpStore";

describe("E2E Purchasing Flow & Trader Account Verification", () => {
  beforeEach(() => {
    erpStore.traderLogout();
  });

  it("completes merchant sign-up and login flow", () => {
    const testPhone = "01055566677";
    const testBusiness = "سوبر ماركت النور والهدى";

    // 1. Trader Login/Signup
    const trader = erpStore.traderLogin(testPhone, testBusiness);
    expect(trader.phone).toBe("01055566677");
    expect(trader.business_name).toBe(testBusiness);
    expect(erpStore.getTrader()).toEqual(trader);

    // 2. Trader Logout
    erpStore.traderLogout();
    expect(erpStore.getTrader()).toBeNull();
  });

  it("executes the full purchasing flow, calculates totals, deducts stock, and creates order tracking", () => {
    const products = erpStore.getFinishedProducts();
    expect(products.length).toBeGreaterThanOrEqual(3);

    const productA = products[0]; // e.g. Creme Caramel
    const productB = products[1]; // e.g. Strawberry Jelly

    const distWhId = "wh-dist-03";
    const initialStockA = erpStore.getStock(productA.id, distWhId);
    const initialStockB = erpStore.getStock(productB.id, distWhId);

    // 1. Add to Cart with quantities
    const qtyA = 5;
    const qtyB = 4;
    const expectedLineA = (productA.sale_price * (1 - productA.discount_percent / 100)) * qtyA;
    const expectedLineB = (productB.sale_price * (1 - productB.discount_percent / 100)) * qtyB;
    const expectedTotal = expectedLineA + expectedLineB;

    // 2. Place Order
    const orderResult = erpStore.createOrder({
      businessName: "ماركت التيسير للأغذية",
      contactName: "أحمد عبد الله",
      phone: "01144556677",
      address: "الجيزة - الهرم - شارع العريش",
      notes: "تسليم صباحي من 9 إلى 12",
      items: [
        { productId: productA.id, quantity: qtyA },
        { productId: productB.id, quantity: qtyB },
      ],
    });

    expect(orderResult.success).toBe(true);
    expect(orderResult.orderNumber).toMatch(/^ORD-\d{5}$/);

    // 3. Stock deduction verification
    const afterStockA = erpStore.getStock(productA.id, distWhId);
    const afterStockB = erpStore.getStock(productB.id, distWhId);
    expect(afterStockA).toBe(initialStockA - qtyA);
    expect(afterStockB).toBe(initialStockB - qtyB);

    // 4. Verify Order Record & Initial Tracking Status
    const order = erpStore.findOrder(orderResult.orderNumber);
    expect(order).toBeDefined();
    expect(order?.business_name).toBe("ماركت التيسير للأغذية");
    expect(order?.total).toBeCloseTo(expectedTotal, 2);
    expect(order?.status).toBe("معلق");
    expect(order?.events?.length).toBeGreaterThanOrEqual(1);

    // 5. Query order by Phone
    const phoneOrders = erpStore.getOrdersForPhone("01144556677");
    expect(phoneOrders.some((o) => o.order_number === orderResult.orderNumber)).toBe(true);

    // 6. Progress order through factory fulfillment (قيد التجهيز -> خرج للشحن -> تم التسليم)
    erpStore.updateOrderStatus(
      order!.id,
      "قيد التجهيز",
      "تم صرف البضاعة من مخزن التوزيع وجاري الفحص"
    );
    let updatedOrder = erpStore.findOrder(orderResult.orderNumber);
    expect(updatedOrder?.status).toBe("قيد التجهيز");

    // Assign van delivery
    erpStore.updateOrderStatus(
      order!.id,
      "خرج للشحن",
      "الشحنة مع مندوب سيارة توزيع شرق القاهرة",
      "أحمد حسن",
      "01012345678",
      "سيارة توزيع شرق القاهرة (VAN-01)"
    );
    updatedOrder = erpStore.findOrder(orderResult.orderNumber);
    expect(updatedOrder?.status).toBe("خرج للشحن");
    expect(updatedOrder?.representative_name).toBe("أحمد حسن");
    expect(updatedOrder?.representative_phone).toBe("01012345678");
    expect(updatedOrder?.vehicle_name).toBe("سيارة توزيع شرق القاهرة (VAN-01)");

    // Complete delivery
    erpStore.updateOrderStatus(order!.id, "تم التسليم", "تم التسليم بنجاح للتاجر");
    updatedOrder = erpStore.findOrder(orderResult.orderNumber);
    expect(updatedOrder?.status).toBe("تم التسليم");
  });

  it("handles transfer from distribution warehouse to delivery vans", () => {
    const products = erpStore.getFinishedProducts();
    const product = products[0];

    const distWhId = "wh-dist-03";
    const vanWhId = "van-01";

    const initialDist = erpStore.getStock(product.id, distWhId);
    const initialVan = erpStore.getStock(product.id, vanWhId);
    const transferQty = 8;

    const res = erpStore.transferStock({
      productId: product.id,
      fromWarehouseId: distWhId,
      toWarehouseId: vanWhId,
      quantity: transferQty,
      reference: "تحميل بضاعة لسيارة فان 01",
    });

    expect(res.success).toBe(true);
    expect(erpStore.getStock(product.id, distWhId)).toBe(initialDist - transferQty);
    expect(erpStore.getStock(product.id, vanWhId)).toBe(initialVan + transferQty);
  });
});
