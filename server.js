const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = 'drloay_secret_2025';
const DATA_DIR = path.join(__dirname, 'data');
const APPOINTMENTS_PATH = path.join(DATA_DIR, 'appointments.json');
const ADMIN_PATH = path.join(DATA_DIR, 'admin.json');
const SERVICES_PATH = path.join(DATA_DIR, 'services.json');
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');
const PATIENTS_PATH = path.join(DATA_DIR, 'patients.json');

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());
app.use(express.static('public'));

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(path.join(__dirname, 'public/images'))) fs.mkdirSync(path.join(__dirname, 'public/images'), { recursive: true });

if (!fs.existsSync(APPOINTMENTS_PATH)) fs.writeFileSync(APPOINTMENTS_PATH, JSON.stringify([]));
if (!fs.existsSync(PATIENTS_PATH)) fs.writeFileSync(PATIENTS_PATH, JSON.stringify([]));
if (!fs.existsSync(ADMIN_PATH)) fs.writeFileSync(ADMIN_PATH, JSON.stringify({ username: 'admin', password: bcrypt.hashSync('admin123', 10) }));
if (!fs.existsSync(SERVICES_PATH)) fs.writeFileSync(SERVICES_PATH, JSON.stringify([
{ id: uuidv4(), name: 'Implants Dentaires', icon: 'tooth', description: 'Implants de dernière génération pour retrouver un sourire complet et naturel.', price: 'À partir de 8000 MAD', duration: '2-3 séances', color: '#667eea' },
{ id: uuidv4(), name: 'Orthodontie Invisible', icon: 'teeth', description: 'Aligneurs transparents sur mesure pour corriger votre sourire discrètement.', price: 'À partir de 15000 MAD', duration: '12-18 mois', color: '#f093fb' },
{ id: uuidv4(), name: 'Facettes Dentaires', icon: 'star', description: 'Facettes en porcelaine ultra-minces pour un sourire hollywoodien parfait.', price: 'À partir de 2500 MAD', duration: '2 séances', color: '#4facfe' },
{ id: uuidv4(), name: 'Blanchiment Premium', icon: 'sparkles', description: 'Blanchiment professionnel jusqu\'à 8 nuances plus blanc en une seule séance.', price: 'À partir de 1500 MAD', duration: '1h30', color: '#43e97b' },
{ id: uuidv4(), name: 'Soins Esthétiques', icon: 'smile', description: 'Composites et résines pour restaurer la beauté naturelle de chaque dent.', price: 'À partir de 600 MAD', duration: '1 séance', color: '#fa709a' },
{ id: uuidv4(), name: 'Chirurgie Buccale', icon: 'shield', description: 'Extractions et interventions réalisées avec précision et confort maximal.', price: 'Sur devis', duration: 'Variable', color: '#f6d365' }
]));
if (!fs.existsSync(SETTINGS_PATH)) fs.writeFileSync(SETTINGS_PATH, JSON.stringify({
doctorName: 'Dr. LOAY',
clinicName: 'Cabinet Dentaire Dr. LOAY',
specialty: 'Chirurgien Dentiste & Expert en Esthétique',
phone: '+212 6 00 00 00 00',
email: 'contact@drloay-dentaire.ma',
address: 'Casablanca, Maroc',
whatsapp: '212600000000',
hours: 'Lun-Sam: 9h-20h',
experience: '15',
patients: '3000',
rating: '4.9',
instagram: '#',
facebook: '#'
}));

const readJSON = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; } };
const writeJSON = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2));

const storageConfig = multer.diskStorage({
destination: (req, file, cb) => cb(null, 'public/images/'),
filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storageConfig });

const auth = (req, res, next) => {
const token = req.headers.authorization?.split(' ')[1];
if (!token) return res.status(401).json({ error: 'Non autorisé' });
try { req.user = jwt.verify(token, SECRET); next(); }
catch { res.status(401).json({ error: 'Token invalide' }); }
};

app.post('/api/login', (req, res) => {
const { username, password } = req.body;
const admin = readJSON(ADMIN_PATH);
if (username !== admin.username || !bcrypt.compareSync(password, admin.password))
return res.status(401).json({ error: 'Identifiants incorrects' });
res.json({ token: jwt.sign({ username }, SECRET, { expiresIn: '24h' }) });
});

app.post('/api/change-password', auth, (req, res) => {
const admin = readJSON(ADMIN_PATH);
writeJSON(ADMIN_PATH, { ...admin, password: bcrypt.hashSync(req.body.newPassword, 10) });
res.json({ success: true });
});

app.get('/api/appointments', auth, (req, res) => res.json(readJSON(APPOINTMENTS_PATH)));
app.post('/api/appointments', (req, res) => {
const appointments = readJSON(APPOINTMENTS_PATH);
const apt = { id: uuidv4(), ...req.body, status: 'pending', createdAt: new Date().toISOString() };
appointments.push(apt);
writeJSON(APPOINTMENTS_PATH, appointments);
res.json(apt);
});
app.put('/api/appointments/:id', auth, (req, res) => {
let apts = readJSON(APPOINTMENTS_PATH);
apts = apts.map(a => a.id === req.params.id ? { ...a, ...req.body } : a);
writeJSON(APPOINTMENTS_PATH, apts);
res.json({ success: true });
});
app.delete('/api/appointments/:id', auth, (req, res) => {
writeJSON(APPOINTMENTS_PATH, readJSON(APPOINTMENTS_PATH).filter(a => a.id !== req.params.id));
res.json({ success: true });
});

app.get('/api/services', (req, res) => res.json(readJSON(SERVICES_PATH)));
app.post('/api/services', auth, (req, res) => {
const services = readJSON(SERVICES_PATH);
const s = { id: uuidv4(), ...req.body };
services.push(s);
writeJSON(SERVICES_PATH, services);
res.json(s);
});
app.put('/api/services/:id', auth, (req, res) => {
let services = readJSON(SERVICES_PATH);
services = services.map(s => s.id === req.params.id ? { ...s, ...req.body } : s);
writeJSON(SERVICES_PATH, services);
res.json({ success: true });
});
app.delete('/api/services/:id', auth, (req, res) => {
writeJSON(SERVICES_PATH, readJSON(SERVICES_PATH).filter(s => s.id !== req.params.id));
res.json({ success: true });
});

app.get('/api/settings', (req, res) => res.json(readJSON(SETTINGS_PATH)));
app.put('/api/settings', auth, (req, res) => {
writeJSON(SETTINGS_PATH, req.body);
res.json({ success: true });
});

app.get('/api/stats', auth, (req, res) => {
const apts = readJSON(APPOINTMENTS_PATH);
const today = new Date().toDateString();
const thisMonth = new Date().getMonth();
res.json({
total: apts.length,
pending: apts.filter(a => a.status === 'pending').length,
confirmed: apts.filter(a => a.status === 'confirmed').length,
today: apts.filter(a => new Date(a.createdAt).toDateString() === today).length,
cancelled: apts.filter(a => a.status === 'cancelled').length,
completed: apts.filter(a => a.status === 'completed').length,
thisMonth: apts.filter(a => new Date(a.createdAt).getMonth() === thisMonth).length
});
});

app.post('/api/upload', auth, upload.single('image'), (req, res) => {
if (!req.file) return res.status(400).json({ error: 'No file' });
res.json({ url: `${req.protocol}://${req.get('host')}/images/${req.file.filename}` });
});

app.listen(PORT, '0.0.0.0', () => console.log(`✅ Dr. LOAY Server: http://localhost:${PORT}`));
