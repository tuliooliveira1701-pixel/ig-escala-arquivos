/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserPlus, FolderPlus, Shield, User, Award, Layers, PlusCircle, Trash2, Tag, ChevronDown, ChevronUp, X, BookOpen } from 'lucide-react';
import { AppUser, Ministry } from '../types';

interface AdminPanelProps {
  users: AppUser[];
  ministries: Ministry[];
  onAddUser: (user: Omit<AppUser, 'id' | 'joinedAt'>, password?: string, ministryIds?: string[]) => void;
  onUpdateUserRole: (id: string, role: AppUser['role'], ministryId?: string) => void;
  onUpdateUserMinistries: (userId: string, ministryIds: string[]) => void;
  onAddMinistry: (name: string, description: string, leaderId?: string) => void;
  onDeleteMinistry: (id: string) => void;
  onUpdateMinistryRoles: (ministryId: string, roles: string[]) => void;
  onDeleteUser: (id: string) => void;
  currentUser: AppUser | null;
}

export default function AdminPanel({
  users,
  ministries,
  onAddUser,
  onUpdateUserRole,
  onUpdateUserMinistries,
  onAddMinistry,
  onDeleteMinistry,
  onUpdateMinistryRoles,
  onDeleteUser,
  currentUser
}: AdminPanelProps) {
  // New Ministry State
  const [minName, setMinName] = useState('');
  const [minDesc, setMinDesc] = useState('');
  const [minLeader, setMinLeader] = useState('');
  const [showMinForm, setShowMinForm] = useState(false);

  // New Volunteer State
  const [volName, setVolName] = useState('');
  const [volEmail, setVolEmail] = useState('');
  const [volPassword, setVolPassword] = useState('Igreja@123');
  const [volRole, setVolRole] = useState<'admin' | 'leader' | 'volunteer'>('volunteer');
  const [volMinistryIds, setVolMinistryIds] = useState<string[]>([]);
  const [showVolForm, setShowVolForm] = useState(false);

  // Subfunctions management
  const [expandedMinId, setExpandedMinId] = useState<string | null>(null);
  const [newRoleInput, setNewRoleInput] = useState('');

  const handleCreateMinistry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!minName) return;
    onAddMinistry(minName, minDesc, minLeader || undefined);
    setMinName('');
    setMinDesc('');
    setMinLeader('');
    setShowMinForm(false);
  };

  const toggleVolMinistry = (id: string) => {
    setVolMinistryIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!volName || !volEmail) return;
    onAddUser({
      name: volName,
      email: volEmail,
      role: volRole,
      ministryId: volMinistryIds[0] || undefined,
      ministryIds: volMinistryIds,
    }, volPassword || 'Igreja@123', volMinistryIds);
    setVolName('');
    setVolEmail('');
    setVolPassword('Igreja@123');
    setVolRole('volunteer');
    setVolMinistryIds([]);
    setShowVolForm(false);
  };

  const getLeaderName = (leaderId?: string) => {
    if (!leaderId) return 'Nenhum líder associado';
    const leader = users.find(u => u.id === leaderId);
    return leader ? leader.name : 'Líder Não Encontrado';
  };

  const handleAddRole = (min: Ministry) => {
    const trimmed = newRoleInput.trim();
    if (!trimmed) return;
    const existing = min.rolesInMinistry || [];
    if (existing.includes(trimmed)) return;
    onUpdateMinistryRoles(min.id, [...existing, trimmed]);
    setNewRoleInput('');
  };

  const handleRemoveRole = (min: Ministry, role: string) => {
    const updated = (min.rolesInMinistry || []).filter(r => r !== role);
    onUpdateMinistryRoles(min.id, updated);
  };

  return (
    <div id="admin-panel" className="bg-natural-bg min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Profile Card Header */}
        <div className="bg-natural-light rounded-2xl p-6 border border-natural-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-natural-sidebar rounded-2xl flex items-center justify-center text-natural-primary">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-natural-primary text-white px-2 py-0.5 rounded-full">Painel Admin</span>
                <span className="text-[11px] text-[#8E8A82] font-mono">Controle Total de Hierarquia</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mt-0.5">Gerenciamento Executivo</h2>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => { setShowMinForm(!showMinForm); setShowVolForm(false); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-natural-primary hover:bg-[#3D4D3F] text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              Novo Ministério
            </button>
            <button
              onClick={() => { setShowVolForm(!showVolForm); setShowMinForm(false); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-natural-orange hover:bg-[#C25A3B] text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Novo Usuário / Servo
            </button>
          </div>
        </div>

        {/* Dynamic Ministry Creation Form */}
        {showMinForm && (
          <div className="bg-natural-light border border-natural-primary rounded-2xl p-6 shadow-md transition-all animate-in fade-in zoom-in duration-100">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-natural-border pb-3 mb-4">Criar Novo Ministério Ministerial</h3>
            <form onSubmit={handleCreateMinistry} className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-natural-text uppercase mb-1.5">Nome do Ministério</label>
                <input
                  type="text"
                  placeholder="Ex: Ministério de Louvor, Recepção..."
                  value={minName}
                  onChange={(e) => setMinName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-sidebar/30 focus:bg-white focus:ring-2 focus:ring-natural-primary text-slate-800 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-natural-text uppercase mb-1.5">Descrição / Propósito</label>
                <input
                  type="text"
                  placeholder="Objetivos e atribuições deste grupo..."
                  value={minDesc}
                  onChange={(e) => setMinDesc(e.target.value)}
                  className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-sidebar/30 focus:bg-white focus:ring-2 focus:ring-natural-primary text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-natural-text uppercase mb-1.5">Líder Designado Sênior</label>
                <select
                  value={minLeader}
                  onChange={(e) => setMinLeader(e.target.value)}
                  className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-sidebar/30 focus:bg-white focus:ring-2 focus:ring-natural-primary text-slate-800 focus:outline-none"
                >
                  <option value="">Selecione um líder...</option>
                  {users.filter(u => u.role === 'leader').map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                  <option disabled>--- Voluntários que você pode promover ---</option>
                  {users.filter(u => u.role === 'volunteer').map(u => (
                    <option key={u.id} value={u.id}>{u.name} (Voluntário)</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 flex justify-end gap-3 mt-2 border-t border-natural-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowMinForm(false)}
                  className="px-4 py-2 border border-natural-border rounded-xl text-xs font-semibold text-[#8E8A82] hover:bg-natural-sidebar cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-natural-primary hover:bg-[#3D4D3F] text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Salvar Ministério
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Dynamic Volunteer / Leader Creation Form */}
        {showVolForm && (
          <div className="bg-natural-light border border-natural-orange/40 rounded-2xl p-6 shadow-md transition-all animate-in fade-in zoom-in duration-100">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-natural-border pb-3 mb-4">Cadastrar Novo Usuário na Plataforma</h3>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-natural-text uppercase mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Nome do servo"
                  value={volName}
                  onChange={(e) => setVolName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-sidebar/30 focus:bg-white focus:ring-2 focus:ring-natural-primary text-slate-800 focus:outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-natural-text uppercase mb-1.5">E-mail para Acesso</label>
                <input
                  type="email"
                  placeholder="email@igreja.com"
                  value={volEmail}
                  onChange={(e) => setVolEmail(e.target.value)}
                  className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-sidebar/30 focus:bg-white focus:ring-2 focus:ring-natural-primary text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-natural-text uppercase mb-1.5">Senha Inicial</label>
                <input
                  type="text"
                  placeholder="Mín. 6 caracteres"
                  value={volPassword}
                  onChange={(e) => setVolPassword(e.target.value)}
                  className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-sidebar/30 focus:bg-white focus:ring-2 focus:ring-natural-primary text-slate-800 focus:outline-none font-mono"
                  minLength={6}
                  required
                />
                <p className="text-[9px] text-[#8E8A82] mt-1">Compartilhe com o servo para o 1º acesso</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-natural-text uppercase mb-1.5">Nível / Cargo</label>
                <select
                  value={volRole}
                  onChange={(e) => setVolRole(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-sidebar/30 focus:bg-white focus:ring-2 focus:ring-natural-primary text-slate-800 focus:outline-none"
                >
                  <option value="volunteer">Voluntário / Servo</option>
                  <option value="leader">Líder de Ministério</option>
                  <option value="admin">Administrador Sistêmico</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-natural-text uppercase mb-2">
                  Ministérios Associados
                  <span className="ml-2 text-[9px] text-natural-orange font-semibold normal-case">Selecione quantos quiser</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ministries.map(m => {
                    const checked = volMinistryIds.includes(m.id);
                    return (
                      <label key={m.id}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs font-medium select-none ${
                          checked
                            ? 'bg-natural-primary/10 border-natural-primary text-natural-primary'
                            : 'bg-natural-sidebar/30 border-natural-border text-slate-700 hover:border-natural-primary/40'
                        }`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleVolMinistry(m.id)}
                          className="accent-natural-primary w-3.5 h-3.5 shrink-0"
                        />
                        <span className="leading-tight">{m.name}</span>
                      </label>
                    );
                  })}
                </div>
                {volMinistryIds.length === 0 && (
                  <p className="text-[10px] text-[#8E8A82] mt-1.5">Nenhum selecionado — servo ficará sem ministério associado.</p>
                )}
              </div>

              <div className="md:col-span-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-700 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>O sistema reconecta o admin automaticamente após o cadastro. Anote e-mail e senha antes de salvar.</span>
              </div>

              <div className="md:col-span-4 flex justify-end gap-3 mt-2 border-t border-natural-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowVolForm(false)}
                  className="px-4 py-2 border border-natural-border rounded-xl text-xs font-semibold text-[#8E8A82] hover:bg-natural-sidebar cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-natural-orange hover:bg-[#C25A3B] text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cadastrar Usuário
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Main Grid: Ministries in Left, Directory in Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Ministerios Grid */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-natural-primary" />
                <h3 className="text-base font-bold text-slate-850">Ministérios ({ministries.length})</h3>
              </div>
            </div>

            <div className="space-y-4">
              {ministries.map((min) => (
                <div key={min.id} className="bg-natural-light border border-natural-border rounded-2xl p-4 shadow-xs space-y-3 hover:border-[#BFBBAE] transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-850">{min.name}</h4>
                      <p className="text-xs text-natural-text mt-1 line-clamp-2 leading-relaxed">{min.description}</p>
                    </div>
                    <button
                      onClick={() => onDeleteMinistry(min.id)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Excluir Ministério"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-natural-sidebar/40 p-2.5 rounded-xl border border-natural-border/30 flex items-center justify-between text-[11px]">
                    <span className="text-[#8E8A82] font-medium">Líder Nomeado:</span>
                    <span className="font-bold text-natural-primary flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      {getLeaderName(min.leaderId)}
                    </span>
                  </div>

                  {/* ── SUBFUNCTIONS SECTION ── */}
                  <div className="border-t border-natural-border pt-3 space-y-2">
                    <button
                      onClick={() => setExpandedMinId(expandedMinId === min.id ? null : min.id)}
                      className="w-full flex items-center justify-between text-[11px] font-bold text-natural-primary hover:text-[#3D4D3F] cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        Subfunções ({(min.rolesInMinistry || []).length})
                      </span>
                      {expandedMinId === min.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {expandedMinId === min.id && (
                      <div className="space-y-2 pt-1 animate-in fade-in duration-100">
                        {/* Existing roles */}
                        <div className="flex flex-wrap gap-1.5">
                          {(min.rolesInMinistry || []).length === 0 ? (
                            <span className="text-[10px] text-[#8E8A82] italic">Nenhuma subfunção cadastrada.</span>
                          ) : (
                            (min.rolesInMinistry || []).map((role) => (
                              <span
                                key={role}
                                className="flex items-center gap-1 bg-natural-sidebar border border-natural-border text-natural-primary text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              >
                                {role}
                                <button
                                  onClick={() => handleRemoveRole(min, role)}
                                  className="text-rose-400 hover:text-rose-600 cursor-pointer ml-0.5"
                                  title="Remover subfunção"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))
                          )}
                        </div>

                        {/* Add new role */}
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Ex: Teclado, Vocal, Câmera 1..."
                            value={newRoleInput}
                            onChange={(e) => setNewRoleInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddRole(min); } }}
                            className="flex-1 text-[11px] p-1.5 border border-natural-border rounded-lg bg-white focus:ring-2 focus:ring-natural-primary focus:outline-none"
                          />
                          <button
                            onClick={() => handleAddRole(min)}
                            className="px-2.5 py-1.5 bg-natural-primary text-white rounded-lg text-[11px] font-semibold hover:bg-[#3D4D3F] cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* ── END SUBFUNCTIONS ── */}

                </div>
              ))}
            </div>
          </div>

          {/* Directory Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-natural-primary" />
              <h3 className="text-base font-bold text-slate-850">Diretório de Usuários ({users.length})</h3>
            </div>

            <div className="bg-natural-light border border-natural-border rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-natural-border bg-natural-sidebar text-[10px] font-bold text-natural-primary tracking-wider uppercase">
                      <th className="py-3 px-5">Nome / Servo</th>
                      <th className="py-3 px-4">E-mail</th>
                      <th className="py-3 px-4">Cargo / Nível</th>
                      <th className="py-3 px-4">Ministério</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-natural-border text-xs text-natural-text">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-natural-sidebar/10 transition-colors">
                        <td className="py-3 px-5">
                          <div className="font-semibold text-slate-800">{u.name}</div>
                          <div className="text-[10px] text-[#8E8A82]">Desde: {new Date(u.joinedAt).toLocaleDateString('pt-BR')}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#8E8A82]">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase font-sans ${
                            u.role === 'admin' 
                              ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                              : u.role === 'leader' 
                              ? 'bg-natural-sidebar text-natural-primary border border-natural-border/40' 
                              : 'bg-[#F4F1EA] text-[#8E8A82] border border-natural-border/30'
                          }`}>
                            {u.role === 'admin' ? 'Administrador' : u.role === 'leader' ? 'Líder' : 'Voluntário'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {(() => {
                              const ids = u.ministryIds && u.ministryIds.length > 0 ? u.ministryIds : (u.ministryId ? [u.ministryId] : []);
                              if (ids.length === 0) return <span className="text-[10px] text-[#8E8A82]">Geral</span>;
                              return ids.map(mid => {
                                const m = ministries.find(mn => mn.id === mid);
                                return (
                                  <span key={mid} className="inline-flex items-center gap-1 bg-natural-sidebar border border-natural-border text-natural-primary text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                                    {m?.name || mid}
                                    <button onClick={() => {
                                      const newIds = ids.filter(i => i !== mid);
                                      onUpdateUserMinistries(u.id, newIds);
                                    }} className="text-rose-400 hover:text-rose-600 cursor-pointer">
                                      <X className="w-2 h-2" />
                                    </button>
                                  </span>
                                );
                              });
                            })()}
                            <select
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val) return;
                                const ids = u.ministryIds && u.ministryIds.length > 0 ? u.ministryIds : (u.ministryId ? [u.ministryId] : []);
                                if (!ids.includes(val)) onUpdateUserMinistries(u.id, [...ids, val]);
                                e.target.value = '';
                              }}
                              className="text-[9px] px-1 py-0.5 border border-dashed border-natural-border rounded-full bg-transparent text-[#8E8A82] cursor-pointer focus:outline-none focus:ring-1 focus:ring-natural-primary"
                              defaultValue=""
                            >
                              <option value="">+ Ministério</option>
                              {ministries.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={u.role}
                              onChange={(e) => onUpdateUserRole(u.id, e.target.value as any, u.ministryId)}
                              className="bg-transparent hover:bg-natural-sidebar px-1 px-1.5 py-1 text-[11px] rounded font-bold text-natural-primary cursor-pointer focus:outline-none"
                            >
                              <option value="volunteer">Tornar Voluntário</option>
                              <option value="leader">Promover a Líder</option>
                              <option value="admin">Tornar Admin</option>
                            </select>

                            {currentUser?.id !== u.id ? (
                              <button
                                onClick={() => onDeleteUser(u.id)}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                                title="Excluir Usuário"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                disabled
                                className="text-[#BFBBAE] p-1.5 rounded-lg opacity-40 cursor-not-allowed flex items-center justify-center"
                                title="Você não pode excluir a sua própria conta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
