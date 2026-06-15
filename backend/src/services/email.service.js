import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import User from "../models/User.js";
import SystemConfig from "../models/SystemConfig.js";

const MAIL_HOST = process.env.MAIL_HOST || "smtp.gmail.com";
const MAIL_PORT = parseInt(process.env.MAIL_PORT, 10) || 587;
const MAIL_SECURE = process.env.MAIL_SECURE === "true";
const MAIL_USER = process.env.MAIL_USER || "";
const MAIL_PASS = process.env.MAIL_PASS || "";
const MAIL_FROM = process.env.MAIL_FROM || `FlashOrder <${MAIL_USER}>`;

const transporter = nodemailer.createTransport({
  host: MAIL_HOST,
  port: MAIL_PORT,
  secure: MAIL_SECURE,
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS,
  },
});

async function getAdminRecipientEmails() {
  const admins = await User.findAll({
    where: { role: "admin", isActive: true },
    attributes: ["email"],
    raw: true,
  });

  const emails = admins
    .map((admin) => admin.email)
    .filter((email) => typeof email === "string" && email.trim().length > 0);

  if (emails.length > 0) {
    return [...new Set(emails)];
  }

  const config = await SystemConfig.findOne();
  if (config?.backupEmail) {
    return [config.backupEmail];
  }

  return [];
}

