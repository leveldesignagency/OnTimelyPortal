import React, { useState, useRef } from 'react';

const getGlassStyles = (isDark: boolean) => ({
  background: isDark 
    ? 'rgba(30, 30, 30, 0.92)' 
    : 'rgba(255, 255, 255, 0.92)',
  backdropFilter: 'blur(20px)',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
  borderRadius: '20px',
  boxShadow: isDark 
    ? '0 8px 32px rgba(0,0,0,0.3)' 
    : '0 8px 32px rgba(0,0,0,0.1)',
});

export const LAYOUTS = [
  {
    id: 'grid',
    name: '2x2 Grid',
    slots: [
      { left: 0, top: 0, width: 0.5, height: 0.5 },
      { left: 0.5, top: 0, width: 0.5, height: 0.5 },
      { left: 0, top: 0.5, width: 0.5, height: 0.5 },
      { left: 0.5, top: 0.5, width: 0.5, height: 0.5 },
    ],
    min: 2,
    max: 4,
  },
  {
    id: 'vertical',
    name: 'Vertical',
    slots: [
      { left: 0, top: 0, width: 1, height: 1/3 },
      { left: 0, top: 1/3, width: 1, height: 1/3 },
      { left: 0, top: 2/3, width: 1, height: 1/3 },
    ],
    min: 2,
    max: 3,
  },
  {
    id: 'horizontal',
    name: 'Horizontal',
    slots: [
      { left: 0, top: 0, width: 1/3, height: 1 },
      { left: 1/3, top: 0, width: 1/3, height: 1 },
      { left: 2/3, top: 0, width: 1/3, height: 1 },
    ],
    min: 2,
    max: 3,
  },
  {
    id: 'big-small',
    name: 'Big + Small',
    slots: [
      { left: 0, top: 0, width: 0.6, height: 1 },
      { left: 0.6, top: 0, width: 0.4, height: 0.5 },
      { left: 0.6, top: 0.5, width: 0.4, height: 0.5 },
    ],
    min: 2,
    max: 3,
  },
];

