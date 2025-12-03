import { ref } from 'vue'
import imageCompression from 'browser-image-compression'

export interface CompressionOptions {
  maxSizeMB: number
  maxWidthOrHeight?: number
  useWebWorker?: boolean
  maxIteration?: number
  exifOrientation?: number
  fileType?: string
  quality?: number
}

export function useImageCompression() {
  const compressedImage = ref<Blob | null>(null)
  const originalImage = ref<File | null>(null)
  const isCompressing = ref(false)
  const compressionRatio = ref(0)
  const errorMessage = ref('')

  const compressImage = async (file: File, options: CompressionOptions) => {
    try {
      isCompressing.value = true
      errorMessage.value = ''
      
      // 保存原始文件
      originalImage.value = file
      
      // 压缩图片
      const compressedFile = await imageCompression(file, options)
      
      // 计算压缩比
      const originalSize = file.size
      const compressedSize = compressedFile.size
      compressionRatio.value = Number(((originalSize - compressedSize) / originalSize * 100).toFixed(2))
      
      // 保存压缩后的文件
      compressedImage.value = compressedFile
      
      return compressedFile
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '压缩失败'
      throw error
    } finally {
      isCompressing.value = false
    }
  }

  const reset = () => {
    compressedImage.value = null
    originalImage.value = null
    isCompressing.value = false
    compressionRatio.value = 0
    errorMessage.value = ''
  }

  return {
    compressedImage,
    originalImage,
    isCompressing,
    compressionRatio,
    errorMessage,
    compressImage,
    reset
  }
}