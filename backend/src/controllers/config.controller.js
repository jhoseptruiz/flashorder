import SystemConfig from "../models/SystemConfig.js";

export async function getBusinessHours(req, res) {
  try {
    let config = await SystemConfig.findOne();
    if (!config) {
      config = await SystemConfig.create({
        businessHours: { openTime: "09:00", closeTime: "22:00", workDays: [1,2,3,4,5,6,0] }
      });
    }
    const defaultHours = { openTime: "09:00", closeTime: "22:00", workDays: [1,2,3,4,5,6,0] };
    res.json(config.businessHours || defaultHours);
  } catch (error) {
    console.error("[Config] Error getBusinessHours:", error);
    res.status(500).json({ error: "Error obteniendo horario" });
  }
}

export async function updateBusinessHours(req, res) {
  try {
    const { businessHours } = req.body;
    let config = await SystemConfig.findOne();
    if (!config) {
      config = await SystemConfig.create({ businessHours });
    } else {
      config.businessHours = businessHours;
      await config.save();
    }
    res.json({ message: "Horario actualizado", businessHours: config.businessHours });
  } catch (error) {
    console.error("[Config] Error updateBusinessHours:", error);
    res.status(500).json({ error: "Error actualizando horario" });
  }
}
