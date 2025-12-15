
import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Mail, ChevronLeft, Fingerprint, Facebook } from 'lucide-react';
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
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const googleButtonRef = useRef<HTMLDivElement>(null);
  
  const getEnv = (key: string) => {
    try { return process.env[key]; } catch { return undefined; }
  };
  const clientId = getEnv('GOOGLE_CLIENT_ID') || getEnv('REACT_APP_GOOGLE_CLIENT_ID');

  const decodeJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) { return null; }
  };

  const handleCredentialResponse = (response: any) => {
    playSound('success');
    setStatus('AUTHENTICATING');
    const profile = decodeJwt(response.credential);
    if (profile) {
      setTimeout(() => {
        const fullName = profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(' ') || 'Authorized User';
        onLogin({ name: fullName, email: profile.email, picture: profile.picture });
      }, 1500);
    } else {
      playSound('error');
      setStatus('ERROR');
      setErrorMsg('Biometric Verification Failed');
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
        picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(customName)}&background=ffffff&color=000&bold=true`
      });
    }, 1500);
  };

  useEffect(() => {
    const timer = setTimeout(() => playSound('boot'), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
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
        if (window.google?.accounts?.id) { setStatus('READY'); } else { setIsSimulation(true); setStatus('READY'); }
      }
    }, 3000);
    return () => { clearInterval(checkInterval); clearTimeout(timeout); };
  }, [clientId, status, isSimulation]);

  useEffect(() => {
    if (status === 'READY' && !isSimulation && googleButtonRef.current && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: true,
          theme: 'outline',
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, { theme: 'outline', size: 'large', shape: 'pill', width: '100%', text: 'continue_with' });
      } catch (err) { setIsSimulation(true); }
    }
  }, [status, clientId, isSimulation, showEmailLogin]);

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold tracking-[0.2em] mb-2 font-sans">PROTOCOL</h1>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.3em]">System Version 2.0</p>
        </div>

        <div className="bg-[#111] border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
             {status === 'INITIALIZING' && (
                <div className="flex flex-col items-center py-10 gap-4">
                   <div className="w-12 h-12 border-2 border-white/10 border-t-white rounded-full animate-spin"></div>
                   <span className="text-xs font-mono text-gray-500 animate-pulse">BOOT SEQUENCE...</span>
                </div>
             )}

             {status === 'AUTHENTICATING' && (
                <div className="flex flex-col items-center py-10 gap-4 animate-slide-up">
                   <Fingerprint size={48} className="text-emerald-500 animate-pulse" />
                   <span className="text-xs font-mono text-emerald-500 tracking-widest">VERIFYING BIOMETRICS</span>
                </div>
             )}

             {status === 'ERROR' && (
                <div className="text-center py-6 text-red-500">
                   <AlertCircle size={32} className="mx-auto mb-2" />
                   <p className="text-xs">{errorMsg}</p>
                   <button onClick={() => setStatus('READY')} className="mt-4 text-xs underline">RETRY</button>
                </div>
             )}

             {status === 'READY' && (
                <div className="animate-slide-up">
                    {!showEmailLogin ? (
                        <div className="space-y-3">
                            {/* Google Option */}
                            {!isSimulation && clientId ? (
                                <div ref={googleButtonRef} className="h-12 w-full overflow-hidden rounded-full"></div>
                            ) : (
                                <button 
                                  onClick={() => { playSound('click'); setStatus('AUTHENTICATING'); setTimeout(() => onLogin({ name: 'Admin', email: 'admin@protocol.ai' }), 1500); }}
                                  className="w-full h-12 bg-white text-black font-medium rounded-full hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                                >
                                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"></path></svg>
                                  <span>Continue with Google</span>
                                </button>
                            )}
                            
                            {/* Facebook Option */}
                            <button 
                                onClick={() => {
                                    playSound('click');
                                    setStatus('AUTHENTICATING');
                                    setTimeout(() => {
                                        onLogin({ name: 'Protocol User', email: 'user@facebook.com', picture: 'https://ui-avatars.com/api/?name=Protocol+User&background=1877F2&color=fff' });
                                    }, 1500);
                                }}
                                className="w-full h-12 bg-[#1877F2] text-white font-medium rounded-full hover:bg-[#166fe5] transition-colors flex items-center justify-center gap-2"
                            >
                                <Facebook size={20} fill="currentColor" />
                                <span>Continue with Facebook</span>
                            </button>

                            <div className="relative flex py-1 items-center">
                                <div className="flex-grow border-t border-white/10"></div>
                                <span className="flex-shrink-0 mx-4 text-gray-500 text-[10px] uppercase tracking-widest">Or</span>
                                <div className="flex-grow border-t border-white/10"></div>
                            </div>

                            {/* Email Option */}
                            <button 
                              onClick={() => setShowEmailLogin(true)}
                              className="w-full h-12 bg-zinc-900 border border-white/10 rounded-full text-sm hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 text-gray-300 hover:text-white"
                            >
                              <Mail size={18} />
                              <span>Continue with Email</span>
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleManualLogin} className="space-y-4">
                            <button type="button" onClick={() => setShowEmailLogin(false)} className="text-xs text-gray-500 hover:text-white flex items-center gap-1 mb-2">
                               <ChevronLeft size={12} /> Back
                            </button>
                            <input 
                                type="text" placeholder="Full Name" value={customName} onChange={e => setCustomName(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors"
                            />
                            <input 
                                type="email" placeholder="Email" value={customEmail} onChange={e => setCustomEmail(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors"
                            />
                            <input 
                                type="password" placeholder="Password" value={customPassword} onChange={e => setCustomPassword(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors"
                            />
                            <button type="submit" disabled={!customName} className="w-full bg-blue-600 hover:bg-blue-500 text-white h-12 rounded-xl font-medium transition-colors">
                                Access System
                            </button>
                        </form>
                    )}
                </div>
             )}
        </div>
        <p className="mt-8 text-center text-[10px] text-gray-600 font-mono">SECURE CONNECTION ESTABLISHED</p>
      </div>
    </div>
  );
};
