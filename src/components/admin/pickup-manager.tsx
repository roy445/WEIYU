"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { formatDate } from "@/lib/brand";
import { useStore } from "@/components/store-provider";
import { Dialog, Toggle, apiRequest } from "./dialog";

export type LocationRow = { id: number; name: string; description: string | null; notes: string | null; isActive: boolean; sortOrder: number };
export type SlotRow = { id: number; locationId: number; pickupDate: string; startTime: string; endTime: string; capacity: number; isActive: boolean; used: number };

type Props = {
  locations: LocationRow[];
  slots: SlotRow[];
  acceptingOrders: boolean;
  today: string;
};

export function PickupManager({ locations, slots, acceptingOrders, today }: Props) {
  const router = useRouter();
  const { toast } = useStore();
  const [locationDialog, setLocationDialog] = useState<LocationRow | "new" | null>(null);
  const [locationDraft, setLocationDraft] = useState({ name: "", description: "", notes: "", isActive: true });
  const [slotDraft, setSlotDraft] = useState({ locationId: locations[0]?.id ? String(locations[0].id) : "", pickupDate: "", startTime: "14:00", endTime: "16:00", capacity: "3" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "location" | "slot"; id: number; label: string } | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [toggling, setToggling] = useState(false);

  const openLocation = (location: LocationRow | "new") => {
    setLocationDraft(location === "new" ? { name: "", description: "", notes: "", isActive: true } : { name: location.name, description: location.description ?? "", notes: location.notes ?? "", isActive: location.isActive });
    setError(null);
    setLocationDialog(location);
  };

  const saveLocation = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (locationDraft.name.trim().length < 2) return setError("請填寫地點名稱。");
    setPending(true);
    const isNew = locationDialog === "new";
    const result = await apiRequest("/api/admin/pickup", {
      method: isNew ? "POST" : "PATCH",
      body: JSON.stringify({ type: "location", ...(isNew ? {} : { id: (locationDialog as LocationRow).id }), ...locationDraft }),
    });
    setPending(false);
    if (!result.ok) return setError(result.data.error ?? "儲存失敗。");
    toast(isNew ? "面交地點已新增。" : "面交地點已更新。");
    setLocationDialog(null);
    router.refresh();
  };

  const addSlot = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!slotDraft.locationId) return setError("請先建立並選擇面交地點。");
    if (!slotDraft.pickupDate) return setError("請選擇日期。");
    setPending(true);
    const result = await apiRequest("/api/admin/pickup", {
      method: "POST",
      body: JSON.stringify({ type: "slot", locationId: Number(slotDraft.locationId), pickupDate: slotDraft.pickupDate, startTime: slotDraft.startTime, endTime: slotDraft.endTime, capacity: Number(slotDraft.capacity) }),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.data.error ?? "新增時段失敗。");
      toast(result.data.error ?? "新增時段失敗。", "error");
      return;
    }
    toast("面交時段已新增。");
    router.refresh();
  };

  const patch = async (type: "location" | "slot", id: number, body: Record<string, unknown>, message: string) => {
    setBusy(`${type}-${id}`);
    const result = await apiRequest("/api/admin/pickup", { method: "PATCH", body: JSON.stringify({ type, id, ...body }) });
    setBusy(null);
    if (!result.ok) return toast(result.data.error ?? "操作失敗。", "error");
    toast(message);
    router.refresh();
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(`${confirmDelete.type}-${confirmDelete.id}`);
    const result = await apiRequest("/api/admin/pickup", { method: "DELETE", body: JSON.stringify({ type: confirmDelete.type, id: confirmDelete.id }) });
    setBusy(null);
    setConfirmDelete(null);
    if (!result.ok) return toast(result.data.error ?? "刪除失敗。", "error");
    toast(result.data.message ?? "已刪除。", (result.data as { archived?: boolean }).archived ? "info" : "success");
    router.refresh();
  };

  const toggleAccepting = async (value: boolean) => {
    setToggling(true);
    const result = await apiRequest("/api/admin/settings/accepting", { method: "PATCH", body: JSON.stringify({ isAcceptingOrders: value }) });
    setToggling(false);
    if (!result.ok) return toast(result.data.error ?? "更新失敗。", "error");
    toast(value ? "已開放接單。" : "已暫停接受新訂單。", value ? "success" : "info");
    router.refresh();
  };

  const groupedSlots = useMemo(() => {
    const filtered = slots.filter((slot) => showPast || slot.pickupDate >= today);
    const map = new Map<string, SlotRow[]>();
    for (const slot of filtered) {
      if (!map.has(slot.pickupDate)) map.set(slot.pickupDate, []);
      map.get(slot.pickupDate)?.push(slot);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [slots, showPast, today]);

  const locationName = (id: number) => locations.find((location) => location.id === id)?.name ?? "（已刪除地點）";

  return (
    <div className="space-y-10">
      <section className="surface flex flex-col gap-4 rounded-lg p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl">接單狀態</h2>
          <p className="mt-1 text-sm text-cocoa-soft">暫停後，顧客仍可瀏覽與加入購物袋，但無法送出新訂單。</p>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <Toggle checked={acceptingOrders} disabled={toggling} onChange={toggleAccepting} label="開放接單" />
          {acceptingOrders ? "開放接單中" : "已暫停接單"}
        </label>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl">面交地點</h2>
            <p className="mt-1 text-sm text-cocoa-soft">請填寫實際可面交的地點與注意事項；停用的地點不會出現在結帳頁。</p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => openLocation("new")}>＋ 新增地點</button>
        </div>
        {locations.length === 0 ? (
          <p className="surface mt-4 rounded-lg px-5 py-8 text-center text-sm text-cocoa-soft">尚未設定任何面交地點。新增後才能建立時段。</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {locations.map((location) => (
              <li key={location.id} className="surface flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-cocoa">{location.name}</p>
                  {location.description ? <p className="text-sm text-cocoa-soft">{location.description}</p> : null}
                  {location.notes ? <p className="mt-1 text-xs text-cocoa-soft">注意事項：{location.notes}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-cocoa-soft">
                    <Toggle checked={location.isActive} disabled={busy === `location-${location.id}`} onChange={(value) => patch("location", location.id, { isActive: value }, value ? "地點已啟用。" : "地點已停用。")} label={`${location.name} 啟用`} />
                    {location.isActive ? "啟用" : "停用"}
                  </label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => openLocation(location)}>編輯</button>
                  <button type="button" className="btn btn-sm border-transparent text-[#8A4B3D] hover:bg-[#FBF1EE]" onClick={() => setConfirmDelete({ type: "location", id: location.id, label: location.name })}>刪除</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl">面交時段</h2>
        <p className="mt-1 text-sm text-cocoa-soft">每個時段可設定可預約組數；顧客只能從啟用且未過期、未額滿的時段中選擇。</p>

        <form onSubmit={addSlot} className="surface mt-4 grid gap-3 rounded-lg p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_0.6fr_auto]">
          <div>
            <label className="field-label" htmlFor="slot-location">地點</label>
            <select id="slot-location" className="field" value={slotDraft.locationId} onChange={(event) => setSlotDraft({ ...slotDraft, locationId: event.target.value })}>
              {locations.length === 0 ? <option value="">請先新增地點</option> : null}
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="slot-date">日期</label>
            <input id="slot-date" type="date" min={today} className="field" value={slotDraft.pickupDate} onChange={(event) => setSlotDraft({ ...slotDraft, pickupDate: event.target.value })} required />
          </div>
          <div>
            <label className="field-label" htmlFor="slot-start">開始</label>
            <input id="slot-start" type="time" className="field" value={slotDraft.startTime} onChange={(event) => setSlotDraft({ ...slotDraft, startTime: event.target.value })} required />
          </div>
          <div>
            <label className="field-label" htmlFor="slot-end">結束</label>
            <input id="slot-end" type="time" className="field" value={slotDraft.endTime} onChange={(event) => setSlotDraft({ ...slotDraft, endTime: event.target.value })} required />
          </div>
          <div>
            <label className="field-label" htmlFor="slot-capacity">組數</label>
            <input id="slot-capacity" type="number" min={1} max={99} className="field" value={slotDraft.capacity} onChange={(event) => setSlotDraft({ ...slotDraft, capacity: event.target.value })} required />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn btn-primary btn-sm w-full" disabled={pending || locations.length === 0}>{pending ? "新增中…" : "新增時段"}</button>
          </div>
          {error && locationDialog === null ? <p className="text-sm text-[#8A4B3D] sm:col-span-2 lg:col-span-6">{error}</p> : null}
        </form>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-cocoa-soft">共 {groupedSlots.reduce((sum, [, list]) => sum + list.length, 0)} 個時段</p>
          <label className="flex items-center gap-2 text-xs text-cocoa-soft">
            <input type="checkbox" className="accent-caramel" checked={showPast} onChange={(event) => setShowPast(event.target.checked)} />
            顯示已過期時段
          </label>
        </div>

        {groupedSlots.length === 0 ? (
          <p className="surface mt-3 rounded-lg px-5 py-8 text-center text-sm text-cocoa-soft">目前沒有可預約的時段。結帳頁會顯示「尚未開放面交預約」。</p>
        ) : (
          <div className="mt-3 space-y-4">
            {groupedSlots.map(([date, list]) => (
              <div key={date}>
                <p className="text-xs tracking-[0.18em] text-caramel-deep">{formatDate(date)}{date < today ? "（已過期）" : ""}</p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((slot) => (
                    <li key={slot.id} className={`surface flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm ${!slot.isActive ? "opacity-70" : ""}`}>
                      <div>
                        <p className="font-medium text-cocoa">{slot.startTime} – {slot.endTime}</p>
                        <p className="text-xs text-cocoa-soft">{locationName(slot.locationId)} · 已預約 {slot.used}/{slot.capacity} 組</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={99}
                          defaultValue={slot.capacity}
                          key={`${slot.id}-${slot.capacity}`}
                          className="field w-16 min-h-9 py-1 text-center"
                          aria-label="可預約組數"
                          onBlur={(event) => {
                            const next = Number(event.target.value);
                            if (Number.isInteger(next) && next >= 1 && next !== slot.capacity) void patch("slot", slot.id, { capacity: next }, "可預約組數已更新。");
                          }}
                        />
                        <Toggle checked={slot.isActive} disabled={busy === `slot-${slot.id}`} onChange={(value) => patch("slot", slot.id, { isActive: value }, value ? "時段已開放。" : "時段已關閉。")} label="開放時段" />
                        <button type="button" className="text-xs text-[#8A4B3D] hover:underline" onClick={() => setConfirmDelete({ type: "slot", id: slot.id, label: `${formatDate(date)} ${slot.startTime}–${slot.endTime}` })}>刪除</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={locationDialog !== null} title={locationDialog === "new" ? "新增面交地點" : "編輯面交地點"} onClose={() => !pending && setLocationDialog(null)}>
        <form onSubmit={saveLocation} className="space-y-4" noValidate>
          <div>
            <label className="field-label" htmlFor="loc-name">地點名稱</label>
            <input id="loc-name" className="field" value={locationDraft.name} onChange={(event) => setLocationDraft({ ...locationDraft, name: event.target.value })} placeholder="例如：某捷運站 2 號出口" required />
          </div>
          <div>
            <label className="field-label" htmlFor="loc-desc">地點說明</label>
            <input id="loc-desc" className="field" value={locationDraft.description} onChange={(event) => setLocationDraft({ ...locationDraft, description: event.target.value })} placeholder="顧客在結帳頁會看到的補充說明" />
          </div>
          <div>
            <label className="field-label" htmlFor="loc-notes">取貨注意事項</label>
            <textarea id="loc-notes" className="field min-h-24" value={locationDraft.notes} onChange={(event) => setLocationDraft({ ...locationDraft, notes: event.target.value })} placeholder="例如：冷藏品請自備保冷袋；如需更改時間請提前聯繫。" />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <Toggle checked={locationDraft.isActive} onChange={(value) => setLocationDraft({ ...locationDraft, isActive: value })} label="啟用地點" />
            {locationDraft.isActive ? "啟用（顧客可選擇）" : "停用"}
          </label>
          {error ? <p className="text-sm text-[#8A4B3D]">{error}</p> : null}
          <div className="flex justify-end gap-3 border-t border-mist/70 pt-4">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLocationDialog(null)} disabled={pending}>取消</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending ? "儲存中…" : "儲存地點"}</button>
          </div>
        </form>
      </Dialog>

      <Dialog open={confirmDelete !== null} title="確認刪除" onClose={() => setConfirmDelete(null)}>
        <p className="text-sm leading-relaxed">確定要刪除「{confirmDelete?.label}」嗎？若已有訂單使用，系統會改為停用以保留訂單資料。</p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(null)}>取消</button>
          <button type="button" className="btn btn-dark btn-sm" onClick={remove} disabled={busy !== null}>確定刪除</button>
        </div>
      </Dialog>
    </div>
  );
}
