import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * WEIYU 唯遇甜所 — 資料模型
 * 所有金額皆以「新台幣整數元」儲存，避免浮點數誤差。
 */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("customer"), // customer | admin
    theme: text("theme").notNull().default("light"),
    avatarColor: text("avatar_color").notNull().default("caramel"),
    avatarUrl: text("avatar_url"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    pendingVerificationExpiresAt: timestamp("pending_verification_expires_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    privacyAcknowledgedAt: timestamp("privacy_acknowledged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const avatarUpdates = pgTable(
  "avatar_updates",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("avatar_updates_user_created_idx").on(table.userId, table.createdAt)],
);

export const coupons = pgTable(
  "coupons",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    type: text("type").notNull(),
    value: integer("value").notNull(),
    minimumSubtotal: integer("minimum_subtotal").notNull().default(0),
    maxDiscount: integer("max_discount"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    newMemberOnly: boolean("new_member_only").notNull().default(false),
    firstOrderOnly: boolean("first_order_only").notNull().default(false),
    claimExpiresDays: integer("claim_expires_days"),
    maxRedemptions: integer("max_redemptions"),
    redemptionCount: integer("redemption_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("coupons_code_unique").on(table.code),
    index("coupons_active_expiry_idx").on(table.isActive, table.expiresAt),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 of the session token
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("password_reset_user_idx").on(table.userId)],
);

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("email_verification_user_unique").on(table.userId)],
);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("categories_slug_unique").on(table.slug)],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    summary: text("summary").notNull().default(""),
    description: text("description").notNull().default(""),
    price: integer("price").notNull(), // 新台幣整數元
    stock: integer("stock").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    viewCount: integer("view_count").notNull().default(0),
    cartAddCount: integer("cart_add_count").notNull().default(0),
    imageUrl: text("image_url"),
    galleryImages: jsonb("gallery_images").$type<string[]>().notNull().default([]),
    ingredients: text("ingredients"),
    internalRecipe: text("internal_recipe"),
    launchAt: timestamp("launch_at", { withTimezone: true }),
    allergens: text("allergens"),
    storageInfo: text("storage_info"),
    requiresRefrigeration: boolean("requires_refrigeration"),
    shelfLife: text("shelf_life"),
    pickupNote: text("pickup_note"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("products_slug_unique").on(table.slug),
    index("products_category_idx").on(table.categoryId),
    index("products_active_idx").on(table.isActive),
  ],
);

export const materials = pgTable(
  "materials",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    packageQuantityMilli: integer("package_quantity_milli").notNull(),
    purchaseCost: integer("purchase_cost").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("materials_name_unique").on(table.name)],
);

export const productRecipeItems = pgTable(
  "product_recipe_items",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    materialId: integer("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "restrict" }),
    amountMilli: integer("amount_milli").notNull(),
  },
  (table) => [
    uniqueIndex("product_recipe_material_unique").on(table.productId, table.materialId),
    index("product_recipe_product_idx").on(table.productId),
  ],
);

export const productCostSettings = pgTable("product_cost_settings", {
  productId: integer("product_id")
    .primaryKey()
    .references(() => products.id, { onDelete: "cascade" }),
  batchYield: integer("batch_yield").notNull().default(1),
  laborCost: integer("labor_cost").notNull().default(0),
  overheadCost: integer("overhead_cost").notNull().default(0),
  wasteBasisPoints: integer("waste_basis_points").notNull().default(0),
  targetMarginBasisPoints: integer("target_margin_basis_points").notNull().default(5000),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productMetricEvents = pgTable(
  "product_metric_events",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("product_metric_events_product_time_idx").on(table.productId, table.createdAt),
    index("product_metric_events_event_time_idx").on(table.event, table.createdAt),
  ],
);

export const productTrackers = pgTable(
  "product_trackers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    emailEnabled: boolean("email_enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("product_trackers_user_product_unique").on(table.userId, table.productId),
    index("product_trackers_product_idx").on(table.productId),
  ],
);

export const productLaunchReminders = pgTable(
  "product_launch_reminders",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull().defaultNow(),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    emailError: text("email_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("product_launch_reminders_product_email_unique").on(table.productId, table.email),
    index("product_launch_reminders_pending_idx").on(table.emailSentAt, table.productId),
  ],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceDelta: integer("price_delta").notNull().default(0),
    stock: integer("stock").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("product_variants_product_idx").on(table.productId)],
);

export const favoriteProducts = pgTable(
  "favorite_products",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("favorite_products_user_product_unique").on(table.userId, table.productId),
    index("favorite_products_user_idx").on(table.userId),
  ],
);

export const announcements = pgTable(
  "announcements",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    type: text("type").notNull().default("info"),
    displayMode: text("display_mode").notNull().default("inbox"),
    sendEmail: boolean("send_email").notNull().default(true),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("announcements_published_idx").on(table.publishedAt)],
);

export const announcementNotifications = pgTable(
  "announcement_notifications",
  {
    announcementId: integer("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    emailError: text("email_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.announcementId, table.userId], name: "announcement_notifications_pkey" }),
    index("announcement_notifications_user_idx").on(table.userId, table.createdAt),
  ],
);

