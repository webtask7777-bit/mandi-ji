import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Calculator } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { getCropTopic } from '../../shared/cropTopics.js';
import EditorialImage from './EditorialImage';
import '../styles/crop-guides.css';

export default function CropGuides({ cropId, cropName, stateId = 'all' }) {
  const topic = getCropTopic(cropId);
  const query = new URLSearchParams({ crop: topic?.id || '', state: stateId, language: 'hi', limit: '3' });
  const { data, loading, error } = useApi(topic ? `/cms/blog?${query}` : null);
  const posts = data?.posts || [];
  const libraryQuery = new URLSearchParams({ ...(topic ? { crop: topic.id } : {}), ...(stateId !== 'all' ? { state: stateId } : {}) });
  const libraryPath = `/blog${libraryQuery.size ? `?${libraryQuery}` : ''}`;
  return <section className="sb-crop-guides" aria-labelledby="crop-guides-title">
    <div className="sb-crop-guides__heading"><div><span><BookOpen size={16} aria-hidden="true" /> भाव के साथ काम की जानकारी</span><h2 id="crop-guides-title">{cropName} की बिक्री और तैयारी</h2></div><Link to={libraryPath}>{posts.length ? 'इस फसल की सभी गाइड' : 'किसान मार्गदर्शिकाएँ'} <ArrowRight size={16} aria-hidden="true" /></Link></div>
    {topic && <p className="sb-crop-guides__context">लेखों का फसल समूह: {topic.nameHi}। किस्म और उत्पाद का रूप अलग हो सकता है; ऊपर के भाव इसी चुनी हुई वस्तु के हैं।</p>}
    {loading && <p role="status">संबंधित गाइड लोड हो रही हैं…</p>}
    {error && <p role="status">संबंधित लेख अभी लोड नहीं हुए। सभी मार्गदर्शिकाएँ खोलकर देखें।</p>}
    <div className="sb-crop-guides__grid">{posts.map(post => <article key={post.slug}>
      <Link to={`/blog/${post.slug}`} className="sb-crop-guides__image" tabIndex={-1} aria-hidden="true"><EditorialImage src={post.coverImage} alt="" width="1672" height="941" loading="lazy" decoding="async" /><span>सांकेतिक चित्र</span></Link>
      <div className="sb-crop-guides__body"><span>{post.regionLabel || 'अपने क्षेत्र के अनुसार पढ़ें'}</span><h3><Link to={`/blog/${post.slug}`}>{post.title}</Link></h3><p>{post.excerpt}</p><Link to={`/blog/${post.slug}`} aria-label={`${post.title} — पढ़ें`}>गाइड पढ़ें <ArrowRight size={16} aria-hidden="true" /></Link></div>
    </article>)}</div>
    {!loading && !error && !posts.length && <p>इस फसल और क्षेत्र के लिए अलग गाइड अभी उपलब्ध नहीं है। बिक्री की तैयारी के लिए मौसम, खरीदार का भाव और ढुलाई खर्च जाँचें।</p>}
    <div className="sb-crop-guides__tools"><Link to="/delivery-calculator"><Calculator size={17} aria-hidden="true" /> वाहन और दूरी से ढुलाई का खर्च</Link><Link to="/bechne-ka-hisab">बेचने के बाद बची रकम का हिसाब <ArrowRight size={16} aria-hidden="true" /></Link></div>
  </section>;
}
