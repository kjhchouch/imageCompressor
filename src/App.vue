<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useImageCompression, type CompressionOptions } from './composables/useImageCompression'

const { 
  compressedImage, 
  originalImage, 
  isCompressing, 
  compressionRatio, 
  errorMessage, 
  compressImage, 
 
} = useImageCompression()

const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string | null>(null)
const compressedPreviewUrl = ref<string | null>(null)
const isDragOver = ref(false)

// 压缩选项
const options = reactive<CompressionOptions>({
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  quality: 0.8
})

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file && file.type.startsWith('image/')) {
    processFile(file)
  } else if (file) {
    alert('请选择一个有效的图片文件')
    // 重置input以确保下次能正常触发change事件
    resetFileInput()
  }
}

// 直接处理文件（用于拖拽和按钮点击）
const processFile = (file: File) => {
  // 清理之前的预览URL
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  if (compressedPreviewUrl.value) {
    URL.revokeObjectURL(compressedPreviewUrl.value)
  }
  
  previewUrl.value = URL.createObjectURL(file)
  
  // 自动压缩图片
  compressImage(file, options)
    .then(() => {
      if (compressedImage.value) {
        compressedPreviewUrl.value = URL.createObjectURL(compressedImage.value)
      }
      // 成功处理后重置input
      resetFileInput()
    })
    .catch(err => {
      console.error('压缩失败:', err)
      // 出错时也重置input
      resetFileInput()
    })
}

// 重置文件输入框
const resetFileInput = () => {
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// 处理拖拽事件
const handleDragEnter = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (file && file.type.startsWith('image/')) {
      processFile(file)
    } else {
      alert('请选择一个有效的图片文件')
    }
  }
}

// 触发文件选择
const triggerFileSelect = () => {
  fileInput.value?.click()
}

