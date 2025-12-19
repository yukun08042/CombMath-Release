import { Link } from 'react-router-dom';
import classes from './Navbar.module.css';
import { useLocation } from 'react-router-dom';

import { NavItem } from '@/lib/definitions';

export function Navbar(param : { data: NavItem[], clickHandler: (label: string) => void }) {
  const location = useLocation();

  const links = param.data.map((item) => (
    <Link
      className={classes.link}
      data-active={location.pathname === item.link || undefined}
      to={item.link}
      key={item.label}
      onClick={() => {
        param.clickHandler(item.label);
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Link>
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        {links}
      </div>
    </nav>
  );
}
