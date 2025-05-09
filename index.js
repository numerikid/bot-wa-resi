const express = require('express');
const fileUpload = require('express-fileupload');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Inisialisasi WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth()
});

// Setup Express
app.use(express.static('public'));
app.use(fileUpload());
app.use(express.urlencoded({ extended: true }));

// Form upload resi
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/form.html');
});

// Endpoint kirim pesan WA
app.post('/send', async (req, res) => {
    const nomor = req.body.nomor;
    const kode = req.body.kode;
    const lokasi = req.body.lokasi;
    const file = req.files?.resi;

    if (!nomor || !kode || !lokasi || !file) {
        return res.send('❌ Semua field wajib diisi!');
    }

    const jam = new Date().getHours();
    let salam = 'Selamat pagi';

    if (jam >= 11 && jam < 15) salam = 'Selamat siang';
    else if (jam >= 15 || jam < 5) salam = 'Selamat sore';

    const caption = `${salam}, Mau info jika ada barang kode marking *${kode}* yang sudah diterima oleh gudang China (${lokasi}) kami ya`;

    // Simpan file sementara ke folder ./upload
    const saveDir = './upload';
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir);

    const savePath = path.join(saveDir, `${Date.now()}_${file.name}`);
    await file.mv(savePath);

    const media = MessageMedia.fromFilePath(savePath);
    const waNumber = nomor + '@c.us';

    client.sendMessage(waNumber, media, { caption })
        .then(() => {
            console.log(`✔️ Resi terkirim ke ${nomor}`);
            fs.unlinkSync(savePath); // Hapus file setelah dikirim
            res.send(`<h2>✔️ Resi berhasil dikirim ke ${nomor}</h2><a href="/">⬅️ Kembali</a>`);
        })
        .catch(err => {
            console.error(`❌ Gagal kirim ke ${nomor}:`, err.message);
            res.send(`<h2>❌ Gagal kirim ke ${nomor}</h2><a href="/">⬅️ Kembali</a>`);
        });
});

// QR Code & status WA
client.on('qr', qr => {
    console.log('📱 Silakan scan QR berikut dengan WhatsApp kamu:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot WhatsApp siap digunakan!');
});

client.on('authenticated', () => {
    console.log('🔐 Berhasil login ke WhatsApp');
});

client.on('auth_failure', msg => {
    console.error('❌ Autentikasi gagal:', msg);
});

// Start bot dan server web
client.initialize();
app.listen(PORT, () => {
    console.log(`🌐 Web form aktif di http://localhost:${PORT}`);
});
