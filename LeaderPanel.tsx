/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Calendar, UserCheck, Music, Plus, Globe, CheckCircle, HelpCircle,
  Save, Settings, AlertTriangle, Radio, Columns, ExternalLink,
  Youtube, Headphones, Mic2, AlignLeft, Trash2
} from 'lucide-react';
import { AppUser, Ministry, Schedule, Assignment, Song } from '../types';
import { generateMusicLinks } from '../dataStore';

interface LeaderPanelProps {
  currentUser: AppUser;
  users: AppUser[];
  ministries: Ministry[];
  schedules: Schedule[];
  assignments: Assignment[];
  songs: Song[];
  onAddSchedule: (schedule: Omit<Schedule, 'id' | 'createdAt'>) => void;
  onUpdateScheduleStatus: (id: string, status: Schedule['status']) => void;
  onDeleteSchedule: (id: string) => void;
  onAddAssignment: (assignment: Omit<Assignment, 'id' | 'createdAt'>) => void;
  onRemoveAssignment: (id: string) => void;
  onAddSong: (song: Omit<Song, 'id' | 'createdAt'>) => void;
  onRemoveSong: (id: string) => void;
}

// ── Music link buttons config ──────────────────────────────────────────────
const MUSIC_LINKS = [
  {
    key: 'linkLetras',
    label: 'Letras',
    bg: 'bg-[#FACC15] hover:bg-[#E2B709]',
    text: 'text-[#78350F]',
    border: 'border-[#EAB308]/40',
    icon: <AlignLeft className="w-2.5 h-2.5" />,
  },
  {
    key: 'linkCifra',
    label: 'Cifras',
    bg: 'bg-[#FB923C] hover:bg-[#EA580C]',
    text: 'text-white',
    border: 'border-[#F97316]/40',
    icon: <Mic2 className="w-2.5 h-2.5" />,
  },
  {
    key: 'linkYoutube',
    label: 'YouTube',
    bg: 'bg-[#FF0000] hover:bg-[#CC0000]',
    text: 'text-white',
    border: 'border-[#FF0000]/30',
    icon: <Youtube className="w-2.5 h-2.5" />,
  },
  {
    key: 'linkSpotify',
    label: 'Spotify',
    bg: 'bg-[#1DB954] hover:bg-[#17a348]',
    text: 'text-white',
    border: 'border-[#1DB954]/30',
    icon: <Headphones className="w-2.5 h-2.5" />,
  },
  {
    key: 'linkDeezer',
    label: 'Deezer',
    bg: 'bg-[#A238FF] hover:bg-[#8A2BE2]',
    text: 'text-white',
    border: 'border-[#A238FF]/30',
    icon: <Headphones className="w-2.5 h-2.5" />,
  },
  {
    key: 'linkAmazon',
    label: 'Amazon',
    bg: 'bg-[#3D12B4] hover:bg-[#2e0d8a]',
    text: 'text-white',
    border: 'border-[#3D12B4]/30',
    icon: <Headphones className="w-2.5 h-2.5" />,
  },
];

// Extend Song locally to hold dynamic links
type SongWithLinks = Song & {
  linkYoutube?: string;
  linkSpotify?: string;
  linkDeezer?: string;
  linkAmazon?: string;
};

