/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Calendar, UserCheck, Check, X, Clock, Music, AlignLeft,
  Youtube, Headphones, Mic2, AlertTriangle,
  ArrowLeftRight, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Users
} from 'lucide-react';
import { AppUser, Ministry, Schedule, Assignment, Song } from '../types';
import { generateMusicLinks } from '../dataStore';

interface VolunteerPanelProps {
  currentUser: AppUser;
  users: AppUser[];
  ministries: Ministry[];
  schedules: Schedule[];
  assignments: Assignment[];
  songs: Song[];
  onConfirmAssignment: (id: string, status: Assignment['status'], justification?: string) => void;
}

// Music link config
const MUSIC_LINKS = [
  { key: 'linkLetras',  label: 'Letras',   bg: 'bg-[#FACC15] hover:bg-[#E2B709]', text: 'text-[#78350F]', icon: <AlignLeft className="w-2.5 h-2.5" /> },
  { key: 'linkCifra',   label: 'Cifras',   bg: 'bg-[#FB923C] hover:bg-[#EA580C]', text: 'text-white',     icon: <Mic2 className="w-2.5 h-2.5" /> },
  { key: 'linkYoutube', label: 'YouTube',  bg: 'bg-[#FF0000] hover:bg-[#CC0000]', text: 'text-white',     icon: <Youtube className="w-2.5 h-2.5" /> },
  { key: 'linkSpotify', label: 'Spotify',  bg: 'bg-[#1DB954] hover:bg-[#17a348]', text: 'text-white',     icon: <Headphones className="w-2.5 h-2.5" /> },
  { key: 'linkDeezer',  label: 'Deezer',   bg: 'bg-[#A238FF] hover:bg-[#8A2BE2]', text: 'text-white',     icon: <Headphones className="w-2.5 h-2.5" /> },
  { key: 'linkAmazon',  label: 'Amazon',   bg: 'bg-[#3D12B4] hover:bg-[#2e0d8a]', text: 'text-white',     icon: <Headphones className="w-2.5 h-2.5" /> },
];

type SongWithLinks = Song & { linkYoutube?: string; linkSpotify?: string; linkDeezer?: string; linkAmazon?: string; };

