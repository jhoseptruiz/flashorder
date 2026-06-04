import {
  getOrdersByStatus,
  getOrdersBetweenDates,
  updateOrderStatus,
  getOrderById,
  getOrdersForEmployee,
  getUberPendingOrders,
} from "../services/orders.service.js";

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
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "El estado es requerido" });
    }

    const order = await updateOrderStatus(orderId, status);

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
    res.status(500).json({ error: "No se pudieron obtener los pedidos Uber" });
  }
}
