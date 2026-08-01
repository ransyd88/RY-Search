const activeUsers = new Set<string>();

export function beginGeneration(userId: string) {
  if (activeUsers.has(userId)) return false;
  activeUsers.add(userId);
  return true;
}

export function endGeneration(userId: string) {
  activeUsers.delete(userId);
}
