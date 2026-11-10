import { CategoryShell, categoryMetadata } from "@/components/stream/category-shell";

export const metadata = categoryMetadata("news");

export default function NewsPage() {
  return <CategoryShell categoryId="news" />;
}