// Helper to render a flat collage preview (for both selection and final preview)
function CollagePreview({ images, layout, size = 160, rounded = true, previewOnly = false, gap = 8, modalBg = '#18191b' }) {
  const slots = layout.slots;
  // Calculate slot positions with gap
  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        background: modalBg,
        borderRadius: rounded ? 16 : 0,
        overflow: 'hidden',
        boxShadow: '0 2px 8px #0001',
        display: 'block',
      }}
    >
      {slots.map((slot, idx) => {
        // Calculate gap offset
        const left = slot.left * size + (slot.left > 0 ? gap / 2 : 0);
        const top = slot.top * size + (slot.top > 0 ? gap / 2 : 0);
        const width = slot.width * size - (slot.left > 0 ? gap / 2 : 0) - (slot.left + slot.width < 1 ? gap / 2 : 0);
        const height = slot.height * size - (slot.top > 0 ? gap / 2 : 0) - (slot.top + slot.height < 1 ? gap / 2 : 0);
        // Only round outer corners
        let borderRadius = '';
        if (rounded) {
          if (slot.left === 0 && slot.top === 0) borderRadius = '16px 0 0 0';
          if (slot.left + slot.width === 1 && slot.top === 0) borderRadius = '0 16px 0 0';
          if (slot.left === 0 && slot.top + slot.height === 1) borderRadius = '0 0 0 16px';
          if (slot.left + slot.width === 1 && slot.top + slot.height === 1) borderRadius = '0 0 16px 0';
        }
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              background: previewOnly ? '#fff' : '#222',
              borderRadius,
              overflow: 'hidden',
              boxSizing: 'border-box',
              border: previewOnly ? '2px solid #e5e5e5' : undefined,
              transition: 'background 0.2s',
            }}
          >
            {!previewOnly && images && images[idx] && (
              <img
                src={images[idx]}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 0,
                  display: 'block',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ImageCollageModal({ open, onClose, onSave, isDark }) {
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedLayout, setSelectedLayout] = useState(LAYOUTS[0].id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  // Handle file upload
  const handleFiles = (files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, 6 - images.length);
    setImages(prev => [...prev, ...arr]);
    arr.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Drag and drop logic
  const handleDragStart = (idx: number) => setDraggedIndex(idx);
  const handleDrop = (idx: number) => {
    if (draggedIndex === null || draggedIndex === idx) return;
    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    const [img] = newImages.splice(draggedIndex, 1);
    const [prev] = newPreviews.splice(draggedIndex, 1);
    newImages.splice(idx, 0, img);
    newPreviews.splice(idx, 0, prev);
    setImages(newImages);
    setImagePreviews(newPreviews);
    setDraggedIndex(null);
  };

  // Remove image
  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  // Step 1: Upload images
  const renderStep1 = () => (
    <div style={{ width: 400, maxWidth: '90vw' }}>
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Upload Images</h2>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={e => {
          e.preventDefault();
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        onDragOver={e => e.preventDefault()}
        style={{
          border: '2px dashed #888',
          borderRadius: 14,
          padding: 32,
          textAlign: 'center',
          color: isDark ? '#aaa' : '#444',
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          cursor: 'pointer',
          marginBottom: 24,
        }}
      >
        {images.length === 0 ? (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
            <div>Click or drag images here to upload (max 6)</div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {imagePreviews.map((src, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => { e.preventDefault(); }}
                onDrop={() => handleDrop(idx)}
                style={{
                  width: 72, height: 72, borderRadius: 10, overflow: 'hidden', position: 'relative', boxShadow: '0 2px 8px #0002', background: '#222', cursor: 'grab', border: draggedIndex === idx ? '2px solid #3b82f6' : '2px solid transparent',
                }}
              >
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={e => { e.stopPropagation(); removeImage(idx); }} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 6, width: 20, height: 20, fontSize: 14, cursor: 'pointer' }}>×</button>
              </div>
            ))}
            {images.length < 6 && (
              <div style={{ width: 72, height: 72, borderRadius: 10, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 32, cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>+</div>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #bbb', background: isDark ? '#222' : '#eee', color: isDark ? '#fff' : '#222', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Cancel</button>
        <button onClick={() => setStep(2)} disabled={images.length === 0} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #bbb', background: isDark ? '#444' : '#f3f4f6', color: isDark ? '#fff' : '#222', fontWeight: 700, fontSize: 15, cursor: images.length === 0 ? 'not-allowed' : 'pointer', opacity: images.length === 0 ? 0.6 : 1 }}>Next</button>
      </div>
    </div>
  );

  // Step 2: Choose layout
  const renderStep2 = () => (
    <div style={{ width: 700, maxWidth: '98vw' }}>
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Choose Collage Layout</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 32,
        justifyItems: 'center',
        marginBottom: 32,
      }}>
        {LAYOUTS.map(layout => (
          <div
            key={layout.id}
            onClick={() => setSelectedLayout(layout.id)}
            style={{
              cursor: 'pointer',
              padding: 8,
              borderRadius: 20,
              border: selectedLayout === layout.id ? '2.5px solid #3b82f6' : '2.5px solid transparent',
              background: selectedLayout === layout.id ? 'rgba(59,130,246,0.08)' : 'rgba(0,0,0,0.03)',
              boxShadow: selectedLayout === layout.id ? '0 2px 8px #3b82f633' : 'none',
              transition: 'all 0.2s',
              width: 180,
              height: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CollagePreview images={[]} layout={layout} size={160} rounded={true} previewOnly={true} gap={8} modalBg={isDark ? '#18191b' : '#f8f9fa'} />
            <div style={{ marginTop: 14, fontWeight: 600, fontSize: 16, color: '#fff', textAlign: 'center' }}>{layout.name}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button onClick={() => setStep(1)} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #bbb', background: isDark ? '#222' : '#eee', color: isDark ? '#fff' : '#222', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Back</button>
        <button onClick={() => setStep(3)} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #bbb', background: isDark ? '#444' : '#f3f4f6', color: isDark ? '#fff' : '#222', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Next</button>
      </div>
    </div>
  );

  // Step 3: Preview
  const renderStep3 = () => (
    <div style={{ width: 850, maxWidth: '98vw' }}>
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Preview Collage</h2>
      <div style={{
        width: 810,
        height: 810,
        background: isDark ? 'rgba(245,245,245,0.06)' : 'rgba(0,0,0,0.02)',
        borderRadius: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        overflow: 'hidden',
        border: 'none',
        boxShadow: '0 2px 16px #0002',
      }}>
        <CollagePreview
          images={imagePreviews}
          layout={LAYOUTS.find(l => l.id === selectedLayout) || LAYOUTS[0]}
          size={810}
          rounded={true}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button onClick={() => setStep(2)} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #bbb', background: isDark ? '#222' : '#eee', color: isDark ? '#fff' : '#222', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Back</button>
        <button
          onClick={() => onSave({ images, imagePreviews, layout: selectedLayout })}
          style={{
            padding: '10px 24px',
            borderRadius: 8,
            border: '1.5px solid #bbb',
            background: '#fff',
            color: '#222',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            boxShadow: '0 1px 4px #0001',
            transition: 'border 0.2s, background 0.2s',
          }}
        >
          Save Collage
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', zIndex: 3000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ ...getGlassStyles(isDark), padding: 32, minWidth: 340, minHeight: 340, maxWidth: '99vw', maxHeight: '99vh', overflow: 'auto' }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
} 