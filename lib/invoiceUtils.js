function pad(value) {
  return String(value).padStart(2, "0");
}

export function createInvoiceNumber(prefix, date = new Date()) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const sequence = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return `${prefix}-${year}${month}${day}-${sequence}`;
}

export function calculatePurchaseTotal(quantity, unitPrice) {
  return (Number(quantity) || 0) * (Number(unitPrice) || 0);
}
