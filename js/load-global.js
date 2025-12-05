// frontend/web/js/load-global.js

async function loadGlobalSettings() {
    console.log("🚀 เริ่มโหลด Global Settings..."); // 1. เช็คว่าฟังก์ชันทำงานไหม

    try {
        const url = `${CONFIG.API_URL}/api/global?populate=*`;
        console.log("🔗 กำลังยิงไปที่:", url); // 2. เช็คว่า URL ถูกไหม

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`); // 3. ถ้า 403/404 จะรู้ตรงนี้
        }

        const result = await response.json();
        const data = result.data;

        console.log("📦 ข้อมูลที่ได้:", data); // 4. ดูว่าได้ของมาไหม

        if (data) {
            // Navbar Logo
            if (data.navbar_logo) {
                const imgUrl = `${CONFIG.MEDIA_URL}${data.navbar_logo.url}`;
                console.log("🖼️ จะเปลี่ยนรูป Navbar เป็น:", imgUrl);
                const navLogo = document.getElementById('nav-logo');
                if (navLogo) navLogo.src = imgUrl;
            } else {
                console.warn("⚠️ ไม่พบ navbar_logo ใน Strapi");
            }

            // Footer Logo
            if (data.footer_logo) {
                const imgUrl = `${CONFIG.MEDIA_URL}${data.footer_logo.url}`;
                const footerLogo = document.getElementById('footer-logo');
                if (footerLogo) footerLogo.src = imgUrl;
            }
        }

    } catch (error) {
        console.error("🔥 พังตรงนี้:", error);
    }
}

loadGlobalSettings();