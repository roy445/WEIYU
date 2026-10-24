import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { materials, productCostSettings, productRecipeItems } from "@/db/schema";

export type MaterialOption = {
  id: number;
  name: string;
  unit: string;
  packageQuantityMilli: number;
  purchaseCost: number;
};

export type ProductCostInput = {
  batchYield: number;
  laborCost: number;
  overheadCost: number;
  wasteBasisPoints: number;
  targetMarginBasisPoints: number;
  recipe: { materialId: number; amountMilli: number }[];
};

export async function getMaterialOptions(): Promise<MaterialOption[]> {
  return db.select().from(materials).orderBy(asc(materials.name));
}

export async function getProductCost(productId: number) {
  const [settingsRows, recipeRows] = await Promise.all([
    db.select().from(productCostSettings).where(eq(productCostSettings.productId, productId)).limit(1),
    db.select({
      materialId: productRecipeItems.materialId,
      amountMilli: productRecipeItems.amountMilli,
      materialName: materials.name,
      unit: materials.unit,
      packageQuantityMilli: materials.packageQuantityMilli,
      purchaseCost: materials.purchaseCost,
    })
      .from(productRecipeItems)
      .innerJoin(materials, eq(productRecipeItems.materialId, materials.id))
      .where(eq(productRecipeItems.productId, productId)),
  ]);
  const settings = settingsRows[0] ?? {
    productId,
    batchYield: 1,
    laborCost: 0,
    overheadCost: 0,
    wasteBasisPoints: 0,
    targetMarginBasisPoints: 5000,
    updatedAt: new Date(0),
  };
  const rawMaterialsCost = recipeRows.reduce(
    (total, item) => total + item.purchaseCost * item.amountMilli * 1000 / item.packageQuantityMilli,
    0,
  );
  const materialsCost = Math.ceil(rawMaterialsCost / 1000);
  const wasteCost = Math.ceil(rawMaterialsCost * settings.wasteBasisPoints / 10_000_000);
  const batchCost = materialsCost + wasteCost + settings.laborCost + settings.overheadCost;
  const unitCost = Math.ceil(batchCost / settings.batchYield);
  const suggestedPrice = Math.ceil(unitCost * 10_000 / (10_000 - settings.targetMarginBasisPoints));

  return {
    settings,
    recipe: recipeRows.map(({ materialId, amountMilli }) => ({ materialId, amountMilli })),
    breakdown: {
      materialsCost,
      wasteCost,
      laborCost: settings.laborCost,
      overheadCost: settings.overheadCost,
      batchCost,
      unitCost,
      suggestedPrice,
      targetMarginBasisPoints: settings.targetMarginBasisPoints,
    },
  };
}
