import type { ReactNode } from "react";

import { AnnouncementBar } from "../../components/home/announcement-bar";

type PublicLayoutProps = {
  children: ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <>
      <AnnouncementBar />
      {children}
    </>
  );
}
