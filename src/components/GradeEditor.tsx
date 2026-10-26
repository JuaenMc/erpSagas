import React, { useState } from 'react';
import { Layers, Plus, Trash2, Wand2, RefreshCw, Barcode } from 'lucide-react';
import { ProductVariation } from '../types';

interface GradeEditorProps {
  masterSku: string;
  basePrice: number;
  costPrice: number;
  variations: ProductVariation[];
  onChange: (variations: ProductVariation[]) => void;
}

export const GradeEditor: React.FC<GradeEditorProps> = ({
  masterSku,
  basePrice,
  costPrice,
  variations,
  onChange,
}) => {
  const [colorsInput, setColorsInput] = useState<string>('Floral Branco, Rosa Salmão');
  const [sizesInput, setSizesInput] = useState<string>('2, 4, 6, 8');
  const [quickStock, setQuickStock] = useState<number>(15);

  const handleGenerateMatrix = () => {
    const colors = colorsInput
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);
    const sizes = sizesInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (colors.length === 0 || sizes.length === 0) return;

    const cleanMasterSku = masterSku.trim() || 'PROD-MODA';

    const newVariations: ProductVariation[] = [];
    let eanCounter = 789123450000;

    for (const color of colors) {
      for (const size of sizes) {
        eanCounter += 1;
        const colorTag = color.toUpperCase().replace(/\s+/g, '-').slice(0, 6);
        const sku = `${cleanMasterSku}-${colorTag}-${size}`.toUpperCase();

        newVariations.push({
          id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          color,
          size,
          sku,
          barcodeEan13: eanCounter.toString(),
          stockReal: quickStock,
          stockReserved: 0,
          price: basePrice || 49.9,
          costPrice: costPrice || 18.0,
        });
      }
    }

    onChange(newVariations);
  };

  const handleUpdateVariation = (
    index: number,
    field: keyof ProductVariation,
    value: any
  ) => {
    const updated = [...variations];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleRemoveVariation = (index: number) => {
    onChange(variations.filter((_, i) => i !== index));
  };

  const handleApplyBasePriceToAll = () => {
    onChange(
      variations.map(v => ({
        ...v,
        price: basePrice,
        costPrice: costPrice,
      }))
    );
  };

  const handleApplyQuickStockToAll = () => {
    onChange(
      variations.map(v => ({
        ...v,
        stockReal: quickStock,
      }))
    );
  };

  return (
    <div className="space-y-4">
      {/* Gerador Matricial Dinâmico */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-stone-900 flex items-center gap-1.5 text-sm">
            <Wand2 className="w-4 h-4 text-rose-600" />
            Gerador Matricial de Atributos (Cores × Tamanhos)
          </span>
          <span className="text-[10px] text-stone-500">
            Gera SKUs e códigos EAN-13 automaticamente
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Cores (separadas por vírgula):
            </label>
            <input
              type="text"
              value={colorsInput}
              onChange={e => setColorsInput(e.target.value)}
              placeholder="Ex: Preto, Branco, Terracota"
              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-rose-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Tamanhos (separados por vírgula):
            </label>
            <input
              type="text"
              value={sizesInput}
              onChange={e => setSizesInput(e.target.value)}
              placeholder="Ex: P, M, G ou 2, 4, 6, 8"
              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-rose-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200">
          <div className="flex items-center gap-2">
            <span className="text-stone-600">Estoque inicial padrão:</span>
            <input
              type="number"
              min="0"
              value={quickStock}
              onChange={e => setQuickStock(parseInt(e.target.value) || 0)}
              className="w-16 px-2 py-1 rounded border border-stone-300 text-stone-900 font-bold bg-white text-center"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerateMatrix}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Gerar Grade Matricial Automática</span>
          </button>
        </div>
      </div>

      {/* Ações em Lote para a Grade */}
      {variations.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-stone-800">
            {variations.length} variações geradas na grade:
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApplyBasePriceToAll}
              className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold border border-stone-200"
            >
              Aplicar R$ {basePrice.toFixed(2)} a Todas
            </button>
            <button
              type="button"
              onClick={handleApplyQuickStockToAll}
              className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold border border-stone-200"
            >
              Aplicar {quickStock} unids a Todas
            </button>
          </div>
        </div>
      )}

      {/* Tabela de Variações */}
      <div className="overflow-x-auto border border-stone-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-2.5">Cor</th>
              <th className="p-2.5">Tamanho</th>
              <th className="p-2.5">SKU Individual</th>
              <th className="p-2.5">Cód. Barras EAN</th>
              <th className="p-2.5 w-24">Estoque</th>
              <th className="p-2.5 w-28">Preço (R$)</th>
              <th className="p-2.5 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 bg-white">
            {variations.map((v, idx) => (
              <tr key={v.id} className="hover:bg-stone-50">
                <td className="p-2 font-medium text-stone-900">{v.color}</td>
                <td className="p-2">
                  <span className="font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-800">
                    {v.size}
                  </span>
                </td>
                <td className="p-2 font-mono text-stone-700 font-bold">{v.sku}</td>
                <td className="p-2 font-mono text-stone-500 text-[11px]">
                  {v.barcodeEan13}
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    min="0"
                    value={v.stockReal}
                    onChange={e =>
                      handleUpdateVariation(
                        idx,
                        'stockReal',
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-20 px-2 py-1 rounded border border-stone-300 font-bold text-stone-900 text-center"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={v.price}
                    onChange={e =>
                      handleUpdateVariation(
                        idx,
                        'price',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-24 px-2 py-1 rounded border border-stone-300 font-bold text-rose-600 text-center"
                  />
                </td>
                <td className="p-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveVariation(idx)}
                    className="text-stone-400 hover:text-rose-600 p-1"
                    title="Excluir variação"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