export const emailDeliveryLogs = pgTable(
  "email_delivery_logs",
  {
    id: serial("id").primaryKey(),
    recipientEmail: text("recipient_email").notNull(),
    subject: text("subject").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("pending"),
    error: text("error"),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("email_delivery_logs_created_idx").on(table.createdAt),
    index("email_delivery_logs_status_idx").on(table.status),
  ],
);

export const pickupLocations = pgTable("pickup_locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pickupSlots = pgTable(
  "pickup_slots",
  {
    id: serial("id").primaryKey(),
    locationId: integer("location_id")
      .notNull()
      .references(() => pickupLocations.id, { onDelete: "cascade" }),
    pickupDate: date("pickup_date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    capacity: integer("capacity").notNull().default(3),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("pickup_slots_location_idx").on(table.locationId),
    index("pickup_slots_date_idx").on(table.pickupDate),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNo: text("order_no").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("pending_confirmation"),
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    paymentMethod: text("payment_method").notNull().default("cash_on_pickup"),
    subtotal: integer("subtotal").notNull(),
    couponDiscount: integer("coupon_discount").notNull().default(0),
    couponTitle: text("coupon_title"),
    pointsUsed: integer("points_used").notNull().default(0),
    pointsEarned: integer("points_earned").notNull().default(0),
    total: integer("total").notNull(),
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull(),
    pickupLocationId: integer("pickup_location_id").references(() => pickupLocations.id, {
      onDelete: "set null",
    }),
    pickupSlotId: integer("pickup_slot_id").references(() => pickupSlots.id, {
      onDelete: "set null",
    }),
    pickupLocationName: text("pickup_location_name").notNull(),
    pickupLocationNotes: text("pickup_location_notes"),
    pickupDate: text("pickup_date").notNull(),
    pickupTime: text("pickup_time").notNull(),
    customerNote: text("customer_note"),
    adminNote: text("admin_note"),
    stockRestored: boolean("stock_restored").notNull().default(false),
    clientRequestId: text("client_request_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("orders_order_no_unique").on(table.orderNo),
    uniqueIndex("orders_client_request_unique").on(table.clientRequestId),
    index("orders_user_idx").on(table.userId),
    index("orders_status_idx").on(table.status),
    index("orders_status_completed_idx").on(table.status, table.completedAt),
    index("orders_created_idx").on(table.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: integer("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    productSlug: text("product_slug").notNull(),
    variantName: text("variant_name"),
    imageUrl: text("image_url"),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

export const userCoupons = pgTable(
  "user_coupons",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    couponId: integer("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("available"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    usedOrderId: integer("used_order_id").references(() => orders.id, { onDelete: "set null" }),
  },
  (table) => [
    uniqueIndex("user_coupons_user_coupon_unique").on(table.userId, table.couponId),
    index("user_coupons_user_status_idx").on(table.userId, table.status),
  ],
);

export const cartShares = pgTable(
  "cart_shares",
  {
    id: serial("id").primaryKey(),
    tokenHash: text("token_hash").notNull(),
    items: jsonb("items").$type<{ productId: number; variantId: number | null; quantity: number }[]>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cart_shares_token_hash_unique").on(table.tokenHash),
    index("cart_shares_expiry_idx").on(table.expiresAt),
  ],
);

export const pointLots = pgTable(
  "point_lots",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    remaining: integer("remaining").notNull(),
    source: text("source").notNull(),
    sourceOrderId: integer("source_order_id").references(() => orders.id, { onDelete: "set null" }),
    sourceCouponId: integer("source_coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("point_lots_user_expiry_idx").on(table.userId, table.expiresAt)],
);

export const orderPointUses = pgTable(
  "order_point_uses",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    pointLotId: integer("point_lot_id")
      .notNull()
      .references(() => pointLots.id, { onDelete: "restrict" }),
    amount: integer("amount").notNull(),
    restoredAt: timestamp("restored_at", { withTimezone: true }),
  },
  (table) => [index("order_point_uses_order_idx").on(table.orderId)],
);

export const shopSettings = pgTable("shop_settings", {
  id: integer("id").primaryKey().default(1),
  shopName: text("shop_name").notNull().default("唯遇甜所"),
  brandNameEn: text("brand_name_en").notNull().default("WEIYU"),
  tagline: text("tagline").notNull().default("遇見一口甜。"),
  logoUrl: text("logo_url"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactSocial: text("contact_social"),
  pickupIntro: text("pickup_intro").notNull().default(""),
  orderingNotice: text("ordering_notice").notNull().default(""),
  privacyNotice: text("privacy_notice").notNull().default(""),
  termsText: text("terms_text").notNull().default(""),
  faqText: text("faq_text").notNull().default(""),
  cautionText: text("caution_text").notNull().default(""),
  isAcceptingOrders: boolean("is_accepting_orders").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminActionLogs = pgTable(
  "admin_action_logs",
  {
    id: serial("id").primaryKey(),
    adminId: integer("admin_id").references(() => users.id, { onDelete: "set null" }),
    adminEmail: text("admin_email").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("admin_logs_created_idx").on(table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type PickupLocation = typeof pickupLocations.$inferSelect;
export type PickupSlot = typeof pickupSlots.$inferSelect;
export type ShopSettings = typeof shopSettings.$inferSelect;
