export const PHOTO_FILTER_OPTIONS = [
  { value: "all", label: "Todos los campos" },
  { value: "id", label: "ID" },
  { value: "bucket", label: "Bucket" },
  { value: "imagen", label: "Imagen" },
  { value: "titulo", label: "Titulo" },
  { value: "personas", label: "Personas" },
  { value: "anio", label: "Anio" },
  { value: "grupo", label: "Grupo" },
  { value: "grupo_id", label: "Grupo ID" },
  { value: "origen", label: "Origen" },
  { value: "descripcion", label: "Descripcion" },
  { value: "fecha", label: "Fecha" },
  { value: "lugar", label: "Lugar" },
  { value: "categoria", label: "Categoria" },
  { value: "concierto_id", label: "Concierto ID" },
  { value: "created_at", label: "Creado" },
  { value: "updated_at", label: "Actualizado" },
] as const;

export type PhotoFilterField = (typeof PHOTO_FILTER_OPTIONS)[number]["value"];

export function normalizePhotoFilterField(
  value: string | null | undefined,
): PhotoFilterField {
  const normalizedValue = value?.trim();

  if (
    normalizedValue &&
    PHOTO_FILTER_OPTIONS.some((option) => option.value === normalizedValue)
  ) {
    return normalizedValue as PhotoFilterField;
  }

  return "all";
}

export function normalizePhotoFilterValue(
  value: string | null | undefined,
) {
  return value?.trim() ?? "";
}

export function hasActivePhotoFilter(value: string) {
  return value.trim().length > 0;
}

export function getPhotoFilterLabel(field: PhotoFilterField) {
  return (
    PHOTO_FILTER_OPTIONS.find((option) => option.value === field)?.label ??
    "Todos los campos"
  );
}
