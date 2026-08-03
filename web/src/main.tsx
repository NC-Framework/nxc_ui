import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './tokens.css';
import { App } from './App';
import { Playground } from './Playground';

/**
 * The playground renders only outside the game.
 *
 * `GetParentResourceName` exists exactly when a FiveM client is hosting this, so
 * its absence is the reliable signal for a browser. Shipping the playground
 * behind a flag someone could set would put a debug surface in production, which
 * MDD v0.4 38.8 forbids.
 */
const inGame = typeof window.GetParentResourceName === 'function';

const root = document.getElementById('nxc-root');
if (root) {
  createRoot(root).render(
    <StrictMode>{inGame ? <App /> : <Playground />}</StrictMode>,
  );
}
