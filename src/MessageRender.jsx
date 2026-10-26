import { useState } from 'react';
import './MessageRender.css';

/* ---------- 1. Labels for nicer display ---------- */
const CATEGORY_LABELS = {
  headphones: 'Headphones',
  earbuds: 'Earbuds',
  speakers: 'Speakers',
  home_audio: 'Home Audio',
  gaming: 'Gaming',
};

const CATEGORY_ICONS = {
  headphones: '🎧',
  earbuds: '🎵',
  speakers: '🔊',
  home_audio: '📺',
  gaming: '🎮',
};

const SPEC_LABELS = {
  battery_life_hours: 'Battery life',
  battery_life_anc_on_hours: 'Battery (ANC on)',
  quick_charge: 'Quick charge',
  charging_port: 'Charging',
  bluetooth_version: 'Bluetooth',
  connection_types: 'Connections',
  driver_size_mm: 'Drivers',
  output_power_w: 'Output power',
  channels: 'Channels',
  subwoofer: 'Subwoofer',
  ip_rating: 'Water rating',
  weight_kg: 'Weight',
  multipoint: 'Multipoint',
  platforms: 'Platforms',
};

const SPEC_UNITS = {
  battery_life_hours: ' h',
  battery_life_anc_on_hours: ' h',
  driver_size_mm: ' mm',
  output_power_w: ' W',
  weight_kg: ' kg',
};

/* ---------- 2. Small helpers ---------- */
function formatPrice(value) {
  if (value === undefined || value === null) return '';
  return '₹' + Number(value).toLocaleString('en-IN');
}

function formatSpec(key, value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return value + (SPEC_UNITS[key] || '');
}

function cleanText(text) {
  return (text || '')
    .replace(/\s*\[\d+\]\(https?:\/\/[^)]+\)/g, '')
    .replace(/\n*Sources[\s\S]*$/, '')
    .trim();
}

export function stripContext(text) {
  return (text || '').replace(/\s*\[context:[^\]]*\]\s*$/, '');
}

/* ---------- 3. Parser ---------- */
export function parseContent(content) {
  if (typeof content === 'object' && content !== null) content = JSON.stringify(content);

  let raw = (content || '').trim();
  raw = raw.replace(/^'+|'+$/g, '');
  raw = raw.replace(/^```(json)?|```$/g, '').trim();

  try {
    let data = JSON.parse(raw);
    if (data && data.response && data.response.type) data = data.response;

    const fromOptions = (data.options || []).map((o) =>
      typeof o === 'string' ? { label: o, value: o } : o
    );
    const fromActions = (data.actions || []).map((a) => ({ label: a.label, value: a.value }));

    return {
      ...data,
      text: data.text || data.message || '',
      options: [...fromOptions, ...fromActions],
    };
  } catch (error) {
    return { type: 'plain', text: cleanText(content), options: [] };
  }
}

