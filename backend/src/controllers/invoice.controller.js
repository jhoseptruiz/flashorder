import { getInvoices } from "../services/invoice.service.js";
import CustomerOrder from "../models/CustomerOrder.js";
import OrderItem from "../models/OrderItem.js";
import Customer from "../models/Customer.js";
import { buildReceiptHtml, createReceiptPdfBuffer } from "../services/email.service.js";

export async function getInvoicesController(req, res) {
  try {
    const { startDate, endDate, search, sort } = req.query;
    const sortDirection = sort === "asc" ? "ASC" : "DESC";

    const invoices = await getInvoices({
      startDate,
      endDate,
      search,
      sortDirection,
    });

    res.json(invoices);
  } catch (error) {
    console.error("Error en getInvoicesController:", error);
    res.status(500).json({ error: error.message || "No se pudieron obtener las boletas" });
  }
}

export async function getInvoicePdfController(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "ID de boleta requerido" });

    const order = await CustomerOrder.findByPk(id, {
      include: [
        { model: OrderItem, attributes: ["id", "quantity", "unitPrice", "subtotal", "productNameSnapshot", "groupId"] },
        { model: Customer, attributes: ["id", "fullName", "phone", "email"] },
      ],
    });

    if (!order) return res.status(404).json({ error: "Boleta no encontrada" });

    const plainOrder = order.get ? order.get({ plain: true }) : order;
    const companyName = req.query.companyName || plainOrder.companyName;
    const companyLogo = req.query.companyLogo || plainOrder.companyLogo;
    const pdfBuffer = await createReceiptPdfBuffer(plainOrder, { companyName, companyLogo });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=boleta-${id}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("Error en getInvoicePdfController:", error);
    res.status(500).json({ error: error.message || "No se pudo generar PDF" });
  }
}
