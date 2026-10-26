import React, { useState } from 'react';
import {
  Zap,
  Plus,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { SavedSegment } from './SmartDataHub';

export type AutomationTriggerCode =
  | 'stock.below_min'
  | 'order.paid'
  | 'order.shipped'
  | 'flashsale.ended'
  | 'product.idle_60d'
  | 'margin.below_target'
  | 'label.printed';

export interface AutomationRule {
  id: string;
  name: string;
  triggerCode: AutomationTriggerCode;
  triggerLabel: string;
  segmentName: string;
  actionLabel: string;
  active: boolean;
  runsCount: number;
}

export interface AutomationExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  timestamp: string;
  targetDescription: string;
  status: 'SUCCESS' | 'FAILED';
  message: string;
}

const TRIGGER_OPTIONS: Array<{ code: AutomationTriggerCode; label: string }> = [
  { code: 'stock.below_min', label: 'Quando o estoque cair abaixo do mínimo' },
  { code: 'margin.below_target', label: 'Quando a margem cair abaixo da meta do canal' },
  { code: 'product.idle_60d', label: 'Quando o produto completar 60 dias sem vendas' },
  { code: 'order.paid', label: 'Quando o pedido for pago e confirmado' },
  { code: 'order.shipped', label: 'Quando o pacote for postado na transportadora' },
  { code: 'label.printed', label: 'Quando a etiqueta 10x15 for impressa' },
  { code: 'flashsale.ended', label: 'Quando uma oferta relâmpago terminar' },
];

const ACTION_OPTIONS = [
  'Criar rascunho de Pedido de Compra para o fornecedor',
  'Pausar anúncio no canal até revisão de preço',
  'Aplicar desconto de 25% e mover para vitrine Outlet',
  'Enviar link de rastreio por WhatsApp para a cliente',
  'Criar tarefa interna para conferência da expedição',
  'Notificar gerência financeira por e-mail',
];

interface AutomationEngineViewProps {
  savedSegments: SavedSegment[];
}

