import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, Timestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  MessageSquare,
  MapPin,
  Building,
  Calendar,
  User,
  Image as ImageIcon,
  X,
  Send
} from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import type { Ariza } from '../types';

const durumRenkleri = {
  'acik': 'bg-red-100 text-red-800',
  'devam-ediyor': 'bg-yellow-100 text-yellow-800',
  'beklemede': 'bg-blue-100 text-blue-800',
  'cozuldu': 'bg-green-100 text-green-800'
};

const oncelikRenkleri = {
  'dusuk': 'bg-gray-100 text-gray-800',
  'orta': 'bg-blue-100 text-blue-800',
  'yuksek': 'bg-orange-100 text-orange-800',
  'acil': 'bg-red-100 text-red-800'
};

export const ArizaDetay: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { kullanici } = useAuth();
  const navigate = useNavigate();
  const [ariza, setAriza] = useState<Ariza | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yeniYorum, setYeniYorum] = useState('');
  const [yorumGonderiliyor, setYorumGonderiliyor] = useState(false);
  const [seciliFoto, setSeciliFoto] = useState<string | null>(null);
  const [cozumFormAcik, setCozumFormAcik] = useState(false);
  const [sahaAdi, setSahaAdi] = useState<string>('');
  const [cozumFormu, setCozumFormu] = useState({
    aciklama: '',
    malzemeler: [''],
    tamamlanmaTarihi: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });

  // Yönetici, tekniker veya mühendis kontrolü
  const canSolve = kullanici?.rol && ['yonetici', 'tekniker', 'muhendis'].includes(kullanici.rol);

  useEffect(() => {
    const veriGetir = async () => {
      if (!id || !kullanici) return;

      try {
        // Arıza verilerini getir
        const arizaRef = doc(db, 'arizalar', id);
        const arizaSnap = await getDoc(arizaRef);

        if (arizaSnap.exists()) {
          const arizaData = {
            id: arizaSnap.id,
            ...arizaSnap.data()
          } as Ariza;
          
          if (kullanici.rol === 'musteri' && arizaData.saha !== kullanici.saha) {
            toast.error('Bu arızaya erişim yetkiniz yok');
            navigate('/arizalar');
            return;
          }
          
          setAriza(arizaData);

          // Saha adını getir
          const sahaRef = doc(db, 'sahalar', arizaData.saha);
          const sahaSnap = await getDoc(sahaRef);
          if (sahaSnap.exists()) {
            setSahaAdi(sahaSnap.data().ad);
          }
        } else {
          toast.error('Arıza bulunamadı');
          navigate('/arizalar');
        }
      } catch (error) {
        console.error('Veri getirme hatası:', error);
        toast.error('Veriler yüklenirken bir hata oluştu');
      } finally {
        setYukleniyor(false);
      }
    };

    veriGetir();
  }, [id, navigate, kullanici]);

  // ... rest of the component code remains the same ...

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* ... other JSX remains the same ... */}
      <div className="flex items-center">
        <dt className="text-sm font-medium text-gray-500 w-32 flex items-center">
          <Building className="h-4 w-4 mr-2" />
          Saha:
        </dt>
        <dd className="text-sm text-gray-900">{sahaAdi || 'Bilinmeyen Saha'}</dd>
      </div>
      {/* ... rest of the JSX remains the same ... */}
    </div>
  );
};