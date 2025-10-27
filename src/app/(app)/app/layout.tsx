import type { ReactNode } from "react";
import { AppShell } from "../../../components/app/app-shell";
import { getCurrentUser } from "../../../lib/auth/get-user";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await getCurrentUser();
  
  let subscriptionInfo = null;
  
  if (user) {
    const supabase = await getSupabaseServerClient();
    const now = new Date().toISOString();
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('current_period_end, plans(name)')
      .eq('status', 'active')
      .eq('user_id', user.id)
      .gt('current_period_end', now)
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscription?.plans && !Array.isArray(subscription.plans) && 'name' in subscription.plans) {
      const renewalDate = new Date(subscription.current_period_end);
      const currentYear = new Date().getFullYear();
      const plan = subscription.plans as { name: string };
      subscriptionInfo = {
        planName: plan.name,
        renewalDate: renewalDate.toLocaleDateString('es-EC', {
          day: 'numeric',
          month: 'short',
          year: renewalDate.getFullYear() === currentYear ? undefined : 'numeric'
        })
      };
    }
  }
  
  return <AppShell subscription={subscriptionInfo}>{children}</AppShell>;
}
