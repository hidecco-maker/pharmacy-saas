'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Package,
  Plus,
  Trash2,
  Loader2,
  Download,
  Upload,
  History,
  ShoppingBag,
  CheckCircle2,
  FileText
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
  '工': 'く', '久': 'く', '黒': 'く', '栗': 'く', '桑': 'く', '倉': 'く',
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
  '渡': 'わ', '和': 'わ', '若': 'わ', '脇': 'わ', '鷲': 'わ', '綿': 'わ', '輪': 'わ',
  '葛': 'か', '胃': 'い', '解': 'か', '鎮': 'ち', '痛み': 'い', '風': 'か', '漢': 'か', '麻': 'ま'
};

const getPhoneticFirstChar = (name: string): string => {
  if (!name) return '';
  const first = name.charAt(0);
  const code = first.charCodeAt(0);
  // ひらがな・カタカナの場合はそのまま返す
  if ((code >= 0x3040 && code <= 0x309F) || (code >= 0x30A0 && code <= 0x30FF)) {
    return first;
  }
  return kanjiFirstCharMap[first] || first;
};

export default function TenantInventory() {
  const params = useParams();
  const tenantId = params?.tenantId as string;
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [disposals, setDisposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3500); };

  // 新規商品用
  const [newProductName, setNewProductName] = useState('');
  const [newProductStock, setNewProductStock] = useState<string>('0');
  const [newProductUnit, setNewProductUnit] = useState('');

  // 仕入れ用（行追加方式）
  const [purchaseRows, setPurchaseRows] = useState<{ productId: string; quantity: string; wholesaler: string }[]>([
    { productId: '', quantity: '10', wholesaler: '' }
  ]);

  // 手動売上用（行追加方式）
  const [saleRows, setSaleRows] = useState<{ productId: string; quantity: string }[]>([
    { productId: '', quantity: '1' }
  ]);

  // 廃棄用（行追加方式）
  const [disposalRows, setDisposalRows] = useState<{ productId: string; quantity: string; reason: string }[]>([
    { productId: '', quantity: '1', reason: '' }
  ]);

  // アコーディオン開闉状態
  const [openPanel, setOpenPanel] = useState<'product' | 'purchase' | 'sale' | 'disposal' | 'csv' | null>(null);

  // CSVインポート
  const [productCsvText, setProductCsvText] = useState('');
  const [csvMessage, setCsvMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDragOverProduct, setIsDragOverProduct] = useState(false);
  const productFileRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, purchRes, dispRes] = await Promise.all([
        fetch(`/api/${tenantId}/products`),
        fetch(`/api/${tenantId}/purchases`),
        fetch(`/api/${tenantId}/disposals`),
      ]);

      if (prodRes.status === 401) {
        router.push('/login');
        return;
      }

      const prodData = await prodRes.json();
      const purchData = await purchRes.json();
      const dispData = await dispRes.json();

      const productsArray = Array.isArray(prodData) ? prodData : [];
      const purchasesArray = Array.isArray(purchData) ? purchData : [];
      const disposalsArray = Array.isArray(dispData) ? dispData : [];

      setProducts(productsArray);
      setPurchases(purchasesArray);
      setDisposals(disposalsArray);

    } catch (err) {
      console.error('Failed to fetch inventory data:', err);
      setProducts([]);
      setPurchases([]);
      setDisposals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  // 在庫数手動更新 (Float対応)
  const handleUpdateStock = async (id: string, currentStock: number) => {
    setActionLoading(`stock-${id}`);
    try {
      const res = await fetch(`/api/${tenantId}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStock }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // 在庫数入力値の一時変更
  const handleStockInputChange = (id: string, value: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, currentStock: value } : p))
    );
  };

  // 商品削除
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('本当にこの商品を削除しますか？紐づく希望商品や履歴も削除されます。')) return;
    setActionLoading(`delete-product-${id}`);
    try {
      const res = await fetch(`/api/${tenantId}/products/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchData();
      } else {
        alert('商品の削除に失敗しました。');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // 新規商品追加 (Float対応)
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;
    setActionLoading('add-product');
    try {
      const res = await fetch(`/api/${tenantId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProductName,
          currentStock: parseFloat(newProductStock) || 0,
          unit: newProductUnit || null,
        }),
      });
      if (res.ok) {
        setNewProductName('');
        setNewProductStock('0');
        setNewProductUnit('');
        setOpenPanel(null);
        showToast('✅ 商品を登録しました');
        await fetchData();
      } else {
        showToast('❌ 商品登録に失敗しました');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // 仕入れ登録（行追加方式）
  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = purchaseRows.filter(r => r.productId && parseFloat(r.quantity) > 0 && r.wholesaler.trim());
    if (validRows.length === 0) {
      showToast('⚠️ 商品、数量、卸先名を入力してください');
      return;
    }
    setActionLoading('add-purchase');
    try {
      for (const row of validRows) {
        await fetch(`/api/${tenantId}/purchases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: row.productId,
            quantity: parseFloat(row.quantity),
            wholesaler: row.wholesaler,
          }),
        });
      }
      setPurchaseRows([{ productId: '', quantity: '10', wholesaler: '' }]);
      setOpenPanel(null);
      showToast('✅ 仕入れを登録しました');
      await fetchData();
    } catch (err) {
      console.error(err);
      showToast('❌ 仕入れ登録に失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  // 手動売上登録（行追加方式）
  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = saleRows.filter(r => r.productId && parseFloat(r.quantity) > 0);
    if (validRows.length === 0) {
      showToast('⚠️ 商品を選択し、数量を入力してください');
      return;
    }
    setActionLoading('add-sale');
    try {
      for (const row of validRows) {
        await fetch(`/api/${tenantId}/sales`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: row.productId, quantity: parseFloat(row.quantity) }),
        });
      }
      setSaleRows([{ productId: '', quantity: '1' }]);
      setOpenPanel(null);
      showToast('✅ 売上を登録しました');
      await fetchData();
    } catch (err) {
      console.error(err);
      showToast('❌ 売上登録に失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  // 廃棄登録（行追加方式）
  const handleAddDisposal = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = disposalRows.filter(r => r.productId && parseFloat(r.quantity) > 0);
    if (validRows.length === 0) {
      showToast('⚠️ 商品を選択し、数量を入力してください');
      return;
    }
    setActionLoading('add-disposal');
    try {
      for (const row of validRows) {
        await fetch(`/api/${tenantId}/disposals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: row.productId, quantity: parseFloat(row.quantity), reason: row.reason }),
        });
      }
      setDisposalRows([{ productId: '', quantity: '1', reason: '' }]);
      setOpenPanel(null);
      showToast('✅ 廃棄を登録しました');
      await fetchData();
    } catch (err) {
      console.error(err);
      showToast('❌ 廃棄登録に失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  // CSV検証とインポート
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
                    (cols[0].includes('商品名') || cols[0].includes('name')) &&
                    (cols[1].includes('在庫') || cols[1].includes('stock'));

    if (!isValid) {
      setCsvMessage({ type: 'error', text: 'CSVヘッダー形式が異なります。（商品名,現在庫数,単位(任意)）' });
      return;
    }

    setActionLoading('import-products');
    try {
      const res = await fetch(`/api/${tenantId}/products/csv-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (res.ok) {
        setCsvMessage({
          type: 'success',
          text: `インポート成功: ${data.success} 件 / 失敗: ${data.errors.length} 件`,
        });
        setProductCsvText('');
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

  // ファイルインプット
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

  // ファイルドロップ
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverProduct(false);
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

  // 在庫一覧CSVエクスポート
  const handleExportProductsToCsv = () => {
    let csvContent = '\uFEFF';
    csvContent += '商品名,現在庫数,単位\n';
    
    products.forEach(p => {
      const escapedName = p.name.includes(',') || p.name.includes('"') 
        ? `"${p.name.replace(/"/g, '""')}"` 
        : p.name;
      csvContent += `${escapedName},${p.currentStock},${p.unit || ''}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `現在庫マスター_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateStr: string) => {
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
  const productListRef = useRef<HTMLDivElement>(null);
  const scrollToKana = (kana: string) => {
    if (!productListRef.current) return;
    const chars = kanaRanges[kana] || [kana];
    const items = productListRef.current.querySelectorAll('[data-product-name]');
    
    // Find matching item using getPhoneticFirstChar
    for (const item of Array.from(items)) {
      const name = item.getAttribute('data-product-name') || '';
      const phoneticFirst = getPhoneticFirstChar(name);
      if (chars.some(c => name.startsWith(c) || phoneticFirst === c)) {
        const container = productListRef.current;
        container.scrollTo({ top: (item as HTMLElement).offsetTop - 16, behavior: 'smooth' });
        return;
      }
    }
    
    // Fallback search
    const kanaIndex = kanaRows.indexOf(kana);
    for (let i = kanaIndex + 1; i < kanaRows.length; i++) {
      const fallbackChars = kanaRanges[kanaRows[i]] || [];
      for (const item of Array.from(items)) {
        const name = item.getAttribute('data-product-name') || '';
        const phoneticFirst = getPhoneticFirstChar(name);
        if (fallbackChars.some(c => name.startsWith(c) || phoneticFirst === c)) {
          const container = productListRef.current;
          container.scrollTo({ top: (item as HTMLElement).offsetTop - 16, behavior: 'smooth' });
          return;
        }
      }
    }
  };
  if (loading && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-700">
        <Loader2 className="w-12 h-12 text-sky-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">在庫データを読み込んでいます...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* トースト通知 */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-white border border-sky-200 shadow-xl rounded-2xl px-5 py-3 text-sm font-semibold text-slate-700 flex items-center gap-2 animate-fade-in">
          {toastMsg}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-sky-100 rounded-2xl shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sky-100 px-6 pt-6 pb-4">
            <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-sky-500" />
              商品在庫マスター（小数・マイナス対応）
            </h3>
            <button
              onClick={handleExportProductsToCsv}
              className="flex items-center gap-1.5 self-start sm:self-center bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              現在庫CSV出力
            </button>
          </div>

          {/* あいうえおインデックス + 商品リスト */}
          <div className="flex" style={{ maxHeight: '60vh' }}>
            {/* あいうえお縦インデックス */}
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

            {/* 商品リスト本体 */}
            <div ref={productListRef} className="relative space-y-3 flex-1 overflow-y-auto pr-1 px-4 py-4 custom-scrollbar">
              {products.map((prod) => {
                const isStockLoading = actionLoading === `stock-${prod.id}`;
                const isDeleteLoading = actionLoading === `delete-product-${prod.id}`;
                return (
                  <div key={prod.id} data-product-name={prod.name} className="bg-sky-50/60 border border-sky-100 hover:border-sky-300 transition-all rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-700 text-base">{prod.name}</h4>
                      <p className="text-[10px] text-slate-500">ID: {prod.id} {prod.unit ? `[単位: ${prod.unit}]` : ''}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 font-medium">現在庫:</label>
                        <div className="flex items-center bg-sky-50 border border-sky-100 rounded-lg overflow-hidden">
                          <button
                            onClick={() => handleUpdateStock(prod.id, prod.currentStock - 1)}
                            disabled={!!actionLoading}
                            className="px-3 py-1.5 hover:bg-sky-100 text-slate-500 hover:text-slate-700 transition-all text-sm font-bold disabled:opacity-50 cursor-pointer"
                          >
                            -1
                          </button>
                          <input
                            type="number"
                            step="0.01"
                            value={prod.currentStock}
                            onChange={(e) => handleStockInputChange(prod.id, e.target.value)}
                            onBlur={(e) => handleUpdateStock(prod.id, parseFloat(e.target.value) || 0)}
                            className="w-16 bg-white border-x border-sky-100 text-center py-1.5 text-sm font-bold text-slate-800 focus:outline-none"
                          />
                          <button
                            onClick={() => handleUpdateStock(prod.id, (parseFloat(prod.currentStock) || 0) + 1)}
                            disabled={!!actionLoading}
                            className="px-3 py-1.5 hover:bg-sky-100 text-slate-500 hover:text-slate-700 transition-all text-sm font-bold disabled:opacity-50 cursor-pointer"
                          >
                            +1
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        disabled={isDeleteLoading}
                        className="text-slate-400 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="商品を削除"
                      >
                        {isDeleteLoading ? <Loader2 className="w-4 h-4 animate-spin text-rose-500" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右カラム：登録・仕入れフォーム群 */}
        <div className="space-y-5">

          {/* ヘルパーテキスト */}
          <p className="text-xs font-semibold text-slate-500 italic px-1">ℹ️ タイトルをクリックで入力欄を開閉できます</p>

          {/* 新規商品登録 */}
          <div className="bg-white border border-sky-200/80 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenPanel(openPanel === 'product' ? null : 'product')}
              className="w-full flex items-center justify-between px-6 py-4.5 hover:bg-sky-50 transition-colors cursor-pointer"
            >
              <span className="font-extrabold text-slate-800 text-lg sm:text-xl flex items-center gap-3">
                <div className="p-2 bg-sky-100 text-sky-600 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                新規商品登録
              </span>
              <span className="text-sky-600 font-bold text-sm bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">{openPanel === 'product' ? '▲ 閉じる' : '▼ 開く'}</span>
            </button>
            {openPanel === 'product' && (
              <div className="px-6 pb-6 pt-2 border-t border-sky-100">
                <form onSubmit={handleAddProduct} className="space-y-4 mt-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">商品名</label>
                    <input type="text" required value={newProductName} onChange={(e) => setNewProductName(e.target.value)}
                      placeholder="例: アムロジピン錠5mg"
                      className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">初期在庫数</label>
                      <input type="number" step="0.01" required value={newProductStock} onChange={(e) => setNewProductStock(e.target.value)}
                        className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">単位（任意）</label>
                      <input type="text" value={newProductUnit} onChange={(e) => setNewProductUnit(e.target.value)}
                        placeholder="錠, g, ml"
                        className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500" />
                    </div>
                  </div>
                  <button type="submit" disabled={actionLoading === 'add-product'}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer text-sm shadow-md">
                    {actionLoading === 'add-product' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    商品を追加
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* 仕入れ登録 */}
          <div className="bg-white border border-sky-200/80 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
            <button type="button"
              onClick={() => setOpenPanel(openPanel === 'purchase' ? null : 'purchase')}
              className="w-full flex items-center justify-between px-6 py-4.5 hover:bg-sky-50 transition-colors cursor-pointer">
              <span className="font-extrabold text-slate-800 text-lg sm:text-xl flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                仕入れ登録
              </span>
              <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">{openPanel === 'purchase' ? '▲ 閉じる' : '▼ 開く'}</span>
            </button>
            {openPanel === 'purchase' && (
              <div className="px-6 pb-6 pt-2 border-t border-sky-100">
                <form onSubmit={handleAddPurchase} className="space-y-4 mt-3">
                  {purchaseRows.map((row, i) => (
                    <div key={i} className="bg-sky-50/70 border border-sky-200/70 rounded-xl p-3.5 space-y-2.5 relative shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-sky-700">{i + 1}品目</span>
                        {purchaseRows.length > 1 && (
                          <button type="button" onClick={() => setPurchaseRows(purchaseRows.filter((_, idx) => idx !== i))}
                            className="text-rose-400 hover:text-rose-600 text-xs font-bold p-1">✕ 削除</button>
                        )}
                      </div>
                      <select value={row.productId} onChange={(e) => setPurchaseRows(purchaseRows.map((r, idx) => idx === i ? { ...r, productId: e.target.value } : r))}
                        className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-400">
                        <option value="">ーーー◀下から商品を選択▶ーーー</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" step="0.01" placeholder="数量" value={row.quantity}
                          onChange={(e) => setPurchaseRows(purchaseRows.map((r, idx) => idx === i ? { ...r, quantity: e.target.value } : r))}
                          className="bg-white border border-sky-200 rounded-lg px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-400" />
                        <input type="text" placeholder="卸先名" value={row.wholesaler}
                          onChange={(e) => setPurchaseRows(purchaseRows.map((r, idx) => idx === i ? { ...r, wholesaler: e.target.value } : r))}
                          className="bg-white border border-sky-200 rounded-lg px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-400" />
                      </div>
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => setPurchaseRows([...purchaseRows, { productId: '', quantity: '10', wholesaler: purchaseRows[purchaseRows.length - 1]?.wholesaler || '' }])}
                    className="w-full border-2 border-dashed border-sky-300 text-sky-600 hover:bg-sky-50 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer">
                    <Plus className="w-3.5 h-3.5" /> 次の品目を追加
                  </button>
                  <button type="submit" disabled={actionLoading === 'add-purchase'}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer text-sm shadow-md">
                    {actionLoading === 'add-purchase' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    まとめて仕入れ登録
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* 売上登録 */}
          <div className="bg-white border border-sky-200/80 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
            <button type="button"
              onClick={() => setOpenPanel(openPanel === 'sale' ? null : 'sale')}
              className="w-full flex items-center justify-between px-6 py-4.5 hover:bg-sky-50 transition-colors cursor-pointer">
              <span className="font-extrabold text-slate-800 text-lg sm:text-xl flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                売上登録（手動）
              </span>
              <span className="text-indigo-600 font-bold text-sm bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">{openPanel === 'sale' ? '▲ 閉じる' : '▼ 開く'}</span>
            </button>
            {openPanel === 'sale' && (
              <div className="px-6 pb-6 pt-2 border-t border-sky-100">
                <form onSubmit={handleAddSale} className="space-y-4 mt-3">
                  {saleRows.map((row, i) => (
                    <div key={i} className="bg-sky-50/70 border border-sky-200/70 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-sky-700">{i + 1}品目</span>
                        {saleRows.length > 1 && (
                          <button type="button" onClick={() => setSaleRows(saleRows.filter((_, idx) => idx !== i))}
                            className="text-rose-400 hover:text-rose-600 text-xs font-bold p-1">✕ 削除</button>
                        )}
                      </div>
                      <select value={row.productId} onChange={(e) => setSaleRows(saleRows.map((r, idx) => idx === i ? { ...r, productId: e.target.value } : r))}
                        className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-400">
                        <option value="">ーーー◀下から商品を選択▶ーーー</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="number" step="0.01" placeholder="数量" value={row.quantity}
                        onChange={(e) => setSaleRows(saleRows.map((r, idx) => idx === i ? { ...r, quantity: e.target.value } : r))}
                        className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-400" />
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => setSaleRows([...saleRows, { productId: '', quantity: '1' }])}
                    className="w-full border-2 border-dashed border-sky-300 text-sky-600 hover:bg-sky-50 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer">
                    <Plus className="w-3.5 h-3.5" /> 次の品目を追加
                  </button>
                  <button type="submit" disabled={actionLoading === 'add-sale'}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer text-sm shadow-md">
                    {actionLoading === 'add-sale' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    まとめて売上登録
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* 廃棄登録 */}
          <div className="bg-white border border-sky-200/80 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
            <button type="button"
              onClick={() => setOpenPanel(openPanel === 'disposal' ? null : 'disposal')}
              className="w-full flex items-center justify-between px-6 py-4.5 hover:bg-sky-50 transition-colors cursor-pointer">
              <span className="font-extrabold text-slate-800 text-lg sm:text-xl flex items-center gap-3">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </div>
                廃棄登録
              </span>
              <span className="text-rose-600 font-bold text-sm bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">{openPanel === 'disposal' ? '▲ 閉じる' : '▼ 開く'}</span>
            </button>
            {openPanel === 'disposal' && (
              <div className="px-6 pb-6 pt-2 border-t border-sky-100">
                <form onSubmit={handleAddDisposal} className="space-y-4 mt-3">
                  {disposalRows.map((row, i) => (
                    <div key={i} className="bg-sky-50/70 border border-sky-200/70 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-sky-700">{i + 1}品目</span>
                        {disposalRows.length > 1 && (
                          <button type="button" onClick={() => setDisposalRows(disposalRows.filter((_, idx) => idx !== i))}
                            className="text-rose-400 hover:text-rose-600 text-xs font-bold p-1">✕ 削除</button>
                        )}
                      </div>
                      <select value={row.productId} onChange={(e) => setDisposalRows(disposalRows.map((r, idx) => idx === i ? { ...r, productId: e.target.value } : r))}
                        className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-400">
                        <option value="">ーーー◀下から商品を選択▶ーーー</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" step="0.01" placeholder="数量" value={row.quantity}
                          onChange={(e) => setDisposalRows(disposalRows.map((r, idx) => idx === i ? { ...r, quantity: e.target.value } : r))}
                          className="bg-white border border-sky-200 rounded-lg px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-400" />
                        <input type="text" placeholder="廃棄理由" value={row.reason}
                          onChange={(e) => setDisposalRows(disposalRows.map((r, idx) => idx === i ? { ...r, reason: e.target.value } : r))}
                          className="bg-white border border-sky-200 rounded-lg px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-400" />
                      </div>
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => setDisposalRows([...disposalRows, { productId: '', quantity: '1', reason: '' }])}
                    className="w-full border-2 border-dashed border-sky-300 text-sky-600 hover:bg-sky-50 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer">
                    <Plus className="w-3.5 h-3.5" /> 次の品目を追加
                  </button>
                  <button type="submit" disabled={actionLoading === 'add-disposal'}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer text-sm shadow-md">
                    {actionLoading === 'add-disposal' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    まとめて廃棄登録
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* 仕入れ履歴 & 廃棄履歴の一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 仕入れ履歴 */}
        <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-slate-700 text-base mb-4 border-b border-sky-100 pb-3">仕入れ履歴（直近100件）</h3>
          {purchases.length === 0 ? (
            <p className="text-slate-500 text-xs italic text-center py-6">仕入れ履歴はありません。</p>
          ) : (
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-sky-100 text-slate-500 font-semibold uppercase">
                    <th className="py-2 px-3">日時</th>
                    <th className="py-2 px-3">商品名</th>
                    <th className="py-2 px-3">数量</th>
                    <th className="py-2 px-3">仕入れ先</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-50">
                  {purchases.map(p => (
                    <tr key={p.id} className="hover:bg-sky-50/35">
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(p.purchasedAt)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{p.product?.name}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">+{formatFloat(p.quantity)}</td>
                      <td className="py-2.5 px-3 text-slate-350">{p.wholesaler}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 廃棄履歴 */}
        <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-slate-700 text-base mb-4 border-b border-sky-100 pb-3">廃棄履歴（直近100件）</h3>
          {disposals.length === 0 ? (
            <p className="text-slate-500 text-xs italic text-center py-6">廃棄履歴はありません。</p>
          ) : (
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-sky-100 text-slate-500 font-semibold uppercase">
                    <th className="py-2 px-3">日時</th>
                    <th className="py-2 px-3">商品名</th>
                    <th className="py-2 px-3">数量</th>
                    <th className="py-2 px-3">理由</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-50">
                  {disposals.map(d => (
                    <tr key={d.id} className="hover:bg-sky-50/35">
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(d.disposedAt)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{d.product?.name}</td>
                      <td className="py-2.5 px-3 text-rose-400 font-bold">-{formatFloat(d.quantity)}</td>
                      <td className="py-2.5 px-3 text-slate-350">{d.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CSVインポート */}
      <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-slate-700 text-base mb-4 border-b border-sky-100 pb-3 flex items-center gap-2">
          <Upload className="w-5 h-5 text-sky-500" />
          商品マスタ CSVインポート（小数・マイナス対応）
        </h3>
        {csvMessage && (
          <div className={`p-4 rounded-xl text-xs mb-4 ${csvMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
            {csvMessage.text}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOverProduct(true); }}
              onDragLeave={() => setIsDragOverProduct(false)}
              onDrop={handleFileDrop}
              onClick={() => productFileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[120px] ${
                isDragOverProduct 
                  ? 'border-sky-400 bg-indigo-950/20 text-sky-600 scale-[1.01]' 
                  : 'border-sky-100 hover:border-sky-300 bg-sky-50/40 text-slate-500'
              }`}
            >
              <Upload className="w-8 h-8 mb-2 text-sky-500 animate-bounce" />
              <p className="text-xs font-semibold">CSVファイルをドラッグ＆ドロップするか、クリックしてファイルを選択</p>
              <input
                type="file"
                ref={productFileRef}
                onChange={handleFileSelect}
                accept=".csv"
                className="hidden"
              />
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-sky-100"></div>
              <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase font-bold">または CSVテキストを直接入力</span>
              <div className="flex-grow border-t border-sky-100"></div>
            </div>

            <textarea
              rows={3}
              value={productCsvText}
              onChange={(e) => setProductCsvText(e.target.value)}
              placeholder="商品名,現在庫数,単位&#10;アムロジピン錠,100,錠&#10;ワセリン,500.5,g"
              className="w-full bg-white border border-sky-200 rounded-xl p-3 text-xs focus:outline-none text-slate-800 font-mono"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">※ 同名商品がある場合は在庫数と単位が上書きされます。</span>
              <button
                onClick={() => processAndImportCsv(productCsvText)}
                disabled={actionLoading === 'import-products'}
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                テキストをインポート
              </button>
            </div>
          </div>
          <div className="bg-sky-50/60 border border-sky-100 p-4 rounded-xl text-xs text-slate-500 space-y-2">
            <p className="font-bold text-slate-700 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> フォーマット例</p>
            <pre className="bg-white p-2 rounded text-[10px] text-sky-600 overflow-x-auto">
              {"商品名,現在庫数,単位\nアムロジピン錠5mg,120,錠\nヒルドイドソフト,450.5,g"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
