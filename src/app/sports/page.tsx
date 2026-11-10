import { CategoryShell, categoryMetadata } from "@/components/stream/category-shell";

export const metadata = categoryMetadata("sports");

export default function SportsPage() {
  return <CategoryShell categoryId="sports" />;
}
