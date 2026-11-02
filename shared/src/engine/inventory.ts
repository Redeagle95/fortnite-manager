
import type { WeaponType } from "./types";

export interface Weapon {
  id: string;
  type: WeaponType;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
  damage: number;
  magazineSize: number;
  ammo: number;
}

export interface Inventory {
  weapons: Weapon[];
  ammunition: Record<string, number>;
  healingItems: Record<string, number>;
  maxWeapons: number;
}

export function createInventory(): Inventory {
  return {
    weapons: [],
    ammunition: {},
    healingItems: {},
    maxWeapons: 5,
  };
}

export function addWeapon(
  inventory: Inventory,
  weapon: Weapon
): Inventory | null {
  if (inventory.weapons.length >= inventory.maxWeapons) {
    return null;
  }

  return {
    ...inventory,
    weapons: [...inventory.weapons, weapon],
  };
}

export function removeWeapon(
  inventory: Inventory,
  weaponId: string
): Inventory {
  return {
    ...inventory,
    weapons: inventory.weapons.filter(
      (weapon) => weapon.id !== weaponId
    ),
  };
}

export function addAmmo(
  inventory: Inventory,
  ammoType: string,
  amount: number
): Inventory {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("Quantité de munitions invalide.");
  }

  return {
    ...inventory,
    ammunition: {
      ...inventory.ammunition,
      [ammoType]:
        (inventory.ammunition[ammoType] ?? 0) + amount,
    },
  };
}

export function addHealingItem(
  inventory: Inventory,
  itemType: string,
  amount: number
): Inventory {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("Quantité d'objets invalide.");
  }

  return {
    ...inventory,
    healingItems: {
      ...inventory.healingItems,
      [itemType]:
        (inventory.healingItems[itemType] ?? 0) + amount,
    },
  };
}
