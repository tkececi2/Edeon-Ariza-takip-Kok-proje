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
  FileText
} from 'lucide-react';
import type { MekanikBakim } from '../types';

interface Props {
  bakim: MekanikBakim;
  sahaAdi: string;
  onClose: () => void;
}

export const MekanikBakimDetay: React.FC<Props> = ({ bakim, sahaAdi, onClose }) => {
  const [seciliFoto, setSeciliFoto] = useState<string | null>(null);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = '/placeholder-image.png';
  };

  const renderKontrolGrubu = (baslik: string, durumlar: Record<string, boolean>, aciklamalar?: Record<string, string>) => {
    const durumLabels: Record<string, string> = {
      karTozKum: 'Kar, toz, kum birikimi',
      kusKirliligi: 'Kuş popülasyonuna bağlı kirlilik',
      bitkiHayvan: 'Bitki örtüsü ve yabani hayvan etkileri',
      toprakErozyonu: 'Toprak erozyonu',
      suBirikintileri: 'Su birikintileri ve çatlaklar',
      cokmeVeCukurlar: 'Çökme, çukurlar, oyuklar',
      yapiButunlugu: 'Modül taşıyıcı yapı bütünlüğü',
      paslanmaKorozyon: 'Paslanma ve korozyon',
      gevsekBaglantilar: 'Gevşek bağlantılar',
      boyutlar: 'Kazık ve kiriş türleri/boyutları',
      kirilmaVeCatlaklar: 'Kırılma, çatlama ve renk bozulmaları',
      tozKirBirikimi: 'Toz/kir birikimi ve sıcak noktalar',
      gevsekKlempler: 'Gevşek klempler',
      montajYapilari: 'İnvertör ve DC/AC kutu montaj yapıları'
    };

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">{baslik}</h3>
        <div className="space-y-3">
          {Object.entries(durumlar).map(([key, durum]) => (
            <div key={key} className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{durumLabels[key] || key}</p>
                {aciklamalar?.[key] && (
                  <p className="mt-1 text-sm text-gray-500">{aciklamalar[key]}</p>
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
            <FileText className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-medium text-gray-900">
              Mekanik Bakım Detayları
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
              {renderKontrolGrubu(
                '1. Çevresel Durum',
                bakim.durumlar.cevreselDurum,
                bakim.durumlar.cevreselDurumAciklamalar
              )}
              {renderKontrolGrubu(
                '2. Arazi ve Toprak Koşulları',
                bakim.durumlar.araziDurumu,
                bakim.durumlar.araziDurumuAciklamalar
              )}
              {renderKontrolGrubu(
                '3. Taşıyıcı Yapılar',
                bakim.durumlar.tasiyiciYapilar,
                bakim.durumlar.tasiyiciYapilarAciklamalar
              )}
              {renderKontrolGrubu(
                '4. Kazıklar ve Kirişler',
                bakim.durumlar.kazikVeKirisler,
                bakim.durumlar.kazikVeKirislerAciklamalar
              )}
              {renderKontrolGrubu(
                '5. PV Modülleri',
                bakim.durumlar.pvModulleri,
                bakim.durumlar.pvModulleriAciklamalar
              )}
              {renderKontrolGrubu(
                '6. Elektrik Sistemleri',
                bakim.durumlar.elektrikSistemleri,
                bakim.durumlar.elektrikSistemleriAciklamalar
              )}
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