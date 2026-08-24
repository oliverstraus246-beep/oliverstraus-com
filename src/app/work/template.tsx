import { PageTransition } from "@/components/page-transition";

export default function WorkTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransition>{children}</PageTransition>;
}