export default function VolunteerPanel({
  currentUser,
  users,
  ministries,
  schedules,
  assignments,
  songs,
  onConfirmAssignment,
}: VolunteerPanelProps) {
  const [filterType, setFilterType] = useState<'my_scales' | 'all_scales'>('my_scales');
  // Calendar month currently shown in "Ver Todas" view
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  // Selected day (YYYY-MM-DD) in "Ver Todas" calendar view
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  // Justification modal state
  const [justifModal, setJustifModal] = useState<{ assignmentId: string; action: 'declined' | 'unavailable' } | null>(null);
  const [justifText, setJustifText] = useState('');
  // Expanded song list per schedule
  const [expandedSongs, setExpandedSongs] = useState<Set<string>>(new Set());

  const myAssignments = assignments.filter(a => a.volunteerId === currentUser.id);
  const myAssignedScheduleIds = myAssignments.map(a => a.scheduleId);

  const filteredSchedules = schedules.filter(sch => {
    const isPublished = sch.status === 'published';
    if (!isPublished) return myAssignedScheduleIds.includes(sch.id);
    if (filterType === 'my_scales') return myAssignedScheduleIds.includes(sch.id);
    return true;
  });

  // Considera "futura" a partir do início do dia de hoje (não some no mesmo dia do evento)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const isFutureOrToday = (sch: Schedule) => new Date(sch.eventDate) >= startOfToday;

  // Cards da tela inicial ("Minhas Escalas"): só futuras.
  // O calendário ("Ver Todas") continua usando filteredSchedules, com o histórico completo.
  const cardSchedules = filterType === 'all_scales'
    ? filteredSchedules
    : filteredSchedules.filter(isFutureOrToday);

  // Local YYYY-MM-DD key (avoids UTC/timezone shifting the day)
  const dateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Group schedules by local day key, for the monthly calendar view
  const groupByDate = (schs: Schedule[]) => {
    const map = new Map<string, Schedule[]>();
    schs.forEach(s => {
      const key = dateKey(new Date(s.eventDate));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  };

  const getMinistryDetails = (ministryId: string) => ministries.find(m => m.id === ministryId);
  const getAssignmentForSchedule = (scheduleId: string) => myAssignments.find(a => a.scheduleId === scheduleId);

  const getDayAndMonth = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return {
        day: d.getDate().toString().padStart(2, '0'),
        month: d.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''),
        weekday: d.toLocaleString('pt-BR', { weekday: 'long' }),
        time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        fullDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      };
    } catch {
      return { day: '00', month: '---', weekday: '---', time: '00:00', fullDate: '---' };
    }
  };

  // Find Louvor ministry by name (not hardcoded ID)
  const louvorMinistryIds = ministries
    .filter(m => m.name.toLowerCase().includes('louvor') || m.name.toLowerCase().includes('worship') || m.name.toLowerCase().includes('música') || m.name.toLowerCase().includes('musica'))
    .map(m => m.id);

  const isLouvorSchedule = (ministryId: string) =>
    louvorMinistryIds.includes(ministryId) || louvorMinistryIds.length === 0;

  const getLouvorScheduleIdsForDate = (eventDate: string) => {
    const day = new Date(eventDate).toLocaleDateString();
    return schedules
      .filter(s => isLouvorSchedule(s.ministryId) && new Date(s.eventDate).toLocaleDateString() === day)
      .map(s => s.id);
  };

  const getSongsForSchedule = (scheduleId: string): SongWithLinks[] => {
    const sch = schedules.find(s => s.id === scheduleId);
    if (!sch) return [];
    let rawSongs: Song[] = [];

    if (isLouvorSchedule(sch.ministryId)) {
      // Louvor: show its own songs
      rawSongs = songs.filter(s => s.scheduleId === scheduleId);
    } else {
      // All other ministries: show Louvor songs from the same date
      const louvorIds = getLouvorScheduleIdsForDate(sch.eventDate);
      rawSongs = songs.filter(s => louvorIds.includes(s.scheduleId));
    }

    // Always include any songs directly linked to this schedule too
    const directSongs = songs.filter(s => s.scheduleId === scheduleId);
    const allIds = new Set(rawSongs.map(s => s.id));
    directSongs.forEach(s => { if (!allIds.has(s.id)) rawSongs.push(s); });

    return rawSongs.map(s => ({ ...s, ...generateMusicLinks(s.title, s.artist) }));
  };

  const renderMusicLinks = (song: SongWithLinks) => {
    const freshLinks = generateMusicLinks(song.title, song.artist);
    return (
    <div className="flex flex-wrap gap-1 mt-1">
      {MUSIC_LINKS.map(({ key, label, bg, text, icon }) => {
        const url = (freshLinks as any)[key] as string | undefined;
        if (!url) return null;
        return (
          <a key={key} href={url} target="_blank" rel="noreferrer"
            className={`inline-flex items-center gap-1 ${bg} ${text} px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer`}>
            {icon}{label}
          </a>
        );
      })}
    </div>
  );
  };

  const handleJustifSubmit = () => {
    if (!justifModal) return;
    onConfirmAssignment(justifModal.assignmentId, justifModal.action, justifText.trim() || undefined);
    setJustifModal(null);
    setJustifText('');
  };

  const toggleSongs = (scheduleId: string) => {
    setExpandedSongs(prev => {
      const next = new Set(prev);
      next.has(scheduleId) ? next.delete(scheduleId) : next.add(scheduleId);
      return next;
    });
  };

  // For "all_scales" group by day (used to mark days on the calendar)
  const schedulesByDay = filterType === 'all_scales' ? groupByDate(filteredSchedules) : null;

  // Build the visible calendar grid for the current month
  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const firstWeekday = new Date(calendarYear, calendarMonthIndex, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const calendarCells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(calendarYear, calendarMonthIndex, i + 1)),
  ];
  const calendarMonthLabel = calendarMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const todayKey = dateKey(new Date());

  const goToPrevMonth = () => setCalendarMonth(new Date(calendarYear, calendarMonthIndex - 1, 1));
  const goToNextMonth = () => setCalendarMonth(new Date(calendarYear, calendarMonthIndex + 1, 1));

  const selectedDaySchedules = selectedDay ? (schedulesByDay?.get(selectedDay) || []) : [];
  const selectedDayLabel = selectedDay
    ? new Date(`${selectedDay}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    : '';

  const renderAssignmentActions = (assigned: Assignment) => {
    if (assigned.status === 'pending') {
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <button onClick={() => onConfirmAssignment(assigned.id, 'confirmed')}
              className="py-1.5 bg-natural-primary hover:bg-[#3D4D3F] text-white rounded-xl flex items-center justify-center gap-1.5 cursor-pointer">
              <Check className="w-3.5 h-3.5" /> Confirmar
            </button>
            <button onClick={() => setJustifModal({ assignmentId: assigned.id, action: 'declined' })}
              className="py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl flex items-center justify-center gap-1.5 border border-rose-100 cursor-pointer">
              <X className="w-3.5 h-3.5" /> Recusar
            </button>
          </div>
          <button onClick={() => setJustifModal({ assignmentId: assigned.id, action: 'unavailable' })}
            className="w-full py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl flex items-center justify-center gap-1.5 border border-amber-100 text-xs font-semibold cursor-pointer">
            <AlertTriangle className="w-3.5 h-3.5" /> Declarar Indisponibilidade
          </button>
        </div>
      );
    }

    const statusConfig = {
      confirmed: { bg: 'bg-natural-sidebar border-natural-border', text: 'text-natural-primary', icon: <Check className="w-4 h-4" />, label: 'Confirmado' },
      declined: { bg: 'bg-rose-50 border-rose-100', text: 'text-rose-700', icon: <X className="w-4 h-4" />, label: 'Recusado' },
      unavailable: { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700', icon: <AlertTriangle className="w-4 h-4" />, label: 'Indisponível' },
    };
    const cfg = statusConfig[assigned.status as keyof typeof statusConfig];

    return (
      <div className="space-y-1.5">
        <div className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold ${cfg?.bg} ${cfg?.text}`}>
          {cfg?.icon}
          <span>{cfg?.label}</span>
          <button onClick={() => onConfirmAssignment(assigned.id, 'pending')}
            className="text-[10px] text-natural-orange hover:underline font-semibold ml-3 cursor-pointer">Alterar</button>
        </div>
        {assigned.status !== 'confirmed' && (
          <button onClick={() => setJustifModal({ assignmentId: assigned.id, action: assigned.status === 'unavailable' ? 'unavailable' : 'declined' })}
            className="w-full py-1 text-[10px] text-[#8E8A82] hover:text-natural-primary border border-natural-border rounded-lg flex items-center justify-center gap-1 cursor-pointer">
            <ArrowLeftRight className="w-3 h-3" />
            {assigned.justification ? 'Editar justificativa' : 'Adicionar justificativa'}
          </button>
        )}
        {assigned.justification && (
          <p className="text-[10px] text-[#8E8A82] bg-natural-light border border-natural-border rounded-lg px-2 py-1 italic">"{assigned.justification}"</p>
        )}
      </div>
    );
  };

  const renderScheduleCard = (sch: Schedule) => {
    const dateInfo = getDayAndMonth(sch.eventDate);
    const assigned = getAssignmentForSchedule(sch.id);
    const isMyScale = !!assigned;
    const minDetails = getMinistryDetails(sch.ministryId);
    const linkedSongs = getSongsForSchedule(sch.id);
    const showSongs = expandedSongs.has(sch.id);
    const scheduleAssignments = assignments.filter(a => a.scheduleId === sch.id);
    const assignedUsers = scheduleAssignments.map(a => {
      const u = users.find(user => user.id === a.volunteerId);
      return { user: u, role: a.roleInMinistry, status: a.status };
    }).filter(item => item.user !== undefined);

    return (
      <div key={sch.id}
        className={`bg-white border rounded-3xl p-5 shadow-sm hover:shadow transition-all space-y-4 flex flex-col ${
          isMyScale && assigned.status === 'confirmed' ? 'ring-2 ring-natural-primary/15 border-natural-primary' : 'border-natural-border hover:border-natural-orange'
        }`}>

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="bg-natural-sidebar rounded-2xl p-2 h-12 w-11 flex flex-col items-center justify-center text-natural-primary shrink-0">
            <span className="text-xs font-extrabold tracking-tight leading-none">{dateInfo.day}</span>
            <span className="text-[8px] uppercase font-bold text-[#8E8A82] mt-1 leading-none">{dateInfo.month}</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-natural-orange uppercase tracking-wider block">
              {minDetails?.name || 'Ministério Geral'}
            </span>
            <h4 className="font-extrabold text-slate-900 text-sm mt-0.5 leading-tight truncate">{sch.title}</h4>
            <span className="text-[10.5px] text-[#8E8A82] font-mono">Início: {dateInfo.time}</span>
          </div>
          {isMyScale && (
            <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
              assigned.status === 'confirmed' ? 'bg-natural-sidebar text-natural-primary border-natural-border'
              : assigned.status === 'declined' ? 'bg-rose-50 text-rose-700 border-rose-100'
              : assigned.status === 'unavailable' ? 'bg-amber-50 text-amber-700 border-amber-100'
              : 'bg-yellow-50 text-yellow-700 border-yellow-100'
            }`}>
              {assigned.status === 'confirmed' ? '✓ Confirmado' : assigned.status === 'declined' ? '✗ Recusado' : assigned.status === 'unavailable' ? '⚠ Indisponível' : '⏳ Pendente'}
            </span>
          )}
        </div>

        {/* Description */}
        {sch.description && (
          <p className="bg-natural-light p-2.5 rounded-xl text-natural-text text-[11px] leading-relaxed border border-natural-border">
            {sch.description}
          </p>
        )}

        {/* My assignment actions */}
        {isMyScale ? (
          <div className="border-t border-natural-border pt-3 space-y-2">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-natural-text font-medium">Sua função:</span>
              <strong className="text-white font-bold bg-natural-primary px-2 py-0.5 rounded text-[10px]">{assigned.roleInMinistry}</strong>
            </div>
            {renderAssignmentActions(assigned)}
          </div>
        ) : filterType === 'all_scales' ? (
          <div className="bg-natural-sidebar p-2 text-center rounded-xl text-[11px] text-[#8E8A82] font-semibold border border-natural-border">
            Não escalado neste evento
          </div>
        ) : null}

        {/* Team list */}
        {assignedUsers.length > 0 && (
          <div className="border-t border-natural-border pt-3 space-y-2">
            <span className="text-[9px] font-bold text-[#8E8A82] uppercase tracking-wider block">
              <Users className="inline w-3 h-3 mr-1" />Equipe ({assignedUsers.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {assignedUsers.map((item, index) => (
                <div key={index}
                  className="flex items-center gap-1.5 bg-natural-sidebar/50 px-2 py-1 rounded-full text-[10px] font-medium text-slate-800 border border-natural-border"
                  title={`${item.user?.name} - ${item.role} (${item.status})`}>
                  <div className="w-5 h-5 rounded-full overflow-hidden shrink-0">
                    {item.user?.avatarUrl ? (
                      <img src={item.user.avatarUrl} alt={item.user?.name} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-indigo-600 flex items-center justify-center text-white text-[7px] font-black">
                        {item.user?.name?.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="max-w-[60px] truncate">{item.user?.name}</span>
                  <span className="text-[9px] text-[#8E8A82] truncate max-w-[50px]">— {item.role}</span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    item.status === 'confirmed' ? 'bg-[#10B981]' : item.status === 'declined' ? 'bg-rose-500' : item.status === 'unavailable' ? 'bg-amber-400' : 'bg-amber-400'
                  }`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Setlist */}
        {linkedSongs.length > 0 && (
          <div className="border-t border-natural-border pt-3 space-y-2">
            <button onClick={() => toggleSongs(sch.id)}
              className="w-full flex items-center justify-between text-[9px] font-bold text-natural-orange uppercase tracking-wider cursor-pointer">
              <span className="flex items-center gap-1"><Music className="w-3 h-3" />Setlist do Culto ({linkedSongs.length})</span>
              {showSongs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showSongs && (
              <div className="space-y-1.5 pt-1">
                {linkedSongs.map((song, idx) => (
                  <div key={song.id} className="bg-natural-light p-2 rounded-xl border border-natural-border">
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] font-black text-[#8E8A82] shrink-0 mt-0.5">{idx + 1}.</span>
                      <div>
                        <span className="font-extrabold text-[#333333] text-[10.5px] block leading-tight">{song.title}</span>
                        <span className="text-[9px] text-[#8E8A82]">{song.artist}</span>
                        {song.key && <span className="ml-1 bg-natural-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">{song.key}</span>}
                        {renderMusicLinks(song)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="volunteer-panel" className="bg-natural-bg min-h-screen py-6 px-4 text-natural-text">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Welcome */}
        <div className="bg-white rounded-3xl p-5 border border-natural-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-natural-sidebar rounded-xl flex items-center justify-center text-natural-primary shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-natural-orange font-mono uppercase tracking-wider">Voluntário / Servo</span>
              <h2 className="text-base font-extrabold text-slate-900 leading-none mt-1">Bem-vindo, {currentUser.name}!</h2>
              <p className="text-natural-text text-xs mt-1">Suas escalas, repertório e confirmações.</p>
            </div>
          </div>
          <div className="bg-natural-sidebar p-1 rounded-2xl flex items-center gap-0.5">
            {(['my_scales', 'all_scales'] as const).map(type => (
              <button key={type} onClick={() => { setFilterType(type); setSelectedDay(null); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterType === type ? 'bg-natural-primary text-white shadow-xs' : 'text-natural-text hover:text-natural-primary'
                }`}>
                {type === 'my_scales' ? 'Minhas Escalas' : 'Ver Todas'}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-natural-orange">Programação</h3>

          {cardSchedules.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center text-natural-text text-xs border border-natural-border">
              <Calendar className="w-10 h-10 text-[#8E8A82] mx-auto mb-2" />
              Nenhum evento agendado ou publicado neste período.
            </div>
          ) : filterType === 'all_scales' && schedulesByDay ? (
            // Monthly calendar — click a marked day to see that day's schedules
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-natural-border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={goToPrevMonth}
                    className="p-1.5 rounded-lg hover:bg-natural-sidebar text-natural-primary cursor-pointer">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-extrabold text-slate-900 capitalize">{calendarMonthLabel}</span>
                  <button onClick={goToNextMonth}
                    className="p-1.5 rounded-lg hover:bg-natural-sidebar text-natural-primary cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(wd => (
                    <div key={wd} className="text-center text-[9px] font-bold text-[#8E8A82] uppercase">{wd}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} />;
                    const key = dateKey(date);
                    const daySchedules = schedulesByDay.get(key) || [];
                    const hasSchedule = daySchedules.length > 0;
                    const isSelected = selectedDay === key;
                    const isToday = todayKey === key;
                    return (
                      <button
                        key={key}
                        disabled={!hasSchedule}
                        onClick={() => setSelectedDay(isSelected ? null : key)}
                        title={hasSchedule ? `${daySchedules.length} ministério(s) com escala` : undefined}
                        className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-[11px] font-bold transition-all
                          ${!hasSchedule ? 'text-[#C9C5BC] cursor-default' : 'text-slate-800 hover:bg-natural-sidebar cursor-pointer'}
                          ${isSelected ? '!bg-natural-primary !text-white' : ''}
                          ${isToday && !isSelected ? 'ring-1 ring-natural-orange' : ''}`}
                      >
                        {date.getDate()}
                        {hasSchedule && (
                          <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-natural-orange'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedDay ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 capitalize">{selectedDayLabel}</h4>
                    <span className="text-[10px] text-[#8E8A82]">{selectedDaySchedules.length} ministério(s) com escala</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedDaySchedules.map(sch => renderScheduleCard(sch))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-8 text-center text-natural-text text-xs border border-natural-border">
                  <Calendar className="w-8 h-8 text-[#8E8A82] mx-auto mb-2" />
                  Toque em um dia marcado no calendário para ver a programação.
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cardSchedules.map(sch => renderScheduleCard(sch))}
            </div>
          )}
        </div>

      </div>

      {/* Justification Modal */}
      {justifModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${justifModal.action === 'unavailable' ? 'bg-amber-100' : 'bg-rose-100'}`}>
                {justifModal.action === 'unavailable' ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <X className="w-5 h-5 text-rose-600" />}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {justifModal.action === 'unavailable' ? 'Declarar Indisponibilidade' : 'Recusar Escala'}
                </h3>
                <p className="text-[11px] text-[#8E8A82]">Informe o motivo (opcional, mas ajuda o líder)</p>
              </div>
            </div>
            <textarea
              rows={3}
              placeholder={justifModal.action === 'unavailable'
                ? 'Ex: Estarei viajando nesta data, consulta médica...'
                : 'Ex: Conflito de horário, compromisso familiar...'}
              value={justifText}
              onChange={e => setJustifText(e.target.value)}
              className="w-full text-xs p-3 border border-natural-border rounded-xl bg-natural-light focus:bg-white focus:outline-none focus:ring-2 focus:ring-natural-primary resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => { setJustifModal(null); setJustifText(''); }}
                className="flex-1 py-2 border border-natural-border rounded-xl text-xs font-semibold text-[#8E8A82] hover:bg-natural-sidebar cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleJustifSubmit}
                className={`flex-1 py-2 text-white rounded-xl text-xs font-semibold cursor-pointer ${justifModal.action === 'unavailable' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-rose-500 hover:bg-rose-600'}`}>
                {justifModal.action === 'unavailable' ? 'Confirmar Indisponibilidade' : 'Confirmar Recusa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
