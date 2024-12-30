import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Devnet } from './components/Devnet';
import { init } from './fhevmjs';
import './App.css';
import { Connect } from './components/Connect';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    init()
      .then(() => {
        setIsInitialized(true);
      })
      .catch(() => setIsInitialized(false));
  }, []);

  if (!isInitialized) return null;

  return (
    <BrowserRouter>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/about">About</Link>
          </li>
          <li>
            <Link to="/dashboard">Dashboard</Link>
          </li>
        </ul>
      </nav>

      <Routes>
        <Route
          path="/"
          element={
            <>
              <h1>Confidential ERC20 dApp</h1>
              <Connect>
                {(account, provider) => (
                  <Devnet account={account} provider={provider} />
                )}
              </Connect>
            </>
          }
        />
        <Route path="/about" element={<About />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>

      <p className="read-the-docs">
        <a href="https://docs.zama.ai/fhevm">
          See the documentation for more information
        </a>
      </p>
    </BrowserRouter>
  );
}

// Create new page components
function About() {
  return (
    <div>
      <h1>About Page</h1>
      <p>This is the about page content.</p>
    </div>
  );
}

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome to your dashboard!</p>
    </div>
  );
}

export default App;
