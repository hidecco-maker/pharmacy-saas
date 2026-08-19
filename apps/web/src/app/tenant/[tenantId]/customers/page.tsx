'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  Download,
  Upload,
  UserPlus,
  Clock,
  RefreshCw,
  FileText,
  Save,
  ChevronRight,
  GripVertical
} from 'lucide-react';
import { formatFloat } from '@/lib/utils';

const kanjiFirstCharMap: Record<string, string> = {
  // あ行
  '青': 'あ', '赤': 'あ', '秋': 'あ', '浅': 'あ', '朝': 'あ', '荒': 'あ', '飯': 'あ', '今': 'あ', '岩': 'あ',
  '伊': 'い', '井': 'い', '池': 'い', '石': 'い', '市': 'い', '稲': 'い', '犬': 'い', '五十': 'い', '入': 'い',
  '上': 'う', '内': 'う', '宇': 'う', '梅': 'う', '江': 'え', '遠': 'え',
  '尾': 'お', '岡': 'お', '奥': 'お', '織': 'お',

  // か行
  '加': 'か', '川': 'か', '河': 'か', '神': 'か', '菅': 'か', '片': 'か', '金': 'か', '木': 'か', '菊': 'か', '岸': 'か', '北': 'か',
  '工': 'く', '久': 'く', '黒': 'く', '葛': 'か', '栗': 'く', '桑': 'く', '倉': 'く',
  '古': 'こ', '近': 'こ', '児': 'こ', '小': 'こ',
  '後': 'ご', '国': 'く', '甲': 'か', '郡': 'ぐ', '鎌': 'か', '香': 'か', '門': 'か', '笠': 'か', '柏': 'か', '梶': 'か', '貝': 'か', '勝': 'か', '桂': 'か', '苅': 'か',

  // さ行
  '佐': 'さ', '坂': 'さ', '阪': 'さ', '桜': 'さ', '笹': 'さ', '酒': 'さ', '境': 'さ', '栄': 'さ', '沢': 'さ', '斉': 'さ', '斎': 'さ', '齊': 'さ', '齋': 'さ',
  '塩': 'し', '志': 'し', '篠': 'し', '柴': 'し', '渋': 'し', '島': 'し', '嶋': 'し', '清': 'し', '白': 'し', '城': 'し', '庄': 'し', '新': 'し', '進': 'し', '下': 'し', '鹿': 'し',
  '杉': 'す', '鈴': 'す', '住': 'す', '砂': 'す', '須': 'す',
  '関': 'せ',
  '相': 'そ', '曽': 'そ', '園': 'そ',

  // た行
  '高': 'た', '田': 'た', '多': 'た', '竹': 'た', '武': 'た', '滝': 'た', '瀧': 'た', '立': 'た', '橘': 'た', '舘': 'た', '館': 'た', '谷': 'た', '玉': 'た',
  '辻': 'つ', '津': 'つ', '塚': 'つ', '土': 'つ', '堤': 'つ', '都': 'つ', '筒': 'つ', '坪': 'つ', '鶴': 'つ',
  '手': 'て', '寺': 'て', '照': 'て',
  '戸': 'と', '藤': 'と', '富': 'と', '豊': 'と', '鳥': 'と',

  // な行
  '中': 'な', '永': 'な', '長': 'な', '那': 'な', '名': 'な', '夏': 'な', '成': 'な', '難': 'な', '生': 'な', '並': 'な', '奈良': 'な',
  '西': 'い', '二': 'に', '仁': 'に', '丹': 'た',
  '沼': 'ぬ',
  '根': 'ね',
  '野': 'の', '能': 'の',

  // は行
  '原': 'は', '羽': 'は', '橋': 'は', '波': 'は', '畑': 'は', '早': 'は', '林': 'は', '針': 'は', '花': 'は', '芳': 'は', '葉': 'は',
  '東': 'ひ', '日': 'ひ', '平': 'ひ', '広': 'ひ', '比': 'ひ', '樋': 'ひ', '兵': 'ひ',
  '福': 'ふ', '深': 'ふ', '船': 'ふ', '舟': 'ふ', '伏': 'ふ',
  '本': 'ほ', '堀': 'ほ', '星': 'ほ', '細': 'ほ', '保': 'ほ',

  // ま行
  '前': 'ま', '牧': 'ま', '増': 'ま', '松': 'ま', '丸': 'ま', '町': 'ま', '真': 'ま', '馬': 'ま', '間': 'ま',
  '水': 'み', '三': 'み', '宮': 'み', '皆': 'み', '溝': 'み', '南': 'み',
  '村': 'む', '向': 'む', '室': 'む',
  '森': 'も', '望': 'も', '毛': 'も', '茂': 'も',

  // や行
  '山': 'や', '矢': 'や', '八': 'や', '柳': 'や', '安': 'や',
  '家': 'い',
  '湯': 'ゆ', '結': 'ゆ',
  '吉': 'よ', '横': 'よ', '米': 'よ',

  // ら行
  '六': 'ろ', '落': 'お', '利': 'り', '留': 'る', '龍': 'り',

  // わ行
  '渡': 'わ', '和': 'わ', '若': 'わ', '脇': 'わ', '鷲': 'わ', '綿': 'わ', '輪': 'わ'
};

