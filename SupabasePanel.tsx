/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, ShieldCheck, Zap, Copy, Check, Table, HelpCircle, HardDrive } from 'lucide-react';
import { SUPABASE_SQL_SCHEMA } from '../supabaseSchema';

export default function SupabasePanel() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const schemaTables = [
    {
      name: 'profiles (users)',
      desc: 'Perfis de usuários sincronizados via trigger com Supabase Auth.',
      cols: [
        { name: 'id', type: 'uuid (PK)', desc: 'Referencia auth.users.id' },
        { name: 'name', type: 'text', desc: 'Nome visível do servo/líder' },
        { name: 'email', type: 'text', desc: 'E-mail do usuário (único)' },
        { name: 'role', type: 'user_role (enum)', desc: 'admin | leader | volunteer' },
        { name: 'ministry_id', type: 'uuid (FK)', desc: 'Ministério principal vinculado ou nulo' },
        { name: 'joined_at', type: 'timestamptz', desc: 'Data de criação do perfil' },
      ],
      rls: 'Autenticados leem; Admins gerenciam todos os perfis; Usuários editam apenas o seu.'
    },
    {
      name: 'ministries',
      desc: 'Cargos e ministérios criados pelo administrador.',
      cols: [
        { name: 'id', type: 'uuid (PK)', desc: 'Identificador único' },
        { name: 'name', type: 'text', desc: 'Nome do ministério (Louvor, Mídia, etc.)' },
        { name: 'description', type: 'text', desc: 'Objetivo do ministério' },
        { name: 'leader_id', type: 'uuid (FK)', desc: 'Líder nomeado (profiles.id)' },
        { name: 'created_at', type: 'timestamptz', desc: 'Data de fundação' },
      ],
      rls: 'Parcial: Qualquer autenticado pode ver; Apenas administrador pode criar/deletar/editar.'
    },
    {
      name: 'schedules',
      desc: 'Escalas de cultos e eventos do calendário.',
      cols: [
        { name: 'id', type: 'uuid (PK)', desc: 'Identificador único' },
        { name: 'title', type: 'text', desc: 'Título da escala (Culto de Domingo, etc)' },
        { name: 'description', type: 'text', desc: 'Instruções adicionais' },
        { name: 'ministry_id', type: 'uuid (FK)', desc: 'Ministério responsável' },
        { name: 'event_date', type: 'timestamptz', desc: 'Data/Hora do evento' },
        { name: 'is_recurring', type: 'boolean', desc: 'Se repete de forma contínua' },
        { name: 'recurrence_pattern', type: 'recurrence_type', desc: 'weekly | biweekly | monthly | none' },
        { name: 'status', type: 'schedule_status', desc: 'draft (rascunho) | published (publicada)' },
      ],
      rls: 'Autenticados leem escalas publicadas; Líderes do ministério gerenciam rascunhos e publicações.'
    },
    {
      name: 'assignments',
      desc: 'Mapeamento de servos escalados para cada evento/carga.',
      cols: [
        { name: 'id', type: 'uuid (PK)', desc: 'Identificador único' },
        { name: 'schedule_id', type: 'uuid (FK)', desc: 'Escala do concerto' },
        { name: 'volunteer_id', type: 'uuid (FK)', desc: 'Voluntário designado' },
        { name: 'role_in_ministry', type: 'text', desc: 'Função no evento (ex: Vocal, Câmera 1)' },
        { name: 'status', type: 'status_enum', desc: 'pending | confirmed | declined' },
        { name: 'notified_at', type: 'timestamptz', desc: 'Marcação temporal de notificação disparada' },
      ],
      rls: 'Líderes gerenciam atribuições do ministério; Voluntários escalados podem atualizar apenas o seu próprio campo status.'
    },
    {
      name: 'songs',
      desc: 'Lista de músicas do ministério de Louvor, integrada com o ministério de Mídia.',
      cols: [
        { name: 'id', type: 'uuid (PK)', desc: 'Identificador único' },
        { name: 'schedule_id', type: 'uuid (FK)', desc: 'Reflete o cronograma de Louvor' },
        { name: 'title', type: 'text', desc: 'Título da composição' },
        { name: 'artist', type: 'text', desc: 'Artista/Banda ministrante' },
        { name: 'link_letras', type: 'text', desc: 'Link dinâmico Letras.mus.br' },
        { name: 'link_cifra', type: 'text', desc: 'Link dinâmico CifraClub.com.br' },
      ],
      rls: 'Leituras rápidas para Louvor e Mídia; Criação restrita a Líderes de Louvor e Admins.'
    }
  ];

  return (
    <div id="supabase-config-panel" className="bg-natural-bg min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-natural-light rounded-2xl p-6 shadow-xs border border-natural-border flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-natural-sidebar text-natural-primary rounded-xl">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-bold text-natural-orange uppercase tracking-widest block mb-1">Arquitetura de Banco de Dados</span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Supabase & PostgreSQL Blueprint</h1>
              <p className="text-natural-text mt-1 max-w-xl text-sm leading-relaxed">
                Modelagem relacional completa, automações com Triggers nativas para sincronização de contas de e-mail e Row Level Security (RLS) para total privacidade.
              </p>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs cursor-pointer border-none ${
              copied 
                ? 'bg-natural-primary text-white hover:bg-[#3D4D3F]' 
                : 'bg-natural-orange text-white hover:bg-[#C25A3B]'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado para o Clipboard!' : 'Copiar SQL Completo'}
          </button>
        </div>

        {/* Benefits & RLS Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-natural-light rounded-2xl p-5 border border-natural-border shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 text-natural-primary font-bold">
              <ShieldCheck className="w-5 h-5" />
              <h3>Row Level Security (RLS)</h3>
            </div>
            <p className="text-xs text-natural-text leading-relaxed">
              Mecanismo nativo do PostgreSQL que restringe registros a nível de linha. Impede vazamento de dados, permitindo que voluntários confirmem apenas suas próprias escalas, e líderes gerenciem exclusivamente seus ministérios.
            </p>
          </div>

          <div className="bg-natural-light rounded-2xl p-5 border border-natural-border shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 text-natural-orange font-bold">
              <Zap className="w-5 h-5" />
              <h3>Trigger Auto-Sincronização</h3>
            </div>
            <p className="text-xs text-natural-text leading-relaxed">
              Disparador SQL acoplado em <code className="bg-natural-sidebar px-1 py-0.5 rounded text-[10px] text-slate-800">auth.users</code>. Assim que um Servo realiza cadastro na plataforma por e-mail, seu cadastro espelha automaticamente informações na tabela pública <code className="bg-natural-sidebar px-1 py-0.5 rounded text-[10px] text-slate-800 font-semibold">profiles</code>.
            </p>
          </div>

          <div className="bg-natural-light rounded-2xl p-5 border border-natural-border shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 text-natural-primary font-bold">
              <HardDrive className="w-5 h-5" />
              <h3>Modelagem de Repertório</h3>
            </div>
            <p className="text-xs text-natural-text leading-relaxed">
              Diferencial inteligente: o repertório de louvor insere as músicas na escala e o banco calcula as rotas de pesquisas dinâmicas. Com RLS aberto entre Mídia e Louvor, os operadores de slides obtêm setlists sem fricção de arquivos.
            </p>
          </div>

        </div>

        {/* Database Modeling Visualizer */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table className="w-5 h-5 text-natural-primary" />
              <h2 className="text-lg font-bold text-slate-800">Mapeamento de Tabelas Relacionais</h2>
            </div>
            <span className="text-xs text-natural-primary bg-natural-sidebar border border-natural-border/30 px-2.5 py-1 rounded-full font-bold">PostgreSQL Relacional</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {schemaTables.map((table, i) => (
              <div key={i} className="bg-natural-light rounded-2xl border border-natural-border shadow-xs overflow-hidden flex flex-col justify-between">
                <div className="p-5 border-b border-natural-border bg-natural-sidebar/20">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-natural-primary bg-natural-sidebar px-2.5 py-1 rounded-lg border border-natural-border/40">
                      public.{table.name}
                    </span>
                    <span className="text-xs text-[#8E8A82]">Tabela PostgreSQL</span>
                  </div>
                  <p className="text-xs text-natural-text mt-2 leading-relaxed">{table.desc}</p>
                </div>
                
                {/* Columns */}
                <div className="divide-y divide-natural-border flex-1 overflow-x-auto min-h-[180px]">
                  {table.cols.map((col, idx) => (
                    <div key={idx} className="p-3 px-5 flex items-center justify-between text-xs gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-slate-800">{col.name}</span>
                        <HelpCircle className="w-3.5 h-3.5 text-natural-border shrink-0" title={col.desc} />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-natural-orange bg-[#FDF0EB] px-1.5 py-0.5 rounded text-[10px] font-bold border border-natural-orange/15">
                          {col.type}
                        </span>
                        <span className="text-[11px] text-[#8E8A82] hidden sm:inline max-w-[200px] text-right truncate">
                          {col.desc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 bg-natural-sidebar/30 border-t border-natural-border text-[11px] text-natural-text flex items-start gap-2">
                  <strong className="text-white font-bold shrink-0 uppercase tracking-wider text-[9px] bg-natural-primary px-1.5 py-0.5 rounded mt-0.5">RLS:</strong>
                  <span>{table.rls}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Code Block SQL Editor Style */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Script SQL Completo para Copiar e Rodar no Supabase</h2>
            <p className="text-xs text-natural-text">Copia o script e cole direto no editor SQL do seu painel Supabase</p>
          </div>
          <div className="bg-[#2D332F] rounded-2xl overflow-hidden border border-[#3E4540] relative group shadow-lg">
            <div className="flex items-center justify-between px-5 py-3 bg-[#242A26] border-b border-white/[0.05]">
              <div className="flex items-center gap-2 text-xs text-[#E2DED0] font-mono">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block"></span>
                <span className="ml-2 font-semibold">setup_database.sql</span>
              </div>
              <button
                onClick={handleCopy}
                className="text-[#E2DED0] hover:text-white transition-colors p-1 cursor-pointer"
                title="Copiar Código"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <pre className="p-6 text-xs text-[#C6CFC9] font-mono overflow-x-auto max-h-[460px] leading-relaxed">
              <code>{SUPABASE_SQL_SCHEMA}</code>
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
}
