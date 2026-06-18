// app/components/Login.jsx 
import React, { useState, useEffect } from 'react';
import { Lock, Mail, Eye, EyeOff, Camera, AlertCircle, CheckCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL + "/api";

const Login = ({ onLoginSuccess }) => {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginOptions, setLoginOptions] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const verificationIntervalRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (verificationIntervalRef.current) {
        clearInterval(verificationIntervalRef.current);
      }
    };
  }, []);

  // ===== 🔥 MAIN FIX: Fetch complete user details with accesses =====
  const fetchCompleteUserDetails = async (userId) => {
    try {
      console.log('🔄 [FETCH USER] Starting fetch for User ID:', userId);
      
      const userDetailsUrl = `${API_BASE}/users/${userId}`;
      console.log('📡 [FETCH USER] API Call:', userDetailsUrl);
      
      const userDetailsRes = await fetch(userDetailsUrl);
      console.log('📥 [FETCH USER] Response Status:', userDetailsRes.status);
      
      if (!userDetailsRes.ok) {
        const errorText = await userDetailsRes.text();
        console.error('❌ [FETCH USER] Failed to fetch user details:', errorText);
        return null;
      }
      
      const completeUserData = await userDetailsRes.json();
      console.log('✅ [FETCH USER] Complete User Data Received:', completeUserData);
      console.log('🔍 [FETCH USER] User ID:', completeUserData.id);
      console.log('🔍 [FETCH USER] Full Name:', completeUserData.full_name);
      console.log('🔍 [FETCH USER] Email:', completeUserData.email);
      console.log('🔍 [FETCH USER] Accesses Array:', completeUserData.accesses);
      console.log('🔍 [FETCH USER] Total Accesses:', completeUserData.accesses?.length || 0);
      
      // Log each access in detail
      if (completeUserData.accesses && completeUserData.accesses.length > 0) {
        completeUserData.accesses.forEach((access, index) => {
          console.log(`🎯 [FETCH USER] Access ${index + 1}:`, {
            id: access.id,
            company: access.company?.name,
            plant: access.plant?.name || 'Company Level',
            role: access.role?.name,
            department: access.department?.name,
            designation: access.designation?.name,
            is_primary_company: access.is_primary_company,
            is_primary_plant: access.is_primary_plant
          });
        });
      } else {
        console.error('❌ [FETCH USER] NO ACCESSES FOUND IN USER DATA!');
      }
      
      return completeUserData;
      
    } catch (error) {
      console.error('❌ [FETCH USER] Error fetching complete user details:', error);
      return null;
    }
  };

  // ===== Fetch user menu =====
  const fetchUserMenu = async (userId) => {
    try {
      console.log('🔄 [FETCH MENU] Fetching user menu for User ID:', userId);
      
      const userDetailsUrl = `${API_BASE}/users/${userId}`;
      const userDetailsRes = await fetch(userDetailsUrl);
      
      if (!userDetailsRes.ok) {
        console.error('❌ [FETCH MENU] Failed to fetch user details for menu');
        return null;
      }
      
      const userDetails = await userDetailsRes.json();
      console.log('📋 [FETCH MENU] User details received:', userDetails);
      
      const primaryAccess = userDetails.accesses?.find(acc => acc.is_primary_company);
      console.log('🎯 [FETCH MENU] Primary access:', primaryAccess);
      
      if (!primaryAccess) {
        console.warn('⚠️ [FETCH MENU] No primary company found');
        
        if (userDetails.accesses && userDetails.accesses.length > 0) {
          const firstAccess = userDetails.accesses[0];
          const primaryCompanyId = firstAccess.company.id;
          console.log('🔄 [FETCH MENU] Using first access company ID:', primaryCompanyId);
          
          const menuUrl = `${API_BASE}/rbac/users/${userId}/accessible-menu?company_id=${primaryCompanyId}`;
          console.log('📡 [FETCH MENU] Menu API Call:', menuUrl);
          
          const menuRes = await fetch(menuUrl);
          
          if (!menuRes.ok) {
            console.error('❌ [FETCH MENU] Failed to fetch menu');
            return null;
          }
          
          const menuData = await menuRes.json();
          console.log('✅ [FETCH MENU] Menu fetched successfully');
          return menuData;
        }
        
        return null;
      }
      
      const primaryCompanyId = primaryAccess.company.id;
      console.log('🎯 [FETCH MENU] Using primary company ID:', primaryCompanyId);
      
      const menuUrl = `${API_BASE}/rbac/users/${userId}/accessible-menu?company_id=${primaryCompanyId}`;
      console.log('📡 [FETCH MENU] Menu API Call:', menuUrl);
      
      const menuRes = await fetch(menuUrl);
      
      if (!menuRes.ok) {
        console.error('❌ [FETCH MENU] Failed to fetch menu');
        return null;
      }
      
      const menuData = await menuRes.json();
      console.log('✅ [FETCH MENU] Menu fetched successfully');
      return menuData;
      
    } catch (error) {
      console.error('❌ [FETCH MENU] Error fetching user menu:', error);
      return null;
    }
  };

  const handleEmailSubmit = async () => {
    setMessage({ type: '', text: '' });
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);

      const response = await fetch(`${API_BASE}/auth/check-login-options`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setLoginOptions(data.login_options);
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
      console.log('🔐 [LOGIN] Starting password login for:', email);
      
      const formData = new FormData();
      formData.append('user_id', email);
      formData.append('password', password);

      const response = await fetch(`${API_BASE}/auth/login/password`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [LOGIN] Login Success - Initial Response:', data);
        console.log('👤 [LOGIN] User Object from Login:', data.user);
        console.log('🆔 [LOGIN] User ID:', data.user?.id);
        
        if (!data.user || !data.user.id) {
          console.error('❌ [LOGIN] User ID not found in login response!');
          setMessage({ type: 'error', text: 'Login data incomplete. Please try again.' });
          setLoading(false);
          return;
        }
        
        setMessage({ type: 'info', text: 'Loading your workspace...' });
        
        // 🔥 FIX: Fetch complete user details with accesses
        console.log('🚀 [LOGIN] Step 1: Fetching complete user details...');
        const completeUserDetails = await fetchCompleteUserDetails(data.user.id);
        
        if (completeUserDetails) {
          console.log('✅ [LOGIN] Step 2: Complete user details received!');
          console.log('📦 [LOGIN] Complete User Data:', completeUserDetails);
          console.log('🔐 [LOGIN] Accesses in Complete Data:', completeUserDetails.accesses);
          console.log('📊 [LOGIN] Total Accesses:', completeUserDetails.accesses?.length || 0);
          
          // 🔥 CRITICAL: Validate accesses array
          if (!completeUserDetails.accesses || completeUserDetails.accesses.length === 0) {
            console.error('❌ [LOGIN] CRITICAL ERROR: No accesses found for user!');
            console.error('❌ [LOGIN] User might not have company/plant access assigned!');
            setMessage({ 
              type: 'error', 
              text: 'No company access found for this user. Please contact admin to assign company access.' 
            });
            setLoading(false);
            return;
          }
          
          // 🔥 CRITICAL: Replace basic user object with complete details
          data.user = completeUserDetails;
          
          console.log('✅ [LOGIN] Step 3: User object replaced with complete details');
          console.log('📋 [LOGIN] Final User Object:', data.user);
          console.log('🎯 [LOGIN] Final Accesses Array:', data.user.accesses);
          console.log('📊 [LOGIN] Final Accesses Count:', data.user.accesses.length);
          
        } else {
          console.error('⚠️ [LOGIN] Could not fetch complete user details - LOGIN WILL FAIL!');
          setMessage({ 
            type: 'error', 
            text: 'Could not load user details. Please try again or contact admin.' 
          });
          setLoading(false);
          return;
        }
        
        // Fetch user menu
        console.log('🚀 [LOGIN] Step 4: Fetching user menu...');
        const menuData = await fetchUserMenu(data.user.id);
        
        if (menuData) {
          console.log('✅ [LOGIN] Step 5: Menu data received, storing in sessionStorage');
          sessionStorage.setItem('userMenu', JSON.stringify(menuData));
          data.userMenu = menuData;
        } else {
          console.warn('⚠️ [LOGIN] No menu data received');
        }
        
        setMessage({ type: 'success', text: 'Login successful!' });
        
        console.log('🎯 [LOGIN] Final Login Data Package:', {
          user_id: data.user.id,
          user_name: data.user.full_name,
          email: data.user.email,
          has_accesses: !!data.user.accesses,
          accesses_count: data.user.accesses?.length || 0,
          first_access: data.user.accesses?.[0],
          access_token: data.access_token
        });
        
        setTimeout(() => {
          console.log('🎯 [LOGIN] Calling onLoginSuccess with complete data');
          onLoginSuccess(data);
        }, 1000);
      } else {
        const error = await response.json();
        console.error('❌ [LOGIN] Login failed:', error);
        setMessage({ type: 'error', text: error.detail || 'Invalid credentials' });
      }
    } catch (error) {
      console.error('❌ [LOGIN] Login error:', error);
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const startCamera = () => {
    setMessage({ type: 'info', text: 'Starting camera...' });
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
        setMessage({ type: 'success', text: 'Camera ready! Position your face...' });
        
        setTimeout(() => {
          startAutoVerification();
        }, 1000);
        
      } catch (err) {
        console.error('Camera error:', err);
        if (streamCopy) streamCopy.getTracks().forEach(t => t.stop());
        setIsCameraActive(false);

        if (err.name === 'NotAllowedError') {
          setMessage({ type: 'error', text: 'Camera permission denied.' });
        } else if (err.name === 'NotFoundError') {
          setMessage({ type: 'error', text: 'No camera found.' });
        } else {
          setMessage({ type: 'error', text: `Failed to access camera: ${err.message}` });
        }
      }
    })();

    return () => {
      if (streamCopy) streamCopy.getTracks().forEach(t => t.stop());
      if (verificationIntervalRef.current) {
        clearInterval(verificationIntervalRef.current);
      }
    };
  }, [isCameraActive]);

  const startAutoVerification = () => {
    if (verificationIntervalRef.current) {
      clearInterval(verificationIntervalRef.current);
    }

    verificationIntervalRef.current = setInterval(() => {
      autoCapturAndVerify();
    }, 500);
  };

  const autoCapturAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current || loading) return;
    
    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    await verifyFace(imageDataUrl);
  };

  const verifyFace = async (imageData) => {
    if (loading) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('video_frame', imageData);

      const response = await fetch(`${API_BASE}/auth/login/face-live`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: `Face recognized! Match: ${data.match_score}%` });
        
        // 🔥 FIX: Fetch complete user details for face login too
        console.log('🚀 [FACE LOGIN] Fetching complete user details after face login...');
        const completeUserDetails = await fetchCompleteUserDetails(data.user.id);
        
        if (completeUserDetails) {
          console.log('✅ [FACE LOGIN] Complete user details fetched!');
          
          if (!completeUserDetails.accesses || completeUserDetails.accesses.length === 0) {
            console.error('❌ [FACE LOGIN] No accesses found for user!');
            setMessage({ 
              type: 'error', 
              text: 'No company access found. Please contact admin.' 
            });
            setLoading(false);
            stopCamera();
            return;
          }
          
          data.user = completeUserDetails;
        }
        
        const menuData = await fetchUserMenu(data.user.id);
        if (menuData) {
          sessionStorage.setItem('userMenu', JSON.stringify(menuData));
          data.userMenu = menuData;
        }
        
        stopCamera();
        setTimeout(() => onLoginSuccess(data), 800);
      } else {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (verificationIntervalRef.current) {
      clearInterval(verificationIntervalRef.current);
    }
    setIsCameraActive(false);
    setMessage({ type: '', text: '' });
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

              {loginOptions.face && (
                <button
                  onClick={() => setStep('face')}
                  className="w-full flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
                >
                  <Camera className="w-6 h-6 text-purple-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Face Recognition</div>
                    <div className="text-xs text-gray-500">Auto-login with your face</div>
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
                {isCameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      AUTO SCANNING
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-3">
                    <Camera className="w-16 h-16 opacity-30" />
                    <span className="text-sm">Start camera for auto face login</span>
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
                    Start Auto Recognition
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="w-full py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all font-medium border border-red-200"
                  >
                    Stop Camera
                  </button>
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

export default Login;
