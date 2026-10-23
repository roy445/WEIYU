import Image from "next/image";

const avatarColors: Record<string, string> = {
  caramel: "#A8754A",
  berry: "#A65369",
  matcha: "#6D8053",
  blueberry: "#5C7298",
};

export function MemberAvatar({
  name,
  color = "caramel",
  imageUrl = null,
  size = "md",
}: {
  name: string;
  color?: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions = size === "lg" ? "h-20 w-20 text-3xl" : size === "sm" ? "h-8 w-8 text-xs" : "h-12 w-12 text-lg";
  const initial = Array.from(name.trim())[0] ?? "甜";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-serif text-cream shadow-sm ${dimensions}`}
      style={{ backgroundColor: avatarColors[color] ?? avatarColors.caramel }}
      aria-label={`${name} 的個人頭像`}
    >
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill sizes="80px" unoptimized className="object-cover" />
      ) : (
        <>
          <span aria-hidden="true" className="absolute right-[18%] top-[18%] h-[20%] w-[20%] rounded-full bg-[#fff2d8]/80" />
          <span aria-hidden="true" className="absolute right-[8%] top-[28%] h-[14%] w-[14%] rounded-full bg-[#fff2d8]/60" />
          <span className="relative">{initial}</span>
        </>
      )}
    </span>
  );
}
