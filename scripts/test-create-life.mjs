import { createNewLife } from "../src/lib/game/engine.ts";

try {
  const life = await createNewLife();
  console.log("SUCCESS", life.id, life.profile.name, life.profile.era);
  console.log("ui", JSON.stringify(life.events[0]?.ui, null, 2));
  console.log("bond types", life.state.relationships.map((r) => typeof r.bond));
} catch (e) {
  console.error("FAIL", e instanceof Error ? e.message : e);
  process.exitCode = 1;
}
