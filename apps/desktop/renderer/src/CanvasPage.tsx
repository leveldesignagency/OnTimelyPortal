import React, { useState, useEffect, useCallback } from 'react';

// --- Types ---
type Card = {
  id: string;
  text: string;
  position: { x: number; y: number };
};

// --- Draggable Card Component ---
const DraggableCard = ({ card, onUpdate, onDelete }: { card: Card; onUpdate: (id: string, newText: string) => void; onDelete: (id: string) => void; }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [text, setText] = useState(card.text);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setOffset({
      x: e.clientX - card.position.x,
      y: e.clientY - card.position.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newPos = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      onUpdate(card.id, text, newPos);
    }
  }, [isDragging, offset.x, offset.y, onUpdate, card.id, text]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: card.position.x,
        top: card.position.y,
        width: '250px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        padding: '12px',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 100 : 1,
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onUpdate(card.id, text, card.position)}
        style={{ width: '100%', border: 'none', resize: 'none', background: 'transparent', outline: 'none', fontSize: '16px', height: '100px' }}
        placeholder="Write something..."
      />
      <button
        onClick={() => onDelete(card.id)}
        style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#000', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '14px' }}
      >
        &times;
      </button>
    </div>
  );
};


// --- Main Canvas Page Component ---
export default function CanvasPage() {
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    const savedCards = localStorage.getItem('canvas_cards');
    if (savedCards) setCards(JSON.parse(savedCards));
  }, []);

  const saveCards = (newCards: Card[]) => {
    setCards(newCards);
    localStorage.setItem('canvas_cards', JSON.stringify(newCards));
  };

  const addCard = () => {
    const newCard: Card = {
      id: `card_${Date.now()}`,
      text: '',
      position: { x: 100, y: 100 },
    };
    saveCards([...cards, newCard]);
  };

  const updateCard = (id: string, newText: string, newPosition: { x: number; y: number }) => {
    const updatedCards = cards.map(card => card.id === id ? { ...card, text: newText, position: newPosition } : card);
    saveCards(updatedCards);
  };

  const deleteCard = (id: string) => {
    saveCards(cards.filter(card => card.id !== id));
  };

  return (
    <div style={{ height: '100%', background: '#f7f8fa', position: 'relative', overflow: 'hidden' }}>
      <div style={{ padding: '24px', position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
        <button onClick={addCard} style={{ background: '#000', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 600 }}>
          + Add Card
        </button>
      </div>
      {cards.map(card => (
        <DraggableCard key={card.id} card={card} onUpdate={updateCard} onDelete={deleteCard} />
      ))}
    </div>
  );
} 