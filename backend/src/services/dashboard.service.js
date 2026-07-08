"use strict";
import { Op, fn, col, literal } from "sequelize";
import sequelize from "../db/db.js";
import CustomerOrder from "../models/CustomerOrder.js";
import OrderItem from "../models/OrderItem.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Devuelve { start, end } según el periodo solicitado */
function getDateRange(period) {
  const now = new Date();
  let start, end;

  switch (period) {
    case "daily": {
      // Últimos 7 días
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "weekly": {
      // Últimas 4 semanas (28 días)
      start = new Date(now);
      start.setDate(start.getDate() - 27);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "monthly": {
      // Últimos 12 meses
      start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "yearly": {
      // Últimos 5 años
      start = new Date(now.getFullYear() - 4, 0, 1);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
    }
    default: {
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    }
  }

  return { start, end };
}

// ── Datos de ventas para gráfico ──────────────────────────────────────────────

export async function getSalesStats(period = "daily") {
  const { start, end } = getDateRange(period);

  // Obtener órdenes locales en el rango (todos los estados excepto pendiente_uber)
  const orders = await CustomerOrder.findAll({
    where: {
      status: { [Op.in]: ["pendiente", "en_cocina", "empacado", "entregado"] },
      orderDate: { [Op.between]: [start, end] },
    },
    attributes: ["orderDate", "totalAmount", "paymentMethod"],
    raw: true,
  });

  // Agrupar según periodo
  const grouped = {};

  for (const order of orders) {
    const date = new Date(order.orderDate);
    let key;

    switch (period) {
      case "daily":
        key = date.toISOString().slice(0, 10); // YYYY-MM-DD
        break;
      case "weekly": {
        // Calcular inicio de la semana (lunes)
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        key = d.toISOString().slice(0, 10);
        break;
      }
      case "monthly":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        break;
      case "yearly":
        key = `${date.getFullYear()}`;
        break;
      default:
        key = date.toISOString().slice(0, 10);
    }

    if (!grouped[key]) {
      grouped[key] = { efectivo: 0, tarjeta: 0, transferencia: 0 };
    }

    const method = (order.paymentMethod || "efectivo").toLowerCase();
    const amount = Number(order.totalAmount) || 0;

    if (method.includes("tarjeta")) {
      grouped[key].tarjeta += amount;
    } else if (method.includes("transferencia")) {
      grouped[key].transferencia += amount;
    } else {
      grouped[key].efectivo += amount;
    }
  }

  // Generar labels completos para el periodo
  const labels = [];
  const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  if (period === "daily") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayName = DAY_NAMES[d.getDay()];
      const dayNum = d.getDate();
      labels.push({ key, label: `${dayName} ${dayNum}` });
    }
  } else if (period === "weekly") {
    for (let i = 3; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      const key = d.toISOString().slice(0, 10);
      const endWeek = new Date(d);
      endWeek.setDate(endWeek.getDate() + 6);
      labels.push({
        key,
        label: `${d.getDate()}/${d.getMonth() + 1} - ${endWeek.getDate()}/${endWeek.getMonth() + 1}`,
      });
    }
  } else if (period === "monthly") {
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
      labels.push({ key, label: `${MONTH_NAMES[m.getMonth()]} ${m.getFullYear()}` });
    }
  } else if (period === "yearly") {
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const year = now.getFullYear() - i;
      labels.push({ key: `${year}`, label: `${year}` });
    }
  }

  // Construir datos finales
  const chartData = labels.map(({ key, label }) => ({
    label,
    efectivo: grouped[key]?.efectivo || 0,
    tarjeta: grouped[key]?.tarjeta || 0,
    transferencia: grouped[key]?.transferencia || 0,
  }));

  // Totales generales del periodo
  let totalEfectivo = 0, totalTarjeta = 0, totalTransferencia = 0;
  for (const d of chartData) {
    totalEfectivo += d.efectivo;
    totalTarjeta += d.tarjeta;
    totalTransferencia += d.transferencia;
  }

  return {
    chartData,
    totals: {
      efectivo: totalEfectivo,
      tarjeta: totalTarjeta,
      transferencia: totalTransferencia,
      total: totalEfectivo + totalTarjeta + totalTransferencia,
    },
  };
}

// ── Productos más vendidos del mes actual ─────────────────────────────────────

export async function getTopProducts() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const results = await OrderItem.findAll({
    attributes: [
      "productNameSnapshot",
      [fn("SUM", col("quantity")), "totalQty"],
      [fn("SUM", col("subtotal")), "totalRevenue"],
    ],
    include: [
      {
        model: CustomerOrder,
        attributes: [],
        where: {
          status: { [Op.in]: ["pendiente", "en_cocina", "empacado", "entregado"] },
          orderDate: { [Op.between]: [startOfMonth, endOfMonth] },
        },
      },
    ],
    group: ["productNameSnapshot"],
    order: [[literal('"totalQty"'), "DESC"]],
    limit: 10,
    raw: true,
  });

  return results.map((r, i) => ({
    rank: i + 1,
    name: r.productNameSnapshot,
    quantity: Number(r.totalQty) || 0,
    revenue: Number(r.totalRevenue) || 0,
  }));
}

// ── Calendario de pedidos pendientes ──────────────────────────────────────────

export async function getPendingCalendar(year, month) {
  const now = new Date();
  const y = year || now.getFullYear();
  const m = month || now.getMonth() + 1; // 1-indexed

  const startOfMonth = new Date(y, m - 1, 1);
  const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

  const orders = await CustomerOrder.findAll({
    where: {
      status: { [Op.in]: ["pendiente", "en_cocina", "empacado", "pendiente_uber"] },
      deliveryDate: { [Op.between]: [startOfMonth, endOfMonth] },
    },
    attributes: ["deliveryDate"],
    raw: true,
  });

  // Agrupar por día
  const dayCount = {};
  for (const order of orders) {
    if (!order.deliveryDate) continue;
    const day = new Date(order.deliveryDate).getDate();
    dayCount[day] = (dayCount[day] || 0) + 1;
  }

  return {
    year: y,
    month: m,
    pendingByDay: dayCount,
  };
}
