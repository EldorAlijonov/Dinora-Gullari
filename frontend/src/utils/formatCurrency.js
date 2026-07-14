export function formatCurrency(value = 0) {
  return `${new Intl.NumberFormat('uz-UZ').format(Number(value) || 0)} so'm`;
}
