import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import './style.css';
import * as faceapi from '@vladmandic/face-api';

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
  await loadFaceAPIModels();
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
  
  // BlazeFace predictions
  const predictions = await model.estimateFaces(video, false);
  
  // Face-API.js detections
  const detections = await faceapi.detectAllFaces(video, 
    new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceExpressions()
    .withAgeAndGender();

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw detections with age and emotion
  if (detections && detections.length > 0) {
    const displaySize = { width: video.width, height: video.height };
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    
    resizedDetections.forEach(detection => {
      const box = detection.detection.box;
      
      // Draw rectangle
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      
      // Draw age and emotion
      ctx.fillStyle = '#00ff00';
      ctx.font = '16px Arial';
      ctx.fillText(
        `Age: ${Math.round(detection.age)} years`,
        box.x, 
        box.y - 20
      );
      ctx.fillText(
        `Emotion: ${getTopExpression(detection.expressions)}`,
        box.x, 
        box.y - 5
      );
    });
  }
  
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

// At the beginning of the file, where models are loaded
async function loadFaceAPIModels() {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models'),
    faceapi.nets.ageGenderNet.loadFromUri('./models')
  ]);
}

// Add this helper function to get the strongest emotion
function getTopExpression(expressions) {
    return Object.entries(expressions)
        .reduce((prev, current) => 
            prev[1] > current[1] ? prev : current
        )[0]
}

init();