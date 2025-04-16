import React, { useState, useRef } from 'react';
import { collection, addDoc, Timestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, isValid, parse } from 'date-fns';
import { tr } from 'date-fns/locale';
import { X, Upload, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import Papa from 'papaparse';
import toast from 'react-hot-toast';

interface BulkImportModalProps {
  onClose: () => void;
  santralId: string;
  santralKapasite: number;
  onSuccess: () => void;
}

interface ImportRow {
  tarih: string;
  gunlukUretim: number;
  valid: boolean;
  error?: string;
}

// Sabit değerler
const ELEKTRIK_BIRIM_FIYATI = 2.5; // TL/kWh
const DAGITIM_BEDELI_ORANI = 0.2; // %20

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ 
  onClose, 
  santralId, 
  santralKapasite,
  onSuccess 
}) => {
  const { kullanici } = useAuth();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // CSV dosyasını oku
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8", // Türkçe karakter desteği için
      complete: (results) => {
        const parsedData: ImportRow[] = [];
        
        results.data.forEach((row: any) => {
          // Tarih ve üretim değerlerini kontrol et
          const tarihStr = row.TARİH || row.TARIH || row.Tarih || row.tarih || row.Date || row.date || '';
          let tarih = '';
          let gunlukUretim = 0;
          let valid = false;
          let error = '';

          // Tarih formatını kontrol et ve dönüştür
          try {
            // Farklı tarih formatlarını dene
            let parsedDate;
            if (/^\d{1,2}[./-]\d{1,2}[./-]\d{4}$/.test(tarihStr)) {
              // DD/MM/YYYY veya DD.MM.YYYY veya DD-MM-YYYY
              parsedDate = parse(tarihStr, 'dd/MM/yyyy', new Date());
              if (!isValid(parsedDate)) {
                parsedDate = parse(tarihStr, 'dd.MM.yyyy', new Date());
              }
              if (!isValid(parsedDate)) {
                parsedDate = parse(tarihStr, 'dd-MM-yyyy', new Date());
              }
              if (!isValid(parsedDate)) {
                parsedDate = parse(tarihStr, 'd.MM.yyyy', new Date());
              }
              if (!isValid(parsedDate)) {
                parsedDate = parse(tarihStr, 'd/MM/yyyy', new Date());
              }
            } else if (/^\d{4}[./-]\d{1,2}[./-]\d{1,2}$/.test(tarihStr)) {
              // YYYY/MM/DD veya YYYY.MM.DD veya YYYY-MM-DD
              parsedDate = parse(tarihStr, 'yyyy/MM/dd', new Date());
              if (!isValid(parsedDate)) {
                parsedDate = parse(tarihStr, 'yyyy.MM.dd', new Date());
              }
              if (!isValid(parsedDate)) {
                parsedDate = parse(tarihStr, 'yyyy-MM-dd', new Date());
              }
              if (!isValid(parsedDate)) {
                parsedDate = parse(tarihStr, 'yyyy/M/d', new Date());
              }
              if (!isValid(parsedDate)) {
                parsedDate = parse(tarihStr, 'yyyy.M.d', new Date());
              }
            }

            if (parsedDate && isValid(parsedDate)) {
              tarih = format(parsedDate, 'yyyy-MM-dd');
              valid = true;
            } else {
              error = 'Geçersiz tarih formatı';
            }
          } catch (err) {
            error = 'Tarih dönüştürme hatası';
          }

          // Üretim değerini kontrol et
          const uretimStr = row['Günlük Üretim (kWh)'] || row['Günlük Üretim'] || row['GÜNLÜK ÜRETİM (kWh)'] || row['GÜNLÜK ÜRETİM'] || row['GünlükÜretim'] || row['GünlükÜretim(kWh)'] || row['Uretim'] || row['uretim'] || row['Production'] || row['production'] || '';
          if (uretimStr) {
            const parsedUretim = parseFloat(uretimStr.toString().replace(',', '.'));
            if (!isNaN(parsedUretim) && parsedUretim > 0) {
              gunlukUretim = parsedUretim;
              valid = valid && true;
            } else {
              error = error || 'Geçersiz üretim değeri';
              valid = false;
            }
          } else {
            error = error || 'Üretim değeri bulunamadı';
            valid = false;
          }

          parsedData.push({
            tarih,
            gunlukUretim,
            valid,
            error
          });
        });

        setImportData(parsedData);
        setStep('preview');
      },
      error: (error) => {
        toast.error('Dosya okuma hatası: ' + error.message);
      }
    });
  };

  const handleImport = async () => {
    if (!kullanici || !santralId) return;

    const validData = importData.filter(row => row.valid);
    if (validData.length === 0) {
      toast.error('İçe aktarılacak geçerli veri yok');
      return;
    }

    setStep('importing');
    setYukleniyor(true);
    setProgress(0);

    try {
      // Batch işlemi başlat (Firestore bir batch'te en fazla 500 işlem yapabilir)
      const batchSize = 450;
      const batches = [];
      
      for (let i = 0; i < validData.length; i += batchSize) {
        const currentBatch = writeBatch(db);
        batches.push(currentBatch);
      }

      let processedCount = 0;
      
      for (let i = 0; i < validData.length; i++) {
        const row = validData[i];
        const batchIndex = Math.floor(i / batchSize);
        const batch = batches[batchIndex];
        
        // Gelir hesaplama
        const gelir = row.gunlukUretim * ELEKTRIK_BIRIM_FIYATI;
        
        // Dağıtım bedeli hesaplama
        const dagitimBedeli = gelir * DAGITIM_BEDELI_ORANI;
        
        // Net gelir
        const netGelir = gelir - dagitimBedeli;
        
        // CO2 tasarrufu hesaplama (yaklaşık değer: 0.5 kg CO2/kWh)
        const co2Tasarrufu = row.gunlukUretim * 0.5;

        // Performans oranı hesaplama
        let performansOrani = 0;
        
        if (santralKapasite > 0) {
          // Teorik maksimum günlük üretim (5 saat tam verimli çalışma varsayımı)
          const teorikMaksimum = santralKapasite * 5;
          performansOrani = (row.gunlukUretim / teorikMaksimum) * 100;
        }

        // Yeni doküman referansı oluştur
        const docRef = doc(collection(db, 'uretimVerileri'));
        
        // Batch'e ekle
        batch.set(docRef, {
          santralId: santralId,
          tarih: Timestamp.fromDate(new Date(row.tarih)),
          gunlukUretim: row.gunlukUretim,
          anlikGuc: santralKapasite || 0,
          performansOrani: performansOrani,
          gelir: netGelir,
          dagitimBedeli: dagitimBedeli,
          tasarrufEdilenCO2: co2Tasarrufu,
          hava: {
            sicaklik: 0,
            nem: 0,
            radyasyon: 0
          },
          olusturanKisi: {
            id: kullanici.id,
            ad: kullanici.ad
          },
          olusturmaTarihi: Timestamp.now()
        });

        processedCount++;
        setProgress(Math.round((processedCount / validData.length) * 100));
      }

      // Tüm batch'leri commit et
      for (const batch of batches) {
        await batch.commit();
      }

      toast.success(`${validData.length} üretim verisi başarıyla içe aktarıldı`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Toplu içe aktarma hatası:', error);
      toast.error('Veriler içe aktarılırken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const downloadTemplate = () => {
    // Türk standartlarına uygun CSV şablonu - sütunlar ayrı ayrı
    const csvContent = "TARİH,Günlük Üretim (kWh)\n01.01.2024,1925\n02.01.2024,1830\n03.01.2024,1756";
    
    // UTF-8 BOM ekleyerek Türkçe karakter desteğini sağla
    const BOM = "\uFEFF";
    const csvContentWithBOM = BOM + csvContent;
    
    const blob = new Blob([csvContentWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'uretim_verisi_sablonu.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="fixed inset-0 bg-neutral-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-medium text-neutral-900">
            Toplu Üretim Verisi İçe Aktarma
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="bg-primary-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-primary-800 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  İçe Aktarma Talimatları
                </h3>
                <ul className="mt-2 text-sm text-primary-700 list-disc list-inside space-y-1">
                  <li>CSV formatında bir dosya yükleyin</li>
                  <li>Dosyanızda "TARİH" ve "Günlük Üretim (kWh)" sütunları bulunmalıdır</li>
                  <li>Tarih formatı: GG.AA.YYYY (örn: 01.01.2024) olmalıdır</li>
                  <li>Ondalık ayırıcı olarak virgül (,) kullanabilirsiniz</li>
                  <li>Türkçe karakterler desteklenmektedir</li>
                  <li>Maksimum 1000 satır veri içe aktarılabilir</li>
                </ul>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center px-4 py-2 border border-neutral-300 rounded-lg shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Şablon İndir
                </button>
              </div>

              <div 
                className="border-2 border-dashed border-neutral-300 rounded-lg p-12 text-center hover:border-primary-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".csv"
                  onChange={handleFileUpload}
                />
                <div className="flex flex-col items-center">
                  <Upload className="h-12 w-12 text-neutral-400 mb-4" />
                  <p className="text-neutral-600 mb-2">
                    CSV dosyasını buraya sürükleyin veya seçmek için tıklayın
                  </p>
                  <p className="text-sm text-neutral-500">
                    Maksimum 10MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-neutral-900">
                  Veri Önizleme
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-neutral-500">
                    Toplam: {importData.length} satır
                  </span>
                  <span className="text-sm text-green-600">
                    Geçerli: {importData.filter(row => row.valid).length} satır
                  </span>
                  {importData.some(row => !row.valid) && (
                    <span className="text-sm text-red-600">
                      Hatalı: {importData.filter(row => !row.valid).length} satır
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Tarih
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Günlük Üretim (kWh)
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Hesaplanan Gelir (₺)
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Hata
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {importData.slice(0, 100).map((row, index) => (
                      <tr key={index} className={row.valid ? '' : 'bg-red-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {row.valid ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                          {row.tarih ? format(new Date(row.tarih), 'dd MMMM yyyy', { locale: tr }) : 'Geçersiz tarih'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                          {row.gunlukUretim.toLocaleString('tr-TR', {maximumFractionDigits: 2})}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                          {(row.gunlukUretim * ELEKTRIK_BIRIM_FIYATI * (1 - DAGITIM_BEDELI_ORANI)).toLocaleString('tr-TR', {maximumFractionDigits: 2})}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {row.error || ''}
                        </td>
                      </tr>
                    ))}
                    {importData.length > 100 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-neutral-500">
                          ... ve {importData.length - 100} satır daha
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {importData.length > 0 && importData.filter(row => row.valid).length === 0 && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        İçe aktarılacak geçerli veri yok
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>
                          Lütfen dosyanızı kontrol edin ve tekrar deneyin. Dosyanızda "TARİH" ve "Günlük Üretim (kWh)" sütunları olduğundan emin olun.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <h3 className="mt-4 text-lg font-medium text-neutral-900">
                Veriler İçe Aktarılıyor
              </h3>
              <p className="mt-2 text-sm text-neutral-500">
                Lütfen bekleyin, bu işlem biraz zaman alabilir...
              </p>
              <div className="w-full max-w-md mt-6">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block text-primary-600">
                        İlerleme
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-primary-600">
                        {progress}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary-200">
                    <div 
                      style={{ width: `${progress}%` }} 
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 flex justify-end space-x-3 flex-shrink-0">
          {step === 'upload' && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              İptal
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importData.filter(row => row.valid).length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                İçe Aktar ({importData.filter(row => row.valid).length} satır)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};