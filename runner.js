const { spawn, execSync } = require('child_process');
const path = require('path');

let botProcess = null;
let isRestarting = false;
let checkInterval = null;

// Botu Başlatma Fonksiyonu
function startBot() {
    console.log('[RUNNER] vybot başlatılıyor...');
    
    botProcess = spawn('node', ['src/index.js'], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
    });

    botProcess.on('exit', (code, signal) => {
        botProcess = null;
        if (isRestarting) {
            console.log('[RUNNER] Bot yeniden başlatılıyor...');
            isRestarting = false;
            startBot();
        } else {
            console.log(`[RUNNER] Bot beklenmedik şekilde kapandı (Kod: ${code}, Sinyal: ${signal}). 3 saniye içinde yeniden başlatılıyor...`);
            setTimeout(startBot, 3000);
        }
    });

    botProcess.on('error', (err) => {
        console.error('[RUNNER HATASI]', err);
    });
}

// Botu Güvenli Yeniden Başlatma
function restartBot() {
    if (botProcess) {
        isRestarting = true;
        console.log('[RUNNER] Mevcut bot süreci sonlandırılıyor...');
        if (process.platform === 'win32') {
            try {
                execSync(`taskkill /pid ${botProcess.pid} /T /F`);
            } catch (e) {
                botProcess.kill();
            }
        } else {
            botProcess.kill('SIGTERM');
        }
    } else {
        startBot();
    }
}

// GitHub Güncelleme Kontrolcüsü (Auto-Pull on Push)
function checkForUpdates() {
    try {
        // Git remote kontrolü
        const remotes = execSync('git remote', { encoding: 'utf8', cwd: __dirname }).trim();
        if (!remotes) return; // Henüz remote eklenmemişse bekle

        // Remote güncellemeleri çek
        execSync('git fetch origin', { stdio: 'ignore', cwd: __dirname });

        // Yerel ve uzak commit farkını kontrol et
        const localCommit = execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: __dirname }).trim();
        const upstreamBranch = execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', { encoding: 'utf8', cwd: __dirname }).trim();
        const remoteCommit = execSync(`git rev-parse ${upstreamBranch}`, { encoding: 'utf8', cwd: __dirname }).trim();

        if (localCommit !== remoteCommit) {
            console.log('======================================================');
            console.log('🔄 [GÜNCELLEME TESPİT EDİLDİ] GitHub\'a yeni kod pushlandı!');
            console.log(`Eski Commit: ${localCommit.substring(0, 7)} -> Yeni Commit: ${remoteCommit.substring(0, 7)}`);
            console.log('📦 Kodlar güncelleniyor (git pull)...');
            
            execSync('git pull', { stdio: 'inherit', cwd: __dirname });

            console.log('⚙️ Komutlar Discord API\'ye yeniden deploy ediliyor...');
            try {
                execSync('node src/deploy-commands.js', { stdio: 'inherit', cwd: __dirname });
            } catch (deployErr) {
                console.warn('[UYARI] Deploy sırasında hata oluştu, ancak devam ediliyor:', deployErr.message);
            }

            console.log('🚀 Yeni kodlarla bot yeniden başlatılıyor!');
            console.log('======================================================');

            restartBot();
        }
    } catch (err) {
        // Git henüz yapılandırılmamışsa veya geçici bağlantı hatası varsa sessizce bekle
    }
}

// Başlatma
startBot();

// Her 20 saniyede bir GitHub'dan push / güncelleme kontrol et
checkInterval = setInterval(checkForUpdates, 20000);

// Temiz Kapanış
process.on('SIGINT', () => {
    console.log('[RUNNER] Çıkış yapılıyor...');
    clearInterval(checkInterval);
    if (botProcess) {
        isRestarting = false;
        botProcess.kill();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    clearInterval(checkInterval);
    if (botProcess) {
        isRestarting = false;
        botProcess.kill();
    }
    process.exit(0);
});
