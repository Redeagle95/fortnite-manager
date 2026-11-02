# Battle Royale gameplay simulation

This module adds a turn-based Fortnite-inspired Battle Royale core and browser prototype to Fortnite Manager.

## Run the playable prototype
1. Run `npm ci` from the repository root.
2. Run `npm run dev`.
3. Open `http://localhost:3000` in your browser.

The browser client renders the tactical island map, storm circle, POI markers, spawn setup, location-specific decisions, estimated fight-win percentages, teammate states (active/knocked/eliminated), illustrated weapon and consumable inventory, materials and match event log. Original SVG item illustrations are stored in `client/assets/equipment.svg`.

## Current gameplay loop
1. Create a match with a seed, game mode and drop location.
2. Choose a spawn decision: fight, loot or rotate.
3. Make one strategic decision for every successive storm phase.
4. Resolve combat from player skill ratings, equipment, health, building and positioning.
5. Loot weapons, healing items, utility, ammunition and materials.
6. Refresh wood, stone and metal, heal teammates, rotate or hold a defensive position.
7. Revive a knocked teammate when at least one teammate remains active; a revived player returns with 30 health. If the whole squad is knocked, the team is eliminated.
8. End the match with a Victory Royale or an elimination and a placement.

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


## Five-zone match flow

The strategic match is split into five decisions:
1. **Spawn:** stay on the selected drop if contested (with an estimated fight percentage), loot safely, or choose another drop.
2. **Zone 2:** take a rotation fight or refresh materials. Wood, stone and metal are each capped at 500 and shown with separate progress bars.
3. **Zone 3:** rotate immediately, or take a fight before rotating.
4. **Zone 4:** fight on the rotation, move ahead of the storm, or refresh materials.
5. **Final zone:** choose height, mid, low or outside play. Estimated odds account for team ratings, active players, health/shield, weapon loadout, materials and the selected weapon/position synergy.

The storm map shows the current safe circle and a dashed preview of the next contraction. The circle visibly shrinks as each decision is completed. Bot squads receive randomized weapons and materials so their combat strength is not based on ratings alone.

Knockdowns and revives remain active throughout the match: a downed teammate can be revived to 30 health while at least one teammate remains active; if the whole squad is down, the team is eliminated.


## Advanced competitive gameplay

- Choose an IGL strategy before starting: prudent, aggressive, strategic or opportunistic. Bot squads receive their own strategy, influencing their rotations and willingness to fight.
- Squad roles (IGL, fragger, support and scout) and individual elimination/damage statistics are tracked.
- Focus-fire lets the user select a specific living opponent; teammates concentrate their attacks on that target and retarget after an elimination.
- Boxfights resolve individual attacks using weapon damage, aim, building skill, available materials, shotgun selection and the opponent's defensive build.
- Disengage moves the squad toward a safer location without initiating an optional fight on that decision.
- Healing automatically selects the player/item combination that restores the most missing health and shield without exceeding either 100-point cap.
- Combat and storm-surge damage and eliminations are attributed to individual teammates; the dashboard shows team totals and each player's personal statistics.
- Ground loot remains available for later pickup; when weapon slots are full, choose which weapon to replace.
- After the sixth contraction, the final safe zone moves continuously. Zone 7 remains active until only one squad is left.
- Match results award placement points plus two points per team elimination.


Additional mechanics in this branch: one reboot token per teammate slot (usable before the final zone), POI-specific ground loot, mid-game supply drops with improved rarity odds, and a six-game FNCS-style points series stored in the browser.

## Gameplay effects for team roles and IGL strategy

- **IGL:** decision-making adds tactical fight odds; leadership reduces the chance of a dangerous rotation and improves safe-route selection.
- **Fragger:** aim adds fight odds and team damage; bot teams with a Fragger are more willing to capitalize on encounters.
- **Support:** teamwork increases healing and revive health (up to 50 HP), and reduces the chance of teammate losses during fights.
- **Scout:** game sense improves weapon rarity rolls at loot locations and reduces rotation/ambush risk; bot Scouts value better loot locations.
- Role lineup follows squad size: Solo = IGL; Duo = IGL + Fragger; Trio adds Support; Squad adds Scout.
- The selected IGL strategy now also modifies the user's fight odds, damage and rotation risk. Bot teams retain their own independent strategies.
