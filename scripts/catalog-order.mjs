export function compareAbilities(first, second) {
  return first.nombre.localeCompare(second.nombre, "es", { sensitivity: "base" }) || first.id - second.id;
}

export function machineNumber(itemName) {
  const match = /^tm(\d+)$/i.exec(itemName);
  return match ? Number(match[1]) : null;
}

export async function resolveMachineNumber(move, versionGroup, request) {
  const entry = move.machines.find((machine) => machine.version_group.name === versionGroup);
  if (!entry) return null;
  const machine = await request(entry.machine.url);
  return machineNumber(machine.item.name);
}

export function compareMoves(first, second) {
  const firstNumber = first.machineNumber ?? Infinity;
  const secondNumber = second.machineNumber ?? Infinity;
  if (firstNumber !== secondNumber) return firstNumber < secondNumber ? -1 : 1;
  return first.id - second.id;
}