const getPhoneticFirstChar = (nameKana: string, name: string): string => {
  const target = (nameKana || '').trim() || (name || '').trim();
  if (!target) return '';
  const first = target.charAt(0);
  const code = first.charCodeAt(0);
  // ひらがな・カタカナの場合はそのまま返す
  if ((code >= 0x3040 && code <= 0x309F) || (code >= 0x30A0 && code <= 0x30FF)) {
    // カタカナ (0x30A1-0x30F6) -> ひらがな (0x3041-0x3096) に統一
    if (code >= 0x30A1 && code <= 0x30F6) {
      return String.fromCharCode(code - 0x60);
    }
    return first;
  }
  return kanjiFirstCharMap[first] || first;
};

export default function TenantCustomers() {
  const params = useParams();
  const tenantId = params?.tenantId as string;
  const router = useRouter();

  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3500); };

  // 顧客追加用
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerNameKana, setNewCustomerNameKana] = useState('');
  const [newCustomerInterval, setNewCustomerInterval] = useState<string>('14');
  const [newCustomerLastVisit, setNewCustomerLastVisit] = useState('');

  // 紐付け・スケジュール編集（訂正）用
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerNameKana, setEditCustomerNameKana] = useState('');
  const [selectedCustomerReqs, setSelectedCustomerReqs] = useState<{ productId: string; quantity: number }[]>([]);
  const [addReqProductId, setAddReqProductId] = useState('');
  const [addReqQuantity, setAddReqQuantity] = useState<string>('1');
  const [editVisitInterval, setEditVisitInterval] = useState<string>('14');
  const [editLastVisitDate, setEditLastVisitDate] = useState<string>('');

  // CSVインポート
  const [customerCsvText, setCustomerCsvText] = useState('');
  const [csvMessage, setCsvMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string; details?: string[] } | null>(null);
  const [isDragOverCustomer, setIsDragOverCustomer] = useState(false);
  const customerFileRef = useRef<HTMLInputElement>(null);

  // 医薬品の並び替え用ドラッグ＆ドロップ
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const touchTimeoutRef = useRef<any>(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOverReq = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const items = [...selectedCustomerReqs];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setSelectedCustomerReqs(items);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleTouchStart = (index: number) => {
    touchTimeoutRef.current = setTimeout(() => {
      setIsTouchDragging(true);
      setDraggedIndex(index);
    }, 400); // 400ms long press to start dragging
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouchDragging || draggedIndex === null) {
      clearTimeout(touchTimeoutRef.current);
      return;
    }
    // Prevent default scroll during dragging
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;

    const itemEl = element.closest('[data-drag-index]');
    if (itemEl) {
      const overIndex = parseInt(itemEl.getAttribute('data-drag-index') || '', 10);
      if (!isNaN(overIndex) && overIndex !== draggedIndex) {
        const items = [...selectedCustomerReqs];
        const draggedItem = items[draggedIndex];
        items.splice(draggedIndex, 1);
        items.splice(overIndex, 0, draggedItem);
        setDraggedIndex(overIndex);
        setSelectedCustomerReqs(items);
      }
    }
  };

  const handleTouchEnd = () => {
    clearTimeout(touchTimeoutRef.current);
    setIsTouchDragging(false);
    setDraggedIndex(null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, prodRes] = await Promise.all([
        fetch(`/api/${tenantId}/customers`),
        fetch(`/api/${tenantId}/products`),
      ]);

      if (custRes.status === 401) {
        router.push('/login');
        return;
      }

      const custData = await custRes.json();
      const prodData = await prodRes.json();

      const customersArray = Array.isArray(custData) ? custData : [];
      const productsArray = Array.isArray(prodData) ? prodData : [];

      setCustomers(customersArray);
      setProducts(productsArray);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setCustomers([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  // 新規顧客追加
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;
    setActionLoading('add-customer');
    try {
      const res = await fetch(`/api/${tenantId}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustomerName,
          nameKana: newCustomerNameKana,
          visitInterval: parseInt(newCustomerInterval, 10) || 0,
          lastVisitDate: newCustomerLastVisit || null,
        }),
      });
      if (res.ok) {
        setNewCustomerName('');
        setNewCustomerNameKana('');
        setNewCustomerInterval('14');
        setNewCustomerLastVisit('');
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // 顧客削除
  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('本当にこの顧客を削除しますか？')) return;
    setActionLoading(`delete-customer-${id}`);
    try {
      const res = await fetch(`/api/${tenantId}/customers/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (selectedCustomerId === id) setSelectedCustomerId(null);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // 紐付け対象の顧客が選択されたとき
  const selectCustomerForReqs = (customer: any) => {
    setSelectedCustomerId(customer.id);
    setEditCustomerName(customer.name || '');
    setEditCustomerNameKana(customer.nameKana || '');
    setSelectedCustomerReqs(
      customer.requirements.map((r: any) => ({
        productId: r.productId,
        quantity: r.quantity,
      }))
    );
    setEditVisitInterval(String(customer.visitInterval));

    if (customer.lastVisitDate) {
      const d = new Date(customer.lastVisitDate);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setEditLastVisitDate(`${yyyy}-${mm}-${dd}`);
    } else {
      setEditLastVisitDate('');
    }
  };

  // 紐付けの一時的な追加
  const handleAddReq = () => {
    if (!addReqProductId) {
      showToast('⚠️ 薬品を選択してください');
      return;
    }
    const qty = parseFloat(addReqQuantity) || 1;
    const existsIndex = selectedCustomerReqs.findIndex(r => r.productId === addReqProductId);
    if (existsIndex >= 0) {
      const updated = [...selectedCustomerReqs];
      updated[existsIndex].quantity = parseFloat((updated[existsIndex].quantity + qty).toFixed(2));
      setSelectedCustomerReqs(updated);
    } else {
      setSelectedCustomerReqs([...selectedCustomerReqs, { productId: addReqProductId, quantity: qty }]);
    }
    setAddReqProductId('');
    setAddReqQuantity('1');
  };

  // 紐付けの訂正（数量変更）
  const handleUpdateReqQty = (productId: string, quantity: number) => {
    const updated = selectedCustomerReqs.map(r =>
      r.productId === productId ? { ...r, quantity: Math.max(0, quantity) } : r
    );
    setSelectedCustomerReqs(updated);
  };

  // 紐付けの削除
  const handleRemoveReq = (productId: string) => {
    setSelectedCustomerReqs(selectedCustomerReqs.filter(r => r.productId !== productId));
  };

  // 希望商品・スケジュールの保存
  const handleSaveReqs = async () => {
    if (!selectedCustomerId) return;
    setActionLoading('save-reqs');
    try {
      // 1. 希望商品の一括保存 (追加、訂正、削除をすべてマージ)
      const reqRes = await fetch(`/api/${tenantId}/customers/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          requirements: selectedCustomerReqs.filter(r => r.quantity > 0),
        }),
      });

      // 2. 来店スケジュール (氏名、フリガナ、最終来店日、周期) の保存
      const customerRes = await fetch(`/api/${tenantId}/customers/${selectedCustomerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCustomerName,
          nameKana: editCustomerNameKana,
          visitInterval: parseInt(editVisitInterval, 10) || 0,
          lastVisitDate: editLastVisitDate || null,
        }),
      });

      if (reqRes.ok && customerRes.ok) {
        await fetchData();
        showToast('✅ 設定を保存しました');
      } else {
        showToast('❌ 設定の保存に失敗しました');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // CSVインポート処理
  const processAndImportCsv = async (csvText: string) => {
    setCsvMessage(null);
    if (!csvText.trim()) return;

    const lines = csvText.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      setCsvMessage({ type: 'error', text: 'CSVデータが空かヘッダーしかありません。' });
      return;
    }

    const header = lines[0].toLowerCase();
    const cols = header.split(',').map(c => c.trim().replace(/^"(.*)"$/, '$1'));

    const isValid = cols.length >= 2 &&
                    (cols[0].includes('名前') || cols[0].includes('name')) &&
                    cols.some(c => c.includes('周期') || c.includes('interval'));

    if (!isValid) {
      setCsvMessage({ type: 'error', text: 'CSVヘッダー形式が異なります。（名前,[フリガナ],来店周期(日),最終来店日(任意),希望商品一覧(任意)）' });
      return;
    }

    setActionLoading('import-customers');
    try {
      const res = await fetch(`/api/${tenantId}/customers/csv-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (res.ok) {
        const warningCount = data.warnings?.length ?? 0;
        const errorCount = data.errors?.length ?? 0;
        const type = warningCount > 0 ? 'warning' : 'success';
        const details: string[] = [
          ...(data.warnings ?? []),
          ...(data.errors ?? []),
        ];
        setCsvMessage({
          type,
          text: `インポート成功: ${data.success} 件 / 商品スキップ: ${warningCount} 件 / 失敗: ${errorCount} 件`,
          details: details.length > 0 ? details : undefined,
        });
        setCustomerCsvText('');
        await fetchData();
      } else {
        setCsvMessage({ type: 'error', text: `エラー: ${data.error}` });
      }
    } catch (err) {
      console.error(err);
      setCsvMessage({ type: 'error', text: '通信エラーが発生しました。' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      processAndImportCsv(event.target?.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverCustomer(false);
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    const file = files[0];
    if (!file.name.endsWith('.csv')) {
      alert('CSVファイルのみ対応しています。');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      processAndImportCsv(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  // CSVエクスポート
  const handleExportCustomersToCsv = () => {
    let csvContent = '\uFEFF';
    csvContent += '名前,フリガナ,来店周期(日),最終来店日,希望商品一覧\n';

    customers.forEach(c => {
      const escapedName = c.name.includes(',') || c.name.includes('"')
        ? `"${c.name.replace(/"/g, '""')}"`
        : c.name;
      const escapedKana = (c.nameKana || '').includes(',') || (c.nameKana || '').includes('"')
        ? `"${(c.nameKana || '').replace(/"/g, '""')}"`
        : (c.nameKana || '');

      const lastVisitStr = c.lastVisitDate ? new Date(c.lastVisitDate).toISOString().split('T')[0] : '';

      // インポート形式と統一: 「商品名:数量」をセミコロン区切り
      const reqsStr = c.requirements
        .map((r: any) => `${r.product.name}:${formatFloat(r.quantity)}`)
        .join(';');
      const escapedReqsStr = reqsStr.includes(',') || reqsStr.includes('"')
        ? `"${reqsStr.replace(/"/g, '""')}"`
        : reqsStr;

      csvContent += `${escapedName},${escapedKana},${c.visitInterval},${lastVisitStr},${escapedReqsStr}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `顧客台帳_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

  // あいうえおインデックス
  const kanaRows = ['あ','か','さ','た','な','は','ま','や','ら','わ'];
  const kanaRanges: Record<string, string[]> = {
    'あ': ['あ','い','う','え','お', 'ア','イ','ウ','エ','オ'],
    'か': ['か','き','く','け','こ','が','ぎ','ぐ','げ','ご', 'カ','キ','ク','ケ','コ','ガ','ギ','グ','ゲ','ゴ'],
    'さ': ['さ','し','す','せ','そ','ざ','じ','ず','ぜ','ぞ', 'サ','シ','ス','セ','ソ','ザ','ジ','ズ','ゼ','ゾ'],
    'た': ['た','ち','つ','て','と','だ','ぢ','づ','で','ど', 'タ','チ','ツ','テ','ト','ダ','ヂ','ヅ','デ','ド'],
    'な': ['な','に','ぬ','ね','の', 'ナ','ニ','ヌ','ネ','ノ'],
    'は': ['は','ひ','ふ','へ','ほ','ば','び','ぶ','べ','ぼ','ぱ','ぴ','ぷ','ぺ','ぽ', 'ハ','ヒ','フ','ヘ','ホ','バ','ビ','ブ','ベ','ボ','パ','ピ','プ','ペ','ポ'],
    'ま': ['ま','み','む','め','も', 'マ','ミ','ム','メ','モ'],
    'や': ['や','ゆ','よ', 'ヤ','ユ','ヨ'],
    'ら': ['ら','り','る','れ','ろ', 'ラ','リ','ル','レ','ロ'],
    'わ': ['わ','ゐ','ゑ','を','ん', 'ワ','ワ','ヰ','ヱ','ヲ','ン'],
  };

  const customerListRef = useRef<HTMLDivElement>(null);

  const scrollToKana = (kana: string) => {
    if (!customerListRef.current) return;
    const chars = kanaRanges[kana] || [kana];
    const items = customerListRef.current.querySelectorAll('[data-customer-name]');
    
    // Find matching item using getPhoneticFirstChar
    for (const item of Array.from(items)) {
      const name = item.getAttribute('data-customer-name') || '';
      const nameKana = item.getAttribute('data-customer-kana') || '';
      const phoneticFirst = getPhoneticFirstChar(nameKana, name);
      if (chars.some(c => name.startsWith(c) || nameKana.startsWith(c) || phoneticFirst === c)) {
        const container = customerListRef.current;
        container.scrollTo({ top: (item as HTMLElement).offsetTop - 16, behavior: 'smooth' });
        return;
      }
    }
    
    // Fallback search
    const kanaIndex = kanaRows.indexOf(kana);
    for (let i = kanaIndex + 1; i < kanaRows.length; i++) {
      const fallbackChars = kanaRanges[kanaRows[i]] || [];
      for (const item of Array.from(items)) {
        const name = item.getAttribute('data-customer-name') || '';
        const nameKana = item.getAttribute('data-customer-kana') || '';
        const phoneticFirst = getPhoneticFirstChar(nameKana, name);
        if (fallbackChars.some(c => name.startsWith(c) || nameKana.startsWith(c) || phoneticFirst === c)) {
          const container = customerListRef.current;
          container.scrollTo({ top: (item as HTMLElement).offsetTop - 16, behavior: 'smooth' });
          return;
        }
      }
    }
  };

  if (loading && customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-700">
        <Loader2 className="w-12 h-12 text-sky-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">顧客データを読み込んでいます...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* トースト通知 */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-white border border-sky-200 shadow-xl rounded-2xl px-5 py-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
          {toastMsg}
        </div>
      )}
      {/* ============================================================
         独立スクロールレイアウト
         グリッドを h-[calc(100vh-8rem)] で高さ制約
         - 左カラム: flex-col + flex-1 overflow-y-auto でリストが独立スクロール
         - 右カラム: overflow-y-auto h-full で全カード縦スクロール
         ============================================================ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 h-[calc(100vh-8rem)] min-h-0">

      {/* ==============================
          左カラム：顧客一覧（独立スクロール）
          ============================== */}
      <div className="xl:col-span-7 bg-white border border-sky-100 rounded-2xl shadow-xl flex flex-col min-h-0 h-full">
        {/* あいうえおインデックス（縦） */}

        {/* ヘッダー（固定） */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sky-100 px-6 pt-6 pb-4 flex-shrink-0">
          <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-500" />
            顧客・薬品 管理（周期0＝来店不要）
          </h3>
          <button
            onClick={handleExportCustomersToCsv}
            className="flex items-center gap-1.5 self-start sm:self-center bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            顧客一覧CSV出力
          </button>
        </div>

        {/* 顧客リスト（あいうえおインデックス + 独立スクロール） */}
        <div className="flex flex-1 min-h-0">
          {/* あいうえおインデックス縦バー */}
          <div className="flex flex-col justify-around items-center py-3 px-1.5 border-r border-sky-100/60 select-none shrink-0">
            {kanaRows.map(kana => (
              <button
                key={kana}
                onClick={() => scrollToKana(kana)}
                className="text-[10px] font-bold text-slate-500 hover:text-sky-500 hover:bg-sky-50 w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer"
                title={`${kana}行へ`}
              >
                {kana}
              </button>
            ))}
          </div>

          {/* 顧客リスト本体 */}
          <div ref={customerListRef} className="relative overflow-y-auto custom-scrollbar flex-1 px-4 pt-4 pb-6 space-y-3">
            {customers.map((cust) => {
              const isSelected = selectedCustomerId === cust.id;
              const isDeleteLoading = actionLoading === `delete-customer-${cust.id}`;
              return (
                <div
                  key={cust.id}
                  data-customer-name={cust.name}
                  data-customer-kana={cust.nameKana}
                  onClick={() => selectCustomerForReqs(cust)}
                  className={`border rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer hover:border-sky-300 ${
                    isSelected
                      ? 'bg-sky-50 border-sky-400 ring-1 ring-sky-300'
                      : 'bg-sky-50/40 border-sky-100'
                  }`}
                >
                  <div>
                    {cust.nameKana && (
                      <div className="text-[10px] text-slate-500 font-medium tracking-wide mb-0.5 leading-none">{cust.nameKana}</div>
                    )}
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-700 text-base">{cust.name}</h4>
                      {cust.visitInterval === 0 ? (
                        <span className="text-[10px] bg-sky-100 text-slate-500 px-2 py-0.5 rounded border border-slate-700 font-bold">
                          来店不要（非アクティブ）
                        </span>
                      ) : (
                        <span className="text-[10px] bg-sky-100 text-sky-600 px-2 py-0.5 rounded border border-sky-200">
                          予定日: {formatDate(cust.nextVisitDate)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs text-slate-500">
                      <div>周期: <span className="text-slate-700 font-semibold">{cust.visitInterval} 日</span></div>
                      {cust.lastVisitDate && (
                        <div>最終来店: <span className="text-slate-700 font-semibold">{formatDate(cust.lastVisitDate)}</span></div>
                      )}
                    </div>

                    {/* 希望商品のプレビュー */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {cust.requirements.map((req: any, rIdx: number) => (
                        <span key={rIdx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 border border-sky-100 text-slate-600 text-[10px] rounded">
                          {req.product.name}
                          <span className="text-sky-500 font-bold">x{formatFloat(req.quantity)}</span>
                        </span>
                      ))}
                      {cust.requirements.length === 0 && (
                        <span className="text-slate-500 text-[10px] italic">希望商品の登録なし</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(cust.id); }}
                      disabled={!!actionLoading}
                      className="bg-sky-50 hover:bg-rose-955/40 border border-sky-100 hover:border-rose-900 text-slate-500 hover:text-rose-400 p-2 rounded-lg transition-all cursor-pointer"
                    >
                      {isDeleteLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==============================
          右カラム：編集・登録・CSV（独立スクロール）
          ============================== */}
      <div className="xl:col-span-5 overflow-y-auto custom-scrollbar h-full space-y-5 pr-0.5 min-w-0">

        {/* 選択顧客の希望商品 & スケジュール編集 */}
        {selectedCustomerId ? (
          <div className="bg-white border border-sky-300 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <h3 className="font-bold text-slate-700 text-base flex items-center gap-2">
                <Save className="w-5 h-5 text-sky-500 shrink-0" />
                設定・希望の編集
              </h3>
              <span className="text-xs bg-sky-50 text-sky-500 font-semibold px-2.5 py-0.5 rounded border border-sky-200 truncate max-w-[8rem]">
                {customers.find(c => c.id === selectedCustomerId)?.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">氏名</label>
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full bg-white border border-sky-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">フリガナ（ソート用）</label>
                <input
                  type="text"
                  value={editCustomerNameKana}
                  onChange={(e) => setEditCustomerNameKana(e.target.value)}
                  className="w-full bg-white border border-sky-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">来店周期（0=来店不要）</label>
                <input
                  type="number"
                  min="0"
                  value={editVisitInterval}
                  onChange={(e) => setEditVisitInterval(e.target.value)}
                  className="w-full bg-white border border-sky-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">最終来店日（起点）</label>
                <input
                  type="date"
                  value={editLastVisitDate}
                  onChange={(e) => setEditLastVisitDate(e.target.value)}
                  className="w-full bg-white border border-sky-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div className="border-t border-sky-100 pt-4 space-y-2.5">
              <label className="block text-xs font-semibold text-slate-500">希望商品の新規追加</label>
              <div className="flex gap-2 items-center">
                <select
                  value={addReqProductId}
                  onChange={(e) => setAddReqProductId(e.target.value)}
                  className="flex-1 min-w-0 bg-white border border-sky-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-400 truncate"
                >
                  <option value="">ーーー◀下から薬品を選択▶ーーー</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="数量"
                  value={addReqQuantity}
                  onChange={(e) => setAddReqQuantity(e.target.value)}
                  className="w-14 sm:w-16 shrink-0 bg-white border border-sky-200 rounded-xl px-2 py-2 text-xs text-center text-slate-800 font-bold focus:outline-none focus:border-sky-400"
                />
                <button
                  onClick={handleAddReq}
                  type="button"
                  className="shrink-0 bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer shadow-sm active:scale-95"
                >
                  追加
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-500">登録済み希望商品の訂正</label>
              {selectedCustomerReqs.length === 0 ? (
                <p className="text-slate-500 text-xs italic">希望商品は現在ありません。</p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {selectedCustomerReqs.map((req, index) => {
                    const prod = products.find(p => p.id === req.productId);
                    const isDraggingThis = draggedIndex === index;
                    return (
                      <div
                        key={req.productId}
                        data-drag-index={index}
                        draggable="true"
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOverReq(e, index)}
                        onDragEnd={handleDragEnd}
                        onTouchStart={() => handleTouchStart(index)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className={`bg-white border border-sky-100 p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs select-none shadow-sm ${
                          isDraggingThis ? 'opacity-40 border-sky-400 scale-[0.98]' : 'hover:border-sky-300'
                        } transition-all duration-150`}
                      >
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <div className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0">
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold text-slate-700 truncate">{prod?.name || '不明な商品'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            step="0.01"
                            value={req.quantity}
                            onChange={(e) => handleUpdateReqQty(req.productId, parseFloat(e.target.value) || 0)}
                            className="w-14 sm:w-16 bg-white border border-sky-200 text-center py-1 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-400"
                          />
                          <button
                            onClick={() => handleRemoveReq(req.productId)}
                            type="button"
                            className="text-rose-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={handleSaveReqs}
              disabled={actionLoading === 'save-reqs'}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
            >
              {actionLoading === 'save-reqs' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              設定と希望リストを保存（訂正適用）
            </button>
          </div>
        ) : (
          <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-xl text-center py-10">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-xs">顧客一覧から顧客を選択すると、<br />希望商品リストの訂正やスケジュール編集が行えます。</p>
          </div>
        )}

        {/* 新規顧客追加フォーム */}
        <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-slate-700 text-base mb-4 border-b border-sky-100 pb-3 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-sky-500" />
            新規顧客登録
          </h3>
          <form onSubmit={handleAddCustomer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">氏名</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="例: 佐藤 健一"
                  className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">フリガナ（ソート用）</label>
                <input
                  type="text"
                  value={newCustomerNameKana}
                  onChange={(e) => setNewCustomerNameKana(e.target.value)}
                  placeholder="例: サトウ ケンイチ"
                  className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">来店周期（日）</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newCustomerInterval}
                  onChange={(e) => setNewCustomerInterval(e.target.value)}
                  className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">最終来店日（任意）</label>
                <input
                  type="date"
                  value={newCustomerLastVisit}
                  onChange={(e) => setNewCustomerLastVisit(e.target.value)}
                  className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={actionLoading === 'add-customer'}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
            >
              顧客を追加
            </button>
          </form>
        </div>

        {/* CSVインポート（右カラム内に統合） */}
        <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-slate-700 text-base mb-4 border-b border-sky-100 pb-3 flex items-center gap-2">
            <Upload className="w-5 h-5 text-sky-500" />
            顧客台帳 CSVインポート
          </h3>

          {csvMessage && (
            <div className={`p-3 rounded-xl text-xs mb-4 ${
              csvMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'
                : csvMessage.type === 'warning'
                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-600'
            }`}>
              <p className="font-semibold">{csvMessage.text}</p>
              {csvMessage.details && csvMessage.details.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 list-disc list-inside opacity-80">
                  {csvMessage.details.map((d, idx) => (
                    <li key={idx}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOverCustomer(true); }}
            onDragLeave={() => setIsDragOverCustomer(false)}
            onDrop={handleFileDrop}
            onClick={() => customerFileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[90px] mb-3 ${
              isDragOverCustomer
                ? 'border-sky-400 bg-sky-100 text-sky-600 scale-[1.01]'
                : 'border-sky-200 hover:border-sky-300 bg-sky-50/40 text-slate-500'
            }`}
          >
            <Upload className="w-6 h-6 mb-1.5 text-sky-500 animate-bounce" />
            <p className="text-xs font-semibold">CSVをドロップ、またはクリックして選択</p>
            <input
              type="file"
              ref={customerFileRef}
              onChange={handleFileSelect}
              accept=".csv"
              className="hidden"
            />
          </div>

          <div className="relative flex items-center py-2 mb-3">
            <div className="flex-grow border-t border-sky-100"></div>
            <span className="flex-shrink mx-3 text-slate-500 text-[10px] uppercase font-bold">または直接入力</span>
            <div className="flex-grow border-t border-sky-100"></div>
          </div>

          <textarea
            rows={4}
            value={customerCsvText}
            onChange={(e) => setCustomerCsvText(e.target.value)}
            placeholder={"名前,フリガナ,来店周期(日),最終来店日,希望商品一覧\n山田太郎,ヤマダタロウ,14,2026-05-25,アムロジピン錠5mg:2;ロキソプロフェンNa錠60mg:1\n鈴木花子,スズキハナコ,0,,\n田中次郎,,28,2026-05-01,"}
            className="w-full bg-white border border-sky-200 rounded-xl p-3 text-xs focus:outline-none text-slate-800 font-mono mb-3"
          />

          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-slate-500">※ 周期0は「来店不要」</span>
            <button
              onClick={() => processAndImportCsv(customerCsvText)}
              disabled={actionLoading === 'import-customers'}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              テキストをインポート
            </button>
          </div>

          <div className="bg-sky-50/60 border border-sky-100 p-3 rounded-xl text-xs text-slate-500 space-y-2">
            <p className="font-bold text-slate-700 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> フォーマット</p>
            <pre className="bg-white p-2 rounded text-[10px] text-sky-600 overflow-x-auto leading-relaxed">
              {"名前,フリガナ,周期(日),最終来店日,希望商品一覧\n山田太郎,ヤマダタロウ,14,2026-05-25,薬A:2;薬B:1\n鈴木花子,スズキハナコ,0,,"}
            </pre>
            <ul className="text-[10px] text-slate-500 space-y-0.5 list-disc list-inside">
              <li>希望商品: <span className="text-sky-500 font-mono">商品名:数量</span>、複数は <span className="text-sky-500 font-mono">;</span> 区切り</li>
              <li>商品名は商品マスタと完全一致が必要</li>
              <li>周期 <span className="text-sky-500 font-mono">0</span> = 来店不要（非アクティブ）</li>
            </ul>
          </div>
        </div>

      </div>{/* /右カラム */}
    </div>{/* /グリッド */}
  </div>
  );
}
