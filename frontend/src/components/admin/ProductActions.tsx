import Link from 'next/link';

export default function ProductActions() {
  return (
    <Link
      href="/admin/products/create-product"
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
    >
      + Tạo Sản phẩm
    </Link>
  );
}
