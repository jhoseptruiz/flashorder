"use strict";
import sequelize from "../db/db.js";
import CashRegisterSession from "../models/CashRegisterSession.js";
import CashRegisterTransaction from "../models/CashRegisterTransaction.js";
import CustomerOrder from "../models/CustomerOrder.js";
import { createAuditLog } from "../helpers/audit.helper.js";

// ── Obtener sesión activa con saldo calculado ─────────────────────────────────
export async function getActiveSession() {
  const session = await CashRegisterSession.findOne({
    where: { status: "open" },
    include: [
      {
        model: CashRegisterTransaction,
        as: "Transactions",
        attributes: ["id", "type", "amount", "description", "date", "orderId"],
        include: [
          {
            model: CustomerOrder,
            attributes: ["paymentMethod"],
          },
        ],
      },
    ],
    order: [["openingDate", "DESC"]],
  });

  if (!session) return null;

  // Calcular saldo actual
  const currentCash = calculateCurrentCash(session);

  return {
    ...session.get({ plain: true }),
    currentCash,
  };
}

// ── Calcular efectivo actual en caja ──────────────────────────────────────────
function calculateCurrentCash(session) {
  const plain = session.get ? session.get({ plain: true }) : session;
  let cash = Number(plain.openingCash) || 0;

  if (plain.Transactions && Array.isArray(plain.Transactions)) {
    for (const tx of plain.Transactions) {
      const paymentMethod = tx.CustomerOrder?.paymentMethod || "efectivo";
      if (paymentMethod === "efectivo") {
        const amount = Number(tx.amount) || 0;
        if (tx.type === "income") {
          cash += amount;
        } else if (tx.type === "expense") {
          cash -= amount;
        }
      }
    }
  }

  return cash;
}

// ── Calcular desglose de ventas por método de pago ───────────────────────────
function calculatePaymentBreakdown(session) {
  const plain = session.get ? session.get({ plain: true }) : session;
  let efectivo = 0;
  let transferencia = 0;
  let tarjeta = 0;

  if (plain.Transactions && Array.isArray(plain.Transactions)) {
    for (const tx of plain.Transactions) {
      const paymentMethod = tx.CustomerOrder?.paymentMethod || "efectivo";
      const amount = Number(tx.amount) || 0;
      
      if (tx.type === "income") {
        if (paymentMethod === "efectivo") {
          efectivo += amount;
        } else if (paymentMethod === "transferencia") {
          transferencia += amount;
        } else if (paymentMethod === "tarjeta") {
          tarjeta += amount;
        }
      } else if (tx.type === "expense") {
        if (paymentMethod === "efectivo") {
          efectivo -= amount;
        }
      }
    }
  }

  return {
    efectivo,
    transferencia,
    tarjeta,
    totalSales: efectivo + transferencia + tarjeta,
  };
}

// ── Abrir caja ────────────────────────────────────────────────────────────────
export async function openSession(userRut, openingCash) {
  // Validar que no haya otra sesión abierta
  const existing = await CashRegisterSession.findOne({
    where: { status: "open" },
  });

  if (existing) {
    throw new Error("Ya existe una sesión de caja abierta. Ciérrala antes de abrir una nueva.");
  }

  if (openingCash < 0) {
    throw new Error("El monto de apertura no puede ser negativo.");
  }

  const session = await CashRegisterSession.create({
    openedByRut: userRut,
    openingCash: openingCash || 0,
    openingDate: new Date(),
    status: "open",
  });

  // Registrar auditoría
  await createAuditLog(
    userRut,
    "OPEN_REGISTER",
    "cash_register_sessions",
    session.id,
    null,
    { openingCash, status: "open" }
  );

  // Retornar con estructura completa
  return {
    ...session.get({ plain: true }),
    Transactions: [],
    currentCash: Number(openingCash) || 0,
  };
}

// ── Cerrar caja ───────────────────────────────────────────────────────────────
export async function closeSession(userRut, sessionId, closingCash, notes) {
  const transaction = await sequelize.transaction();

  try {
    const session = await CashRegisterSession.findByPk(sessionId, {
      include: [
        {
          model: CashRegisterTransaction,
          as: "Transactions",
          include: [
            {
              model: CustomerOrder,
              attributes: ["paymentMethod"],
            },
          ],
        },
      ],
      transaction,
    });

    if (!session) {
      throw new Error("Sesión de caja no encontrada.");
    }

    if (session.status === "closed") {
      throw new Error("Esta sesión de caja ya está cerrada.");
    }

    // Calcular efectivo esperado
    const expectedCash = calculateCurrentCash(session);
    const difference = Number(closingCash) - expectedCash;

    // Actualizar sesión
    session.status = "closed";
    session.closingDate = new Date();
    session.closedByRut = userRut;
    session.closingCash = closingCash;
    session.expectedCash = expectedCash;
    session.difference = difference;
    session.notes = notes || null;
    await session.save({ transaction });

    await transaction.commit();

    // Registrar auditoría
    await createAuditLog(
      userRut,
      "CLOSE_REGISTER",
      "cash_register_sessions",
      session.id,
      { status: "open" },
      {
        status: "closed",
        expectedCash,
        closingCash,
        difference,
      }
    );

    const breakdown = calculatePaymentBreakdown(session);

    return {
      ...session.get({ plain: true }),
      expectedCash,
      difference,
      breakdown,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// ── Registrar transacción ─────────────────────────────────────────────────────
export async function registerTransaction(sessionId, type, amount, description, orderId = null) {
  if (!["income", "expense"].includes(type)) {
    throw new Error("Tipo de transacción inválido. Debe ser 'income' o 'expense'.");
  }

  if (amount <= 0) {
    throw new Error("El monto de la transacción debe ser mayor a 0.");
  }

  const session = await CashRegisterSession.findByPk(sessionId);
  if (!session || session.status !== "open") {
    throw new Error("No hay una sesión de caja abierta para registrar la transacción.");
  }

  const tx = await CashRegisterTransaction.create({
    sessionId,
    type,
    amount,
    description: description || null,
    orderId: orderId || null,
    date: new Date(),
  });

  return tx;
}

// ── Obtener detalles de una sesión específica con desglose ───────────────────
export async function getSessionDetails(sessionId) {
  const session = await CashRegisterSession.findByPk(sessionId, {
    include: [
      {
        model: CashRegisterTransaction,
        as: "Transactions",
        attributes: ["id", "type", "amount", "description", "date", "orderId"],
        include: [
          {
            model: CustomerOrder,
            attributes: ["paymentMethod"],
          },
        ],
      },
    ],
  });

  if (!session) return null;

  const expectedCash = calculateCurrentCash(session);
  const breakdown = calculatePaymentBreakdown(session);

  return {
    ...session.get({ plain: true }),
    expectedCash,
    breakdown,
  };
}
