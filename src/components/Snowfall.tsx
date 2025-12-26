import { useEffect, useState } from 'react';

const confettiEmojis = ['🎊', '🎉', '✨', '⭐', '🥂', '🍾', '🎆', '🎇', '💫', '🌟'];

const Confetti = () => {
  const [confetti, setConfetti] = useState<{ id: number; emoji: string }[]>([]);

  useEffect(() => {
    // Create 40 confetti pieces with random emojis
    const pieces = Array.from({ length: 40 }, (_, i) => ({
      id: i + 1,
      emoji: confettiEmojis[Math.floor(Math.random() * confettiEmojis.length)]
    }));
    setConfetti(pieces);
  }, []);

  return (
    <div className="snowfall" aria-hidden="true">
      {confetti.map((piece) => (
        <span key={piece.id} className="confetti">
          {piece.emoji}
        </span>
      ))}
    </div>
  );
};

export default Confetti;
