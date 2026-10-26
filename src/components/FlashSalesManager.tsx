import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  Plus,
  Calendar,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Percent,
  Layers,
  Sparkles,
} from 'lucide-react';
import { FlashSaleModel, Product } from '../types';

interface FlashSalesManagerProps {
  flashSales: FlashSaleModel[];
  setFlashSales: React.Dispatch<React.SetStateAction<FlashSaleModel[]>>;
  products: Product[];
}

export const FlashSalesManager: React.FC<FlashSalesManagerProps> = ({
  flashSales,
  setFlashSales,
  products,
}) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 26, seconds: 3 });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Flash Sale form state
  const [formData, setFormData] = useState<{
    name: string;
    productIds: string[];
    durationHours: number;
    discountPercentage: number;
    maxReservedStock: number;
  }>({
    name: 'Mega Ofertas Relâmpago da Noite',
    productIds: ['prod-3-conjunto-moletom'],
    durationHours: 6,
    discountPercentage: 45,
    maxReservedStock: 50,
  });

  const activeSale = flashSales.find(fs => fs.active) || flashSales[0];

  // Dynamic live countdown tick
  useEffect(() => {
    if (!activeSale) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const end = new Date(activeSale.endIso).getTime();
      const diffSeconds = Math.max(0, Math.floor((end - now) / 1000));

      const h = Math.floor(diffSeconds / 3600);
      const m = Math.floor((diffSeconds % 3600) / 60);
      const s = diffSeconds % 60;

      setTimeLeft({ hours: h, minutes: m, seconds: s });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSale]);

  const handleToggleActive = (id: string) => {
    setFlashSales(prev =>
      prev.map(fs => (fs.id === id ? { ...fs, active: !fs.active } : fs))
    );
  };

  const handleCreateSale = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const end = new Date(now.getTime() + formData.durationHours * 3600 * 1000);

    const newSale: FlashSaleModel = {
      id: `flash-${Date.now()}`,
      name: formData.name,
      productIds: formData.productIds,
      startIso: now.toISOString(),
      endIso: end.toISOString(),
      discountPercentage: formData.discountPercentage,
      maxReservedStock: formData.maxReservedStock,
      soldCount: 0,
      active: true,
      bannerTitle: `${formData.discountPercentage}% OFF Relâmpago`,
    };

    setFlashSales(prev => [newSale, ...prev]);
    setIsModalOpen(false);
  };

  const padZero = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-rose-700 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-15 pointer-events-none flex items-center pr-6">
          <Zap className="w-80 h-80 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/20 border border-white/20 text-amber-200 text-xs font-bold mb-2">
              <Zap className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
              <span>Gatilho de Escassez & Urgência</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Gestão de Ofertas Relâmpago (Flash Sales)
            </h2>
            <p className="text-rose-100 text-sm mt-1.5 leading-relaxed">
              Agende promoções cronometradas com timestamp sincronizado. O sistema ativa automaticamente o desconto e reserva uma cota exclusiva de estoque para impedir que o produto esgote no preço regular.
            </p>
          </div>

          {/* Cronômetro Live Central (Idêntico ao exibido no App sagas.moda) */}
          <div className="bg-stone-900/90 border border-stone-800 p-4 rounded-2xl text-center shadow-lg shrink-0">
            <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-bold mb-2">
              <Zap className="w-4 h-4 fill-amber-400" />
              <span>TERMINA EM</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <div className="bg-stone-800 px-3 py-2 rounded-xl font-mono text-2xl font-black text-white shadow-inner border border-stone-700">
                {padZero(timeLeft.hours)}
              </div>
              <span className="font-mono text-xl font-bold text-amber-400">:</span>
              <div className="bg-stone-800 px-3 py-2 rounded-xl font-mono text-2xl font-black text-white shadow-inner border border-stone-700">
                {padZero(timeLeft.minutes)}
              </div>
              <span className="font-mono text-xl font-bold text-amber-400">:</span>
              <div className="bg-rose-600 px-3 py-2 rounded-xl font-mono text-2xl font-black text-white shadow-inner border border-rose-500 animate-pulse">
                {padZero(timeLeft.seconds)}
              </div>
            </div>
            <p className="text-[10px] text-stone-400 mt-2 font-mono">
              Timestamp Unix: {new Date(activeSale?.endIso || Date.now()).getTime()}
            </p>
          </div>
        </div>
      </div>

      {/* Grid Principal: Ofertas Vigentes & Configurações */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Oferta Ativa com Barra de Estoque Reservado (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Ofertas Relâmpago Cadastradas
            </h3>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar Flash Sale</span>
            </button>
          </div>

          <div className="space-y-4">
            {flashSales.map(sale => {
              const percentSold = Math.min(
                100,
                Math.round((sale.soldCount / Math.max(1, sale.maxReservedStock)) * 100)
              );

              return (
                <div
                  key={sale.id}
                  className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                    sale.active
                      ? 'border-amber-300 ring-1 ring-amber-200'
                      : 'border-stone-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-stone-900 text-base">
                          {sale.name}
                        </span>
                        {sale.active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            AO VIVO
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                            Pausada
                          </span>
                        )}
                        <span className="text-[11px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                          {sale.discountPercentage}% OFF
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                        <span>Início: {new Date(sale.startIso).toLocaleTimeString('pt-BR')}</span>
                        <span>•</span>
                        <span>Término: {new Date(sale.endIso).toLocaleTimeString('pt-BR')}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleActive(sale.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                        sale.active
                          ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 border-stone-300'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600'
                      }`}
                    >
                      {sale.active ? 'Pausar' : 'Ativar'}
                    </button>
                  </div>

                  {/* Barra de Progresso do Estoque Reservado */}
                  <div className="mt-4 pt-3 border-t border-stone-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-600" />
                        Estoque Reservado para a Promoção:
                      </span>
                      <span className="font-bold text-stone-900">
                        {sale.soldCount} de {sale.maxReservedStock} vendidos ({percentSold}%)
                      </span>
                    </div>

                    <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-rose-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${percentSold}%` }}
                      ></div>
                    </div>

                    <p className="text-[11px] text-stone-500">
                      Restam <strong>{sale.maxReservedStock - sale.soldCount} peças</strong> no preço promocional. Ao esgotar esta cota, o preço volta automaticamente ao valor de tabela sem indisponibilizar o produto.
                    </p>
                  </div>

                  {/* Produtos Vinculados */}
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <p className="text-xs font-semibold text-stone-700 mb-2">
                      Produtos Participantes:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sale.productIds.map(pid => {
                        const prod = products.find(p => p.id === pid);
                        if (!prod) return null;
                        const promoPrice =
                          prod.basePrice * (1 - sale.discountPercentage / 100);

                        return (
                          <div
                            key={pid}
                            className="flex items-center gap-2.5 p-2 rounded-lg bg-stone-50 border border-stone-200"
                          >
                            <img
                              src={prod.imageUrl}
                              alt={prod.title}
                              className="w-10 h-10 rounded-md object-cover border border-stone-200 shrink-0"
                            />
                            <div className="overflow-hidden text-xs">
                              <p className="font-bold text-stone-900 truncate">{prod.title}</p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-stone-400 line-through text-[11px]">
                                  R$ {prod.basePrice.toFixed(2)}
                                </span>
                                <span className="font-extrabold text-rose-600 text-xs">
                                  R$ {promoPrice.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lado Direito: Regras Técnicas & Automação Cron (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              Arquitetura de Tempo Real (Redis / BullMQ)
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Para suportar picos de tráfego instantâneos durante a Flash Sale (ex: notificações push no App e lives no TikTok), o NestJS utiliza agendamentos no Redis com tolerância a falhas:
            </p>

            <div className="space-y-2 text-xs">
              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                <span className="font-bold text-stone-800 block">1. BullMQ Delay Jobs:</span>
                <span className="text-stone-600">
                  Ao agendar uma promoção, um job com atraso de execução é criado com o timestamp exato de término.
                </span>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                <span className="font-bold text-stone-800 block">2. Invalidação de Cache no Edge:</span>
                <span className="text-stone-600">
                  Ao virar a hora, os endpoints mobile <code>/flash-sales/active</code> limpam a CDN instantaneamente.
                </span>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                <span className="font-bold text-stone-800 block">3. Separação de Estoque Lógico:</span>
                <span className="text-stone-600">
                  Campo <code>estoque_reservado_promo</code> evita que vendas por preço de tabela consumam o estoque reservado para a oferta relâmpago.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para Agendar Flash Sale */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600" />
                Agendar Nova Oferta Relâmpago
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSale} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Nome da Oferta Relâmpago
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Flash Sale Sapatos Infantis - 50% OFF"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-rose-500 text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Duração da Oferta (Horas)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="72"
                    required
                    value={formData.durationHours}
                    onChange={e =>
                      setFormData({ ...formData, durationHours: parseInt(e.target.value) || 4 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-rose-500 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Desconto (%)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="90"
                    required
                    value={formData.discountPercentage}
                    onChange={e =>
                      setFormData({ ...formData, discountPercentage: parseInt(e.target.value) || 30 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-rose-500 text-stone-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Cota de Estoque Reservado (Unidades Máximas)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.maxReservedStock}
                  onChange={e =>
                    setFormData({ ...formData, maxReservedStock: parseInt(e.target.value) || 50 })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-rose-500 text-stone-900"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Impede esgotamento total antes do horário oficial da promoção.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Selecione os Produtos da Oferta
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-stone-200 rounded-lg p-2">
                  {products.map(p => {
                    const isChecked = formData.productIds.includes(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            productIds: isChecked
                              ? prev.productIds.filter(id => id !== p.id)
                              : [...prev.productIds, p.id],
                          }));
                        }}
                        className={`w-full text-left p-1.5 rounded flex items-center justify-between text-xs ${
                          isChecked ? 'bg-amber-50 text-amber-900 font-bold' : 'hover:bg-stone-50'
                        }`}
                      >
                        <span className="truncate">{p.title}</span>
                        <span>{isChecked ? '✓' : '+'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

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
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs transition-colors"
                >
                  Iniciar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
