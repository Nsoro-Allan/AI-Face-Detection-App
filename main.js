import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import './style.css';

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('startBtn');
const loadingOverlay = document.getElementById('loading');
const ctx = canvas.getContext('2d');

let model = null;
let isRunning = false;

// Load the BlazeFace model
async function loadModel() {
  model = await blazeface.load();
  loadingOverlay.style.display = 'none';
}

// Start the webcam
async function setupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });
    video.srcObject = stream;
    video.style.opacity = '1';
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        resolve(video);
      };
    });
  } catch (error) {
    console.error('Error accessing camera:', error);
    alert('Unable to access camera. Please ensure you have granted camera permissions.');
  }
}

// Detect faces in the video stream
async function detectFaces() {
  if (!isRunning) return;
  
  const predictions = await model.estimateFaces(video, false);
  
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw rectangles around detected faces
  predictions.forEach(prediction => {
    const start = prediction.topLeft;
    const end = prediction.bottomRight;
    const size = [end[0] - start[0], end[1] - start[1]];
    
    // Simple rectangle with solid color
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(start[0], start[1], size[0], size[1]);
  });
  
  requestAnimationFrame(detectFaces);
}

// Handle window resize
function handleResize() {
  const container = canvas.parentElement;
  const aspectRatio = 16 / 9;
  
  const newWidth = container.clientWidth;
  const newHeight = newWidth / aspectRatio;
  
  canvas.width = newWidth;
  canvas.height = newHeight;
  video.width = newWidth;
  video.height = newHeight;
}

// Initialize the application
async function init() {
  window.addEventListener('resize', handleResize);
  handleResize();
  
  startBtn.addEventListener('click', async () => {
    if (!model) {
      loadingOverlay.style.display = 'flex';
      await loadModel();
    }
    
    if (!isRunning) {
      await setupCamera();
      isRunning = true;
      startBtn.textContent = 'Stop Camera';
      startBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
      startBtn.classList.add('bg-red-600', 'hover:bg-red-700');
      detectFaces();
    } else {
      isRunning = false;
      video.style.opacity = '0';
      video.srcObject.getTracks().forEach(track => track.stop());
      startBtn.textContent = 'Start Camera';
      startBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
      startBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });
}

init();