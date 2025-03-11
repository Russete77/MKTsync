import { useSettings } from '../lib/settings';

interface CurrencyDisplayProps {
  amount: number;
}

const currencyFormatters: Record<string, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
  EUR: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }),
  BRL: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
};

export function CurrencyDisplay({ amount }: CurrencyDisplayProps) {
  const { currency } = useSettings();
  const formatter = currencyFormatters[currency] || currencyFormatters.USD;
  return <>{formatter.format(amount)}</>;
}