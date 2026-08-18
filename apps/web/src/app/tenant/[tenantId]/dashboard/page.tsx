'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  TrendingDown,
  Loader2,
  Clock,
  Download,
  CheckCircle2,
  X
} from 'lucide-react';
import { formatFloat } from '@/lib/utils';

export default function TenantDashboard() {
  const params = useParams();
  const tenantId = params?.tenantId as string;
  const router = useRouter();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 来店完了モーダル用
  const [visitModalCustomer, setVisitModalCustomer] = useState<any | null>(null);
  const [visitActualItems, setVisitActualItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [visitNextInterval, setVisitNextInterval] = useState<number>(14);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${tenantId}/dashboard`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (data && !data.error) {
        setDashboardData({
          ...data,
          schedule: Array.isArray(data.schedule) ? data.schedule : [],
          deadStocks: Array.isArray(data.deadStocks) ? data.deadStocks : [],
          alerts: {
            nextWeek: data.alerts && Array.isArray(data.alerts.nextWeek) ? data.alerts.nextWeek : [],
            nextMonth: data.alerts && Array.isArray(data.alerts.nextMonth) ? data.alerts.nextMonth : [],
          }
        });
      } else {
        setDashboardData({ schedule: [], deadStocks: [], alerts: { nextWeek: [], nextMonth: [] } });
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setDashboardData({ schedule: [], deadStocks: [], alerts: { nextWeek: [], nextMonth: [] } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  // 来店完了モーダルを開く
  const openVisitModal = (customer: any) => {
    setVisitModalCustomer(customer);
    setVisitNextInterval(customer.visitInterval);
    // 初期値として希望商品をセット
    setVisitActualItems(
      customer.requirements.map((r: any) => ({
        productId: r.productId,
        quantity: r.quantity,
      }))
    );
  };

  // 来店完了処理の送信
  const handleVisitCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitModalCustomer) return;
    setActionLoading(`visit-${visitModalCustomer.customerId}`);
    try {
      const res = await fetch(`/api/${tenantId}/customers/visit-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: visitModalCustomer.customerId,
          actualItems: visitActualItems,
          nextVisitInterval: Number(visitNextInterval), // 0で来店不要設定が可能
        }),
      });
      if (res.ok) {
        setVisitModalCustomer(null);
        await fetchData();
      } else {
        alert('来店処理に失敗しました。');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // スケジュールCSV出力
  const handleExportScheduleToCsv = () => {
    if (!dashboardData?.schedule) return;
    let csvContent = '\uFEFF'; // Excel文字化け防止用のBOM
    csvContent += '顧客名,来店予定日,希望商品一覧\n';
    
    dashboardData.schedule.forEach((c: any) => {
      const escapedName = c.customerName.includes(',') || c.customerName.includes('"') 
        ? `"${c.customerName.replace(/"/g, '""')}"` 
        : c.customerName;
      
      const reqsStr = c.requirements
        .map((r: any) => `${r.productName}(x${formatFloat(r.quantity)})`)
        .join('; ');
      const escapedReqsStr = reqsStr.includes(',') || reqsStr.includes('"') || reqsStr.includes(';')
        ? `"${reqsStr.replace(/"/g, '""')}"`
        : reqsStr;

      csvContent += `${escapedName},${c.visitDate},${escapedReqsStr}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `直近来店予定_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 日付ユーティリティ
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDayBadgeColor = (dateStr: string, isCompleted?: boolean) => {
    if (isCompleted) return 'bg-slate-500/20 text-slate-500 border border-slate-500/30';
    const today = new Date().toLocaleDateString('sv-SE');
    if (dateStr === today) return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    if (dateStr < today) return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    return 'bg-blue-500/10 text-blue-300 border border-blue-500/20';
  };

  const getDayLabel = (dateStr: string, isCompleted?: boolean) => {
    if (isCompleted) return '来店済み';
    const today = new Date().toLocaleDateString('sv-SE');
    if (dateStr === today) return '本日';
    if (dateStr < today) return '未送信・過去予定';
    return '今後予定';
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-700">
        <Loader2 className="w-12 h-12 text-sky-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium tracking-wide">データを読み込んでいます...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* アラートダッシュボード */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 来週不足（7日間） */}
        <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-xl relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-rose-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="font-bold text-slate-700 text-base">来週不足しそうな商品（7日以内）</h3>
            </div>
            <span className="text-[10px] bg-rose-500/10 text-rose-400 font-semibold px-2 py-1 rounded border border-rose-500/20">
              要対応
            </span>
          </div>

          {dashboardData?.alerts?.nextWeek?.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">来週不足する予定の商品はありません。</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {dashboardData?.alerts?.nextWeek?.map((item: any) => (
                <div key={item.id} className="bg-sky-50/60 border border-sky-100/80 rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-semibold text-slate-700">{item.name}</span>
                    <span className="text-rose-400 font-bold">
                      不足: {formatFloat(Math.abs(item.remainingStock))} {item.unit || '個'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500">
                    <div>現在庫: <span className="text-slate-700 font-semibold">{formatFloat(item.currentStock)}</span></div>
                    <div>予測需要: <span className="text-rose-300 font-semibold">{formatFloat(item.totalDemand)}</span></div>
                    <div>残在庫: <span className="text-rose-400 font-semibold">{formatFloat(item.remainingStock)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 今月不足（30日間） */}
        <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-xl relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-amber-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-700 text-base">今月不足しそうな商品（30日以内）</h3>
            </div>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 font-semibold px-2 py-1 rounded border border-amber-500/20">
              警戒
            </span>
          </div>

          {dashboardData?.alerts?.nextMonth?.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">今月不足する予定の商品はありません。</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {dashboardData?.alerts?.nextMonth?.map((item: any) => (
                <div key={item.id} className="bg-sky-50/60 border border-sky-100/80 rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-semibold text-slate-700">{item.name}</span>
                    <span className="text-amber-400 font-bold">
                      不足: {formatFloat(Math.abs(item.remainingStock))} {item.unit || '個'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500">
                    <div>現在庫: <span className="text-slate-700 font-semibold">{formatFloat(item.currentStock)}</span></div>
                    <div>予測需要: <span className="text-amber-300 font-semibold">{formatFloat(item.totalDemand)}</span></div>
                    <div>残在庫: <span className="text-amber-400 font-semibold">{formatFloat(item.remainingStock)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 不動在庫 */}
        <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-xl relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-indigo-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-sky-50 rounded-lg text-sky-500 border border-sky-200">
                <TrendingDown className="w-5 h-5 text-sky-500" />
              </div>
              <h3 className="font-bold text-slate-700 text-base">不動在庫（半年先まで需要なし）</h3>
            </div>
            <span className="text-[10px] bg-sky-50 text-indigo-350 font-semibold px-2 py-1 rounded border border-sky-200">
              滞留
            </span>
          </div>

          {dashboardData?.deadStocks?.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">現在、不動在庫はありません。</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {dashboardData?.deadStocks?.map((item: any) => (
                <div key={item.id} className="bg-sky-50/60 border border-sky-100/80 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-700 block text-sm">{item.name}</span>
                    <span className="text-[9px] text-slate-500">半年間の予測需要: 0</span>
                  </div>
                  <span className="text-slate-600 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded text-xs font-bold shadow-sm">
                    在庫: {formatFloat(item.currentStock)} {item.unit || '個'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 直近の来店予定 */}
      <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-sky-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 text-sky-500 rounded-xl border border-sky-200">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-700 text-lg">直近の来店予定</h3>
              <p className="text-xs text-slate-500">前後3週間以内のスケジュールを表示しています</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportScheduleToCsv}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              予定CSV出力
            </button>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 bg-sky-100 hover:bg-slate-700 text-slate-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border border-slate-700 active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              手動更新
            </button>
          </div>
        </div>

        {dashboardData?.schedule?.length === 0 ? (
          <div className="text-center py-12 bg-sky-50/40 rounded-2xl border border-dashed border-sky-100">
            <CalendarIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">対象期間内の来店予定はありません。</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-sky-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-4">予定ステータス</th>
                  <th className="py-4 px-4">予定日</th>
                  <th className="py-4 px-4">顧客名</th>
                  <th className="py-4 px-4">希望商品 ＆ 数量</th>
                  <th className="py-4 px-4 text-right">アクション</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100 text-sm">
                {dashboardData?.schedule?.map((cust: any, index: number) => (
                  <tr key={index} className={`hover:bg-sky-50/35 transition-colors group ${cust.isCompleted ? 'opacity-50 select-none' : ''}`}>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getDayBadgeColor(cust.visitDate, cust.isCompleted)}`}>
                        <Clock className="w-3.5 h-3.5" />
                        {getDayLabel(cust.visitDate, cust.isCompleted)}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-700">
                      {formatDate(cust.visitDate)}
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-700 group-hover:text-sky-500 transition-colors">
                      {cust.customerName}
                    </td>
                    <td className="py-4 px-4">
                      {cust.requirements.length === 0 ? (
                        <span className="text-slate-500 text-xs italic">なし</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {cust.requirements.map((req: any, rIdx: number) => (
                            <span key={rIdx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-slate-600 text-xs rounded border border-slate-700">
                              {req.productName}
                              <span className="text-sky-500 font-bold ml-1">x{formatFloat(req.quantity)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {cust.isCompleted ? (
                        <span className="text-slate-550 text-xs font-semibold flex items-center justify-end gap-1.5 py-1.5">
                          <CheckCircle2 className="w-4 h-4 text-slate-500" />
                          来店済み
                        </span>
                      ) : (
                        <button
                          onClick={() => openVisitModal(cust)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all active:scale-95 shadow-md shadow-emerald-950/20 cursor-pointer"
                        >
                          来店完了
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 来店完了モーダル */}
      {visitModalCustomer && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-sky-50 border border-sky-100 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
            <button
              onClick={() => setVisitModalCustomer(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 border-b border-sky-100">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                来店処理: {visitModalCustomer.customerName}
              </h3>
              <p className="text-xs text-slate-500 mt-1">実売数量を確定して在庫数を減算し、来店実績を記録します。</p>
            </div>

            <form onSubmit={handleVisitCompleteSubmit}>
              <div className="p-6 space-y-6 max-h-[40vh] overflow-y-auto custom-scrollbar">
                {/* 実売数量の入力 */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">購入商品と数量の調整（Float対応）</h4>
                  {visitActualItems.length === 0 ? (
                    <p className="text-slate-500 text-xs italic">希望商品はありません。</p>
                  ) : (
                    <div className="space-y-3">
                      {visitActualItems.map((item, idx) => {
                        const originalReq = visitModalCustomer.requirements.find(
                          (r: any) => r.productId === item.productId
                        );
                        return (
                          <div key={idx} className="bg-sky-50/60 border border-sky-100/80 rounded-xl p-3 flex items-center justify-between gap-4">
                            <span className="font-semibold text-sm text-slate-700 truncate">{originalReq?.productName}</span>
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] text-slate-500">数量:</label>
                              <input
                                type="number"
                                step="0.01"
                                required
                                value={item.quantity}
                                onChange={(e) => {
                                  const updated = [...visitActualItems];
                                  updated[idx].quantity = parseFloat(e.target.value) || 0;
                                  setVisitActualItems(updated);
                                }}
                                className="w-20 bg-sky-50 border border-sky-100 text-center rounded-lg py-1 text-xs font-semibold text-white focus:outline-none focus:border-sky-400"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 次回周期の入力（0で不要） */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">次回来店周期の変更</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      required
                      min="0"
                      value={visitNextInterval}
                      onChange={(e) => setVisitNextInterval(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-white border border-sky-100 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-400"
                    />
                    <span className="text-sm text-slate-500 font-medium shrink-0">日周期</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    ※ 周期を「0」に設定すると「来店不要（非アクティブ）」となり、カレンダーや需要予測から完全に除外されます。
                  </p>
                </div>
              </div>

              <div className="p-6 bg-white/50 border-t border-sky-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setVisitModalCustomer(null)}
                  className="bg-sky-100 hover:bg-slate-700 text-slate-600 font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={!!actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all active:scale-98 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  来店完了を登録
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
