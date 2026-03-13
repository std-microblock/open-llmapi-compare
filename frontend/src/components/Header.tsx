import { Link } from 'react-router-dom';
import { RiMoonLine, RiSunLine } from 'react-icons/ri';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__brand">
          <div className="header__logo">C</div>
          <div>
            <div className="header__title">LLM API Compare</div>
            <div className="header__subtitle">开源大模型 API 比价</div>
          </div>
        </Link>
        <div className="header__actions">
          <button
            className="icon-btn"
            onClick={onToggleTheme}
            title={theme === 'light' ? '切换深色模式' : '切换浅色模式'}
          >
            {theme === 'light' ? <RiMoonLine /> : <RiSunLine />}
          </button>
        </div>
      </div>
    </header>
  );
}
