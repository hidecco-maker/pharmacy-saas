'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  History,
  Loader2,
  Download,
  RefreshCw,
  Clock,
  User,
  Trash2
} from 'lucide-react';
import { formatFloat } from '@/lib/utils';

export default function TenantSales() {
  const params = useParams();
  const tenantId = params?.tenantId as string;
  const router = useRouter();

  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${tenantId}/sales`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setSales(data);
    } catch (err) {
      console.error('Failed to fetch sales history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchSales();
    }
  }, [tenantId]);

  const handleDeleteSale = async (id: string, customerName: string) => {
    if (!confirm(`「${customerName}」の来局記録を削除しますか？\n※ 在庫は自動的に払い戻されます。`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/${tenantId}/sales/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchSales();
      } else {
        const err = await res.json();
        alert(`削除に失敗しました: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('削除に失敗しました。');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleExportSalesToCsv = () => {
    let csvContent = '\uFEFF';
    csvContent += '来店・販売日時,顧客名,販売商品明細\n';
    
    sales.forEach(s => {
      const escapedName = s.customer?.name.includes(',') || s.customer?.name.includes('"') 
        ? `"${s.customer?.name.replace(/"/g, '""')}"` 
        : s.customer?.name;
      
      const itemsStr = s.items
        .map((i: any) => `${i.product?.name || '不明'}(x${formatFloat(i.quantity)})`)
        .join('; ');
      
      const escapedItems = itemsStr.includes(',') || itemsStr.includes('"') || itemsStr.includes(';')
        ? `"${itemsStr.replace(/"/g, '""')}"`
        : itemsStr;

      csvContent += `${formatDate(s.visitedAt)},${escapedName},${escapedItems}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `来店販売履歴_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-700">
        <Loader2 className="w-12 h-12 text-sky-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">履歴データを読み込んでいます...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sky-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-50 text-sky-500 rounded-xl border border-sky-200">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-700 text-lg">来店・売上履歴（最新100件）</h3>
            <p className="text-xs text-slate-500">実売した商品の明細と顧客ごとの来店記録を表示します</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSalesToCsv}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            履歴CSV出力
          </button>
          <button
            onClick={fetchSales}
            className="flex items-center gap-2 bg-sky-100 hover:bg-slate-700 text-slate-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border border-slate-700 active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            更新
          </button>
        </div>
      </div>

      {sales.length === 0 ? (
        <div className="text-center py-12 bg-sky-50/40 rounded-2xl border border-dashed border-sky-100">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">履歴はありません。</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-sky-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-4">来店日時</th>
                <th className="py-4 px-4">顧客名</th>
                <th className="py-4 px-4">購入商品明細</th>
                <th className="py-4 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100 text-sm">
              {sales.map((sale, index) => (
                <tr key={index} className="hover:bg-sky-50/35 transition-colors group">
                  <td className="py-4 px-4 text-slate-600 font-medium">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      {formatDate(sale.visitedAt)}
                    </div>
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-700">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500" />
                      {sale.customer?.name}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {sale.items.length === 0 ? (
                      <span className="text-slate-500 text-xs italic">商品購入なし</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {sale.items.map((item: any, iIdx: number) => (
                          <span key={iIdx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-sky-100 text-slate-600 text-xs rounded-lg">
                            {item.product?.name || '不明商品'}
                            <span className="text-sky-500 font-bold">x{formatFloat(item.quantity)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => handleDeleteSale(sale.id, sale.customer?.name ?? '不明')}
                      disabled={deletingId === sale.id}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-rose-600 hover:bg-rose-500 px-3 py-2 rounded-lg shadow-md disabled:opacity-50 cursor-pointer transition-all active:scale-95"
                      title="この来局記録を削除（在庫払い戻しあり）"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
