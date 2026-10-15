import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Truck } from 'lucide-react';
import DeliveryCalculatorTab from '../tabs/DeliveryCalculatorTab';
import SEO from '../components/SEO';
import Brand from '../components/Brand';
import Footer from '../components/Footer';
import '../styles/dashboard.css';

export default function TransportPage() {
  const location = useLocation();
  const [scenario, setScenario] = useState(location.state?.deliveryScenario || null);
  return (
    <div className="sb-dashboard sb-delivery-page">
      <SEO title="डिलीवरी कैलकुलेटर — वाहन, दूरी और माल की कुल लागत" description="मंडी से माल लाने का हिसाब लगाएँ। वाहन की क्षमता, दूरी, भाड़ा, पैकिंग और वजन की कमी जोड़कर प्रति किलो लागत व स्थानीय खरीद से बचत देखें।" path="/delivery-calculator" />
      <a href="#delivery-main" className="sb-skip-link">कैलकुलेटर पर जाएँ</a>
      <header className="sb-header sb-calculator-header">
        <Link to="/" aria-label="सही भाव होम"><Brand /></Link>
        <Link to="/" className="sb-text-button"><ArrowLeft size={17} aria-hidden="true" /> मंडी भाव देखें</Link>
      </header>
      <main id="delivery-main" className="sb-main">
        <div className="sb-calculator-page-heading"><span className="sb-eyebrow"><Truck size={16} aria-hidden="true" />सही भाव · काम का हिसाब</span><h1>डिलीवरी कैलकुलेटर</h1></div>
        <DeliveryCalculatorTab initialScenario={scenario} onScenarioConsumed={() => setScenario(null)} />
        <Footer />
      </main>
    </div>
  );
}
