import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...\n");

  // ── Categories ──
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "electronics" },
      update: {},
      create: {
        name: "Electronics",
        slug: "electronics",
        description: "Gadgets, devices and accessories",
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: "clothing" },
      update: {},
      create: {
        name: "Clothing",
        slug: "clothing",
        description: "Apparel and fashion",
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: "home-kitchen" },
      update: {},
      create: {
        name: "Home & Kitchen",
        slug: "home-kitchen",
        description: "Home essentials and kitchenware",
        sortOrder: 3,
      },
    }),
  ]);

  const [electronics, clothing, homeKitchen] = categories;
  console.log(`Categories: ${categories.map((c) => c.name).join(", ")}`);

  // ── Products ──
  const productsData = [
    {
      name: "Wireless Bluetooth Earbuds",
      slug: "wireless-bluetooth-earbuds",
      description: "True wireless earbuds with noise cancellation and 24h battery life",
      price: 2499.0,
      comparePrice: 3999.0,
      sku: "ELEC-EAR-001",
      stock: 150,
      isActive: true,
      isFeatured: true,
      categoryId: electronics.id,
    },
    {
      name: "USB-C Fast Charger 65W",
      slug: "usb-c-fast-charger-65w",
      description: "GaN charger compatible with laptops and phones",
      price: 1299.0,
      comparePrice: 1999.0,
      sku: "ELEC-CHG-002",
      stock: 200,
      isActive: true,
      isFeatured: false,
      categoryId: electronics.id,
    },
    {
      name: "Smartphone Stand Holder",
      slug: "smartphone-stand-holder",
      description: "Adjustable aluminum phone stand for desk",
      price: 599.0,
      sku: "ELEC-STD-003",
      stock: 300,
      isActive: true,
      isFeatured: false,
      categoryId: electronics.id,
    },
    {
      name: "Cotton Round-Neck T-Shirt",
      slug: "cotton-round-neck-tshirt",
      description: "Premium 100% cotton t-shirt, available in multiple colors",
      price: 499.0,
      comparePrice: 799.0,
      sku: "CLO-TSH-001",
      stock: 500,
      isActive: true,
      isFeatured: true,
      categoryId: clothing.id,
    },
    {
      name: "Slim Fit Denim Jeans",
      slug: "slim-fit-denim-jeans",
      description: "Stretchable slim fit jeans with 5-pocket design",
      price: 1299.0,
      comparePrice: 1999.0,
      sku: "CLO-JNS-002",
      stock: 120,
      isActive: true,
      isFeatured: false,
      categoryId: clothing.id,
    },
    {
      name: "Stainless Steel Water Bottle",
      slug: "stainless-steel-water-bottle",
      description: "Double-wall insulated 750ml bottle, keeps drinks hot/cold for 12h",
      price: 699.0,
      comparePrice: 999.0,
      sku: "HK-BOT-001",
      stock: 250,
      isActive: true,
      isFeatured: true,
      categoryId: homeKitchen.id,
    },
    {
      name: "Non-Stick Frying Pan 26cm",
      slug: "non-stick-frying-pan-26cm",
      description: "Heavy-gauge aluminium pan with ceramic coating",
      price: 899.0,
      sku: "HK-PAN-002",
      stock: 80,
      isActive: true,
      isFeatured: false,
      categoryId: homeKitchen.id,
    },
    {
      name: "Out-of-Stock Demo Item",
      slug: "out-of-stock-demo-item",
      description: "This product has zero stock for testing purposes",
      price: 999.0,
      sku: "DEMO-OOS-001",
      stock: 0,
      isActive: true,
      isFeatured: false,
      categoryId: electronics.id,
    },
  ];

  const products = await Promise.all(
    productsData.map((p) =>
      prisma.product.upsert({
        where: { slug: p.slug },
        update: {},
        create: p,
      })
    )
  );
  console.log(`Products: ${products.length} created`);

  // ── Serviceable Pincodes ──
  const pincodesData = [
    { pincode: "400001", city: "Mumbai", state: "Maharashtra" },
    { pincode: "400002", city: "Mumbai", state: "Maharashtra" },
    { pincode: "400050", city: "Mumbai", state: "Maharashtra" },
    { pincode: "110001", city: "New Delhi", state: "Delhi" },
    { pincode: "110020", city: "New Delhi", state: "Delhi" },
    { pincode: "560001", city: "Bengaluru", state: "Karnataka" },
    { pincode: "560034", city: "Bengaluru", state: "Karnataka" },
    { pincode: "600001", city: "Chennai", state: "Tamil Nadu" },
    { pincode: "500001", city: "Hyderabad", state: "Telangana" },
    { pincode: "700001", city: "Kolkata", state: "West Bengal" },
    { pincode: "380001", city: "Ahmedabad", state: "Gujarat" },
    { pincode: "411001", city: "Pune", state: "Maharashtra" },
    { pincode: "999999", city: "Inactive City", state: "Inactive State", isActive: false },
  ];

  const pincodes = await Promise.all(
    pincodesData.map((p) =>
      prisma.serviceablePincode.upsert({
        where: { pincode: p.pincode },
        update: {},
        create: { ...p, isActive: p.isActive ?? true },
      })
    )
  );
  console.log(`Serviceable Pincodes: ${pincodes.length} created`);

  // ── Product ↔ Pincode Mappings ──
  // All products deliver to Mumbai & Delhi; featured products deliver everywhere
  const activePincodes = pincodes.filter((p) => pincodesData.find((d) => d.pincode === p.pincode)?.isActive !== false);
  const mumbaiDelhi = activePincodes.filter((p) =>
    ["400001", "400002", "400050", "110001", "110020"].includes(p.pincode)
  );

  const mappings: { productId: string; pincodeId: string }[] = [];

  for (const product of products) {
    const isFeatured = productsData.find((p) => p.slug === product.slug)?.isFeatured;
    const targetPincodes = isFeatured ? activePincodes : mumbaiDelhi;

    for (const pincode of targetPincodes) {
      mappings.push({ productId: product.id, pincodeId: pincode.id });
    }
  }

  let created = 0;
  for (const m of mappings) {
    await prisma.productPincode.upsert({
      where: { productId_pincodeId: { productId: m.productId, pincodeId: m.pincodeId } },
      update: {},
      create: m,
    });
    created++;
  }
  console.log(`Product-Pincode Mappings: ${created} created`);

  // ── Coupon ──
  const now = new Date();
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.coupon.upsert({
    where: { code: "SAVE10" },
    update: {},
    create: {
      code: "SAVE10",
      description: "10% off on orders above 500",
      discountType: "PERCENTAGE",
      discountValue: 10,
      maxDiscountAmount: 200,
      minOrderAmount: 500,
      maxUses: 1000,
      maxUsesPerCustomer: 3,
      validFrom: now,
      validUntil: oneMonthLater,
    },
  });

  await prisma.coupon.upsert({
    where: { code: "FLAT100" },
    update: {},
    create: {
      code: "FLAT100",
      description: "Flat Rs.100 off on orders above 999",
      discountType: "FLAT",
      discountValue: 100,
      minOrderAmount: 999,
      maxUses: 500,
      maxUsesPerCustomer: 1,
      validFrom: now,
      validUntil: oneMonthLater,
    },
  });

  await prisma.coupon.upsert({
    where: { code: "CODONLY50" },
    update: {},
    create: {
      code: "CODONLY50",
      description: "Flat Rs.50 off for COD orders",
      discountType: "FLAT",
      discountValue: 50,
      minOrderAmount: 500,
      paymentMethod: "COD",
      maxUses: 200,
      validFrom: now,
      validUntil: oneMonthLater,
    },
  });

  console.log("Coupons: SAVE10, FLAT100, CODONLY50 created");

  // ── Summary ──
  console.log("\n── Seed Summary ──");
  console.log(`  Categories:        ${categories.length}`);
  console.log(`  Products:          ${products.length}`);
  console.log(`  Serviceable Pins:  ${pincodes.length}`);
  console.log(`  Product-Pin maps:  ${created}`);
  console.log(`  Coupons:           3`);
  console.log("\n── Test Scenarios ──");
  console.log("  Delivery available:     GET /product-pincodes/check/<earbuds-id>/400001  → deliverable");
  console.log("  Delivery unavailable:   GET /product-pincodes/check/<charger-id>/560001  → not deliverable (non-featured, not in Mumbai/Delhi)");
  console.log("  Inactive pincode:       GET /product-pincodes/check/<any-id>/999999      → not deliverable");
  console.log("  Out of stock product:   Product 'Out-of-Stock Demo Item' has stock=0");
  console.log("\n  Product IDs for testing:");
  for (const p of products) {
    const data = productsData.find((d) => d.slug === p.slug);
    console.log(`    ${p.id}  ${p.name}  (stock: ${data?.stock}, featured: ${data?.isFeatured})`);
  }
  console.log("\n  Active Pincodes:");
  for (const p of activePincodes) {
    const data = pincodesData.find((d) => d.pincode === p.pincode);
    console.log(`    ${p.pincode}  ${data?.city}, ${data?.state}`);
  }

  console.log("\nDone!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
