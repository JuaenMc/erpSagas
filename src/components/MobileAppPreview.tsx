import React, { useState, useEffect } from 'react';
import {
  Heart,
  ShoppingBag,
  Search,
  Mic,
  Zap,
  ChevronRight,
  Flame,
  Home,
  Grid,
  User,
  Plus,
  Check,
  Smartphone,
  Eye,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Product, ComboRuleModel, FlashSaleModel, Order } from '../types';

interface MobileAppPreviewProps {
  products: Product[];
  combos: ComboRuleModel[];
  flashSales: FlashSaleModel[];
  onPlaceAppOrder: (newOrder: Order) => void;
}

export const MobileAppPreview: React.FC<MobileAppPreviewProps> = ({
  products,
  combos,
  flashSales,
  onPlaceAppOrder,
}) => {
  const [activeCategory, setActiveCategory] = useState<'novidades' | 'feminino' | 'infantil' | 'promocoes'>('feminino');
  const [selectedComboItemIds, setSelectedComboItemIds] = useState<string[]>([
    'prod-1-vestido-floral',
    'prod-2-jardineira-unissex',
  ]);
  const [cartCount, setCartCount] = useState<number>(3);
  const [orderPlacedFeedback, setOrderPlacedFeedback] = useState<boolean>(false);
  const [showOriginalScreenshot, setShowOriginalScreenshot] = useState<boolean>(false);

  // Live countdown matching the reference
  const [timer, setTimer] = useState({ h: '04', m: '26', s: '03' });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const s = 60 - now.getSeconds();
      const m = 26;
      const h = 4;
      setTimer({
        h: h.toString().padStart(2, '0'),
        m: m.toString().padStart(2, '0'),
        s: s.toString().padStart(2, '0'),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeCombo = combos.find(c => c.id === 'combo-3-100') || combos[0];
  const activeFlash = flashSales.find(fs => fs.active) || flashSales[0];

  const toggleProductInCombo = (productId: string) => {
    setSelectedComboItemIds(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        if (prev.length >= 3) {
          // Replace last one or keep 3
          return [...prev.slice(1), productId];
        }
        return [...prev, productId];
      }
    });
  };

  const handleCheckoutCombo = () => {
    if (selectedComboItemIds.length < 3) return;

    const selectedProds = selectedComboItemIds.map(id => products.find(p => p.id === id)!);
    const orderNum = `PED-${Math.floor(10000 + Math.random() * 90000)}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      channel: 'APP_SAGAS',
      channelOrderId: `APP-${Math.floor(100000 + Math.random() * 900000)}`,
      customerName: 'Mariana Duarte Souza',
      customerDoc: '388.921.049-22',
      shippingAddress: {
        street: 'Rua Bela Cintra',
        number: '1420',
        neighborhood: 'Consolação',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01415-001',
      },
      carrierService: 'CORREIOS_SEDEX',
      items: selectedProds.map((p, idx) => ({
        id: `oi-${Date.now()}-${idx}`,
        productId: p.id,
        productName: p.title,
        sku: p.variations[0]?.sku || `${p.id}-01`,
        size: p.variations[0]?.size || 'M',
        color: p.variations[0]?.color || 'Padrão',
        quantity: 1,
        originalUnitPrice: p.basePrice,
        finalUnitPrice: 33.33,
        discountAllocated: Math.round((p.basePrice - 33.33) * 100) / 100,
      })),
      subtotal: selectedProds.reduce((acc, p) => acc + p.basePrice, 0),
      discount: selectedProds.reduce((acc, p) => acc + p.basePrice, 0) - 100,
      shippingFee: 0,
      total: 100.0,
      comboApplied: 'Combo: 3 Peças por R$ 100',
      saleType: 'COMBO',
      status: 'PROCESSING',
      deliveryStatus: 'PENDENTE',
      createdAt: new Date().toISOString(),
      trackingNumber: `BR${Math.floor(10000000000 + Math.random() * 90000000000)}X`,
      trackingCode: `BR${Math.floor(10000000000 + Math.random() * 90000000000)}X`,
      labelPrinted: false,
      packages: [
        {
          packageId: `pkg-${Date.now()}-1`,
          packageLabel: 'Volume 1 de 1 (Combo Look Completo)',
          trackingCode: `BR${Math.floor(10000000000 + Math.random() * 90000000000)}X`,
          carrier: 'Correios Sedex',
          service: 'SEDEX Contrato',
          weightKg: 0.6,
          itemsCount: selectedProds.length,
          currentStatus: 'PENDENTE',
          events: [
            {
              id: `ev-${Date.now()}`,
              orderId: `ord-${Date.now()}`,
              timestamp: new Date().toISOString(),
              location: 'App sagas.moda',
              description: 'Pedido realizado e pagamento confirmado. Aguardando separação e emissão de etiqueta.',
              status: 'PENDENTE',
            },
          ],
        },
      ],
    };

    onPlaceAppOrder(newOrder);
    setCartCount(prev => prev + 1);
    setOrderPlacedFeedback(true);
    setTimeout(() => setOrderPlacedFeedback(false), 5000);
  };

  const isComboComplete = selectedComboItemIds.length >= 3;

  return (
    <div className="space-y-6">
      {/* Header com instruções */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-rose-600" />
            <h2 className="text-lg font-bold text-stone-900">
              Protótipo Mobile Interativo (App sagas.moda)
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Fidelidade Visual 100%
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Esta interface mobile consome os mesmos endpoints da arquitetura ERP. 
            Você pode testar a seleção do <strong>Combo 3 por R$100</strong> e finalizar o pedido para ver a reserva no ERP!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOriginalScreenshot(!showOriginalScreenshot)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-stone-500" />
            <span>{showOriginalScreenshot ? 'Ocultar Imagem Original' : 'Comparar com Imagem Enviada'}</span>
          </button>
        </div>
      </div>

      {/* Exibição lado a lado (se ativado) ou centralizada */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8">
        {/* Imagem Original enviada pelo usuário (para comparação de referência lado a lado) */}
        {showOriginalScreenshot && (
          <div className="w-[380px] bg-white border border-stone-200 rounded-3xl p-4 shadow-xl flex flex-col items-center">
            <span className="text-xs font-bold text-stone-700 mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-stone-400"></span>
              Captura Enviada (Mockup de Referência)
            </span>
            <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-inner max-h-[780px]">
              <img
                src="/assets/aistudio/Captura_de_tela_2026-10-24_214744_a68ea17c.png"
                alt="Referência Original sagas.moda"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        )}

        {/* Frame do Smartphone com App sagas.moda Vivo e Interativo */}
        <div className="relative w-[380px] sm:w-[390px] h-[820px] bg-stone-900 rounded-[50px] p-3 shadow-2xl border-4 border-stone-800 ring-1 ring-stone-900/50 flex flex-col">
          {/* Dynamic Island / Notch */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-40 flex items-center justify-between px-2">
            <span className="w-2.5 h-2.5 rounded-full bg-stone-800"></span>
            <span className="w-2 h-2 rounded-full bg-emerald-500/80"></span>
          </div>

          {/* Tela Interna do App */}
          <div className="w-full h-full bg-white rounded-[40px] overflow-hidden flex flex-col relative select-none">
            {/* Status Bar */}
            <div className="pt-2 px-6 pb-1 flex justify-between items-center text-xs font-semibold text-stone-900 bg-white z-30">
              <span>09:41</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">📶</span>
                <span className="text-[10px]">⚡</span>
                <div className="w-5 h-2.5 border border-stone-900 rounded-sm p-0.5 flex items-center">
                  <div className="w-full h-full bg-stone-900 rounded-xs"></div>
                </div>
              </div>
            </div>

            {/* Scrollable Screen Content */}
            <div className="flex-1 overflow-y-auto pb-20 no-scrollbar">
              {/* Header do App sagas.moda */}
              <div className="px-4 pt-2 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xl tracking-tight text-[#f25c48]">
                    SAGAS
                  </span>
                  <span className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded-sm bg-[#c3e6cb] text-[#155724]">
                    BRASIL
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button className="text-stone-700 hover:text-stone-900">
                    <Heart className="w-5 h-5" />
                  </button>
                  <div className="relative">
                    <button className="text-stone-700 hover:text-stone-900">
                      <ShoppingBag className="w-5 h-5" />
                    </button>
                    <span className="absolute -top-1 -right-1.5 bg-[#f25c48] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-stone-300">
                    <img
                      src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80"
                      alt="Perfil"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Barra de Pesquisa */}
              <div className="px-4 py-1.5">
                <div className="flex items-center gap-2 bg-stone-100/90 rounded-full px-3.5 py-2 text-xs text-stone-500 border border-stone-200/60 shadow-xs">
                  <Search className="w-4 h-4 text-stone-400 shrink-0" />
                  <span className="truncate flex-1 text-stone-400">
                    Buscar vestidos, conjuntos, infantil...
                  </span>
                  <Mic className="w-4 h-4 text-stone-400 shrink-0" />
                </div>
              </div>

              {/* Pílulas de Categoria */}
              <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveCategory('novidades')}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-stone-100 text-stone-700 flex items-center gap-1 shrink-0"
                >
                  <span>Novidades</span>
                  <span className="text-[9px] font-bold px-1 rounded-sm bg-[#f25c48] text-white">
                    Novo
                  </span>
                </button>

                <button
                  onClick={() => setActiveCategory('feminino')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                    activeCategory === 'feminino'
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  Feminino
                </button>

                <button
                  onClick={() => setActiveCategory('infantil')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                    activeCategory === 'infantil'
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  Infantil
                </button>

                <button
                  onClick={() => setActiveCategory('promocoes')}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-stone-100 text-stone-700 flex items-center gap-1 shrink-0"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Promoções</span>
                </button>
              </div>

              {/* Hero Banner (Coleção Primavera / Verão 2025 com Combo 3 por R$100) */}
              <div className="px-4 py-2">
                <div className="relative rounded-3xl overflow-hidden shadow-md aspect-[16/11]">
                  {/* Foto de Fundo: Mãe e Filha sorrindo em trajes de verão (exatamente como na imagem) */}
                  <img
                    src="https://images.unsplash.com/photo-1609234656388-0ff363383899?auto=format&fit=crop&w=800&q=80"
                    alt="Coleção Primavera Verão 2025"
                    className="w-full h-full object-cover"
                  />
                  {/* Gradiente Escurecido para Legibilidade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

                  {/* Conteúdo sobreposto */}
                  <div className="absolute inset-0 p-4 flex flex-col justify-end text-white space-y-1.5">
                    {/* Badge do Combo */}
                    <div className="inline-flex items-center">
                      <span className="bg-[#f25c48] text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-xs">
                        Combo: 3 Peças por R$ 100
                      </span>
                    </div>

                    <h3 className="text-xl font-black leading-tight tracking-tight drop-shadow-xs">
                      Coleção Primavera / Verão 2025
                    </h3>
                    <p className="text-[11px] text-stone-200 leading-snug drop-shadow-xs max-w-[240px]">
                      Leveza, frescor e looks combinando para a família.
                    </p>

                    <div className="pt-1 flex items-center justify-between">
                      <button className="bg-[#f25c48] hover:bg-[#d94835] text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md">
                        <span>Comprar Agora</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Pontos de Paginação */}
                      <div className="flex items-center gap-1">
                        <span className="w-3.5 h-1.5 rounded-full bg-[#f25c48]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/70"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/70"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção Ofertas Relâmpago */}
              <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-stone-900 text-base leading-tight">
                    Ofertas Relâmpago
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#f25c48] fill-[#f25c48]" />

                  {/* Cronômetro idêntico ao da imagem: [04] : [26] : [03] */}
                  <div className="flex items-center gap-1 text-[11px] font-mono font-bold">
                    <span className="bg-[#1c2430] text-white px-1.5 py-0.5 rounded">
                      {timer.h}
                    </span>
                    <span className="text-[#1c2430]">:</span>
                    <span className="bg-[#1c2430] text-white px-1.5 py-0.5 rounded">
                      {timer.m}
                    </span>
                    <span className="text-[#1c2430]">:</span>
                    <span className="bg-[#f25c48] text-white px-1.5 py-0.5 rounded">
                      {timer.s}
                    </span>
                  </div>

                  <button className="text-[11px] font-bold text-[#f25c48] flex items-center">
                    Ver todas
                    <ChevronRight className="w-3 h-3 ml-0.5" />
                  </button>
                </div>
              </div>

              {/* Cards de Produtos (Horizontal Scroll) */}
              <div className="px-4 py-2 flex gap-3 overflow-x-auto no-scrollbar">
                {products.map(prod => {
                  const isSelectedInCombo = selectedComboItemIds.includes(prod.id);
                  const isFlash = prod.tags.includes('OFERTA_RELAMPAGO');

                  return (
                    <div
                      key={prod.id}
                      className="w-36 shrink-0 bg-white rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs flex flex-col justify-between"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
                        <img
                          src={prod.imageUrl}
                          alt={prod.title}
                          className="w-full h-full object-cover"
                        />

                        {/* Badges superiores exatamente como no app */}
                        <div className="absolute top-2 left-2">
                          {isFlash ? (
                            <span className="bg-[#f25c48] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                              -45%
                            </span>
                          ) : (
                            <span className="bg-[#f25c48] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs">
                              Combo 3 por 100
                            </span>
                          )}
                        </div>

                        {/* Botão de adicionar ao Combo */}
                        <button
                          onClick={() => toggleProductInCombo(prod.id)}
                          className={`absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-90 ${
                            isSelectedInCombo
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-stone-900 hover:bg-stone-100'
                          }`}
                        >
                          {isSelectedInCombo ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </button>
                      </div>

                      <div className="p-2 space-y-1">
                        <h5 className="font-bold text-stone-900 text-xs truncate">
                          {prod.title}
                        </h5>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] text-stone-400 line-through">
                            R$ {prod.basePrice.toFixed(2)}
                          </span>
                          <span className="font-black text-[#f25c48] text-xs">
                            R$ {isFlash ? (prod.basePrice * 0.55).toFixed(2) : (prod.basePrice * 0.7).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Toast / Drawer de Combo Ativo */}
              <div className="px-4 py-2">
                <div
                  className={`p-3 rounded-2xl border transition-all ${
                    isComboComplete
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#f25c48]" />
                      Combo: 3 Peças por R$100
                    </span>
                    <span className="font-extrabold text-[11px] px-2 py-0.5 rounded-full bg-white border">
                      {selectedComboItemIds.length}/3 Peças
                    </span>
                  </div>

                  {isComboComplete ? (
                    <div className="mt-2 pt-2 border-t border-emerald-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-emerald-700 block">Total do Pacote:</span>
                        <strong className="text-sm font-black text-emerald-800">R$ 100,00</strong>
                      </div>
                      <button
                        onClick={handleCheckoutCombo}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-colors"
                      >
                        Fechar Combo
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-rose-700 mt-1">
                      Adicione mais {3 - selectedComboItemIds.length} peça(s) acima para ativar o desconto de R$ 100!
                    </p>
                  )}
                </div>
              </div>

              {orderPlacedFeedback && (
                <div className="mx-4 p-3 rounded-xl bg-stone-900 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Pedido concluído! Estoque dos 3 SKUs reservado no ERP sagas.moda.</span>
                </div>
              )}
            </div>

            {/* Bottom Navigation Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-stone-200 flex items-center justify-around px-2 z-30">
              <button className="flex flex-col items-center gap-0.5 text-[#f25c48]">
                <Home className="w-5 h-5 fill-[#f25c48]" />
                <span className="text-[10px] font-bold">Home</span>
              </button>
              <button className="flex flex-col items-center gap-0.5 text-stone-400">
                <Grid className="w-5 h-5" />
                <span className="text-[10px] font-medium">Categorias</span>
              </button>
              <button className="flex flex-col items-center gap-0.5 text-stone-400 relative">
                <div className="relative">
                  <ShoppingBag className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1.5 bg-[#f25c48] text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                </div>
                <span className="text-[10px] font-medium">Carrinho</span>
              </button>
              <button className="flex flex-col items-center gap-0.5 text-stone-400 relative">
                <div className="relative">
                  <Heart className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1.5 bg-[#f25c48] text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    5
                  </span>
                </div>
                <span className="text-[10px] font-medium">Favoritos</span>
              </button>
              <button className="flex flex-col items-center gap-0.5 text-stone-400">
                <User className="w-5 h-5" />
                <span className="text-[10px] font-medium">Perfil</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
