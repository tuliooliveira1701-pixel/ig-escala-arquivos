/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'leader' | 'volunteer';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  ministryIds?: string[]; // Multiple ministries supported
  ministryId?: string;    // Legacy single ministry (kept for compat)
  joinedAt: string;
  avatarUrl?: string;
  fcmToken?: string;
  onesignalPlayerId?: string;
}

export interface Ministry {
  id: string;
  name: string;
  description: string;
  leaderId?: string;
  rolesInMinistry?: string[]; // Subfunctions/roles inside this ministry
  createdAt: string;
}

export interface Schedule {
  id: string;
  title: string;
  description: string;
  ministryId: string;
  eventDate: string;
  endRecurringDate?: string;
  isRecurring: boolean;
  recurrencePattern: 'weekly' | 'biweekly' | 'monthly' | 'none';
  status: 'draft' | 'published';
  createdAt: string;
}

export interface Assignment {
  id: string;
  scheduleId: string;
  volunteerId: string;
  roleInMinistry: string;
  status: 'pending' | 'confirmed' | 'declined' | 'unavailable';
  justification?: string;   // Justification for decline/unavailability/swap
  swapRequestedWith?: string; // volunteerId of swap request target
  notifiedAt?: string;
  createdAt: string;
}

export interface Song {
  id: string;
  scheduleId: string;
  title: string;
  artist: string;
  key?: string;
  linkLetras: string;
  linkCifra: string;
  linkYoutube?: string;
  linkSpotify?: string;
  linkDeezer?: string;
  linkAmazon?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'new_schedule' | 'reminder_24h' | 'reminder_2h' | 'system';
  scheduleId?: string;
  sentAt: string;
  isRead: boolean;
}
