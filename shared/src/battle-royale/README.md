# Battle Royale gameplay simulation

This module adds a turn-based Fortnite-inspired Battle Royale core to Fortnite Manager.

## Current gameplay loop
1. Create a match with a seed, game mode and drop location.
2. Choose a spawn decision: fight, loot or rotate.
3. Make one strategic decision for every successive storm phase.
4. Resolve combat from player skill ratings, equipment, health, building and positioning.
5. Loot weapons, healing items, utility, ammunition and materials.
6. Refresh wood, stone and metal, heal teammates, rotate or hold a defensive position.
7. End the match with a Victory Royale or an elimination and a placement.

## Example
```ts
import { createBattleRoyale, resolveDrop, takeZoneAction } from "./battle-royale";

let match = createBattleRoyale(20261102, "TRIO", "tilted-district");
match = resolveDrop(match, { type: "LOOT" });
match = takeZoneAction(match, { type: "REFRESH" });
match = takeZoneAction(match, { type: "ROTATE", locationId: "crown-hill" });
```

The simulation is deterministic for a given seed and sequence of actions. You can pass one overall rating per teammate as the fifth argument to `createBattleRoyale`; each rating must be between 0 and 100.

## Socket.IO events
The server registers these events:
- `battle:create`: `{ seed, mode, dropLocationId, playerRatings? }`
- `battle:drop`: `{ matchId, action: "FIGHT" | "LOOT" | "ROTATE", locationId? }`
- `battle:action`: `{ matchId, action }`
- `battle:get`: `{ matchId }`
- Server replies with `battle:state` or `battle:error`.

Matches currently live in server memory and are cleared when the server restarts. Add a persistent store before using this for production multiplayer.

The simulation map and loot tables are original placeholders designed for gameplay prototyping, not copied Fortnite assets or official Epic Games data.
