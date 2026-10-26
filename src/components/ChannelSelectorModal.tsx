import React, { useState } from 'react';
import {
  Share2,
  Check,
  Percent,
  Eye,
  AlertCircle,
  ExternalLink,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { MarketplaceChannel, Product } from '../types';

interface ChannelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: Product[];
  onConfirmPublish: (configs: Record<MarketplaceChannel, { enabled: boolean; markupPercent: number }>) => void;
}

export const ChannelSelectorModal: React.FC<ChannelSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedProducts,
  onConfirmPublish,
}) => {
  const [channels, setChannels] = useState<Record<MarketplaceChannel, { enabled: boolean; markupPercent: number }>>({
    APP_SAGAS: { enabled: true, markupPercent: 0 },
    SHOPEE: { enabled: true, markupPercent: 10 },
    MERCADO_LIVRE: { enabled: true, markupPercent: 12 },
    TIKTOK_SHOP: { enabled: true, markupPercent: 8 },
  });

  const [activePreviewChannel, setActivePreviewChannel] = useState<MarketplaceChannel>('SHOPEE');

  if (!isOpen) return null;

  const sampleProduct = selectedProducts[0];
  const basePrice = sampleProduct?.basePrice || 49.9;

  const handleToggleChannel = (ch: MarketplaceChannel) => {
    setChannels(prev => ({
      ...prev,
      [ch]: { ...prev[ch], enabled: !prev[ch].enabled },
    }));
  };

  const handleUpdateMarkup = (ch: MarketplaceChannel, markup: number) => {
    setChannels(prev => ({
      ...prev,
      [ch]: { ...prev[ch], markupPercent: markup },
    }));
  };

  const handleConfirm = () => {
    onConfirmPublish(channels);
    onClose();
  };

  const channelMeta: Record<MarketplaceChannel, { name: string; tag: string; commissionNote: string; badgeColor: string }> = {
    APP_SAGAS: {
      name: 'App sagas.moda',
      tag: 'Canal Próprio (0% Taxa)',
      commissionNote: 'Preço de tabela original com suporte total a combos 3 por R$100.',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    },
    SHOPEE: {
      name: 'Shopee Brasil',
      tag: 'Comissão Shopee ~20%',
      commissionNote: 'Markup sugerido de +10% a +14% para absorver taxas de envio e campanha.',
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
    },
    MERCADO_LIVRE: {
      name: 'Mercado Livre (MLB)',
      tag: 'Tarifa Clássico/Premium',
      commissionNote: 'Markup sugerido de +12% para compensar tarifa por venda e Mercado Envios.',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    TIKTOK_SHOP: {
      name: 'TikTok Shop',
      tag: 'Live Commerce & Criadores',
      commissionNote: 'Markup sugerido de +8% com copy curta e gatilhos para criadores de moda.',
      badgeColor: 'bg-stone-100 text-stone-800 border-stone-300',
    },
  };

  const currentPreviewMarkup = channels[activePreviewChannel].markupPercent;
  const currentCalculatedPrice = Math.round(basePrice * (1 + currentPreviewMarkup / 100) * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-stone-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
              <Share2 className="w-5 h-5 text-indigo-600" />
              Publicador Multicanal Granular (One-to-Many)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Publicando <strong>{selectedProducts.length} produto(s)</strong> selecionados com markup estratégico de preço por canal.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Grid de Canais & Pré-visualização */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Lado Esquerdo: Checkboxes e Markups por Canal */}
          <div className="space-y-3">
            <span className="font-bold text-stone-800 block">
              1. Selecione os Canais e Defina o Markup de Preço:
            </span>

            {(Object.keys(channelMeta) as MarketplaceChannel[]).map(ch => {
              const meta = channelMeta[ch];
              const conf = channels[ch];
              const isSelectedForPreview = activePreviewChannel === ch;

              return (
                <div
                  key={ch}
                  className={`p-3 rounded-xl border transition-all ${
                    conf.enabled
                      ? 'bg-stone-50 border-stone-300'
                      : 'bg-white border-stone-200 opacity-60'
                  } ${isSelectedForPreview ? 'ring-2 ring-indigo-500' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-900">
                      <input
                        type="checkbox"
                        checked={conf.enabled}
                        onChange={() => handleToggleChannel(ch)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{meta.name}</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setActivePreviewChannel(ch)}
                      className="text-[10px] text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Pré-visualizar</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-stone-500 mt-1">{meta.commissionNote}</p>

                  {conf.enabled && (
                    <div className="mt-2.5 pt-2 border-t border-stone-200 flex items-center justify-between text-xs">
                      <span className="text-stone-700 font-medium">Markup de Preço:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={conf.markupPercent}
                          onChange={e => handleUpdateMarkup(ch, parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-0.5 rounded border border-stone-300 text-stone-900 font-bold text-center bg-white"
                        />
                        <span className="font-bold text-stone-600">%</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Lado Direito: Preview do Anúncio no Canal Ativo */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="font-bold text-stone-800 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  Preview: {channelMeta[activePreviewChannel].name}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${channelMeta[activePreviewChannel].badgeColor}`}>
                  {channelMeta[activePreviewChannel].tag}
                </span>
              </div>

              {sampleProduct ? (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-3">
                    <img
                      src={sampleProduct.imageUrl}
                      alt={sampleProduct.title}
                      className="w-20 h-20 rounded-lg object-cover border border-stone-200 shrink-0"
                    />
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-stone-900 text-xs line-clamp-2">
                        {activePreviewChannel === 'TIKTOK_SHOP'
                          ? `🔥 [LOOK COMPLETO] ${sampleProduct.title} - Envio Imediato!`
                          : sampleProduct.title}
                      </h4>
                      <p className="text-[11px] text-stone-500 mt-1">
                        Preço Base ERP: R$ {basePrice.toFixed(2)}
                      </p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xs text-stone-400">Canal:</span>
                        <strong className="text-sm font-extrabold text-indigo-700">
                          R$ {currentCalculatedPrice.toFixed(2)}
                        </strong>
                        {currentPreviewMarkup > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600">
                            (+{currentPreviewMarkup}% markup)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-stone-200 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Grade Sincronizada:</span>
                      <strong className="text-stone-800">
                        {sampleProduct.variations.map(v => v.size).join(', ')}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Estoque Inicial Total:</span>
                      <strong className="text-stone-800">
                        {sampleProduct.variations.reduce((acc, v) => acc + v.stockReal, 0)} unidades
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Formato de Imagem:</span>
                      <strong className="text-emerald-700">1:1 Quadrado Otimizado</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-stone-400 text-center py-8">Nenhum produto selecionado.</p>
              )}
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-lg p-2.5 text-[11px] text-sky-900">
              Ao confirmar, o NestJS cria jobs assíncronos no <strong>BullMQ</strong>. Falhas na API de um canal (ex: instabilidade temporária no ML) serão repetidas automaticamente 3x sem bloquear a publicação na Shopee.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-stone-600 font-semibold hover:bg-stone-100 text-xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Confirmar Publicação em Massa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
