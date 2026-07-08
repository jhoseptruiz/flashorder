"use strict";
import { getSalesStats, getTopProducts, getPendingCalendar } from "../services/dashboard.service.js";

export async function getDashboardStatsController(req, res) {
  try {
    const { period = "daily", calendarYear, calendarMonth } = req.query;

    const [sales, topProducts, calendar] = await Promise.all([
      getSalesStats(period),
      getTopProducts(),
      getPendingCalendar(
        calendarYear ? parseInt(calendarYear) : undefined,
        calendarMonth ? parseInt(calendarMonth) : undefined
      ),
    ]);

    res.json({
      sales,
      topProducts,
      calendar,
    });
  } catch (error) {
    console.error("Error en getDashboardStatsController:", error);
    res.status(500).json({
      error: error.message || "No se pudieron obtener las estadísticas del dashboard",
    });
  }
}
