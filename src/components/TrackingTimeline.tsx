import React from 'react';
import {
  CheckCircle2,
  Truck,
  Package,
  Clock,
  AlertTriangle,
  MapPin,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import { TrackingEvent, DeliveryStatus } from '../types';

interface TrackingTimelineProps {
  events: TrackingEvent[];
  currentStatus?: DeliveryStatus;
  className?: string;
}

export const TrackingTimeline: React.FC<TrackingTimelineProps> = ({
  events,
  currentStatus,
  className = '',
}) => {
  if (!events || events.length === 0) {
    return (
      <div className="py-8 text-center text-stone-400 text-xs bg-stone-50 rounded-xl border border-dashed border-stone-200">
        Nenhum evento de rastreamento registrado ainda. O pacote está em preparação.
      </div>
    );
  }

  // Ordenar eventos do mais recente para o mais antigo
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getStatusIcon = (status: DeliveryStatus, isLatest: boolean) => {
    switch (status) {
      case 'ENTREGUE':
        return <CheckCircle2 className={`w-4 h-4 ${isLatest ? 'text-emerald-600' : 'text-stone-400'}`} />;
      case 'SAIU_ENTREGA':
        return <Truck className={`w-4 h-4 ${isLatest ? 'text-indigo-600' : 'text-stone-400'}`} />;
      case 'EM_TRANSITO':
        return <Clock className={`w-4 h-4 ${isLatest ? 'text-blue-600' : 'text-stone-400'}`} />;
      case 'POSTADO':
        return <Package className={`w-4 h-4 ${isLatest ? 'text-amber-600' : 'text-stone-400'}`} />;
      case 'DEVOLVIDO':
      case 'EXTRAVIADO':
        return <AlertTriangle className={`w-4 h-4 ${isLatest ? 'text-rose-600' : 'text-stone-400'}`} />;
      default:
        return <Package className="w-4 h-4 text-stone-400" />;
    }
  };

  const getStatusBadgeStyle = (status: DeliveryStatus, isLatest: boolean) => {
    if (!isLatest) return 'bg-stone-100 text-stone-500 border-stone-200';

    switch (status) {
      case 'ENTREGUE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
      case 'SAIU_ENTREGA':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold animate-pulse';
      case 'EM_TRANSITO':
        return 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
      case 'POSTADO':
        return 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
      case 'DEVOLVIDO':
      case 'EXTRAVIADO':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
      default:
        return 'bg-stone-50 text-stone-600 border-stone-200';
    }
  };

  const formatEventDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return {
        date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
    } catch {
      return { date: isoString, time: '' };
    }
  };

  return (
    <div className={`relative pl-6 space-y-6 ${className}`}>
      {/* Linha vertical contínua da timeline */}
      <div className="absolute top-2 bottom-2 left-2.5 w-0.5 bg-stone-200" />

      {sortedEvents.map((ev, index) => {
        const isLatest = index === 0;
        const { date, time } = formatEventDate(ev.timestamp);

        return (
          <div key={ev.id || index} className="relative group">
            {/* Ponto / Ícone no eixo */}
            <div
              className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all bg-white border-2 shadow-xs ${
                isLatest
                  ? 'border-rose-600 ring-4 ring-rose-50'
                  : 'border-stone-300'
              }`}
            >
              {getStatusIcon(ev.status, isLatest)}
            </div>

            {/* Conteúdo do Evento */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              isLatest
                ? 'bg-rose-50/20 border-rose-200 shadow-xs'
                : 'bg-white border-stone-200 hover:border-stone-300'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] uppercase border ${getStatusBadgeStyle(
                      ev.status,
                      isLatest
                    )}`}
                  >
                    {ev.status.replace('_', ' ')}
                  </span>
                  {isLatest && (
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                      Última Atualização
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[11px] text-stone-400 font-mono">
                  <Calendar className="w-3 h-3 text-stone-400" />
                  <span>{date} às {time}</span>
                </div>
              </div>

              <p className={`text-xs leading-relaxed ${isLatest ? 'font-bold text-stone-900' : 'text-stone-700'}`}>
                {ev.description}
              </p>

              {ev.location && (
                <div className="flex items-center gap-1 mt-2 text-[11px] text-stone-500 font-medium">
                  <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                  <span>{ev.location}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
