import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cách dùng Voucher | Customer CRM',
  description: 'Hướng dẫn từng bước cách nhập mã, kiểm tra hạn dùng và điều kiện áp dụng voucher trên Customer CRM.',
};

const lastUpdated = '20/05/2026';

const steps = [
  {
    title: 'Xem đúng danh sách voucher đang có',
    description:
      'Trang Voucher hiện chia rõ trạng thái để bạn biết mã nào dùng được ngay và mã nào chưa dùng được.',
    items: [
      'Vào trang Voucher của tôi để xem các mục Khả dụng, Sắp hết hạn và Đang chờ kích hoạt.',
      'Voucher trong mục Đang chờ kích hoạt chưa xuất hiện để chọn ở bước thanh toán.',
      'Phần Mã giảm giá từ hệ thống hiển thị thêm các voucher công khai của hệ thống hoặc của từng shop.',
    ],
  },
  {
    title: 'Kiểm tra điều kiện trên từng voucher',
    description:
      'Mỗi voucher có điều kiện riêng, và hệ thống đang hiển thị thẳng các điều kiện này ngay trên thẻ voucher hoặc trong popup chọn mã.',
    items: [
      'Kiểm tra Đơn tối thiểu đang hiển thị trên voucher. Không phải mã nào cũng cố định 399.000đ.',
      'Nếu voucher có hạn dùng, hệ thống sẽ hiển thị thời gian Hết hạn hoặc Hạn dùng ngay trên thẻ.',
      'Kiểm tra loại giảm giá: giảm phần trăm, giảm số tiền cố định, freeship hoặc voucher theo tầng.',
      'Nếu voucher thuộc shop riêng, mã đó chỉ áp dụng khi giỏ hàng đang mua đúng shop tương ứng.',
    ],
  },
  {
    title: 'Chọn voucher ở bước thanh toán',
    description:
      'Tại màn hình thanh toán hiện tại, hệ thống dùng popup Chọn mã chứ không có ô nhập mã tay.',
    items: [
      'Sau khi có sản phẩm trong giỏ, vào bước thanh toán và bấm Chọn mã trong khối Mã giảm giá.',
      'Popup Chọn mã giảm giá sẽ hiển thị các voucher còn hiệu lực, chưa dùng và phù hợp với giỏ hàng hiện tại.',
      'Voucher không đạt điều kiện sẽ hiện nhãn Không đủ điều kiện và không chọn được.',
      'Hệ thống hiện cho phép chọn nhiều mã hợp lệ cùng lúc nếu mã đó không bị loại khỏi điều kiện áp dụng.',
    ],
  },
  {
    title: 'Kiểm tra tổng tiền trước khi đặt hàng',
    description:
      'Sau khi chọn mã, hệ thống tự cập nhật tóm tắt đơn hàng để bạn đối chiếu lại trước khi đặt.',
    items: [
      'Các mã đã chọn sẽ hiện thành chip ngay dưới nút Chọn mã.',
      'Dòng Giảm giá Voucher sẽ tự hiển thị khi có mã hợp lệ được áp dụng.',
      'Phí vận chuyển chỉ được tính khi bạn đã nhập đủ địa chỉ giao hàng.',
      'Bạn có thể bỏ từng mã hoặc bấm Bỏ chọn để xóa toàn bộ mã đang áp dụng.',
    ],
  },
];

const voucherChecks = [
  { label: 'Trạng thái', value: 'Khả dụng, Sắp hết hạn hoặc Đang chờ kích hoạt' },
  { label: 'Đơn tối thiểu', value: 'Lấy đúng từ từng voucher, ví dụ có mã đang yêu cầu từ 399.000đ nhưng không phải tất cả đều như nhau' },
  { label: 'Hạn dùng', value: 'Hiển thị ngay trên voucher nếu mã có thời gian hết hiệu lực' },
  { label: 'Phạm vi shop', value: 'Voucher shop chỉ vào được checkout khi giỏ hàng thuộc đúng shop đó' },
  { label: 'Loại giảm', value: 'Giảm tiền, giảm phần trăm, freeship hoặc voucher theo tầng' },
  { label: 'Điều kiện nâng cao', value: 'Voucher theo tầng có thể xét theo giá trị đơn hoặc số sản phẩm khác nhau' },
];

