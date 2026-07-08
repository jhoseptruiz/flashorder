import {
  getOrdersByStatus,
  getOrdersBetweenDates,
  updateOrderStatus,
  getOrderById,
  getOrdersForEmployee,
  getUberPendingOrders,
  cancelOrder,
  updateCancelOrder,
} from "../services/orders.service.js";
import { createAuditLog } from "../helpers/audit.helper.js";

export async function getOrdersByStatusController(req, res) {
  try {
    const { status } = req.params;

    const validStatuses = ["pendiente", "en_cocina", "empacado", "entregado"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Estado inválido" });
    }

    const orders = await getOrdersByStatus(status);

    res.json(orders);
  } catch (error) {
    console.error("Error en getOrdersByStatusController:", error);
    res.status(500).json({ error: "No se pudieron obtener las órdenes" });
  }
}

export async function getOrdersForKitchenController(req, res) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "Se requieren startDate y endDate" });
    }

    const orders = await getOrdersBetweenDates(
      new Date(startDate),
      new Date(endDate)
    );

    res.json(orders);
  } catch (error) {
    console.error("Error en getOrdersForKitchenController:", error);
    res.status(500).json({
      error: "No se pudieron obtener las órdenes del calendario",
    });
  }
}

export async function updateOrderStatusController(req, res) {
  try {
    const { orderId } = req.params;
    const { status, balancePaymentMethod } = req.body;

    if (!status) {
      return res.status(400).json({ error: "El estado es requerido" });
    }

    // Obtener estado anterior antes de actualizar
    const previousOrder = await getOrderById(orderId);
    const oldStatus = previousOrder.status;

    const order = await updateOrderStatus(orderId, status, balancePaymentMethod || null);

    // Registrar auditoría del cambio de estado
    await createAuditLog(
      req.user.rut,
      "UPDATE_STATUS",
      "customer_orders",
      orderId,
      { status: oldStatus },
      {
        status: order.status,
        externalOrderId: previousOrder.externalOrderId || null,
        source: previousOrder.source || null,
      }
    );

    res.json({
      message: "Orden actualizada correctamente",
      order,
    });
  } catch (error) {
    console.error("Error en updateOrderStatusController:", error);
    res
      .status(500)
      .json({
        error:
          error.message || "No se pudo actualizar el estado de la orden",
      });
  }
}

export async function getOrderByIdController(req, res) {
  try {
    const { orderId } = req.params;
    const order = await getOrderById(orderId);
    res.json(order);
  } catch (error) {
    console.error("Error en getOrderByIdController:", error);
    res.status(500).json({
      error: error.message || "No se pudo obtener la orden",
    });
  }
}

export async function getOrdersForEmployeeController(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const orders = await getOrdersForEmployee(
      startDate ? new Date(startDate) : null,
      endDate   ? new Date(endDate)   : null
    );
    res.json(orders);
  } catch (error) {
    console.error("Error en getOrdersForEmployeeController:", error);
    res.status(500).json({ error: "No se pudieron obtener las órdenes" });
  }
}

export async function getUberPendingOrdersController(req, res) {
  try {
    const orders = await getUberPendingOrders();
    res.json(orders);
  } catch (error) {
    console.error("Error en getUberPendingOrdersController:", error);
    res
      .status(500)
      .json({ error: "No se pudieron obtener las órdenes pendientes de Uber" });
  }
}

export async function cancelOrderController(req, res) {
  try {
    const { orderId } = req.params;
    const { reason, isRefunded } = req.body;

    const previousOrder = await getOrderById(orderId);
    const oldStatus = previousOrder.status;

    const order = await cancelOrder(orderId, reason, isRefunded, req.user.rut);

    await createAuditLog(
      req.user.rut,
      "CANCEL_ORDER",
      "customer_orders",
      orderId,
      { status: oldStatus },
      { status: "cancelado", reason, isRefunded }
    );

    res.json({ message: "Orden cancelada correctamente", order });
  } catch (error) {
    console.error("Error en cancelOrderController:", error);
    res.status(500).json({ error: error.message || "No se pudo cancelar la orden" });
  }
}

export async function updateCancelOrderController(req, res) {
  try {
    const { orderId } = req.params;
    const { isRefunded, reason } = req.body;

    const order = await updateCancelOrder(orderId, isRefunded, reason);

    await createAuditLog(
      req.user.rut,
      "UPDATE_CANCEL_ORDER",
      "customer_orders",
      orderId,
      null,
      { isRefunded, reason }
    );

    res.json({ message: "Cancelación actualizada correctamente", order });
  } catch (error) {
    console.error("Error en updateCancelOrderController:", error);
    res.status(500).json({ error: error.message || "No se pudo actualizar la cancelación" });
  }
}
