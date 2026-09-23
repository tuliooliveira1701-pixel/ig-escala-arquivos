/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bell, Check, Trash2, Calendar, Clock, AlertCircle, Signal } from 'lucide-react';
import { AppNotification, Schedule, AppUser } from '../types';

interface NotificationCenterProps {
  notifications: AppNotification[];
  users: AppUser[];
  schedules: Schedule[];
  currentUser: AppUser;
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  onSimulateReminder: (scheduleId: string, type: 'reminder_24h' | 'reminder_2h' | 'new_schedule') => void;
}

export default function NotificationCenter({
  notifications,
  users,
  schedules,
  currentUser,
  onMarkRead,
  onClearAll,
  onSimulateReminder
}: NotificationCenterProps) {
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');
  const [selectedTrigger, setSelectedTrigger] = useState<'reminder_24h' | 'reminder_2h' | 'new_schedule'>('reminder_24h');

  // Filter notification for the active logged in user
  const userNotifications = notifications.filter(n => n.userId === currentUser.id);

  // Filter notifications logic (Admin sees overall trigger actions, Voluneteer sees their own)
  const availableSchedules = schedules;

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;
    onSimulateReminder(selectedSchedule, selectedTrigger);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-natural-bg min-h-screen py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Banner */}
        <div className="bg-natural-primary text-white rounded-2xl p-6 shadow-xs relative overflow-hidden border border-natural-border">
          <div className="absolute right-0 top-0 transform translate-x-12 -translate-y-6 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 border border-white/10">
              <Bell className="w-4 h-4 text-white animate-bounce" />
              <span>Suas Notificações: <strong className="text-white font-bold">{userNotifications.filter(n => !n.isRead).length} não lidas</strong></span>
            </div>
          </div>
        </div>

        {/* Simulador de Gatilhos SQL (Admin/Leader only) */}
        {currentUser.role !== 'volunteer' && (
          <div className="bg-natural-light border border-natural-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-natural-border pb-3">
              <Signal className="w-5 h-5 text-natural-orange" />
              <h3 className="text-sm font-bold text-slate-800">Forçar Disparo de Notificações / Lembretes</h3>
            </div>
            
            <form onSubmit={handleSimulate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-natural-text uppercase mb-1.5">Escolher Evento / Culto</label>
                <select
                  value={selectedSchedule}
                  onChange={(e) => setSelectedSchedule(e.target.value)}
                  className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-sidebar/30 focus:bg-white focus:ring-2 focus:ring-natural-primary text-slate-800 focus:outline-none"
                  required
                >
                  <option value="">Selecione um culto...</option>
                  {availableSchedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({new Date(s.eventDate).toLocaleDateString('pt-BR')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-natural-text uppercase mb-1.5">Gatilho Selecionado (Trigger)</label>
                <select
                  value={selectedTrigger}
                  onChange={(e) => setSelectedTrigger(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-sidebar/30 focus:bg-white focus:ring-2 focus:ring-natural-primary text-slate-800 focus:outline-none"
                >
                  <option value="new_schedule">Trigger 1: Escala Publicada (Imediato)</option>
                  <option value="reminder_24h">Trigger 2: Lembrete (Faltam 24h)</option>
                  <option value="reminder_2h">Trigger 3: Lembrete de Emergência (Faltam 2h)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedSchedule}
                className="w-full py-2.5 px-4 bg-natural-primary font-bold text-xs text-white rounded-xl hover:bg-[#3D4D3F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                Disparar Notificações via Backend
              </button>
            </form>
            <div className="p-3 bg-natural-sidebar/50 rounded-xl text-[11px] text-natural-text flex items-start gap-2 border border-natural-border">
              <AlertCircle className="w-4 h-4 text-natural-primary shrink-0 mt-0.5" />
              <span>O disparo de gatilhos enviará alertas automáticos para <strong>todos os voluntários designados</strong> para o evento selecionado, de acordo com o padrão do ministério.</span>
            </div>
          </div>
        )}

        {/* Lista de Notificações do Usuário */}
        <div className="bg-natural-light border border-natural-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-natural-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-natural-primary" />
              <h3 className="text-base font-bold text-slate-800">Seu Inbox de Alertas</h3>
            </div>
            {userNotifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-natural-orange font-bold hover:text-[#C25A3B] p-1 flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Caixa
              </button>
            )}
          </div>

          <div className="divide-y divide-natural-border">
            {userNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 bg-natural-sidebar rounded-full flex items-center justify-center mx-auto text-natural-primary">
                  <Bell className="w-6 h-6" />
                </div>
                <h4 className="text-slate-800 text-sm font-bold">Tudo calmo por aqui!</h4>
                <p className="text-natural-text text-xs max-w-xs mx-auto">Você não tem novas notificações no momento. Quando novas escalas forem publicadas ou lembretes forem acionados, eles aparecerão aqui.</p>
              </div>
            ) : (
              userNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 flex items-start gap-4 transition-colors ${
                    notif.isRead ? 'bg-transparent' : 'bg-natural-sidebar/25 hover:bg-natural-sidebar/35'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
                    notif.type === 'new_schedule' 
                      ? 'bg-natural-sidebar text-natural-primary border-natural-border/40' 
                      : notif.type === 'reminder_24h' 
                      ? 'bg-yellow-50 text-yellow-800 border-yellow-105' 
                      : 'bg-rose-50 text-rose-600 border-rose-100'
                  }`}>
                    {notif.type === 'new_schedule' && <Calendar className="w-4 h-4" />}
                    {notif.type === 'reminder_24h' && <Clock className="w-4 h-4" />}
                    {notif.type === 'reminder_2h' && <AlertCircle className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-xs font-bold text-slate-800 ${notif.isRead ? 'font-medium' : 'text-slate-900 font-bold'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-[#8E8A82] font-mono">
                        {formatDate(notif.sentAt)}
                      </span>
                    </div>
                    <p className="text-xs text-natural-text leading-relaxed">
                      {notif.message}
                    </p>
                    
                    {!notif.isRead && (
                      <button
                        onClick={() => onMarkRead(notif.id)}
                        className="text-[11px] text-natural-primary font-bold hover:text-[#3D4D3F] flex items-center gap-1 mt-1 hover:underline cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Marcar como lida
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
