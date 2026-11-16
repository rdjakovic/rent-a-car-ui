import { describe, expect, it } from 'vitest'
import { MAX_CAR_IMAGE_BYTES, MAX_CAR_IMAGES, validateCarImageFiles } from '../carImages'

const file = (name: string, type: string, size = 1024) =>
  new File([new Uint8Array(size)], name, { type })

describe('validateCarImageFiles', () => {
  it('accepts up to five JPEG, PNG or WebP images', () => {
    expect(validateCarImageFiles([file('a.jpg', 'image/jpeg'), file('b.png', 'image/png'), file('c.webp', 'image/webp')])).toBeNull()
    expect(validateCarImageFiles([file('e.png', 'image/png')], MAX_CAR_IMAGES - 1)).toBeNull()
  })

  it('stops at five images per car', () => {
    const files = Array.from({ length: MAX_CAR_IMAGES + 1 }, (_, i) => file(`${i}.png`, 'image/png'))

    expect(validateCarImageFiles(files)).toBe(`You can add up to ${MAX_CAR_IMAGES} images per car`)
    expect(validateCarImageFiles([file('last.png', 'image/png')], MAX_CAR_IMAGES)).toBe(
      `You can add up to ${MAX_CAR_IMAGES} images per car`,
    )
  })

  it('rejects other file types, empty files and anything over 5 MB', () => {
    expect(validateCarImageFiles([file('notes.txt', 'text/plain')])).toContain('choose a JPEG, PNG or WebP image')
    expect(validateCarImageFiles([file('empty.png', 'image/png', 0)])).toContain('the file is empty')
    expect(validateCarImageFiles([file('huge.png', 'image/png', MAX_CAR_IMAGE_BYTES + 1)])).toContain('over the 5.0 MB limit')
  })
})
