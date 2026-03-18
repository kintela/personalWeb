import "server-only";

import { createClient } from "@supabase/supabase-js";

const IMAGE_FILE_PATTERN = /\.(avif|gif|jpe?g|png|webp)$/i;
const DEFAULT_BUCKET = "fotos";

export type PhotoAsset = {
  id: string;
  name: string;
  src: string;
  createdAt: string | null;
};

export type PhotoGalleryResult = {
  photos: PhotoAsset[];
  bucket: string;
  configured: boolean;
  error: string | null;
};

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function getSupabaseServerKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? getSupabasePublicKey();
}

export function getPhotoBucketName() {
  return process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? DEFAULT_BUCKET;
}

export async function getPhotoGallery(): Promise<PhotoGalleryResult> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseServerKey();
  const bucket = getPhotoBucketName();

  if (!supabaseUrl || !supabaseKey) {
    return {
      photos: [],
      bucket,
      configured: false,
      error:
        "Faltan variables de entorno de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y la clave pública o de servicio.",
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.storage.from(bucket).list("", {
    limit: 200,
  });

  if (error) {
    return {
      photos: [],
      bucket,
      configured: true,
      error: `No he podido leer el bucket "${bucket}": ${error.message}`,
    };
  }

  const photos = [...(data ?? [])]
    .filter((file) => IMAGE_FILE_PATTERN.test(file.name))
    .sort((left, right) => {
      const leftDate = left.created_at ? Date.parse(left.created_at) : 0;
      const rightDate = right.created_at ? Date.parse(right.created_at) : 0;

      if (leftDate !== rightDate) {
        return rightDate - leftDate;
      }

      return right.name.localeCompare(left.name, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    })
    .map((file) => ({
      id: file.id ?? file.name,
      name: file.name,
      src: supabase.storage.from(bucket).getPublicUrl(file.name).data.publicUrl,
      createdAt: file.created_at ?? null,
    }));

  return {
    photos,
    bucket,
    configured: true,
    error: null,
  };
}
