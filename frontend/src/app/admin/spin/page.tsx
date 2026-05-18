export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/apiClient';
import SpinPrizeActions from '@/components/admin/SpinPrizeActions';
import SpinPrizeRowActions from '@/components/admin/SpinPrizeRowActions';

export default async function SpinConfigPage() {
  let prizes: any[] = [];
  let stats = { totalSpins: 0, totalWins: 0 };

  try {
    const [prizesRes, statsRes] = await Promise.all([
      apiClient.get<any[]>('/spin/admin/prizes'),
      apiClient.get<any>('/spin/admin/stats'),
    ]);
    prizes = prizesRes;
    stats = statsRes;
  } catch (error) {
    console.error('Error fetching admin spin data:', error);
  }

  const { totalSpins, totalWins } = stats;

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Vòng Quay May Mắn</h1>
          <p className="text-gray-600 text-sm">Cấu hình giải thưởng và xác suất</p>
        </div>
        <SpinPrizeActions />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Tổng lượt quay</div>
          <div className="text-3xl font-bold text-gray-800">{totalSpins}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Lượt trúng thưởng</div>
          <div className="text-3xl font-bold text-gray-800">{totalWins}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Tỷ lệ trúng</div>
          <div className="text-3xl font-bold text-gray-800">{totalSpins > 0 ? Math.round(totalWins / totalSpins * 100) : 0}%</div>
        </div>
      </div>

      {/* Prize Preview */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h3 className="text-lg font-bold mb-6">
          🎰 Xem trước vòng quay
        </h3>
        <div className="flex justify-center mb-6">
          <div 
            className="w-[300px] h-[300px] rounded-full flex items-center justify-center relative border-4 border-gray-300"
            style={{
              background: `conic-gradient(${prizes.map((p, i) => {
                const start = (i / prizes.length) * 360;
                const end = ((i + 1) / prizes.length) * 360;
                return `${p.color || '#6366f1'} ${start}deg ${end}deg`;
              }).join(', ')})`,
              boxShadow: '0 0 40px rgba(99, 102, 241, 0.3), inset 0 0 30px rgba(0,0,0,0.3)',
            }}
          >
            <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-extrabold text-white text-xl shadow-lg z-10">
              SPIN
            </div>
          </div>
        </div>
      </div>

      {/* Prize Configuration Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <span className="text-lg font-bold text-gray-800">Cấu hình giải thưởng</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Màu</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Giải thưởng</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Loại</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Giá trị</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Xác suất</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Số lượng</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Đã trúng</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prizes.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: p.color || '#6366f1' }}
                    />
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-800">{p.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      p.type === 'VOUCHER' ? 'bg-blue-100 text-blue-700' :
                      p.type === 'POINTS' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {p.type === 'VOUCHER' ? '🎫 Voucher' : 
                       p.type === 'POINTS' ? '⭐ Điểm' : 
                       p.type === 'NOTHING' ? '💨 May mắn' : '🎁 Vật phẩm'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {p.voucher ? (
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-800">
                          {p.voucher.type === 'PERCENT' 
                            ? `${p.voucher.value}%` 
                            : new Intl.NumberFormat('vi-VN').format(p.voucher.value) + 'đ'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{p.voucher.code}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-[60px] h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                          style={{ width: `${p.probability * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-gray-700">
                        {(p.probability * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{p.quantity ?? '∞'}</td>
                  <td className="px-6 py-4 text-gray-700">{p.wonCount}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {p.isActive ? 'Bật' : 'Tắt'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <SpinPrizeRowActions prize={p} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Probability validation */}
      {prizes.length > 0 && (
        <div className="mt-4 max-w-md bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-blue-600">ℹ️</span>
          <span className="text-sm text-gray-700">
            Tổng xác suất: <strong>{(prizes.reduce((s, p) => s + p.probability, 0) * 100).toFixed(1)}%</strong>
            {Math.abs(prizes.reduce((s, p) => s + p.probability, 0) - 1) > 0.01 && (
              <span className="text-orange-600"> ⚠ Nên = 100%</span>
            )}
          </span>
        </div>
      )}
    </>
  );
}