const commonIssues = [
  'Đơn hàng chưa đạt giá trị tối thiểu của voucher.',
  'Voucher đã hết hạn, đã dùng rồi hoặc đang ở trạng thái chờ kích hoạt.',
  'Voucher thuộc shop khác nên không xuất hiện hoặc không dùng được cho giỏ hàng hiện tại.',
  'Voucher theo tầng chưa đạt ngưỡng giá trị đơn hoặc chưa đủ số sản phẩm khác nhau.',
];

const actualBehaviors = [
  'Trang thanh toán hiện không có ô nhập mã tay. Bạn chọn voucher trong popup Chọn mã giảm giá.',
  'Popup checkout chỉ lấy các voucher ACTIVE, chưa dùng, chưa hết hạn và phù hợp với shop trong giỏ hàng.',
  'Voucher PENDING vẫn có thể nhìn thấy ở trang Voucher, nhưng chưa thể chọn để thanh toán.',
  'Nếu voucher không đủ điều kiện, popup sẽ gắn nhãn Không đủ điều kiện thay vì cho chọn.',
  'Hệ thống đang cộng dồn các mã hợp lệ đã chọn và tự tính lại dòng Giảm giá Voucher trong tóm tắt đơn hàng.',
];

export default function VoucherGuidePage() {
  return (
    <div className="min-h-screen bg-white py-6 md:bg-gray-50 md:py-12">
      <div className="mx-auto w-full px-4 md:w-[80%] md:px-0">
        <div className="bg-white p-0 sm:p-6 md:rounded-lg md:border md:border-gray-200 md:p-12 md:shadow-sm">
          <div className="mb-8 border-b border-gray-200 pb-6">
            <h1 className="mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent">
              Cách dùng Voucher
            </h1>
            <p className="text-lg text-gray-600">
              Hướng dẫn từng bước cách nhập mã, kiểm tra hạn dùng và điều kiện áp dụng khi thanh toán.
            </p>
            <p className="mt-2 text-sm text-gray-500">Cập nhật lần cuối: {lastUpdated}</p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                1. Dùng voucher như thế nào
              </h2>
              <div className="space-y-5">
                {steps.map((step, index) => (
                  <div key={step.title} className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                        {index + 1}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                    </div>
                    <p className="mb-4 text-sm leading-6 text-gray-700">{step.description}</p>
                    <ul className="list-inside list-disc space-y-2 text-sm text-gray-700">
                      {step.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                2. Cần kiểm tra những gì trước khi dùng mã
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {voucherChecks.map((item) => (
                  <div key={item.label} className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-700">{item.label}</div>
                    <div className="text-sm leading-6 text-gray-700">{item.value}</div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                3. Các lỗi thường gặp
              </h2>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                <ul className="list-inside list-disc space-y-3 text-sm text-gray-700">
                  {commonIssues.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                4. Hệ thống hiện đang hoạt động như thế nào
              </h2>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6">
                <ul className="list-inside list-disc space-y-3 text-sm text-gray-700">
                  {actualBehaviors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                5. Đi nhanh đến đúng chỗ
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Link
                  href="/portal/vouchers"
                  className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
                >
                  <div className="mb-2 text-lg font-semibold text-gray-900">Danh sách voucher</div>
                  <div className="text-sm text-gray-600">Xem mã đang có, hạn dùng và điều kiện áp dụng.</div>
                </Link>
                <Link
                  href="/portal/cart"
                  className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
                >
                  <div className="mb-2 text-lg font-semibold text-gray-900">Giỏ hàng và thanh toán</div>
                  <div className="text-sm text-gray-600">Đi tiếp đến checkout để bấm Chọn mã và xem tổng tiền sau giảm.</div>
                </Link>
                <Link
                  href="/portal/support/contact"
                  className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
                >
                  <div className="mb-2 text-lg font-semibold text-gray-900">Liên hệ hỗ trợ</div>
                  <div className="text-sm text-gray-600">Dùng khi cần kiểm tra mã hoặc xử lý lỗi áp dụng.</div>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
