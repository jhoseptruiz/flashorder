import { Op } from "sequelize";
import CustomerOrder from "../models/CustomerOrder.js";
import Customer from "../models/Customer.js";
import OrderItem from "../models/OrderItem.js";
import ProductVariant from "../models/ProductVariant.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import sequelize from "../db/db.js";

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

export async function getInvoices({ startDate, endDate, search, sortDirection = "DESC" }) {
  const where = {};
  if (startDate && endDate) {
    where.orderDate = {
      [Op.between]: [new Date(startDate), new Date(endDate)],
    };
  }

  const orders = await CustomerOrder.findAll({
    where,
    include: [
      {
        model: Customer,
        attributes: ["fullName", "phone", "email"],
      },
      {
        model: OrderItem,
        attributes: ["id", "quantity", "unitPrice", "subtotal", "productNameSnapshot", "groupId"],
        include: [
          {
            model: ProductVariant,
            attributes: ["variantName", "price"],
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["name"],
                include: [
                  {
                    model: Category,
                    attributes: ["name"],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  const searchLower = normalizeText(search);
  const filtered = orders.filter((order) => {
    if (!searchLower) return true;

    const customerName = normalizeText(order.Customer?.fullName);
    if (customerName.includes(searchLower)) return true;

    const matchesItem = Array.isArray(order.OrderItems) && order.OrderItems.some((item) => {
      const itemName = normalizeText(item.productNameSnapshot);
      if (itemName.includes(searchLower)) return true;

      const variantName = normalizeText(item.ProductVariant?.variantName);
      if (variantName.includes(searchLower)) return true;

      const productName = normalizeText(item.ProductVariant?.product?.name);
      if (productName.includes(searchLower)) return true;

      const categoryName = normalizeText(item.ProductVariant?.product?.Category?.name);
      if (categoryName.includes(searchLower)) return true;

      return false;
    });

    return matchesItem;
  });

  const sorted = filtered.sort((a, b) => {
    const dateA = new Date(a.orderDate).getTime();
    const dateB = new Date(b.orderDate).getTime();
    return sortDirection.toUpperCase() === "ASC" ? dateA - dateB : dateB - dateA;
  });

  return sorted;
}
