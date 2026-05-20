import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ | Customer CRM',
  description: 'Tổng hợp các câu hỏi thường gặp về thanh toán, voucher và đăng nhập theo đúng chức năng hiện có trên Customer CRM.',
};

const lastUpdated = '20/05/2026';

const quickFacts = [
  {
    label: 'Thanh toán hiện có',
    value: 'COD và VietQR',
    description: 'Màn hình checkout hiện chỉ cho chọn hai phương thức này.',
  },
  {
    label: 'Cách dùng voucher',
    value: 'Chọn trong popup',
    description: 'Checkout chưa có ô nhập mã tay, bạn chọn voucher bằng nút Chọn mã.',
  },
  {
    label: 'Cách đăng nhập',
    value: 'Email, số điện thoại hoặc Google',
    description: 'Form login nhận email hoặc số điện thoại cùng mật khẩu, ngoài ra có nút đăng nhập Google.',
  },
];

const paymentFaqs = [
  {
    question: 'Hiện tại tôi có thể thanh toán bằng những cách nào?',
    answer:
      'Checkout hiện cho chọn Thanh toán khi nhận hàng (COD) hoặc VietQR. Chưa thấy các phương thức khác như ví điện tử hay thẻ xuất hiện trong giao diện checkout người dùng.',
  },
  {
    question: 'Vì sao tôi chưa thấy phí vận chuyển?',
    answer:
      'Phí ship chỉ được tính khi bạn nhập đủ tỉnh, phường và địa chỉ đường phố. Nếu địa chỉ chưa đủ, phần tóm tắt đơn hàng chưa cộng phí vận chuyển.',
  },
  {
    question: 'Vì sao phí vận chuyển vẫn đang chờ hoặc thay đổi sau khi tôi sửa địa chỉ?',
    answer:
      'Sau khi bạn nhập xong địa chỉ giao hàng, hệ thống gọi lại phần tính phí ship. Vì vậy phí có thể cập nhật lại sau một khoảng ngắn khi bạn đổi tỉnh, phường hoặc địa chỉ.',
  },
  {
    question: 'Nếu chọn VietQR thì đơn hàng được xử lý như thế nào?',
    answer:
      'Khi bạn đặt hàng với VietQR, hệ thống tạo đơn trước rồi mở bước thanh toán QR cho đơn đó. Nếu thanh toán xong thành công, bạn được chuyển sang luồng hoàn tất đơn hàng tương ứng.',
  },
];

const voucherFaqs = [
  {
    question: 'Vì sao voucher không xuất hiện trong popup Chọn mã?',
    answer:
      'Popup checkout chỉ lấy các voucher còn hiệu lực, chưa dùng, đang ở trạng thái ACTIVE và phù hợp với shop của giỏ hàng hiện tại. Voucher hết hạn, đã dùng hoặc không đúng shop sẽ không hiện để chọn.',
  },
  {
    question: 'Vì sao voucher hiện là Không đủ điều kiện?',
    answer:
      'Voucher có thể chưa đạt đơn tối thiểu, chưa đủ số sản phẩm khác nhau hoặc chưa đạt ngưỡng của voucher theo tầng. Trong trường hợp đó hệ thống vẫn hiện voucher nhưng gắn nhãn Không đủ điều kiện thay vì cho chọn.',
  },
  {
    question: 'Tôi có thể nhập mã giảm giá bằng tay không?',
    answer:
      'Hiện tại không. Checkout đang dùng popup Chọn mã giảm giá, chưa có ô để nhập thủ công một mã voucher.',
  },
  {
    question: 'Tôi có thể dùng nhiều voucher cùng lúc không?',
    answer:
      'Hệ thống hiện đang cho phép chọn nhiều mã hợp lệ cùng lúc nếu các mã đó không bị loại bởi điều kiện áp dụng. Tổng giảm giá sẽ được cập nhật lại trực tiếp trong phần tóm tắt đơn hàng.',
  },
];

const loginFaqs = [
  {
    question: 'Tôi có thể đăng nhập bằng gì?',
    answer:
      'Trang đăng nhập hiện nhận số điện thoại hoặc email cùng mật khẩu. Ngoài ra còn có nút đăng nhập và đăng ký bằng Google.',
  },
  {
    question: 'Vì sao đăng nhập Google báo lỗi?',
    answer:
      'Màn hình login hiện đã xử lý các lỗi phổ biến như không nhận được mã từ Google, lỗi đổi token, không lấy được thông tin người dùng hoặc tài khoản bị vô hiệu hóa. Nếu gặp lỗi lặp lại, bạn nên thử lại bằng đúng tài khoản Google đã dùng trước đó hoặc liên hệ hỗ trợ.',
  },
  {
    question: 'Nếu tôi quên mật khẩu thì sao?',
    answer:
      'Hiện tại frontend chưa có màn hình tự đặt lại mật khẩu riêng. Nếu quên mật khẩu, bạn cần liên hệ bộ phận hỗ trợ để được xử lý.',
  },
  {
    question: 'Đăng ký mới xong thì tôi sẽ đi đâu tiếp?',
    answer:
      'Sau khi đăng ký thành công, hệ thống chuyển người dùng mới sang bước onboarding thay vì vào thẳng khu vực mua hàng.',
  },
];

