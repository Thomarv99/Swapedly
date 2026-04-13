import { useRoute, useLocation } from "wouter";
import { useEffect } from "react";
import { BLOG_ARTICLES } from "@/lib/blog-articles";
import { ArrowLeft, Clock, Calendar, ChevronRight } from "lucide-react";
import { Helmet } from "react-helmet";

// ─── Chart renderer (uses Chart.js via CDN-style inline canvas) ──────────────
function InlineChart({ type, labels, values, title }: {
  type: string; labels: string; values: string; title?: string;
}) {
  const id = `chart-${Math.random().toString(36).slice(2)}`;
  const labelArr = labels.split(",").map(s => s.trim());
  const valueArr = values.split(",").map(Number);
  const max = Math.max(...valueArr);

  if (type === "bar") {
    return (
      <div className="my-8 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        {title && <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</p>}
        <div className="space-y-3">
          {labelArr.map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-36 shrink-0 text-right">{label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
                  style={{
                    width: `${(valueArr[i] / max) * 100}%`,
                    background: label.toLowerCase().includes("swapedly")
                      ? "linear-gradient(90deg, #5A45FF, #7B68EE)"
                      : "linear-gradient(90deg, #94a3b8, #cbd5e1)",
                  }}
                >
                  <span className="text-[10px] font-bold text-white">{valueArr[i]}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "doughnut") {
    const colors = ["#5A45FF","#FF4D6D","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#06b6d4"];
    const total = valueArr.reduce((a, b) => a + b, 0);
    return (
      <div className="my-8 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        {title && <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</p>}
        <div className="flex flex-wrap gap-3 justify-center">
          {labelArr.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
              <span className="text-xs text-gray-600">{label} — <strong>{Math.round((valueArr[i]/total)*100)}%</strong></span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-2 flex-wrap">
          {labelArr.map((label, i) => (
            <div
              key={i}
              className="px-3 py-1.5 rounded-full text-white text-xs font-semibold"
              style={{ background: colors[i % colors.length], opacity: 0.85 + 0.15 * (valueArr[i]/max) }}
            >
              {label}: {valueArr[i]}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "radar") {
    // Render as a horizontal score card
    return (
      <div className="my-8 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        {title && <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {labelArr.map((label, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <div className="flex justify-center gap-0.5">
                {[1,2,3,4,5].map(star => (
                  <span key={star} className={`text-sm ${star <= Math.round(valueArr[i]/2) ? "text-[#5A45FF]" : "text-gray-200"}`}>●</span>
                ))}
              </div>
              <p className="text-xs font-bold text-gray-700 mt-1">{valueArr[i]}/10</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Article content renderer ─────────────────────────────────────────────────
function ArticleContent({ html }: { html: string }) {
  // Parse chart placeholders and render inline
  const parts: React.ReactNode[] = [];
  const chartRegex = /<div class="chart-placeholder" data-chart="([^"]+)" data-labels="([^"]+)" data-values="([^"]+)"[^>]*(?:data-title="([^"]*)")?[^>]*>\s*<\/div>/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  // Also handle self-closing and variants
  const fullRegex = /<div[^>]+class="chart-placeholder"[^>]*>(.*?)<\/div>/gs;
  const attrRegex = /data-chart="([^"]+)"/;
  const labelsRegex = /data-labels="([^"]+)"/;
  const valuesRegex = /data-values="([^"]+)"/;
  const titleRegex = /data-title="([^"]+)"/;

  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = fullRegex.exec(html)) !== null) {
    const before = html.slice(lastIdx, m.index);
    if (before) parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: before }} />);

    const chartType = (m[0].match(attrRegex) || [])[1];
    const labels = (m[0].match(labelsRegex) || [])[1];
    const values = (m[0].match(valuesRegex) || [])[1];
    const chartTitle = (m[0].match(titleRegex) || [])[1];

    if (chartType && labels && values) {
      parts.push(<InlineChart key={key++} type={chartType} labels={labels} values={values} title={chartTitle} />);
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < html.length) {
    parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: html.slice(lastIdx) }} />);
  }

  return <div className="article-body">{parts}</div>;
}

