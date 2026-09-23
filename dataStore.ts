/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppUser, Ministry, Schedule, Assignment, Song, AppNotification } from './types';

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'user-admin',
    name: 'Desenvolvedor',
    email: 'admin@igreja.com',
    role: 'admin',
    ministryIds: [],
    joinedAt: '2026-01-01T12:00:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
  },
];

export const DEFAULT_MINISTRIES: Ministry[] = [
  {
    id: 'min-louvor',
    name: 'Louvor & Adoração',
    description: 'Banda, vocais, instrumentistas e repertório musical dos cultos.',
    leaderId: '',
    rolesInMinistry: ['Ministro de Louvor', 'Vocal', 'Guitarra', 'Baixo', 'Bateria', 'Teclado', 'Violão'],
    createdAt: '2026-01-10T09:30:00Z',
  },
  {
    id: 'min-midia',
    name: 'Mídia & Projeção',
    description: 'Transmissão, câmera, projeção de letras e corte.',
    leaderId: '',
    rolesInMinistry: ['Operador de Câmera', 'Projeção de Slides', 'Transmissão ao Vivo', 'Corte de Vídeo'],
    createdAt: '2026-01-15T15:00:00Z',
  },
  {
    id: 'min-recepcao',
    name: 'Recepção, Acolhimento & Ordem',
    description: 'Boas-vindas, entrega de avisos, portaria e organização dos assentos.',
    leaderId: '',
    rolesInMinistry: ['Recepcionista', 'Portaria', 'Acolhimento', 'Entrega de Boletim'],
    createdAt: '2026-02-01T10:00:00Z',
  }
];

export const DEFAULT_SCHEDULES: Schedule[] = [
  {
    id: 'sch-culto-domingo',
    title: 'Culto de Celebração - Domingo',
    description: 'Culto Geral da família com ceia do Senhor.',
    ministryId: 'min-louvor',
    eventDate: '2026-05-31T18:00:00Z',
    isRecurring: true,
    recurrencePattern: 'weekly',
    status: 'published',
    createdAt: '2026-05-20T10:00:00Z',
  },
  {
    id: 'sch-culto-domingo-midia',
    title: 'Culto de Celebração - Domingo (Transmissão & Slides)',
    description: 'Operação de câmera e projeção de letras integradas.',
    ministryId: 'min-midia',
    eventDate: '2026-05-31T18:00:00Z',
    isRecurring: true,
    recurrencePattern: 'weekly',
    status: 'published',
    createdAt: '2026-05-20T10:15:00Z',
  },
  {
    id: 'sch-culto-domingo-recep',
    title: 'Culto de Celebração - Portas e Acolhimento',
    description: 'Recepção na entrada principal e entrega de boletins informativos.',
    ministryId: 'min-recepcao',
    eventDate: '2026-05-31T18:00:00Z',
    isRecurring: true,
    recurrencePattern: 'weekly',
    status: 'published',
    createdAt: '2026-05-20T10:20:00Z',
  },
];

export const DEFAULT_SONGS: Song[] = [
  {
    id: 'song-1',
    scheduleId: 'sch-culto-domingo',
    title: 'Porque Ele Vive',
    artist: 'Harpa Cristã',
    linkLetras: 'https://www.letras.mus.br/pesquisar/Porque%20Ele%20Vive%20Harpa%20Crist%C3%A3/',
    linkCifra: 'https://www.cifraclub.com.br/pesquisar/?q=Porque%20Ele%20Vive%20Harpa%20Crist%C3%A3',
    createdAt: '2026-05-20T10:30:00Z',
  },
  {
    id: 'song-2',
    scheduleId: 'sch-culto-domingo',
    title: 'A Casa É Sua',
    artist: 'Casa Worship',
    linkLetras: 'https://www.letras.mus.br/pesquisar/A%20Casa%20%C3%89%20Sua%20Casa%20Worship/',
    linkCifra: 'https://www.cifraclub.com.br/pesquisar/?q=A%20Casa%20%C3%89%20Sua%20Casa%20Worship',
    createdAt: '2026-05-20T10:31:00Z',
  },
  {
    id: 'song-3',
    scheduleId: 'sch-culto-domingo',
    title: 'O Escudo',
    artist: 'Voz da Verdade',
    linkLetras: 'https://www.letras.mus.br/pesquisar/O%20Escudo%20Voz%20da%20Verdade/',
    linkCifra: 'https://www.cifraclub.com.br/pesquisar/?q=O%20Escudo%20Voz%20da%20Verdade',
    createdAt: '2026-05-20T10:32:00Z',
  }
];

export const DEFAULT_ASSIGNMENTS: Assignment[] = [];
export const DEFAULT_NOTIFICATIONS: AppNotification[] = [];

export function generateMusicLinks(title: string, artist: string) {
  const q = encodeURIComponent(`${title} ${artist}`);

  // Slug format: lowercase, accents removed, spaces → hyphens, special chars removed
  const toSlug = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9\s-]/g, '')    // remove special chars
      .trim()
      .replace(/\s+/g, '-');           // spaces to hyphens

  const artistSlug = toSlug(artist);
  const titleSlug = toSlug(title);

  return {
    linkLetras: `https://www.letras.mus.br/${artistSlug}/${titleSlug}/`,
    linkCifra: `https://www.cifraclub.com.br/${artistSlug}/${titleSlug}/`,
    linkYoutube: `https://www.youtube.com/results?search_query=${q}`,
    linkSpotify: `https://open.spotify.com/search/${q}`,
    linkDeezer: `https://www.deezer.com/search/${q}`,
    linkAmazon: `https://music.amazon.com/search?keywords=${q}`,
  };
}

export function getStoredData<T>(key: string, initialData: T): T {
  try {
    const raw = localStorage.getItem(`ig_escala_${key}`);
    if (raw) return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
  }
  return initialData;
}

export function setStoredData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`ig_escala_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
}
