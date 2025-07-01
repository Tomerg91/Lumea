import { StatusMapping, UISessionStatus } from '@/types/session';
import { SessionStatus } from '@shared/types/database';

// Convert database status (e.g. "Upcoming") to UI-friendly slug (e.g. "pending")
export function toUIStatus(dbStatus: SessionStatus): UISessionStatus {
  // If mapping exists return, else fallback to lowercase copy for safety
  return (
    StatusMapping.toUI[dbStatus as keyof typeof StatusMapping.toUI] || (dbStatus.toLowerCase() as UISessionStatus)
  );
}

// Convert UI status back to database literal
export function toDBStatus(uiStatus: UISessionStatus): SessionStatus {
  return StatusMapping.toDatabase[uiStatus] as SessionStatus;
} 