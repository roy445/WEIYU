import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const cloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );

  try {
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      checks: {
        database: "ok",
        cloudinary: {
          configured: cloudinaryConfigured,
          status: cloudinaryConfigured ? "configured_unverified" : "missing_configuration",
        },
      },
    });
  } catch (error) {
    console.error("Health check database failed", error instanceof Error ? error.message : "unknown");
    return Response.json(
      {
        ok: false,
        checks: {
          database: "error",
          cloudinary: {
            configured: cloudinaryConfigured,
            status: cloudinaryConfigured ? "configured_unverified" : "missing_configuration",
          },
        },
      },
      { status: 500 },
    );
  }
}
