import { createDb } from "./client";
import { resolveDatabasePath } from "./database-path";
import { repairInstrumentClassificationHierarchy } from "./repair-instrument-classification-hierarchy";

const databasePath = resolveDatabasePath();

async function main() {
  let result: void = undefined;

  const { sqlite, db } = createDb(databasePath);
  const repaired = await repairInstrumentClassificationHierarchy(db);
  sqlite.close();

  console.log(
    `Repaired: ${databasePath} (${repaired.repairedInstrumentCount} instruments, ${repaired.movedTagCount} parent tags moved to child tags)`,
  );
  return result;
}

void main();
