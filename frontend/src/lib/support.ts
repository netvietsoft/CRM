const hotlineDisplay = process.env.NEXT_PUBLIC_SUPPORT_HOTLINE || '0987 654 321';
const hotlineDigits = hotlineDisplay.replace(/[^\d+]/g, '');
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@customercrm.vn';
const supportAddress = process.env.NEXT_PUBLIC_SUPPORT_ADDRESS || '72 Tran Dang Ninh, Cau Giay, Ha Noi';
const supportOfficeHours =
  process.env.NEXT_PUBLIC_SUPPORT_OFFICE_HOURS ||
  '8:00 - 18:00 (Thu 2 - Thu 6), 8:00 - 12:00 (Thu 7)';
const supportZaloUrl = process.env.NEXT_PUBLIC_SUPPORT_ZALO_URL || '';
const supportMessengerUrl = process.env.NEXT_PUBLIC_SUPPORT_MESSENGER_URL || '';

export const supportContact = {
  hotlineDisplay,
  hotlineHref: hotlineDigits ? `tel:${hotlineDigits}` : '',
  email: supportEmail,
  emailHref: `mailto:${supportEmail}`,
  address: supportAddress,
  officeHours: supportOfficeHours,
  zaloUrl: supportZaloUrl,
  messengerUrl: supportMessengerUrl,
};
