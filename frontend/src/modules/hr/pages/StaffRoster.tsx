import { Users } from 'lucide-react';
import { ComingSoon } from '@/shared/components/ui/ComingSoon';

export default function StaffRoster() {
  return (
    <ComingSoon
      icon={Users}
      title="Staff Roster"
      description="Plan and manage employee shifts, schedules, and attendance."
      accentColor="violet"
    />
  );
}