function formatMoney(amount) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function buildReceiptHtml(order, companyInfo = {}) {
  const companyName = companyInfo.companyName || order.companyName || "FlashOrder";
  const companyLogo = companyInfo.companyLogo || order.companyLogo;
  const companyLogoCid = companyInfo.logoCid;
  const customerName = order.Customer?.fullName || "Cliente";
  const customerEmail = order.Customer?.email || "-";
  const customerPhone = order.Customer?.phone || "-";
  const orderDate = order.orderDate ? new Date(order.orderDate).toLocaleString("es-CL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) : "-";
  const deliveryDate = order.deliveryDate ? new Date(order.deliveryDate).toLocaleString("es-CL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) : "No definida";
  const rows = Array.isArray(order.OrderItems) ? order.OrderItems.map((item) => {
    const description = item.productNameSnapshot || "Producto";
    const quantity = item.quantity || 0;
    const unitPrice = formatMoney(item.unitPrice || 0);
    const subtotal = formatMoney(item.subtotal || quantity * (item.unitPrice || 0));
    return `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${description}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${unitPrice}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${subtotal}</td>
      </tr>`;
  }).join("") : "";

  const totalAmount = formatMoney(order.totalAmount || order.OrderItems?.reduce((sum, item) => sum + (item.subtotal || item.quantity * item.unitPrice), 0) || 0);
  const depositAmount = formatMoney(order.depositAmount || 0);
  const paymentMethod = order.paymentMethod || "No definido";
  const notes = order.notes ? `<p style="margin: 8px 0 0; font-size: 13px; color: #6b7280;">Notas: ${order.notes}</p>` : "";
  const logoElement = companyLogo
    ? `<img src="${companyLogoCid ? `cid:${companyLogoCid}` : companyLogo}" alt="${companyName}" style="width: 92px; height: 92px; object-fit: contain; border-radius: 18px; background: #fff; display: block; border: none;" />`
    : `<div style="width: 92px; height: 92px; display: flex; align-items: center; justify-content: center; border-radius: 18px; background: #f3f4f6; color: #374151; font-weight: 700; font-size: 18px;">${companyName.slice(0, 2).toUpperCase()}</div>`;

  return `
    <div style="font-family: Inter, sans-serif; color: #111827;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 26px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          ${logoElement}
          <div>
            <h1 style="margin: 0; font-size: 24px; letter-spacing: -0.5px;">${companyName}</h1>
            <p style="margin: 6px 0 0; color: #4b5563; font-size: 14px;">Boleta generada automáticamente</p>
          </div>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 13px; color: #6b7280;">Fecha pedido</p>
          <p style="margin: 6px 0 0; font-size: 15px; font-weight: 700;">${orderDate}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; margin-bottom: 28px;">
        <div style="padding: 18px; border: 1px solid #e5e7eb; border-radius: 16px; background: #ffffff;">
          <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #6b7280;">CLIENTE</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #111827;">${customerName}</p>
          <p style="margin: 6px 0 0; font-size: 13px; color: #4b5563;">${customerEmail}</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #4b5563;">${customerPhone}</p>
        </div>
        <div style="padding: 18px; border: 1px solid #e5e7eb; border-radius: 16px; background: #ffffff;">
          <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #6b7280;">ENTREGA</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #111827;">${deliveryDate}</p>
          <p style="margin: 6px 0 0; font-size: 13px; color: #4b5563;">Método: ${paymentMethod}</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #4b5563;">Depósito: ${depositAmount}</p>
        </div>
      </div>

      <div style="overflow-x: auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f9fafb; color: #374151; text-align: left;">
              <th style="padding: 14px 12px;">Producto</th>
              <th style="padding: 14px 12px; text-align: center;">Cant.</th>
              <th style="padding: 14px 12px; text-align: right;">Precio</th>
              <th style="padding: 14px 12px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end; margin-top: 24px;">
        <div style="width: min(360px, 100%); display: flex; justify-content: space-between; color: #6b7280; font-size: 14px;">
          <span>Subtotal</span>
          <strong>${totalAmount}</strong>
        </div>
        <div style="width: min(360px, 100%); display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; color: #111827;">
          <span>Total a pagar</span>
          <strong>${totalAmount}</strong>
        </div>
      </div>

      ${notes}
    </div>
  `;
}

export async function sendReceiptEmail(order, companyInfo = {}) {
  const recipients = await getAdminRecipientEmails();
  if (recipients.length === 0) {
    console.warn("No hay correo de administrador configurado para enviar boleta.");
    return;
  }

  const logoUrl = companyInfo.companyLogo || order.companyLogo;
  let logoBuffer = null;
  let logoCid = null;

  if (logoUrl) {
    logoBuffer = await fetchImageBuffer(logoUrl);
    if (logoBuffer) {
      logoCid = "company-logo@flashorder";
    }
  }

  const html = buildReceiptHtml(order, { ...companyInfo, logoCid });
  const subject = `Nueva boleta generada - Pedido ${order.id.substring(0, 8).toUpperCase()}`;

  // Generate PDF buffer from order data to attach to email
  let pdfBuffer = null;
  try {
    pdfBuffer = await createReceiptPdfBuffer(order, companyInfo);
  } catch (pdfErr) {
    console.warn("No se pudo generar PDF de la boleta:", pdfErr && pdfErr.message ? pdfErr.message : pdfErr);
  }

  const attachments = [];
  if (logoBuffer && logoCid) {
    attachments.push({
      filename: "company-logo.png",
      content: logoBuffer,
      cid: logoCid,
    });
  }
  if (pdfBuffer) {
    attachments.push({
      filename: `boleta-${order.id}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    });
  }

  const mailOptions = {
    from: MAIL_FROM,
    to: recipients.join(", "),
    subject,
    html,
    attachments,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Error al enviar boleta por correo:", err);
    if (err && err.code === "EAUTH") {
      console.warn("Error de autenticación SMTP (EAUTH). Si usas Gmail, genera una App Password y configura MAIL_USER/MAIL_PASS como variables de entorno. Alternativas: usar Mailtrap o Ethereal para pruebas.");
    }
  }
}

export async function createReceiptPdfBuffer(order, companyInfo = {}) {
  const logoUrl = companyInfo.companyLogo || order.companyLogo;
  const compName = companyInfo.companyName || order.companyName || "FlashOrder";
  const orderId = order.id ? String(order.id).substring(0, 8).toUpperCase() : "-";
  const orderDate = order.orderDate ? new Date(order.orderDate).toLocaleString("es-CL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) : "-";

  const items = Array.isArray(order.OrderItems) ? order.OrderItems : [];
  const customerName = order.Customer?.fullName || "Cliente";
  const customerPhone = order.Customer?.phone || "-";
  const customerEmail = order.Customer?.email || "-";
  const paymentMethod = order.paymentMethod || "No definido";
  const totalAmount = formatMoney(order.totalAmount || items.reduce((s, it) => s + (it.subtotal || it.quantity * it.unitPrice), 0));
  const depositAmount = formatMoney(order.depositAmount || 0);

  const logoBuffer = await fetchImageBuffer(logoUrl);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header block
    doc.rect(40, 40, 515, 96).fill("#f8fafc");
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 50, 52, { fit: [72, 72], align: "left" });
      } catch {
        // ignore logo rendering errors
      }
    }

    const titleX = logoBuffer ? 130 : 50;
    doc.fillColor("#111827").fontSize(20).text(compName, titleX, 52, { width: 400, continued: false });
    doc.fillColor("#6b7280").fontSize(10).text("Boleta de venta", titleX, 78);

    doc.moveDown(4);

    // Order details
    doc.fontSize(11).fillColor("#111827").text(`Pedido: ${orderId}`);
    doc.fontSize(11).text(`Fecha: ${orderDate}`);
    doc.fontSize(11).text(`Método de pago: ${paymentMethod}`);
    doc.fontSize(11).text(`Depósito: ${depositAmount}`);
    doc.moveDown(0.8);

    // Customer section
    doc.fontSize(12).fillColor("#111827").text("Cliente", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor("#111827").text(customerName);
    doc.fontSize(10).fillColor("#4b5563").text(`${customerPhone} • ${customerEmail}`);
    doc.moveDown(0.8);

    // Table header
    const tableTop = doc.y;
    doc.fontSize(10).fillColor("#6b7280");
    doc.text("Producto", 50, tableTop, { width: 240 });
    doc.text("Cant.", 290, tableTop, { width: 60, align: "right" });
    doc.text("Precio", 350, tableTop, { width: 90, align: "right" });
    doc.text("Total", 445, tableTop, { width: 90, align: "right" });
    doc.moveTo(50, tableTop + 16).lineTo(540, tableTop + 16).stroke("#e5e7eb");
    doc.moveDown(1);

    items.forEach((item, index) => {
      const name = item.productNameSnapshot || "Producto";
      const qty = item.quantity || 0;
      const price = formatMoney(item.unitPrice || 0);
      const subtotal = formatMoney(item.subtotal || qty * (item.unitPrice || 0));
      const rowY = doc.y;

      if (index > 0) {
        doc.moveTo(50, rowY - 4).lineTo(540, rowY - 4).strokeOpacity(0.1).stroke("#e5e7eb");
      }

      doc.fillColor("#111827").fontSize(10).text(name, 50, rowY, { width: 240 });
      doc.text(String(qty), 290, rowY, { width: 60, align: "right" });
      doc.text(price, 350, rowY, { width: 90, align: "right" });
      doc.text(subtotal, 445, rowY, { width: 90, align: "right" });
      doc.moveDown(0.8);
    });

    doc.moveTo(50, doc.y).lineTo(540, doc.y).stroke("#e5e7eb");
    doc.moveDown(0.8);

    // Totals box
    doc.rect(350, doc.y, 190, 70).fill("#f8fafc");
    doc.fillColor("#6b7280").fontSize(10).text("Total a pagar", 360, doc.y + 10);
    doc.fillColor("#111827").fontSize(16).text(totalAmount, 360, doc.y + 28);

    if (order.notes) {
      doc.moveDown(5);
      doc.fillColor("#111827").fontSize(12).text("Notas", { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#4b5563").text(order.notes, { width: 490 });
    }

    doc.end();
  });
}

async function fetchImageBuffer(imageUrl) {
  if (!imageUrl) return null;

  if (imageUrl.startsWith("data:")) {
    const [, meta, data] = imageUrl.match(/^data:(.*?);base64,(.*)$/) || [];
    if (!data) return null;
    return Buffer.from(data, "base64");
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch {
    return null;
  }
}

// Verificar transporter al iniciar para dar retroalimentación temprana.
transporter.verify().then(() => {
  console.log("SMTP: transporter verificado correctamente");
}).catch((err) => {
  console.warn("SMTP: no se pudo verificar el transporter. Revisa MAIL_USER/MAIL_PASS y la configuración SMTP. Mensaje:", err && err.message ? err.message : err);
});