export default function LeaderPanel({
  currentUser,
  users,
  ministries,
  schedules,
  assignments,
  songs,
  onAddSchedule,
  onUpdateScheduleStatus,
  onDeleteSchedule,
  onAddAssignment,
  onRemoveAssignment,
  onAddSong,
  onRemoveSong,
}: LeaderPanelProps) {
  const ledMinistryId =
    currentUser.ministryId ||
    (currentUser.ministryIds && currentUser.ministryIds.length > 0 ? currentUser.ministryIds[0] : undefined) ||
    ministries.find(m => m.leaderId === currentUser.id)?.id ||
    ministries[0]?.id || '';
  const activeMinistry = ministries.find(m => m.id === ledMinistryId) || ministries[0];

  // Detect Louvor ministry dynamically
  const louvorMinistryIds = ministries
    .filter(m => m.name.toLowerCase().includes('louvor') || m.name.toLowerCase().includes('worship') || m.name.toLowerCase().includes('música') || m.name.toLowerCase().includes('musica'))
    .map(m => m.id);
  const isLouvorMin = (id: string) => louvorMinistryIds.includes(id) || louvorMinistryIds.length === 0;
  const isMidiaMin = (id: string) => {
    const m = ministries.find(mn => mn.id === id);
    if (!m) return false;
    const n = m.name.toLowerCase();
    return n.includes('mídia') || n.includes('midia') || n.includes('transmiss') || n.includes('projeç') || n.includes('projecao');
  };

  const [activeTab, setActiveTab] = useState<'schedules' | 'repertoire'>('schedules');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');

  // Schedule form
  const [schTitle, setSchTitle] = useState('');
  const [schDesc, setSchDesc] = useState('');
  const [schDate, setSchDate] = useState('2026-06-08T18:00');
  const [schRecurring, setSchRecurring] = useState(false);
  const [schPattern, setSchPattern] = useState<'none' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  // Assignment form
  const [asgVolunteerId, setAsgVolunteerId] = useState('');
  const [asgRole, setAsgRole] = useState('');

  // Song form
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [songKey, setSongKey] = useState('');

  const filteredSchedules = schedules.filter(s => s.ministryId === ledMinistryId);
  const selectedSchedule = schedules.find(s => s.id === selectedScheduleId);

  // Servos do ministério: voluntários E líderes que pertencem a este ministério
  // (inclui o próprio líder logado, para que ele também possa ser escalado)
  const ministryVolunteers = users.filter(u =>
    (u.role === 'volunteer' || u.role === 'leader') &&
    (
      (u.ministryIds && u.ministryIds.includes(ledMinistryId)) ||
      u.ministryId === ledMinistryId
    )
  );

  // Get subfunctions for active ministry
  const subfunctions = activeMinistry?.rolesInMinistry || [];

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schTitle || !schDate) return;
    onAddSchedule({
      title: schTitle,
      description: schDesc,
      ministryId: ledMinistryId,
      eventDate: new Date(schDate).toISOString(),
      isRecurring: schRecurring,
      recurrencePattern: schRecurring ? schPattern : 'none',
      status: 'draft',
    });
    setSchTitle('');
    setSchDesc('');
    setSchRecurring(false);
    setShowScheduleForm(false);
  };

  // Conflict check: volunteer already assigned in any schedule on the same event date
  const isVolunteerConflict = (volunteerId: string, scheduleId: string): boolean => {
    const targetSch = schedules.find(s => s.id === scheduleId);
    if (!targetSch) return false;
    const targetDate = new Date(targetSch.eventDate).toLocaleDateString('pt-BR');
    return assignments.some(a => {
      if (a.volunteerId !== volunteerId) return false;
      if (a.scheduleId === scheduleId) return true; // already in this schedule
      const aSch = schedules.find(s => s.id === a.scheduleId);
      if (!aSch) return false;
      return new Date(aSch.eventDate).toLocaleDateString('pt-BR') === targetDate;
    });
  };

  const handleAddVolunteerToScale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleId || !asgVolunteerId || !asgRole) return;
    // Block if already assigned to same schedule
    const alreadyThisSchedule = assignments.some(
      a => a.scheduleId === selectedScheduleId && a.volunteerId === asgVolunteerId
    );
    if (alreadyThisSchedule) {
      alert('Este servo já está escalado neste evento.');
      return;
    }
    onAddAssignment({
      scheduleId: selectedScheduleId,
      volunteerId: asgVolunteerId,
      roleInMinistry: asgRole,
      status: 'pending',
    });
    setAsgVolunteerId('');
    setAsgRole('');
  };

  const handleAddSongToSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleId || !songTitle || !songArtist) return;
    const links = generateMusicLinks(songTitle, songArtist);
    onAddSong({
      scheduleId: selectedScheduleId,
      title: songTitle,
      artist: songArtist,
      key: songKey || undefined,
      linkLetras: links.linkLetras,
      linkCifra: links.linkCifra,
      linkYoutube: links.linkYoutube,
      linkSpotify: links.linkSpotify,
      linkDeezer: links.linkDeezer,
      linkAmazon: links.linkAmazon,
    });
    setSongTitle('');
    setSongArtist('');
    setSongKey('');
  };

  const getDayAndMonth = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return {
        day: d.getDate().toString().padStart(2, '0'),
        month: d.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''),
        time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
    } catch {
      return { day: '00', month: '---', time: '00:00' };
    }
  };

  const getLouvorSongsForSchedule = (targetSchedule: Schedule): SongWithLinks[] => {
    const targetDate = new Date(targetSchedule.eventDate).toLocaleDateString();
    const louvorScheduleIds = schedules
      .filter(s => isLouvorMin(s.ministryId) && new Date(s.eventDate).toLocaleDateString() === targetDate)
      .map(s => s.id);
    const rawSongs = songs.filter(song => louvorScheduleIds.includes(song.scheduleId));
    return rawSongs.map(s => ({ ...s, ...generateMusicLinks(s.title, s.artist) }));
  };

  const getSongWithLinks = (song: Song): SongWithLinks => ({
    ...song,
    ...generateMusicLinks(song.title, song.artist),
  });

  const renderMusicLinkButtons = (song: SongWithLinks) => {
    // Always regenerate from title+artist to avoid stale Firestore URLs
    const freshLinks = generateMusicLinks(song.title, song.artist);
    return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {MUSIC_LINKS.map(({ key, label, bg, text, border, icon }) => {
        const url = (freshLinks as any)[key] as string | undefined;
        if (!url) return null;
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1 ${bg} ${text} ${border} border px-1.5 py-0.5 rounded text-[9px] font-bold transition-all shadow-xs cursor-pointer`}
            title={label}
          >
            {icon}
            {label}
          </a>
        );
      })}
    </div>
    );
  };

  return (
    <div id="leader-panel" className="bg-natural-bg min-h-screen py-8 px-4 sm:px-6 text-natural-text">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-3xl p-6 border border-natural-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-natural-sidebar rounded-2xl flex items-center justify-center text-natural-primary">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-natural-primary text-white px-2 py-0.5 rounded-full">Painel do Líder</span>
                <span className="text-[11px] text-natural-orange font-mono font-extrabold leading-none">{activeMinistry?.name}</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">Gerenciar Escalas & Servo-Atribuição</h2>
            </div>
          </div>
          <button
            onClick={() => setShowScheduleForm(!showScheduleForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-natural-primary hover:bg-[#3D4D3F] text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Novo Culto/Evento
          </button>
        </div>

        {/* Create Schedule Form */}
        {showScheduleForm && (
          <div className="bg-white border border-natural-border rounded-3xl p-6 shadow-md animate-in fade-in zoom-in duration-100">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-rose-100 pb-3 mb-4">Adicionar Evento na Agenda do Ministério</h3>
            <form onSubmit={handleCreateSchedule} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-natural-primary uppercase mb-1.5">Título da Escala/Culto</label>
                <input type="text" placeholder="Ex: Culto de Jovens, Culto Matutino de Domingo" value={schTitle} onChange={e => setSchTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-light focus:bg-white focus:outline-none focus:ring-2 focus:ring-natural-primary" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-natural-primary uppercase mb-1.5">Data & Horário</label>
                <input type="datetime-local" value={schDate} onChange={e => setSchDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-light focus:bg-white focus:outline-none focus:ring-2 focus:ring-natural-primary" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-natural-primary uppercase mb-1.5">Tipo de Recorrência</label>
                <div className="flex items-center gap-4 h-10">
                  <label className="inline-flex items-center gap-1.5 text-xs text-natural-text cursor-pointer">
                    <input type="checkbox" checked={schRecurring} onChange={e => setSchRecurring(e.target.checked)} className="rounded text-natural-primary" />
                    Recorrente?
                  </label>
                  {schRecurring && (
                    <select value={schPattern} onChange={e => setSchPattern(e.target.value as any)}
                      className="text-xs p-1.5 border border-natural-border rounded-lg bg-natural-light">
                      <option value="weekly">Semanal</option>
                      <option value="biweekly">Quinzenal</option>
                      <option value="monthly">Mensal</option>
                    </select>
                  )}
                </div>
              </div>
              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-natural-primary uppercase mb-1.5">Orientações e Descrição do Culto</label>
                <textarea placeholder="Orientações de fardamento, jejum, ensaios..." value={schDesc} onChange={e => setSchDesc(e.target.value)}
                  className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-light focus:bg-white focus:outline-none focus:ring-2 focus:ring-natural-primary min-h-[60px]" />
              </div>
              <div className="md:col-span-4 flex justify-end gap-3 mt-2 border-t border-natural-border pt-4">
                <button type="button" onClick={() => setShowScheduleForm(false)}
                  className="px-4 py-2 border border-natural-border rounded-xl text-xs font-semibold text-[#8E8A82] hover:bg-natural-sidebar cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-natural-primary hover:bg-[#3D4D3F] text-white rounded-xl text-xs font-semibold cursor-pointer">Salvar Rascunho</button>
              </div>
            </form>
          </div>
        )}

        {/* Scale Layout View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Schedule list */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-natural-orange">Escalas Cadastradas</h3>
            {filteredSchedules.length === 0 ? (
              <div className="bg-white rounded-3xl p-6 border border-natural-border text-center text-natural-text text-xs">
                Nenhuma escala registrada. Crie uma para começar.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSchedules.map(sch => {
                  const dateInfo = getDayAndMonth(sch.eventDate);
                  const isSelected = sch.id === selectedScheduleId;
                  const isDraft = sch.status === 'draft';
                  const assignedCount = assignments.filter(a => a.scheduleId === sch.id).length;
                  return (
                    <div key={sch.id} onClick={() => setSelectedScheduleId(sch.id)}
                      className={`bg-white border rounded-3xl p-4 flex gap-4 cursor-pointer hover:border-natural-orange transition-all shadow-xs ${isSelected ? 'border-natural-orange bg-[#FEF6F3]' : 'border-natural-border hover:bg-natural-sidebar'}`}>
                      <div className="bg-natural-sidebar rounded-xl p-2 h-14 w-12 flex flex-col items-center justify-center text-natural-primary">
                        <span className="text-sm font-black tracking-tight leading-none text-[#333333]">{dateInfo.day}</span>
                        <span className="text-[9px] uppercase font-bold text-[#8E8A82] mt-1 leading-none">{dateInfo.month}</span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="text-[10px] text-[#8E8A82] font-mono">{dateInfo.time}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isDraft ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-natural-primary/10 text-natural-primary border border-natural-primary/20'}`}>
                            {isDraft ? 'Rascunho' : 'Publicada'}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-900 leading-tight truncate">{sch.title}</h4>
                        <div className="text-[10px] text-[#8E8A82] flex items-center justify-between">
                          <span>{assignedCount} servos escalados</span>
                          {sch.isRecurring && <span className="bg-natural-sidebar text-natural-primary px-1.5 py-0.5 rounded uppercase text-[8px] font-black">Recorrente</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-8">
            {selectedSchedule ? (
              <div className="bg-white border border-natural-border rounded-3xl shadow-sm overflow-hidden divide-y divide-natural-border">

                {/* Schedule header */}
                <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-natural-sidebar/30">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">{selectedSchedule.title}</h3>
                    <p className="text-xs text-natural-text mt-1">{selectedSchedule.description || 'Sem orientações adicionais.'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedSchedule.status === 'draft' ? (
                      <button onClick={() => onUpdateScheduleStatus(selectedSchedule.id, 'published')}
                        className="px-3.5 py-1.5 bg-natural-primary hover:bg-[#3D4D3F] text-white rounded-xl text-xs font-semibold cursor-pointer">Publicar Escala</button>
                    ) : (
                      <button onClick={() => onUpdateScheduleStatus(selectedSchedule.id, 'draft')}
                        className="px-3.5 py-1.5 border border-natural-border text-natural-text rounded-xl text-xs font-semibold hover:bg-natural-sidebar cursor-pointer">Reverter Rascunho</button>
                    )}
                    <button onClick={() => { onDeleteSchedule(selectedSchedule.id); setSelectedScheduleId(''); }}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-100 cursor-pointer">Excluir</button>
                  </div>
                </div>

                {/* Assignments + Repertoire */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* ── LEFT: Assignments ── */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-natural-border pb-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-natural-primary" />
                        Servo-Atribuições
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {assignments.filter(a => a.scheduleId === selectedSchedule.id).length === 0 ? (
                        <p className="text-[#8E8A82] text-xs italic py-2">Nenhum voluntário escalado ainda.</p>
                      ) : (
                        assignments.filter(a => a.scheduleId === selectedSchedule.id).map(asg => {
                          const vol = users.find(u => u.id === asg.volunteerId);
                          return (
                            <div key={asg.id} className="bg-natural-light p-2.5 rounded-xl border border-natural-border space-y-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <strong className="text-slate-800 text-[11px] block">{vol?.name || 'Inexistente'}</strong>
                                  <span className="text-[10px] text-natural-orange font-semibold">{asg.roleInMinistry}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    asg.status === 'confirmed' ? 'bg-natural-sidebar text-natural-primary border border-natural-border/30'
                                    : asg.status === 'declined' ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                    : asg.status === 'unavailable' ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                    : 'bg-yellow-50 text-yellow-800 border border-yellow-100'
                                  }`}>
                                    {asg.status === 'confirmed' ? 'Confirmado'
                                      : asg.status === 'declined' ? 'Recusado'
                                      : asg.status === 'unavailable' ? 'Indisponível'
                                      : 'Pendente'}
                                  </span>
                                  <button onClick={() => onRemoveAssignment(asg.id)}
                                    className="text-[#8E8A82] hover:text-rose-600 p-1 rounded cursor-pointer" title="Remover">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              {asg.justification && (
                                <p className="text-[10px] text-[#8E8A82] bg-white border border-natural-border rounded-lg px-2 py-1 italic">
                                  "{asg.justification}"
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Assign Form */}
                    <form onSubmit={handleAddVolunteerToScale} className="bg-natural-sidebar/30 p-3.5 rounded-xl border border-natural-border space-y-3">
                      <span className="text-[10px] font-bold text-natural-primary block uppercase tracking-wide">Designar Servo</span>
                      <div className="space-y-2">
                        <select value={asgVolunteerId} onChange={e => setAsgVolunteerId(e.target.value)}
                          className="w-full text-xs p-2 border border-natural-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-natural-primary" required>
                          <option value="">Selecionar Servo...</option>
                          {ministryVolunteers.map(v => {
                            const conflict = isVolunteerConflict(v.id, selectedSchedule.id);
                            const alreadyHere = assignments.some(a => a.scheduleId === selectedSchedule.id && a.volunteerId === v.id);
                            return (
                              <option key={v.id} value={v.id} disabled={alreadyHere}>
                                {v.name}{conflict && !alreadyHere ? ' ⚠ Conflito de escala' : ''}{alreadyHere ? ' ✓ Já escalado' : ''}
                              </option>
                            );
                          })}
                        </select>

                        {/* Role: dropdown from subfunctions or manual */}
                        {subfunctions.length > 0 ? (
                          <select value={asgRole} onChange={e => setAsgRole(e.target.value)}
                            className="w-full text-xs p-2 border border-natural-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-natural-primary" required>
                            <option value="">Selecionar Subfunção...</option>
                            {subfunctions.map(sf => (
                              <option key={sf} value={sf}>{sf}</option>
                            ))}
                            <option value="__custom__">Outra função (digitar)...</option>
                          </select>
                        ) : null}

                        {(subfunctions.length === 0 || asgRole === '__custom__') && (
                          <input type="text" placeholder="Função (ex: Teclado, Câmera 1)"
                            value={asgRole === '__custom__' ? '' : asgRole}
                            onChange={e => setAsgRole(e.target.value)}
                            className="w-full text-xs p-2 border border-natural-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-natural-primary" required />
                        )}
                      </div>

                      {/* Conflict warning */}
                      {asgVolunteerId && isVolunteerConflict(asgVolunteerId, selectedSchedule.id) &&
                        !assignments.some(a => a.scheduleId === selectedSchedule.id && a.volunteerId === asgVolunteerId) && (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Este servo já está escalado em outro ministério nesta mesma data. Você pode escalá-lo mesmo assim.
                        </div>
                      )}

                      <button type="submit" disabled={!asgVolunteerId || !asgRole || asgRole === '__custom__'}
                        className="w-full py-1.5 bg-natural-primary text-white font-semibold rounded-lg text-xs hover:bg-[#3D4D3F] transition-colors cursor-pointer disabled:opacity-50">
                        Vincular na Escala
                      </button>
                    </form>
                  </div>

                  {/* ── RIGHT: Setlist / Repertoire ── */}
                  <div className="space-y-4">
                    {isLouvorMin(activeMinistry?.id || '') ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-natural-border pb-2">
                          <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                            <Music className="w-4 h-4 text-natural-orange" />
                            Setlist / Repertório
                          </h4>
                          <span className="text-[9px] uppercase font-black text-natural-orange tracking-widest animate-pulse">Integração Mídia Ativa</span>
                        </div>

                        <div className="space-y-2">
                          {songs.filter(s => s.scheduleId === selectedSchedule.id).length === 0 ? (
                            <p className="text-[#8E8A82] text-xs italic py-2">Nenhuma música adicionada.</p>
                          ) : (
                            songs.filter(s => s.scheduleId === selectedSchedule.id).map((song, idx) => {
                              const sw = getSongWithLinks(song);
                              return (
                                <div key={song.id} className="bg-natural-light p-2.5 rounded-xl border border-natural-border">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-2">
                                      <span className="text-[10px] font-black text-[#8E8A82] bg-natural-sidebar px-1.5 py-0.5 rounded shrink-0">{idx + 1}</span>
                                      <div>
                                        <strong className="text-slate-800 block text-[11px] leading-tight">{song.title}</strong>
                                        <span className="text-[9px] text-[#8E8A82]">{song.artist}</span>
                                        {song.key && <span className="ml-1 bg-natural-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">{song.key}</span>}
                                        {renderMusicLinkButtons(sw)}
                                      </div>
                                    </div>
                                    <button onClick={() => onRemoveSong(song.id)}
                                      className="text-[#8E8A82] hover:text-rose-600 p-1 cursor-pointer shrink-0" title="Remover">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <form onSubmit={handleAddSongToSchedule} className="bg-natural-sidebar/30 p-3.5 rounded-xl border border-natural-border space-y-3">
                          <span className="text-[10px] font-bold text-natural-primary block uppercase tracking-wide">Inserir Música</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input type="text" placeholder="Nome da Música" value={songTitle} onChange={e => setSongTitle(e.target.value)}
                              className="text-xs p-2 border border-natural-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-natural-primary" required />
                            <input type="text" placeholder="Artista / Versão" value={songArtist} onChange={e => setSongArtist(e.target.value)}
                              className="text-xs p-2 border border-natural-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-natural-primary" required />
                          </div>
                          <select value={songKey} onChange={e => setSongKey(e.target.value)}
                            className="w-full text-xs p-2 border border-natural-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-natural-primary">
                            <option value="">Tom (opcional)</option>
                            {['C','C#','D','D#','E','F','F#','G','G#','A','A#','B',
                              'Cm','C#m','Dm','D#m','Em','Fm','F#m','Gm','G#m','Am','A#m','Bm'].map(k => (
                              <option key={k} value={k}>{k}</option>
                            ))}
                          </select>
                          <button type="submit"
                            className="w-full py-1.5 bg-natural-orange text-white font-semibold rounded-lg text-xs hover:bg-[#C25A3B] transition-colors cursor-pointer">
                            Adicionar & Gerar Links
                          </button>
                        </form>
                      </div>

                    ) : isMidiaMin(activeMinistry?.id || '') ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-natural-border pb-2">
                          <h4 className="text-xs font-bold text-natural-primary uppercase flex items-center gap-1.5">
                            <Radio className="w-4 h-4 text-natural-primary" />
                            Repertório Louvor Compartilhado
                          </h4>
                          <span className="text-[9px] uppercase font-bold text-white bg-natural-orange px-1.5 py-0.5 rounded-full">Sincronizado</span>
                        </div>
                        <div className="space-y-2">
                          {getLouvorSongsForSchedule(selectedSchedule).length === 0 ? (
                            <div className="p-4 bg-natural-light border border-dashed border-natural-border rounded-2xl text-center">
                              <p className="text-[11px] text-natural-text">Nenhuma música declarada no Louvor para esta data.</p>
                            </div>
                          ) : (
                            getLouvorSongsForSchedule(selectedSchedule).map((song, idx) => (
                              <div key={song.id} className="bg-natural-light p-2.5 rounded-xl border border-natural-border">
                                <div className="flex items-start gap-2">
                                  <span className="text-[10px] font-black text-[#8E8A82] bg-natural-sidebar px-1.5 py-0.5 rounded shrink-0">{idx + 1}</span>
                                  <div>
                                    <span className="text-[8px] bg-natural-primary/10 text-natural-primary px-1.5 py-0.5 rounded font-black uppercase tracking-wider block w-max mb-1">Para Projeção</span>
                                    <strong className="text-slate-800 block text-[11px] leading-tight">{song.title}</strong>
                                    <span className="text-[9px] text-[#8E8A82]">{song.artist}</span>
                                    {song.key && <span className="ml-1 bg-natural-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">{song.key}</span>}
                                    {renderMusicLinkButtons(song)}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="p-3 bg-natural-sidebar rounded-xl text-[11px] text-natural-primary flex items-start gap-2 border border-natural-border">
                          <CheckCircle className="w-4 h-4 text-natural-primary shrink-0 mt-0.5" />
                          <span><strong>Integração Louvor-Mídia:</strong> O setor de mídia acessa os links direto do setlist do Louvor para preparar os slides.</span>
                        </div>
                      </div>

                    ) : (
                      <div className="p-6 bg-natural-light border border-natural-border rounded-3xl text-center space-y-2">
                        <HelpCircle className="w-8 h-8 text-[#8E8A82] mx-auto" />
                        <h4 className="text-xs font-bold text-slate-700">Módulo Específico de Ministérios</h4>
                        <p className="text-[11px] text-natural-text max-w-sm mx-auto">Tabelações exclusivas de links estão ativas para os setores de <strong>Louvor e Mídia</strong>.</p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-natural-border space-y-3">
                <Calendar className="w-10 h-10 text-[#8E8A82] mx-auto" />
                <p className="text-xs text-natural-text">Selecione uma escala à esquerda para gerenciar servos e repertório.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
