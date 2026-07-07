import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const secret = process.env.WEBHOOK_SECRET;
if (!secret) {
  console.error("No WEBHOOK_SECRET in .env");
  process.exit(1);
}

const payload = {
  event_type: "orders.notification",
  order_id: `UBER-TEST-${Date.now()}`,
  estimated_ready_for_pickup_at: new Date(Date.now() + 30 * 60000).toISOString(),
  eater: {
    first_name: "Jhosept",
    last_name: "Prueba",
    phone: "+56912345678"
  },
  cart: {
    items: [
      {
        id: "item-1",
        title: "Torta de Prueba Uber",
        quantity: 2,
        price: {
          unit_price: { amount: 5000, currency_code: "CLP" }
        }
      }
    ]
  },
  special_instructions: "Por favor agregar extra servilletas"
};

const rawBody = JSON.stringify(payload);
const signature = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

console.log("Enviando webhook de prueba con firma válida...");

fetch("http://localhost:3000/api/webhook/uber-eats", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-uber-signature": signature
  },
  body: rawBody
})
.then(res => res.json().then(data => ({ status: res.status, data })))
.then(({ status, data }) => {
  console.log(`Respuesta del servidor: ${status}`);
  console.log(data);
})
.catch(console.error);
