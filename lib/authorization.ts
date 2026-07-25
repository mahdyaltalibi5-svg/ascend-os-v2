export function hasPermission(userPermissions: string[], requiredPermission: string) {
  return userPermissions.includes(requiredPermission);
}

export function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]) {
  return requiredPermissions.some((permission) => hasPermission(userPermissions, permission));
}

export function isResourceOwnedByOrganization(
  resourceOrganizationId: string,
  activeOrganizationId: string
) {
  return resourceOrganizationId === activeOrganizationId;
}

export function validateActiveOrganizationSelection(
  membershipOrganizationIds: string[],
  requestedOrganizationId?: string | null
) {
  if (requestedOrganizationId && membershipOrganizationIds.includes(requestedOrganizationId)) {
    return requestedOrganizationId;
  }

  return membershipOrganizationIds[0] ?? null;
}
