
import { sequelize } from "./models/db.js";
import { Role } from "./models/associations.js";

async function testRoles() {
  try {
    await sequelize.authenticate();
    console.log("Database connected!");

    const roles = await Role.findAll({
      attributes: ["id", "role_name", "description"],
      order: [["id", "ASC"]]
    });

    console.table(roles.map(role => role.get({ plain: true })));
    console.log("Total roles:", roles.length);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await sequelize.close();
  }
}

testRoles();
