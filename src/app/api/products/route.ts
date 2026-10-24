import { listProducts } from "@/lib/products";
import { ok } from "@/lib/api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const items = await listProducts({
    q: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
  });
  return ok({
    items: items.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      summary: item.summary,
      price: item.price,
      stock: item.stock,
      isActive: item.isActive,
      imageUrl: item.imageUrl,
      launchAt: item.launchAt,
      categoryName: item.categoryName,
      categorySlug: item.categorySlug,
    })),
  });
}
