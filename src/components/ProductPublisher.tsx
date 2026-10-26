import React, { useState } from 'react';
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Layers,
  ArrowRight,
  Database,
  Sliders,
  Send,
  Plus,
  Zap,
} from 'lucide-react';
import { Product, MarketplaceChannel, IntegrationLog } from '../types';
import { ChannelSelectorModal } from './ChannelSelectorModal';
import { ProductFormModal } from './ProductFormModal';
import { ChannelProfitTable } from './ChannelProfitTable';

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
    products.map(p => p.id)
  );
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState<string | null>(null);

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProductIdsForPublish(products.map(p => p.id));
    } else {
      setSelectedProductIdsForPublish([]);
    }
  };

  const handleToggleProductSelection = (id: string) => {
    setSelectedProductIdsForPublish(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleConfirmPublishFromModal = (
    channelConfigs: Record<MarketplaceChannel, { enabled: boolean; markupPercent: number }>
  ) => {
    setPublishFeedback(
      `Disparando jobs no BullMQ para ${selectedProductIdsForPublish.length} produtos nos canais selecionados...`
    );

    setTimeout(() => {
      setProducts(prev =>
        prev.map(p => {
          if (!selectedProductIdsForPublish.includes(p.id)) return p;

          return {
            ...p,
            channelListings: {
              APP_SAGAS: {
                id: `cl-app-${p.id}`,
                channel: 'APP_SAGAS',
                markupPercent: channelConfigs.APP_SAGAS.markupPercent,
                channelPrice: Math.round(p.basePrice * (1 + channelConfigs.APP_SAGAS.markupPercent / 100) * 100) / 100,
                status: channelConfigs.APP_SAGAS.enabled ? 'PUBLISHED' : 'DRAFT',
                lastSync: 'Agora mesmo',
              },
              SHOPEE: {
                id: `cl-shp-${p.id}`,
                channel: 'SHOPEE',
                markupPercent: channelConfigs.SHOPEE.markupPercent,
                channelPrice: Math.round(p.basePrice * (1 + channelConfigs.SHOPEE.markupPercent / 100) * 100) / 100,
                status: channelConfigs.SHOPEE.enabled ? 'PUBLISHED' : 'DRAFT',
                lastSync: 'Agora mesmo',
              },
              MERCADO_LIVRE: {
                id: `cl-ml-${p.id}`,
                channel: 'MERCADO_LIVRE',
                markupPercent: channelConfigs.MERCADO_LIVRE.markupPercent,
                channelPrice: Math.round(p.basePrice * (1 + channelConfigs.MERCADO_LIVRE.markupPercent / 100) * 100) / 100,
                status: channelConfigs.MERCADO_LIVRE.enabled ? 'PUBLISHED' : 'DRAFT',
                lastSync: 'Agora mesmo',
              },
              TIKTOK_SHOP: {
                id: `cl-tts-${p.id}`,
                channel: 'TIKTOK_SHOP',
                markupPercent: channelConfigs.TIKTOK_SHOP.markupPercent,
                channelPrice: Math.round(p.basePrice * (1 + channelConfigs.TIKTOK_SHOP.markupPercent / 100) * 100) / 100,
                status: channelConfigs.TIKTOK_SHOP.enabled ? 'PUBLISHED' : 'DRAFT',
                lastSync: 'Agora mesmo',
              },
            },
          };
        })
      );

      const newLog: IntegrationLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        channel: 'SHOPEE',
        action: 'PRODUCT_PUBLISH',
        status: 'SUCCESS',
        message: `Lote de ${selectedProductIdsForPublish.length} produtos publicado com markup nos canais ativos.`,
      };

      setLogs(prev => [newLog, ...prev]);
      setPublishFeedback(
        `Sucesso! ${selectedProductIdsForPublish.length} produtos sincronizados nos marketplaces.`
      );
      setTimeout(() => setPublishFeedback(null), 4000);
    }, 1200);
  };

  const channelBadges: Array<{ id: MarketplaceChannel; name: string; color: string }> = [
    { id: 'APP_SAGAS', name: 'App sagas.moda', color: 'bg-rose-600' },
    { id: 'SHOPEE', name: 'Shopee', color: 'bg-orange-600' },
    { id: 'MERCADO_LIVRE', name: 'Mercado Livre', color: 'bg-amber-500' },
    { id: 'TIKTOK_SHOP', name: 'TikTok Shop', color: 'bg-stone-900' },
  ];

  return (
    <div className="space-y-6">
      {/* Banner Superior */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold mb-2">
              <Share2 className="w-3.5 h-3.5" />
              <span>Publicador One-to-Many Centralizado</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Catálogo Central & Publicação Multicanal
            </h2>
            <p className="text-stone-300 text-sm mt-1 max-w-2xl">
              Cadastre o produto uma única vez no ERP sagas.moda. Selecione múltiplos itens e defina markups personalizados para cobrir comissões da Shopee, Mercado Livre e TikTok Shop.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsProductFormOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Produto</span>
            </button>
            <button
              onClick={() => setIsChannelModalOpen(true)}
              disabled={selectedProductIdsForPublish.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
              <span>Publicar Selecionados ({selectedProductIdsForPublish.length})</span>
            </button>
          </div>
        </div>

        {publishFeedback && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{publishFeedback}</span>
          </div>
        )}
      </div>

      {selectedProduct && (
        <ChannelProfitTable
          cmv={selectedProduct.costPrice}
          basePrice={selectedProduct.basePrice}
          variations={selectedProduct.variations}
          onApplyChannelPrices={(prices) => {
            setProducts((prev) =>
              prev.map((p) =>
                p.id === selectedProduct.id
                  ? {
                      ...p,
                      channelListings: {
                        APP_SAGAS: { ...p.channelListings.APP_SAGAS, channelPrice: prices.APP_SAGAS },
                        SHOPEE: { ...p.channelListings.SHOPEE, channelPrice: prices.SHOPEE },
                        MERCADO_LIVRE: { ...p.channelListings.MERCADO_LIVRE, channelPrice: prices.MERCADO_LIVRE },
                        TIKTOK_SHOP: { ...p.channelListings.TIKTOK_SHOP, channelPrice: prices.TIKTOK_SHOP },
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
                onChange={e => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-stone-800">
                Selecionar Todos ({selectedProductIdsForPublish.length}/{products.length})
              </span>
            </div>
            <button
              onClick={() => setIsProductFormOpen(true)}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Novo</span>
            </button>
          </div>

          {products.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300">
              <Layers className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <p className="text-stone-700 font-bold text-sm">Nenhum produto cadastrado no banco do ERP</p>
              <p className="text-stone-500 text-xs mt-1">Cadastre o primeiro produto com grade e estoque no Neon DB.</p>
              <button
                onClick={() => setIsProductFormOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Primeiro Produto</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map(prod => {
              const isSelectedForPublish = selectedProductIdsForPublish.includes(prod.id);
              const isCurrentDetails = selectedProduct?.id === prod.id;
              const totalStock = prod.variations.reduce((acc, v) => acc + v.stockReal, 0);

              return (
                <div
                  key={prod.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                    isCurrentDetails
                      ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelectedForPublish}
                    onChange={() => handleToggleProductSelection(prod.id)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer"
                  />

                  <img
                    src={prod.imageUrl}
                    alt={prod.title}
                    onClick={() => setSelectedProductId(prod.id)}
                    className="w-16 h-16 rounded-lg object-cover border border-stone-200 shrink-0 cursor-pointer"
                  />

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setSelectedProductId(prod.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-stone-900 text-sm truncate">
                        {prod.title}
                      </h4>
                      <span className="font-extrabold text-stone-900 text-sm shrink-0">
                        R$ {prod.basePrice.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-1 flex-wrap">
                      <span className="font-semibold text-stone-700 uppercase bg-stone-100 px-1.5 py-0.5 rounded text-[10px]">
                        {prod.categoryLabel}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-stone-600">{prod.masterSku || 'SKU-MASTER'}</span>
                      <span>•</span>
                      <span>Estoque Total: <strong>{totalStock} unids</strong></span>
                    </div>

                    {/* Status de Sincronização nos Canais */}
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-stone-100 overflow-x-auto text-[11px]">
                      {channelBadges.map(channel => {
                        const listing = prod.channelListings?.[channel.id];
                        const isPub = listing?.status === 'PUBLISHED' || !listing;

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
                            ></span>
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

        {/* Adaptador de Canais & Detalhes Fiscais (5 cols) */}
        {selectedProduct && (
          <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-stone-900 text-sm">
                  Configuração Multicanal do Produto
                </h3>
              </div>
              <span className="text-[10px] font-mono text-stone-500">
                {selectedProduct.masterSku}
              </span>
            </div>

            {/* Visualização de Fotos */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 block">
                Fotos Adaptadas (Ratio 1:1 Capa):
              </label>
              <div className="flex gap-2">
                <div className="relative group">
                  <img
                    src={selectedProduct.imageUrl}
                    alt="Capa"
                    className="w-20 h-20 rounded-lg object-cover border-2 border-rose-500"
                  />
                  <span className="absolute bottom-1 left-1 right-1 bg-stone-900/80 text-white text-[9px] font-bold text-center rounded py-0.5">
                    1:1 Capa
                  </span>
                </div>
                {selectedProduct.secondaryImages?.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt="Secundária"
                      className="w-20 h-20 rounded-lg object-cover border border-stone-200"
                    />
                    <span className="absolute bottom-1 left-1 right-1 bg-stone-900/80 text-white text-[9px] font-bold text-center rounded py-0.5">
                      Detalhe
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mapeamento Específico de Canais */}
            <div className="space-y-2 pt-2 text-xs">
              <label className="font-bold text-stone-700 block">
                Preços e Markups Atuais por Canal:
              </label>

              <div className="p-2.5 rounded-lg border border-orange-200 bg-orange-50/40 space-y-1">
                <div className="flex justify-between font-bold text-orange-950">
                  <span>Shopee (+10% markup):</span>
                  <span>R$ {(selectedProduct.basePrice * 1.1).toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-stone-600">
                  Compensa taxas da plataforma e viabiliza cupom de frete grátis.
                </p>
              </div>

              <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/40 space-y-1">
                <div className="flex justify-between font-bold text-amber-950">
                  <span>Mercado Livre (+12% markup):</span>
                  <span>R$ {(selectedProduct.basePrice * 1.12).toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-stone-600">
                  Mapeado para categoria MLB com Mercado Envios.
                </p>
              </div>

              <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/40 space-y-1">
                <div className="flex justify-between font-bold text-rose-950">
                  <span>App sagas.moda (0% markup):</span>
                  <span>R$ {selectedProduct.basePrice.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-stone-600">
                  Participa dos Combos 3 por R$100 e Flash Sales.
                </p>
              </div>
            </div>

            {/* Grade de Variações de Tamanho */}
            <div className="pt-2 border-t border-stone-200">
              <label className="text-xs font-bold text-stone-700 block mb-1.5">
                Grade de Tamanhos & SKUs no ERP:
              </label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {selectedProduct.variations.map(v => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between text-xs bg-stone-50 p-2 rounded-lg border border-stone-200"
                  >
                    <div>
                      <strong className="text-stone-900 font-bold">Tam {v.size}</strong> - {v.color}
                      <span className="text-[10px] text-stone-400 font-mono ml-2">SKU: {v.sku}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-stone-700 font-bold">{v.stockReal} unids</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Publicação Multicanal com Markups */}
      <ChannelSelectorModal
        isOpen={isChannelModalOpen}
        onClose={() => setIsChannelModalOpen(false)}
        selectedProducts={products.filter(p => selectedProductIdsForPublish.includes(p.id))}
        onConfirmPublish={handleConfirmPublishFromModal}
      />

      {/* Modal de Cadastro de Produto Multi-step */}
      <ProductFormModal
        isOpen={isProductFormOpen}
        onClose={() => setIsProductFormOpen(false)}
        onSaveProduct={newProd => {
          setProducts(prev => [newProd, ...prev]);
          setSelectedProductId(newProd.id);
          setSelectedProductIdsForPublish(prev => [newProd.id, ...prev]);
        }}
      />
    </div>
  );
};
