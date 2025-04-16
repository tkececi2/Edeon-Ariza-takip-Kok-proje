import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Package, 
  Zap, 
  FileText, 
  Download,
  Calendar,
  BarChart2,
  Building,
  Wrench
} from 'lucide-react';
import { Card, Title, Text, BarChart, DonutChart, AreaChart } from '@tremor/react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';

export const AylikRapor: React.FC = () => {
  const { kullanici } = useAuth();
  const [yukleniyor, setYukleniyor] = useState(true);
  const [secilenAy, setSecilenAy] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [secilenSaha, setSecilenSaha] = useState<string>('');
  const [sahalar, setSahalar] = useState<Array<{id: string, ad: string}>>([]);
  const [rapor, setRapor] = useState<any>({
    ariza: {
      toplam: 0,
      cozulen: 0,
      bekleyen: 0,
      cozumSuresi: 0,
      oncelikDagilimi: [] as any[],
      durumDagilimi: [] as any[]
    },
    stok: {
      toplamCesit: 0,
      kritikSeviye: 0,
      eksikMalzemeler: [] as any[]
    },
    bakimlar: {
      mekanik: {
        toplam: 0,
        sorunlu: 0
      },
      elektrik: {
        toplam: 0,
        sorunlu: 0
      }
    },
    yapilanIsler: {
      toplam: 0,
      isListesi: [] as any[]
    },
    kesintiler: {
      toplam: 0,
      toplamSure: 0,
      kesintiler: [] as any[]
    },
    invertorler: {
      toplamKontrol: 0,
      calismaOrani: 0
    },
    uretim: {
      toplamUretim: 0,
      hedefGerceklesme: 0,
      gunlukUretim: [] as any[]
    }
  });

  useEffect(() => {
    const sahalariGetir = async () => {
      if (!kullanici) return;

      try {
        let sahaQuery;
        if (kullanici.rol === 'musteri' && kullanici.sahalar) {
          sahaQuery = query(
            collection(db, 'sahalar'),
            where('__name__', 'in', kullanici.sahalar)
          );
        } else {
          sahaQuery = query(collection(db, 'sahalar'));
        }
        
        const sahaSnapshot = await getDocs(sahaQuery);
        const sahaListesi = sahaSnapshot.docs.map(doc => ({
          id: doc.id,
          ad: doc.data().ad
        }));
        setSahalar(sahaListesi);
      } catch (error) {
        console.error('Sahalar getirilemedi:', error);
        toast.error('Sahalar yüklenirken bir hata oluştu');
      }
    };

    sahalariGetir();
  }, [kullanici]);

  useEffect(() => {
    const verileriGetir = async () => {
      if (!kullanici) return;
      
      try {
        setYukleniyor(true);
        
        const ayBaslangic = startOfMonth(parseISO(secilenAy + '-01'));
        const ayBitis = endOfMonth(parseISO(secilenAy + '-01'));
        const ayBaslangicTimestamp = Timestamp.fromDate(ayBaslangic);
        const ayBitisTimestamp = Timestamp.fromDate(ayBitis);
        
        // Arıza verileri
        let arizaQuery;
        if (secilenSaha) {
          arizaQuery = query(
            collection(db, 'arizalar'),
            where('saha', '==', secilenSaha),
            where('olusturmaTarihi', '>=', ayBaslangicTimestamp),
            where('olusturmaTarihi', '<=', ayBitisTimestamp),
            orderBy('olusturmaTarihi', 'desc')
          );
        } else if (kullanici.rol === 'musteri' && kullanici.sahalar) {
          arizaQuery = query(
            collection(db, 'arizalar'),
            where('saha', 'in', kullanici.sahalar),
            where('olusturmaTarihi', '>=', ayBaslangicTimestamp),
            where('olusturmaTarihi', '<=', ayBitisTimestamp),
            orderBy('olusturmaTarihi', 'desc')
          );
        } else {
          arizaQuery = query(
            collection(db, 'arizalar'),
            where('olusturmaTarihi', '>=', ayBaslangicTimestamp),
            where('olusturmaTarihi', '<=', ayBitisTimestamp),
            orderBy('olusturmaTarihi', 'desc')
          );
        }
        
        const arizaSnapshot = await getDocs(arizaQuery);
        const arizalar = arizaSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Stok verileri
        let stokQuery;
        if (secilenSaha) {
          stokQuery = query(
            collection(db, 'stoklar'),
            where('sahaId', '==', secilenSaha)
          );
        } else if (kullanici.rol === 'musteri' && kullanici.sahalar) {
          stokQuery = query(
            collection(db, 'stoklar'),
            where('sahaId', 'in', kullanici.sahalar)
          );
        } else {
          stokQuery = query(collection(db, 'stoklar'));
        }
        
        const stokSnapshot = await getDocs(stokQuery);
        const stoklar = stokSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Mekanik bakım verileri
        let mekanikBakimQuery;
        if (secilenSaha) {
          mekanikBakimQuery = query(
            collection(db, 'mekanikBakimlar'),
            where('sahaId', '==', secilenSaha),
            where('tarih', '>=', ayBaslangicTimestamp),
            where('tarih', '<=', ayBitisTimestamp)
          );
        } else if (kullanici.rol === 'musteri' && kullanici.sahalar) {
          mekanikBakimQuery = query(
            collection(db, 'mekanikBakimlar'),
            where('sahaId', 'in', kullanici.sahalar),
            where('tarih', '>=', ayBaslangicTimestamp),
            where('tarih', '<=', ayBitisTimestamp)
          );
        } else {
          mekanikBakimQuery = query(
            collection(db, 'mekanikBakimlar'),
            where('tarih', '>=', ayBaslangicTimestamp),
            where('tarih', '<=', ayBitisTimestamp)
          );
        }
        
        const mekanikBakimSnapshot = await getDocs(mekanikBakimQuery);
        const mekanikBakimlar = mekanikBakimSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Elektrik bakım verileri
        let elektrikBakimQuery;
        if (secilenSaha) {
          elektrikBakimQuery = query(
            collection(db, 'elektrikBakimlar'),
            where('sahaId', '==', secilenSaha),
            where('tarih', '>=', ayBaslangicTimestamp),
            where('tarih', '<=', ayBitisTimestamp)
          );
        } else if (kullanici.rol === 'musteri' && kullanici.sahalar) {
          elektrikBakimQuery = query(
            collection(db, 'elektrikBakimlar'),
            where('sahaId', 'in', kullanici.sahalar),
            where('tarih', '>=', ayBaslangicTimestamp),
            where('tarih', '<=', ayBitisTimestamp)
          );
        } else {
          elektrikBakimQuery = query(
            collection(db, 'elektrikBakimlar'),
            where('tarih', '>=', ayBaslangicTimestamp),
            where('tarih', '<=', ayBitisTimestamp)
          );
        }
        
        const elektrikBakimSnapshot = await getDocs(elektrikBakimQuery);
        const elektrikBakimlar = elektrikBakimSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Yapılan işler verileri
        let isRaporlariQuery;
        if (secilenSaha) {
          isRaporlariQuery = query(
            collection(db, 'isRaporlari'),
            where('saha', '==', secilenSaha),
            where('tarih', '>=', ayBaslangicTimestamp),
            where('tarih', '<=', ayBitisTimestamp)
          );
        } else if (kullanici.rol === 'musteri' && kullanici.sahalar) {
          isRaporlariQuery = query(
            collection(db, 'isRaporlari'),
            where('saha', 'in', kullanici.sahalar),
            where('tarih', '>=', ayBaslangicTimestamp),
            where('tarih', '<=', ayBitisTimestamp)
          );
        } else {
          isRaporlariQuery = query(
            collection(db, 'isRaporlari'),
            where('tarih', '>=', ayBaslangicTimestamp),
            where('tarih', '<=', ayBitisTimestamp)
          );
        }
        
        const isRaporlariSnapshot = await getDocs(isRaporlariQuery);
        const isRaporlari = isRaporlariSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Elektrik kesintileri verileri
        let kesintilerQuery;
        if (secilenSaha) {
          kesintilerQuery = query(
            collection(db, 'elektrikKesintileri'),
            where('sahaId', '==', secilenSaha),
            where('baslangicTarihi', '>=', ayBaslangicTimestamp),
            where('baslangicTarihi', '<=', ayBitisTimestamp)
          );
        } else if (kullanici.rol === 'musteri' && kullanici.sahalar) {
          kesintilerQuery = query(
            collection(db, 'elektrikKesintileri'),
            where('sahaId', 'in', kullanici.sahalar),
            where('baslangicTarihi', '>=', ayBaslangicTimestamp),
            where('baslangicTarihi', '<=', ayBitisTimestamp)
          );
        } else {
          kesintilerQuery = query(
            collection(db, 'elektrikKesintileri'),
            where('baslangicTarihi', '>=', ayBaslangicTimestamp),
            where('baslangicTarihi', '<=', ayBitisTimestamp)
          );
        }
        
        const kesintilerSnapshot = await getDocs(kesintilerQuery);
        const kesintiler = kesintilerSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // İnvertör kontrol verileri
        let invertorKontrolQuery;
        if (secilenSaha) {
          invertorKontrolQuery = query(
            collection(db, 'invertorKontroller'),
            where('sahaId', '==', secilenSaha),
            where('tarih', '>=', ayBaslangicTimestamp),
            where('tarih', '<=', ayBitisTimestamp)
          );
        } else if (kullanici.rol === 'musteri' && kullanici.sahalar) {
          invertorKontrolQuery = query(
            collection(db, 'invertorKontroller'),
            where('sahaId', 'in', kullanici.sahalar),
            where('tarih', '>=', ayBaslangicTimestamp),
            where('tarih', '<=', ayBitisTimestamp)
          );
        } else {
          invertorKontrolQuery = query(
            collection(db, 'invertorKontroller'),
            where('tarih', '>=', ayBaslangicTimestamp),
            where('tarih', '<=', ayBitisTimestamp)
          );
        }
        
        const invertorKontrolSnapshot = await getDocs(invertorKontrolQuery);
        const invertorKontroller = invertorKontrolSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Üretim verileri
        let uretimQuery;
        if (secilenSaha) {
          uretimQuery = query(
            collection(db, 'uretimVerileri'),
            where('santralId', '==', secilenSaha),
            where('tarih', '>=', ayBaslangicTimestamp),
            where('tarih', '<=', ayBitisTimestamp),
            orderBy('tarih', 'asc')
          );
        } else if (kullanici.rol === 'musteri' && kullanici.sahalar) {
          // Müşteri için tüm santrallerin üretim verilerini getir
          uretimQuery = query(
            collection(db, 'uretimVerileri'),
            where('santralId', 'in', kullanici.sahalar),
            where('tarih', '>=', ayBaslangicTimestamp),
            where('tarih', '<=', ayBitisTimestamp),
            orderBy('tarih', 'asc')
          );
        } else {
          uretimQuery = query(
            collection(db, 'uretimVerileri'),
            where('tarih', '>=', ayBaslangicTimestamp),
            where('tarih', '<=', ayBitisTimestamp),
            orderBy('tarih', 'asc')
          );
        }
        
        const uretimSnapshot = await getDocs(uretimQuery);
        const uretimVerileri = uretimSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Rapor verilerini hazırla
        const arizaRaporu = {
          toplam: arizalar.length,
          cozulen: arizalar.filter(a => a.durum === 'cozuldu').length,
          bekleyen: arizalar.filter(a => a.durum !== 'cozuldu').length,
          cozumSuresi: arizalar
            .filter(a => a.durum === 'cozuldu' && a.cozum)
            .reduce((acc, a) => {
              const baslangic = a.olusturmaTarihi.toDate();
              const bitis = a.cozum.tamamlanmaTarihi.toDate();
              const sureSaat = (bitis.getTime() - baslangic.getTime()) / (1000 * 60 * 60);
              return acc + sureSaat;
            }, 0) / (arizalar.filter(a => a.durum === 'cozuldu' && a.cozum).length || 1),
          oncelikDagilimi: [
            { oncelik: 'Düşük', sayi: arizalar.filter(a => a.oncelik === 'dusuk').length },
            { oncelik: 'Orta', sayi: arizalar.filter(a => a.oncelik === 'orta').length },
            { oncelik: 'Yüksek', sayi: arizalar.filter(a => a.oncelik === 'yuksek').length },
            { oncelik: 'Acil', sayi: arizalar.filter(a => a.oncelik === 'acil').length }
          ],
          durumDagilimi: [
            { durum: 'Açık', sayi: arizalar.filter(a => a.durum === 'acik').length },
            { durum: 'Devam Ediyor', sayi: arizalar.filter(a => a.durum === 'devam-ediyor').length },
            { durum: 'Beklemede', sayi: arizalar.filter(a => a.durum === 'beklemede').length },
            { durum: 'Çözüldü', sayi: arizalar.filter(a => a.durum === 'cozuldu').length }
          ]
        };
        
        const stokRaporu = {
          toplamCesit: stoklar.length,
          kritikSeviye: stoklar.filter(s => s.miktar <= s.kritikSeviye).length,
          eksikMalzemeler: stoklar
            .filter(s => s.miktar <= s.kritikSeviye)
            .map(s => ({
              urunAdi: s.urunAdi,
              miktar: s.miktar,
              birim: s.birim,
              kritikSeviye: s.kritikSeviye,
              eksikMiktar: s.kritikSeviye - s.miktar
            }))
            .sort((a, b) => b.eksikMiktar - a.eksikMiktar)
            .slice(0, 5)
        };
        
        const mekanikBakimRaporu = {
          toplam: mekanikBakimlar.length,
          sorunlu: mekanikBakimlar.filter(bakim => 
            Object.values(bakim.durumlar).some(kategori => 
              Object.values(kategori).some(durum => durum === false)
            )
          ).length
        };
        
        const elektrikBakimRaporu = {
          toplam: elektrikBakimlar.length,
          sorunlu: elektrikBakimlar.filter(bakim => 
            Object.values(bakim.durumlar).some(kategori => 
              Object.values(kategori).some(durum => durum === false)
            )
          ).length
        };
        
        const yapilanIslerRaporu = {
          toplam: isRaporlari.length,
          isListesi: isRaporlari.map(is => ({
            id: is.id,
            baslik: is.baslik,
            tarih: is.tarih.toDate(),
            saha: sahalar.find(s => s.id === is.saha)?.ad || 'Bilinmeyen Saha',
            yapilanIsler: is.yapilanIsler
          }))
        };
        
        const kesintilerRaporu = {
          toplam: kesintiler.length,
          toplamSure: kesintiler.reduce((acc, k) => acc + k.sure, 0),
          kesintiler: kesintiler.map(k => ({
            id: k.id,
            sahaAdi: sahalar.find(s => s.id === k.sahaId)?.ad || 'Bilinmeyen Saha',
            baslangicTarihi: k.baslangicTarihi.toDate(),
            bitisTarihi: k.bitisTarihi ? k.bitisTarihi.toDate() : null,
            sure: k.sure,
            durum: k.durum
          }))
        };
        
        const invertorRaporu = {
          toplamKontrol: invertorKontroller.length,
          calismaOrani: invertorKontroller.length > 0 
            ? invertorKontroller.reduce((acc, kontrol) => {
                const calisanDizeSayisi = kontrol.invertorler.filter(inv => inv.dizeCalisiyor).length;
                const toplamDizeSayisi = kontrol.invertorler.length;
                return acc + (calisanDizeSayisi / toplamDizeSayisi);
              }, 0) / invertorKontroller.length * 100
            : 0
        };
        
        const uretimRaporu = {
          toplamUretim: uretimVerileri.reduce((acc, v) => acc + v.gunlukUretim, 0),
          hedefGerceklesme: 0, // Hedef bilgisi olmadığı için 0 olarak bırakıldı
          gunlukUretim: uretimVerileri.map(v => ({
            tarih: format(v.tarih.toDate(), 'dd MMM', { locale: tr }),
            uretim: v.gunlukUretim
          }))
        };
        
        setRapor({
          ariza: arizaRaporu,
          stok: stokRaporu,
          bakimlar: {
            mekanik: mekanikBakimRaporu,
            elektrik: elektrikBakimRaporu
          },
          yapilanIsler: yapilanIslerRaporu,
          kesintiler: kesintilerRaporu,
          invertorler: invertorRaporu,
          uretim: uretimRaporu
        });
        
      } catch (error) {
        console.error('Veri getirme hatası:', error);
        toast.error('Veriler yüklenirken bir hata oluştu');
      } finally {
        setYukleniyor(false);
      }
    };

    verileriGetir();
  }, [kullanici, secilenAy, secilenSaha, sahalar]);

  const handleRaporIndir = () => {
    try {
      const doc = new jsPDF();
      const sahaAdi = secilenSaha 
        ? sahalar.find(s => s.id === secilenSaha)?.ad 
        : 'Tüm Sahalar';
      
      // Başlık
      doc.setFontSize(18);
      doc.text(`Aylık Tesis Bakım ve Arıza Raporu`, 105, 15, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Dönem: ${format(parseISO(secilenAy + '-01'), 'MMMM yyyy', { locale: tr })}`, 105, 22, { align: 'center' });
      doc.text(`Saha: ${sahaAdi}`, 105, 28, { align: 'center' });
      doc.text(`Oluşturma Tarihi: ${format(new Date(), 'dd MMMM yyyy', { locale: tr })}`, 105, 34, { align: 'center' });
      
      // 1. Arıza Yönetimi
      doc.setFontSize(14);
      doc.text('1. Arıza Yönetimi', 14, 45);
      
      doc.setFontSize(10);
      doc.text(`Toplam Arıza: ${rapor.ariza.toplam}`, 20, 55);
      doc.text(`Çözülen Arıza: ${rapor.ariza.cozulen}`, 20, 60);
      doc.text(`Bekleyen Arıza: ${rapor.ariza.bekleyen}`, 20, 65);
      doc.text(`Ortalama Çözüm Süresi: ${rapor.ariza.cozumSuresi.toFixed(1)} saat`, 20, 70);
      
      // 2. Stok Durumu
      doc.setFontSize(14);
      doc.text('2. Stok Durumu', 14, 85);
      
      doc.setFontSize(10);
      doc.text(`Toplam Stok Çeşidi: ${rapor.stok.toplamCesit}`, 20, 95);
      doc.text(`Kritik Seviyedeki Ürün Sayısı: ${rapor.stok.kritikSeviye}`, 20, 100);
      
      if (rapor.stok.eksikMalzemeler.length > 0) {
        doc.text('Kritik Seviyedeki Ürünler:', 20, 105);
        
        const eksikMalzemelerData = rapor.stok.eksikMalzemeler.map((m, i) => [
          i + 1,
          m.urunAdi,
          `${m.miktar} ${m.birim}`,
          `${m.kritikSeviye} ${m.birim}`,
          `${m.eksikMiktar} ${m.birim}`
        ]);
        
        doc.autoTable({
          startY: 110,
          head: [['#', 'Ürün Adı', 'Mevcut', 'Kritik Seviye', 'Eksik Miktar']],
          body: eksikMalzemelerData,
          theme: 'grid',
          headStyles: { fillColor: [255, 193, 7] }
        });
      }
      
      // 3. Planlı Bakım Kontrolleri
      const yPosition = doc.lastAutoTable?.finalY || 130;
      doc.setFontSize(14);
      doc.text('3. Planlı Bakım Kontrolleri', 14, yPosition + 15);
      
      doc.setFontSize(10);
      doc.text(`Mekanik Bakım Sayısı: ${rapor.bakimlar.mekanik.toplam}`, 20, yPosition + 25);
      doc.text(`Sorunlu Mekanik Bakım: ${rapor.bakimlar.mekanik.sorunlu}`, 20, yPosition + 30);
      doc.text(`Elektrik Bakım Sayısı: ${rapor.bakimlar.elektrik.toplam}`, 20, yPosition + 35);
      doc.text(`Sorunlu Elektrik Bakım: ${rapor.bakimlar.elektrik.sorunlu}`, 20, yPosition + 40);
      
      // 4. Yapılan İşler
      doc.setFontSize(14);
      doc.text('4. Yapılan İşler', 14, yPosition + 55);
      
      doc.setFontSize(10);
      doc.text(`Toplam Yapılan İş: ${rapor.yapilanIsler.toplam}`, 20, yPosition + 65);
      
      if (rapor.yapilanIsler.isListesi.length > 0) {
        const isListesiData = rapor.yapilanIsler.isListesi.slice(0, 5).map((is, i) => [
          i + 1,
          is.baslik,
          is.saha,
          format(is.tarih, 'dd.MM.yyyy')
        ]);
        
        doc.autoTable({
          startY: yPosition + 70,
          head: [['#', 'İş Başlığı', 'Saha', 'Tarih']],
          body: isListesiData,
          theme: 'grid',
          headStyles: { fillColor: [255, 193, 7] }
        });
      }
      
      // 5. Elektrik Kesinti Analizi
      const yPosition2 = doc.lastAutoTable?.finalY || (yPosition + 90);
      doc.setFontSize(14);
      doc.text('5. Elektrik Kesinti Analizi', 14, yPosition2 + 15);
      
      doc.setFontSize(10);
      doc.text(`Toplam Kesinti: ${rapor.kesintiler.toplam}`, 20, yPosition2 + 25);
      doc.text(`Toplam Kesinti Süresi: ${Math.floor(rapor.kesintiler.toplamSure / 60)} saat ${rapor.kesintiler.toplamSure % 60} dakika`, 20, yPosition2 + 30);
      
      // 6. İnvertör Sistemleri
      doc.setFontSize(14);
      doc.text('6. İnvertör Sistemleri', 14, yPosition2 + 45);
      
      doc.setFontSize(10);
      doc.text(`Toplam Kontrol: ${rapor.invertorler.toplamKontrol}`, 20, yPosition2 + 55);
      doc.text(`Ortalama Çalışma Oranı: %${rapor.invertorler.calismaOrani.toFixed(1)}`, 20, yPosition2 + 60);
      
      // 7. Üretim Verileri
      doc.setFontSize(14);
      doc.text('7. Üretim Verileri', 14, yPosition2 + 75);
      
      doc.setFontSize(10);
      doc.text(`Toplam Üretim: ${rapor.uretim.toplamUretim.toFixed(1)} kWh`, 20, yPosition2 + 85);
      
      // Yeni sayfa
      doc.addPage();
      
      // Özet
      doc.setFontSize(16);
      doc.text('Aylık Özet', 105, 15, { align: 'center' });
      
      // Özet tablosu
      const ozetData = [
        ['Toplam Arıza', rapor.ariza.toplam.toString()],
        ['Çözülen Arıza', rapor.ariza.cozulen.toString()],
        ['Bekleyen Arıza', rapor.ariza.bekleyen.toString()],
        ['Ortalama Çözüm Süresi', `${rapor.ariza.cozumSuresi.toFixed(1)} saat`],
        ['Kritik Stok Seviyesi', rapor.stok.kritikSeviye.toString()],
        ['Mekanik Bakım', rapor.bakimlar.mekanik.toplam.toString()],
        ['Elektrik Bakım', rapor.bakimlar.elektrik.toplam.toString()],
        ['Yapılan İşler', rapor.yapilanIsler.toplam.toString()],
        ['Elektrik Kesintileri', rapor.kesintiler.toplam.toString()],
        ['Toplam Kesinti Süresi', `${Math.floor(rapor.kesintiler.toplamSure / 60)} saat ${rapor.kesintiler.toplamSure % 60} dk`],
        ['İnvertör Çalışma Oranı', `%${rapor.invertorler.calismaOrani.toFixed(1)}`],
        ['Toplam Üretim', `${rapor.uretim.toplamUretim.toFixed(1)} kWh`]
      ];
      
      doc.autoTable({
        startY: 25,
        head: [['Metrik', 'Değer']],
        body: ozetData,
        theme: 'grid',
        headStyles: { fillColor: [255, 193, 7] }
      });
      
      // Raporu indir
      doc.save(`aylik-rapor-${secilenAy}-${sahaAdi.replace(/\s+/g, '-')}.pdf`);
      toast.success('Rapor başarıyla indirildi');
    } catch (error) {
      console.error('Rapor indirme hatası:', error);
      toast.error('Rapor indirilirken bir hata oluştu');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aylık Tesis Bakım ve Arıza Raporu</h1>
          <p className="mt-1 text-sm text-gray-500">
            {format(parseISO(secilenAy + '-01'), 'MMMM yyyy', { locale: tr })}
          </p>
        </div>
        <div className="flex gap-4">
          <select
            value={secilenSaha}
            onChange={(e) => setSecilenSaha(e.target.value)}
            className="rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="">Tüm Sahalar</option>
            {sahalar.map(saha => (
              <option key={saha.id} value={saha.id}>{saha.ad}</option>
            ))}
          </select>
          <input
            type="month"
            value={secilenAy}
            onChange={(e) => setSecilenAy(e.target.value)}
            className="rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          />
          <button
            onClick={handleRaporIndir}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
          >
            <Download className="h-5 w-5 mr-2" />
            PDF İndir
          </button>
        </div>
      </div>

      {yukleniyor ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Özet Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card decoration="top" decorationColor="yellow">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm">Toplam Arıza</Text>
                  <Title className="text-xl">{rapor.ariza.toplam}</Title>
                  <Text className="text-xs text-gray-500">
                    {rapor.ariza.cozulen} çözüldü, {rapor.ariza.bekleyen} bekliyor
                  </Text>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </Card>
            
            <Card decoration="top" decorationColor="red">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm">Kritik Stoklar</Text>
                  <Title className="text-xl">{rapor.stok.kritikSeviye}</Title>
                  <Text className="text-xs text-gray-500">
                    Toplam {rapor.stok.toplamCesit} stok çeşidi
                  </Text>
                </div>
                <div className="p-2 bg-red-100 rounded-full">
                  <Package className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </Card>
            
            <Card decoration="top" decorationColor="blue">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm">Yapılan İşler</Text>
                  <Title className="text-xl">{rapor.yapilanIsler.toplam}</Title>
                  <Text className="text-xs text-gray-500">
                    Bu ay tamamlanan işler
                  </Text>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Wrench className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>
            
            <Card decoration="top" decorationColor="green">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm">Üretim</Text>
                  <Title className="text-xl">{rapor.uretim.toplamUretim.toFixed(1)} kWh</Title>
                  <Text className="text-xs text-gray-500">
                    Aylık toplam üretim
                  </Text>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>
          </div>
          
          {/* Arıza Yönetimi */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Arıza Durumu Dağılımı</Title>
              <DonutChart
                className="mt-6 h-60"
                data={rapor.ariza.durumDagilimi}
                category="sayi"
                index="durum"
                colors={["red", "yellow", "blue", "green"]}
                valueFormatter={(value) => `${value} arıza`}
              />
            </Card>
            
            <Card>
              <Title>Arıza Öncelik Dağılımı</Title>
              <DonutChart
                className="mt-6 h-60"
                data={rapor.ariza.oncelikDagilimi}
                category="sayi"
                index="oncelik"
                colors={["gray", "blue", "orange", "red"]}
                valueFormatter={(value) => `${value} arıza`}
              />
            </Card>
          </div>
          
          {/* Üretim Verileri */}
          {rapor.uretim.gunlukUretim.length > 0 && (
            <Card>
              <Title>Günlük Üretim Verileri</Title>
              <AreaChart
                className="mt-6 h-72"
                data={rapor.uretim.gunlukUretim}
                index="tarih"
                categories={["uretim"]}
                colors={["green"]}
                valueFormatter={(value) => `${value.toFixed(1)} kWh`}
              />
            </Card>
          )}
          
          {/* Stok Durumu */}
          {rapor.stok.eksikMalzemeler.length > 0 && (
            <Card>
              <Title>Kritik Seviyedeki Stoklar</Title>
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ürün Adı
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mevcut Miktar
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kritik Seviye
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Eksik Miktar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rapor.stok.eksikMalzemeler.map((malzeme, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {malzeme.urunAdi}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {malzeme.miktar} {malzeme.birim}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {malzeme.kritikSeviye} {malzeme.birim}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {malzeme.eksikMiktar} {malzeme.birim}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          
          {/* Bakım Durumu */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Mekanik Bakım Durumu</Title>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Text>Toplam Bakım</Text>
                  <Text>{rapor.bakimlar.mekanik.toplam}</Text>
                </div>
                <div className="flex items-center justify-between">
                  <Text>Sorunlu Bakım</Text>
                  <Text className="text-red-600">{rapor.bakimlar.mekanik.sorunlu}</Text>
                </div>
                <div className="flex items-center justify-between">
                  <Text>Sorunsuz Bakım</Text>
                  <Text className="text-green-600">
                    {rapor.bakimlar.mekanik.toplam - rapor.bakimlar.mekanik.sorunlu}
                  </Text>
                </div>
              </div>
            </Card>
            
            <Card>
              <Title>Elektrik Bakım Durumu</Title>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Text>Toplam Bakım</Text>
                  <Text>{rapor.bakimlar.elektrik.toplam}</Text>
                </div>
                <div className="flex items-center justify-between">
                  <Text>Sorunlu Bakım</Text>
                  <Text className="text-red-600">{rapor.bakimlar.elektrik.sorunlu}</Text>
                </div>
                <div className="flex items-center justify-between">
                  <Text>Sorunsuz Bakım</Text>
                  <Text className="text-green-600">
                    {rapor.bakimlar.elektrik.toplam - rapor.bakimlar.elektrik.sorunlu}
                  </Text>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Elektrik Kesintileri */}
          {rapor.kesintiler.kesintiler.length > 0 && (
            <Card>
              <Title>Elektrik Kesintileri</Title>
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Başlangıç
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bitiş
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Süre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rapor.kesintiler.kesintiler.map((kesinti, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {kesinti.sahaAdi}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(kesinti.baslangicTarihi, 'dd MMM yyyy HH:mm', { locale: tr })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {kesinti.bitisTarihi 
                            ? format(kesinti.bitisTarihi, 'dd MMM yyyy HH:mm', { locale: tr })
                            : '-'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Math.floor(kesinti.sure / 60)} saat {kesinti.sure % 60} dk
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            kesinti.durum === 'devam-ediyor' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {kesinti.durum === 'devam-ediyor' ? 'Devam Ediyor' : 'Tamamlandı'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          
          {/* Yapılan İşler */}
          {rapor.yapilanIsler.isListesi.length > 0 && (
            <Card>
              <Title>Yapılan İşler</Title>
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Başlık
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tarih
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rapor.yapilanIsler.isListesi.map((is, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {is.baslik}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {is.saha}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(is.tarih, 'dd MMM yyyy', { locale: tr })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};