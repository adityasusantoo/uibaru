/**
 * ADITYA .AI — Frontend Application
 */

var CONFIG = {
  API_BASE: window.location.origin,
  POLL_INTERVAL: 10000,
  MAX_IMAGE_SIZE: 20 * 1024 * 1024,
  MAX_VIDEO_SIZE: 115 * 1024 * 1024,
  TOAST_DURATION: 5000,
};

var state = {
  selectedModel: 'kling-v2-standard',
  cfgScale: 0.5,
  imageFile: null,
  videoFile: null,
  isProcessing: false,
  currentTaskId: null,
  pollingTimer: null,
};

var DOM = {
  apiKeyInput: document.getElementById('apiKeyInput'),
  toggleApiKey: document.getElementById('toggleApiKey'),
  apiKeyStatus: document.getElementById('apiKeyStatus'),
  apiKeyStatusText: document.getElementById('apiKeyStatusText'),
  imageDropZone: document.getElementById('imageDropZone'),
  imageInput: document.getElementById('imageInput'),
  imagePreview: document.getElementById('imagePreview'),
  imageThumb: document.getElementById('imageThumb'),
  imagePlaceholder: document.getElementById('imagePlaceholder'),
  imageFileInfo: document.getElementById('imageFileInfo'),
  imageFileName: document.getElementById('imageFileName'),
  imageFileSize: document.getElementById('imageFileSize'),
  removeImage: document.getElementById('removeImage'),
  videoDropZone: document.getElementById('videoDropZone'),
  videoInput: document.getElementById('videoInput'),
  videoPreview: document.getElementById('videoPreview'),
  videoThumb: document.getElementById('videoThumb'),
  videoPlaceholder: document.getElementById('videoPlaceholder'),
  videoFileInfo: document.getElementById('videoFileInfo'),
  videoFileName: document.getElementById('videoFileName'),
  videoFileSize: document.getElementById('videoFileSize'),
  removeVideo: document.getElementById('removeVideo'),
  promptInput: document.getElementById('promptInput'),
  modelSelector: document.getElementById('modelSelector'),
  cfgSlider: document.getElementById('cfgSlider'),
  cfgValue: document.getElementById('cfgValue'),
  generateBtn: document.getElementById('generateBtn'),
  generateBtnText: document.getElementById('generateBtnText'),
  statusCard: document.getElementById('statusCard'),
  statusIcon: document.getElementById('statusIcon'),
  statusTitle: document.getElementById('statusTitle'),
  statusSubtitle: document.getElementById('statusSubtitle'),
  taskIdSection: document.getElementById('taskIdSection'),
  taskIdDisplay: document.getElementById('taskIdDisplay'),
  copyTaskId: document.getElementById('copyTaskId'),
  pollingInfo: document.getElementById('pollingInfo'),
  resultCard: document.getElementById('resultCard'),
  resultVideo: document.getElementById('resultVideo'),
  downloadBtn: document.getElementById('downloadBtn'),
  errorCard: document.getElementById('errorCard'),
  errorMessage: document.getElementById('errorMessage'),
  retryBtn: document.getElementById('retryBtn'),
  emptyState: document.getElementById('emptyState'),
  toastContainer: document.getElementById('toastContainer'),
  apiKeyInvalidCard: document.getElementById('apiKeyInvalidCard'),
  apiKeyLimitCard: document.getElementById('apiKeyLimitCard'),
  fixApiKeyBtn: document.getElementById('fixApiKeyBtn'),
  retryLimitBtn: document.getElementById('retryLimitBtn'),
};

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  var k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showToast(message, type, duration) {
  type = type || 'info';
  duration = duration || CONFIG.TOAST_DURATION;
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  var icons = { success: 'fa-circle-check', error: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  toast.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + ' text-sm mt-0.5"></i><span class="flex-1">' + message + '</span>';
  DOM.toastContainer.appendChild(toast);
  setTimeout(function() { toast.classList.add('removing'); setTimeout(function() { toast.remove(); }, 300); }, duration);
}

function initApiKey() { updateApiKeyStatus(false); }

function updateApiKeyStatus(hasKey) {
  if (hasKey) {
    DOM.apiKeyStatus.className = 'w-2 h-2 rounded-full bg-neon-green';
    DOM.apiKeyStatusText.textContent = 'API Key telah diatur';
    DOM.apiKeyStatusText.className = 'text-xs text-neon-green/60';
  } else {
    DOM.apiKeyStatus.className = 'w-2 h-2 rounded-full bg-gray-700';
    DOM.apiKeyStatusText.textContent = 'Belum diatur';
    DOM.apiKeyStatusText.className = 'text-xs text-gray-600';
  }
}

DOM.toggleApiKey.addEventListener('click', function() {
  var p = DOM.apiKeyInput.type === 'password';
  DOM.apiKeyInput.type = p ? 'text' : 'password';
  DOM.toggleApiKey.querySelector('i').className = p ? 'fa-solid fa-eye-slash text-sm' : 'fa-solid fa-eye text-sm';
});

DOM.apiKeyInput.addEventListener('input', function() { updateApiKeyStatus(!!DOM.apiKeyInput.value.trim()); });

function setupUploadZone(dropZone, fileInput, fileType) {
  var maxSize = fileType === 'image' ? CONFIG.MAX_IMAGE_SIZE : CONFIG.MAX_VIDEO_SIZE;
  dropZone.addEventListener('click', function(e) {
    if (e.target.closest('#removeImage') || e.target.closest('#removeVideo')) return;
    fileInput.click();
  });
  dropZone.addEventListener('dragover', function(e) { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', function(e) { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop', function(e) { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over'); if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0], fileType, maxSize); });
  fileInput.addEventListener('change', function() { if (fileInput.files.length > 0) handleFileSelect(fileInput.files[0], fileType, maxSize); });
}

function handleFileSelect(file, fileType, maxSize) {
  if (file.size > maxSize) { showToast('File terlalu besar! Maks ' + formatFileSize(maxSize), 'error'); return; }
  if (fileType === 'image') {
    if (['image/jpeg','image/png','image/webp','image/gif'].indexOf(file.type) === -1) { showToast('Format image tidak didukung.', 'error'); return; }
    state.imageFile = file; updateImagePreview(file);
  } else {
    if (['video/mp4','video/quicktime','video/webm'].indexOf(file.type) === -1) { showToast('Format video tidak didukung.', 'error'); return; }
    state.videoFile = file; updateVideoPreview(file);
  }
}

function updateImagePreview(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    DOM.imageThumb.src = e.target.result;
    DOM.imagePreview.classList.remove('hidden'); DOM.imagePlaceholder.classList.add('hidden');
    DOM.imageFileInfo.classList.remove('hidden'); DOM.imageFileName.textContent = file.name;
    DOM.imageFileSize.textContent = formatFileSize(file.size); DOM.removeImage.classList.remove('hidden');
    DOM.imageDropZone.classList.add('has-file');
  };
  reader.readAsDataURL(file);
}

function updateVideoPreview(file) {
  DOM.videoThumb.src = URL.createObjectURL(file);
  DOM.videoPreview.classList.remove('hidden'); DOM.videoPlaceholder.classList.add('hidden');
  DOM.videoFileInfo.classList.remove('hidden'); DOM.videoFileName.textContent = file.name;
  DOM.videoFileSize.textContent = formatFileSize(file.size); DOM.removeVideo.classList.remove('hidden');
  DOM.videoDropZone.classList.add('has-file');
}

DOM.removeImage.addEventListener('click', function(e) {
  e.stopPropagation(); state.imageFile = null; DOM.imageInput.value = '';
  DOM.imagePreview.classList.add('hidden'); DOM.imagePlaceholder.classList.remove('hidden');
  DOM.imageFileInfo.classList.add('hidden'); DOM.removeImage.classList.add('hidden');
  DOM.imageDropZone.classList.remove('has-file');
});

DOM.removeVideo.addEventListener('click', function(e) {
  e.stopPropagation(); state.videoFile = null; DOM.videoInput.value = '';
  DOM.videoPreview.classList.add('hidden'); DOM.videoPlaceholder.classList.remove('hidden');
  DOM.videoFileInfo.classList.add('hidden'); DOM.removeVideo.classList.add('hidden');
  DOM.videoDropZone.classList.remove('has-file');
});

setupUploadZone(DOM.imageDropZone, DOM.imageInput, 'image');
setupUploadZone(DOM.videoDropZone, DOM.videoInput, 'video');

DOM.modelSelector.addEventListener('click', function(e) {
  var btn = e.target.closest('.model-btn'); if (!btn) return;
  DOM.modelSelector.querySelectorAll('.model-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active'); state.selectedModel = btn.dataset.model;
});

DOM.cfgSlider.addEventListener('input', function() { state.cfgScale = parseFloat(DOM.cfgSlider.value); DOM.cfgValue.textContent = state.cfgScale.toFixed(2); });

function showCard(el) { el.classList.remove('hidden'); el.classList.add('card-enter'); el.addEventListener('animationend', function() { el.classList.remove('card-enter'); }, { once: true }); }
function hideCard(el) { el.classList.add('hidden'); }

function hideAllResultCards() {
  hideCard(DOM.statusCard); hideCard(DOM.resultCard); hideCard(DOM.errorCard);
  hideCard(DOM.apiKeyInvalidCard); hideCard(DOM.apiKeyLimitCard);
  DOM.statusCard.classList.remove('status-processing-glow');
  DOM.statusTitle.classList.remove('loading-dots', 'loading-pulse');
  DOM.apiKeyInvalidCard.classList.remove('card-error-glow-pink', 'card-shake');
  DOM.apiKeyLimitCard.classList.remove('card-error-glow-amber', 'card-shake');
  var pb = document.getElementById('progressBarContainer'); if (pb) pb.remove();
  var db = document.getElementById('debugCard'); if (db) db.remove();
}

function updateStatusTimeline(status) {
  var n = status, l = status.toLowerCase();
  if (l === 'created' || l === 'queued' || l === 'pending') n = 'queued';
  else if (l === 'processing' || l === 'running' || l === 'in_progress') n = 'processing';
  else if (l === 'completed' || l === 'complete' || l === 'done' || l === 'success' || l === 'finished' || l === 'succeeded' || l === 'ready') n = 'completed';
  else if (l === 'failed' || l === 'error') n = 'failed';
  
  var steps = ['queued', 'processing', 'completed'];
  var colors = { queued: { d: 'bg-amber-400', t: 'text-amber-400' }, processing: { d: 'bg-neon-cyan', t: 'text-neon-cyan' }, completed: { d: 'bg-neon-green', t: 'text-neon-green' }, failed: { d: 'bg-neon-pink', t: 'text-neon-pink' } };
  
  steps.forEach(function(s) { var el = document.getElementById('step-' + s); if (!el) return; el.querySelector('.status-dot').className = 'status-dot bg-gray-700'; el.querySelector('span').className = 'text-sm text-gray-600'; el.querySelector('span').textContent = s.charAt(0).toUpperCase() + s.slice(1); });
  
  if (n === 'failed') { var ps = document.getElementById('step-processing'); if (ps) { ps.querySelector('.status-dot').className = 'status-dot ' + colors.failed.d + ' active'; ps.querySelector('span').className = 'text-sm ' + colors.failed.t; ps.querySelector('span').textContent = 'Failed'; } return; }
  
  var ci = steps.indexOf(n); if (ci === -1) return;
  for (var i = 0; i <= ci; i++) { var el = document.getElementById('step-' + steps[i]); if (!el) continue; var c = colors[steps[i]]; el.querySelector('.status-dot').className = 'status-dot ' + c.d + (i === ci ? ' active pulse' : ''); el.querySelector('span').className = 'text-sm ' + c.t; }
}

async function generateMotion() {
  var apiKey = DOM.apiKeyInput.value.trim();
  if (!apiKey) { showToast('Masukkan API Key Magnific terlebih dahulu.', 'error'); DOM.apiKeyInput.focus(); return; }
  if (!state.imageFile) { showToast('Upload image reference wajib dilakukan.', 'error'); return; }

  state.isProcessing = true; DOM.generateBtn.disabled = true; DOM.generateBtnText.textContent = 'Generating...';
  
  var spinner = document.createElement('span'); 
  spinner.className = 'spinner animate-spin'; 
  DOM.generateBtn.insertBefore(spinner, DOM.generateBtn.firstChild);

  hideAllResultCards(); showCard(DOM.statusCard); DOM.emptyState.style.display = 'none';

  DOM.statusCard.classList.add('status-processing-glow');
  
  DOM.statusIcon.className = 'w-8 h-8 rounded-lg bg-neon-cyan/10 flex items-center justify-center';
  DOM.statusIcon.innerHTML = '<i class="fa-solid fa-circle-notch animate-spin text-neon-cyan text-lg"></i>';
  DOM.statusTitle.textContent = 'Creating Task...'; DOM.statusTitle.classList.add('loading-pulse');
  DOM.statusSubtitle.textContent = 'Mengirim request ke Magnific API...';
  updateStatusTimeline('queued'); hideCard(DOM.taskIdSection); DOM.pollingInfo.style.display = 'none';

  var existingBar = document.getElementById('progressBarContainer'); if (existingBar) existingBar.remove();
  var progressBar = document.createElement('div'); progressBar.id = 'progressBarContainer';
  progressBar.className = 'progress-bar-track';
  progressBar.innerHTML = '<div class="progress-bar-fill" style="width:100%"></div>';
  DOM.statusCard.appendChild(progressBar);
  DOM.statusCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    var formData = new FormData();
    formData.append('image', state.imageFile);
    if (state.videoFile) formData.append('video', state.videoFile);
    if (DOM.promptInput.value.trim()) formData.append('prompt', DOM.promptInput.value.trim());
    formData.append('model', state.selectedModel);
    formData.append('cfg_scale', state.cfgScale.toString());

    var response = await fetch(CONFIG.API_BASE + '/api/generate-motion', { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiKey }, body: formData });
    var data = await response.json();
    if (!response.ok || !data.success) { var err = new Error(data.error || 'Server error: ' + response.status); err.statusCode = data.statusCode || response.status; throw err; }

    var taskId = (data.data && data.data.task_id) || (data.data && data.data.id) || (data.data && data.data.taskId) || (data.data && data.data.data && data.data.data.task_id);
    if (!taskId) throw new Error('Tidak menerima Task ID dari API.');

    state.currentTaskId = taskId; DOM.taskIdDisplay.textContent = taskId;
    showCard(DOM.taskIdSection); DOM.pollingInfo.style.display = 'block';
    showToast('Task berhasil dibuat! Memulai polling...', 'success');

    DOM.statusTitle.textContent = 'Processing'; DOM.statusTitle.classList.remove('loading-pulse');
    DOM.statusTitle.classList.add('loading-dots');
    DOM.statusSubtitle.textContent = 'AI sedang memproses video Anda...';
    DOM.statusIcon.className = 'w-8 h-8 rounded-lg bg-neon-blue/10 flex items-center justify-center';
    
    DOM.statusIcon.innerHTML = '<i class="fa-solid fa-circle-notch animate-spin text-neon-cyan text-lg"></i>';
    updateStatusTimeline('processing');
    startPolling(taskId, apiKey);
  } catch (error) { 
    console.error('Generate Error:', error); 
    handleGenerationError(error.message, error.statusCode); 
  }
}

function startPolling(taskId, apiKey) {
  if (state.pollingTimer) clearInterval(state.pollingTimer);
  checkTaskStatus(taskId, apiKey);
  state.pollingTimer = setInterval(function() { checkTaskStatus(taskId, apiKey); }, CONFIG.POLL_INTERVAL);
}

async function checkTaskStatus(taskId, apiKey) {
  try {
    var response = await fetch(CONFIG.API_BASE + '/api/task-status/' + taskId, { method: 'GET', headers: { 'Authorization': 'Bearer ' + apiKey } });
    var data = await response.json();
    if (!response.ok || !data.success) { var err = new Error(data.error || 'Gagal mengecek status'); err.statusCode = data.statusCode || response.status; throw err; }
    
    var taskData = data.data;
    
    // MENCARI STATUS DI BERBAGAI KEMUNGKINAN NAMA LABEL
    var rawStatus = 
        (taskData && taskData.status) || 
        (taskData && taskData.state) || 
        (taskData && taskData.task_status) || 
        (taskData && taskData.data && taskData.data.status) || 
        'unknown';
        
    var status = rawStatus.toLowerCase();
    
    // MENCETAK DATA UTUH KE CONSOLE UNTUK DEBUG
    console.log('Polling [' + new Date().toLocaleTimeString() + '] Status:', rawStatus);
    console.log('👇 BUKA PANAH DI BAWAH INI UNTUK MELIHAT ISI DATANYA 👇');
    console.log(taskData);
    
    updateStatusTimeline(rawStatus);
    
    if (status === 'created' || status === 'queued' || status === 'pending' || status === 'unknown') { 
        DOM.statusSubtitle.textContent = 'Task dalam antrian, menunggu diproses...'; 
        DOM.statusTitle.textContent = 'Queued'; 
        DOM.statusTitle.classList.add('loading-dots'); 
    }
    else if (status === 'processing' || status === 'running' || status === 'in_progress') { 
        DOM.statusSubtitle.textContent = 'AI sedang menggenerasi video...'; 
        DOM.statusTitle.textContent = 'Processing'; 
        DOM.statusTitle.classList.add('loading-dots'); 
    }
    
    if (status === 'completed' || status === 'complete' || status === 'done' || status === 'success' || status === 'finished' || status === 'succeeded' || status === 'ready') { 
        stopPolling(); 
        handleGenerationComplete(taskData); 
    }
    
    if (status === 'failed' || status === 'error') { 
        stopPolling(); 
        handleGenerationError((taskData && taskData.error) || (taskData && taskData.message) || 'Generasi video gagal.', (taskData && taskData.status_code) || null); 
    }
  } catch (error) { 
      console.error('Polling Error:', error); 
      DOM.statusSubtitle.textContent = 'Koneksi terputus, mencoba ulang...'; 
  }
}

function stopPolling() { if (state.pollingTimer) { clearInterval(state.pollingTimer); state.pollingTimer = null; } DOM.pollingInfo.style.display = 'none'; }

function handleGenerationComplete(taskData) {
  console.log('=== COMPLETED - Full Task Data ==='); console.log(JSON.stringify(taskData, null, 2)); console.log('==================================');

  var videoUrl = null;
  var paths = [
    taskData && taskData.result && taskData.result.video_url, taskData && taskData.result && taskData.result.videoUrl,
    taskData && taskData.result && taskData.result.url, taskData && taskData.result && taskData.result.video,
    taskData && taskData.result && taskData.result.output_url, taskData && taskData.result && taskData.result.download_url,
    taskData && taskData.video_url, taskData && taskData.videoUrl, taskData && taskData.url, taskData && taskData.video,
    taskData && taskData.output_url, taskData && taskData.download_url, taskData && taskData.output,
    taskData && taskData.data && taskData.data.video_url, taskData && taskData.data && taskData.data.videoUrl,
    taskData && taskData.data && taskData.data.url, taskData && taskData.data && taskData.data.output_url,
    taskData && taskData.data && taskData.data.result && taskData.data.result.video_url,
    taskData && taskData.data && taskData.data.result && taskData.data.result.url,
    taskData && taskData.output && taskData.output.video_url, taskData && taskData.output && taskData.output.videoUrl,
    taskData && taskData.output && taskData.output.url, taskData && taskData.output && taskData.output.video,
    taskData && taskData.output && taskData.output.download_url,
    taskData && taskData.generated && taskData.generated[0] && taskData.generated[0].video_url,
    taskData && taskData.generated && taskData.generated[0] && taskData.generated[0].url,
    taskData && taskData.generated && taskData.generated[0] && taskData.generated[0].video,
    taskData && taskData.results && taskData.results[0] && taskData.results[0].video_url,
    taskData && taskData.results && taskData.results[0] && taskData.results[0].url,
  ];
  for (var i = 0; i < paths.length; i++) { if (paths[i] && typeof paths[i] === 'string' && paths[i].indexOf('http') === 0) { videoUrl = paths[i]; console.log('Video URL found at path', i, ':', videoUrl); break; } }

  if (!videoUrl && taskData) {
    var dataStr = JSON.stringify(taskData);
    var mp4Match = dataStr.match(/https?:\/\/[^\s"']+\.mp4[^\s"']*/g);
    if (mp4Match && mp4Match.length > 0) { videoUrl = mp4Match[0]; console.log('MP4 found via deep scan:', videoUrl); }
    if (!videoUrl) { var gMatch = dataStr.match(/https?:\/\/[^\s"']+(?:video|output|result|download|generated)[^\s"']*/gi); if (gMatch && gMatch.length > 0) { videoUrl = gMatch[0]; console.log('URL found via general scan:', videoUrl); } }
  }

  if (videoUrl) { showVideoResult(videoUrl); return; }
  console.warn('Video URL not found! Keys:', Object.keys(taskData || {}));
  showDebugResult(taskData);
}

function showVideoResult(videoUrl) {
  var pb = document.getElementById('progressBarContainer'); if (pb) pb.remove();
  DOM.statusCard.classList.remove('status-processing-glow'); DOM.statusTitle.classList.remove('loading-dots', 'loading-pulse');
  DOM.statusTitle.textContent = 'Completed'; DOM.statusSubtitle.textContent = 'Video berhasil di-generate!';
  DOM.statusIcon.className = 'w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center';
  DOM.statusIcon.innerHTML = '<i class="fa-solid fa-circle-check text-neon-green text-sm"></i>';
  showCard(DOM.resultCard); DOM.resultVideo.src = videoUrl; DOM.downloadBtn.href = videoUrl;
  setTimeout(function() { DOM.resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
  showToast('Video berhasil di-generate!', 'success'); resetProcessingState();
}

function showDebugResult(taskData) {
  var pb = document.getElementById('progressBarContainer'); if (pb) pb.remove();
  DOM.statusCard.classList.remove('status-processing-glow'); DOM.statusTitle.classList.remove('loading-dots', 'loading-pulse');
  DOM.statusTitle.textContent = 'Completed (Debug)'; DOM.statusSubtitle.textContent = 'Video URL tidak ditemukan';
  DOM.statusIcon.className = 'w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center';
  DOM.statusIcon.innerHTML = '<i class="fa-solid fa-bug text-amber-400 text-sm"></i>';

  var existingDebug = document.getElementById('debugCard'); if (existingDebug) existingDebug.remove();
  var debugCard = document.createElement('div'); debugCard.id = 'debugCard';
  debugCard.className = 'glass-card p-6 card-enter'; debugCard.style.borderColor = 'rgba(251,191,36,0.2)';
  var prettyData = JSON.stringify(taskData, null, 2); if (prettyData.length > 2000) prettyData = prettyData.substring(0, 2000) + '\n... (truncated)';
  debugCard.innerHTML = '<div class="flex items-center gap-3 mb-4"><div class="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><i class="fa-solid fa-bug text-amber-400 text-sm"></i></div><h3 class="font-semibold text-white">Debug Info</h3></div><p class="text-sm text-amber-400 mb-3">Task selesai tapi video URL tidak ditemukan. Data mentah dari Magnific API:</p><pre class="bg-cyber-900/80 rounded-xl p-4 text-xs text-gray-300 overflow-x-auto overflow-y-auto max-h-96 whitespace-pre-wrap font-mono border border-amber-500/10">' + prettyData + '</pre><p class="text-xs text-gray-600 mt-3">Copy data di atas dan kirim ke developer agar format video URL bisa disesuaikan.</p><button id="copyDebugBtn" class="mt-3 w-full py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold text-sm hover:bg-amber-500/20 transition-all duration-300 flex items-center justify-center gap-2"><i class="fa-solid fa-copy"></i> Copy Data Mentah</button>';
  DOM.statusCard.parentNode.insertBefore(debugCard, DOM.statusCard.nextSibling);
  setTimeout(function() { debugCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
  document.getElementById('copyDebugBtn').addEventListener('click', function() {
    navigator.clipboard.writeText(JSON.stringify(taskData, null, 2)).then(function() { showToast('Data disalin!', 'success', 2000); }).catch(function() { showToast('Gagal menyalin', 'error'); });
  });
  showToast('Task completed tapi video URL tidak ditemukan. Lihat debug info.', 'error', 8000);
  resetProcessingState();
}

function handleGenerationError(errorMessage, statusCode) {
  stopPolling();
  var pb = document.getElementById('progressBarContainer'); if (pb) pb.remove();
  DOM.statusCard.classList.remove('status-processing-glow'); DOM.statusTitle.classList.remove('loading-dots', 'loading-pulse');
  DOM.apiKeyInvalidCard.classList.remove('card-error-glow-pink', 'card-shake');
  DOM.apiKeyLimitCard.classList.remove('card-error-glow-amber', 'card-shake');

  var cleanMessage = errorMessage || 'Terjadi kesalahan yang tidak diketahui.';
  if (cleanMessage.length > 300) {
    try { var p = JSON.parse(cleanMessage); if (p.detail) { cleanMessage = Array.isArray(p.detail) ? p.detail.map(function(d) { return (d.loc ? d.loc.join(' > ') + ': ' : '') + d.msg; }).join('\n') : String(p.detail); } else if (p.error) { cleanMessage = String(p.error); } else if (p.message) { cleanMessage = String(p.message); } } catch (e) { cleanMessage = cleanMessage.substring(0, 300) + '...'; }
  }

  if (statusCode === 401 || statusCode === 403) {
    updateStatusTimeline('failed'); DOM.statusTitle.textContent = 'API Key Error'; DOM.statusSubtitle.textContent = 'API Key tidak valid';
    DOM.statusIcon.className = 'w-8 h-8 rounded-lg bg-neon-pink/10 flex items-center justify-center';
    DOM.statusIcon.innerHTML = '<i class="fa-solid fa-key text-neon-pink text-sm"></i>';
    showCard(DOM.apiKeyInvalidCard); DOM.apiKeyInvalidCard.classList.add('card-error-glow-pink', 'card-shake');
    var iconEl = DOM.apiKeyInvalidCard.querySelector('.fa-key'); if (iconEl) iconEl.classList.add('icon-bounce');
    setTimeout(function() { DOM.apiKeyInvalidCard.classList.remove('card-shake'); DOM.apiKeyInvalidCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
    showToast('API Key tidak valid atau tidak terdaftar!', 'error', 6000); resetProcessingState(); return;
  }

  if (statusCode === 429) {
    updateStatusTimeline('failed'); DOM.statusTitle.textContent = 'Rate Limited'; DOM.statusSubtitle.textContent = 'Limit API tercapai';
    DOM.statusIcon.className = 'w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center';
    DOM.statusIcon.innerHTML = '<i class="fa-solid fa-gauge-high text-amber-400 text-sm"></i>';
    showCard(DOM.apiKeyLimitCard); DOM.apiKeyLimitCard.classList.add('card-error-glow-amber', 'card-shake');
    var iconEl2 = DOM.apiKeyLimitCard.querySelector('.fa-gauge-high'); if (iconEl2) iconEl2.classList.add('icon-bounce');
    setTimeout(function() { DOM.apiKeyLimitCard.classList.remove('card-shake'); DOM.apiKeyLimitCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
    showToast('Limit API tercapai! Tunggu atau upgrade plan.', 'error', 8000); resetProcessingState(); return;
  }

  updateStatusTimeline('failed'); DOM.statusTitle.textContent = 'Failed'; DOM.statusSubtitle.textContent = 'Generasi gagal';
  DOM.statusIcon.className = 'w-8 h-8 rounded-lg bg-neon-pink/10 flex items-center justify-center';
  DOM.statusIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-neon-pink text-sm"></i>';
  DOM.errorMessage.textContent = cleanMessage; showCard(DOM.errorCard);
  setTimeout(function() { DOM.errorCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
  showToast(cleanMessage.substring(0, 100), 'error', 8000); resetProcessingState();
}

function resetProcessingState() {
  state.isProcessing = false; state.currentTaskId = null;
  DOM.generateBtn.disabled = false; DOM.generateBtnText.textContent = 'Generate Motion';
  var spinner = DOM.generateBtn.querySelector('.spinner'); if (spinner) spinner.remove();
}

DOM.generateBtn.addEventListener('click', generateMotion);

DOM.retryBtn.addEventListener('click', function() {
  hideCard(DOM.errorCard); hideCard(DOM.statusCard); DOM.emptyState.style.display = '';
  showCard(DOM.emptyState); resetProcessingState();
  document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
});

DOM.fixApiKeyBtn.addEventListener('click', function() {
  hideCard(DOM.apiKeyInvalidCard); hideCard(DOM.statusCard); DOM.emptyState.style.display = '';
  showCard(DOM.emptyState); resetProcessingState();
  DOM.apiKeyInput.value = ''; updateApiKeyStatus(false); DOM.apiKeyInput.focus();
  DOM.apiKeyInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  DOM.apiKeyInput.style.borderColor = 'rgba(255,0,110,0.5)'; DOM.apiKeyInput.style.boxShadow = '0 0 20px rgba(255,0,110,0.2)';
  setTimeout(function() { DOM.apiKeyInput.style.borderColor = ''; DOM.apiKeyInput.style.boxShadow = ''; }, 3000);
});

DOM.retryLimitBtn.addEventListener('click', function() {
  hideCard(DOM.apiKeyLimitCard); hideCard(DOM.statusCard); DOM.emptyState.style.display = '';
  showCard(DOM.emptyState); resetProcessingState();
  document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
});

DOM.copyTaskId.addEventListener('click', async function() {
  var taskId = DOM.taskIdDisplay.textContent;
  try { await navigator.clipboard.writeText(taskId); showToast('Task ID disalin!', 'success', 2000); }
  catch (e) { var ta = document.createElement('textarea'); ta.value = taskId; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); showToast('Task ID disalin!', 'success', 2000); }
});

document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (!state.isProcessing) generateMotion(); }
});

function init() {
  initApiKey(); hideCard(DOM.statusCard); hideCard(DOM.resultCard); hideCard(DOM.errorCard);
  hideCard(DOM.apiKeyInvalidCard); hideCard(DOM.apiKeyLimitCard); showCard(DOM.emptyState);
  console.log('%cADITYA .AI — Ready', 'color: #00e5ff; font-size: 16px; font-weight: bold;');
}
init();
