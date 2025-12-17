import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowRight, Fingerprint, Lock, Mail, User, CheckCircle2, Send } from 'lucide-react';
import { playSound } from '../utils/audio';
import { auth, googleProvider } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  updateProfile, 
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';
import { ProtocolLogo } from './ProtocolLogo';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export const LoginScreen: React.FC = () => {
  const [status, setStatus] = useState<'INITIALIZING' | 'READY' | 'AUTHENTICATING' | 'ERROR' | 'VERIFICATION_SENT' | 'RESET_LINK_SENT'>('INITIALIZING');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>('LOGIN');
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    // Simulated boot sequence
    const timer = setTimeout(() => {
        playSound('boot');
        setStatus('READY');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const getErrorMessage = (error: any) => {
    console.error("Auth Error:", error.code, error.message);
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Password or Email Incorrect.';
      case 'auth/email-already-in-use':
        return 'User already exists. Sign in?';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in cancelled.';
      default:
        return error.message || 'Authentication failed.';
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (mode === 'FORGOT_PASSWORD') {
        playSound('click');
        setStatus('AUTHENTICATING');
        setErrorMsg('');
        try {
            await sendPasswordResetEmail(auth, email);
            setStatus('RESET_LINK_SENT');
            playSound('success');
        } catch (error: any) {
            setStatus('ERROR');
            setErrorMsg(getErrorMessage(error));
            playSound('error');
        }
        return;
    }

    if (!password) return;

    if (mode === 'REGISTER') {
        if (!name) return;
        if (password !== confirmPassword) {
            setErrorMsg("Passwords do not match.");
            playSound('error');
            return;
        }
    }

    playSound('click');
    setStatus('AUTHENTICATING');
    setErrorMsg('');

    try {
        if (mode === 'REGISTER') {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (name) await updateProfile(userCredential.user, { displayName: name });
            await sendEmailVerification(userCredential.user);
            await signOut(auth);
            setStatus('VERIFICATION_SENT');
            playSound('success');
        } else {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            if (!userCredential.user.emailVerified) {
                await signOut(auth);
                setStatus('ERROR');
                setErrorMsg("Please verify your email address before logging in.");
                playSound('error');
                return;
            }
            playSound('success');
        }
    } catch (error: any) {
        setStatus('ERROR');
        setErrorMsg(getErrorMessage(error));
        playSound('error');
    }
  };

  const handleGoogleLogin = async () => {
    playSound('click');
    setStatus('AUTHENTICATING');
    setErrorMsg('');

    try {
        const result = await signInWithPopup(auth, googleProvider);
        if (!result.user.emailVerified) {
             await signOut(auth);
             setStatus('ERROR');
             setErrorMsg("Google account email not verified.");
             playSound('error');
             return;
        }
        playSound('success');
    } catch (error: any) {
        setStatus('ERROR');
        setErrorMsg(getErrorMessage(error));
        playSound('error');
    }
  };

  const switchMode = () => {
    playSound('click');
    if (mode === 'LOGIN') {
        setMode('REGISTER');
    } else {
        setMode('LOGIN');
    }
    setErrorMsg('');
    setName('');
  };

  const handleForgotPasswordClick = () => {
      playSound('click');
      setMode('FORGOT_PASSWORD');
      setErrorMsg('');
  };

  const handleReturnToLogin = () => {
      playSound('click');
      setStatus('READY');
      setMode('LOGIN');
      setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-protocol-obsidian text-protocol-platinum flex items-center justify-center p-4 overflow-hidden font-sans transition-colors duration-500">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/10 blur-[120px] rounded-full pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 w-full max-w-[400px] animate-fade-in">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-protocol-charcoal rounded-2xl border border-protocol-border shadow-heavy flex items-center justify-center mb-5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <ProtocolLogo size={32} className="text-protocol-platinum" />
            </div>
            <h1 className="text-3xl font-heading font-bold tracking-tight text-protocol-platinum mb-1.5">PROTOCOL</h1>
            <p className="text-[10px] font-mono text-protocol-muted uppercase tracking-[0.3em]">Your AI Chief of Staff</p>
        </div>

        {/* Card - Rounded */}
        <div className="bg-protocol-charcoal/80 backdrop-blur-xl border border-protocol-border rounded-3xl shadow-heavy p-6 relative overflow-hidden">
            
            {/* Status Overlays */}
            {status === 'INITIALIZING' && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-protocol-charcoal z-20">
                     <div className="w-6 h-6 border-2 border-protocol-border border-t-protocol-platinum rounded-full animate-spin mb-3"></div>
                     <span className="text-[9px] font-mono text-protocol-muted animate-pulse uppercase tracking-widest">System Boot...</span>
                 </div>
            )}

            {/* Forms */}
            <div className={`transition-opacity duration-500 ${status === 'INITIALIZING' ? 'opacity-0' : 'opacity-100'}`}>
                
                {status === 'AUTHENTICATING' ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-protocol-charcoal/95 z-20 backdrop-blur-sm animate-fade-in">
                         <Fingerprint size={40} className="text-protocol-platinum animate-pulse mb-3" />
                         <span className="text-[9px] font-mono text-protocol-platinum tracking-widest uppercase">Processing Request</span>
                     </div>
                ) : status === 'VERIFICATION_SENT' ? (
                     <div className="flex flex-col items-center justify-center text-center animate-fade-in">
                         <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mb-5 border border-emerald-500/20">
                             <Send size={24} className="text-emerald-500 ml-0.5" />
                         </div>
                         <h2 className="text-base font-heading font-bold text-protocol-platinum mb-2">Check your email</h2>
                         <p className="text-protocol-muted text-xs mb-5 leading-relaxed">
                            Verification email sent to <span className="text-protocol-platinum font-medium">{email}</span>.
                         </p>
                         <button onClick={handleReturnToLogin} className="w-full h-10 bg-protocol-platinum text-protocol-obsidian font-bold text-[10px] uppercase tracking-widest hover:bg-protocol-muted transition-all rounded-xl">
                            Sign In
                         </button>
                     </div>
                ) : (
                    <>
                        {mode !== 'FORGOT_PASSWORD' && (
                            <>
                                <button 
                                    onClick={handleGoogleLogin}
                                    className="w-full h-10 bg-protocol-platinum text-protocol-obsidian hover:bg-protocol-muted rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-all mb-5 group shadow-lg"
                                >
                                    <GoogleIcon />
                                    <span>Continue with Google</span>
                                </button>

                                <div className="relative flex items-center justify-center mb-5">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-protocol-border"></div>
                                    </div>
                                    <span className="relative bg-protocol-charcoal px-2 text-[9px] text-protocol-muted font-mono uppercase tracking-wider">
                                        Or use email
                                    </span>
                                </div>
                            </>
                        )}

                        <form onSubmit={handleEmailAuth} className="space-y-3">
                            {status === 'ERROR' && (
                                <div className="flex items-center gap-2 text-protocol-swissRed bg-red-900/10 p-2 border border-red-900/20 text-[10px] font-mono animate-slide-up rounded-lg">
                                    <AlertCircle size={12} />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {mode === 'REGISTER' && (
                                <div className="group relative animate-slide-up">
                                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-protocol-muted group-focus-within:text-protocol-platinum transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="FULL NAME" 
                                        value={name} 
                                        onChange={e => setName(e.target.value)}
                                        className="w-full bg-protocol-input border border-protocol-border rounded-xl px-9 py-2.5 text-[11px] font-mono focus:border-protocol-muted focus:bg-protocol-input focus:outline-none transition-all placeholder:text-protocol-muted/50 text-protocol-platinum"
                                        required
                                    />
                                </div>
                            )}

                            <div className="group relative">
                                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-protocol-muted group-focus-within:text-protocol-platinum transition-colors" />
                                <input 
                                    type="email" 
                                    placeholder="EMAIL ADDRESS" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-protocol-input border border-protocol-border rounded-xl px-9 py-2.5 text-[11px] font-mono focus:border-protocol-muted focus:bg-protocol-input focus:outline-none transition-all placeholder:text-protocol-muted/50 text-protocol-platinum"
                                    required
                                />
                            </div>

                            {mode !== 'FORGOT_PASSWORD' && (
                                <div className="group relative animate-slide-up">
                                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-protocol-muted group-focus-within:text-protocol-platinum transition-colors" />
                                    <input 
                                        type="password" 
                                        placeholder="PASSWORD" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-protocol-input border border-protocol-border rounded-xl px-9 py-2.5 text-[11px] font-mono focus:border-protocol-muted focus:bg-protocol-input focus:outline-none transition-all placeholder:text-protocol-muted/50 text-protocol-platinum"
                                        required
                                    />
                                    {mode === 'LOGIN' && (
                                        <button 
                                            type="button" 
                                            onClick={handleForgotPasswordClick}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[8px] text-protocol-muted hover:text-protocol-platinum transition-colors uppercase tracking-widest"
                                        >
                                            Forgot?
                                        </button>
                                    )}
                                </div>
                            )}

                            {mode === 'REGISTER' && (
                                <div className="group relative animate-slide-up">
                                    <CheckCircle2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-protocol-muted group-focus-within:text-protocol-platinum transition-colors" />
                                    <input 
                                        type="password" 
                                        placeholder="CONFIRM PASSWORD" 
                                        value={confirmPassword} 
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full bg-protocol-input border border-protocol-border rounded-xl px-9 py-2.5 text-[11px] font-mono focus:border-protocol-muted focus:bg-protocol-input focus:outline-none transition-all placeholder:text-protocol-muted/50 text-protocol-platinum"
                                        required
                                    />
                                </div>
                            )}

                            <button 
                                type="submit" 
                                className="w-full h-10 bg-protocol-platinum text-protocol-obsidian font-bold text-[10px] uppercase tracking-widest hover:bg-protocol-muted transition-all mt-3 flex items-center justify-center gap-2 group rounded-xl shadow-lg"
                            >
                                <span>
                                    {mode === 'LOGIN' ? 'Access System' : 
                                     mode === 'REGISTER' ? 'Create Identity' : 
                                     'Send Reset Link'}
                                </span>
                                {mode !== 'FORGOT_PASSWORD' && <ArrowRight size={12} className="text-black/50 group-hover:text-black transition-colors" />}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <button 
                                type="button" 
                                onClick={mode === 'FORGOT_PASSWORD' ? handleReturnToLogin : switchMode} 
                                className="text-[9px] text-protocol-muted hover:text-protocol-platinum uppercase tracking-widest transition-colors border-b border-transparent hover:border-protocol-muted pb-0.5"
                            >
                                {mode === 'LOGIN' ? "Create New Identity" : "Return to Login"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};