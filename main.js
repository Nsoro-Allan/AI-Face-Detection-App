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
  const aspectRatio = window.innerWidth < 768 ? 4/3 : 16/9;
  
  // Make the width larger but still responsive
  const containerWidth = container.clientWidth;
  const newWidth = Math.min(containerWidth * (window.innerWidth < 768 ? 0.95 : 0.85), 1440);
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
      startBtn.style.backgroundColor = '#dc2626'; // red-600
      startBtn.style.borderColor = '#dc2626';
      detectFaces();
    } else {
      isRunning = false;
      video.style.opacity = '0';
      video.srcObject.getTracks().forEach(track => track.stop());
      startBtn.textContent = 'Start Camera';
      startBtn.style.backgroundColor = '#2563eb'; // blue-600
      startBtn.style.borderColor = '#2563eb';
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