"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { formatPrice } from "@/lib/brand";
import { SafeImage } from "@/components/safe-image";
import { useStore } from "@/components/store-provider";
import { Dialog, Toggle, apiRequest } from "./dialog";

export type AdminProduct = {
  id: number;
  slug: string;
  name: string;
  categoryId: number | null;
  categoryName: string | null;
  summary: string;
  description: string;
  price: number;
  stock: number;
  isActive: boolean;
  imageUrl: string | null;
  ingredients: string | null;
  allergens: string | null;
  storageInfo: string | null;
  shelfLife: string | null;
  pickupNote: string | null;
  sortOrder: number;
  variants: { id: number; name: string; priceDelta: number; stock: number; isActive: boolean }[];
};

type CategoryOption = { id: number; name: string };
type VariantDraft = { name: string; priceDelta: string; stock: string; isActive: boolean };

type Draft = {
  name: string;
  slug: string;
  categoryId: string;
  summary: string;
  description: string;
  price: string;
  stock: string;
  isActive: boolean;
  imageUrl: string;
  ingredients: string;
  allergens: string;
  storageInfo: string;
  shelfLife: string;
  pickupNote: string;
  variants: VariantDraft[];
};

const emptyDraft: Draft = {
  name: "",
  slug: "",
  categoryId: "",
  summary: "",
  description: "",
  price: "",
  stock: "0",
  isActive: true,
  imageUrl: "",
  ingredients: "",
  allergens: "",
  storageInfo: "",
  shelfLife: "",
  pickupNote: "",
  variants: [],
};

function toDraft(product: AdminProduct): Draft {
  return {
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId ? String(product.categoryId) : "",
    summary: product.summary,
    description: product.description,
    price: String(product.price),
    stock: String(product.stock),
    isActive: product.isActive,
    imageUrl: product.imageUrl ?? "",
    ingredients: product.ingredients ?? "",
    allergens: product.allergens ?? "",
    storageInfo: product.storageInfo ?? "",
    shelfLife: product.shelfLife ?? "",
    pickupNote: product.pickupNote ?? "",
    variants: product.variants.map((variant) => ({
      name: variant.name,
      priceDelta: String(variant.priceDelta),
      stock: String(variant.stock),
      isActive: variant.isActive,
    })),
  };
}