export const AutomationEngineView: React.FC<AutomationEngineViewProps> = ({
  savedSegments,
}) => {
  const [rules, setRules] = useState<AutomationRule[]>([
    {
      id: 'rule-1',
      name: 'Reposição Automática de Grade Infantil',
      triggerCode: 'stock.below_min',
      triggerLabel: 'Quando o estoque cair abaixo do mínimo',
      segmentName: 'Curva A — Infantil',
      actionLabel: 'Criar rascunho de Pedido de Compra para o fornecedor',
      active: true,
      runsCount: 18,
    },
    {
      id: 'rule-2',
      name: 'Trava de Segurança Contra Prejuízo no Canal',
      triggerCode: 'margin.below_target',
      triggerLabel: 'Quando a margem cair abaixo da meta do canal',
      segmentName: 'Todos os Produtos Publicados',
      actionLabel: 'Pausar anúncio no canal até revisão de preço',
      active: true,
      runsCount: 5,
    },
    {
      id: 'rule-3',
      name: 'Liquidação Inteligente de Giro Lento (60 dias)',
      triggerCode: 'product.idle_60d',
      triggerLabel: 'Quando o produto completar 60 dias sem vendas',
      segmentName: 'Coleção Anterior',
      actionLabel: 'Aplicar desconto de 25% e mover para vitrine Outlet',
      active: true,
      runsCount: 12,
    },
    {
      id: 'rule-4',
      name: 'Aviso de Rastreio no WhatsApp Pós-Postagem',
      triggerCode: 'order.shipped',
      triggerLabel: 'Quando o pacote for postado na transportadora',
      segmentName: 'Pedidos App & Marketplaces',
      actionLabel: 'Enviar link de rastreio por WhatsApp para a cliente',
      active: true,
      runsCount: 142,
    },
  ]);

  const [logs, setLogs] = useState<AutomationExecutionLog[]>([
    {
      id: 'exec-1',
      ruleId: 'rule-1',
      ruleName: 'Reposição Automática de Grade Infantil',
      timestamp: 'Hoje, 16:45',
      targetDescription: 'VEST-FLORAL-04 (Estoque atingiu 8 un.)',
      status: 'SUCCESS',
      message: 'Rascunho de Pedido de Compra #PC-2041 gerado com 40 unidades.',
    },
    {
      id: 'exec-2',
      ruleId: 'rule-4',
      ruleName: 'Aviso de Rastreio no WhatsApp Pós-Postagem',
      timestamp: 'Hoje, 16:30',
      targetDescription: 'Pedido #PED-98242 — Carolina Mendes',
      status: 'SUCCESS',
      message: 'Mensagem entregue com código SPXBR0491823901.',
    },
    {
      id: 'exec-3',
      ruleId: 'rule-2',
      ruleName: 'Trava de Segurança Contra Prejuízo no Canal',
      timestamp: 'Hoje, 15:10',
      targetDescription: 'CAM-LINHO-G no Mercado Livre',
      status: 'FAILED',
      message: 'Tempo limite excedido ao comunicar pausa temporária na plataforma.',
    },
  ]);

  const [newName, setNewName] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState<AutomationTriggerCode>('stock.below_min');
  const [selectedSegment, setSelectedSegment] = useState<string>(
    savedSegments[0]?.name || 'Todos os registros'
  );
  const [selectedAction, setSelectedAction] = useState<string>(ACTION_OPTIONS[0]);

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const trigObj = TRIGGER_OPTIONS.find((t) => t.code === selectedTrigger)!;
    const created: AutomationRule = {
      id: `rule-${Date.now()}`,
      name: newName.trim(),
      triggerCode: selectedTrigger,
      triggerLabel: trigObj.label,
      segmentName: selectedSegment,
      actionLabel: selectedAction,
      active: true,
      runsCount: 0,
    };
    setRules((prev) => [created, ...prev]);
    setNewName('');
  };

  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const handleReprocessLog = (logId: string) => {
    setLogs((prev) =>
      prev.map((l) =>
        l.id === logId
          ? {
              ...l,
              status: 'SUCCESS',
              timestamp: 'Agora mesmo',
              message: 'Reprocessado com sucesso: ação concluída e confirmada.',
            }
          : l
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-stone-900 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-extrabold tracking-tight">
          Motor de Automações (Quando → Se → Então)
        </h2>
        <p className="text-stone-300 text-xs mt-1 max-w-2xl">
          Configure regras automáticas que trabalham 24h por dia: proteja sua margem, gere pedidos de compra antes do estoque acabar e avise clientes a cada etapa.
        </p>
      </div>

      {/* Construtor Visual de Regra: QUANDO + SE + ENTÃO */}
      <form
        onSubmit={handleCreateRule}
        className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4"
      >
        <div className="font-bold text-stone-900 text-sm">
          Criar Nova Regra de Automação
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-stone-600 mb-1">
              Nome da Regra
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Repor Vestido Floral Curva A"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 font-semibold text-stone-900"
            />
          </div>

          <div>
            <label className="block font-bold text-rose-700 mb-1">
              1. QUANDO (Gatilho)
            </label>
            <select
              value={selectedTrigger}
              onChange={(e) => setSelectedTrigger(e.target.value as AutomationTriggerCode)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-stone-50 font-medium text-stone-900"
            >
              {TRIGGER_OPTIONS.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-amber-700 mb-1">
              2. SE (Segmento de Dados)
            </label>
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-stone-50 font-medium text-stone-900"
            >
              <option value="Todos os registros">Todos os registros</option>
              {savedSegments.map((s) => (
                <option key={s.id} value={s.name}>
                  Segmento: {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-emerald-700 mb-1">
              3. ENTÃO (Ação Automática)
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-stone-50 font-medium text-stone-900"
            >
              {ACTION_OPTIONS.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ativar Regra</span>
          </button>
        </div>
      </form>

      {/* Lista de Regras Ativas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`bg-white border rounded-xl p-4 shadow-xs flex flex-col justify-between gap-3 ${
              rule.active ? 'border-stone-200' : 'border-stone-200 opacity-60'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-stone-900 text-sm">{rule.name}</h4>
                <button
                  type="button"
                  onClick={() => handleToggleRule(rule.id)}
                  className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${
                    rule.active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {rule.active ? 'Ativa' : 'Pausada'}
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-200">
                <div>
                  <strong className="text-rose-700">Quando:</strong> {rule.triggerLabel}
                </div>
                <div>
                  <strong className="text-amber-700">Segmento:</strong> {rule.segmentName}
                </div>
                <div>
                  <strong className="text-emerald-700">Então:</strong> {rule.actionLabel}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
              <span>{rule.runsCount} execuções realizadas</span>
              <button
                type="button"
                onClick={() =>
                  setRules((prev) => prev.filter((item) => item.id !== rule.id))
                }
                className="text-stone-400 hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Histórico de Execuções com Botão Reprocessar */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-bold text-stone-900 text-sm">
            Histórico de Execuções das Regras
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
              <tr>
                <th className="py-2.5 px-4 font-bold">Horário</th>
                <th className="py-2.5 px-4 font-bold">Regra Acionada</th>
                <th className="py-2.5 px-4 font-bold">Item / Pedido</th>
                <th className="py-2.5 px-4 font-bold">Resultado</th>
                <th className="py-2.5 px-4 font-bold text-center">Situação</th>
                <th className="py-2.5 px-4 font-bold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50">
                  <td className="py-3 px-4 font-mono text-stone-500">{log.timestamp}</td>
                  <td className="py-3 px-4 font-bold text-stone-900">{log.ruleName}</td>
                  <td className="py-3 px-4 text-stone-700">{log.targetDescription}</td>
                  <td className="py-3 px-4 text-stone-600">{log.message}</td>
                  <td className="py-3 px-4 text-center">
                    {log.status === 'SUCCESS' ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sucesso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-rose-600">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Falha
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {log.status === 'FAILED' ? (
                      <button
                        type="button"
                        onClick={() => handleReprocessLog(log.id)}
                        className="px-3 py-1 rounded-lg bg-stone-900 hover:bg-rose-600 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reprocessar</span>
                      </button>
                    ) : (
                      <span className="text-stone-400">Concluído</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
