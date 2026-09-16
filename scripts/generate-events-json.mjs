// Regenerates src/data/events.json from the flat JSON files in
// src/content/events/. Runs before every dev/build (see package.json's
// predev/prebuild scripts) so eventUtils.ts can keep importing a plain
// static JSON array.
import { regenerateEventsJson } from './eventsStore.ts'

const count = await regenerateEventsJson()
console.log(`Wrote ${count} event(s) to src/data/events.json`)
