import { render } from 'preact';
import { App } from './App';
import { extensionTransport } from '../platform/extension/transport';
import { DEFAULT_DISTRICT } from '../config/districts';
import './fonts.css';
import './theme.css';
import './styles.css';

// Entry point for the Chrome extension build. A phone build would pass its own transport.
render(<App transport={extensionTransport} district={DEFAULT_DISTRICT} iconUrl="/icons/icon-48.png" />, document.getElementById('app')!);