// ─── Blog Index ────────────────────────────────────────────────────────────────
function BlogIndex() {
  const [, navigate] = useLocation();
  const featured = BLOG_ARTICLES[0];
  const rest = BLOG_ARTICLES.slice(1);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/#/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#5A45FF] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth="2.5">
                <path d="M7 16L3 12l4-4M17 8l4 4-4 4M14 4l-4 16" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-black text-gray-900">Swapedly</span>
            <span className="text-gray-300 mx-1">|</span>
            <span className="text-sm font-medium text-gray-500">Blog</span>
          </a>
          <a href="/#/gift-card" className="text-sm font-semibold text-[#5A45FF] hover:underline">
            Get $40 Free →
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero section */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Marketplace Guides</h1>
          <p className="text-gray-500">Honest comparisons to help you sell smarter — and find out why Swapedly keeps coming out on top.</p>
        </div>

        {/* Featured article */}
        <div
          className="rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all cursor-pointer mb-10 group"
          onClick={() => navigate(`/blog/${featured.slug}`)}
        >
          <div className="grid md:grid-cols-2">
            <div className="h-64 md:h-auto overflow-hidden">
              <img src={featured.heroImage} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-8 flex flex-col justify-center">
              <span className="inline-flex items-center text-[10px] font-bold text-[#5A45FF] uppercase tracking-widest mb-3 bg-[#5A45FF]/10 px-3 py-1 rounded-full w-fit">Featured</span>
              <h2 className="text-xl font-black text-gray-900 mb-3 group-hover:text-[#5A45FF] transition-colors leading-snug">{featured.title}</h2>
              <p className="text-sm text-gray-500 line-clamp-3 mb-4">{featured.metaDescription}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{featured.readTime}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{featured.publishDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Article grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((article) => (
            <div
              key={article.slug}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden"
              onClick={() => navigate(`/blog/${article.slug}`)}
            >
              <div className="h-44 overflow-hidden">
                <img src={article.heroImage} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-2 group-hover:text-[#5A45FF] transition-colors leading-snug line-clamp-2">{article.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{article.metaDescription}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{article.readTime}</span>
                  <span className="flex items-center gap-1 text-[#5A45FF] font-semibold">Read more <ChevronRight className="h-3 w-3" /></span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA banner */}
        <div className="mt-16 rounded-3xl bg-gradient-to-r from-[#5A45FF] to-[#FF4D6D] p-10 text-center text-white">
          <h2 className="text-2xl font-black mb-2">Ready to try the #1 alternative?</h2>
          <p className="text-white/80 mb-6">New users get $40 in Swap Bucks — no credit card needed.</p>
          <a href="/#/gift-card" className="inline-block bg-white text-[#5A45FF] font-bold px-8 py-3 rounded-full hover:bg-gray-50 transition-colors">
            Claim your $40 free →
          </a>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-gray-400 mt-8">
        © 2025 Swapedly · <a href="/#/" className="hover:text-[#5A45FF]">Home</a> · <a href="/#/marketplace" className="hover:text-[#5A45FF]">Marketplace</a>
      </footer>
    </div>
  );
}

// ─── Single Article Page ───────────────────────────────────────────────────────
function BlogArticle({ slug }: { slug: string }) {
  const [, navigate] = useLocation();
  const article = BLOG_ARTICLES.find(a => a.slug === slug);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  if (!article) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-xl font-bold text-gray-900 mb-2">Article not found</p>
        <button onClick={() => navigate("/blog")} className="text-[#5A45FF] hover:underline text-sm">← Back to Blog</button>
      </div>
    </div>
  );

  const related = BLOG_ARTICLES.filter(a => a.slug !== slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Helmet>
        <title>{article.title} | Swapedly Blog</title>
        <meta name="description" content={article.metaDescription} />
      </Helmet>

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/blog")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#5A45FF] transition-colors">
            <ArrowLeft className="h-4 w-4" /> Blog
          </button>
          <a href="/#/gift-card" className="text-sm font-semibold text-[#5A45FF] hover:underline">
            Get $40 Free →
          </a>
        </div>
      </header>

      {/* Hero image */}
      <div className="w-full h-72 md:h-96 overflow-hidden">
        <img src={article.heroImage} alt={article.title} className="w-full h-full object-cover" />
      </div>

      {/* Article */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center gap-4 text-xs text-gray-400 mb-6">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{article.readTime}</span>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{article.publishDate}</span>
        </div>

        <div className="prose-article">
          <ArticleContent html={article.content} />
        </div>

        {/* Related articles */}
        <div className="mt-16 border-t pt-10">
          <h3 className="text-lg font-black text-gray-900 mb-6">More Comparisons</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {related.map(a => (
              <div
                key={a.slug}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-all group"
                onClick={() => navigate(`/blog/${a.slug}`)}
              >
                <img src={a.heroImage} alt={a.title} className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="p-3">
                  <p className="text-xs font-bold text-gray-800 line-clamp-2 group-hover:text-[#5A45FF] transition-colors">{a.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-gray-400 mt-8">
        © 2025 Swapedly · <a href="/#/" className="hover:text-[#5A45FF]">Home</a> · <a href="/#/blog" className="hover:text-[#5A45FF]">Blog</a>
      </footer>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────
export default function BlogPage() {
  const [match, params] = useRoute("/blog/:slug");
  if (match && params?.slug) return <BlogArticle slug={params.slug} />;
  return <BlogIndex />;
}
