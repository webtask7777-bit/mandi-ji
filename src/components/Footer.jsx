import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import Brand from './Brand';

export default function Footer() {
  return (
    <footer className="sb-footer">
      <div className="sb-footer-main">
        <div className="sb-footer-identity">
          <Link to="/" aria-label="सही भाव होम" className="sb-footer-brand"><Brand /></Link>
          <p>फसल आपकी। फैसला आपका।<br />मंडी की जानकारी, एक जगह।</p>
        </div>
        <nav aria-label="सहायता और जानकारी" className="sb-footer-links">
          <FooterLink to="/about">हमारे बारे में</FooterLink>
          <FooterLink to="/contact">संपर्क करें</FooterLink>
          <FooterLink to="/blog">खेती की जानकारी</FooterLink>
          <FooterLink to="/pricing">Pro प्लान <ArrowUpRight size={13} aria-hidden="true" /></FooterLink>
          <FooterLink to="/privacy">गोपनीयता नीति</FooterLink>
          <FooterLink to="/terms">नियम और शर्तें</FooterLink>
        </nav>
      </div>
      <div className="sb-footer-bottom">
        <span>© {new Date().getFullYear()} SahiBhav · सही भाव</span>
        <span>डेटा स्रोत: data.gov.in · agriportal.cg.nic.in</span>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }) {
  return <Link to={to}>{children}</Link>;
}
