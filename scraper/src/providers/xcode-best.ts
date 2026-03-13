import { createOneApiProvider } from './oneapi';

const xcodeBestProvider = createOneApiProvider({
  id: 'xcode-best',
  name: 'Xcode.best',
  url: 'https://xcode.best',
  apiUrl: 'https://xcode.best/api/pricing',
});

export default xcodeBestProvider;
