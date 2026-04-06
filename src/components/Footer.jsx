import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 px-4 py-6 mt-4">
      {/* Logo */}
      <div className="flex items-center gap-1.5 mb-4">
        <Leaf size={14} className="text-green-500" />
        <span className="text-sm font-extrabold text-foreground">मंडी<span className="text-green-500">जी</span></span>
      </div>

      {/* Links */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-4">
        <FooterLink to="/about">हमारे बारे में</FooterLink>
        <FooterLink to="/contact">संपर्क करें</FooterLink>
        <FooterLink to="/privacy">गोपनीयता नीति</FooterLink>
        <FooterLink to="/terms">नियम और शर्तें</FooterLink>
        <FooterLink to="/pricing">Pro प्लान</FooterLink>
        <FooterLink to="/blog">ब्लॉग</FooterLink>
      </div>

      {/* Copyright */}
      <div className="text-[9px] text-zinc-600 leading-relaxed">
        &copy; {new Date().getFullYear()} MandiJi. सर्वाधिकार सुरक्षित।
        <br />
        डेटा स्रोत: data.gov.in, agriportal.cg.nic.in
      </div>
    </footer>
  );
}

function FooterLink({ to, children }) {
  return (
    <Link to={to} className="text-[11px] text-zinc-400 hover:text-green-500 transition-colors">
      {children}
    </Link>
  );
}
