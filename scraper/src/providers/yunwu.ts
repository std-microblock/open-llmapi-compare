import { createOneApiProvider } from './oneapi';

const yunwuProvider = createOneApiProvider({
  id: 'yunwu',
  name: '云雾 (Yunwu)',
  url: 'https://yunwu.ai',
  apiUrl: 'https://yunwu.ai/api/pricing_new',
});

export default yunwuProvider;
