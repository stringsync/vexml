import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <div>count: {count}</div>
      <button className="btn btn-primary" onClick={() => setCount(count + 1)}>
        increment
      </button>
    </div>
  );
}

export default App;
