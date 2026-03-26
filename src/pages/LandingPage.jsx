import {
  ArrowRight,
  CheckCircle2,
  Menu,
  MessageSquare,
  Moon,
  Rocket,
  Sparkles,
  Star,
  Sun,
  Target,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const intelligenceCards = [
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Sentiment Impact",
    text: "Evaluates the tone and confidence level of your achievement statements to ensure executive presence.",
  },
  {
    icon: <Rocket className="w-5 h-5" />,
    title: "Action Verb Density",
    text: "Analyzes the power of your opening verbs to maximize the kinetic energy of every bullet point.",
  },
  {
    icon: <Target className="w-5 h-5" />,
    title: "ATS Mapping",
    text: "Real-time simulation of how major Applicant Tracking Systems parse and rank your data.",
  },
];

const seedReviews = [
  {
    id: "r1",
    name: "Ananya P.",
    role: "Product Designer",
    rating: 5,
    text: "My ATS score jumped from 58 to 84 in two iterations. The keyword suggestions were spot on.",
  },
  {
    id: "r2",
    name: "Rahul M.",
    role: "Backend Engineer",
    rating: 5,
    text: "The interview questions felt tailored to my exact resume. This helped me prep for final rounds.",
  },
  {
    id: "r3",
    name: "Sneha K.",
    role: "Data Analyst",
    rating: 4,
    text: "I loved the history tracking. I could clearly see what changed and why my score improved.",
  },
  {
    id: "r4",
    name: "Arjun T.",
    role: "SWE Intern",
    rating: 5,
    text: "Clean UI, fast analysis, and practical resume edits. It genuinely made my profile stronger.",
  },
];

const PROFILE = {
  name: "Jayram Sangawat",
  brand: "Resume Analyzer",
  tagline: "AI-powered ATS resume mentor",
  links: {
    github: "https://github.com/jayramgit94",
    linkedin: "#",
    twitter: "#",
    portfolio: "https://jayram.me",
  },
};

