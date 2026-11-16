import { useEffect, useMemo, useRef } from "react"
import { ImagePlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CAR_IMAGE_ACCEPT,
  MAX_CAR_IMAGES,
  MAX_CAR_IMAGE_BYTES,
  formatFileSize,
  validateCarImageFiles,
} from "./carImages"

type Props = {
  files: File[]
  onChange: (files: File[]) => void
  onError: (message: string) => void
  error?: string
  disabled?: boolean
  /** Photos already on the car when editing; they count toward the 5-image limit. */
  slotsUsed?: number
}

/** Choose up to 5 car photos, with previews and client-side type/size/count checks. */
export default function CarImagePicker({ files, onChange, onError, error, disabled, slotsUsed = 0 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  )

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews])

  function add(selected: FileList | null) {
    const incoming = Array.from(selected ?? [])
    if (incoming.length === 0) return
    const problem = validateCarImageFiles(incoming, slotsUsed + files.length)
    if (problem) {
      onError(problem)
      return
    }
    onError("")
    onChange([...files, ...incoming])
  }

  return (
    <div className="md:col-span-2 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            Photos <span className="font-normal text-muted-foreground">(optional)</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Up to {MAX_CAR_IMAGES} images, {formatFileSize(MAX_CAR_IMAGE_BYTES)} each. JPEG, PNG or WebP.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || slotsUsed + files.length >= MAX_CAR_IMAGES}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
          Choose images
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={CAR_IMAGE_ACCEPT}
          multiple
          className="hidden"
          disabled={disabled}
          aria-label="Choose car images"
          onChange={(event) => {
            add(event.target.files)
            event.target.value = ""
          }}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="Selected photos">
          {previews.map(({ file, url }, index) => (
            <li key={`${file.name}-${file.lastModified}-${index}`} className="relative">
              <img
                src={url}
                alt={file.name}
                className="h-20 w-full rounded-md border object-cover"
              />
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                onClick={() => {
                  onError("")
                  onChange(files.filter((_, i) => i !== index))
                }}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground shadow hover:bg-destructive/90 disabled:opacity-50"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
