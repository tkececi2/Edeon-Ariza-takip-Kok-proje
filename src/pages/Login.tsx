import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sun, Mail, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { girisYap, kullanici } = useAuth();

  useEffect(() => {
    const isLoggedOut = sessionStorage.getItem('isLoggedOut') === 'true' || 
                       localStorage.getItem('isLoggedOut') === 'true';
    
    if (isLoggedOut) {
      return;
    }

    if (kullanici) {
      const from = (location.state as any)?.from?.pathname || '/anasayfa';
      navigate(from, { replace: true });
    }
  }, [kullanici, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await girisYap(email, password);
      if (success) {
        const from = (location.state as any)?.from?.pathname || '/anasayfa';
        navigate(from, { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Sun className="h-6 w-6 text-primary-500" />,
      title: "Solar Panel İzleme",
      description: "Güneş enerjisi sistemlerinizi 7/24 uzaktan izleme ve kontrol"
    },
    {
      icon: <ArrowRight className="h-6 w-6 text-primary-500" />,
      title: "Hızlı Müdahale",
      description: "Arıza durumlarında anında bildirim ve hızlı teknik destek"
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-primary-500" />,
      title: "Verimlilik Analizi",
      description: "Detaylı raporlama ve performans analizi ile maksimum verim"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Arkaplan deseni */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      <div className="relative flex min-h-screen">
        {/* Sol Bölüm - Tanıtım */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-50 to-primary-100 p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-primary-500/5 backdrop-blur-[1px]"></div>
          
          <div className="relative">
            <div className="flex items-center space-x-3">
              <Sun className="h-12 w-12 text-primary-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">EDEON ENERJİ</h1>
                <p className="text-sm text-gray-600">Solar Enerjinin Gücü</p>
              </div>
            </div>

            <div className="mt-12 space-y-12 animate-fade-in">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Solar Panel Arıza Takip Sistemi
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  Güneş enerjisi sistemlerinizi profesyonel bir şekilde yönetin, 
                  arızaları anında tespit edin ve çözüm süreçlerini takip edin.
                </p>
              </div>

              <div className="space-y-8">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-4 animate-slide-in">
                    <div className="flex-shrink-0 p-3 bg-white rounded-lg shadow-md">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {feature.title}
                      </h3>
                      <p className="mt-1 text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} EDEON ENERJİ. Tüm hakları saklıdır.
            </p>
          </div>
        </div>

        {/* Sağ Bölüm - Giriş Formu */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8 animate-scale">
            <div className="text-center">
              <div className="lg:hidden flex justify-center mb-6">
                <Sun className="h-12 w-12 text-primary-500" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                Hoş Geldiniz
              </h2>
              <p className="mt-2 text-gray-600">
                Hesabınıza giriş yaparak sistemlerinizi yönetmeye başlayın
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-xl ring-1 ring-gray-900/5">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    E-posta adresi
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="ornek@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Şifre
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Giriş yapılıyor...</span>
                    </div>
                  ) : (
                    'Giriş Yap'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};