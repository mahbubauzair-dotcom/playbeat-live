import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CategoryShell,
  categoryMetadata,
} from "@/components/stream/category-shell";
import { catalog } from "@/lib/stream.server";

interface Props {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return catalog.categories.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const valid = catalog.categories.some((c) => c.id === id);
  if (!valid) return { title: "Category not found — PlayBeat TV" };
  return categoryMetadata(id);
}

export default async function CategoryPage({ params }: Props) {
  const { id } = await params;
  if (!catalog.categories.some((c) => c.id === id)) notFound();
  return <CategoryShell categoryId={id} />;
}
