import { Metadata } from 'next';
import SupportContactPage from '@/components/customer/SupportContactPage';
import ContactFormClient from '../portal/support/contact/ContactFormClient';

export const metadata: Metadata = {
  title: 'Liên hệ hỗ trợ | Customer CRM',
  description: 'Liên hệ với đội ngũ hỗ trợ khách hàng của Customer CRM',
};

export default function PublicContactPage() {
  return <SupportContactPage form={<ContactFormClient />} />;
}
