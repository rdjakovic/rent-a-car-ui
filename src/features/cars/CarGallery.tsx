import { useEffect, useState } from "react"
import { Car } from "lucide-react"
import { carImageUrl, type CarImageDto } from "@/lib/api/queries"

/** The car details gallery: one large photo plus thumbnails; a placeholder while there are no photos. */
export default function CarGallery({ images = [], name }: { images?: CarImageDto[]; name: string }) {
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    setSelected(0)
  }, [images])

  if (images.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-gray-100 to-gray-200">
        <Car className="h-24 w-24 text-gray-400" aria-hidden="true" />
      </div>
    )
  }

  const visible = Math.min(selected, images.length - 1)
  const current = images[visible]

  return (
    <div className="space-y-2">
      <img
        src={carImageUrl(current.url)}
        alt={`${name} photo ${visible + 1} of ${images.length}`}
        className="aspect-video w-full rounded-lg bg-muted object-contain"
      />
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Car photos">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-label={`Show photo ${index + 1}`}
              aria-pressed={index === visible}
              onClick={() => setSelected(index)}
              className={`shrink-0 rounded-md border-2 p-0.5 transition-colors ${
                index === visible ? "border-brand-emerald" : "border-transparent hover:border-muted-foreground/40"
              }`}
            >
              <img
                src={carImageUrl(image.url)}
                alt=""
                className="h-16 w-24 rounded object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
