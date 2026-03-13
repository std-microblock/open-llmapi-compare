import { createOneApiProvider } from './oneapi';

const terminalPubProvider = createOneApiProvider({
  id: 'terminal-pub',
  name: 'Terminal.pub',
  url: 'https://terminal.pub',
  apiUrl: 'https://terminal.pub/api/pricing',
});

export default terminalPubProvider;
