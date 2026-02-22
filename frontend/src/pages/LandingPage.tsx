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
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-indigo-100">
      
      {/* --- HERO SECTION --- */}
      <section className="relative overflow-hidden pt-24 pb-32 lg:pt-32 lg:pb-40 bg-gradient-to-b from-indigo-50/50 to-white">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
            <div className="absolute top-20 left-10 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-pulse"></div>
            <div className="absolute top-40 right-10 w-80 h-80 bg-purple-200/40 rounded-full blur-3xl mix-blend-multiply opacity-70"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold mb-8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            No App Required
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 drop-shadow-sm">
            Every Event Deserves Its Own <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              Digital Memory Space
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-xl text-gray-600 mb-10 leading-relaxed">
            The private, instant photo feed for your wedding, party, or corporate event. 
            Guests scan a QR code and photos appear instantly.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all w-full sm:w-auto flex items-center justify-center gap-2"
            >
              Create Your Event
              <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm rounded-2xl font-semibold text-lg active:scale-[0.98] transition-all w-full sm:w-auto"
            >
              How it Works
            </button>
          </div>

          {/* Hero Visual Mockup */}
          <div className="mt-20 relative mx-auto max-w-4xl">
             <div className="relative rounded-3xl bg-white p-3 shadow-2xl border border-gray-100/50">
                <div className="rounded-2xl overflow-hidden bg-gray-50 aspect-video flex items-center justify-center relative border border-gray-100">
                    <div className="text-center">
                        <Camera size={64} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">Real-time Photo Feed</p>
                    </div>
                     {/* Floating Elements */}
                    <div className="absolute -left-6 top-10 bg-white p-4 rounded-xl shadow-2xl border border-gray-100 flex items-center gap-4 animate-bounce">
                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600 border border-green-100">
                            <QrCode size={24} />
                        </div>
                        <div className="text-left">
                            <p className="text-xs text-gray-500 font-medium">Scan QR</p>
                            <p className="text-sm font-bold text-gray-900">Instant Access</p>
                        </div>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section id="how-it-works" className="py-24 bg-gray-50 relative border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                  <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Simple as 1-2-3</h2>
                  <p className="text-lg text-gray-600">No downloads, no logins for guests. Just pure memories.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-12">
                  {/* Step 1 */}
                  <div className="relative text-center group">
                      <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 border border-indigo-100 shadow-sm">
                          <Zap size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">1. Host Creates Event</h3>
                      <p className="text-gray-600 leading-relaxed">
                          Sign up in seconds. Set your event name, date, and customize your welcome message.
                      </p>
                  </div>

                  {/* Step 2 */}
                  <div className="relative text-center group">
                      <div className="w-20 h-20 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mx-auto mb-6 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 border border-purple-100 shadow-sm">
                          <QrCode size={32} />
                      </div>
                      <div className="hidden md:block absolute top-10 -left-1/2 w-full border-t-2 border-dashed border-gray-200 -z-10"></div>
                      <div className="hidden md:block absolute top-10 -right-1/2 w-full border-t-2 border-dashed border-gray-200 -z-10"></div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-3">2. Guests Scan QR</h3>
                      <p className="text-gray-600 leading-relaxed">
                          Print your unique QR code on table cards. Guests scan and upload without installing an app.
                      </p>
                  </div>

                  {/* Step 3 */}
                  <div className="relative text-center group">
                      <div className="w-20 h-20 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-600 mx-auto mb-6 group-hover:scale-110 group-hover:bg-pink-600 group-hover:text-white transition-all duration-300 border border-pink-100 shadow-sm">
                          <Camera size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">3. Watch Real-time</h3>
                      <p className="text-gray-600 leading-relaxed">
                          Photos appear instantly on the live feed. Download everything in a zip file later.
                      </p>
                  </div>
              </div>
          </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section className="py-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-lg shadow-gray-100/50 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl transition-all">
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6">
                        <QrCode size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Instant QR Access</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">Every event gets a dedicated QR code and unique link.</p>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-lg shadow-gray-100/50 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl transition-all">
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6">
                        <Lock size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Private Feed</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">Your memories are safe. Only people heavily with the link can view.</p>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-lg shadow-gray-100/50 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl transition-all">
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6">
                        <Download size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Bulk Zip Download</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">Events over? Download all high-res photos in one click.</p>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-lg shadow-gray-100/50 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl transition-all">
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6">
                        <ShieldCheck size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Host Moderation</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">You have full control. Approve or delete photos instantly.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* --- USE CASES --- */}
      <section className="py-24 bg-gray-50 border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-4xl font-extrabold text-gray-900 text-center mb-16">Perfect For Any Occasion</h2>
              <div className="grid md:grid-cols-2 gap-8">
                  <div className="relative group overflow-hidden rounded-3xl shadow-xl aspect-video lg:aspect-[21/9]">
                      <img 
                        src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=2000" 
                        alt="Wedding" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent flex items-end p-8">
                          <div>
                              <h3 className="text-2xl font-bold text-white mb-2">Weddings</h3>
                              <p className="text-gray-200">Capture every candid moment from your guests' perspective.</p>
                          </div>
                      </div>
                  </div>
                  <div className="relative group overflow-hidden rounded-3xl shadow-xl aspect-video lg:aspect-[21/9]">
                      <img 
                        src="https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?auto=format&fit=crop&q=80&w=2000" 
                        alt="Party" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent flex items-end p-8">
                          <div>
                              <h3 className="text-2xl font-bold text-white mb-2">Corporate & Parties</h3>
                              <p className="text-gray-200">Engage attendees with a live photo wall.</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* --- PRICING --- */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-extrabold text-gray-900 text-center mb-4">Simple Pricing</h2>
            <p className="text-lg text-gray-600 text-center mb-16">Choose the plan that fits your event duration.</p>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {/* Basic */}
                <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm flex flex-col hover:shadow-lg transition-shadow">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Basic</h3>
                    <div className="text-4xl font-extrabold text-gray-900 mb-6">Free<span className="text-base text-gray-500 font-normal"> / event</span></div>
                    <ul className="space-y-4 mb-8 flex-grow">
                        <li className="flex items-center gap-3 text-gray-600 text-sm">
                            <CheckCircle2 size={20} className="text-indigo-500 flex-shrink-0" /> 1 Month Access
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 text-sm">
                            <CheckCircle2 size={20} className="text-indigo-500 flex-shrink-0" /> Up to 50 Guests
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 text-sm">
                            <CheckCircle2 size={20} className="text-indigo-500 flex-shrink-0" /> Standard Resolution
                        </li>
                    </ul>
                    <button className="w-full py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:border-gray-300 hover:bg-gray-50 transition-colors">
                        Select Basic
                    </button>
                </div>

                {/* Pro */}
                <div className="bg-white rounded-3xl p-8 border-2 border-indigo-500 relative flex flex-col shadow-2xl shadow-indigo-100 transform md:-translate-y-4">
                    <div className="absolute top-0 right-8 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-b-lg">
                        POPULAR
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Pro</h3>
                    <div className="text-4xl font-extrabold text-indigo-600 mb-6">$29<span className="text-base text-gray-500 font-normal"> / event</span></div>
                    <ul className="space-y-4 mb-8 flex-grow">
                        <li className="flex items-center gap-3 text-gray-700 text-sm font-medium">
                            <CheckCircle2 size={20} className="text-indigo-500 flex-shrink-0" /> 3 Months Access
                        </li>
                        <li className="flex items-center gap-3 text-gray-700 text-sm font-medium">
                            <CheckCircle2 size={20} className="text-indigo-500 flex-shrink-0" /> Unlimited Guests
                        </li>
                        <li className="flex items-center gap-3 text-gray-700 text-sm font-medium">
                            <CheckCircle2 size={20} className="text-indigo-500 flex-shrink-0" /> High-Res Downloads
                        </li>
                        <li className="flex items-center gap-3 text-gray-700 text-sm font-medium">
                            <CheckCircle2 size={20} className="text-indigo-500 flex-shrink-0" /> Live Slideshow Mode
                        </li>
                    </ul>
                    <button 
                        onClick={() => navigate('/login')}
                        className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                    >
                        Get Started
                    </button>
                </div>

                {/* VIP */}
                <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm flex flex-col hover:shadow-lg transition-shadow">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">VIP</h3>
                    <div className="text-4xl font-extrabold text-gray-900 mb-6">$99<span className="text-base text-gray-500 font-normal"> / event</span></div>
                    <ul className="space-y-4 mb-8 flex-grow">
                        <li className="flex items-center gap-3 text-gray-600 text-sm">
                            <CheckCircle2 size={20} className="text-indigo-500 flex-shrink-0" /> 6 Months Access
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 text-sm">
                            <CheckCircle2 size={20} className="text-indigo-500 flex-shrink-0" /> Everything in Pro
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 text-sm">
                            <CheckCircle2 size={20} className="text-indigo-500 flex-shrink-0" /> AI Video Montage
                        </li>
                        <li className="flex items-center gap-3 text-gray-600 text-sm">
                            <CheckCircle2 size={20} className="text-indigo-500 flex-shrink-0" /> Priority Support
                        </li>
                    </ul>
                    <button className="w-full py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:border-gray-300 hover:bg-gray-50 transition-colors">
                        Contact Sales
                    </button>
                </div>
            </div>
        </div>
      </section>

      {/* --- TRUST --- */}
      <section className="py-16 bg-gray-900 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="text-center md:text-left">
                  <h4 className="font-bold text-xl text-white mb-2">Secure & Private</h4>
                  <p className="text-gray-400">We use enterprise-grade encryption to protect your memories.</p>
              </div>
              <div className="flex gap-8 text-gray-400 font-medium">
                  <span className="flex items-center gap-2"><Lock size={20} className="text-indigo-400"/> Secure Cloud</span>
                  <span className="flex items-center gap-2"><Users size={20} className="text-indigo-400"/> Guest Anonymity</span>
              </div>
          </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-8 bg-gray-950 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Elite Memoriz. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
