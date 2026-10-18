
import { formatDate } from '../../../lib/raffle/labels';
import type { ReactNode } from "react";
import { AppShell } from "../../../components/app/app-shell";
import { getCurrentUser } from "../../../lib/auth/get-user";
import { prisma } from "../../../lib/db";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await getCurrentUser();
  
  let subscriptionInfo = null;
  
  if (user) {
    const subscription = await prisma.subscriptions.findFirst({
      where: { status: 'active', user_id: user.id, current_period_end: { gt: new Date() } },
      select: { current_period_end: true, plans: { select: { name: true } } },
      orderBy: { current_period_end: 'desc' },
    });

    if (subscription?.plans && subscription.current_period_end) {
      const renewalDate = subscription.current_period_end;
      subscriptionInfo = {
        planName: subscription.plans.name,
        renewalDate: formatDate(renewalDate)
      };
    }
  }
  
  return <AppShell subscription={subscriptionInfo}>{children}</AppShell>;
}
