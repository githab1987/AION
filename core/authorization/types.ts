export type ActorType =
  | "USER"
  | "SYSTEM"
  | "SERVICE"
  | "WORKER";

export type AuthenticationMethod =
  | "SUPABASE_AUTH"
  | "SERVICE_ROLE"
  | "SYSTEM"
  | "INTERNAL_WORKER";

export interface RequestIdentity {
  userId: string;
  tenantId: string;
  workspaceId: string;
  actorType: ActorType;
  authenticationMethod: AuthenticationMethod;
  requestId: string;
  sessionId?: string;
}

export interface AuthorizationContext {
  identity: RequestIdentity;
  roles: string[];
  permissions: string[];
}
