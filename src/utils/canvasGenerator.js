const { createCanvas, loadImage } = require('@napi-rs/canvas');

module.exports = {
    async createRankCard(user, { level, currentXp, requiredXp, rank }) {
        const width = 900;
        const height = 280;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Arka Plan: Koyu Siber Gece Mavisi Degrade
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#050b18');
        bgGrad.addColorStop(1, '#0a1733');
        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, 24);
        ctx.fill();

        // Kart Dış Çerçeve Neon Mavi Parıltı
        ctx.strokeStyle = '#0099ff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Kart İçi Cam / Panel Efekti
        ctx.fillStyle = 'rgba(11, 25, 54, 0.85)';
        ctx.beginPath();
        ctx.roundRect(20, 20, width - 40, height - 40, 18);
        ctx.fill();

        // Siber Mavi Dekoratif Çizgiler
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(260, 40);
        ctx.lineTo(840, 40);
        ctx.stroke();

        // Avatar
        const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
        try {
            const avatar = await loadImage(avatarUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(140, 140, 75, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 65, 65, 150, 150);
            ctx.restore();

            // Avatar Neon Mavi Halka
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(140, 140, 75, 0, Math.PI * 2, true);
            ctx.stroke();
        } catch (e) {
            console.error('Avatar yüklenemedi:', e.message);
        }

        // Kullanıcı Adı
        ctx.font = 'bold 36px sans-serif';
        ctx.fillStyle = '#ffffff';
        const name = user.displayName || user.username;
        const truncatedName = name.length > 15 ? name.substring(0, 15) + '...' : name;
        ctx.fillText(truncatedName, 260, 105);

        // Sıralama (Rank) - Neon Cyan
        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = '#00f0ff';
        ctx.fillText(`RANK #${rank}`, 260, 150);

        // Seviye (Level) - Parlak Mavi
        ctx.font = 'bold 32px sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`SEVİYE ${level}`, 680, 105);

        // XP Bilgisi - Buz Mavisi
        ctx.font = '22px sans-serif';
        ctx.fillStyle = '#90cdf4';
        const xpText = `${currentXp.toLocaleString()} / ${requiredXp.toLocaleString()} XP`;
        ctx.fillText(xpText, 660, 168);

        // İlerleme Çubuğu Arka Planı
        const barX = 260;
        const barY = 190;
        const barWidth = 580;
        const barHeight = 28;

        ctx.fillStyle = '#0f224a';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 14);
        ctx.fill();

        // İlerleme Çubuğu Neon Mavi Degrade
        const percentage = Math.min(Math.max(currentXp / requiredXp, 0), 1);
        const progressWidth = Math.max(barWidth * percentage, 28);

        const barGrad = ctx.createLinearGradient(barX, 0, barX + progressWidth, 0);
        barGrad.addColorStop(0, '#0052cc');
        barGrad.addColorStop(0.5, '#0099ff');
        barGrad.addColorStop(1, '#00f0ff');

        ctx.fillStyle = barGrad;
        ctx.beginPath();
        ctx.roundRect(barX, barY, progressWidth, barHeight, 14);
        ctx.fill();

        return canvas.toBuffer('image/png');
    },

    async createWelcomeCard(member) {
        const width = 800;
        const height = 350;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Arka Plan Degrade
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#050b18');
        bgGrad.addColorStop(1, '#0a1733');
        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, 24);
        ctx.fill();

        // Neon Mavi Kenarlık
        ctx.strokeStyle = '#0099ff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Cam Panel
        ctx.fillStyle = 'rgba(11, 25, 54, 0.85)';
        ctx.beginPath();
        ctx.roundRect(20, 20, width - 40, height - 40, 18);
        ctx.fill();

        // Avatar
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
        try {
            const avatar = await loadImage(avatarUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(width / 2, 120, 60, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, (width / 2) - 60, 60, 120, 120);
            ctx.restore();

            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(width / 2, 120, 60, 0, Math.PI * 2, true);
            ctx.stroke();
        } catch (e) {
            console.error('Hoş geldin avatarı yüklenemedi:', e.message);
        }

        // Hoş Geldin Metni
        ctx.font = 'bold 36px sans-serif';
        ctx.fillStyle = '#00f0ff';
        ctx.textAlign = 'center';
        ctx.fillText('HOŞ GELDİN!', width / 2, 230);

        // Kullanıcı Adı
        ctx.font = '26px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(member.user.tag || member.user.username, width / 2, 270);

        // Üye Sayısı
        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#90cdf4';
        ctx.fillText(`Sunucunun ${member.guild.memberCount}. üyesisin!`, width / 2, 305);

        return canvas.toBuffer('image/png');
    }
};
