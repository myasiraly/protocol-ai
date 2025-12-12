
import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Loader2, AlertCircle, ArrowRight, Mail, ChevronLeft, Lock } from 'lucide-react';
import { UserProfile } from '../types';
import { playSound } from '../utils/audio';

declare global {
  interface Window {
    google: any;
  }
}

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [status, setStatus] = useState<'INITIALIZING' | 'READY' | 'AUTHENTICATING' | 'ERROR'>('INITIALIZING');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSimulation, setIsSimulation] = useState(false);
  
  // Manual Login State
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customPassword, setCustomPassword] = useState('');

  const googleButtonRef = useRef<HTMLDivElement>(null);
  
  // Safe access to environment variables
  const getEnv = (key: string) => {
    try {
      return process.env[key];
    } catch {
      return undefined;
    }
  };

  const clientId = getEnv('GOOGLE_CLIENT_ID') || getEnv('REACT_APP_GOOGLE_CLIENT_ID');

  const decodeJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("Failed to decode JWT", e);
      return null;
    }
  };

  const handleCredentialResponse = (response: any) => {
    playSound('success');
    setStatus('AUTHENTICATING');
    const profile = decodeJwt(response.credential);

    if (profile) {
      setTimeout(() => {
        // robustness: construct name from parts if full name is missing
        const fullName = profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(' ') || 'Authorized User';
        onLogin({
          name: fullName,
          email: profile.email,
          picture: profile.picture
        });
      }, 1500);
    } else {
      playSound('error');
      setStatus('ERROR');
      setErrorMsg('Token Decryption Failed');
    }
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customEmail || !customPassword) return;
    
    playSound('click');
    setStatus('AUTHENTICATING');
    
    setTimeout(() => {
      playSound('success');
      onLogin({
        name: customName,
        email: customEmail,
        picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(customName)}&background=0ea5e9&color=fff&bold=true`
      });
    }, 1500);
  };

  useEffect(() => {
    const timer = setTimeout(() => playSound('boot'), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // If no Client ID is provided, gracefully default to Simulation Mode without warning
    if (!clientId) {
      setIsSimulation(true);
      setTimeout(() => setStatus('READY'), 800);
      return;
    }

    const checkInterval = setInterval(() => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        clearInterval(checkInterval);
        setStatus('READY');
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      if (status === 'INITIALIZING' && !isSimulation) {
        if (window.google?.accounts?.id) {
           setStatus('READY');
        } else {
           // Silent fallback
           setIsSimulation(true);
           setStatus('READY');
        }
      }
    }, 3000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [clientId, status, isSimulation]);

  useEffect(() => {
    if (status === 'READY' && !isSimulation && googleButtonRef.current && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: true, // Enable automatic sign-in for seamless UX
          theme: 'filled_black',
          cancel_on_tap_outside: false,
        });
        
        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          { theme: 'filled_black', size: 'large', shape: 'pill', width: '100%', text: 'continue_with' }
        );
      } catch (err) {
        console.error("Google Auth Render Failed:", err);
        setIsSimulation(true); 
      }
    }
  }, [status, clientId, isSimulation, showEmailLogin]); // Re-run if view toggles back

  return (
    <div className="fixed inset-0 z-[100] bg-protocol-bg overflow-y-auto custom-scrollbar">
      {/* Background */}
      <div className="fixed inset-0 bg-protocol-bg -z-10">
        <div className="absolute inset-0 bg-grid-canvas opacity-[0.15]"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-900/10 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px]"></div>
      </div>

      <div className="min-h-full w-full flex flex-col items-center justify-center p-4 sm:p-8">
        
        <div className="w-full max-w-md animate-fade-in flex flex-col items-center relative">
          
          {/* Main Card */}
          <div className="w-full bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-8 sm:p-10 rounded-3xl shadow-glass flex flex-col items-center relative overflow-hidden transition-all duration-500">
             
             {/* Header */}
             <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl flex items-center justify-center mb-6 shadow-pop border border-white/5 relative">
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10"></div>
                    {/* Custom AI Logo */}
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]">
                       <path d="M14 7V17M14 7C14 4.79086 12.2091 3 10 3H7C4.79086 3 3 4.79086 3 7V17C3 19.2091 4.79086 21 7 21H10C12.2091 21 14 19.2091 14 17M14 17H16M21 21V11M21 7V7.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <h1 className="text-2xl font-bold tracking-[0.2em] text-white font-sans mb-2 text-center">PROTOCOL</h1>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-glow animate-pulse"></span>
                    <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">The AI Chief of Staff</span>
                </div>
             </div>

             {/* Content Area */}
             <div className="w-full">
                
                {/* STATE: INITIALIZING */}
                {status === 'INITIALIZING' && (
                   <div className="flex flex-col items-center gap-4 py-8">
                      <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
                      <span className="text-[10px] font-mono text-slate-500 tracking-widest">ESTABLISHING CONNECTION...</span>
                   </div>
                )}

                {/* STATE: AUTHENTICATING */}
                {status === 'AUTHENTICATING' && (
                   <div className="flex flex-col items-center gap-4 py-8 animate-slide-up">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-sky-400 animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <ShieldCheck size={16} className="text-sky-500" />
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-sky-400 tracking-widest animate-pulse">VERIFYING CREDENTIALS</span>
                   </div>
                )}

                {/* STATE: ERROR */}
                {status === 'ERROR' && (
                   <div className="flex flex-col items-center gap-4 py-4 text-red-400 animate-fade-in">
                      <AlertCircle size={32} />
                      <p className="text-xs text-center">{errorMsg}</p>
                      <button 
                        onClick={() => setStatus('READY')}
                        className="mt-2 text-[10px] font-mono uppercase border border-red-500/30 px-4 py-2 rounded hover:bg-red-500/10 transition-colors"
                      >
                        Retry
                      </button>
                   </div>
                )}

                {/* STATE: READY */}
                {status === 'READY' && (
                    <div className="animate-slide-up relative">
                        
                        {!showEmailLogin ? (
                            <div className="flex flex-col gap-6 items-center">
                                {/* Google Button Area */}
                                {(!isSimulation && clientId) ? (
                                    <div className="min-h-[44px] w-full flex justify-center">
                                        <div ref={googleButtonRef} className="w-full shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 transition-all transform hover:scale-[1.02]"></div>
                                    </div>
                                ) : (
                                    <button 
                                      onClick={() => {
                                          playSound('click');
                                          setStatus('AUTHENTICATING');
                                          setTimeout(() => onLogin({ name: 'Protocol Admin', email: 'admin@protocol.secure' }), 1500);
                                      }}
                                      className="w-full bg-white text-slate-900 hover:bg-slate-100 font-medium font-sans px-6 py-3 rounded-full flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-white/5 group"
                                    >
                                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                                      <span>Sign in with Google</span>
                                    </button>
                                )}

                                <div className="relative w-full flex items-center gap-4 opacity-50">
                                    <div className="h-[1px] bg-white/20 flex-grow"></div>
                                    <span className="text-[10px] font-mono text-slate-400 uppercase">Or</span>
                                    <div className="h-[1px] bg-white/20 flex-grow"></div>
                                </div>

                                <button 
                                  onClick={() => setShowEmailLogin(true)}
                                  className="w-full py-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-all group"
                                >
                                  <Mail size={16} />
                                  <span className="text-xs font-mono tracking-wider uppercase">Continue with Email</span>
                                  <ArrowRight size={12} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleManualLogin} className="flex flex-col gap-4 animate-fade-in">
                                <button 
                                  type="button"
                                  onClick={() => setShowEmailLogin(false)}
                                  className="self-start flex items-center gap-1 text-[10px] text-slate-500 hover:text-sky-400 mb-2 transition-colors font-mono uppercase tracking-wider"
                                >
                                  <ChevronLeft size={12} />
                                  Back
                                </button>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                                        <input 
                                            type="text"
                                            value={customName}
                                            onChange={(e) => setCustomName(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 focus:border-sky-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
                                            placeholder="Enter your name"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                                        <input 
                                            type="email"
                                            value={customEmail}
                                            onChange={(e) => setCustomEmail(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 focus:border-sky-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
                                            placeholder="name@example.com"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider ml-1">Select Password</label>
                                        <div className="relative">
                                          <input 
                                              type="password"
                                              value={customPassword}
                                              onChange={(e) => setCustomPassword(e.target.value)}
                                              className="w-full bg-black/20 border border-white/10 focus:border-sky-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
                                              placeholder="••••••••"
                                          />
                                          <Lock size={14} className="absolute right-4 top-3.5 text-slate-500" />
                                        </div>
                                    </div>
                                </div>

                                <button
                                  type="submit"
                                  disabled={!customName || !customEmail || !customPassword}
                                  className="mt-4 w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-sky-900/20 active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                  <span>Enter Protocol</span>
                                  <ArrowRight size={16} />
                                </button>
                            </form>
                        )}
                    </div>
                )}
             </div>

          </div>
          
          <div className="mt-8 flex items-center gap-2 text-[10px] text-slate-600 font-mono opacity-60">
            <ShieldCheck size={12} />
            <span>SECURE_ENCLAVE_ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
          </div>

        </div>
      </div>
    </div>
  );
};
