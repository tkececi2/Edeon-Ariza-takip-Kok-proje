import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Anasayfa } from './pages/Anasayfa';
import { Arizalar } from './pages/Arizalar';
import { ArizaDetay } from './pages/ArizaDetay';
import { Ekip } from './pages/Ekip';
import { Sahalar } from './pages/Sahalar';
import { StokKontrol } from './pages/StokKontrol';
import { Istatistikler } from './pages/Istatistikler';
import { Performans } from './pages/Performans';
import { Raporlar } from './pages/Raporlar';
import { Ayarlar } from './pages/Ayarlar';
import { Musteriler } from './pages/Musteriler';
import { NobetKontrol } from './pages/NobetKontrol';
import { YapilanIsler } from './pages/YapilanIsler';
import { ElektrikKesintileri } from './pages/ElektrikKesintileri';
import { InvertorKontrol } from './pages/InvertorKontrol';
import { MekanikBakim } from './pages/MekanikBakim';
import { ElektrikBakim } from './pages/ElektrikBakim';
import { GesYonetimi } from './pages/GesYonetimi';
import { GesSahalari } from './pages/GesSahalari';
import { UretimVerileri } from './pages/UretimVerileri';
import { BakimRaporlari } from './pages/BakimRaporlari';
import { PrivateRoute } from './components/PrivateRoute';
import { LoadingSpinner } from './components/LoadingSpinner';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/anasayfa" element={<Anasayfa />} />
        <Route path="/arizalar" element={<Arizalar />} />
        <Route path="/arizalar/:id" element={<ArizaDetay />} />
        <Route path="/sahalar" element={<Sahalar />} />
        <Route path="/stok-kontrol" element={<StokKontrol />} />
        <Route path="/ekip" element={<Ekip />} />
        <Route path="/istatistikler" element={<Istatistikler />} />
        <Route path="/performans" element={<Performans />} />
        <Route path="/raporlar" element={<Raporlar />} />
        <Route path="/ayarlar" element={<Ayarlar />} />
        <Route path="/musteriler" element={<Musteriler />} />
        <Route path="/nobet-kontrol" element={<NobetKontrol />} />
        <Route path="/yapilan-isler" element={<YapilanIsler />} />
        <Route path="/elektrik-kesintileri" element={<ElektrikKesintileri />} />
        <Route path="/invertor-kontrol" element={<InvertorKontrol />} />
        <Route path="/mekanik-bakim" element={<MekanikBakim />} />
        <Route path="/elektrik-bakim" element={<ElektrikBakim />} />
        <Route path="/bakim-raporlari" element={<BakimRaporlari />} />
        <Route path="/ges-yonetimi" element={<GesYonetimi />} />
        <Route path="/ges-sahalari" element={<GesSahalari />} />
        <Route path="/uretim-verileri" element={<UretimVerileri />} />
      </Route>
      <Route path="/" element={<Navigate to="/anasayfa" replace />} />
      <Route path="*" element={<Navigate to="/anasayfa" replace />} />
    </Routes>
  );
}

export default App;