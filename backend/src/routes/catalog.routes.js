import { Router } from "express";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { authorizeRoles } from "../middlewares/authorization.middleware.js";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categories.controller.js";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/products.controller.js";
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
} from "../controllers/coupons.controller.js";
import {
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from "../controllers/promotions.controller.js";

const router = Router();

// Todas las rutas del catálogo requieren autenticación
router.use(authenticate);

// ─── Categorías ─────────────────────────────────────────
router.get("/categories", getCategories);
router.post("/categories", authorizeRoles("admin"), createCategory);
router.put("/categories/:id", authorizeRoles("admin"), updateCategory);
router.delete("/categories/:id", authorizeRoles("admin"), deleteCategory);

// ─── Productos ──────────────────────────────────────────
router.get("/products", getProducts);
router.post("/products", authorizeRoles("admin"), createProduct);
router.put("/products/:id", authorizeRoles("admin"), updateProduct);
router.delete("/products/:id", authorizeRoles("admin"), deleteProduct);

// ─── Cupones ────────────────────────────────────────────
router.get("/coupons", getCoupons);
router.post("/coupons", authorizeRoles("admin"), createCoupon);
router.put("/coupons/:id", authorizeRoles("admin"), updateCoupon);
router.delete("/coupons/:id", authorizeRoles("admin"), deleteCoupon);
router.post("/coupons/validate", validateCoupon);

// ─── Promociones ────────────────────────────────────────
router.get("/promotions", getPromotions);
router.post("/promotions", authorizeRoles("admin"), createPromotion);
router.put("/promotions/:id", authorizeRoles("admin"), updatePromotion);
router.delete("/promotions/:id", authorizeRoles("admin"), deletePromotion);

export default router;