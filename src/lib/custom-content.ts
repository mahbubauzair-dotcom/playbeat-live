"use client";

import { useEffect, useState } from "react";
import type { StreamChannel } from "./stream";

export interface CustomContentItem {
  id: string;
  title: string;
  type: "movie" | "drama" | "cartoon";
  streamUrl: string;
  posterUrl: string;
  country: string;
  language: string;
  quality: "4K" | "1080p" | "720p" | "HD";
  year?: number;
  description?: string;
  createdAt: string;
}

const STORAGE_KEY = "playbeat_custom_content_v1";

// Default starter custom content so admin sees examples immediately
export const INITIAL_CUSTOM_CONTENT: CustomContentItem[] = [
  {
    id: "custom-movie-sintel",
    title: "Sintel (Open Cinema)",
    type: "movie",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80",
    country: "US",
    language: "English",
    quality: "1080p",
    year: 2024,
    description: "An epic open-source fantasy cinema masterpiece.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "custom-cartoon-bbb",
    title: "Big Buck Bunny",
    type: "cartoon",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    posterUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
    country: "US",
    language: "English",
    quality: "1080p",
    year: 2024,
    description: "Hilarious 3D animated comedy cartoon for all ages.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "custom-drama-tearsofsteel",
    title: "Tears of Steel (Sci-Fi Drama)",
    type: "drama",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    posterUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    country: "NL",
    language: "English",
    quality: "4K",
    year: 2024,
    description: "Gripping futuristic drama series set in dystopian Amsterdam.",
    createdAt: new Date().toISOString(),
  },
];

/** Read stored custom content from browser localStorage */
export function getStoredCustomContent(): CustomContentItem[] {
  if (typeof window === "undefined") return INITIAL_CUSTOM_CONTENT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CUSTOM_CONTENT));
      return INITIAL_CUSTOM_CONTENT;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_CUSTOM_CONTENT;
  } catch {
    return INITIAL_CUSTOM_CONTENT;
  }
}

/** Save custom content list to browser localStorage */
export function saveCustomContent(items: CustomContentItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("playbeat-custom-content-changed"));
  } catch (err) {
    console.error("Failed to save custom content:", err);
  }
}

/** Convert a CustomContentItem into a unified StreamChannel object */
export function customItemToChannel(item: CustomContentItem): StreamChannel {
  const cats: string[] = [];
  if (item.type === "movie") cats.push("movies", "entertainment");
  if (item.type === "drama") cats.push("series", "entertainment");
  if (item.type === "cartoon") cats.push("animation", "kids");

  const qNum = item.quality === "4K" ? 2160 : item.quality === "1080p" ? 1080 : 720;

  return {
    id: item.id,
    name: item.title,
    country: item.country || "GLOBAL",
    flag: "🎬",
    cats,
    logo: item.posterUrl,
    srcs: [{ u: item.streamUrl, q: qNum }],
  };
}

/** Hook to subscribe to custom content changes in real time */
export function useCustomContent() {
  const [items, setItems] = useState<CustomContentItem[]>(() => getStoredCustomContent());

  useEffect(() => {
    const handleUpdate = () => {
      setItems(getStoredCustomContent());
    };
    window.addEventListener("playbeat-custom-content-changed", handleUpdate);
    return () => window.removeEventListener("playbeat-custom-content-changed", handleUpdate);
  }, []);

  const addOrUpdate = (item: CustomContentItem) => {
    const current = getStoredCustomContent();
    const index = current.findIndex((x) => x.id === item.id);
    let next: CustomContentItem[];
    if (index >= 0) {
      next = [...current];
      next[index] = item;
    } else {
      next = [item, ...current];
    }
    saveCustomContent(next);
    setItems(next);
  };

  const remove = (id: string) => {
    const next = getStoredCustomContent().filter((x) => x.id !== id);
    saveCustomContent(next);
    setItems(next);
  };

  return { items, addOrUpdate, remove };
}