/* ---------- 4. Reusable pieces ---------- */
function OptionButtons({ options, onSelect }) {
  if (!options.length) return null;
  return (
    <div className="options">
      {options.map((o) => (
        <button key={o.label} className="chip" onClick={() => onSelect(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Copy failed', error);
    }
  }

  return (
    <button className="copy-btn" onClick={handleCopy} title={copied ? 'Copied!' : 'Copy'}>
      {copied ? '✓' : '⧉'}
    </button>
  );
}

function JblLink({ product }) {
  if (!product?.product_url) return null;
  return (
    <a className="jbl-link" href={product.product_url} target="_blank" rel="noreferrer">
      View on JBL.com ↗
    </a>
  );
}

function ProductImage({ product, size = 'small' }) {
  if (!product?.image_url) {
    return (
      <div className={`product-img ${size} placeholder`}>
        <span>{CATEGORY_ICONS[product?.category] || '🎧'}</span>
      </div>
    );
  }
  return (
    <div className={`product-img ${size}`}>
      <img
        src={product.image_url}
        alt={product.product_name}
        loading="lazy"
        onError={(e) => {
          e.currentTarget.parentElement.classList.add('placeholder');
          e.currentTarget.remove();
        }}
      />
    </div>
  );
}

function ProductCard({ product, featured }) {
  return (
    <div className={featured ? 'product-card featured' : 'product-card'}>
      <ProductImage product={product} size={featured ? 'medium' : 'small'} />
      <div className="product-info">
        <div className="product-top">
          <h4>{product.product_name}</h4>
          <span className="price">{formatPrice(product.price_inr)}</span>
        </div>
        {product.tagline && <p className="tagline">{product.tagline}</p>}
        {product.highlights && (
          <div className="tags">
            {product.highlights.map((h) => <span key={h} className="tag">{h}</span>)}
          </div>
        )}
        <JblLink product={product} />
      </div>
    </div>
  );
}

function SpecTable({ specs }) {
  return (
    <div className="spec-table">
      {Object.entries(specs || {}).map(([key, value]) => (
        <div key={key} className="spec-row">
          <span className="spec-label">{SPEC_LABELS[key] || key}</span>
          <span className="spec-value">{formatSpec(key, value)}</span>
        </div>
      ))}
    </div>
  );
}

function ComparisonTable({ products }) {
  const specKeys = [...new Set(products.flatMap((p) => Object.keys(p.specs || {})))];
  const rows = [
    { label: 'Price', values: products.map((p) => formatPrice(p.price_inr)) },
    { label: 'Noise cancelling', values: products.map((p) => (p.anc === undefined ? '—' : p.anc ? 'Yes' : 'No')) },
    ...specKeys.map((key) => ({
      label: SPEC_LABELS[key] || key,
      values: products.map((p) => (p.specs?.[key] === undefined ? '—' : formatSpec(key, p.specs[key]))),
    })),
  ];

  return (
    <div className="compare-wrap">
      <table className="compare-table">
        <thead>
          <tr>
            <th className="corner"></th>
            {products.map((p) => (
              <th key={p.product_id}>
                <div className="compare-head">
                  <ProductImage product={p} size="tiny" />
                  <span>{p.product_name.replace('JBL ', '')}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="row-label">{row.label}</td>
              {row.values.map((v, i) => <td key={i}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- 5. The main component ---------- */
export default function MessageRender({ message, isLatest, onSelect }) {
  if (message.role === 'user') {
    const clean = stripContext(message.content);
    const label = CATEGORY_LABELS[clean] || clean;
    return (
      <div className="user-row">
        <CopyButton text={label} />
        <div className="bubble user">{label}</div>
      </div>
    );
  }

  if (message.role === 'system') {
    return <div className="system-note">{message.content}</div>;
  }

  const ui = parseContent(message.content);
  const buttons = isLatest ? ui.options : [];

  switch (ui.type) {
    case 'category_list':
      return (
        <div className="bubble assistant">
          <p className="bubble-text">{ui.text}</p>
          {isLatest && (
            <div className="category-grid">
              {(ui.category_list || []).map((cat) => (
                <button key={cat} className="category-tile" onClick={() => onSelect(cat)}>
                  <span className="category-icon">{CATEGORY_ICONS[cat]}</span>
                  {CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>
          )}
        </div>
      );

    case 'product_list':
      return (
        <div className="bubble assistant">
          <p className="bubble-text">{ui.text}</p>
          {isLatest && (
            <div className="options">
              {(ui.products || []).map((name) => (
                <button key={name} className="chip" onClick={() => onSelect(name)}>
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      );

    case 'spec_card': {
      const p = ui.product || {};
      return (
        <div className="bubble assistant wide">
          <p className="bubble-text">{ui.text}</p>
          <div className="spec-card">
            <ProductImage product={p} size="large" />
            <div className="spec-head">
              <div>
                <h3>{p.product_name}</h3>
                {p.tagline && <p className="tagline">{p.tagline}</p>}
              </div>
              <span className="price big">{formatPrice(p.price_inr)}</span>
            </div>
            {p.highlights && (
              <div className="tags">
                {p.highlights.map((h) => <span key={h} className="tag">{h}</span>)}
              </div>
            )}
            <SpecTable specs={p.specs} />
            {p.features && (
              <ul className="feature-list">
                {p.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
            )}
            <JblLink product={p} />
          </div>
          <OptionButtons options={buttons} onSelect={onSelect} />
        </div>
      );
    }

    case 'troubleshoot_steps':
      return (
        <div className="bubble assistant wide">
          {ui.product && <span className="product-pill">🛠 {ui.product}</span>}
          <p className="bubble-text">{ui.text}</p>
          <ol className="steps">
            {(ui.steps || []).map((step, i) => (
              <li key={i}>
                <span className="step-num">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {ui.question && <p className="question">{ui.question}</p>}
          <OptionButtons options={buttons} onSelect={onSelect} />
          {ui.sources?.length > 0 && (
            <div className="sources">
              {ui.sources.map((s) => (
                <a key={s.url || s.label} href={s.url} target="_blank" rel="noreferrer">📄 {s.label}</a>
              ))}
            </div>
          )}
        </div>
      );

    case 'recommendation': {
      const products = ui.products || [];
      const names = products.map((p) => p.product_name);

      let compareRequest = '';
      if (names.length === 2) {
        compareRequest = `Compare ${names[0]} and ${names[1]}`;
      } else if (names.length > 2) {
        compareRequest = `Compare ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
      }

      return (
        <div className="bubble assistant wide">
          <p className="bubble-text">{ui.text}</p>
          <div className="product-list">
            {products.map((p, i) => (
              <div key={p.product_id} className={i === 0 ? 'top-pick' : ''}>
                {i === 0 && <span className="top-label">★ Top pick</span>}
                <ProductCard product={p} featured={i === 0} />
              </div>
            ))}
          </div>
          {isLatest && compareRequest && (
            <div className="options">
              <button className="chip compare-chip" onClick={() => onSelect(compareRequest)}>
                ⇄ Compare these
              </button>
            </div>
          )}
        </div>
      );
    }

    case 'comparison':
      return (
        <div className="bubble assistant wide">
          <p className="bubble-text">{ui.text}</p>
          <ComparisonTable products={ui.products || []} />
          {ui.explanation && <p className="explanation">{ui.explanation}</p>}
          <OptionButtons options={buttons} onSelect={onSelect} />
        </div>
      );

    case 'error':
    case 'non_jbl':
    case 'not_found':
    case 'no_results':
      return (
        <div className="bubble assistant notice">
          <p className="bubble-text">{ui.text}</p>
          <OptionButtons options={buttons} onSelect={onSelect} />
        </div>
      );

    default:
      return (
        <div className="bubble assistant">
          <p className="bubble-text">{ui.text}</p>
          <OptionButtons options={buttons} onSelect={onSelect} />
        </div>
      );
  }
}