import "dotenv/config";

import { app } from "./app.js";
import { checkDatabaseConnection } from "./db/pool.js";

const port = Number(process.env.PORT ?? 3000);

async function start() {
  try {
    await checkDatabaseConnection();

    app.listen(port, () => {
      console.log(`API listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to database", error);
    process.exit(1);
  }
}

start();