// 下载压缩后的图片
const downloadCompressedImage = () => {
  if (!compressedImage.value || !originalImage.value) return
  
  const url = compressedPreviewUrl.value
  if (!url) return
  
  const link = document.createElement('a')
  link.href = url
  link.download = `compressed_${originalImage.value.name}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 组件挂载时添加拖拽事件监听
onMounted(() => {
  document.addEventListener('dragenter', handleDragEnter)
  document.addEventListener('dragleave', handleDragLeave)
  document.addEventListener('dragover', handleDragOver)
  document.addEventListener('drop', handleDrop)
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('dragenter', handleDragEnter)
  document.removeEventListener('dragleave', handleDragLeave)
  document.removeEventListener('dragover', handleDragOver)
  document.removeEventListener('drop', handleDrop)
  
  // 清理创建的URL对象
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  if (compressedPreviewUrl.value) {
    URL.revokeObjectURL(compressedPreviewUrl.value)
  }
})
</script>

<template>
  <div class="container">
    <header>
      <h1>图片压缩工具</h1>
      <p>在线压缩图片，支持JPG、PNG等格式</p>
    </header>

    <main>
      <!-- 上传区域 -->
      <section class="upload-section">
        <div 
          class="upload-area" 
          @dragenter="handleDragEnter"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
          :class="{ disabled: isCompressing, 'drag-over': isDragOver }"
        >
          <div class="upload-icon">{{ isDragOver ? '📁' : '📁' }}</div>
          <p>{{ isDragOver ? '释放鼠标以上传文件' : '拖拽图片到此处' }}</p>
          <p class="hint">支持 JPG、PNG、WEBP 等格式</p>
          <button @click="triggerFileSelect" class="select-btn">选择图片</button>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="handleFileSelect"
            class="file-input"
          />
        </div>
      </section>

      <!-- 压缩选项 -->
      <section class="options-section" v-if="originalImage">
        <h2>压缩选项</h2>
        <div class="option-group">
          <label>最大尺寸 (MB):</label>
          <input 
            type="range" 
            min="0.1" 
            max="10" 
            step="0.1" 
            v-model.number="options.maxSizeMB"
          />
          <span>{{ options.maxSizeMB }} MB</span>
        </div>
        
        <div class="option-group">
          <label>最大宽度/高度:</label>
          <input 
            type="range" 
            min="100" 
            max="4000" 
            step="100" 
            v-model.number="options.maxWidthOrHeight"
          />
          <span>{{ options.maxWidthOrHeight }} px</span>
        </div>
        
        <div class="option-group">
          <label>图片质量:</label>
          <input 
            type="range" 
            min="0.1" 
            max="1" 
            step="0.1" 
            v-model.number="options.quality"
          />
          <span>{{ Math.round((options.quality || 0.8) * 100) }}%</span>
        </div>
        
        <button 
          @click="compressImage(originalImage!, options)" 
          :disabled="isCompressing"
          class="compress-btn"
        >
          {{ isCompressing ? '压缩中...' : '重新压缩' }}
        </button>
      </section>

      <!-- 结果展示 -->
      <section class="result-section" v-if="compressedImage">
        <h2>压缩结果</h2>
        <div class="comparison-container">
          <div class="image-card">
            <h3>原始图片</h3>
            <div class="image-preview">
              <img :src="previewUrl!" alt="原始图片" />
            </div>
            <p class="image-info">
              名称: {{ originalImage?.name }}<br>
              大小: {{ formatFileSize(originalImage?.size || 0) }}
            </p>
          </div>
          
          <div class="image-card">
            <h3>压缩后</h3>
            <div class="image-preview">
              <img :src="compressedPreviewUrl!" alt="压缩后图片" />
            </div>
            <p class="image-info">
              名称: compressed_{{ originalImage?.name }}<br>
              大小: {{ formatFileSize(compressedImage?.size || 0) }}<br>
              压缩率: {{ compressionRatio }}%
            </p>
          </div>
        </div>
        
        <button @click="downloadCompressedImage" class="download-btn">
          下载压缩图片
        </button>
      </section>

      <!-- 错误信息 -->
      <section class="error-section" v-if="errorMessage">
        <div class="error-message">
          {{ errorMessage }}
        </div>
      </section>
    </main>

    <footer>
      <p>© 2025 图片压缩工具 - 安全在线压缩，不上传服务器</p>
    </footer>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  text-align: center;
  margin-bottom: 30px;
}

header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  background: linear-gradient(45deg, #646cff, #535bf2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

header p {
  font-size: 1.1rem;
  color: #666;
}

.upload-section {
  margin-bottom: 30px;
}

.select-btn {
  background: linear-gradient(45deg, #646cff, #535bf2);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.2s;
  margin-top: 15px;
}

.select-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.select-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  background-color: #f9f9f9;
}

.upload-area:hover:not(.disabled) {
  border-color: #646cff;
  background-color: #f0f0ff;
}

.upload-area.drag-over {
  border-color: #646cff;
  background-color: #e0e0ff;
  transform: scale(1.02);
}

.upload-area.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.upload-area p {
  margin: 10px 0;
}

.hint {
  font-size: 0.9rem;
  color: #888;
}

.file-input {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  opacity: 0;
  cursor: pointer;
}

.options-section {
  background: #f5f5f5;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
}

.options-section h2 {
  margin-top: 0;
  color: #333;
}

.option-group {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.option-group label {
  width: 150px;
  font-weight: 500;
}

.option-group input[type="range"] {
  flex: 1;
  margin: 0 15px;
  min-width: 200px;
}

.option-group span {
  width: 80px;
  text-align: right;
  font-weight: 500;
}

.compress-btn {
  background: linear-gradient(45deg, #646cff, #535bf2);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.2s;
  margin-top: 10px;
}

.compress-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.compress-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.result-section {
  margin-bottom: 30px;
}

.result-section h2 {
  text-align: center;
  color: #333;
}

.comparison-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.image-card {
  background: white;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.image-card h3 {
  margin-top: 0;
  text-align: center;
  color: #333;
}

.image-preview {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 8px;
  background: #f0f0f0;
  margin-bottom: 15px;
}

.image-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-info {
  font-size: 0.9rem;
  color: #666;
  line-height: 1.5;
}

.download-btn {
  display: block;
  width: 100%;
  background: linear-gradient(45deg, #42b883, #33a06f);
  color: white;
  border: none;
  padding: 15px;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s;
}

.download-btn:hover {
  transform: translateY(-2px);
}

.error-section {
  margin-bottom: 30px;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #ffcdd2;
}

footer {
  margin-top: auto;
  text-align: center;
  padding: 20px 0;
  color: #888;
  font-size: 0.9rem;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .container {
    padding: 15px;
  }
  
  header h1 {
    font-size: 2rem;
  }
  
  header p {
    font-size: 1rem;
  }
  
  .upload-area {
    padding: 30px 15px;
  }
  
  .upload-icon {
    font-size: 2.5rem;
  }
  
  .comparison-container {
    grid-template-columns: 1fr;
  }
  
  .option-group {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .option-group label {
    width: 100%;
    margin-bottom: 8px;
  }
  
  .option-group input[type="range"] {
    width: 100%;
    margin: 0;
  }
  
  .option-group span {
    width: 100%;
    text-align: left;
    margin-top: 5px;
  }
  
  .image-preview {
    height: 200px;
  }
  
  .compress-btn,
  .download-btn {
    padding: 12px;
    font-size: 1rem;
  }
}

/* 小屏幕设备适配 */
@media (max-width: 480px) {
  .container {
    padding: 10px;
  }
  
  header h1 {
    font-size: 1.8rem;
  }
  
  .upload-area {
    padding: 20px 10px;
  }
  
  .upload-icon {
    font-size: 2rem;
  }
  
  .image-preview {
    height: 150px;
  }
  
  .image-card {
    padding: 10px;
  }
  
  .option-group label {
    font-size: 0.9rem;
  }
}

/* 横屏适配 */
@media (max-width: 768px) and (orientation: landscape) {
  .image-preview {
    height: 150px;
  }
}

/* 大屏设备优化 */
@media (min-width: 1200px) {
  .comparison-container {
    gap: 30px;
  }
  
  .image-preview {
    height: 350px;
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .upload-area {
    border: 2px solid #000;
  }
  
  .compress-btn,
  .download-btn {
    border: 2px solid #000;
  }
}

/* 减少动画偏好支持 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 深色模式优化 */
@media (prefers-color-scheme: dark) {
  .upload-area {
    background-color: #2d2d2d;
    border-color: #555;
  }
  
  .upload-area:hover:not(.disabled) {
    background-color: #333;
  }
  
  .options-section {
    background: #2d2d2d;
  }
  
  .image-card {
    background: #2d2d2d;
  }
  
  .image-preview {
    background: #333;
  }
}
</style>