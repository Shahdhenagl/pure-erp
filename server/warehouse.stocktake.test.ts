import { describe, expect, it } from "vitest";
import { erpStore } from "../client/src/lib/erpStore";

describe("warehouse stocktake", () => {
  it("calculates a stock difference and records an adjustment movement", () => {
    const product = erpStore.getProducts().find((item) => item.product_type === "raw_material");
    expect(product).toBeTruthy();
    if (!product) return;
    const before = erpStore.getStock(product.id, "wh-raw-01");
    const result = erpStore.adjustStock({
      productId: product.id,
      warehouseId: "wh-raw-01",
      countedQuantity: before + 3,
      reason: "اختبار جرد الزيادة",
      reference: "اختبار مخزن المواد الخام",
    });
    expect(result.success).toBe(true);
    expect(result.difference).toBe(3);
    expect(erpStore.getStock(product.id, "wh-raw-01")).toBe(before + 3);
    expect(erpStore.getMovements()[0]?.movement_type).toBe("adjustment");
    expect(erpStore.getMovements()[0]?.reference).toContain("زيادة");
  });
});