const actualBehaviors = [
  'Đăng nhập thường đang hỗ trợ email hoặc số điện thoại với mật khẩu.',
  'Đăng nhập Google đã có sẵn trên trang login và sau khi xác thực xong sẽ chuyển về đúng luồng người dùng.',
  'Checkout người dùng hiện có COD, VietQR, voucher chọn qua popup và phần giảm từ số dư hoa hồng.',
  'Phí vận chuyển chỉ bắt đầu tính khi địa chỉ giao hàng đã đủ thông tin cần thiết.',
];

const quickLinks = [
  {
    href: '/login',
    title: 'Đăng nhập',
    description: 'Kiểm tra trực tiếp các cách đăng nhập đang có trên hệ thống.',
  },
  {
    href: '/how-to/vouchers',
    title: 'Hướng dẫn voucher',
    description: 'Xem đầy đủ hơn về điều kiện áp dụng voucher ở bước thanh toán.',
  },
  {
    href: '/contact',
    title: 'Liên hệ hỗ trợ',
    description: 'Đi tới form hỗ trợ khi cần xử lý sự cố hoặc cần người hỗ trợ trực tiếp.',
  },
];

function renderFaqSection(
  title: string,
  description: string,
  items: Array<{ question: string; answer: string }>,
  tone: 'indigo' | 'amber' | 'emerald',
) {
  const toneMap = {
    indigo: {
      dot: 'from-indigo-600 to-blue-500',
      border: 'border-indigo-200',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      hover: 'hover:border-indigo-300',
    },
    amber: {
      dot: 'from-amber-500 to-orange-500',
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      hover: 'hover:border-amber-300',
    },
    emerald: {
      dot: 'from-emerald-500 to-green-500',
      border: 'border-emerald-200',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      hover: 'hover:border-emerald-300',
    },
  } as const;

  const style = toneMap[tone];

  return (
    <section>
      <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
        <span className={`mr-3 h-8 w-2 rounded-full bg-gradient-to-b ${style.dot}`}></span>
        {title}
      </h2>
      <p className="mb-5 text-sm leading-6 text-gray-600">{description}</p>
      <div className="space-y-3">
        {items.map((item) => (
          <details
            key={item.question}
            className={`rounded-lg border ${style.border} bg-white p-5 transition-colors ${style.hover}`}
          >
            <summary className="cursor-pointer list-none pr-6 text-base font-semibold text-gray-900">
              {item.question}
            </summary>
            <p className="mt-3 text-sm leading-6 text-gray-700">{item.answer}</p>
          </details>
        ))}
      </div>
      <div className={`mt-4 rounded-lg border ${style.border} ${style.bg} p-4 text-sm leading-6 text-gray-700`}>
        <span className={`font-semibold ${style.text}`}>Lưu ý:</span> Nội dung trong mục này được viết theo đúng luồng đang hiển thị trên web ở thời điểm hiện tại.
      </div>
    </section>
  );
}

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-white py-6 md:bg-gray-50 md:py-12">
      <div className="mx-auto w-full px-4 md:w-[80%] md:px-0">
        <div className="bg-white p-0 sm:p-6 md:rounded-lg md:border md:border-gray-200 md:p-12 md:shadow-sm">
          <div className="mb-8 border-b border-gray-200 pb-6">
            <h1 className="mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent">
              FAQ
            </h1>
            <p className="text-lg text-gray-600">
              Tổng hợp các câu hỏi thường gặp về thanh toán, voucher và đăng nhập theo đúng chức năng hiện đang có trên Customer CRM.
            </p>
            <p className="mt-2 text-sm text-gray-500">Cập nhật lần cuối: {lastUpdated}</p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                1. Tóm tắt nhanh
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {quickFacts.map((item) => (
                  <div key={item.label} className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">{item.label}</div>
                    <div className="text-xl font-bold text-gray-900">{item.value}</div>
                    <div className="mt-2 text-sm leading-6 text-gray-600">{item.description}</div>
                  </div>
                ))}
              </div>
            </section>

            {renderFaqSection(
              '2. Thanh toán',
              'Nhóm này tập trung vào các câu hỏi liên quan đến phí vận chuyển, phương thức thanh toán và luồng thanh toán tại checkout.',
              paymentFaqs,
              'indigo',
            )}

            {renderFaqSection(
              '3. Voucher và mã giảm giá',
              'Nhóm này giải thích lý do voucher không xuất hiện, không áp dụng được hoặc không cho chọn ở bước checkout.',
              voucherFaqs,
              'amber',
            )}

            {renderFaqSection(
              '4. Đăng nhập và truy cập tài khoản',
              'Nhóm này tập trung vào cách đăng nhập đang hỗ trợ, lỗi Google và các vấn đề truy cập thường gặp.',
              loginFaqs,
              'emerald',
            )}

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                5. Hệ thống hiện đang hoạt động như thế nào
              </h2>
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-6">
                <ul className="list-inside list-disc space-y-3 text-sm leading-6 text-gray-700">
                  {actualBehaviors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                6. Đi nhanh đến đúng chỗ
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {quickLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg border border-gray-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
                  >
                    <div className="mb-2 text-lg font-semibold text-gray-900">{item.title}</div>
                    <div className="text-sm leading-6 text-gray-600">{item.description}</div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
