export const getEventCoverUrl = (path: string | null | undefined): string => {
  if (!path) return 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200'; // Default fallback
  if (path.startsWith('http')) return path;
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/uploads/${path}`;
};
