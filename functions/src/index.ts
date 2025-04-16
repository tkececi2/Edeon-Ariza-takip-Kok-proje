import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const serviceAccount = {
  "type": "service_account",
  "project_id": "arizalar-955b6",
  "private_key_id": "8ccc45427d98ceb15adfd1c0139ad85f411e2911",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDX9gEssYOZQr02\n1gflcBEaYG65Dzo89ljNCR0mghEB20t/3Itti/fNsPuok1/PDNPADblQc2zbzafT\nDxixLubn4cxVSzXM8SrnAtGIcg6TLWeNzO/4Oaz4h7kjv0naQy87PkjcLaD6Ksfv\n1BfodS7H/3ZQ1hezWN9m/kr4mtq6B/dODTPBrs1NeTMOuBBHQS6OEfKwoxFFvnor\nnGOh+tP86pbbNHOfMd/OqY1o9LGAx0tQHm8x23K7TwYxIo6PoxKW/O1l3MgOGb3R\nmBKslnSwITBdT9RxOP1NsEPiz4PrB5Uz/AhApP4qZVemTVcCUcBLZGsGeqs6YwYo\nmvKCG2zbAgMBAAECggEAYvYceK4Jl2ABU9EFQkq106fv5QaI0emzLJWqEXzVrUuf\nz8Iw9CyJC+03jPqnkzoWCHJhgm+6KQkXB/zpfDv5XLXYTBeQWk8DMWPVv5hAfIn4\nY37PUiifzi1nle1wur9Bs/ypJ5gTJcAX6Zr/r6qPGt/CCG3q42jsyoXptf1EEK2A\n0eGC7oJydmD31suUUGRxbyL5nu2f0+WUmBNsdoBE1TVlmKsvUBv20oZtV6w8DyCH\naeh981fHWxYyTnvsL0hJnZyVP1LgjZMGAOeZvwg22ME4mNxULCO19sbCzFLAIXJo\n8Rs4SvOx6PpNN8UDxspZZpHBLFuaiEQbTdtmUNhIMQKBgQD72QIzKWLIMp6qBp6F\nowW6TKIYCsgbt5OSgkGLfUZTEaj/hcnR2Zb2OzsZWq0GQT1DyR2muJC3oEpiJuFR\n92yS1v4+qZ31IpxnvDavKvhDPdssyrl9DKLQOafxvYdEqFGlQJbPIWlYyqMEGMIZ\nt+nSluCrmcuHiC0ys50owkqykQKBgQDbhYa8PwjwA0abBSWSozypa+f7VMg2Pyfn\niEe07O/FUZ1zmVCqs/P5yhRDIizagAIiIwIzCMSi6hvpyyWZZdWCbFj/5ZMnBID1\nXdHalihkN8Y6/1ijKYN+eBtZ1pJo3c2PL6PdjB+hvKfv/vwCEbR4uuBz3iMVs0DY\n8Vfjq3rGqwKBgQDR0JYzl2wTi5CB6CfS/+D6t3Nngjv6U3NfYKNImaKn/BOGZaig\n6p0JIIl48wEpL9rhiUDpr+PpB2JQ6UFYb0CGCRUhkV/mZOJWzgfk4XCZXIQnifEE\njC1sOkx/aj2yZmQ2v1ukzpocfh1XgWTb1ku3xTkB3YwhqsK09cyds1hV8QKBgQCG\nfFk8/oklMXySACcynNrPGJJ4gUpfIXX6/JyhlP6XrhZ9+ZFX4wM3JrwfHNLJ0d58\nt2Hjjh2ZiT8sjg4s2hxh2Kr1qtnp73Jp395uwcthCmJhRoow+3/ZfQ+UjEYKBMio\nThFf6zZ9yaxA9b/CLMKZrDNSCOcJplW2ErU7f5SqHQKBgAm6jRHZOnHbuP5oUCGN\nLP8VjHjcspqrwDCN+aeKv8a2VkTyb2FDj9Fj3jghY6+vS4NTpOtHChJREPgKTYHc\nuSX59YMkBm6kpiipZ2Eo/+xd7M40bYLdtAQ7MS3FBPSGVK0dMTWV1INlaiOpHCKX\nKqVxha/JaOko0hRzROaa38bl\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-ubtid@arizalar-955b6.iam.gserviceaccount.com",
  "client_id": "100902356862462578365",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-ubtid%40arizalar-955b6.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  storageBucket: "arizalar-955b6.appspot.com"
});

export const storage = admin.storage();
export const bucket = storage.bucket();