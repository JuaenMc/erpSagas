import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Sliders,
  Check,
  ArrowUpRight,
} from 'lucide-react';
import { MarketplaceChannel, ProductVariation } from '../types';
import {
  ChannelFeeConfigModel,
  DEFAULT_CHANNEL_FEE_CONFIGS,
  ChannelProfitBreakdown,
} from '../logic/profit-calculator';
import { profitCalculatorService } from '../services/ProfitCalculatorService';

interface ChannelProfitTableProps {
  productId?: string;
  cmv: number;
  basePrice: number;
  variations?: ProductVariation[];
  onApplyChannelPrices?: (prices: Record<MarketplaceChannel, number>) => void;
  feeConfigs?: ChannelFeeConfigModel[];
  onUpdateFeeConfigs?: (configs: ChannelFeeConfigModel[]) => void;
}

export const ChannelProfitTable: React.FC<ChannelProfitTableProps> = ({
  productId = 'prod-1-vestido-floral',
  cmv: initialCmv,
  basePrice: initialBasePrice,
  variations = [],
  onApplyChannelPrices,
  feeConfigs: externalConfigs,
  onUpdateFeeConfigs,
}) => {
  const [selectedSku, setSelectedSku] = useState<string>(
    variations[0]?.sku || 'PADRAO'
  );

  const activeVariation = useMemo(
    () => variations.find((v) => v.sku === selectedSku),
    [variations, selectedSku]
  );

  const [localCmv, setLocalCmv] = useState<number>(
    activeVariation?.costPrice ?? initialCmv
  );
  const [localBasePrice, setLocalBasePrice] = useState<number>(
    activeVariation?.price ?? initialBasePrice
  );
  const [debouncedCmv, setDebouncedCmv] = useState<number>(localCmv);
  const [debouncedBasePrice, setDebouncedBasePrice] = useState<number>(localBasePrice);
  const [globalTargetMargin, setGlobalTargetMargin] = useState<number>(30);

  const [configs, setConfigs] = useState<ChannelFeeConfigModel[]>(
    externalConfigs || DEFAULT_CHANNEL_FEE_CONFIGS
  );

  // Preços praticados por canal
  const [channelPrices, setChannelPrices] = useState<Record<MarketplaceChannel, number>>({
    APP_SAGAS: initialBasePrice,
    SHOPEE: initialBasePrice,
    MERCADO_LIVRE: initialBasePrice,
    TIKTOK_SHOP: initialBasePrice,
  });

  const [expandedChannels, setExpandedChannels] = useState<Record<string, boolean>>({});
  const [appliedChannelFeedback, setAppliedChannelFeedback] = useState<string | null>(null);
  const [showFeeEditor, setShowFeeEditor] = useState(false);

  // Atualiza quando o usuário troca a variação (SKU) selecionada ou altera dados gerais
  useEffect(() => {
    const nextCmv = activeVariation?.costPrice ?? initialCmv;
    const nextPrice = activeVariation?.price ?? initialBasePrice;
    setLocalCmv(nextCmv);
    setLocalBasePrice(nextPrice);
    setChannelPrices({
      APP_SAGAS: nextPrice,
      SHOPEE: nextPrice,
      MERCADO_LIVRE: nextPrice,
      TIKTOK_SHOP: nextPrice,
    });
  }, [selectedSku, activeVariation, initialCmv, initialBasePrice]);

  // Recálculo silencioso em tempo real (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCmv(localCmv);
      setDebouncedBasePrice(localBasePrice);
    }, 300);
    return () => clearTimeout(timer);
  }, [localCmv, localBasePrice]);

  // Simulações por canal via ProfitCalculatorService
  const simulations: ChannelProfitBreakdown[] = useMemo(() => {
    profitCalculatorService.syncFeeConfigs(configs);
    return configs.map((cfg) => {
      const currentChannelPrice = channelPrices[cfg.channel] ?? debouncedBasePrice;
      const sim = profitCalculatorService.simulate(productId, cfg.channel, {
        customCostPrice: debouncedCmv,
        customSellingPrice: currentChannelPrice,
        variationIdOrSku: selectedSku,
        customTargetMarginPct: globalTargetMargin,
      });
      // Garante uso do preço sugerido calculado por suggestPriceForMargin(productId, channelId, marginPct)
      const suggested = profitCalculatorService.suggestPriceForMargin(
        productId,
        cfg.channel,
        globalTargetMargin,
        {
          customCostPrice: debouncedCmv,
          variationIdOrSku: selectedSku,
        }
      );
      return {
        ...sim,
        suggestedPrice: suggested.suggestedPrice,
        breakEvenPrice: suggested.breakEvenPrice,
      };
    });
  }, [configs, channelPrices, debouncedCmv, debouncedBasePrice, globalTargetMargin, productId, selectedSku]);

  // Canais com prejuízo (abaixo do ponto de equilíbrio)
  const losingChannels = simulations.filter((s) => s.isBelowBreakEven);

  // Contagem de canais abaixo da meta e média ponderada de margem
  const channelsBelowTargetCount = simulations.filter(
    (s) => s.marginPct < globalTargetMargin - 0.05
  ).length;

  const weightedAverageMargin = useMemo(() => {
    const totalRevenue = simulations.reduce((acc, s) => acc + s.sellingPrice, 0);
    const totalProfit = simulations.reduce((acc, s) => acc + s.netProfit, 0);
    return totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  }, [simulations]);

  const toggleExpand = (channel: string) => {
    setExpandedChannels((prev) => ({ ...prev, [channel]: !prev[channel] }));
  };

  const handleApplySuggestedPrice = (sim: ChannelProfitBreakdown) => {
    const updated = {
      ...channelPrices,
      [sim.channel]: sim.suggestedPrice,
    };
    setChannelPrices(updated);
    onApplyChannelPrices?.(updated);
    setAppliedChannelFeedback(sim.channel);
    setTimeout(() => setAppliedChannelFeedback(null), 2000);
  };

  const handleEqualizeAllToTarget = () => {
    const updated: Record<MarketplaceChannel, number> = { ...channelPrices };
    simulations.forEach((sim) => {
      if (sim.marginPct < globalTargetMargin) {
        updated[sim.channel] = sim.suggestedPrice;
      }
    });
    setChannelPrices(updated);
    onApplyChannelPrices?.(updated);
    setAppliedChannelFeedback('ALL');
    setTimeout(() => setAppliedChannelFeedback(null), 2000);
  };

  const handleFeeChange = (
    channel: MarketplaceChannel,
    field: keyof ChannelFeeConfigModel,
    value: number
  ) => {
    const updated = configs.map((c) =>
      c.channel === channel ? { ...c, [field]: value, updatedAt: new Date().toISOString() } : c
    );
    setConfigs(updated);
    onUpdateFeeConfigs?.(updated);
  };

  const renderSemaphoreStatus = (sim: ChannelProfitBreakdown) => {
    if (sim.marginPct >= globalTargetMargin - 0.05) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <span>🟢</span>
          <span>Na meta</span>
        </span>
      );
    }
    if (sim.marginPct >= 15) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <span>🟡</span>
          <span>Abaixo da meta</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700">
        <span>🔴</span>
        <span>{sim.isBelowBreakEven ? 'Prejuízo' : 'Margem crítica'}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Topo: Seletor de Variação (SKU), Custo, Meta e Legenda Visível */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Seletor de Variação (SKU) */}
          <div className="flex flex-wrap items-center gap-3">
            {variations.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                  Variação (SKU)
                </label>
                <select
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 bg-stone-50 text-xs font-bold text-stone-900 focus:outline-rose-500"
                >
                  {variations.map((v) => (
                    <option key={v.sku} value={v.sku}>
                      {v.sku} — {v.color} · Tam {v.size}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                Custo do Produto (CMV)
              </label>
              <div className="flex items-center gap-1 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5">
                <span className="text-xs text-stone-500 font-semibold">R$</span>
                <input
                  type="number"
                  step="0.50"
                  value={localCmv}
                  onChange={(e) => setLocalCmv(parseFloat(e.target.value) || 0)}
                  className="w-20 bg-transparent font-mono font-bold text-xs text-stone-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                Meta de Margem
              </label>
              <div className="flex items-center gap-1 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5">
                <input
                  type="number"
                  min="5"
                  max="70"
                  value={globalTargetMargin}
                  onChange={(e) => setGlobalTargetMargin(parseFloat(e.target.value) || 30)}
                  className="w-12 bg-transparent font-mono font-bold text-xs text-stone-900 focus:outline-none"
                />
                <span className="text-xs text-stone-500 font-semibold">%</span>
              </div>
            </div>
          </div>

          {/* Legenda Visível do Semáforo + Botão Configurar Taxas */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600">
            <div className="flex items-center gap-3 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200">
              <span>🟢 ≥ {globalTargetMargin}% (Meta)</span>
              <span className="text-stone-300">·</span>
              <span>🟡 15%–{globalTargetMargin}%</span>
              <span className="text-stone-300">·</span>
              <span>🔴 &lt; 15%</span>
            </div>

            <button
              type="button"
              onClick={() => setShowFeeEditor(!showFeeEditor)}
              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Taxas dos Canais</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alerta Vermelho de Prejuízo Garantido (Abaixo do Preço de Equilíbrio) */}
      {losingChannels.map((lc) => (
        <div
          key={lc.channel}
          className="bg-rose-600 text-white rounded-xl px-4 py-3 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Prejuízo garantido no {lc.channelLabel}:</strong> cada venda gera perda de{' '}
              <strong>R$ {Math.abs(lc.netProfit).toFixed(2).replace('.', ',')}</strong>. O preço mínimo para empatar custos é{' '}
              <strong>R$ {lc.breakEvenPrice.toFixed(2).replace('.', ',')}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleApplySuggestedPrice(lc)}
            className="px-3 py-1.5 rounded-lg bg-white text-rose-700 font-bold text-xs hover:bg-rose-50 shrink-0 cursor-pointer"
          >
            Subir p/ R$ {lc.suggestedPrice.toFixed(2).replace('.', ',')}
          </button>
        </div>
      ))}

      {/* Painel de Edição de Taxas dos Canais */}
      {showFeeEditor && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-800 text-xs">
              Taxas Vigentes por Canal (alterações ficam registradas no histórico de auditoria)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {configs.map((cfg) => (
              <div key={cfg.id} className="bg-white p-3 rounded-lg border border-stone-200 space-y-2 text-xs">
                <div className="font-bold text-stone-900">{cfg.channelLabel}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-stone-500 block">Comissão (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={cfg.commissionPct}
                      onChange={(e) =>
                        handleFeeChange(cfg.channel, 'commissionPct', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2 py-1 border border-stone-300 rounded font-mono font-bold text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-500 block">Taxa Fixa (R$)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={cfg.fixedFeePerItem}
                      onChange={(e) =>
                        handleFeeChange(cfg.channel, 'fixedFeePerItem', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2 py-1 border border-stone-300 rounded font-mono font-bold text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-500 block">Imposto (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={cfg.taxPct}
                      onChange={(e) =>
                        handleFeeChange(cfg.channel, 'taxPct', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2 py-1 border border-stone-300 rounded font-mono font-bold text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-500 block">Embalagem (R$)</label>
                    <input
                      type="number"
                      step="0.25"
                      value={cfg.packagingCost}
                      onChange={(e) =>
                        handleFeeChange(cfg.channel, 'packagingCost', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2 py-1 border border-stone-300 rounded font-mono font-bold text-stone-900"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela Resumo Obrigatória: Canal | Preço | Lucro Líq. | Margem % | Status | Ação */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
              <tr>
                <th className="py-3 px-4 font-bold">Canal</th>
                <th className="py-3 px-4 font-bold">Preço</th>
                <th className="py-3 px-4 font-bold text-right">Lucro Líq.</th>
                <th className="py-3 px-4 font-bold text-right">Margem %</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {simulations.map((sim) => {
                const isExpanded = !!expandedChannels[sim.channel];
                const isBelowTarget = sim.marginPct < globalTargetMargin - 0.05;
                const isApplied = appliedChannelFeedback === sim.channel;

                return (
                  <React.Fragment key={sim.channel}>
                    <tr
                      onClick={() => toggleExpand(sim.channel)}
                      className={`cursor-pointer transition-colors ${
                        sim.isBelowBreakEven
                          ? 'bg-rose-50/60 hover:bg-rose-50'
                          : 'hover:bg-stone-50'
                      }`}
                    >
                      {/* 1. Canal */}
                      <td className="py-3.5 px-4 font-bold text-stone-900">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-stone-500 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                          )}
                          <span>{sim.channelLabel}</span>
                        </div>
                      </td>

                      {/* 2. Preço */}
                      <td
                        className="py-3.5 px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-lg px-2.5 py-1 w-28 focus-within:ring-2 focus-within:ring-rose-500">
                          <span className="text-stone-400 font-semibold">R$</span>
                          <input
                            type="number"
                            step="0.50"
                            value={channelPrices[sim.channel] ?? debouncedBasePrice}
                            onChange={(e) =>
                              setChannelPrices((prev) => ({
                                ...prev,
                                [sim.channel]: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full font-mono font-bold text-stone-900 focus:outline-none"
                          />
                        </div>
                      </td>

                      {/* 3. Lucro Líq. */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                        <span className={sim.netProfit >= 0 ? 'text-stone-900' : 'text-rose-600'}>
                          R$ {sim.netProfit.toFixed(2).replace('.', ',')}
                        </span>
                      </td>

                      {/* 4. Margem % */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                        <span
                          className={
                            sim.marginPct >= globalTargetMargin - 0.05
                              ? 'text-emerald-700'
                              : sim.marginPct >= 15
                              ? 'text-amber-700'
                              : 'text-rose-600'
                          }
                        >
                          {sim.marginPct.toFixed(1)}%
                        </span>
                      </td>

                      {/* 5. Status */}
                      <td className="py-3.5 px-4 text-center">
                        {renderSemaphoreStatus(sim)}
                      </td>

                      {/* 6. Ação (SOMENTE quando margem < meta, com valor em reais) */}
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isBelowTarget ? (
                          <button
                            type="button"
                            onClick={() => handleApplySuggestedPrice(sim)}
                            className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-rose-600 text-white font-bold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>
                              Subir p/ R$ {sim.suggestedPrice.toFixed(2).replace('.', ',')}
                            </span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-stone-400 font-medium inline-flex items-center gap-1">
                            {isApplied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700 font-semibold">Ajustado</span>
                              </>
                            ) : (
                              <span>Meta atingida</span>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Detalhe no Clique: Accordion com Breakdown Completo */}
                    {isExpanded && (
                      <tr className="bg-stone-50/90 border-b border-stone-200">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="text-[11px] font-bold text-stone-500">
                              Detalhamento do cálculo neste canal:
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
                              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                                <span className="text-[11px] text-stone-500 block">Comissão ({sim.commissionPct + sim.paymentFeePct}%)</span>
                                <span className="font-mono font-bold text-rose-600">
                                  − R$ {(sim.commissionAmount + sim.paymentFeeAmount).toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                                <span className="text-[11px] text-stone-500 block">Taxa fixa por item</span>
                                <span className="font-mono font-bold text-rose-600">
                                  − R$ {sim.fixedFeeApplied.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                                <span className="text-[11px] text-stone-500 block">Imposto ({sim.taxPct}%)</span>
                                <span className="font-mono font-bold text-rose-600">
                                  − R$ {sim.taxAmount.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                                <span className="text-[11px] text-stone-500 block">Frete estimado</span>
                                <span className="font-mono font-bold text-rose-600">
                                  − R$ {sim.shippingCostEstimate.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                                <span className="text-[11px] text-stone-500 block">Embalagem</span>
                                <span className="font-mono font-bold text-rose-600">
                                  − R$ {sim.packagingCost.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                                <span className="text-[11px] text-stone-500 block">Custo do produto</span>
                                <span className="font-mono font-bold text-rose-600">
                                  − R$ {sim.cmv.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                              <div className="bg-stone-100 p-2.5 rounded-lg border border-stone-300">
                                <span className="text-[11px] text-stone-600 font-semibold block">Preço de equilíbrio</span>
                                <span className="font-mono font-bold text-stone-900">
                                  R$ {sim.breakEvenPrice.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* Rodapé Obrigatório: Média Ponderada + Canais abaixo da meta + Botão Global */}
            <tfoot className="bg-stone-50 border-t border-stone-200 text-xs">
              <tr>
                <td colSpan={6} className="py-3 px-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 text-stone-700">
                      <span>
                        Margem média ponderada:{' '}
                        <strong className="font-mono text-stone-900">
                          {weightedAverageMargin.toFixed(1)}%
                        </strong>
                      </span>
                      <span className="text-stone-300">·</span>
                      <span>
                        {channelsBelowTargetCount === 0 ? (
                          <strong className="text-emerald-700">
                            Todos os canais estão dentro da meta
                          </strong>
                        ) : (
                          <strong className="text-amber-700">
                            {channelsBelowTargetCount}{' '}
                            {channelsBelowTargetCount === 1
                              ? 'canal abaixo da meta'
                              : 'canais abaixo da meta'}
                          </strong>
                        )}
                      </span>
                    </div>

                    {channelsBelowTargetCount > 0 && (
                      <button
                        type="button"
                        onClick={handleEqualizeAllToTarget}
                        className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        Igualar tudo para a meta ({globalTargetMargin}%)
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
