import { describe, expect, it } from "vitest";
import { erpStore } from "../client/src/lib/erpStore";

describe("PURE ERP Manufacturing Cycle & Warehouses", () => {
  it("has the 4 official operational warehouses", () => {
    const warehouses = erpStore.getWarehouses();
    const rawWh = warehouses.find((w) => w.warehouse_type === "raw_material");
    const pkgWh = warehouses.find((w) => w.warehouse_type === "packaging");
    const distWh = warehouses.find((w) => w.warehouse_type === "distribution");
    const vanWh = warehouses.find((w) => w.warehouse_type === "vehicle");

    expect(rawWh).toBeDefined();
    expect(pkgWh).toBeDefined();
    expect(distWh).toBeDefined();
    expect(vanWh).toBeDefined();
  });

  it("executes a production batch, deducting raw materials and packaging and adding finished goods to distribution", () => {
    const recipe = erpStore.getRecipes()[0]; // Caramel recipe
    expect(recipe).toBeDefined();

    const rawWhId = "wh-raw-01";
    const pkgWhId = "wh-pkg-02";
    const distWhId = "wh-dist-03";

    // Sugar initial stock
    const initialSugar = erpStore.getStock("raw-sugar", rawWhId);
    // Caramel box packaging initial stock
    const initialBoxes = erpStore.getStock("pkg-cc-box", pkgWhId);
    // Finished caramel in distribution
    const initialCaramel = erpStore.getStock(recipe.product_id, distWhId);

    const produceQty = 10; // 10 cartons
    const result = erpStore.executeProduction({
      recipeId: recipe.id,
      quantity: produceQty,
      rawWarehouseId: rawWhId,
      packagingWarehouseId: pkgWhId,
      distributionWarehouseId: distWhId,
      notes: "اختبار تشغيل آلي",
    });

    expect(result.success).toBe(true);

    // Verify deductions
    const afterSugar = erpStore.getStock("raw-sugar", rawWhId);
    const afterBoxes = erpStore.getStock("pkg-cc-box", pkgWhId);
    const afterCaramel = erpStore.getStock(recipe.product_id, distWhId);

    // Each carton takes 1.5kg sugar -> 10 cartons take 15kg
    expect(afterSugar).toBe(initialSugar - 15);
    // Each carton takes 24 boxes -> 10 cartons take 240 boxes
    expect(afterBoxes).toBe(initialBoxes - 240);
    // Finished goods increased by 10
    expect(afterCaramel).toBe(initialCaramel + 10);
  });

  it("calculates BOM requirements and accurately flags shortages for large target batches", () => {
    const recipe = erpStore.getRecipes()[0]; // Creme caramel
    expect(recipe).toBeDefined();

    // 1. Normal batch size without shortage
    const normalCalc = erpStore.calculateBOMRequirements(recipe.id, 5);
    expect(normalCalc).toBeDefined();
    expect(normalCalc?.quantity).toBe(5);
    expect(normalCalc?.estimatedRevenue).toBeGreaterThan(0);
    expect(normalCalc?.items.length).toBe(recipe.items.length);

    // 2. Extremely large batch size that definitely exceeds warehouse stock
    const largeCalc = erpStore.calculateBOMRequirements(recipe.id, 50000);
    expect(largeCalc).toBeDefined();
    expect(largeCalc?.hasShortage).toBe(true);

    // Check individual item shortages
    const sugarItem = largeCalc?.items.find((i) => i.ingredient_id === "raw-sugar");
    expect(sugarItem?.isSufficient).toBe(false);
    expect(sugarItem?.shortage).toBeGreaterThan(0);
  });

  it("detects low stock safety threshold alerts", () => {
    const alerts = erpStore.getLowStockAlerts();
    expect(Array.isArray(alerts)).toBe(true);
    // Each alert must have product, warehouse, quantity, and threshold
    alerts.forEach((alert) => {
      expect(alert.product).toBeDefined();
      expect(alert.warehouse).toBeDefined();
      expect(alert.quantity).toBeLessThan(alert.threshold);
    });
  });

  it("persists and clears 1-click reorder items in state", () => {
    const sampleItems = [
      { productId: "prod-fin-01", quantity: 3 },
      { productId: "prod-fin-02", quantity: 6 },
    ];

    erpStore.setPendingReorder(sampleItems);
    const retrieved = erpStore.getPendingReorder();
    expect(retrieved).toEqual(sampleItems);

    erpStore.clearPendingReorder();
    const cleared = erpStore.getPendingReorder();
    expect(cleared).toBeNull();
  });

  it("handles merchant order creation and deducts from distribution warehouse", () => {
    const distWhId = "wh-dist-03";
    const finishedProduct = erpStore.getFinishedProducts()[0];
    const initialDistStock = erpStore.getStock(finishedProduct.id, distWhId);

    const orderResult = erpStore.createOrder({
      businessName: "ماركت الزهراء",
      phone: "01099887766",
      address: "مدينة نصر - الحي السابع",
      items: [{ productId: finishedProduct.id, quantity: 2 }],
    });

    expect(orderResult.success).toBe(true);
    expect(orderResult.orderNumber).toMatch(/^ORD-/);

    const afterDistStock = erpStore.getStock(finishedProduct.id, distWhId);
    expect(afterDistStock).toBe(initialDistStock - 2);

    const createdOrder = erpStore.findOrder(orderResult.orderNumber);
    expect(createdOrder).toBeDefined();
    expect(createdOrder?.status).toBe("معلق");
  });
});
