import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  Layers,
  DollarSign,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Product } from '../types';
import { mapDtoToAdminProduct } from '../hooks/useProducts';
import apiClient, { ApiResponse } from '../services/apiClient';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSaved: (savedProduct: Product, isEdit: boolean) => void;
  editingProduct?: Product | null;
}

interface VariationRow {
  id?: string;
  size: string;
  color: string;
  sku: string;
  barcodeEan13: string;
  stock: string;
  price: string;
  costPrice: string;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onProductSaved,
  editingProduct = null,
}) => {
  const [activeSection, setActiveSection] = useState<'basico' | 'grade' | 'midia' | 'fiscal'>('basico');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dados Básicos
  const [title, setTitle] = useState('');
  const [masterSku, setMasterSku] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('sagas.moda');
  const [categoryId, setCategoryId] = useState<'infantil' | 'feminino' | 'masculino'>('feminino');
  const [basePrice, setBasePrice] = useState('89.90');
  const [costPrice, setCostPrice] = useState('34.90');
  const [weightGrams, setWeightGrams] = useState('250');
  const [isActive, setIsActive] = useState(true);

  // Mídia
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [extraImages, setExtraImages] = useState<string[]>(['']);

  // Dados Fiscais SEFAZ
  const [ncm, setNcm] = useState('61044200');
  const [cest, setCest] = useState('2803800');
  const [cfopPadrao, setCfopPadrao] = useState('5102');
  const [origemMercadoria, setOrigemMercadoria] = useState('0');

  // Grade Matricial (Tamanhos x Cores)
  const [variations, setVariations] = useState<VariationRow[]>([
    {
      size: 'M',
      color: 'Preto',
      sku: '',
      barcodeEan13: '7898945109901',
      stock: '15',
      price: '89.90',
      costPrice: '34.90',
    },
  ]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setActiveSection('basico');

    if (editingProduct) {
      setTitle(editingProduct.title || '');
      setMasterSku(editingProduct.masterSku || '');
      setDescription(editingProduct.description || '');
      setBrand(editingProduct.brand || 'sagas.moda');
      setCategoryId(editingProduct.categoryId || 'feminino');
      setBasePrice(String(editingProduct.basePrice ?? 89.9));
      setCostPrice(String(editingProduct.costPrice ?? 34.9));
      setWeightGrams(String(editingProduct.weightGrams || 250));
      setIsActive(editingProduct.isActive !== false);
      setCoverImageUrl(editingProduct.imageUrl || '');
      setExtraImages(
        editingProduct.secondaryImages && editingProduct.secondaryImages.length > 0
          ? editingProduct.secondaryImages
          : ['']
      );
      setNcm((editingProduct.fiscal?.ncm || '61044200').replace(/\D/g, ''));
      setCest((editingProduct.fiscal?.cest || '2803800').replace(/\D/g, ''));

      if (editingProduct.variations && editingProduct.variations.length > 0) {
        setVariations(
          editingProduct.variations.map((v) => ({
            id: v.id,
            size: v.size,
            color: v.color,
            sku: v.sku,
            barcodeEan13: v.barcodeEan13,
            stock: String(v.stockReal ?? 0),
            price: String(v.price ?? editingProduct.basePrice),
            costPrice: String(v.costPrice ?? editingProduct.costPrice),
          }))
        );
      } else {
        setVariations([
          {
            size: 'Único',
            color: 'Padrão',
            sku: `${editingProduct.masterSku}-UN`,
            barcodeEan13: '7898945109901',
            stock: '0',
            price: String(editingProduct.basePrice),
            costPrice: String(editingProduct.costPrice),
          },
        ]);
      }
    } else {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const defaultMaster = `SAG-PROD-${randomSuffix}`;
      setTitle('');
      setMasterSku(defaultMaster);
      setDescription('');
      setBrand('sagas.moda');
      setCategoryId('feminino');
      setBasePrice('89.90');
      setCostPrice('34.90');
      setWeightGrams('250');
      setIsActive(true);
      setCoverImageUrl('');
      setExtraImages(['']);
      setVariations([
        {
          size: 'P',
          color: 'Preto',
          sku: `${defaultMaster}-P`,
          barcodeEan13: `789894510${Math.floor(1000 + Math.random() * 8999)}`,
          stock: '15',
          price: '89.90',
          costPrice: '34.90',
        },
        {
          size: 'M',
          color: 'Preto',
          sku: `${defaultMaster}-M`,
          barcodeEan13: `789894510${Math.floor(1000 + Math.random() * 8999)}`,
          stock: '20',
          price: '89.90',
          costPrice: '34.90',
        },
        {
          size: 'G',
          color: 'Preto',
          sku: `${defaultMaster}-G`,
          barcodeEan13: `789894510${Math.floor(1000 + Math.random() * 8999)}`,
          stock: '15',
          price: '89.90',
          costPrice: '34.90',
        },
      ]);
    }
  }, [isOpen, editingProduct]);

  if (!isOpen) return null;

  const handleAddVariation = () => {
    const idx = variations.length + 1;
    const randomEan = `789894510${Math.floor(1000 + Math.random() * 8999)}`;
    setVariations((prev) => [
      ...prev,
      {
        size: 'GG',
        color: 'Preto',
        sku: `${masterSku || 'SAG-NOVO'}-V${idx}`,
        barcodeEan13: randomEan,
        stock: '10',
        price: basePrice || '89.90',
        costPrice: costPrice || '34.90',
      },
    ]);
  };

  const handleRemoveVariation = (index: number) => {
    if (variations.length <= 1) return;
    setVariations((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleVariationChange = (index: number, field: keyof VariationRow, value: string) => {
    setVariations((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  };

  const handleGenerateMatrix = (sizesList: string[], colorName: string) => {
    const prefix = (masterSku || 'SAG-PROD').trim().toUpperCase();
    const generated: VariationRow[] = sizesList.map((sz, i) => ({
      size: sz,
      color: colorName || 'Padrão',
      sku: `${prefix}-${sz}`,
      barcodeEan13: `78989451${Math.floor(10000 + Math.random() * 89999)}`,
      stock: '15',
      price: basePrice || '89.90',
      costPrice: costPrice || '34.90',
    }));
    setVariations(generated);
  };

  const handleExtraImageChange = (index: number, value: string) => {
    setExtraImages((prev) => prev.map((img, i) => (i === index ? value : img)));
  };

  const handleAddExtraImage = () => {
    setExtraImages((prev) => [...prev, '']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!title.trim()) {
      setErrorMsg('Informe o título comercial do produto.');
      setActiveSection('basico');
      return;
    }

    const basePriceNum = parseFloat(basePrice) || 0;
    const costPriceNum = parseFloat(costPrice) || 0;

    if (basePriceNum <= 0) {
      setErrorMsg('O preço de venda deve ser maior que zero.');
      setActiveSection('basico');
      return;
    }

    if (costPriceNum < 0) {
      setErrorMsg('O custo CMV não pode ser negativo.');
      setActiveSection('basico');
      return;
    }

    const finalMasterSku =
      masterSku.trim().toUpperCase() || `SAG-${Date.now().toString().slice(-5)}`;

    const validExtraImages = extraImages.filter((u) => u.trim() !== '');
    const allImages = Array.from(
      new Set([...(coverImageUrl.trim() ? [coverImageUrl.trim()] : []), ...validExtraImages])
    );

    const totalStock = variations.reduce(
      (acc, v) => acc + Math.max(0, parseInt(v.stock, 10) || 0),
      0
    );

    const payload = {
      title: title.trim(),
      masterSku: finalMasterSku,
      description:
        description.trim() || `${title.trim()} — Confeccionado com padrão de qualidade sagas.moda.`,
      brand: brand.trim() || 'sagas.moda',
      category: categoryId,
      categoryId:
        categoryId === 'infantil'
          ? 'cat-infantil'
          : categoryId === 'masculino'
          ? 'cat-masculino'
          : 'cat-feminino',
      price: basePriceNum,
      basePrice: basePriceNum,
      costPrice: costPriceNum,
      stock: totalStock,
      weightGrams: parseInt(weightGrams, 10) || 250,
      images: allImages,
      coverImageUrl: allImages[0] || '',
      mediaGallery: allImages,
      isActive,
      ncm: ncm.replace(/\D/g, '').slice(0, 8) || '61044200',
      cest: cest.replace(/\D/g, '').slice(0, 7) || '2803800',
      cfopPadrao: cfopPadrao || '5102',
      origemMercadoria: parseInt(origemMercadoria, 10) || 0,
      variations: variations.map((v, i) => ({
        ...(v.id ? { id: v.id } : {}),
        size: v.size.trim() || 'Único',
        color: v.color.trim() || 'Padrão',
        sku: v.sku.trim().toUpperCase() || `${finalMasterSku}-${v.size || i + 1}`,
        barcodeEan13: v.barcodeEan13.trim() || `78989451099${10 + i}`,
        stock: Math.max(0, parseInt(v.stock, 10) || 0),
        price: parseFloat(v.price) || basePriceNum,
        costPrice: parseFloat(v.costPrice) || costPriceNum,
      })),
    };

    try {
      setSubmitting(true);
      const isEdit = Boolean(editingProduct?.id);
      const res = isEdit
        ? await apiClient.put<ApiResponse<any>>(`/api/products/${editingProduct!.id}`, payload)
        : await apiClient.post<ApiResponse<any>>('/api/products', payload);

      if (res && res.data) {
        const saved = mapDtoToAdminProduct(res.data);
        setSuccessMsg('Produto Salvo! Sincronizado em tempo real com a loja sagas.moda.');
        onProductSaved(saved, isEdit);
        setTimeout(() => {
          onClose();
        }, 700);
      } else {
        throw new Error('Resposta inválida do servidor ERP.');
      }
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Erro ao salvar produto no banco Neon. Verifique os dados informados.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const estimatedGrossMarginPct = (() => {
    const p = parseFloat(basePrice) || 0;
    const c = parseFloat(costPrice) || 0;
    if (p <= 0) return 0;
    return Math.round(((p - c) / p) * 100);
  })();

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-8">
        {/* Header do Modal */}
        <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg tracking-tight">
                {editingProduct
                  ? `Editar Produto — ${editingProduct.title}`
                  : 'Cadastrar Novo Produto no Catálogo Omnichannel'}
              </h3>
              <p className="text-xs text-stone-400">
                Persistência direta no PostgreSQL Neon e publicação imediata em sagas.moda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegação de Abas do Formulário */}
        <div className="bg-stone-100 px-6 py-2.5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'basico', label: '1. Dados & Preços', icon: DollarSign },
              { id: 'grade', label: `2. Grade & Estoque (${variations.length})`, icon: Layers },
              { id: 'midia', label: '3. Fotos & Galeria', icon: ImageIcon },
              { id: 'fiscal', label: '4. Fiscal (NCM / SEFAZ)', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isAct = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isAct
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-white text-stone-600 hover:bg-stone-200/70 border border-stone-200/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isAct ? 'text-rose-400' : 'text-stone-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Toggle de Visibilidade na Loja (Tarefa 3: isActive) */}
          <button
            type="button"
            onClick={() => setIsActive((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isActive
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-stone-200 text-stone-700 border-stone-300'
            }`}
          >
            {isActive ? (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ativo na Loja (Visível)</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-stone-500" />
                <span>Inativo (Oculto na Loja)</span>
              </>
            )}
          </button>
        </div>

        {/* Corpo do Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-extrabold flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ABA 1: DADOS BÁSICOS E PREÇOS */}
          {activeSection === 'basico' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Título Comercial do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Vestido Infantil Festa Laço Cetim"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    SKU Mestre (Master SKU) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingProduct)}
                    value={masterSku}
                    onChange={(e) => setMasterSku(e.target.value.toUpperCase())}
                    placeholder="Ex: VEST-LACO-01"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono font-bold text-stone-900 uppercase focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:bg-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Categoria Principal
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-bold text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="feminino">Feminino Adulto</option>
                    <option value="infantil">Moda Infantil</option>
                    <option value="masculino">Masculino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Marca / Fabricante
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Peso Médio p/ Frete (gramas)
                  </label>
                  <input
                    type="number"
                    min="10"
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Precificação e CMV */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Custo de Aquisição / CMV (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Preço Base App sagas.moda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm font-mono font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="bg-white p-3 rounded-xl border border-stone-200">
                  <span className="text-[11px] font-bold text-stone-500 block">
                    Markup Bruto Inicial
                  </span>
                  <span
                    className={`text-lg font-black ${
                      estimatedGrossMarginPct >= 45
                        ? 'text-emerald-700'
                        : estimatedGrossMarginPct >= 25
                        ? 'text-amber-700'
                        : 'text-rose-600'
                    }`}
                  >
                    {estimatedGrossMarginPct}% sobre venda
                  </span>
                  <span className="block text-[10px] text-stone-400">
                    O Simulador M10 calculará as taxas de cada canal
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Descrição Comercial & Detalhes do Tecido
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva modelagem, composição do tecido, instruções de lavagem..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          )}

          {/* ABA 2: GRADE MATRICIAL (TAMANHOS X CORES X ESTOQUE) */}
          {activeSection === 'grade' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                <div>
                  <h4 className="font-bold text-stone-900 text-xs">
                    Gerador Rápido de Grade de Moda
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Preencha automaticamente os SKUs e códigos EAN-13 por faixa de tamanho
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleGenerateMatrix(['2', '4', '6', '8', '10'], 'Padrão')}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-bold cursor-pointer"
                  >
                    Grade Infantil (2 ao 10)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateMatrix(['P', 'M', 'G', 'GG'], 'Preto')}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-bold cursor-pointer"
                  >
                    Grade Adulto (P ao GG)
                  </button>
                  <button
                    type="button"
                    onClick={handleAddVariation}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Variação</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {variations.map((v, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center bg-stone-50/70 p-2.5 rounded-xl border border-stone-200 text-xs"
                  >
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-stone-500">Tamanho</label>
                      <input
                        type="text"
                        value={v.size}
                        onChange={(e) => handleVariationChange(idx, 'size', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-stone-300 bg-white font-bold text-stone-900"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-stone-500">Cor</label>
                      <input
                        type="text"
                        value={v.color}
                        onChange={(e) => handleVariationChange(idx, 'color', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-stone-300 bg-white font-semibold text-stone-900"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[10px] font-bold text-stone-500">SKU Variação</label>
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) =>
                          handleVariationChange(idx, 'sku', e.target.value.toUpperCase())
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-stone-300 bg-white font-mono font-bold text-stone-900"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-stone-500">EAN-13</label>
                      <input
                        type="text"
                        value={v.barcodeEan13}
                        onChange={(e) =>
                          handleVariationChange(idx, 'barcodeEan13', e.target.value)
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-stone-300 bg-white font-mono text-stone-700"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-stone-500">
                        Estoque Físico
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={v.stock}
                        onChange={(e) => handleVariationChange(idx, 'stock', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-stone-300 bg-white font-mono font-bold text-emerald-700"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveVariation(idx)}
                        disabled={variations.length <= 1}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 3: MÍDIA & FOTOS */}
          {activeSection === 'midia' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                <div className="sm:col-span-8 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      URL da Foto de Capa Principal (Proporção 3:4 ou 1:1)
                    </label>
                    <input
                      type="url"
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-stone-700">
                        Fotos Secundárias da Galeria
                      </label>
                      <button
                        type="button"
                        onClick={handleAddExtraImage}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Mais uma URL</span>
                      </button>
                    </div>
                    {extraImages.map((imgUrl, idx) => (
                      <input
                        key={idx}
                        type="url"
                        value={imgUrl}
                        onChange={(e) => handleExtraImageChange(idx, e.target.value)}
                        placeholder={`URL da Imagem Secundária #${idx + 1}`}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono text-stone-800"
                      />
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-4 bg-stone-50 border border-stone-200 rounded-2xl p-3 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-bold text-stone-500 mb-2">
                    Preview da Capa
                  </span>
                  {coverImageUrl ? (
                    <img
                      src={coverImageUrl}
                      alt="Preview Capa"
                      className="w-36 h-44 object-cover rounded-xl border border-stone-300 shadow-xs"
                    />
                  ) : (
                    <div className="w-36 h-44 rounded-xl border border-dashed border-stone-300 flex items-center justify-center text-xs text-stone-400 text-center p-2">
                      Insira uma URL de imagem para visualizar
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: DADOS FISCAIS SEFAZ */}
          {activeSection === 'fiscal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  NCM (Vestuário / Confecção - 8 dígitos)
                </label>
                <input
                  type="text"
                  value={ncm}
                  onChange={(e) => setNcm(e.target.value)}
                  placeholder="61044200"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono font-bold text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  CEST (Código Especificador ST)
                </label>
                <input
                  type="text"
                  value={cest}
                  onChange={(e) => setCest(e.target.value)}
                  placeholder="2803800"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  CFOP Padrão de Saída Estadual
                </label>
                <input
                  type="text"
                  value={cfopPadrao}
                  onChange={(e) => setCfopPadrao(e.target.value)}
                  placeholder="5102"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Origem da Mercadoria (ICMS)
                </label>
                <select
                  value={origemMercadoria}
                  onChange={(e) => setOrigemMercadoria(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold text-stone-900 bg-white"
                >
                  <option value="0">0 - Nacional</option>
                  <option value="1">1 - Estrangeira (Importação Direta)</option>
                  <option value="2">2 - Estrangeira (Adquirida no Mercado Interno)</option>
                </select>
              </div>
            </div>
          )}

          {/* Rodapé de Ações */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-3">
            <div className="text-xs text-stone-500">
              Total na Grade:{' '}
              <strong className="text-stone-900">
                {variations.reduce((acc, v) => acc + (parseInt(v.stock, 10) || 0), 0)} unidades
              </strong>{' '}
              em <strong>{variations.length}</strong> variações
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando no Banco Neon...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingProduct ? 'Salvar Alterações' : 'Salvar e Publicar Produto'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
