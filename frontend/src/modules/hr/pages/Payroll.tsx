import { Banknote } from 'lucide-react';
import { ComingSoon } from '@/shared/components/ui/ComingSoon';

export default function Payroll() {
  return (
    <ComingSoon
      icon={Banknote}
      title="Payroll"
      description="Calculate and process staff salaries, bonuses, and deductions."
      accentColor="violet"
    />
  );
}
