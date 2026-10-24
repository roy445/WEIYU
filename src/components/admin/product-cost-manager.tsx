"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/brand";
import type { MaterialOption } from "@/lib/product-costs";
import { useStore } from "@/components/store-provider";
import { PrintButton } from "@/components/print-button";
import { apiRequest } from "./dialog";

type ProductOption = { id: number; name: string; price: number; stock: number };
type RecipeItem = { materialId: number; amountMilli: number };
type CostData = {
  settings: {
    batchYield: number;
    laborCost: number;
    overheadCost: number;
    wasteBasisPoints: number;
    targetMarginBasisPoints: number;
  };
  recipe: RecipeItem[];
  breakdown: {
    materialsCost: number;
    wasteCost: number;
    laborCost: number;
    overheadCost: number;
    batchCost: number;
    unitCost: number;
    suggestedPrice: number;
    targetMarginBasisPoints: number;
  };
};
type ProductTrend = {
  id: number;
  name: string;
  price: number;
  stock: number;
  views: number;
  cartAdds: number;
  unitsSold: number;
  conversionPercent: number;
  suggestion: string;
};

function MaterialRow({ item, onRefresh }: { item: MaterialOption; onRefresh: () => void }) {
  const { toast } = useStore();
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit);
  const [quantity, setQuantity] = useState(String(item.packageQuantityMilli / 1000));
  const [cost, setCost] = useState(String(item.purchaseCost));
  const [pending, setPending] = useState(false);
  const unitCost = Number(quantity) > 0
    ? (Number(cost) / Number(quantity)).toLocaleString("zh-TW", { maximumFractionDigits: 4 })
    : "0";

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantityValue = Number(quantity);
    const costValue = Number(cost);
    if (!name.trim() || !Number.isFinite(quantityValue) || quantityValue <= 0 || !Number.isInteger(costValue) || costValue < 0) {
      toast("請確認材料名稱、包裝數量與購買價格。", "error");
      return;
    }
    setPending(true);
    const result = await apiRequest(`/api/admin/materials/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: name.trim(),
        unit,
        packageQuantityMilli: Math.round(quantityValue * 1000),
        purchaseCost: costValue,
      }),
    });
    setPending(false);
    if (!result.ok) {
      toast(result.data.error ?? "材料更新失敗。", "error");
      return;
    }
    toast("材料成本已更新。");
    onRefresh();
  };

  const remove = async () => {
    if (!window.confirm(`確定刪除「${item.name}」？已使用於配方的材料需先移除配方。`)) return;
    setPending(true);
    const result = await apiRequest(`/api/admin/materials/${item.id}`, { method: "DELETE" });
    setPending(false);
    if (!result.ok) {
      toast(result.data.error ?? "材料刪除失敗。", "error");
      return;
    }
    toast("材料已刪除。");
    onRefresh();
  };

  return (
    <form onSubmit={(event) => void save(event)} className="grid gap-2 rounded-lg border border-mist p-3 sm:grid-cols-[1.3fr_0.75fr_0.8fr_0.75fr_auto_auto] sm:items-end">
      <label><span className="field-label">材料</span><input className="field" value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label><span className="field-label">單位</span><select className="field" value={unit} onChange={(event) => setUnit(event.target.value)}><option value="g">公克</option><option value="ml">毫升</option><option value="piece">個／份</option></select></label>
      <label><span className="field-label">包裝數量</span><input className="field" type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /><span className="mt-1 block text-[0.65rem] text-cocoa-soft">約 NT${unitCost}／{unit === "g" ? "公克" : unit === "ml" ? "毫升" : "個"}</span></label>
      <label><span className="field-label">購買價（元）</span><input className="field" type="number" min="0" step="1" value={cost} onChange={(event) => setCost(event.target.value)} required /></label>
      <button className="btn btn-secondary btn-sm" type="submit" disabled={pending}>儲存</button>
      <button className="btn btn-sm text-[#8A4B3D]" type="button" onClick={() => void remove()} disabled={pending}>刪除</button>
    </form>
  );
}

export function ProductCostManager({
  products,
  materials,
  initialCost,
  trends,
}: {
  products: ProductOption[];
  materials: MaterialOption[];
  initialCost: CostData | null;
  trends: ProductTrend[];
}) {
  const router = useRouter();
  const { toast } = useStore();
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? 0);
  const [recipe, setRecipe] = useState<RecipeItem[]>(initialCost?.recipe ?? []);
  const [batchYield, setBatchYield] = useState(String(initialCost?.settings.batchYield ?? 1));
  const [laborCost, setLaborCost] = useState(String(initialCost?.settings.laborCost ?? 0));
  const [overheadCost, setOverheadCost] = useState(String(initialCost?.settings.overheadCost ?? 0));
  const [wastePercent, setWastePercent] = useState(String((initialCost?.settings.wasteBasisPoints ?? 0) / 100));
  const [targetMargin, setTargetMargin] = useState(String((initialCost?.settings.targetMarginBasisPoints ?? 5000) / 100));
  const [materialIdToAdd, setMaterialIdToAdd] = useState(materials[0]?.id ?? 0);
  const [pending, setPending] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ name: "", unit: "g", quantity: "", cost: "" });

  const loadCost = async (productId: number) => {
    setSelectedProductId(productId);
    setPending(true);
    const result = await apiRequest<CostData>(`/api/admin/products/${productId}/cost`, { method: "GET" });
    setPending(false);
    if (!result.ok) {
      toast(result.data.error ?? "無法讀取商品成本。", "error");
      return;
    }
    const data = result.data;
    setRecipe(data.recipe);
    setBatchYield(String(data.settings.batchYield));
    setLaborCost(String(data.settings.laborCost));
    setOverheadCost(String(data.settings.overheadCost));
    setWastePercent(String(data.settings.wasteBasisPoints / 100));
    setTargetMargin(String(data.settings.targetMarginBasisPoints / 100));
  };

  const saveCost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = [batchYield, laborCost, overheadCost, wastePercent, targetMargin].map(Number);
    if (values.some((value) => !Number.isFinite(value)) || !Number.isInteger(values[0]) || values[0] < 1 || values[1] < 0 || values[2] < 0 || values[3] < 0 || values[3] > 100 || values[4] < 0 || values[4] > 99) {
      toast("請確認批次產量、成本、耗損比例及毛利率。", "error");
      return;
    }
    setPending(true);
    const result = await apiRequest(`/api/admin/products/${selectedProductId}/cost`, {
      method: "PUT",
      body: JSON.stringify({
        batchYield: values[0],
        laborCost: values[1],
        overheadCost: values[2],
        wasteBasisPoints: Math.round(values[3] * 100),
        targetMarginBasisPoints: Math.round(values[4] * 100),
        recipe,
      }),
    });
    setPending(false);
    if (!result.ok) {
      toast(result.data.error ?? "成本設定儲存失敗。", "error");
      return;
    }
    toast("成本配方與定價設定已儲存。");
    await loadCost(selectedProductId);
  };

  const addMaterial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantityValue = Number(newMaterial.quantity);
    const costValue = Number(newMaterial.cost);
    if (!newMaterial.name.trim() || !Number.isFinite(quantityValue) || quantityValue <= 0 || !Number.isInteger(costValue) || costValue < 0) {
      toast("請填寫有效的材料名稱、包裝數量與價格。", "error");
      return;
    }
    const result = await apiRequest("/api/admin/materials", {
      method: "POST",
      body: JSON.stringify({
        name: newMaterial.name.trim(),
        unit: newMaterial.unit,
        packageQuantityMilli: Math.round(quantityValue * 1000),
        purchaseCost: costValue,
      }),
    });
    if (!result.ok) {
      toast(result.data.error ?? "材料新增失敗。", "error");
      return;
    }
    setNewMaterial({ name: "", unit: "g", quantity: "", cost: "" });
    toast("材料已新增。");
    router.refresh();
  };

  const addRecipeItem = () => {
    if (!materialIdToAdd || recipe.some((item) => item.materialId === materialIdToAdd)) return;
    setRecipe((current) => [...current, { materialId: materialIdToAdd, amountMilli: 1000 }]);
  };

  const deleteRecipeItem = (materialId: number) => setRecipe((current) => current.filter((item) => item.materialId !== materialId));
  const rawMaterialsCost = recipe.reduce((total, row) => {
    const material = materials.find((item) => item.id === row.materialId);
    if (!material || !Number.isFinite(row.amountMilli) || row.amountMilli <= 0) return total;
    return total + material.purchaseCost * row.amountMilli * 1000 / material.packageQuantityMilli;
  }, 0);
  const previewMaterialsCost = Math.ceil(rawMaterialsCost / 1000);
  const previewWasteCost = Math.ceil(rawMaterialsCost * Math.max(0, Number(wastePercent) || 0) * 100 / 10_000_000);
  const previewBatchCost = previewMaterialsCost + previewWasteCost + Math.max(0, Number(laborCost) || 0) + Math.max(0, Number(overheadCost) || 0);
  const previewUnitCost = Math.ceil(previewBatchCost / Math.max(1, Number(batchYield) || 1));
  const previewMarginBasisPoints = Math.min(9900, Math.max(0, Math.round((Number(targetMargin) || 0) * 100)));
  const previewSuggestedPrice = Math.ceil(previewUnitCost * 10_000 / (10_000 - previewMarginBasisPoints));
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const estimatedCurrentProfit = (selectedProduct?.price ?? 0) - previewUnitCost;
  const estimatedCurrentMargin = selectedProduct?.price ? Math.round(estimatedCurrentProfit / selectedProduct.price * 1000) / 10 : 0;

  return (
    <div className="space-y-8">
      <section className="surface space-y-4 rounded-xl p-5 sm:p-7">
        <h2 className="text-xl">材料成本資料</h2>
        <p className="text-sm text-cocoa-soft">採購包裝數量以公克、毫升或個／份輸入，可輸入小數至三位；成本計算會依配方用量換算。</p>
        <form onSubmit={(event) => void addMaterial(event)} className="grid gap-3 rounded-lg bg-oat-soft/60 p-4 sm:grid-cols-[1.3fr_0.7fr_0.8fr_0.8fr_auto] sm:items-end">
          <label><span className="field-label">新增材料名稱</span><input className="field" value={newMaterial.name} onChange={(event) => setNewMaterial({ ...newMaterial, name: event.target.value })} required /></label>
          <label><span className="field-label">單位</span><select className="field" value={newMaterial.unit} onChange={(event) => setNewMaterial({ ...newMaterial, unit: event.target.value })}><option value="g">公克</option><option value="ml">毫升</option><option value="piece">個／份</option></select></label>
          <label><span className="field-label">包裝數量</span><input className="field" type="number" min="0.001" step="0.001" value={newMaterial.quantity} onChange={(event) => setNewMaterial({ ...newMaterial, quantity: event.target.value })} required /></label>
          <label><span className="field-label">購買價（元）</span><input className="field" type="number" min="0" step="1" value={newMaterial.cost} onChange={(event) => setNewMaterial({ ...newMaterial, cost: event.target.value })} required /></label>
          <button className="btn btn-primary btn-sm" type="submit">新增材料</button>
        </form>
        {materials.length ? <div className="space-y-3">{materials.map((item) => <MaterialRow key={item.id} item={item} onRefresh={() => router.refresh()} />)}</div> : <p className="rounded-lg border border-dashed border-mist p-5 text-sm text-cocoa-soft">尚未建立材料。新增後即可加入商品配方。</p>}
      </section>

      <section className="surface space-y-5 rounded-xl p-5 sm:p-7">
        <div>
          <p className="eyebrow">Recipe and margin</p>
          <h2 className="mt-2 text-xl">商品配方與建議售價</h2>
        </div>
        {!products.length ? <p className="text-sm text-cocoa-soft">請先建立商品，才能設定成本配方。</p> : (
          <>
            <label className="block max-w-lg"><span className="field-label">選擇商品</span><select className="field" value={selectedProductId} onChange={(event) => void loadCost(Number(event.target.value))}><option value="" disabled>選擇商品</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · 目前售價 {formatPrice(product.price)}</option>)}</select></label>
            <form onSubmit={(event) => void saveCost(event)} className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <label><span className="field-label">每批成品數量</span><input className="field" type="number" min="1" step="1" value={batchYield} onChange={(event) => setBatchYield(event.target.value)} required /></label>
                <label><span className="field-label">每批工時成本（元）</span><input className="field" type="number" min="0" step="1" value={laborCost} onChange={(event) => setLaborCost(event.target.value)} required /></label>
                <label><span className="field-label">每批水電等成本（元）</span><input className="field" type="number" min="0" step="1" value={overheadCost} onChange={(event) => setOverheadCost(event.target.value)} required /></label>
                <label><span className="field-label">材料耗損比例（%）</span><input className="field" type="number" min="0" max="100" step="0.01" value={wastePercent} onChange={(event) => setWastePercent(event.target.value)} required /></label>
                <label><span className="field-label">目標毛利率（%）</span><input className="field" type="number" min="0" max="99" step="0.01" value={targetMargin} onChange={(event) => setTargetMargin(event.target.value)} required /></label>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="min-w-64 flex-1"><span className="field-label">加入配方材料</span><select className="field" value={materialIdToAdd} onChange={(event) => setMaterialIdToAdd(Number(event.target.value))}><option value={0}>選擇材料</option>{materials.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={addRecipeItem} disabled={!materials.length}>加入配方</button>
                </div>
                {recipe.map((item) => {
                  const material = materials.find((option) => option.id === item.materialId);
                  return (
                    <div key={item.materialId} className="grid gap-2 rounded-lg border border-mist p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <p className="text-sm font-medium">{material?.name ?? "材料已不存在"}</p>
                      <label><span className="field-label">每批用量（{material?.unit === "g" ? "公克" : material?.unit === "ml" ? "毫升" : "個／份"}）</span><input className="field" type="number" min="0.001" step="0.001" value={item.amountMilli / 1000} onChange={(event) => setRecipe((current) => current.map((row) => row.materialId === item.materialId ? { ...row, amountMilli: Math.round(Number(event.target.value) * 1000) } : row))} required /></label>
                      <button className="btn btn-sm text-[#8A4B3D]" type="button" onClick={() => deleteRecipeItem(item.materialId)}>移除</button>
                    </div>
                  );
                })}
              </div>
              <div className="grid gap-3 rounded-lg bg-oat-soft/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <p className="text-sm">材料成本／批：<strong>{formatPrice(previewMaterialsCost)}</strong></p>
                <p className="text-sm">耗損成本／批：<strong>{formatPrice(previewWasteCost)}</strong></p>
                <p className="text-sm">總成本／批：<strong>{formatPrice(previewBatchCost)}</strong></p>
                <p className="text-sm">每份成本（無條件進位）：<strong>{formatPrice(previewUnitCost)}</strong></p>
                <p className="text-sm sm:col-span-2">毛利率定價參考：<strong className="text-caramel-deep">{formatPrice(previewSuggestedPrice)}</strong></p>
                <p className="text-sm">目前售價估算毛利：<strong>{formatPrice(estimatedCurrentProfit)}／份</strong>（毛利率 {estimatedCurrentMargin}%）</p>
                <p className="text-sm">建議售價估算毛利：<strong>{formatPrice(previewSuggestedPrice - previewUnitCost)}／份</strong></p>
                <p className="text-xs leading-relaxed text-cocoa-soft sm:col-span-2">估算公式：每份成本 ÷（1－目標毛利率）。成本金額以新台幣整數元保守進位，未計平台抽成、稅費或其他未輸入項目；目前售價毛利若為負數，代表售價低於估算成本。</p>
              </div>
              <button className="btn btn-primary" type="submit" disabled={pending}>儲存成本與定價設定</button>
            </form>
          </>
        )}
      </section>

      <section className="surface printable-report space-y-4 rounded-xl p-5 sm:p-7">
        <div>
          <p className="eyebrow">30-day demand signals</p>
          <h2 className="mt-2 text-xl">供需趨勢建議</h2>
          <p className="mt-2 text-sm text-cocoa-soft">依最近 30 天商品頁瀏覽、加購次數、完成訂單與現有庫存提供參考；最少 20 次瀏覽才作需求判斷。功能上線後才開始累積按日統計，加購／瀏覽比是事件次數比例而非不重複會員轉換率。</p>
          <div className="print-hidden mt-3 flex gap-2">
            <PrintButton label="列印趨勢／另存 PDF" />
            <a className="btn btn-secondary btn-sm" href="/api/admin/reports/trends?format=csv">匯出趨勢 CSV</a>
          </div>
        </div>
        <div className="space-y-3">
          {trends.map((trend) => (
            <article key={trend.id} className="rounded-lg border border-mist p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium">{trend.name}</h3>
                <p className="text-xs text-cocoa-soft">瀏覽 {trend.views} · 加購 {trend.cartAdds} · 完成售出 {trend.unitsSold} · 庫存 {trend.stock} · 加購／瀏覽比 {trend.conversionPercent}%</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">{trend.suggestion}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
