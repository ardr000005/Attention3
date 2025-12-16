import { useEffect, useRef, useState } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export default function HiddenCamera({ onLandmarks, isActive, studentId }) {
  const videoRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  const lastSentRef = useRef(0);
  const [error, setError] = useState(null);

  const SEND_INTERVAL = 120;

  useEffect(() => {
    if (!isActive || !studentId) return;

    const videoElement = videoRef.current;
    if (!videoElement) return;

    const faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults((results) => {
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        return;
      }

      const now = performance.now();
      if (now - lastSentRef.current < SEND_INTERVAL) {
        return;
      }
      lastSentRef.current = now;

      const landmarks = results.multiFaceLandmarks[0].map(lm => ({
        x: lm.x,
        y: lm.y,
        z: lm.z
      }));

      const payload = {
        student_id: studentId,
        ts: Date.now() / 1000,
        image_w: results.image.width,
        image_h: results.image.height,
        landmarks
      };

      if (onLandmarks) {
        onLandmarks(payload);
      }
    });

    faceMeshRef.current = faceMesh;

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        if (faceMeshRef.current && videoElement.readyState === 4) {
          await faceMeshRef.current.send({ image: videoElement });
        }
      },
      width: 640,
      height: 480
    });

    camera.start().catch((err) => {
      console.error('Camera start error:', err);
      setError('Failed to access camera. Please grant camera permissions.');
    });

    cameraRef.current = camera;

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, [isActive, studentId, onLandmarks]);

  return (
    <div>
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        playsInline
      />
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
