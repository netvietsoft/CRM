import Link from 'next/link';

const supportLinks = [
  { href: '/portal/support/about', label: 'Thông tin cơ bản' },
  { href: '/portal/support/contact', label: 'Liên hệ hỗ trợ' },
  { href: '/portal/support/order-guide', label: 'Hướng dẫn đặt hàng' },
  { href: '/portal/how-to/vouchers', label: 'Cách dùng voucher' },
  { href: '/portal/how-to/referral', label: 'Cơ chế Affiliate' },
  { href: '/portal/orders', label: 'Theo dõi đơn hàng' },
  { href: '/portal/seller-register', label: 'Đăng ký bán hàng' },
];

const policyLinks = [
  { href: '/portal/policies/points', label: 'Chính sách tích điểm - Tiêu điểm' },
  { href: '/portal/policies/refund', label: 'Chính sách hoàn tiền' },
  { href: '/portal/policies/shipping', label: 'Chính sách giao hàng' },
  { href: '/portal/policies/privacy', label: 'Chính sách bảo mật' },
  { href: '/portal/policies/terms', label: 'Điều khoản dịch vụ' },
];

const socialLinks = [
  { href: '#', label: 'Facebook', className: 'hover:text-indigo-600' },
  { href: '#', label: 'Instagram', className: 'hover:text-pink-600' },
  { href: '#', label: 'Twitter', className: 'hover:text-blue-500' },
];

const contactItems = [
  {
    title: 'Địa chỉ:',
    value: '72 Trần Đăng Ninh, Cầu Giấy, Hà Nội',
    className: 'text-sm text-gray-600 leading-relaxed',
  },
  {
    title: 'Điện thoại:',
    value: '0987 654 321',
    className: 'text-sm text-gray-600',
  },
  {
    title: 'Email:',
    value: 'support@customercrm.vn',
    className: 'text-sm text-gray-600',
  },
];

export default function Footer() {
  return (
    <footer className="mt-12 w-full border-t border-gray-200 bg-white pt-16 pb-8">
      <div className="mx-auto w-[80%]">
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-4 flex h-8 items-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
              Customer CRM
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-gray-600">
              Hệ thống mua sắm và quản lý khách hàng cao cấp, đem lại trải nghiệm dịch vụ tuyệt vời và chuyên nghiệp.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`text-sm font-semibold text-gray-500 transition-colors ${item.className}`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 flex h-8 items-center text-sm font-bold uppercase tracking-wider text-gray-900">
              Hỗ trợ khách hàng
            </h3>
            <ul className="space-y-3">
              {supportLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="group relative inline-block text-sm text-gray-600 transition-colors hover:text-indigo-600">
                    {item.label}
                    <span className="absolute -bottom-0.5 left-0 h-[1.5px] w-0 bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 flex h-8 items-center text-sm font-bold uppercase tracking-wider text-gray-900">
              Chính sách
            </h3>
            <ul className="space-y-3">
              {policyLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="group relative inline-block text-sm text-gray-600 transition-colors hover:text-indigo-600">
                    {item.label}
                    <span className="absolute -bottom-0.5 left-0 h-[1.5px] w-0 bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 flex h-8 items-center text-sm font-bold uppercase tracking-wider text-gray-900">
              Liên hệ
            </h3>
            <ul className="space-y-4">
              {contactItems.map((item) => (
                <li key={item.title} className={item.className}>
                  <span className="mb-0.5 block font-semibold text-gray-900">{item.title}</span>
                  {item.value}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 md:flex-row">
          <p className="text-xs font-medium text-gray-500">
            &copy; {new Date().getFullYear()} Customer CRM. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-gray-400">Secure Payments</span>
            <div className="flex gap-2 opacity-60">
              <div className="h-6 w-10 rounded bg-gray-200"></div>
              <div className="h-6 w-10 rounded bg-gray-200"></div>
              <div className="h-6 w-10 rounded bg-gray-200"></div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
