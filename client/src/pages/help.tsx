import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { HELP_KB } from "@/lib/help-kb";
import {
  Search, ChevronRight, ArrowLeft, Play, MessageCircle,
  X, Send, Loader2, ThumbsUp, ThumbsDown, ExternalLink,
  BookOpen, HelpCircle,
} from "lucide-react";

// ─── Video slug map ────────────────────────────────────────────────────────
const VIDEO_MAP: Record<string, string> = {
  "create-account":    "/help-videos/create-account.mp4",
  "create-listing":    "/help-videos/create-listing.mp4",
  "buy-item":          "/help-videos/buy-item.mp4",
  "redeem-gift-card":  "/help-videos/redeem-gift-card.mp4",
  "shipping-and-pickup": "/help-videos/shipping-and-pickup.mp4",
};

// ─── Shared header ─────────────────────────────────────────────────────────
function HelpHeader({ showBack = false }: { showBack?: boolean }) {
  const [, navigate] = useLocation();
  return (
    <header className="bg-white border-b sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button onClick={() => navigate("/help")} className="text-sm text-gray-500 hover:text-[#5A45FF] flex items-center gap-1 mr-2">
              <ArrowLeft className="h-4 w-4" /> Help
            </button>
          )}
          <a href="/#/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#5A45FF] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth="2.5">
                <path d="M7 16L3 12l4-4M17 8l4 4-4 4M14 4l-4 16" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-black text-gray-900">Swapedly</span>
            <span className="text-gray-300 mx-1">|</span>
            <span className="text-sm font-medium text-gray-500">Help Center</span>
          </a>
        </div>
        <a href="/#/gift-card" className="text-sm font-semibold text-[#5A45FF] hover:underline hidden sm:block">
          Get $40 Free →
        </a>
      </div>
    </header>
  );
}

