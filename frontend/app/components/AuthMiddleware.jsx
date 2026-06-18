// app/components/AuthMiddleware.jsx
'use client';
import React, { useState, useEffect } from 'react';
import { Lock, Mail, Eye, EyeOff, Fingerprint, Camera, AlertCircle, CheckCircle, User } from 'lucide-react';

// ==================== LOGIN COMPONENT ====================
const Login = ({ onLoginSuccess }) => {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginOptions, setLoginOptions] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleEmailSubmit = async () => {
    setMessage({ type: '', text: '' });
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);

      const response = await fetch('http://localhost:8000/api/auth/check-login-options', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setLoginOptions(data.login_options);
        setUserId(data.user_id);
        setStep('options');
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'User not found' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    setMessage({ type: '', text: '' });
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('user_id', email);
      formData.append('password', password);

      const response = await fetch('http://localhost:8000/api/auth/login/password', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: 'Login successful!' });
        setTimeout(() => onLoginSuccess(data), 1000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Invalid credentials' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFingerprintLogin = async () => {
    setMessage({ type: 'info', text: 'Please touch your fingerprint sensor...' });
    setMessage({ type: 'error', text: 'Fingerprint sensor not available in browser. Please use password login.' });
  };

  const startCamera = () => {
    setMessage({ type: 'info', text: 'Starting camera...' });
    setCapturedImage(null);
    setIsCameraActive(true);
  };

  React.useEffect(() => {
    if (!isCameraActive) return;

    let streamCopy = null;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
          audio: false
        });
        streamCopy = stream;

        const video = videoRef.current;
        if (!video) throw new Error('Video element not found');

        video.srcObject = stream;
        await new Promise((res, rej) => {
          video.onloadedmetadata = () => res();
          video.onerror = rej;
        });

        await video.play();
        streamRef.current = stream;
        setMessage({ type: 'success', text: 'Camera ready! Position your face and click Capture.' });
      } catch (err) {
        console.error('Camera error:', err);
        if (streamCopy) streamCopy.getTracks().forEach(t => t.stop());
        setIsCameraActive(false);
        setMessage({ type: 'error', text: err.name === 'NotAllowedError' ? 'Camera permission denied.' : 'No camera found.' });
      }
    })();

    return () => {
      if (streamCopy) streamCopy.getTracks().forEach(t => t.stop());
    };
  }, [isCameraActive]);

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    setIsCameraActive(false);
    setCapturedImage(null);
    setMessage({ type: '', text: '' });
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return setMessage({ type: 'error', text: 'Camera not ready.' });
    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return setMessage({ type: 'error', text: 'Video not ready.' });

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.95));
    setMessage({ type: 'success', text: 'Photo captured! Click "Login with Face" to proceed.' });
  };

  const handleFaceLogin = async () => {
    if (!capturedImage) return setMessage({ type: 'error', text: 'Please capture your face first!' });
    setMessage({ type: 'info', text: 'Verifying your face...' });
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('video_frame', capturedImage);

      const response = await fetch('http://localhost:8000/api/auth/login/face-live', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: `Login successful! Match: ${data.match_score}%` });
        stopCamera();
        setTimeout(() => onLoginSuccess(data), 1000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Face recognition failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const StatusMessage = ({ status }) => {
    if (!status.text) return null;
    const config = {
      success: { icon: <CheckCircle className="w-4 h-4" />, bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' },
      error: { icon: <AlertCircle className="w-4 h-4" />, bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
      info: { icon: <AlertCircle className="w-4 h-4" />, bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' }
    };
    const style = config[status.type];
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg border ${style.bg} ${style.text} ${style.border} text-sm mb-4`}>
        {style.icon}
        <span className="font-medium">{status.text}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-blue-500 px-6 py-8 text-center">
          <Lock className="w-16 h-16 text-white mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
          <p className="text-blue-100 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="p-6">
          <StatusMessage status={message} />

          {step === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
              </div>
              <button
                onClick={handleEmailSubmit}
                disabled={loading || !email}
                className="w-full py-3 bg-gradient-to-r from-slate-700 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Continue'}
              </button>
            </div>
          )}

          {step === 'options' && loginOptions && (
            <div className="space-y-3">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">Choose your login method</p>
              </div>

              {loginOptions.password && (
                <button
                  onClick={() => setStep('password')}
                  className="w-full flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <Lock className="w-6 h-6 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Password</div>
                    <div className="text-xs text-gray-500">Login with your password</div>
                  </div>
                </button>
              )}

              {loginOptions.fingerprint && (
                <button
                  onClick={handleFingerprintLogin}
                  className="w-full flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
                >
                  <Fingerprint className="w-6 h-6 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Fingerprint</div>
                    <div className="text-xs text-gray-500">Login with fingerprint sensor</div>
                  </div>
                </button>
              )}

              {loginOptions.face && (
                <button
                  onClick={() => setStep('face')}
                  className="w-full flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
                >
                  <Camera className="w-6 h-6 text-purple-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Face Recognition</div>
                    <div className="text-xs text-gray-500">Login with your face</div>
                  </div>
                </button>
              )}

              <button
                onClick={() => {
                  setStep('email');
                  setLoginOptions(null);
                  setMessage({ type: '', text: '' });
                }}
                className="w-full py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to email
              </button>
            </div>
          )}

          {step === 'password' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User ID / Email</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="User ID or Email"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your password"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button
                onClick={handlePasswordLogin}
                disabled={loading || !password}
                className="w-full py-3 bg-gradient-to-r from-slate-700 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button
                onClick={() => {
                  setStep('options');
                  setPassword('');
                  setMessage({ type: '', text: '' });
                }}
                className="w-full py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to login options
              </button>
            </div>
          )}

          {step === 'face' && (
            <div className="space-y-4">
              <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video relative shadow-xl">
                {isCameraActive && !capturedImage ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      LIVE
                    </div>
                  </>
                ) : capturedImage ? (
                  <>
                    <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
                    <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                      <CheckCircle className="w-3 h-3" />
                      CAPTURED
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-3">
                    <Camera className="w-16 h-16 opacity-30" />
                    <span className="text-sm">Camera preview will appear here</span>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex flex-col gap-2">
                {!isCameraActive ? (
                  <button
                    onClick={startCamera}
                    className="w-full py-3 bg-gradient-to-r from-slate-700 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                  >
                    <Camera className="w-5 h-5 inline mr-2" />
                    Start Camera
                  </button>
                ) : (
                  <>
                    <button
                      onClick={capturePhoto}
                      disabled={!!capturedImage || loading}
                      className={`w-full py-3 rounded-lg font-medium transition-all ${capturedImage || loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:shadow-lg'}`}
                    >
                      Capture Photo
                    </button>
                    <button
                      onClick={stopCamera}
                      className="w-full py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all font-medium border border-red-200"
                    >
                      Stop Camera
                    </button>
                  </>
                )}

                {capturedImage && (
                  <>
                    <button
                      onClick={handleFaceLogin}
                      disabled={loading}
                      className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50"
                    >
                      {loading ? 'Verifying...' : '✓ Login with Face'}
                    </button>
                    <button
                      onClick={() => {
                        setCapturedImage(null);
                        setMessage({ type: '', text: '' });
                      }}
                      className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
                    >
                      Retake Photo
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    stopCamera();
                    setStep('options');
                    setMessage({ type: '', text: '' });
                  }}
                  className="w-full py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Back to login options
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 text-center">
          <p className="text-xs text-gray-500">🔒 Secure login with multiple authentication methods</p>
        </div>
      </div>
    </div>
  );
};

// ==================== AUTH MIDDLEWARE ====================
const AuthMiddleware = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('userData');
    const flag = sessionStorage.getItem('isLoggedIn') === 'true';
    if (stored && flag) {
      try {
        const parsed = JSON.parse(stored);
        setUserData(parsed);
        setIsLoggedIn(true);
      } catch {
        sessionStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (data) => {
    sessionStorage.clear();
    sessionStorage.setItem('userData', JSON.stringify(data));
    sessionStorage.setItem('isLoggedIn', 'true');
    setUserData(data);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setUserData(null);
    setIsLoggedIn(false);
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return typeof children === 'function'
    ? children({ isLoggedIn, userData, onLogout: handleLogout })
    : children;
};

export default AuthMiddleware;