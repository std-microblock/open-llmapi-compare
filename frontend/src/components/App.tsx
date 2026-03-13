import { HashRouter, Routes, Route } from 'react-router-dom';
import { usePricingData } from '../hooks';
import { useTheme } from '../hooks';
import Header from './Header';
import Footer from './Footer';
import HomePage from './HomePage';
import ModelDetailPage from './ModelDetailPage';
import '../styles/global.scss';
import '../styles/app.scss';

export default function App() {
  const { data, meta, historyDates, loading, error } = usePricingData();
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <HashRouter>
      <div className="app">
        <Header theme={theme} onToggleTheme={toggleTheme} />
        <Routes>
          <Route
            path="/"
            element={
              <HomePage data={data} meta={meta} loading={loading} error={error} />
            }
          />
          <Route
            path="/model/:modelId"
            element={
              <ModelDetailPage data={data} historyDates={historyDates} loading={loading} error={error} />
            }
          />
        </Routes>
        <Footer meta={meta} />
      </div>
    </HashRouter>
  );
}
