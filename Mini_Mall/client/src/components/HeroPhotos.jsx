import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

const PHOTOS = [
  { file: 'arduino-uno.jpg', name: 'Arduino Uno microcontroller board' },
  { file: 'wifi-router.jpg', name: 'Wi-Fi router' },
  { file: 'hc-sr04.jpg', name: 'Ultrasonic distance sensor' },
  { file: 'l298n.png', name: 'Dual H-bridge motor driver' },
  { file: 'tt-motors.jpg', name: 'Geared DC motors and robot wheels' },
  { file: 'switch-8.jpg', name: 'Eight-port network switch' },
  { file: 'relay-4.jpg', name: 'Four-channel relay module' },
  { file: 'sg90.png', name: 'Micro servo motor' },
];

function shuffledPhotos() {
  const photos = [...PHOTOS];
  for (let index = photos.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [photos[index], photos[other]] = [photos[other], photos[index]];
  }
  return photos;
}

export default function HeroPhotos() {
  const [photos] = useState(shuffledPhotos);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    function updateMotion() { if (preference.matches) setPlaying(false); }
    function updateVisibility() { setVisible(!document.hidden); }
    preference.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      preference.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!playing || !visible) return undefined;
    const timer = window.setTimeout(() => setActiveIndex((current) => (current + 1) % photos.length), 5500);
    return () => window.clearTimeout(timer);
  }, [activeIndex, playing, visible, photos.length]);

  function move(direction) {
    setActiveIndex((current) => (current + direction + photos.length) % photos.length);
  }

  return (
    <div className="hero-photos" role="region" aria-roledescription="carousel" aria-label="Featured component photos">
      {photos.map((photo, index) => (
        <img key={photo.file} src={`/images/photos/${photo.file}`}
          className={`hero-photo${index === activeIndex ? ' hero-photo-active' : ''}`}
          alt={index === activeIndex ? photo.name : ''} aria-hidden={index !== activeIndex}
          width="960" height="720" decoding="async" draggable="false" />
      ))}
      <div className="hero-photo-controls">
        <button type="button" onClick={() => move(-1)} aria-label="Previous component photo" title="Previous component photo"><ChevronLeft size={18} /></button>
        <button type="button" onClick={() => setPlaying(!playing)}
          aria-label={playing ? 'Pause photo animation' : 'Play photo animation'}
          title={playing ? 'Pause photo animation' : 'Play photo animation'}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button type="button" onClick={() => move(1)} aria-label="Next component photo" title="Next component photo"><ChevronRight size={18} /></button>
        <span className="hero-photo-position" aria-live="off">{activeIndex + 1} / {photos.length}</span>
      </div>
    </div>
  );
}