// ─── Search ────────────────────────────────────────────────────────────────
function HelpSearch({ onSelect }: { onSelect: (slug: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ title: string; slug: string; cluster: string; summary: string }>>([]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const hits: typeof results = [];
    for (const cluster of HELP_KB) {
      for (const article of cluster.articles) {
        if (
          article.title.toLowerCase().includes(q) ||
          article.summary.toLowerCase().includes(q) ||
          article.content.toLowerCase().includes(q)
        ) {
          hits.push({ title: article.title, slug: article.slug, cluster: cluster.title, summary: article.summary });
          if (hits.length >= 6) break;
        }
      }
      if (hits.length >= 6) break;
    }
    setResults(hits);
  }, [query]);

  return (
    <div className="relative max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for help…"
          className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-white/30 bg-white/20 backdrop-blur text-white placeholder-white/60 focus:outline-none focus:border-white/60 text-lg"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-white/60" />
          </button>
        )}
      </div>
      {results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 z-30 overflow-hidden">
          {results.map(r => (
            <button
              key={r.slug}
              onClick={() => { onSelect(r.slug); setQuery(""); }}
              className="w-full px-5 py-3.5 text-left hover:bg-gray-50 flex items-start gap-3 border-b last:border-0"
            >
              <BookOpen className="h-4 w-4 text-[#5A45FF] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                <p className="text-xs text-gray-500">{r.cluster} · {r.summary}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Article content renderer ──────────────────────────────────────────────
function ArticleBody({ html }: { html: string }) {
  return (
    <div
      className="help-article-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── Chatbot ───────────────────────────────────────────────────────────────
type Message = { role: "user" | "bot"; text: string; articleSlug?: string; articleTitle?: string };

function Chatbot({ onNavigate }: { onNavigate: (slug: string) => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Hi! I'm the Swapedly help assistant. Ask me anything about buying, selling, Swap Bucks, or your account. 👋" }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/help/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMessages(m => [...m, {
        role: "bot",
        text: data.answer,
        articleSlug: data.articleSlug,
        articleTitle: data.articleTitle,
      }]);
    } catch {
      setMessages(m => [...m, { role: "bot", text: "Sorry, I had trouble answering that. Try searching the help center above." }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[#5A45FF] text-white shadow-lg hover:bg-[#4a38e0] transition-all hover:scale-105 flex items-center justify-center"
        data-testid="chatbot-toggle"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden" style={{ maxHeight: "520px" }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#5A45FF] to-[#7B68EE] px-5 py-4">
            <p className="font-bold text-white text-sm">Swapedly Help</p>
            <p className="text-white/70 text-xs">Usually replies instantly</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "340px" }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-[#5A45FF] text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}>
                  <p className="leading-relaxed">{m.text}</p>
                  {m.articleSlug && (
                    <button
                      onClick={() => { onNavigate(m.articleSlug!); setOpen(false); }}
                      className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#5A45FF] hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Read: {m.articleTitle}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask a question…"
              className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#5A45FF]"
              data-testid="chatbot-input"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="h-10 w-10 rounded-xl bg-[#5A45FF] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#4a38e0] transition-colors"
              data-testid="chatbot-send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Help Index ────────────────────────────────────────────────────────────
function HelpIndex() {
  const [, navigate] = useLocation();
  const popularSlugs = ["create-account", "redeem-gift-card", "buy-item", "create-listing", "shipping-and-pickup", "what-is-sb"];

  const popular = popularSlugs.flatMap(slug => {
    for (const cluster of HELP_KB) {
      const a = cluster.articles.find((art: any) => art.slug === slug);
      if (a) return [{ ...a, clusterTitle: cluster.title }];
    }
    return [];
  });

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <HelpHeader />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#5A45FF] to-[#7B68EE] pt-14 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white" style={{
              width: `${80 + i * 40}px`, height: `${80 + i * 40}px`,
              top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
              opacity: 0.3
            }} />
          ))}
        </div>
        <div className="relative max-w-6xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">How can we help?</h1>
          <p className="text-white/70 mb-8">Search our guides or browse by topic below.</p>
          <HelpSearch onSelect={slug => navigate(`/help/${slug}`)} />
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6">

        {/* Popular articles */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Popular Articles</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {popular.map(a => (
              <button
                key={a.slug}
                onClick={() => navigate(`/help/${a.slug}`)}
                className="flex items-center gap-3 text-left p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <BookOpen className="h-4 w-4 text-[#5A45FF] shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-[#5A45FF]">{a.title}</p>
                  <p className="text-xs text-gray-400">{a.clusterTitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Clusters grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {HELP_KB.map((cluster: any) => (
            <div key={cluster.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">
              <div className="text-3xl mb-3">{cluster.emoji}</div>
              <h3 className="font-black text-gray-900 mb-1">{cluster.title}</h3>
              <p className="text-xs text-gray-500 mb-4">{cluster.description}</p>
              <ul className="space-y-1.5">
                {cluster.articles.slice(0, 4).map((a: any) => (
                  <li key={a.slug}>
                    <button
                      onClick={() => navigate(`/help/${a.slug}`)}
                      className="text-sm text-[#5A45FF] hover:underline text-left flex items-center gap-1"
                    >
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      {a.title}
                    </button>
                  </li>
                ))}
                {cluster.articles.length > 4 && (
                  <li className="text-xs text-gray-400 pl-4">+{cluster.articles.length - 4} more</li>
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-3xl bg-gradient-to-r from-[#5A45FF] to-[#FF4D6D] p-10 text-center text-white mb-12">
          <h2 className="text-xl font-black mb-2">Still have questions?</h2>
          <p className="text-white/80 mb-5 text-sm">Use the chat bubble in the corner — our help assistant answers instantly.</p>
          <a href="/#/gift-card" className="inline-block bg-white text-[#5A45FF] font-bold px-6 py-2.5 rounded-full text-sm hover:bg-gray-50 transition-colors">
            Get started with $40 free →
          </a>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-gray-400">
        © 2025 Swapedly · <a href="/#/" className="hover:text-[#5A45FF]">Home</a> · <a href="/#/blog" className="hover:text-[#5A45FF]">Blog</a> · <a href="/#/marketplace" className="hover:text-[#5A45FF]">Marketplace</a>
      </footer>

      <Chatbot onNavigate={slug => navigate(`/help/${slug}`)} />
    </div>
  );
}

// ─── Single Article ────────────────────────────────────────────────────────
function HelpArticle({ slug }: { slug: string }) {
  const [, navigate] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  let article: any = null;
  let cluster: any = null;
  for (const c of HELP_KB) {
    const a = c.articles.find((art: any) => art.slug === slug);
    if (a) { article = a; cluster = c; break; }
  }

  if (!article) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <HelpCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="font-bold text-gray-700 mb-2">Article not found</p>
        <button onClick={() => navigate("/help")} className="text-[#5A45FF] text-sm hover:underline">← Back to Help</button>
      </div>
    </div>
  );

  const videoSrc = VIDEO_MAP[article.slug];
  const relatedArticles = cluster.articles.filter((a: any) => a.slug !== slug).slice(0, 4);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <HelpHeader showBack />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
              <button onClick={() => navigate("/help")} className="hover:text-[#5A45FF]">Help</button>
              <ChevronRight className="h-3 w-3" />
              <span className="text-gray-600">{cluster.title}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-gray-800 font-medium">{article.title}</span>
            </div>

            <h1 className="text-2xl font-black text-gray-900 mb-2">{article.title}</h1>
            <p className="text-gray-500 text-sm mb-6">{article.summary}</p>

            {/* Video */}
            {videoSrc ? (
              <div className="rounded-2xl overflow-hidden bg-black mb-8 shadow-md">
                <video controls className="w-full" poster="">
                  <source src={videoSrc} type="video/mp4" />
                </video>
                <div className="bg-gray-900 px-4 py-2 flex items-center gap-2">
                  <Play className="h-3 w-3 text-white/50" />
                  <span className="text-xs text-white/50">Video walkthrough</span>
                </div>
              </div>
            ) : article.videoPlaceholder && (
              <div className="rounded-2xl bg-gray-100 border-2 border-dashed border-gray-200 p-10 text-center mb-8">
                <Play className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400 font-medium">Video walkthrough coming soon</p>
              </div>
            )}

            {/* Article body */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mb-8">
              <ArticleBody html={article.content} />
            </div>

            {/* FAQs */}
            {article.faqs?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                <h2 className="text-base font-black text-gray-900 mb-4">Frequently Asked Questions</h2>
                <div className="space-y-2">
                  {article.faqs.map((faq: any, i: number) => (
                    <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm font-semibold text-gray-800">{faq.q}</span>
                        <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform shrink-0 ${openFaq === i ? "rotate-90" : ""}`} />
                      </button>
                      {openFaq === i && (
                        <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* More in this cluster */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{cluster.emoji} {cluster.title}</h3>
              <ul className="space-y-1.5">
                {cluster.articles.map((a: any) => (
                  <li key={a.slug}>
                    <button
                      onClick={() => navigate(`/help/${a.slug}`)}
                      className={`text-sm text-left w-full px-2 py-1.5 rounded-lg transition-colors ${
                        a.slug === slug
                          ? "bg-[#5A45FF]/10 text-[#5A45FF] font-semibold"
                          : "text-gray-600 hover:text-[#5A45FF] hover:bg-gray-50"
                      }`}
                    >
                      {a.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Other clusters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Browse Topics</h3>
              <ul className="space-y-1">
                {HELP_KB.filter((c: any) => c.id !== cluster.id).map((c: any) => (
                  <li key={c.id}>
                    <button
                      onClick={() => navigate(`/help/${c.articles[0].slug}`)}
                      className="text-sm text-gray-600 hover:text-[#5A45FF] flex items-center gap-2 py-1"
                    >
                      <span>{c.emoji}</span> {c.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-[#5A45FF] to-[#FF4D6D] rounded-2xl p-5 text-white text-center">
              <p className="font-bold text-sm mb-1">New to Swapedly?</p>
              <p className="text-white/75 text-xs mb-3">Get $40 in Swap Bucks free when you sign up.</p>
              <a href="/#/gift-card" className="inline-block bg-white text-[#5A45FF] text-xs font-bold px-4 py-2 rounded-full hover:bg-gray-50">
                Claim $40 Free →
              </a>
            </div>
          </div>

        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-gray-400 mt-4">
        © 2025 Swapedly · <a href="/#/" className="hover:text-[#5A45FF]">Home</a> · <a href="/#/blog" className="hover:text-[#5A45FF]">Blog</a>
      </footer>

      <Chatbot onNavigate={slug2 => navigate(`/help/${slug2}`)} />
    </div>
  );
}

// ─── Router ────────────────────────────────────────────────────────────────
export default function HelpPage() {
  const [match, params] = useRoute("/help/:slug");
  if (match && params?.slug) return <HelpArticle slug={params.slug} />;
  return <HelpIndex />;
}
