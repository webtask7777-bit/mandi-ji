// Public contact channels. Leave empty until the address/number is owned and monitored:
// the old @mandiji.in addresses belong to an unrelated company's domain.
export const CONTACT = Object.freeze({
  email: '',
  whatsapp: '',
});

export const hasContact = () => Boolean(CONTACT.email || CONTACT.whatsapp);