export function ProductManager({ products, categories, initialFilter }: { products: AdminProduct[]; categories: CategoryOption[]; initialFilter?: string }) {
  const router = useRouter();
  const { toast } = useStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "out">(initialFilter === "out" ? "out" : "all");
  const [editing, setEditing] = useState<AdminProduct | null | "new">(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploadPending, setUploadPending] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminProduct | null>(null);

  const visible = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return products.filter((product) => {
      if (filter === "active" && !product.isActive) return false;
      if (filter === "inactive" && product.isActive) return false;
      if (filter === "out" && product.stock > 0) return false;
      if (!keyword) return true;
      return (
        product.name.toLowerCase().includes(keyword) ||
        product.slug.toLowerCase().includes(keyword) ||
        (product.categoryName ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [products, search, filter]);

  const openNew = () => {
    setDraft(emptyDraft);
    setError(null);
    setEditing("new");
  };

  const openEdit = (product: AdminProduct) => {
    setDraft(toDraft(product));
    setError(null);
    setEditing(product);
  };

  const close = () => {
    if (pending) return;
    setEditing(null);
  };

  const payload = () => ({
    name: draft.name,
    slug: draft.slug,
    categoryId: draft.categoryId ? Number(draft.categoryId) : null,
    summary: draft.summary,
    description: draft.description,
    price: Number(draft.price),
    stock: Number(draft.stock),
    isActive: draft.isActive,
    imageUrl: draft.imageUrl,
    ingredients: draft.ingredients,
    allergens: draft.allergens,
    storageInfo: draft.storageInfo,
    shelfLife: draft.shelfLife,
    pickupNote: draft.pickupNote,
    variants: draft.variants.map((variant) => ({
      name: variant.name,
      priceDelta: Number(variant.priceDelta || 0),
      stock: Number(variant.stock || 0),
      isActive: variant.isActive,
    })),
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (draft.name.trim().length < 2) return setError("請填寫商品名稱。");
    if (!Number.isFinite(Number(draft.price)) || Number(draft.price) < 0) return setError("請填寫有效價格。");
    if (!Number.isInteger(Number(draft.stock)) || Number(draft.stock) < 0) return setError("請填寫有效庫存。");
    setPending(true);
    const isNew = editing === "new";
    const result = await apiRequest(isNew ? "/api/admin/products" : `/api/admin/products/${(editing as AdminProduct).id}`, {
      method: isNew ? "POST" : "PATCH",
      body: JSON.stringify(payload()),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.data.error ?? "儲存失敗。");
      return;
    }
    toast(isNew ? "商品已新增。" : "商品已更新。");
    setEditing(null);
    router.refresh();
  };

  const quickPatch = async (product: AdminProduct, patch: Record<string, unknown>, successMessage: string) => {
    setBusyId(product.id);
    const result = await apiRequest(`/api/admin/products/${product.id}`, { method: "PATCH", body: JSON.stringify(patch) });
    setBusyId(null);
    if (!result.ok) {
      toast(result.data.error ?? "操作失敗。", "error");
      return;
    }
    toast(successMessage);
    router.refresh();
  };

  const remove = async (product: AdminProduct) => {
    setBusyId(product.id);
    const result = await apiRequest(`/api/admin/products/${product.id}`, { method: "DELETE" });
    setBusyId(null);
    setConfirmDelete(null);
    if (!result.ok) {
      toast(result.data.error ?? "刪除失敗。", "error");
      return;
    }
    toast(result.data.message ?? "已處理。", (result.data as { archived?: boolean }).archived ? "info" : "success");
    router.refresh();
  };

  const updateDraft = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const updateVariant = (index: number, patch: Partial<VariantDraft>) =>
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)),
    }));

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("圖片大小不可超過 5 MB。");
      return;
    }
    setError(null);
    setUploadPending(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/admin/uploads/products", { method: "POST", body: formData });
      const data = (await response.json()) as { ok?: boolean; error?: string; imageUrl?: string };
      if (!response.ok || !data.ok || !data.imageUrl) {
        setError(data.error ?? "圖片上傳失敗。");
        return;
      }
      updateDraft("imageUrl", data.imageUrl);
      toast("圖片已上傳。儲存商品後會套用。");
    } catch {
      setError("網路或伺服器發生問題，圖片上傳失敗。");
    } finally {
      setUploadPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜尋商品名稱、slug 或分類"
            className="field sm:max-w-xs"
            aria-label="搜尋商品"
          />
          <div className="flex gap-2 text-xs">
            {([
              ["all", "全部"],
              ["active", "上架中"],
              ["inactive", "已下架"],
              ["out", "缺貨"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`rounded-full border px-3 py-1.5 transition-colors ${filter === value ? "border-caramel bg-caramel text-cream" : "border-mist text-cocoa hover:border-caramel"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={openNew} className="btn btn-primary btn-sm">
          ＋ 新增商品
        </button>
      </div>

      <p className="text-xs text-cocoa-soft">共 {visible.length} 項</p>

      {visible.length === 0 ? (
        <p className="surface rounded-lg px-5 py-10 text-center text-sm text-cocoa-soft">沒有符合條件的商品。</p>
      ) : (
        <ul className="grid gap-3">
          {visible.map((product) => (
            <li key={product.id} className="surface flex flex-col gap-4 rounded-lg p-4 sm:flex-row sm:items-center">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-oat-soft">
                <SafeImage src={product.imageUrl} alt={`${product.name} 圖片`} sizes="80px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-cocoa">{product.name}</p>
                  <span className={`badge ${product.isActive ? "bg-[#E4EDE4] text-[#3F5B41]" : "bg-oat text-cocoa"}`}>{product.isActive ? "上架中" : "已下架"}</span>
                  {product.stock <= 0 ? <span className="badge bg-[#EFE4E1] text-[#8A4B3D]">缺貨</span> : null}
                </div>
                <p className="mt-1 text-xs text-cocoa-soft">
                  /{product.slug} · {product.categoryName ?? "未分類"} · {formatPrice(product.price)} · 庫存 {product.stock}
                  {product.variants.length > 0 ? ` · ${product.variants.length} 種規格` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[0.68rem] text-cocoa-soft">
                  {!product.ingredients ? <span className="rounded bg-oat-soft px-1.5 py-0.5">成分待補充</span> : null}
                  {!product.allergens ? <span className="rounded bg-oat-soft px-1.5 py-0.5">過敏原待補充</span> : null}
                  {!product.storageInfo ? <span className="rounded bg-oat-soft px-1.5 py-0.5">保存方式待補充</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <label className="flex items-center gap-2 text-xs text-cocoa-soft">
                  庫存
                  <input
                    type="number"
                    min={0}
                    defaultValue={product.stock}
                    key={`${product.id}-${product.stock}`}
                    className="field w-20 min-h-9 py-1 text-center"
                    aria-label={`${product.name} 庫存`}
                    onBlur={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isInteger(next) && next >= 0 && next !== product.stock) {
                        void quickPatch(product, { stock: next }, `「${product.name}」庫存已更新為 ${next}。`);
                      }
                    }}
                  />
                </label>
                <Toggle
                  checked={product.isActive}
                  disabled={busyId === product.id}
                  label={`${product.name} 上架狀態`}
                  onChange={(value) => quickPatch(product, { isActive: value }, value ? `「${product.name}」已上架。` : `「${product.name}」已下架。`)}
                />
                <button type="button" onClick={() => openEdit(product)} className="btn btn-secondary btn-sm">
                  編輯
                </button>
                <button type="button" onClick={() => setConfirmDelete(product)} className="btn btn-sm border-transparent text-[#8A4B3D] hover:bg-[#FBF1EE]">
                  刪除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} title={editing === "new" ? "新增商品" : "編輯商品"} onClose={close} wide>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="p-name">商品名稱</label>
              <input id="p-name" className="field" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} required />
            </div>
            <div>
              <label className="field-label" htmlFor="p-slug">網址代稱（slug，留空自動產生）</label>
              <input id="p-slug" className="field" value={draft.slug} onChange={(event) => updateDraft("slug", event.target.value)} placeholder="例如 canele" />
            </div>
            <div>
              <label className="field-label" htmlFor="p-category">分類</label>
              <select id="p-category" className="field" value={draft.categoryId} onChange={(event) => updateDraft("categoryId", event.target.value)}>
                <option value="">未分類</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="p-price">價格（NT$，整數）</label>
              <input id="p-price" type="number" min={0} step={1} className="field" value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} required />
            </div>
            <div>
              <label className="field-label" htmlFor="p-stock">庫存數量</label>
              <input id="p-stock" type="number" min={0} step={1} className="field" value={draft.stock} onChange={(event) => updateDraft("stock", event.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="p-image">商品圖片</label>
              <div className="flex gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <input id="p-image" className="field" value={draft.imageUrl} onChange={(event) => updateDraft("imageUrl", event.target.value)} placeholder="圖片網址（選填）" />
                  <label className="btn btn-secondary btn-sm w-fit cursor-pointer">
                    {uploadPending ? "上傳中…" : "從電腦選擇圖片"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={uploadPending || pending}
                      onChange={(event) => {
                        void uploadImage(event.target.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
                <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded bg-oat-soft">
                  <SafeImage src={draft.imageUrl || null} alt="圖片預覽" sizes="56px" className="object-cover" />
                </div>
              </div>
              <p className="mt-1 text-xs text-cocoa-soft">支援 JPG、PNG、WebP，單張最多 5 MB。上傳的圖片保存在網站主機的 public/images/products/；雲端無伺服器部署請改用持久化圖片儲存服務。</p>
            </div>
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="p-summary">簡短介紹（卡片顯示）</label>
              <input id="p-summary" className="field" maxLength={200} value={draft.summary} onChange={(event) => updateDraft("summary", event.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="p-desc">詳細介紹</label>
              <textarea id="p-desc" className="field min-h-28" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="p-ingredients">成分</label>
              <textarea id="p-ingredients" className="field min-h-20" value={draft.ingredients} onChange={(event) => updateDraft("ingredients", event.target.value)} placeholder="未填寫時前台顯示「待補充」" />
            </div>
            <div>
              <label className="field-label" htmlFor="p-allergens">過敏原</label>
              <textarea id="p-allergens" className="field min-h-20" value={draft.allergens} onChange={(event) => updateDraft("allergens", event.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="p-storage">保存方式</label>
              <input id="p-storage" className="field" value={draft.storageInfo} onChange={(event) => updateDraft("storageInfo", event.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="p-shelf">賞味期限</label>
              <input id="p-shelf" className="field" value={draft.shelfLife} onChange={(event) => updateDraft("shelfLife", event.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="p-pickup">取貨說明</label>
              <input id="p-pickup" className="field" value={draft.pickupNote} onChange={(event) => updateDraft("pickupNote", event.target.value)} />
            </div>
          </div>

          <fieldset className="rounded-lg border border-mist/70 p-4">
            <legend className="px-2 text-xs tracking-[0.18em] text-caramel-deep">商品規格（選填）</legend>
            <p className="text-xs text-cocoa-soft">例如「單顆」「六入盒」。規格差額可為負數；規格庫存與商品總庫存都會檢查。</p>
            <div className="mt-3 space-y-2">
              {draft.variants.map((variant, index) => (
                <div key={index} className="grid grid-cols-[1fr_5.5rem_5rem_auto_auto] items-center gap-2">
                  <input className="field min-h-9 py-1" placeholder="規格名稱" value={variant.name} onChange={(event) => updateVariant(index, { name: event.target.value })} aria-label={`規格 ${index + 1} 名稱`} />
                  <input className="field min-h-9 py-1" type="number" step={1} placeholder="差額" value={variant.priceDelta} onChange={(event) => updateVariant(index, { priceDelta: event.target.value })} aria-label={`規格 ${index + 1} 價格差額`} />
                  <input className="field min-h-9 py-1" type="number" min={0} step={1} placeholder="庫存" value={variant.stock} onChange={(event) => updateVariant(index, { stock: event.target.value })} aria-label={`規格 ${index + 1} 庫存`} />
                  <Toggle checked={variant.isActive} onChange={(value) => updateVariant(index, { isActive: value })} label={`規格 ${index + 1} 啟用`} />
                  <button type="button" onClick={() => updateDraft("variants", draft.variants.filter((_, i) => i !== index))} className="text-xs text-[#8A4B3D] hover:underline" aria-label={`移除規格 ${index + 1}`}>
                    移除
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => updateDraft("variants", [...draft.variants, { name: "", priceDelta: "0", stock: "0", isActive: true }])} className="btn btn-secondary btn-sm mt-3">
              ＋ 新增規格
            </button>
          </fieldset>

          <div className="flex items-center justify-between gap-3 border-t border-mist/70 pt-4">
            <label className="flex items-center gap-3 text-sm">
              <Toggle checked={draft.isActive} onChange={(value) => updateDraft("isActive", value)} label="上架" />
              {draft.isActive ? "上架販售" : "暫不上架"}
            </label>
            <div className="flex items-center gap-3">
              {error ? <p className="text-sm text-[#8A4B3D]">{error}</p> : null}
              <button type="button" onClick={close} className="btn btn-secondary btn-sm" disabled={pending}>取消</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending ? "儲存中…" : "儲存商品"}</button>
            </div>
          </div>
        </form>
      </Dialog>

      <Dialog open={confirmDelete !== null} title="刪除商品" onClose={() => setConfirmDelete(null)}>
        <p className="text-sm leading-relaxed text-cocoa">
          確定要刪除「{confirmDelete?.name}」嗎？若此商品已有訂單紀錄，系統會改為下架以保留歷史訂單。
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setConfirmDelete(null)} className="btn btn-secondary btn-sm">取消</button>
          <button type="button" onClick={() => confirmDelete && remove(confirmDelete)} className="btn btn-dark btn-sm" disabled={busyId !== null}>
            確定刪除
          </button>
        </div>
      </Dialog>
    </div>
  );
}
