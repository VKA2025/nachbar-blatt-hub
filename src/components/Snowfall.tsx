import { useEffect, useState } from 'react';

const Snowfall = () => {
  const [snowflakes, setSnowflakes] = useState<number[]>([]);

  useEffect(() => {
    // Create 30 snowflakes
    setSnowflakes(Array.from({ length: 30 }, (_, i) => i + 1));
  }, []);

  return (
    <div className="snowfall" aria-hidden="true">
      {snowflakes.map((i) => (
        <span key={i} className="snowflake">
          ❄
        </span>
      ))}
    </div>
  );
};

export default Snowfall;
