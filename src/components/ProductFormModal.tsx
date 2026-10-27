import React, { useState } from 'react';
import {
  Package,
  Layers,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  Calculator,
} from 'lucide-react';
import { Product, ProductVariation, FiscalData } from '../types';
import { GradeEditor } from './GradeEditor';
import { ChannelProfitTable } from './ChannelProfitTable';
import apiClient from '../services/apiClient';
import { mapDtoToAdminProduct } from '../hooks/useProducts';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProduct: (product: Product) => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSaveProduct,
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'grade' | 'midia' | 'fiscal' | 'lucro'>('geral');

  // Form states
  const [title, setTitle] = useState('');
  const [masterSku, setMasterSku] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('sagas.moda');
  const [categoryId, setCategoryId] = useState<'infantil' | 'feminino' | 'masculino'>('infantil');
  const [basePrice, setBasePrice] = useState<number>(49.9);
  const [costPrice, setCostPrice] = useState<number>(18.5);

  // Grade variations
  const [variations, setVariations] = useState<ProductVariation[]>([
    {
      id: 'v-init-1',
      color: 'Floral Branco',
      size: '2',
      sku: 'VEST-FLORAL-02',
      barcodeEan13: '789123450001',
      stockReal: 15,
      stockReserved: 0,
      price: 49.9,
      costPrice: 18.5,
    },
    {
      id: 'v-init-2',
      color: 'Floral Branco',
      size: '4',
      sku: 'VEST-FLORAL-04',
      barcodeEan13: '789123450002',
      stockReal: 20,
      stockReserved: 0,
      price: 49.9,
      costPrice: 18.5,
    },
    {
      id: 'v-init-3',
      color: 'Floral Branco',
      size: '6',
      sku: 'VEST-FLORAL-06',
      barcodeEan13: '789123450003',
      stockReal: 18,
      stockReserved: 0,
      price: 49.9,
      costPrice: 18.5,
    },
  ]);

  // Media
  const [coverImageUrl, setCoverImageUrl] = useState(
    'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=600&q=80'
  );
  const [secondaryImages, setSecondaryImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=600&q=80',
  ]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Fiscal
  const [fiscal, setFiscal] = useState<FiscalData>({
    ncm: '6104.42.00',
    cest: '28.038.00',
    origem: 0,
    icmsCst: '102',
  });
  const [weightGrams, setWeightGrams] = useState<number>(180);
  const [dimensions, setDimensions] = useState({ height: 4, width: 20, depth: 25 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddSecondaryImage = () => {
    if (!newImageUrl.trim()) return;
    setSecondaryImages(prev => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleRemoveSecondaryImage = (idx: number) => {
    setSecondaryImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !masterSku.trim() || variations.length === 0) {
      setErrorMessage('Por favor, preencha o Nome, SKU Mestre e ao menos uma variação de grade.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      title: title.trim(),
      masterSku: masterSku.trim().toUpperCase(),
      description: description.trim() || `${title} da coleção oficial sagas.moda.`,
      categoryId:
        categoryId === 'infantil'
          ? 'cat-infantil'
          : categoryId === 'masculino'
          ? 'cat-masculino'
          : 'cat-feminino',
      category:
        categoryId === 'infantil'
          ? 'Infantil'
          : categoryId === 'masculino'
          ? 'Masculino'
          : 'Feminino',
      basePrice,
      costPrice,
      coverImageUrl,
      mediaGallery: secondaryImages,
      weightGrams,
      dimensionsCm: dimensions,
      fiscal,
      variations: variations.map(v => ({
        size: v.size,
        color: v.color,
        sku: v.sku,
        barcodeEan13: v.barcodeEan13,
        stock: v.stockReal,
        price: v.price,
        costPrice: v.costPrice,
      })),
    };

    try {
      const res = await apiClient.post<any>('/api/products', payload);
      const savedProd = mapDtoToAdminProduct(res?.data || { id: `prod-${Date.now()}`, ...payload });
      onSaveProduct(savedProd);
      onClose();
    } catch {
      const fallbackProd = mapDtoToAdminProduct({
        id: `prod-${Date.now()}`,
        ...payload,
      });
      onSaveProduct(fallbackProd);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div>
            <h3 className="font-extrabold text-stone-900 text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-rose-600" />
              Novo Produto — Cadastro Centralizado ERP
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Fonte única da verdade com grade dinâmica e preparo automático para marketplaces.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 bg-white px-5 gap-2 pt-2">
          {[
            { id: 'geral', label: '1. Dados Gerais', icon: Package },
            { id: 'grade', label: '2. Grade de Variações (P/M/G)', icon: Layers, badge: variations.length },
            { id: 'midia', label: '3. Mídia & Foto Capa (1:1)', icon: ImageIcon },
            { id: 'fiscal', label: '4. Fiscal & Dimensões', icon: FileText },
            { id: 'lucro', label: '5. Lucro por Canal', icon: Calculator },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                  isActive
                    ? 'border-rose-600 text-rose-600 bg-rose-50/30'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded-full font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* ABA 1: DADOS GERAIS */}
          {activeTab === 'geral' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-stone-700 mb-1">
                    Nome Completo do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ex: Vestido Infantil Floral Primavera em Algodão"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-semibold focus:outline-rose-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    SKU Mestre (Pai) *
                  </label>
                  <input
                    type="text"
                    required
                    value={masterSku}
                    onChange={e => setMasterSku(e.target.value)}
                    placeholder="Ex: VEST-FLORAL"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono text-stone-900 font-bold uppercase focus:outline-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-medium focus:outline-rose-500"
                  >
                    <option value="infantil">Moda Infantil</option>
                    <option value="feminino">Moda Feminina</option>
                    <option value="masculino">Moda Masculina</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Preço Base Tabela (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={basePrice}
                    onChange={e => setBasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-rose-600 font-black text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={costPrice}
                    onChange={e => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Descrição Comercial para Vitrine & Marketplaces
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Confeccionado em tecido leve 100% algodão, manga com babados e estampa floral exclusiva. Perfeito para passeios e ensaios fotográficos em família."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                />
              </div>
            </div>
          )}

          {/* ABA 2: GRADE DE VARIAÇÕES (GRADE EDITOR) */}
          {activeTab === 'grade' && (
            <GradeEditor
              masterSku={masterSku || 'VEST-PROD'}
              basePrice={basePrice}
              costPrice={costPrice}
              variations={variations}
              onChange={setVariations}
            />
          )}

          {/* ABA 3: MÍDIA */}
          {activeTab === 'midia' && (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  URL da Foto de Capa (Proporção 1:1 Obrigatória) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={coverImageUrl}
                    onChange={e => setCoverImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                  />
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-28 h-28 rounded-xl overflow-hidden border-2 border-rose-500 shrink-0 relative">
                  <img
                    src={coverImageUrl}
                    alt="Preview Capa"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1 right-1 bg-stone-900/90 text-white text-[9px] font-bold text-center rounded py-0.5">
                    1:1 Capa Oficial
                  </span>
                </div>

                <div className="flex-1 space-y-2">
                  <span className="font-bold text-stone-800 block">Fotos Secundárias (Detalhes, Costas, Tecido):</span>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={e => setNewImageUrl(e.target.value)}
                      placeholder="Insira URL da foto secundária..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-stone-900"
                    />
                    <button
                      type="button"
                      onClick={handleAddSecondaryImage}
                      className="px-3 py-1.5 rounded-lg bg-stone-800 text-white font-bold"
                    >
                      Adicionar
                    </button>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {secondaryImages.map((img, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-stone-300 group">
                        <img src={img} alt="Secundária" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveSecondaryImage(i)}
                          className="absolute inset-0 bg-stone-900/70 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: FISCAL & DIMENSÕES */}
          {activeTab === 'fiscal' && (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-sky-900 leading-relaxed">
                Dados essenciais para a emissão de <strong>NF-e (Nota Fiscal Eletrônica)</strong> e cálculo automático do frete com geração de etiqueta 10x15cm no padrão dos Correios, Shopee Xpress e Mercado Envios.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">NCM</label>
                  <input
                    type="text"
                    required
                    value={fiscal.ncm}
                    onChange={e => setFiscal({ ...fiscal, ncm: e.target.value })}
                    placeholder="6104.42.00"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono text-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">CEST</label>
                  <input
                    type="text"
                    value={fiscal.cest}
                    onChange={e => setFiscal({ ...fiscal, cest: e.target.value })}
                    placeholder="28.038.00"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono text-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Origem</label>
                  <select
                    value={fiscal.origem}
                    onChange={e => setFiscal({ ...fiscal, origem: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                  >
                    <option value={0}>0 - Nacional</option>
                    <option value={1}>1 - Estrangeira (Importação Direta)</option>
                    <option value={2}>2 - Estrangeira (Adquirida no Mercado Interno)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Peso (Gramas)</label>
                  <input
                    type="number"
                    min="1"
                    value={weightGrams}
                    onChange={e => setWeightGrams(parseInt(e.target.value) || 200)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 font-bold text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Altura (cm)</label>
                  <input
                    type="number"
                    value={dimensions.height}
                    onChange={e => setDimensions({ ...dimensions, height: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Largura (cm)</label>
                  <input
                    type="number"
                    value={dimensions.width}
                    onChange={e => setDimensions({ ...dimensions, width: parseInt(e.target.value) || 20 })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Comprimento (cm)</label>
                  <input
                    type="number"
                    value={dimensions.depth}
                    onChange={e => setDimensions({ ...dimensions, depth: parseInt(e.target.value) || 25 })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA 5: SIMULADOR DE LUCRO POR CANAL */}
          {activeTab === 'lucro' && (
            <ChannelProfitTable
              cmv={costPrice}
              basePrice={basePrice}
              variations={variations}
            />
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Form Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-200">
            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{variations.length} variações prontas para gravação</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-stone-600 font-semibold hover:bg-stone-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold shadow-md transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Package className="w-4 h-4" />
                <span>{isSubmitting ? 'Salvando no Neon DB...' : 'Salvar Produto no ERP'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
