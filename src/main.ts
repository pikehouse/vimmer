import './styles/reset.css';
import './styles/main.css';
import './styles/terminal.css';
import './styles/effects.css';
import './styles/screens.css';
import './styles/hud.css';
import './styles/statusbar.css';
import './styles/animations.css';

import { GameManager } from './game/GameManager';

const app = document.getElementById('app');
if (!app) throw new Error('No #app element');

const game = new GameManager(app);
game.start();
