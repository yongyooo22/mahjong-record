import { BarChart3, FileText, Home, UserRound, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import s from './ui.module.css';

const items = [
  { to: '/', label: '홈', icon: Home, end: true },
  { to: '/games', label: '기록', icon: FileText, end: false },
  { to: '/ranking', label: '랭킹', icon: BarChart3, end: false },
  { to: '/me', label: '내 기록', icon: UserRound, end: false },
  { to: '/members', label: '멤버', icon: Users, end: false },
];

export function BottomNav() {
  return (
    <nav className={s.nav} aria-label="주요 메뉴">
      <div className={s.navInner}>
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => [s.navItem, isActive ? s.navItemActive : ''].join(' ')}>
            <Icon size={22} strokeWidth={2.2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