export default function LandingPage() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const heroCardRef = useRef(null);
  const [reviews, setReviews] = useState(seedReviews);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const canTilt =
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    window.innerWidth >= 992;

  const cta = useMemo(() => {
    if (!user) {
      return {
        label: "Analyze Resume",
        action: () => navigate("/register"),
      };
    }

    return {
      label: user.role === "admin" ? "Open Admin Panel" : "Open Dashboard",
      action: () => navigate(user.role === "admin" ? "/admin" : "/dashboard"),
    };
  }, [navigate, user]);

  const marqueeReviews = useMemo(() => [...reviews, ...reviews], [reviews]);

  function submitReview(e) {
    e.preventDefault();
    const text = reviewText.trim();
    if (text.length < 12) return;

    const reviewerName = user?.name || user?.email?.split("@")[0] || "User";
    setReviews((prev) => [
      {
        id: `r-${Date.now()}`,
        name: reviewerName,
        role: user?.role === "admin" ? "Admin" : "Verified User",
        rating: reviewRating,
        text,
      },
      ...prev,
    ]);
    setReviewText("");
    setReviewRating(5);
  }

  function handleHeroPointerMove(e) {
    if (!canTilt) return;
    const el = heroCardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotY = (px - 0.5) * 12;
    const rotX = (0.5 - py) * 10;
    el.style.setProperty("--tilt-x", `${rotX.toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${rotY.toFixed(2)}deg`);
    el.style.setProperty("--glow-x", `${(px * 100).toFixed(2)}%`);
    el.style.setProperty("--glow-y", `${(py * 100).toFixed(2)}%`);
  }

  function handleHeroPointerLeave() {
    if (!canTilt) return;
    const el = heroCardRef.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
    el.style.setProperty("--glow-x", "50%");
    el.style.setProperty("--glow-y", "40%");
  }

  return (
    <div className="kinetic-page">
      <header className="kinetic-topbar">
        <div className="kinetic-wrap kinetic-topbar-inner">
          <div className="kinetic-brand">{PROFILE.brand}</div>

          <nav className="kinetic-nav hidden md:flex">
            <a href="#" className="active">Home</a>
            <a href="#features">Features</a>
            <a href="#story">Story</a>
            <a href="#demo">Demo</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={toggle} className="kinetic-theme-btn" aria-label="Toggle theme">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {!user && (
              <Link to="/login" className="hidden lg:inline kinetic-signin">Sign In</Link>
            )}

            <button onClick={cta.action} className="kinetic-cta-btn">
              {cta.label}
            </button>

            <button
              className="md:hidden kinetic-theme-btn"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden kinetic-wrap pb-4">
            <div className="kinetic-mobile-nav">
              <a href="#features">Features</a>
              <a href="#story">Story</a>
              <a href="#demo">Demo</a>
              {!user && <Link to="/login">Sign In</Link>}
            </div>
          </div>
        )}
      </header>

      <main className="relative">
        <div className="kinetic-glow" />

        <section className="kinetic-wrap kinetic-hero">
          <div className="kinetic-hero-grid">
            <div>
              <p className="kinetic-tag">
                <span className="dot" />
                NARRATIVE AI ENGINE ACTIVE
              </p>

              <h1 className="kinetic-display">
                Analyze Your
                <br />
                <span>Resume</span> with AI
              </h1>

              <p className="kinetic-subtag">Narrative-first, recruiter-grade, conversion-focused.</p>

              <p className="kinetic-lead">
                Improve your chances of getting hired instantly. Our Kinetic Engine transforms
                static profiles into dynamic career narratives.
              </p>

              <div className="kinetic-actions">
                <button onClick={cta.action} className="kinetic-primary-btn">
                  Upload Resume <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate(user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/login")}
                  className="kinetic-secondary-btn"
                >
                  View Demo
                </button>
              </div>
            </div>

            <div
              className="kinetic-hero-card"
              id="demo"
              ref={heroCardRef}
              onMouseMove={handleHeroPointerMove}
              onMouseLeave={handleHeroPointerLeave}
            >
              <div className="hero-aurora hero-aurora-a" />
              <div className="hero-aurora hero-aurora-b" />

              <div className="kinetic-hero-card-top">
                <div className="icon-shell">
                  <UserRound className="w-4 h-4" />
                </div>
                <span className="scan-pill">SCANNING...</span>
              </div>

              <div className="hero-beam" />
              <div className="hero-beam beam-2" />

              <div className="paper-stack" aria-hidden="true">
                <div className="paper-sheet sheet-back" />
                <div className="paper-sheet sheet-mid" />
                <div className="paper-sheet sheet-front" />
              </div>

              <div className="kinetic-lines">
                <div className="line active" />
                <div className="line" />
                <div className="line short" />
              </div>

              <div className="kinetic-score-card">
                <div className="flex items-center justify-between mb-2">
                  <span>ATS SCORE</span>
                  <strong>84%</strong>
                </div>
                <div className="progress-shell">
                  <div className="progress-fill" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="kinetic-section shade">
          <div className="kinetic-wrap">
            <div className="kinetic-section-head">
              <h2>Kinetic Intelligence</h2>
              <p>
                Detailed analysis that goes beyond keyword matching. We measure sentiment,
                impact, and hierarchy.
              </p>
            </div>

            <div className="kinetic-card-grid">
              {intelligenceCards.map((item) => (
                <article key={item.title} className="kinetic-intel-card">
                  <div className="icon">{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="story" className="kinetic-section">
          <div className="kinetic-wrap">
            <div className="kinetic-bento-grid">
              <article className="kinetic-main-bento">
                <h2>Optimized for the Invisible Gatekeepers</h2>
                <p>
                  Don&apos;t let legacy software stand between you and your dream role. We bypass
                  the filters by speaking their language.
                </p>
                <ul>
                  <li><CheckCircle2 className="w-4 h-4" /> Header Hierarchy Calibration</li>
                  <li><CheckCircle2 className="w-4 h-4" /> Font Compatibility Scanning</li>
                  <li><CheckCircle2 className="w-4 h-4" /> Context-Aware Keyword Injection</li>
                </ul>
                <div className="ring-deco" />
              </article>

              <article className="kinetic-side-bento">
                <Sparkles className="w-6 h-6 opacity-70" />
                <div>
                  <h3>Instant Narrative Rewrite</h3>
                  <p>
                    Our AI doesn&apos;t just suggest changes; it crafts the story for you. One
                    click to excellence.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="kinetic-section black">
          <div className="kinetic-wrap">
            <div className="kinetic-process-head">
              <span>THE PROCESS</span>
              <h2>The Three Pillars of Success</h2>
            </div>

            <div className="kinetic-process-grid">
              <div className="connector" />
              <Step idx="01" title="Ingest" text="Upload your PDF. Our engine extracts the semantic structure instantly." />
              <Step idx="02" title="Analyze" text="Cross-referencing against modern recruiting benchmarks and ATS checks." />
              <Step idx="03" title="Evolve" text="Receive a polished, high-conversion version of your professional identity." />
            </div>
          </div>
        </section>

        <section className="kinetic-section kinetic-reviews" id="reviews">
          <div className="kinetic-wrap">
            <div className="kinetic-section-head">
              <h2>What People Say</h2>
              <p>
                Real outcomes from job seekers using Resume Analyzer to improve clarity,
                relevance, and interview readiness.
              </p>
            </div>

            <div className="review-belt" role="region" aria-label="User reviews">
              <div className="review-track">
                {marqueeReviews.map((review, idx) => (
                  <article key={`${review.id}-${idx}`} className="review-card">
                    <div className="review-head">
                      <div>
                        <h4>{review.name}</h4>
                        <p>{review.role}</p>
                      </div>
                      <div className="stars" aria-label={`${review.rating} star review`}>
                        {Array.from({ length: 5 }).map((_, starIdx) => (
                          <Star
                            key={starIdx}
                            className={`w-3.5 h-3.5 ${starIdx < review.rating ? "fill-current" : "opacity-30"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="review-text">"{review.text}"</p>
                  </article>
                ))}
              </div>
            </div>

            {user ? (
              <form className="review-form" onSubmit={submitReview}>
                <div className="review-form-title">
                  <MessageSquare className="w-4 h-4" />
                  <span>Write a Review</span>
                </div>

                <div className="rating-pills">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setReviewRating(num)}
                      className={num === reviewRating ? "active" : ""}
                    >
                      {num}★
                    </button>
                  ))}
                </div>

                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience with Resume Analyzer..."
                  maxLength={220}
                  required
                />

                <div className="review-form-footer">
                  <small>{220 - reviewText.length} characters left</small>
                  <button type="submit" disabled={reviewText.trim().length < 12}>
                    Publish Review
                  </button>
                </div>
              </form>
            ) : (
              <div className="review-login-note">
                <p>Only logged-in users can post a review.</p>
                <Link to="/login">Sign In to Add Review</Link>
              </div>
            )}
          </div>
        </section>

        <footer className="kinetic-footer">
          <div className="watermark">{PROFILE.brand.toUpperCase()}</div>
          <div className="kinetic-wrap footer-meta">
            <p>© 2026 {PROFILE.name}. {PROFILE.tagline}.</p>
            <div className="links">
              <a href={PROFILE.links.github} target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href={PROFILE.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href={PROFILE.links.twitter} target="_blank" rel="noopener noreferrer">Twitter</a>
              <a href={PROFILE.links.portfolio} target="_blank" rel="noopener noreferrer">Portfolio</a>
            </div>
          </div>
        </footer>

        <div className="social-proof hidden md:flex">
          <div className="avatars">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbisDf99_QqId_bnRkobG7owt4tcNQf7FbFZNBKb1DqXYaiL80MYWXNguhFGyY_v7a2iw3gbXfKvJ992ZsyTgWA-fjulK8gp6FaUKTsUc50Zb6bMeQ7nSY9_91ZuNi6-7nHiwQcvPiV81J3EdyDKrLbH5-ZnATW-tcSJnVWIrqz5kr9mK9_2D0UHfI2sHxj8w18sqXqAyc8Z5iIjb-UmG5h5m756Mkn7gTU7VDK8uqUX8FGvm69DVyaS-BMjtV0JICLJCarGbk_uo" alt="user" />
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiaSMiUmkYpu_-TbKwUpdurjDu28Afcv5Z1Ciyp-cBsUmrmOyGLCUeaZFKq6S3Dn1bNdvwXMB1vH0g9B796pPyoMl4R7md0TpBVIlD38evYHO4QXiozf0ASzdmsJ79uS8bhjhSTgpFAKeTHdH3QvXWg4CFVJh_JCaWIl-JjjRjR-jtUvh0hEQ6GEESMJ_ZmPn6HJqG72fvRuUyfns4_RhtgHD7thgUwgwIre-xneBGGCOO8tsFuSOLJC1GYPeUIAuLKzL8HjRvH1w" alt="user" />
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLz4Lt0We-_sy2O7iRib7-IBne8HqtF3xIXxZQB4JP2e3qZf_2OL22i1CCQT3-dmZQqBHwpY_5F-1z70pe4yrLyYpYw3ujwWwqH25TvdKpJBH73jmYaQxdC5Wh6s4sUkZpbqYKrXPOf_eQWpgAVJ5fLTrryUro-lKVS3g-DcebM2co09rhQjFbbHxrU58r6-JmkytA_ZYCgW3grVrKTASqP-a0wFMaz47mzvma1VN9oWuLsEjlGFl6oTOONQ6bMy538L3Bf3AehNM" alt="user" />
          </div>
          <p>
            Joined by <strong>2,400+</strong> professionals this week
          </p>
        </div>
      </main>
    </div>
  );
}

function Step({ idx, title, text }) {
  return (
    <article className="kinetic-step">
      <div className="num">{idx}</div>
      <h4>{title}</h4>
      <p>{text}</p>
    </article>
  );
}
