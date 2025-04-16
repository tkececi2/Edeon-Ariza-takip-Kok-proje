import React, { useState } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  X, 
  Calendar, 
  Building, 
  User, 
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  FileText,
  Zap
} from 'lucide-react';
import type { ElektrikBakim } from '../types';

interface Props {
  bakim: ElektrikBakim;
  sahaAdi: string;
  onClose: () => void;
}

const KONTROL_GRUPLARI = {
  ogSistemleri: {
    baslik: '1. OG Sistemleri',
    kontroller: {
      betonKosk: 'Beton köşklerde kir, nem kontrolü',
      ogHucreleri: 'OG hücrelerinde paslanma ve boya kusurları',
      ayiricilar: 'Ayırıcıların, kesicilerin ve rölelerin işlevselliği'
    }
  },
  trafolar: {
    baslik: '2. Trafolar',
    kontroller: {
      trafoTemizligi: 'Trafo temizliği (kir, toz, yağ sızıntısı)',
      buchholzSinyalleri: 'Buchholz sinyalleri ve buşing termal kontrolü'
    }
  },
  agDagitimPanosu: {
    baslik: '3. AG Dağıtım Panosu',
    kontroller: {
      kirNemKontrol: 'Kir, nem, paslanma kontrolü',
      devreSigortaKontrol: 'Devre kesiciler ve sigortaların çalışması',
      upsSistemKontrol: 'UPS sisteminin kontrolü'
    }
  },
  invertorler: {
    baslik: '4. İnvertörler',
    kontroller: {
      kirPaslanmaKontrol: 'Kir, toz, paslanma ve termal inceleme',
      kabloDurumu: 'AC/DC kablolarının durumu',
      etiketIsaretler: 'Etiketler ve işaret levhalarının kontrolü'
    }
  },
  toplamaKutulari: {
    baslik: '5. Toplama Kutuları',
    kontroller: {
      termalPaslanmaKontrol: 'Termal kontrol ve paslanma incelemesi',
      pvDiziBaglanti: 'PV dizilerinin ve bağlantılarının çalışması'
    }
  },
  pvModulleri: {
    baslik: '6. PV Modülleri',
    kontroller: {
      modulKutuKontrol: 'Modül ve bağlantı kutularının görsel denetimi',
      kabloBaglanti: 'Kablolar ve konektörlerin kontrolü'
    }
  },
  kabloTasima: {
    baslik: '7. Kablolar ve Taşıma Sistemleri',
    kontroller: {
      kabloDurumu: 'OG/AG kablolarının ve işaretleyicilerinin durumu',
      tasimaSistemleri: 'Kablo kanalları, askılar ve borular'
    }
  },
  aydinlatmaGuvenlik: {
    baslik: '8. Aydınlatma ve Güvenlik',
    kontroller: {
      aydinlatmaKontrol: 'Aydınlatma armatürlerinin çalışması ve görsel denetimi',
      kameraKontrol: 'CCTV ve izleme sistemlerinin çalışması',
      elektrosokKontrol: 'Elektroşok sisteminin işlevselliği'
    }
  },
  topraklamaSistemleri: {
    baslik: '9. Topraklama Sistemleri',
    kontroller: {
      topraklamaBaglanti: 'Topraklama bağlantılarının bütünlüğü',
      topraklamaOlcum: 'Nötr ve koruma topraklama ölçümleri'
    }
  }
};

export const ElektrikBakimDetay: React.FC<Props> = ({ bakim, sahaAdi, onClose }) => {
  const [seciliFoto, setSeciliFoto] = useState<string | null>(null);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = '/placeholder-image.png';
  };

  const renderKontrolGrubu = (key: string, durumlar: Record<string, boolean>, aciklamalar?: Record<string, string>) => {
    const grup = KONTROL_GRUPLARI[key];
    if (!grup) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">{grup.baslik}</h3>
        <div className="space-y-3">
          {Object.entries(durumlar).map(([kontrolKey, durum]) => (
            <div key={kontrolKey} className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">
                  {grup.kontroller[kontrolKey]}
                </p>
                {aciklamalar?.[kontrolKey] && (
                  <p className="mt-1 text-sm text-gray-500">{aciklamalar[kontrolKey]}</p>
                )}
              </div>
              <span className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                durum ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {durum ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Sorun Yok
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Sorun Var
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-medium text-gray-900">
              Elektrik Bakım Detayları
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sol Kolon - Genel Bilgiler ve Fotoğraflar */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Building className="h-5 w-5 mr-2 text-gray-400" />
                  <span>{sahaAdi}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                  <span>{format(bakim.tarih.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr })}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-5 w-5 mr-2 text-gray-400" />
                  <span>{bakim.kontrolEden.ad}</span>
                </div>
              </div>

              {/* Fotoğraflar */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Fotoğraflar</h3>
                {bakim.fotograflar && bakim.fotograflar.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {bakim.fotograflar.map((foto, index) => (
                      <div
                        key={index}
                        className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
                        onClick={() => setSeciliFoto(foto)}
                      >
                        <img
                          src={foto}
                          alt={`Fotoğraf ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          onError={handleImageError}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">Fotoğraf bulunmuyor</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Genel Notlar */}
              {bakim.genelNotlar && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Genel Notlar</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {bakim.genelNotlar}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sağ Kolon - Kontrol Detayları */}
            <div className="space-y-8">
              {Object.keys(KONTROL_GRUPLARI).map((key) => (
                <div key={key}>
                  {renderKontrolGrubu(
                    key,
                    bakim.durumlar[key],
                    bakim.durumlar[`${key}Aciklamalar`]
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Büyük Fotoğraf Modalı */}
      {seciliFoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSeciliFoto(null)}
        >
          <button
            onClick={() => setSeciliFoto(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={seciliFoto}
            alt="Büyük fotoğraf görünümü"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={handleImageError}
          />
        </div>
      )}
    </div>
  );
};