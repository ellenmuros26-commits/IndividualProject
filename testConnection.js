import { sequelize } from "./models/db.js";

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("Buildora database connected successfully!");
  } catch (error) {
    console.error("Database connection failed:", error.message);
  } finally {
    await sequelize.close();
  }
}

testConnection();