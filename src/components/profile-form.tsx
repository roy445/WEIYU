"use client";

import { useRouter } from "next/navigation";
import Cropper, { type Area } from "react-easy-crop";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { MemberAvatar } from "./member-avatar";
import { useStore } from "./store-provider";

const avatarOptions = [
  { id: "caramel", label: "焦糖棕" },
  { id: "berry", label: "莓果紅" },
  { id: "matcha", label: "抹茶綠" },
  { id: "blueberry", label: "藍莓藍" },
] as const;

export function ProfileForm({ user }: { user: { name: string; email: string; phone: string | null; theme: "light" | "dark"; avatarColor: string; avatarUrl: string | null } }) {
  const router = useRouter();
  const { toast } = useStore();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [theme, setTheme] = useState<"light" | "dark">(user.theme);
  const [avatarColor, setAvatarColor] = useState(user.avatarColor);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [avatarPending, setAvatarPending] = useState(false);
  const [avatarRemaining, setAvatarRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/account/avatar")
      .then(async (response) => {
        const data = (await response.json()) as { ok?: boolean; remaining?: number };
        if (active && response.ok && data.ok && typeof data.remaining === "number") setAvatarRemaining(data.remaining);
      })
      .catch(() => {
        if (active) setAvatarRemaining(null);
      });
    return () => { active = false; };
  }, []);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => setCroppedArea(pixels), []);

  const chooseAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setError("圖片無法使用，請選擇其他圖片後再試。");
      return;
    }
    setError(null);
    setImageToCrop(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const saveAvatar = async () => {
    if (!imageToCrop || !croppedArea) return;
    setAvatarPending(true);
    setError(null);
    try {
      const image = new Image();
      image.src = imageToCrop;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("此瀏覽器無法處理圖片。");
      context.drawImage(image, croppedArea.x, croppedArea.y, croppedArea.width, croppedArea.height, 0, 0, 512, 512);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("圖片裁切失敗。")), "image/jpeg", 0.88);
      });
      const formData = new FormData();
      formData.set("file", blob, "avatar.jpg");
      const response = await fetch("/api/account/avatar", { method: "POST", body: formData });
      const data = (await response.json()) as { ok?: boolean; error?: string; avatarUrl?: string };
      if (!response.ok || !data.ok || !data.avatarUrl) throw new Error(data.error ?? "頭像上傳失敗。");
      setAvatarUrl(data.avatarUrl);
      setAvatarRemaining((remaining) => remaining === null ? null : Math.max(0, remaining - 1));
      setImageToCrop(null);
      URL.revokeObjectURL(imageToCrop);
      toast("頭像已更新。");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "頭像更新失敗。");
    } finally {
      setAvatarPending(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, theme, avatarColor, avatarUrl }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "更新失敗。");
        return;
      }
      toast("會員資料已更新。");
      router.refresh();
    } catch {
      setError("網路或伺服器發生問題，請稍後再試。");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="flex items-center gap-4">
        <MemberAvatar name={name} color={avatarColor} imageUrl={avatarUrl} size="lg" />
        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-cocoa-soft">可上傳照片並裁切成正方形；也可使用下方的簡約彩色首字頭像。最近 7 天最多成功更換 3 次{avatarRemaining === null ? "" : `，目前還可更換 ${avatarRemaining} 次`}。</p>
          <label className="btn btn-secondary btn-sm w-fit cursor-pointer">
            {avatarUrl ? "更換照片" : "上傳頭像"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={avatarRemaining === 0} onChange={(event) => {
              chooseAvatar(event.target.files?.[0]);
              event.currentTarget.value = "";
            }} />
          </label>
        </div>
      </div>
      {imageToCrop ? (
        <section aria-label="裁切頭像" className="space-y-3 rounded-lg border border-mist/70 p-3">
          <div className="relative h-64 overflow-hidden rounded-md bg-cocoa">
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <label className="block">
            <span className="field-label">縮放圖片</span>
            <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-caramel" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary btn-sm" disabled={avatarPending} onClick={() => {
              URL.revokeObjectURL(imageToCrop);
              setImageToCrop(null);
            }}>取消</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={avatarPending || !croppedArea} onClick={() => void saveAvatar()}>
              {avatarPending ? "上傳中…" : "套用裁切"}
            </button>
          </div>
        </section>
      ) : null}
      <fieldset>
        <legend className="field-label">頭像配色</legend>
        <div className="flex flex-wrap gap-2">
          {avatarOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setAvatarColor(option.id)}
              aria-pressed={avatarColor === option.id}
              className={`rounded-full border px-3 py-1.5 text-xs ${avatarColor === option.id ? "border-caramel bg-oat-soft text-cocoa" : "border-mist text-cocoa-soft"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {avatarUrl ? (
          <button type="button" className="mt-3 text-xs text-caramel-deep underline underline-offset-4" onClick={() => setAvatarUrl(null)}>
            改用彩色首字頭像
          </button>
        ) : null}
      </fieldset>
      <div>
        <label htmlFor="profile-name" className="field-label">顯示名稱</label>
        <input id="profile-name" className="field" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={40} required />
      </div>
      <div>
        <label htmlFor="profile-phone" className="field-label">聯絡電話（面交時使用）</label>
        <input id="profile-phone" className="field" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="選填" />
      </div>
      <div>
        <label htmlFor="profile-email" className="field-label">電子郵件</label>
        <input id="profile-email" className="field bg-oat-soft/60" value={user.email} readOnly />
        <p className="mt-1 text-xs text-cocoa-soft">Email 是登入帳號，目前不能直接修改；如需更換請聯絡店家。</p>
      </div>
      <div>
        <label htmlFor="profile-theme" className="field-label">網站主題</label>
        <select id="profile-theme" className="field" value={theme} onChange={(event) => setTheme(event.target.value === "dark" ? "dark" : "light")}>
          <option value="light">暖色淺色主題</option>
          <option value="dark">夜間深色主題</option>
        </select>
      </div>
      <div aria-live="polite" className="min-h-5">
        {error ? <p className="text-sm text-[#8A4B3D]">{error}</p> : null}
      </div>
      <button type="submit" className="btn btn-secondary btn-sm" disabled={pending}>
        {pending ? "儲存中…" : "儲存資料"}
      </button>
    </form>
  );
}
