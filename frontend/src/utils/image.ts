// src/utils/image.ts

export const DEFAULT_COVERS: Record<string, string> = {
  wedding: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200',
  baptism: 'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?auto=format&fit=crop&w=1200',
  party: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200',
  other: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200'
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Intelligent Cover URL Generator
 * - Returns Unsplash URL if it's a default or external link
 * - Returns Supabase Storage URL if it's a path
 * - Returns a fallback if everything fails
 */
export const getEventCoverUrl = (path: string | null | undefined, category: string = 'other'): string => {
  // 1. If no path, return the default for that category
  if (!path) {
    return DEFAULT_COVERS[category] || DEFAULT_COVERS['other'];
  }

  // 2. If it's already a full URL (like Unsplash), return it as is
  if (path.startsWith('http')) {
    return path;
  }

  // 3. Otherwise, it's a Supabase file. Prepend the bucket URL.
  // Remove trailing slash from env var just in case, to avoid double slashes
  const baseUrl = SUPABASE_URL?.replace(/\/$/, '') || '';
  return `${baseUrl}/storage/v1/object/public/uploads/${path}`;
};

/**
 * Intelligent Memory URL Generator
 * - Handles missing paths
 * - Handles external vs storage paths
 */
export const getImageUrl = (path: string | null | undefined) => {
    if (!path) return 'https://placehold.co/400x400?text=No+Image';
    
    if (path.startsWith('http')) {
        return path;
    }
    
    const baseUrl = SUPABASE_URL?.replace(/\/$/, '') || '';
    return `${baseUrl}/storage/v1/object/public/uploads/${path}`;
};