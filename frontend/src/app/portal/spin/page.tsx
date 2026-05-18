import { getSession } from '@/lib/auth';
import SpinWheelClient from '@/components/customer/SpinWheelClient';
export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/apiClient';

export default async function PortalSpinPage() {
  const session = await getSession();
  if (!session) return null;

  let spinTurns = 0;
  let prizes: any[] = [];
  let recentWins: any[] = [];

  try {
    const [attemptsData, prizesData, historyData] = await Promise.all([
      apiClient.get<any>('/spin/attempts'),
      apiClient.get<any[]>('/spin/prizes'),
      apiClient.get<any[]>('/spin/history'),
    ]);
    spinTurns = attemptsData.spinAttempts || 0;
    prizes = prizesData;
    recentWins = historyData;
  } catch (error) {
    console.error('Error fetching spin data:', error);
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">Vòng Quay May Mắn</h1>
        <p className="text-gray-600 text-sm">Quay để nhận voucher, điểm thưởng và nhiều hơn nữa!</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <SpinWheelClient prizes={prizes} spinTurns={spinTurns} />

        <div>
          {/* Prize list */}
          <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
            <h3 className="text-lg font-bold mb-4">Giải thưởng</h3>
            <div className="flex flex-col gap-2">
              {prizes.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2 px-3 bg-gray-50 rounded-lg">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color || '#6366f1' }}
                  />
                  <span className="font-semibold text-sm flex-1">{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold mb-4">Lịch sử quay</h3>
            {recentWins.length === 0 ? (
              <div className="text-gray-500 text-sm">Chưa có lượt quay nào</div>
            ) : (
              <div className="flex flex-col gap-2">
                {recentWins.map(h => (
                  <div
                    key={h.id}
                    className={`flex items-center justify-between p-2 px-3 rounded-lg ${h.won
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-gray-50'
                      }`}
                  >
                    <span className={`text-sm ${h.won ? 'font-semibold' : ''}`}>
                      {h.won ? '🎉' : '💨'} {h.prize?.name || 'Phần quà'}
                    </span>
                    <span className="text-xs text-gray-600">
                      {new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(new Date(h.createdAt))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
