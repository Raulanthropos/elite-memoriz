
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  QrCode, 
  Download, 
  ShieldCheck, 
  Zap, 
  Users, 
  Lock, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      
      {/* --- HERO SECTION --- */}
      <section className="relative overflow-hidden pt-24 pb-32 lg:pt-32 lg:pb-40">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
            <div className="absolute top-20 left-10 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl opacity-50 animate-pulse"></div>
            <div className="absolute top-40 right-10 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl opacity-50"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            No Apps Required
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
            Every Event Deserves Its Own <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Digital Memory Space
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-xl text-gray-400 mb-10">
            The private, instant photo feed for your wedding, party, or corporate event. 
            Guests scan a QR code and photos appear instantly.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/25 transition-all w-full sm:w-auto flex items-center justify-center gap-2"
            >
              Create Your Event
              <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl font-semibold text-lg transition-all w-full sm:w-auto"
            >
              How it Works
            </button>
          </div>

          {/* Hero Visual Mockup */}
          <div className="mt-20 relative mx-auto max-w-4xl">
             <div className="relative rounded-2xl bg-gray-800/50 p-2 ring-1 ring-white/10 backdrop-blur-sm">
                <div className="rounded-xl overflow-hidden bg-gray-900 aspect-video flex items-center justify-center relative">
                    <div className="text-center">
                        <Camera size={64} className="mx-auto text-gray-700 mb-4" />
                        <p className="text-gray-600 font-mono">Real-time Photo Feed Demo</p>
                    </div>
                     {/* Floating Elements */}
                    <div className="absolute -left-4 top-10 bg-gray-800 p-3 rounded-lg shadow-xl border border-gray-700 flex items-center gap-3 animate-bounce">
                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-400">
                            <QrCode size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Scan QR</p>
                            <p className="text-sm font-bold text-white">Instant Access</p>
                        </div>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section id="how-it-works" className="py-24 bg-gray-900 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold text-white mb-4">Simple as 1-2-3</h2>
                  <p className="text-gray-400">No downloads, no logins for guests. Just pure memories.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-12">
                  {/* Step 1 */}
                  <div className="relative text-center group">
                      <div className="w-20 h-20 bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 border border-indigo-500/20">
                          <Zap size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">1. Host Creates Event</h3>
                      <p className="text-gray-400 leading-relaxed">
                          Sign up in seconds. Set your event name, date, and customize your welcome message.
                      </p>
                  </div>

                  {/* Step 2 */}
                  <div className="relative text-center group">
                      <div className="w-20 h-20 bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-400 mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 border border-purple-500/20">
                          <QrCode size={32} />
                      </div>
                      <div className="hidden md:block absolute top-10 -left-1/2 w-full border-t-2 border-dashed border-gray-800 -z-10"></div>
                      <div className="hidden md:block absolute top-10 -right-1/2 w-full border-t-2 border-dashed border-gray-800 -z-10"></div>
                      
                      <h3 className="text-xl font-bold text-white mb-3">2. Guests Scan QR</h3>
                      <p className="text-gray-400 leading-relaxed">
                          Print your unique QR code on table cards. Guests scan and upload without installing an app.
                      </p>
                  </div>

                  {/* Step 3 */}
                  <div className="relative text-center group">
                      <div className="w-20 h-20 bg-pink-900/30 rounded-2xl flex items-center justify-center text-pink-400 mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 border border-pink-500/20">
                          <Camera size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">3. Watch Real-time</h3>
                      <p className="text-gray-400 leading-relaxed">
                          Photos appear instantly on the live feed. Download everything in a zip file later.
                      </p>
                  </div>
              </div>
          </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section className="py-24 bg-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-indigo-500/30 transition-colors">
                      <QrCode className="text-indigo-400 mb-4" size={32} />
                      <h3 className="text-lg font-bold text-white mb-2">Instant QR Access</h3>
                      <p className="text-gray-400 text-sm">Every event gets a dedicated QR code and unique link.</p>
                  </div>
                  <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-indigo-500/30 transition-colors">
                      <Lock className="text-indigo-400 mb-4" size={32} />
                      <h3 className="text-lg font-bold text-white mb-2">Private Feed</h3>
                      <p className="text-gray-400 text-sm">Your memories are safe. Only people heavily with the link can view.</p>
                  </div>
                  <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-indigo-500/30 transition-colors">
                      <Download className="text-indigo-400 mb-4" size={32} />
                      <h3 className="text-lg font-bold text-white mb-2">Bulk Zip Download</h3>
                      <p className="text-gray-400 text-sm">Events over? Download all high-res photos in one click.</p>
                  </div>
                  <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-indigo-500/30 transition-colors">
                      <ShieldCheck className="text-indigo-400 mb-4" size={32} />
                      <h3 className="text-lg font-bold text-white mb-2">Host Moderation</h3>
                      <p className="text-gray-400 text-sm">You have full control. Approve or delete photos instantly.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* --- USE CASES --- */}
      <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-white text-center mb-16">Perfect For Any Occasion</h2>
              <div className="grid md:grid-cols-2 gap-8">
                  <div className="relative group overflow-hidden rounded-2xl aspect-video lg:aspect-[21/9]">
                      <img 
                        src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=2000" 
                        alt="Wedding" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-8">
                          <div>
                              <h3 className="text-2xl font-bold text-white mb-1">Weddings</h3>
                              <p className="text-gray-300">Capture every candid moment from your guests' perspective.</p>
                          </div>
                      </div>
                  </div>
                  <div className="relative group overflow-hidden rounded-2xl aspect-video lg:aspect-[21/9]">
                      <img 
                        src="https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?auto=format&fit=crop&q=80&w=2000" 
                        alt="Party" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-8">
                          <div>
                              <h3 className="text-2xl font-bold text-white mb-1">Corporate & Parties</h3>
                              <p className="text-gray-300">Engage attendees with a live photo wall.</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* --- PRICING --- */}
      <section className="py-24 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white text-center mb-4">Simple Pricing</h2>
            <p className="text-gray-400 text-center mb-16">Choose the plan that fits your event duration.</p>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {/* Basic */}
                <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 flex flex-col">
                    <h3 className="text-xl font-semibold text-white mb-2">Basic</h3>
                    <div className="text-3xl font-bold text-white mb-6">Free<span className="text-sm text-gray-500 font-normal"> / event</span></div>
                    <ul className="space-y-4 mb-8 flex-grow">
                        <li className="flex items-center gap-3 text-gray-400 text-sm">
                            <CheckCircle2 size={18} className="text-indigo-500" /> 1 Month Access
                        </li>
                        <li className="flex items-center gap-3 text-gray-400 text-sm">
                            <CheckCircle2 size={18} className="text-indigo-500" /> Up to 50 Guests
                        </li>
                        <li className="flex items-center gap-3 text-gray-400 text-sm">
                            <CheckCircle2 size={18} className="text-indigo-500" /> Standard Resolution
                        </li>
                    </ul>
                    <button className="w-full py-3 rounded-lg border border-gray-700 text-white font-medium hover:bg-gray-800 transition-colors">
                        Select Basic
                    </button>
                </div>

                {/* Pro */}
                <div className="bg-gray-900 rounded-2xl p-8 border border-indigo-500 relative flex flex-col shadow-2xl shadow-indigo-900/20">
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                        POPULAR
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Pro</h3>
                    <div className="text-3xl font-bold text-white mb-6">$29<span className="text-sm text-gray-500 font-normal"> / event</span></div>
                    <ul className="space-y-4 mb-8 flex-grow">
                        <li className="flex items-center gap-3 text-gray-300 text-sm">
                            <CheckCircle2 size={18} className="text-indigo-400" /> 3 Months Access
                        </li>
                        <li className="flex items-center gap-3 text-gray-300 text-sm">
                            <CheckCircle2 size={18} className="text-indigo-400" /> Unlimited Guests
                        </li>
                        <li className="flex items-center gap-3 text-gray-300 text-sm">
                            <CheckCircle2 size={18} className="text-indigo-400" /> High-Res Downloads
                        </li>
                        <li className="flex items-center gap-3 text-gray-300 text-sm">
                            <CheckCircle2 size={18} className="text-indigo-400" /> Live Slideshow Mode
                        </li>
                    </ul>
                    <button 
                        onClick={() => navigate('/login')}
                        className="w-full py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/25"
                    >
                        Get Started
                    </button>
                </div>

                {/* VIP */}
                <div className="bg-gray-900 rounded-2xl p-8 border border-purple-500/50 flex flex-col">
                    <h3 className="text-xl font-semibold text-white mb-2">VIP</h3>
                    <div className="text-3xl font-bold text-white mb-6">$99<span className="text-sm text-gray-500 font-normal"> / event</span></div>
                    <ul className="space-y-4 mb-8 flex-grow">
                        <li className="flex items-center gap-3 text-gray-400 text-sm">
                            <CheckCircle2 size={18} className="text-purple-500" /> 6 Months Access
                        </li>
                        <li className="flex items-center gap-3 text-gray-400 text-sm">
                            <CheckCircle2 size={18} className="text-purple-500" /> Everything in Pro
                        </li>
                        <li className="flex items-center gap-3 text-gray-400 text-sm">
                            <CheckCircle2 size={18} className="text-purple-500" /> AI Video Montage
                        </li>
                        <li className="flex items-center gap-3 text-gray-400 text-sm">
                            <CheckCircle2 size={18} className="text-purple-500" /> Priority Support
                        </li>
                    </ul>
                    <button className="w-full py-3 rounded-lg border border-gray-700 text-white font-medium hover:bg-gray-800 transition-colors">
                        Contact Sales
                    </button>
                </div>
            </div>
        </div>
      </section>

      {/* --- TRUST --- */}
      <section className="py-16 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-8">
              <div>
                  <h4 className="font-bold text-lg text-white mb-1">Secure & Private</h4>
                  <p className="text-gray-500 text-sm">We use enterprise-grade encryption to protect your memories.</p>
              </div>
              <div className="flex gap-8 text-gray-500">
                  <span className="flex items-center gap-2"><Lock size={16}/> Secure Cloud</span>
                  <span className="flex items-center gap-2"><Users size={16}/> Guest Anonymity</span>
              </div>
          </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-8 bg-black text-center text-gray-600 text-sm">
          <p>&copy; {new Date().getFullYear()} Elite Memoriz. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
