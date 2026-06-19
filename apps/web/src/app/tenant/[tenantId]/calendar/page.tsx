'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  X,
  CheckCircle2,
  Plus,
  Trash2,
  GripVertical,
  Lock
} from 'lucide-react';
import { formatFloat } from '@/lib/utils';

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[0]}年${parts[1]}月${parts[2]}日`;
  }
  return dateStr;
};

const getLocalDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayStr = getLocalDateStr();

const formatDateJP = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};

const formatDateJPFull = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const DOW = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日（${DOW[d.getDay()]}）`;
};

export default function TenantCalendar() {
  const params = useParams();
  const tenantId = params?.tenantId as string;
  const router = useRouter();

  const [calendarData, setCalendarData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 来店完了モーダル用（今回使用量 + 次回使用予定量）
  const [visitModalCustomer, setVisitModalCustomer] = useState<any | null>(null);
  const [visitActualItems, setVisitActualItems] = useState<{ productId: string; productName: string; usedQty: number; nextQty: number }[]>([]);
  const [visitNextInterval, setVisitNextInterval] = useState<number>(14);
  const [visitCompletedDate, setVisitCompletedDate] = useState<string>(''); // 来局完了日（YYYY-MM-DD）
  const [allProducts, setAllProducts] = useState<any[]>([]);
  // 追加薬品
  const [addMedProductId, setAddMedProductId] = useState('');
  const [addMedUsedQty, setAddMedUsedQty] = useState('0');
  const [addMedNextQty, setAddMedNextQty] = useState('1');
  // モーダル STEP管理: 'confirm_date' | 'pick_date' | 'set_interval'
  const [visitModalStep, setVisitModalStep] = useState<'confirm_date' | 'pick_date' | 'set_interval'>('confirm_date');
  // 次回日直接指定モード
  const [visitNextDirectDate, setVisitNextDirectDate] = useState<string>('');
  const [visitNextDirectMode, setVisitNextDirectMode] = useState<boolean>(false);
  // トースト通知
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 希望商品ドラッグ（モーダル内）
  const [modalDraggedIndex, setModalDraggedIndex] = useState<number | null>(null);
  const [isModalTouchDragging, setIsModalTouchDragging] = useState(false);
  const modalTouchTimeoutRef = useRef<any>(null);

  // カレンダーDnD（来店日の移動）
  const [dragVisit, setDragVisit] = useState<any | null>(null);
  const touchDragVisitRef = useRef<any>(null);
  const touchTimerRef = useRef<any>(null);
  const touchOverDateRef = useRef<string | null>(null);
  const [isTouchDraggingVisit, setIsTouchDraggingVisit] = useState(false);

  const DRAG_OVER_CLASSES = ['bg-indigo-900/40', 'border-indigo-400', 'ring-1', 'ring-indigo-400/50', 'scale-[1.02]'];

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${tenantId}/calendar?weekOffset=${weekOffset}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (data && !data.error) {
        setCalendarData({
          ...data,
          visits: Array.isArray(data.visits) ? data.visits : [],
          holidays: (data.holidays && typeof data.holidays === 'object') ? data.holidays : {}
        });
      } else {
        setCalendarData({ startDate: '', endDate: '', weekOffset: 0, visits: [], holidays: {} });
      }
    } catch (err) {
      console.error('Failed to load calendar:', err);
      setCalendarData({ startDate: '', endDate: '', weekOffset: 0, visits: [], holidays: {} });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/${tenantId}/products`);
      const data = await res.json();
      const productsArray = Array.isArray(data) ? data : [];
      setAllProducts(productsArray);
      if (productsArray.length > 0) setAddMedProductId(productsArray[0].id);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (tenantId) {
      fetchCalendar();
      fetchProducts();
    }
  }, [tenantId, weekOffset]);

  // 来店完了モーダルを開く
  const openVisitModal = (visit: any) => {
    // 完了済みカードはモーダルを開かない
    if (visit.isCompleted) return;

    // 来局完了日の初期値を「本日」に設定
    setVisitCompletedDate(todayStr);

    setVisitModalCustomer({
      customerId: visit.customerId,
      customerName: visit.customerName,
      visitInterval: visit.visitInterval || 14,
      requirements: visit.requirements.map((r: any) => ({
        productId: r.productId || '',
        productName: r.productName,
        quantity: r.quantity,
      })),
    });

    fetch(`/api/${tenantId}/customers/${visit.customerId}`)
      .then((res) => res.json())
      .then((customer) => {
        if (customer && !customer.error) {
          setVisitModalCustomer({
            customerId: customer.id,
            customerName: customer.name,
            visitInterval: customer.visitInterval,
            requirements: customer.requirements.map((r: any) => ({
              productId: r.productId,
              productName: r.product.name,
              quantity: r.quantity,
            })),
          });
          setVisitNextInterval(customer.visitInterval);
          setVisitActualItems(
            customer.requirements.map((r: any) => ({
              productId: r.productId,
              productName: r.product.name,
              usedQty: r.quantity,
              nextQty: r.quantity,
            }))
          );
        }
      })
      .catch((err) => console.error('Failed to fetch customer detail:', err));

    setVisitNextInterval(visit.visitInterval || 14);
    setVisitActualItems(
      visit.requirements.map((r: any) => ({
        productId: r.productId || '',
        productName: r.productName,
        usedQty: r.quantity,
        nextQty: r.quantity,
      }))
    );
  };

  // 次回予定日のプレビュー計算
  const calcNextVisitDate = () => {
    if (visitNextDirectMode && visitNextDirectDate) return visitNextDirectDate;
    if (!visitCompletedDate) return '';
    const base = new Date(visitCompletedDate);
    base.setDate(base.getDate() + visitNextInterval);
    return base.toISOString().split('T')[0];
  };

  // モーダル内の希望商品ドラッグ
  const handleModalDragStart = (index: number) => setModalDraggedIndex(index);
  const handleModalDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (modalDraggedIndex === null || modalDraggedIndex === index) return;
    const items = [...visitActualItems];
    const dragged = items[modalDraggedIndex];
    items.splice(modalDraggedIndex, 1);
    items.splice(index, 0, dragged);
    setModalDraggedIndex(index);
    setVisitActualItems(items);
  };
  const handleModalDragEnd = () => setModalDraggedIndex(null);

  // タッチによるモーダル内薬品並び替え（長押し）
  const handleModalTouchStart = (index: number) => {
    modalTouchTimeoutRef.current = setTimeout(() => {
      setIsModalTouchDragging(true);
      setModalDraggedIndex(index);
    }, 400); // 400ms long press to start dragging
  };

  const handleModalTouchMove = (e: React.TouchEvent) => {
    if (!isModalTouchDragging || modalDraggedIndex === null) {
      clearTimeout(modalTouchTimeoutRef.current);
      return;
    }
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;

    const itemEl = element.closest('[data-modal-drag-index]');
    if (itemEl) {
      const overIndex = parseInt(itemEl.getAttribute('data-modal-drag-index') || '', 10);
      if (!isNaN(overIndex) && overIndex !== modalDraggedIndex) {
        const items = [...visitActualItems];
        const dragged = items[modalDraggedIndex];
        items.splice(modalDraggedIndex, 1);
        items.splice(overIndex, 0, dragged);
        setModalDraggedIndex(overIndex);
        setVisitActualItems(items);
      }
    }
  };

  const handleModalTouchEnd = () => {
    clearTimeout(modalTouchTimeoutRef.current);
    setIsModalTouchDragging(false);
    setModalDraggedIndex(null);
  };

  // 薬追加
  const handleAddMedicine = () => {
    if (!addMedProductId) return;
    const exists = visitActualItems.findIndex(i => i.productId === addMedProductId);
    const product = allProducts.find(p => p.id === addMedProductId);
    if (exists >= 0) {
      const updated = [...visitActualItems];
      updated[exists].usedQty += parseFloat(addMedUsedQty) || 0;
      updated[exists].nextQty += parseFloat(addMedNextQty) || 0;
      setVisitActualItems(updated);
    } else {
      setVisitActualItems([...visitActualItems, {
        productId: addMedProductId,
        productName: product?.name || '不明',
        usedQty: parseFloat(addMedUsedQty) || 0,
        nextQty: parseFloat(addMedNextQty) || 1,
      }]);
    }
    setAddMedUsedQty('0');
    setAddMedNextQty('1');
  };

  const handleRemoveMed = (productId: string) => {
    setVisitActualItems(visitActualItems.filter(i => i.productId !== productId));
  };

  // 来店完了処理の送信
  const handleVisitCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitModalCustomer) return;
    const nextDateStr = calcNextVisitDate();
    setActionLoading(`visit-${visitModalCustomer.customerId}`);
    try {
      const res = await fetch(`/api/${tenantId}/customers/visit-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: visitModalCustomer.customerId,
          actualItems: visitActualItems.map(i => ({ productId: i.productId, quantity: i.usedQty })),
          nextItems: visitActualItems.map(i => ({ productId: i.productId, quantity: i.nextQty })),
          nextVisitInterval: visitNextDirectMode ? 0 : Number(visitNextInterval),
          visitDate: visitCompletedDate || todayStr,
          nextVisitDate: nextDateStr || undefined,
        }),
      });
      if (res.ok) {
        const nextLabel = nextDateStr ? `次回${formatDateJPFull(nextDateStr)}に設定しました` : '次回予定を登録しました';
        setVisitModalCustomer(null);
        showToast(`✅ ${visitModalCustomer.customerName}さんの来局完了。${nextLabel}。`);
        await fetchCalendar();
      } else {
        alert('来店処理に失敗しました。');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // カレンダーDnD: 来店日移動
  const handleVisitDragStart = (e: React.DragEvent, visit: any) => {
    setDragVisit(visit);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCellDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const cell = e.currentTarget as HTMLElement;
    if (!cell.classList.contains('scale-[1.02]')) {
      cell.classList.add(...DRAG_OVER_CLASSES);
    }
  };

  const handleCellDragLeave = (e: React.DragEvent) => {
    const cell = e.currentTarget as HTMLElement;
    cell.classList.remove(...DRAG_OVER_CLASSES);
  };

  const handleCellDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const cell = e.currentTarget as HTMLElement;
    cell.classList.remove(...DRAG_OVER_CLASSES);
    
    if (!dragVisit || dragVisit.visitDate === dateStr) {
      setDragVisit(null);
      return;
    }
    await rescheduleVisit(dragVisit, dateStr);
    setDragVisit(null);
  };

  // タッチによる来店日移動（長押し）
  const handleVisitTouchStart = (visit: any) => {
    touchTimerRef.current = setTimeout(() => {
      setIsTouchDraggingVisit(true);
      touchDragVisitRef.current = visit;
    }, 500);
  };

  const handleVisitTouchMove = (e: React.TouchEvent) => {
    if (!isTouchDraggingVisit) {
      clearTimeout(touchTimerRef.current);
      return;
    }
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return;
    const cell = el.closest('[data-calendar-date]') as HTMLElement;
    if (cell) {
      const targetDate = cell.getAttribute('data-calendar-date');
      if (touchOverDateRef.current !== targetDate) {
        if (touchOverDateRef.current) {
          document.querySelector(`[data-calendar-date="${touchOverDateRef.current}"]`)?.classList.remove(...DRAG_OVER_CLASSES);
        }
        touchOverDateRef.current = targetDate;
        cell.classList.add(...DRAG_OVER_CLASSES);
      }
    }
  };

  const handleVisitTouchEnd = async () => {
    clearTimeout(touchTimerRef.current);
    const targetDate = touchOverDateRef.current;
    if (targetDate) {
      document.querySelector(`[data-calendar-date="${targetDate}"]`)?.classList.remove(...DRAG_OVER_CLASSES);
    }
    
    if (isTouchDraggingVisit && touchDragVisitRef.current && targetDate) {
      if (touchDragVisitRef.current.visitDate !== targetDate) {
        await rescheduleVisit(touchDragVisitRef.current, targetDate);
      }
    }
    setIsTouchDraggingVisit(false);
    touchDragVisitRef.current = null;
    touchOverDateRef.current = null;
  };

  // 来店日の実際の変更処理（nextVisitDate のみを直接書き換える ＝ 過去実績は動かない）
  const rescheduleVisit = async (visit: any, newDateStr: string) => {
    setActionLoading(`reschedule-${visit.customerId}`);
    try {
      const res = await fetch(`/api/${tenantId}/customers/${visit.customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nextVisitDate: newDateStr, // nextVisitDate のみ更新。lastVisitDate は変更しない
        }),
      });
      if (res.ok) {
        await fetchCalendar();
      } else {
        alert('日程変更に失敗しました。');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // スケジュールCSV出力
  const handleExportScheduleToCsv = () => {
    if (!calendarData?.visits) return;
    let csvContent = '\uFEFF';
    csvContent += '顧客名,来店予定日,希望商品一覧\n';
    calendarData.visits.forEach((c: any) => {
      const escapedName = c.customerName.includes(',') || c.customerName.includes('"')
        ? `"${c.customerName.replace(/"/g, '""')}"`
        : c.customerName;
      const reqsStr = c.requirements
        .map((r: any) => `${r.productName}(x${formatFloat(r.quantity)})`).join('; ');
      const escapedReqsStr = reqsStr.includes(',') || reqsStr.includes('"') || reqsStr.includes(';')
        ? `"${reqsStr.replace(/"/g, '""')}"`
        : reqsStr;
      csvContent += `${escapedName},${c.visitDate},${escapedReqsStr}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `来店スケジュール_${calendarData.startDate}_${calendarData.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calendarDays = useMemo(() => {
    if (!calendarData?.startDate || !calendarData?.endDate) return [];
    const start = new Date(calendarData.startDate);
    const end = new Date(calendarData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
    const days = [];
    for (let i = 0; i < diffDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [calendarData?.startDate, calendarData?.endDate]);

  // Group visits by date for O(1) rendering lookup to avoid performance lag
  const visitsByDate = useMemo(() => {
    return calendarData?.visits?.reduce((acc: any, v: any) => {
      if (!acc[v.visitDate]) acc[v.visitDate] = [];
      acc[v.visitDate].push(v);
      return acc;
    }, {}) || {};
  }, [calendarData]);

  if (loading && !calendarData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-100">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium tracking-wide">カレンダーデータを読み込んでいます...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* 操作ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-lg">日曜始まりスケジュールカレンダー</h3>
            <p className="text-xs text-slate-400">
              表示期間: {calendarData?.startDate ? formatDate(calendarData.startDate) : ''} 〜 {calendarData?.endDate ? formatDate(calendarData.endDate) : ''}
              <span className="ml-2 text-indigo-400/60">※ 顧客カードを長押しでドラッグして別の日に移動できます</span>
            </p>
          </div>
        </div>

        <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl gap-1 self-start sm:self-center">
          <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-2 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer" title="前の週へ">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => {
            setWeekOffset(0);
            setTimeout(() => {
              const todayEl = document.querySelector(`[data-calendar-date="${todayStr}"]`);
              if (todayEl) {
                todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          }} className="px-3 py-1.5 hover:bg-slate-900 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer">
            今週に戻る
          </button>
          <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-2 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer" title="次の週へ">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleExportScheduleToCsv} className="flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-550 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer">
            <Download className="w-3.5 h-3.5" />
            CSV出力
          </button>
        </div>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
        <div className="text-rose-400 py-2">日</div>
        <div className="py-2">月</div>
        <div className="py-2">火</div>
        <div className="py-2">水</div>
        <div className="py-2">木</div>
        <div className="py-2">金</div>
        <div className="text-blue-400 py-2">土</div>
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-2 overflow-y-auto custom-scrollbar pr-1 max-h-[calc(100vh-14rem)] pb-10">
        {calendarDays.map((day, idx) => {
            const dateStr = day.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;
            const dayVisits = visitsByDate[dateStr] || [];
            const holidayName = calendarData?.holidays?.[dateStr] || null;

          return (
            <div
              key={idx}
              data-calendar-date={dateStr}
              onDragOver={(e) => handleCellDragOver(e, dateStr)}
              onDragLeave={handleCellDragLeave}
              onDrop={(e) => handleCellDrop(e, dateStr)}
              className={`min-h-[110px] p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                isToday
                  ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/30'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* 日付ヘッダー */}
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-bold ${
                  isToday
                    ? 'bg-indigo-500 text-white w-5 h-5 flex items-center justify-center rounded-full'
                    : day.getDay() === 0 || holidayName
                    ? 'text-rose-400'
                    : day.getDay() === 6
                    ? 'text-blue-400'
                    : 'text-slate-300'
                }`}>
                  {day.getDate()}
                </span>
                <div className="flex items-center gap-1">
                  {holidayName && (
                    <span className="text-[8px] bg-rose-500/20 text-rose-300 font-bold px-1 py-0.5 rounded border border-rose-500/30 truncate max-w-[70px]" title={holidayName}>
                      🎌 {holidayName}
                    </span>
                  )}
                  {isToday && (
                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.2 rounded border border-indigo-500/30">本日</span>
                  )}
                </div>
              </div>

              {/* 顧客予定リスト */}
              <div className="flex-grow space-y-1 overflow-y-auto max-h-[80px] pr-0.5 custom-scrollbar">
                {dayVisits.map((visit: any, vIdx: number) => {
                  const isCompleted = !!visit.isCompleted;
                  const isDraggingThis = dragVisit?.customerId === visit.customerId && dragVisit?.visitDate === visit.visitDate;
                  const isTouchActive = isTouchDraggingVisit && touchDragVisitRef.current?.customerId === visit.customerId && touchDragVisitRef.current?.visitDate === visit.visitDate;
                  return (
                    <div
                      key={vIdx}
                      draggable={!isCompleted}
                      onDragStart={(e) => !isCompleted && handleVisitDragStart(e, visit)}
                      onDragEnd={() => setDragVisit(null)}
                      onTouchStart={() => !isCompleted && handleVisitTouchStart(visit)}
                      onTouchMove={handleVisitTouchMove}
                      onTouchEnd={handleVisitTouchEnd}
                      onClick={() => !isTouchDraggingVisit && openVisitModal(visit)}
                      className={`border rounded p-1 text-[10px] text-left select-none transition-all ${
                        isCompleted
                          ? 'bg-slate-900/40 border-slate-800/30 opacity-40 grayscale cursor-default'
                          : isDraggingThis || isTouchActive
                          ? 'bg-indigo-900 border-yellow-400 ring-2 ring-yellow-400/80 scale-95 shadow-2xl cursor-grabbing opacity-90 z-10 relative'
                          : 'bg-slate-900 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850/60 cursor-grab group'
                      }`}
                    >
                      <div className="flex items-center gap-0.5">
                        {isCompleted
                          ? <Lock className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                          : <GripVertical className="w-2.5 h-2.5 text-slate-600 shrink-0 group-hover:text-indigo-400" />
                        }
                        <div className={`font-bold truncate ${
                          isCompleted ? 'text-slate-500 line-through' : 'text-slate-200 group-hover:text-indigo-300'
                        }`}>{visit.customerName}</div>
                        {isCompleted && (
                          <span className="ml-auto shrink-0 text-[8px] bg-slate-700/80 text-slate-400 px-1 rounded">完了</span>
                        )}
                      </div>
                      {visit.requirements.length > 0 && (
                        <div className={`truncate scale-90 origin-left ${
                          isCompleted ? 'text-slate-600' : 'text-slate-500'
                        }`}>
                          {visit.requirements.map((r: any) => `${r.productName}x${formatFloat(r.quantity)}`).join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 来店完了モーダル */}
      {visitModalCustomer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
            <button
              onClick={() => setVisitModalCustomer(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* モーダルヘッダー */}
            <div className="p-6 border-b border-slate-800">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                来店処理: {visitModalCustomer.customerName}
              </h3>
              {/* ステップインジケーター */}
              <div className="flex items-center gap-2 mt-3">
                {(['confirm_date', 'pick_date', 'set_interval'] as const).map((s, i) => {
                  const labels = ['① 完了日確認', '② 日付選択', '③ 次回日設定'];
                  const steps = ['confirm_date', 'pick_date', 'set_interval'];
                  const isActive = visitModalStep === s;
                  const isDone = steps.indexOf(visitModalStep) > i;
                  return (
                    <span key={s} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                      isActive ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : isDone ? 'bg-slate-700 border-slate-600 text-slate-400 line-through'
                      : 'bg-slate-800/50 border-slate-700 text-slate-500'
                    }`}>{labels[i]}</span>
                  );
                })}
              </div>
            </div>

            {/* ===== STEP 1: 完了日確認 ===== */}
            {visitModalStep === 'confirm_date' && (
              <div className="p-6 space-y-5">
                <p className="text-sm text-slate-200 font-semibold text-center">
                  本日（{formatDateJPFull(todayStr)}）に<br />完了しましたか？
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setVisitCompletedDate(todayStr);
                      setVisitModalStep('set_interval');
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm transition-all active:scale-95 cursor-pointer"
                  >
                    ✅ はい
                  </button>
                  <button
                    onClick={() => setVisitModalStep('pick_date')}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-xl text-sm transition-all active:scale-95 cursor-pointer"
                  >
                    📅 別の日を選ぶ
                  </button>
                </div>
              </div>
            )}

            {/* ===== STEP 2: 別の日を選ぶ ===== */}
            {visitModalStep === 'pick_date' && (
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-400">来局完了日を選択してください</p>
                <input
                  type="date"
                  value={visitCompletedDate}
                  max={todayStr}
                  onChange={(e) => setVisitCompletedDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                />
                {visitCompletedDate && visitCompletedDate !== todayStr && (
                  <span className="inline-block text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                    過去日付: {formatDateJPFull(visitCompletedDate)}
                  </span>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setVisitModalStep('confirm_date')}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    ← 戻る
                  </button>
                  <button
                    disabled={!visitCompletedDate}
                    onClick={() => setVisitModalStep('set_interval')}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                  >
                    確定 →
                  </button>
                </div>
              </div>
            )}

            {/* ===== STEP 3: 次回日設定 ===== */}
            {visitModalStep === 'set_interval' && (
              <form onSubmit={handleVisitCompleteSubmit}>
                <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">完了日: <span className="text-white font-semibold">{formatDateJPFull(visitCompletedDate)}</span></span>
                    <span className="text-[10px] text-slate-500">前回周期: {visitModalCustomer.visitInterval}日</span>
                  </div>

                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">次回の予定を設定してください</p>

                  {/* 日数スライダー＋カウンター */}
                  {!visitNextDirectMode && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <input
                            type="range"
                            min="0"
                            max="365"
                            value={visitNextInterval}
                            onChange={(e) => setVisitNextInterval(parseInt(e.target.value))}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                            <span>0日</span><span>180日</span><span>365日</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 min-w-[90px] justify-center">
                          <button type="button" onClick={() => setVisitNextInterval(Math.max(0, visitNextInterval - 1))}
                            className="text-slate-400 hover:text-white font-bold text-lg leading-none cursor-pointer">−</button>
                          <span className="text-white font-bold text-base mx-2 min-w-[2rem] text-center">{visitNextInterval}</span>
                          <button type="button" onClick={() => setVisitNextInterval(Math.min(365, visitNextInterval + 1))}
                            className="text-slate-400 hover:text-white font-bold text-lg leading-none cursor-pointer">＋</button>
                        </div>
                        <span className="text-sm text-slate-400 shrink-0">日後</span>
                      </div>
                      {visitNextInterval > 0 ? (
                        <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between">
                          <span className="text-xs text-indigo-300">次回予定日</span>
                          <span className="text-base font-bold text-white">{formatDateJPFull(calcNextVisitDate())}</span>
                        </div>
                      ) : (
                        <div className="bg-amber-900/20 border border-amber-500/20 rounded-xl px-4 py-2 text-xs text-amber-400">
                          ※ 0日に設定すると「来局不要（非アクティブ）」になります
                        </div>
                      )}
                    </div>
                  )}

                  {/* 日付直接指定モード */}
                  {visitNextDirectMode && (
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={visitNextDirectDate}
                        min={visitCompletedDate}
                        onChange={(e) => setVisitNextDirectDate(e.target.value)}
                        className="w-full bg-slate-950 border border-indigo-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      />
                      {visitNextDirectDate && (
                        <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between">
                          <span className="text-xs text-indigo-300">次回予定日</span>
                          <span className="text-base font-bold text-white">{formatDateJPFull(visitNextDirectDate)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => { setVisitNextDirectMode(!visitNextDirectMode); setVisitNextDirectDate(''); }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer transition-colors"
                  >
                    {visitNextDirectMode ? '← 日数スクロールに戻る' : '📅 日付を直接指定する'}
                  </button>

                  {/* 医薬品リスト（ドラッグ＆ドロップ） */}
                  <div className="space-y-3 pt-4 border-t border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <GripVertical className="w-3.5 h-3.5" />
                      医薬品リスト（長押しで並び替え）
                    </h4>
                    {visitActualItems.length === 0 ? (
                      <p className="text-slate-500 text-xs italic">希望商品はありません。下の「追加」から薬を追加してください。</p>
                    ) : (
                      <div className="space-y-2">
                        {/* ヘッダー行 */}
                        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">
                          <div className="w-4"></div>
                          <div>商品名</div>
                          <div className="text-center w-16">今回使用</div>
                          <div className="text-center w-16">次回予定</div>
                          <div className="w-5"></div>
                        </div>
                        {visitActualItems.map((item, idx) => {
                          const isDraggingThis = modalDraggedIndex === idx;
                          return (
                            <div
                              key={item.productId}
                              data-modal-drag-index={idx}
                              draggable="true"
                              onDragStart={() => handleModalDragStart(idx)}
                              onDragOver={(e) => handleModalDragOver(e, idx)}
                              onDragEnd={handleModalDragEnd}
                              onTouchStart={() => handleModalTouchStart(idx)}
                              onTouchMove={handleModalTouchMove}
                              onTouchEnd={handleModalTouchEnd}
                              className={`bg-slate-950/40 border rounded-xl px-3 py-2 grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 select-none transition-all ${
                                isDraggingThis ? 'opacity-40 border-indigo-500' : 'border-slate-800/80 hover:border-slate-700'
                              }`}
                            >
                              <div className="text-slate-500 cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-semibold text-xs text-slate-200 truncate">{item.productName}</span>
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[9px] text-slate-500">今回</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.usedQty}
                                  onChange={(e) => {
                                    const updated = [...visitActualItems];
                                    updated[idx].usedQty = parseFloat(e.target.value) || 0;
                                    setVisitActualItems(updated);
                                  }}
                                  className="w-16 bg-slate-900 border border-slate-800 text-center rounded-lg py-1 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[9px] text-indigo-400">次回</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.nextQty}
                                  onChange={(e) => {
                                    const updated = [...visitActualItems];
                                    updated[idx].nextQty = parseFloat(e.target.value) || 0;
                                    setVisitActualItems(updated);
                                  }}
                                  className="w-16 bg-slate-900 border border-indigo-900/50 text-center rounded-lg py-1 text-xs font-semibold text-indigo-300 focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveMed(item.productId)}
                                className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 薬品追加セクション */}
                  <div className="border-t border-slate-800 pt-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      今回処方された薬を追加
                    </h4>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-500 block mb-1">薬品</label>
                        <select
                          value={addMedProductId}
                          onChange={(e) => setAddMedProductId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          {allProducts.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">今回</label>
                        <input
                          type="number" step="0.01"
                          value={addMedUsedQty}
                          onChange={(e) => setAddMedUsedQty(e.target.value)}
                          className="w-14 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-indigo-400 block mb-1">次回</label>
                        <input
                          type="number" step="0.01"
                          value={addMedNextQty}
                          onChange={(e) => setAddMedNextQty(e.target.value)}
                          className="w-14 bg-slate-950 border border-indigo-900/40 rounded-lg px-2 py-1.5 text-xs text-indigo-300 text-center focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddMedicine}
                        className="bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        追加
                      </button>
                    </div>
                  </div>

                  {/* 次回周期の入力 */}
                  <div className="space-y-2 border-t border-slate-800 pt-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">次回来店周期の変更</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        required
                        min="0"
                        value={visitNextInterval}
                        onChange={(e) => setVisitNextInterval(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                      />
                      <span className="text-sm text-slate-400 font-medium shrink-0">日周期</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      ※ 周期を「0」に設定すると「来店不要（非アクティブ）」となります。
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setVisitModalCustomer(null)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={!!actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all active:scale-98 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    来店完了を登録
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
