export interface ElektrikBakim {
  id: string;
  sahaId: string;
  tarih: any; // Timestamp
  kontrolEden: {
    id: string;
    ad: string;
    rol: string;
  };
  fotograflar: string[];
  durumlar: {
    ogSistemleri: Record<string, boolean>;
    ogSistemleriAciklamalar?: Record<string, string>;
    trafolar: Record<string, boolean>;
    trafoAciklamalar?: Record<string, string>;
    agDagitimPanosu: Record<string, boolean>;
    agDagitimPanosuAciklamalar?: Record<string, string>;
    invertorler: Record<string, boolean>;
    invertorlerAciklamalar?: Record<string, string>;
    toplamaKutulari: Record<string, boolean>;
    toplamaKutulariAciklamalar?: Record<string, string>;
    pvModulleri: Record<string, boolean>;
    pvModulleriAciklamalar?: Record<string, string>;
    kabloTasima: Record<string, boolean>;
    kabloTasimaAciklamalar?: Record<string, string>;
    aydinlatmaGuvenlik: Record<string, boolean>;
    aydinlatmaGuvenlikAciklamalar?: Record<string, string>;
    topraklamaSistemleri: Record<string, boolean>;
    topraklamaSistemleriAciklamalar?: Record<string, string>;
  };
  genelNotlar?: string;
  olusturmaTarihi: any; // Timestamp
}

export interface GesVerisi {
  id: string;
  santralId: string;
  tarih: any; // Timestamp
  gunlukUretim: number; // kWh
  anlikGuc: number; // kW
  performansOrani: number; // %
  gelir: number; // TL
  tasarrufEdilenCO2: number; // kg
  hava: {
    sicaklik: number;
    nem: number;
    radyasyon: number;
  };
  notlar?: string;
  olusturanKisi: {
    id: string;
    ad: string;
  };
  olusturmaTarihi: any; // Timestamp
}

export interface GesDetay {
  id: string;
  ad: string;
  kurulumTarihi: any; // Timestamp
  konum: {
    lat: number;
    lng: number;
    adres: string;
  };
  kapasite: number; // kWp
  panelSayisi: number;
  inverterSayisi: number;
  yillikHedefUretim: number; // kWh
  aylikHedefler?: {
    ocak: number;
    subat: number;
    mart: number;
    nisan: number;
    mayis: number;
    haziran: number;
    temmuz: number;
    agustos: number;
    eylul: number;
    ekim: number;
    kasim: number;
    aralik: number;
  };
  musteriId: string;
  fotograflar?: string[];
  teknikOzellikler: {
    panelTipi: string;
    inverterTipi: string;
    panelGucu: number; // W
    sistemVerimi: number; // %
  };
  olusturmaTarihi: any; // Timestamp
}

export interface MekanikBakim {
  id: string;
  sahaId: string;
  tarih: any; // Timestamp
  kontrolEden: {
    id: string;
    ad: string;
    rol: string;
  };
  fotograflar: string[];
  durumlar: {
    cevreselDurum: Record<string, boolean>;
    cevreselDurumAciklamalar?: Record<string, string>;
    araziDurumu: Record<string, boolean>;
    araziDurumuAciklamalar?: Record<string, string>;
    tasiyiciYapilar: Record<string, boolean>;
    tasiyiciYapilarAciklamalar?: Record<string, string>;
    kazikVeKirisler: Record<string, boolean>;
    kazikVeKirislerAciklamalar?: Record<string, string>;
    pvModulleri: Record<string, boolean>;
    pvModulleriAciklamalar?: Record<string, string>;
    elektrikSistemleri: Record<string, boolean>;
    elektrikSistemleriAciklamalar?: Record<string, string>;
  };
  genelNotlar?: string;
  olusturmaTarihi: any; // Timestamp
}

export interface ElektrikKesinti {
  id: string;
  sahaId: string;
  baslangicTarihi: any; // Timestamp
  bitisTarihi: any; // Timestamp
  sure: number; // dakika
  aciklama: string;
  etkiAlani?: string;
  durum: 'devam-ediyor' | 'tamamlandi';
  olusturanKisi: {
    id: string;
    ad: string;
  };
  olusturmaTarihi: any; // Timestamp
}

export interface InvertorKontrol {
  id: string;
  sahaId: string;
  tarih: any; // Timestamp
  invertorler: Array<{
    ad: string;
    dizeCalisiyor: boolean;
  }>;
  aciklama?: string;
  olusturanKisi: {
    id: string;
    ad: string;
    rol: string;
  };
  olusturmaTarihi: any; // Timestamp
}

export interface IsRaporu {
  id: string;
  baslik: string;
  aciklama: string;
  yapilanIsler: string;
  saha: string;
  tarih: any; // Timestamp
  baslangicSaati: string;
  bitisSaati: string;
  fotograflar: string[];
  olusturanKisi: {
    id: string;
    ad: string;
    rol: string;
  };
  malzemeler?: string[];
}

export interface Ariza {
  id: string;
  baslik: string;
  aciklama: string;
  konum: string;
  saha: string;
  sahaAdi?: string;
  oncelik: 'dusuk' | 'orta' | 'yuksek' | 'acil';
  durum: 'acik' | 'devam-ediyor' | 'beklemede' | 'cozuldu';
  atananKisi?: string;
  fotograflar?: string[];
  olusturmaTarihi: any; // Timestamp
  guncellenmeTarihi?: any; // Timestamp
  olusturanKisi: string;
  olusturanKisiAdi?: string;
  yorumlar?: Array<{
    id: string;
    kullaniciId: string;
    kullaniciAdi: string;
    mesaj: string;
    tarih: any; // Timestamp
  }>;
  cozum?: {
    aciklama: string;
    tamamlanmaTarihi: any; // Timestamp
    tamamlayanKisi: string;
    fotograflar?: string[];
    malzemeler?: string[];
  };
}

export interface Saha {
  id: string;
  ad: string;
  konum: string;
  kapasite: string;
  aciklama?: string;
}

export type KullaniciRolu = 'yonetici' | 'tekniker' | 'muhendis' | 'musteri' | 'bekci';

export interface Kullanici {
  id: string;
  ad: string;
  email: string;
  telefon?: string;
  rol: KullaniciRolu;
  fotoURL?: string;
  sahalar?: string[];
  sirket?: string;
  adres?: string;
  saha?: string;
}

export interface Bildirim {
  id: string;
  baslik: string;
  mesaj: string;
  tarih: any; // Timestamp
  okundu: boolean;
  tip: 'ariza' | 'yorum' | 'durum' | 'sistem';
  link?: string;
  kullaniciId: string;
}