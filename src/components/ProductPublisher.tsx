import React, { useState } from 'react';
import {
  Share2,
  CheckCircle2,
  Sparkles,
  Sliders,
  Plus,
  Minus,
  Calculator,
  Layers,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { Product, IntegrationLog, MarketplaceChannel } from '../types';
import { ChannelSelectorModal } from './ChannelSelectorModal';
import { ProductFormModal } from './ProductFormModal';
import { ChannelProfitTable } from './ChannelProfitTable';
import { mapDtoToAdminProduct } from '../hooks/useProducts';
import apiClient, { ApiResponse } from '../services/apiClient';

interface ProductPublisherProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  logs: IntegrationLog[];
  setLogs: React.Dispatch<React.SetStateAction<IntegrationLog[]>>;
}

export const ProductPublisher: React.FC<ProductPublisherProps> = ({
  products,
  setProducts,
  logs,
  setLogs,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [selectedProductIdsForPublish, setSelectedProductIdsForPublish] = useState<string[]>(
    products.slice(0, 3).map((p) => p.id)
  );
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [publishFeedback, setPublishFeedback] = useState<string | null>(null);
  const [showProfitSimulator, setShowProfitSimulator] = useState<boolean>(true);
  const [busyStockKey, setBusyStockKey] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const showToast = (msg: string) => {
    setPublishFeedback(msg);
    setTimeout(() => setPublishFeedback(null), 4000);
  };

  const handleToggleProductSelection = (id: string) => {
    setSelectedProductIdsForPublish((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProductIdsForPublish(products.map((p) => p.id));
    } else {
      setSelectedProductIdsForPublish([]);
    }
  };

  // Ajuste rápido de estoque (+1 / -1) persistido imediatamente no Neon DB via PATCH /api/products/:id/stock
  const handleQuickStockAdjust = async (
    product: Product,
    delta: number,
    variationId?: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const key = `${product.id}-${variationId || 'main'}-${delta}`;
    try {
      setBusyStockKey(key);
      const res = await apiClient.patch<ApiResponse<any>>(`/api/products/${product.id}/stock`, {
        delta,
        variationId,
      });
      if (res && res.data) {
        const updated = mapDtoToAdminProduct(res.data);
        setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
        showToast(
          `Estoque atualizado (${delta > 0 ? `+${delta}` : delta}) em "${updated.title}"!`
        );
      }
    } catch (err: any) {
      showToast(`Erro ao ajustar estoque: ${err?.message || 'Falha na conexão'}`);
    } finally {
      setBusyStockKey(null);
    }
  };

  // Alternar visibilidade do produto na loja (isActive: true/false)
  const handleToggleActiveStatus = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextActive = product.isActive === false ? true : false;
    try {
      const res = await apiClient.put<ApiResponse<any>>(`/api/products/${product.id}`, {
        isActive: nextActive,
      });
      if (res && res.data) {
        const updated = mapDtoToAdminProduct(res.data);
        setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
        showToast(
          nextActive
            ? `Produto "${product.title}" ativado e visível na loja sagas.moda!`
            : `Produto "${product.title}" ocultado da loja sagas.moda!`
        );
      }
    } catch (err: any) {
      showToast(`Erro ao alterar status: ${err?.message || 'Falha na API'}`);
    }
  };

  // Excluir produto do catálogo
  const handleDeleteProduct = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDeletingProductId(product.id);
      await apiClient.delete(`/api/products/${product.id}`);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      if (selectedProductId === product.id) {
        setSelectedProductId('');
      }
      showToast(`Produto "${product.title}" removido do catálogo!`);
    } catch (err: any) {
      showToast(`Erro ao excluir produto: ${err?.message || 'Falha na API'}`);
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleConfirmPublishFromModal = (
    channels: MarketplaceChannel[],
    markups: Record<MarketplaceChannel, number>
  ) => {
    const count = selectedProductIdsForPublish.length;
    setProducts((prev) =>
      prev.map((prod) => {
        if (!selectedProductIdsForPublish.includes(prod.id)) return prod;

        const updatedListings = { ...prod.channelListings };
        channels.forEach((ch) => {
          const markup = markups[ch] ?? 0;
          const calculatedPrice =
            Math.round(prod.basePrice * (1 + markup / 100) * 100) / 100;

          updatedListings[ch] = {
            id: `lst-${ch}-${prod.id}`,
            channel: ch,
            markupPercent: markup,
            channelPrice: calculatedPrice,
            status: 'PUBLISHED',
            lastSync: new Date().toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
        });

        return {
          ...prod,
          channelListings: updatedListings,
        };
      })
    );

    const newLogs: IntegrationLog[] = channels.map((ch, idx) => ({
      id: `log-pub-${Date.now()}-${idx}`,
      timestamp: new Date().toISOString(),
      channel: ch,
      action: 'PRODUCT_PUBLISH',
      status: 'SUCCESS',
      message: `${count} produtos publicados/sincronizados em ${ch} com markup de +${markups[ch]}%`,
    }));

    setLogs((prev) => [...newLogs, ...prev]);
    setIsChannelModalOpen(false);
    showToast(
      `Publicação multicanal concluída: ${count} produtos sincronizados em ${channels.length} plataformas!`
    );
  };

  const channelBadges: { id: MarketplaceChannel; name: string; color: string }[] = [
    { id: 'APP_SAGAS', name: 'App sagas.moda', color: 'bg-rose-600' },
    { id: 'SHOPEE', name: 'Shopee Brasil', color: 'bg-orange-500' },
    { id: 'MERCADO_LIVRE', name: 'Mercado Livre', color: 'bg-amber-500' },
    { id: 'TIKTOK_SHOP', name: 'TikTok Shop', color: 'bg-stone-900' },
  ];

  return (
    <div className="space-y-6">
      {/* Banner Superior */}
      <div className="bg-gradient-to-r from-indigo-950 via-stone-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold mb-2">
              <Share2 className="w-3.5 h-3.5" />
              <span>Catálogo Central, Estoque Real & Simulador de Margem</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Catálogo Central & Simulador de Lucro por Canal
            </h2>
            <p className="text-stone-300 text-sm mt-1 max-w-2xl">
              Cadastre produtos no banco Neon, ajuste o estoque físico em tempo real (<strong>+1 / -1</strong>) e sincronize imediatamente com a loja <strong>sagas.moda</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowProfitSimulator((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                showProfitSimulator
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                  : 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>{showProfitSimulator ? 'Ocultar Simulador M10' : 'Abrir Simulador M10'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setIsProductFormOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs border border-stone-700 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-rose-400" />
              <span>+ Novo Produto</span>
            </button>

            <button
              type="button"
              onClick={() => setIsChannelModalOpen(true)}
              disabled={selectedProductIdsForPublish.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-40"
            >
              <Sparkles className="w-4 h-4" />
              <span>Publicar em Massa ({selectedProductIdsForPublish.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback de Ação Real */}
      {publishFeedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{publishFeedback}</span>
          </div>
          <button
            onClick={() => setPublishFeedback(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* PAINEL DO SIMULADOR DE LUCRO POR CANAL (M10 - P2) */}
      {showProfitSimulator && selectedProduct && (
        <ChannelProfitTable
          product={selectedProduct}
          onApplySuggestedPrices={(productId, prices) => {
            setProducts((prev) =>
              prev.map((p) =>
                p.id === productId
                  ? {
                      ...p,
                      basePrice: prices.APP_SAGAS || p.basePrice,
                      channelListings: {
                        APP_SAGAS: {
                          ...p.channelListings.APP_SAGAS,
                          channelPrice: prices.APP_SAGAS,
                        },
                        SHOPEE: { ...p.channelListings.SHOPEE, channelPrice: prices.SHOPEE },
                        MERCADO_LIVRE: {
                          ...p.channelListings.MERCADO_LIVRE,
                          channelPrice: prices.MERCADO_LIVRE,
                        },
                        TIKTOK_SHOP: {
                          ...p.channelListings.TIKTOK_SHOP,
                          channelPrice: prices.TIKTOK_SHOP,
                        },
                      },
                    }
                  : p
              )
            );
          }}
        />
      )}

      {/* Grid: Lista com Seleção em Massa & Detalhes do Produto */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Catálogo Central no ERP (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={
                  selectedProductIdsForPublish.length === products.length &&
                  products.length > 0
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-stone-800">
                Selecionar Todos ({selectedProductIdsForPublish.length}/{products.length})
              </span>
            </div>
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsProductFormOpen(true);
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Novo Produto</span>
            </button>
          </div>

          {products.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300">
              <Layers className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <p className="text-stone-700 font-bold text-sm">
                Nenhum produto cadastrado no banco do ERP
              </p>
              <p className="text-stone-500 text-xs mt-1">
                Cadastre o primeiro produto real com grade e estoque no banco Neon PostgreSQL.
              </p>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductFormOpen(true);
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Primeiro Produto</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((prod) => {
                const isSelectedForPublish = selectedProductIdsForPublish.includes(prod.id);
                const isCurrentDetails = selectedProduct?.id === prod.id;
                const totalStock = prod.variations.reduce((acc, v) => acc + v.stockReal, 0);
                const isProdActive = prod.isActive !== false;
                const minusKey = `${prod.id}-main--1`;
                const plusKey = `${prod.id}-main-1`;

                return (
                  <div
                    key={prod.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                      isCurrentDetails
                        ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    } ${!isProdActive ? 'opacity-70' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelectedForPublish}
                      onChange={() => handleToggleProductSelection(prod.id)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer"
                    />

                    {prod.imageUrl ? (
                      <img
                        src={prod.imageUrl}
                        alt={prod.title}
                        onClick={() => setSelectedProductId(prod.id)}
                        className="w-16 h-16 rounded-lg object-cover border border-stone-200 shrink-0 cursor-pointer"
                      />
                    ) : (
                      <div
                        onClick={() => setSelectedProductId(prod.id)}
                        className="w-16 h-16 rounded-lg bg-stone-100 border border-stone-200 shrink-0 cursor-pointer flex items-center justify-center text-[10px] font-bold text-stone-400 text-center p-1"
                      >
                        Sem Foto
                      </div>
                    )}

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setSelectedProductId(prod.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="font-bold text-stone-900 text-sm truncate">
                            {prod.title}
                          </h4>
                          {!isProdActive && (
                            <span className="px-2 py-0.5 rounded bg-stone-200 text-stone-700 text-[10px] font-bold shrink-0">
                              Oculto na Loja
                            </span>
                          )}
                        </div>
                        <span className="font-extrabold text-stone-900 text-sm shrink-0">
                          R$ {prod.basePrice.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1.5 flex-wrap">
                        <div className="flex items-center gap-2 text-xs text-stone-500 flex-wrap">
                          <span className="font-semibold text-stone-700 uppercase bg-stone-100 px-1.5 py-0.5 rounded text-[10px]">
                            {prod.categoryLabel}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-stone-600">
                            {prod.masterSku || 'SKU-MASTER'}
                          </span>
                          <span>•</span>
                          <span className="text-stone-600">
                            Custo: <strong>R$ {prod.costPrice.toFixed(2)}</strong>
                          </span>
                        </div>

                        {/* Controles Rápidos de Estoque (+1 / -1) e Ações CRUD */}
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1 bg-stone-100 border border-stone-200 rounded-lg px-1.5 py-0.5">
                            <button
                              type="button"
                              title="Diminuir 1 unidade do estoque"
                              disabled={busyStockKey === minusKey || totalStock <= 0}
                              onClick={(e) => handleQuickStockAdjust(prod, -1, undefined, e)}
                              className="px-1.5 py-0.5 rounded bg-white hover:bg-rose-50 text-stone-700 hover:text-rose-700 border border-stone-200 text-[11px] font-black disabled:opacity-40 cursor-pointer"
                            >
                              -1
                            </button>
                            <span className="text-xs font-mono font-black text-stone-900 px-1.5">
                              {totalStock} un.
                            </span>
                            <button
                              type="button"
                              title="Adicionar 1 unidade ao estoque"
                              disabled={busyStockKey === plusKey}
                              onClick={(e) => handleQuickStockAdjust(prod, 1, undefined, e)}
                              className="px-1.5 py-0.5 rounded bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-700 border border-stone-200 text-[11px] font-black disabled:opacity-40 cursor-pointer"
                            >
                              +1
                            </button>
                          </div>

                          <button
                            type="button"
                            title={isProdActive ? 'Ocultar na Loja' : 'Ativar na Loja'}
                            onClick={(e) => handleToggleActiveStatus(prod, e)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isProdActive
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-stone-100 border-stone-200 text-stone-500 hover:bg-stone-200'
                            }`}
                          >
                            {isProdActive ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            title="Editar Produto"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProduct(prod);
                              setIsProductFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-stone-100 hover:bg-indigo-50 text-stone-700 hover:text-indigo-700 border border-stone-200 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            title="Excluir Produto"
                            disabled={deletingProductId === prod.id}
                            onClick={(e) => handleDeleteProduct(prod, e)}
                            className="p-1.5 rounded-lg bg-stone-100 hover:bg-rose-50 text-stone-500 hover:text-rose-600 border border-stone-200 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {deletingProductId === prod.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Status de Sincronização nos Canais */}
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-stone-100 overflow-x-auto text-[11px]">
                        {channelBadges.map((channel) => {
                          const listing = prod.channelListings?.[channel.id];
                          const isPub =
                            isProdActive && (listing?.status === 'PUBLISHED' || !listing);

                          return (
                            <span
                              key={channel.id}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                isPub
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-stone-100 text-stone-600 border border-stone-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isPub ? 'bg-emerald-500' : 'bg-stone-400'
                                }`}
                              />
                              {channel.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Adaptador de Canais & Grade de Estoque em Tempo Real (5 cols) */}
        {selectedProduct && (
          <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-stone-900 text-sm">
                  Estoque por Variação & Canais
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(selectedProduct);
                  setIsProductFormOpen(true);
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Produto</span>
              </button>
            </div>

            {/* Visualização de Fotos */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 block">
                Galeria Sincronizada com a Loja:
              </label>
              <div className="flex gap-2 flex-wrap">
                {selectedProduct.imageUrl ? (
                  <div className="relative group">
                    <img
                      src={selectedProduct.imageUrl}
                      alt="Capa"
                      className="w-20 h-20 rounded-lg object-cover border-2 border-rose-500"
                    />
                    <span className="absolute bottom-1 left-1 right-1 bg-stone-900/80 text-white text-[9px] font-bold text-center rounded py-0.5">
                      Capa
                    </span>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-stone-100 border border-dashed border-stone-300 flex items-center justify-center text-[10px] text-stone-400 text-center p-1">
                    Sem imagem
                  </div>
                )}
                {selectedProduct.secondaryImages?.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt="Secundária"
                      className="w-20 h-20 rounded-lg object-cover border border-stone-200"
                    />
                    <span className="absolute bottom-1 left-1 right-1 bg-stone-900/80 text-white text-[9px] font-bold text-center rounded py-0.5">
                      Foto #{idx + 2}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grade de Variações de Tamanho com Ajuste Rápido +1 / -1 */}
            <div className="pt-2 border-t border-stone-200">
              <label className="text-xs font-bold text-stone-700 block mb-2">
                Grade de Variações (Ajuste Rápido no Banco Neon):
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedProduct.variations.map((v) => {
                  const minusVarKey = `${selectedProduct.id}-${v.id}--1`;
                  const plusVarKey = `${selectedProduct.id}-${v.id}-1`;
                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-200"
                    >
                      <div>
                        <strong className="text-stone-900 font-bold">Tam {v.size}</strong> —{' '}
                        {v.color}
                        <span className="text-[10px] text-stone-400 font-mono block">
                          SKU: {v.sku}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busyStockKey === minusVarKey || v.stockReal <= 0}
                          onClick={(e) =>
                            handleQuickStockAdjust(selectedProduct, -1, v.id, e)
                          }
                          className="px-2 py-1 rounded-lg bg-white hover:bg-rose-50 text-stone-700 hover:text-rose-700 border border-stone-300 font-mono font-black text-xs disabled:opacity-40 cursor-pointer"
                        >
                          -1
                        </button>
                        <span className="min-w-[54px] text-center font-mono font-black text-stone-900 text-xs">
                          {v.stockReal} un.
                        </span>
                        <button
                          type="button"
                          disabled={busyStockKey === plusVarKey}
                          onClick={(e) =>
                            handleQuickStockAdjust(selectedProduct, 1, v.id, e)
                          }
                          className="px-2 py-1 rounded-lg bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-700 border border-stone-300 font-mono font-black text-xs disabled:opacity-40 cursor-pointer"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mapeamento Específico de Canais */}
            <div className="space-y-2 pt-2 border-t border-stone-200 text-xs">
              <label className="font-bold text-stone-700 block">
                Preços e Markups Atuais por Canal:
              </label>

              <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/40 space-y-1">
                <div className="flex justify-between font-bold text-rose-950">
                  <span>App sagas.moda (Preço Base):</span>
                  <span>R$ {selectedProduct.basePrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-orange-200 bg-orange-50/40 space-y-1">
                <div className="flex justify-between font-bold text-orange-950">
                  <span>Shopee (+12% markup):</span>
                  <span>R$ {(selectedProduct.basePrice * 1.12).toFixed(2)}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/40 space-y-1">
                <div className="flex justify-between font-bold text-amber-950">
                  <span>Mercado Livre (+15% markup):</span>
                  <span>R$ {(selectedProduct.basePrice * 1.15).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Publicação Multicanal com Markups */}
      <ChannelSelectorModal
        isOpen={isChannelModalOpen}
        onClose={() => setIsChannelModalOpen(false)}
        selectedProducts={products.filter((p) => selectedProductIdsForPublish.includes(p.id))}
        onConfirmPublish={handleConfirmPublishFromModal}
      />

      {/* Modal de Cadastro / Edição de Produto */}
      <ProductFormModal
        isOpen={isProductFormOpen}
        editingProduct={editingProduct}
        onClose={() => {
          setIsProductFormOpen(false);
          setEditingProduct(null);
        }}
        onProductSaved={(savedProd, isEdit) => {
          if (isEdit) {
            setProducts((prev) => prev.map((p) => (p.id === savedProd.id ? savedProd : p)));
            showToast(`Produto Salvo! "${savedProd.title}" atualizado no banco Neon.`);
          } else {
            setProducts((prev) => [savedProd, ...prev]);
            setSelectedProductId(savedProd.id);
            setSelectedProductIdsForPublish((prev) => [savedProd.id, ...prev]);
            showToast(`Produto Salvo! "${savedProd.title}" criado e sincronizado com a loja.`);
          }
        }}
      />
    </div>
  );
};
