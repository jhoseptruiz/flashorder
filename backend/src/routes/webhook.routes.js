"use strict";
import { Router } from "express";
import { receiveUberOrder } from "../controllers/webhook.controller.js";

const router = Router();

// ── Webhook de Uber Eats ──────────────────────────────────────────────────────
// Esta ruta es PÚBLICA (sin JWT). La seguridad se valida con la firma HMAC
// que Uber envía en el header X-Uber-Signature.
router.post("/uber-eats", receiveUberOrder);

export default router;
