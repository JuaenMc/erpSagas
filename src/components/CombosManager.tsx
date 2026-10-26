import React, { useState } from 'react';
import {
  Layers,
  Plus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Percent,
  Calculator,
  ChevronRight,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  ShoppingBag,
  DollarSign,
} from 'lucide-react';
import { ComboRuleModel, ComboType, Product } from '../types';
import { evaluateComboRule, type ComboItem } from '../logic/combo-engine';

interface CombosManagerProps {
  combos: ComboRuleModel[];
  setCombos: React.Dispatch<React.SetStateAction<ComboRuleModel[]>>;
  products: Product[];
}

export const CombosManager: React.FC<CombosManagerProps> = ({
  combos,
  setCombos,
  products,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ComboRuleModel | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    tag: string;
    type: ComboType;
    requiredQuantity: number;
    paidQuantity: number;
    bundlePrice: number;
    eligibleCategoryIds: string[];
    fixedProductIds: string[];
    channelScope: 'APP_ONLY' | 'ALL_CHANNELS';
    active: boolean;
    description: string;
    priority: number;
  }>({
    name: 'Combo Especial Leve 3 Pague 2',
    tag: 'Leve 3 Pague 2',
    type: 'BUY_X_PAY_Y',
    requiredQuantity: 3,
    paidQuantity: 2,
    bundlePrice: 0,
    eligibleCategoryIds: ['*'],
    fixedProductIds: [],
    channelScope: 'ALL_CHANNELS',
    active: true,
    description: 'Leve 3 peças quaisquer da loja e a de menor valor sai inteiramente grátis!',
    priority: 1,
  });

  // Simulator state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([
    'prod-1-vestido-floral',
    'prod-2-jardineira-unissex',
    'prod-4-vestido-longo',
  ]);

  const [activeSimulatorComboId, setActiveSimulatorComboId] = useState<string>(
    combos[0]?.id || 'combo-3-100'
  );

  const activeComboRule = combos.find(c => c.id === activeSimulatorComboId) || combos[0];

  // Convert selected products to items for pure logic engine
  const simulatedItems: ComboItem[] = selectedProductIds.map(id => {
    const p = products.find(prod => prod.id === id);
    return {
      id: p?.id || id,
      sku: p?.variations[0]?.sku || `${p?.id}-SKU`,
      name: p?.title || 'Produto',
      categoryId: p?.categoryId || 'infantil',
      unitPrice: p?.basePrice || 50,
      costPrice: p?.costPrice || (p?.basePrice || 50) * 0.4,
      quantity: 1,
    };
  });

  const evaluationResult = activeComboRule
    ? evaluateComboRule(simulatedItems, {
        id: activeComboRule.id,
        name: activeComboRule.name,
        tag: activeComboRule.tag,
        type: activeComboRule.type,
        requiredQuantity: activeComboRule.requiredQuantity,
        paidQuantity: activeComboRule.paidQuantity,
        bundlePrice: activeComboRule.bundlePrice,
        eligibleCategoryIds: activeComboRule.eligibleCategoryIds,
        fixedProductIds: activeComboRule.fixedProductIds,
        channelScope: activeComboRule.channelScope,
        active: activeComboRule.active,
        priority: activeComboRule.priority,
      })
    : null;

  const handleToggleActive = (id: string) => {
    setCombos(prev =>
      prev.map(c => (c.id === id ? { ...c, active: !c.active } : c))
    );
  };

  const handleOpenCreate = () => {
    setEditingCombo(null);
    setFormData({
      name: '',
      tag: '',
      type: 'FIXED_PRICE',
      requiredQuantity: 3,
      paidQuantity: 2,
      bundlePrice: 100,
      eligibleCategoryIds: ['infantil', 'feminino'],
      fixedProductIds: [],
      channelScope: 'ALL_CHANNELS',
      active: true,
      description: '',
      priority: 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (combo: ComboRuleModel) => {
    setEditingCombo(combo);
    setFormData({
      name: combo.name,
      tag: combo.tag,
      type: combo.type || 'FIXED_PRICE',
      requiredQuantity: combo.requiredQuantity,
      paidQuantity: combo.paidQuantity || 2,
      bundlePrice: combo.bundlePrice,
      eligibleCategoryIds: combo.eligibleCategoryIds,
      fixedProductIds: combo.fixedProductIds || [],
      channelScope: combo.channelScope,
      active: combo.active,
      description: combo.description,
      priority: combo.priority,
    });
    setIsModalOpen(true);
  };

  const handleSaveCombo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingCombo) {
      setCombos(prev =>
        prev.map(c =>
          c.id === editingCombo.id
            ? {
                ...c,
                ...formData,
              }
            : c
        )
      );
    } else {
      const newCombo: ComboRuleModel = {
        id: `combo-${Date.now()}`,
        ...formData,
        totalOrdersGenerated: 0,
      };
      setCombos(prev => [newCombo, ...prev]);
    }
    setIsModalOpen(false);
  };

  const toggleCategory = (cat: string) => {
    setFormData(prev => {
      const exists = prev.eligibleCategoryIds.includes(cat);
      if (exists) {
        return {
          ...prev,
          eligibleCategoryIds: prev.eligibleCategoryIds.filter(c => c !== cat),
        };
      } else {
        return {
          ...prev,
          eligibleCategoryIds: [...prev.eligibleCategoryIds, cat],
        };
      }
    });
  };

  const toggleSimulatorProduct = (id: string) => {
    setSelectedProductIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Title */}
      <div className="bg-gradient-to-r from-stone-900 via-rose-950 to-stone-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <Layers className="w-80 h-80 text-rose-300" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Motor de Combos Dinâmicos & Simulador de Margem</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Gestão Estratégica de Combos & Kits
          </h2>
          <p className="text-stone-300 text-sm mt-2 leading-relaxed">
            Crie campanhas flexíveis: <strong>"3 por R$100"</strong>, <strong>"Leve 3 Pague 2"</strong>, <strong>"Combo Fixo (A+B)"</strong> e <strong>"Combo Variável por Categoria"</strong>. 
            O ERP simula a margem de contribuição líquida e efetua o rateio fiscal automático (NF-e) com reserva atômica de estoque por SKU.
          </p>

          <div className="flex flex-wrap gap-4 mt-5 text-xs">
            <div className="bg-stone-800/80 border border-stone-700 px-3 py-2 rounded-lg flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-stone-400">Aumento no Ticket Médio</p>
                <p className="font-bold text-white text-sm">+38.5% no App</p>
              </div>
            </div>
            <div className="bg-stone-800/80 border border-stone-700 px-3 py-2 rounded-lg flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-stone-400">Margem Média Preservada</p>
                <p className="font-bold text-white text-sm">~42% de Margem Bruta</p>
              </div>
            </div>
            <div className="bg-stone-800/80 border border-stone-700 px-3 py-2 rounded-lg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <div>
                <p className="text-stone-400">Conformidade SEFAZ</p>
                <p className="font-bold text-white text-sm">Rateio Proporcional XML</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Combos List & Interactive Rateio Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Lista de Regras de Combo (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-rose-600" />
                Regras de Combos Cadastradas
              </h3>
              <p className="text-xs text-stone-500">
                Ativas no App sagas.moda e sincronizadas nos canais
              </p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Combo</span>
            </button>
          </div>

          <div className="space-y-3">
            {combos.map(combo => (
              <div
                key={combo.id}
                className={`bg-white border rounded-xl p-4 transition-all ${
                  combo.active
                    ? 'border-rose-200 shadow-xs'
                    : 'border-stone-200 opacity-60 bg-stone-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-stone-900 text-sm">{combo.name}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        {combo.tag}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                        {combo.type === 'BUY_X_PAY_Y'
                          ? 'Leve X Pague Y'
                          : combo.type === 'FIXED_BUNDLE'
                          ? 'Combo Fixo (A+B)'
                          : 'Preço Fechado'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          combo.channelScope === 'APP_ONLY'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}
                      >
                        {combo.channelScope === 'APP_ONLY' ? '📱 Exclusivo App' : '🌐 Omnichannel'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600">{combo.description}</p>
                  </div>

                  <button
                    onClick={() => handleToggleActive(combo.id)}
                    className="text-stone-400 hover:text-stone-600 cursor-pointer"
                    title={combo.active ? 'Desativar combo' : 'Ativar combo'}
                  >
                    {combo.active ? (
                      <ToggleRight className="w-6 h-6 text-rose-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-stone-400" />
                    )}
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-4 text-stone-600">
                    <div>
                      <span className="text-stone-400">Regra:</span>{' '}
                      <strong className="text-stone-800">
                        {combo.type === 'BUY_X_PAY_Y'
                          ? `Leve ${combo.requiredQuantity} Pague ${combo.paidQuantity}`
                          : `${combo.requiredQuantity} peças por R$ ${combo.bundlePrice.toFixed(2)}`}
                      </strong>
                    </div>
                    <div>
                      <span className="text-stone-400">Categorias:</span>{' '}
                      <span className="text-stone-700 capitalize">
                        {combo.eligibleCategoryIds.join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveSimulatorComboId(combo.id);
                      }}
                      className="text-xs font-semibold text-stone-600 hover:text-stone-900 px-2 py-1 rounded bg-stone-100 hover:bg-stone-200"
                    >
                      Testar no Simulador
                    </button>
                    <button
                      onClick={() => handleOpenEdit(combo)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-2 py-1 rounded hover:bg-rose-50"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Sandbox Interativo de Rateio & Margem (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-stone-900 text-sm">
                  Simulador de Margem & Rateio (NF-e)
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-mono">
                {activeComboRule?.tag}
              </span>
            </div>

            <p className="text-xs text-stone-500 mt-2">
              Selecione peças para simular quanto sobra de <strong>lucro líquido</strong> e como a SEFAZ recebe o rateio:
            </p>

            {/* Product Picker */}
            <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {products.map(product => {
                const isSelected = selectedProductIds.includes(product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => toggleSimulatorProduct(product.id)}
                    className={`w-full text-left p-2 rounded-lg border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-rose-400 bg-rose-50/70 text-rose-950 font-medium'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                          isSelected ? 'bg-rose-600 text-white' : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {isSelected ? '✓' : '+'}
                      </span>
                      <span className="truncate">{product.title}</span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="font-bold text-stone-900 block">
                        R$ {product.basePrice.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        Custo: R$ {product.costPrice.toFixed(2)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Resultados do Motor */}
            {evaluationResult && (
              <div className="mt-4 p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-600">Peças no Carrinho:</span>
                  <strong className="text-stone-900">{selectedProductIds.length} selecionadas</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-stone-600">Soma Preço Cheio:</span>
                  <span className="text-stone-500 line-through">
                    R$ {evaluationResult.originalTotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-stone-600 font-semibold">Valor com Combo:</span>
                  <span className="text-base font-extrabold text-rose-600">
                    R$ {evaluationResult.discountedTotal.toFixed(2)}
                  </span>
                </div>

                {evaluationResult.isEligible ? (
                  <div className="space-y-2">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-800 flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Economia do Cliente:
                      </span>
                      <strong className="text-emerald-700">
                        R$ {evaluationResult.totalSavings.toFixed(2)} OFF
                      </strong>
                    </div>

                    {/* Margem de Lucro Estimada */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900 flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                        Margem de Lucro do Combo:
                      </span>
                      <strong className="text-amber-800 text-sm">
                        ~{evaluationResult.estimatedProfitMargin}% de Margem
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      Selecione mais {Math.max(0, activeComboRule.requiredQuantity - selectedProductIds.length)} item(ns) para fechar o combo.
                    </span>
                  </div>
                )}

                {/* Rateio Fiscal por SKU para a NF-e */}
                {evaluationResult.isEligible && (
                  <div className="mt-2 pt-2 border-t border-stone-200">
                    <p className="text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                      Rateio Fiscal no XML da NF-e (Artigo 52 SEFAZ):
                    </p>
                    <div className="space-y-1">
                      {evaluationResult.allocatedItemPrices.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] bg-white px-2 py-1 rounded border border-stone-200"
                        >
                          <span className="font-mono text-stone-600">{item.sku}</span>
                          <span className="text-stone-400">
                            R$ {item.originalPrice.toFixed(2)} ➔{' '}
                            <strong className="text-stone-900 font-semibold">
                              R$ {item.finalEffectivePrice.toFixed(2)}
                            </strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para Criar/Editar Regra de Combo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-rose-600" />
                {editingCombo ? 'Editar Regra de Combo' : 'Nova Regra de Combo Dinâmico'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCombo} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Modalidade do Combo:
                </label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as ComboType })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 font-bold text-stone-900 focus:outline-rose-500"
                >
                  <option value="FIXED_PRICE">Preço Fechado (Ex: 3 peças por R$ 100)</option>
                  <option value="BUY_X_PAY_Y">Leve X Pague Y (Ex: Leve 3 Pague 2)</option>
                  <option value="FIXED_BUNDLE">Combo Fixo (Produto A + Produto B por R$ X)</option>
                  <option value="VARIABLE_CATEGORY">Combo Variável (Qualquer 4 da Categoria)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Nome da Regra
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Leve 3 Pague 2 em Toda Linha Infantil"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 font-medium text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Tag Visual no App (Badge)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.tag}
                    onChange={e => setFormData({ ...formData, tag: e.target.value })}
                    placeholder="Ex: Leve 3 Pague 2"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Qtd Requerida
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    required
                    value={formData.requiredQuantity}
                    onChange={e =>
                      setFormData({ ...formData, requiredQuantity: parseInt(e.target.value) || 3 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 font-bold text-stone-900"
                  />
                </div>
              </div>

              {formData.type === 'BUY_X_PAY_Y' ? (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Qtd Efetivamente Paga (Ex: 2)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={formData.requiredQuantity - 1}
                    value={formData.paidQuantity}
                    onChange={e =>
                      setFormData({ ...formData, paidQuantity: parseInt(e.target.value) || 2 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 font-bold text-stone-900"
                  />
                  <span className="text-[11px] text-stone-500 mt-0.5 block">
                    O(s) item(ns) de menor valor dentro do conjunto saem de graça.
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Preço Fechado do Pacote (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formData.bundlePrice}
                    onChange={e =>
                      setFormData({ ...formData, bundlePrice: parseFloat(e.target.value) || 100 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 font-extrabold text-stone-900"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-stone-600 font-semibold hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs transition-colors"
                >
                  {editingCombo ? 'Salvar Alterações' : 'Criar Regra de Combo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
