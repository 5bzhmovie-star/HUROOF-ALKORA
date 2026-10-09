import React from 'react';
import { createRoot } from 'react-dom/client';
import GameApp from './App';
import '../app/globals.css';
createRoot(document.getElementById('root')!).render(<GameApp />);

import {registerGameTools} from './webmcp';
registerGameTools();
