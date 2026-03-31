import { Router } from "express";
import categoryRoutes from "./modules/category/category.route.js";
import productRoutes from "./modules/product/product.route.js";
import customerRoutes from "./modules/customer/customer.route.js";
import addressRoutes from "./modules/address/address.route.js";
import productPincodeRoutes from "./modules/product-pincode/product-pincode.route.js";
import orderRoutes from "./modules/order/order.route.js";
import paymentRoutes from "./modules/payment/payment.route.js";
import couponRoutes from "./modules/coupon/coupon.route.js";

const router = Router();

// Register module routes here:
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/customers", customerRoutes);
router.use("/customers/me/addresses", addressRoutes);
router.use("/product-pincodes", productPincodeRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/coupons", couponRoutes);

export default router;
