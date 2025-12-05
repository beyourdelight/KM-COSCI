// frontend/web/js/topics-detail.js

async function loadTopicDetail() {
    try {
        // 1. รับ ID จาก URL
        const urlParams = new URLSearchParams(window.location.search);
        let documentId = urlParams.get('id');
        let apiUrl = "";

        // ถ้ามี ID ให้ดึงเรื่องนั้น, ถ้าไม่มีให้ดึงเรื่องล่าสุดมาโชว์แก้ขัด
        if (documentId) {
            console.log("📍 โหลดเนื้อหา ID:", documentId);
            apiUrl = `${CONFIG.API_URL}/api/knowledge-items/${documentId}?populate=*`;
        } else {
            console.warn("⚠️ ไม่พบ ID -> ดึงตัวล่าสุดมาโชว์แทน");
            const response = await fetch(`${CONFIG.API_URL}/api/knowledge-items?sort[0]=createdAt:desc&pagination[pageSize]=1&populate=*`);
            const result = await response.json();
            
            if (result.data && result.data.length > 0) {
                const latestItem = result.data[0];
                documentId = latestItem.documentId;
                apiUrl = `${CONFIG.API_URL}/api/knowledge-items/${documentId}?populate=*`;
            } else {
                throw new Error("ไม่พบข้อมูลใน Strapi เลย");
            }
        }

        // 2. ยิง API ดึงข้อมูล
        const response = await fetch(apiUrl);
        const result = await response.json();
        const item = result.data;

        if (!item) throw new Error("ไม่พบข้อมูล (Data is null)");

        console.log("✅ ได้ข้อมูลมาจาก Strapi:", item);

        // --- 3. เริ่มเอาข้อมูลแปะลง HTML ---

        // A. ส่วน Title (ชื่อเรื่อง) - แปะทั้งส่วน Header และส่วนเนื้อหา
        const heroTitle = document.getElementById('hero-title');
        if (heroTitle) heroTitle.innerText = item.title;

        const detailTitle = document.getElementById('detail-title'); // หัวข้อในส่วนเนื้อหา
        if (detailTitle) detailTitle.innerText = item.title;

        // B. (ตัดส่วน Major ออกแล้วตามที่ขอ) ✂️

        // // C. ส่วนรูปภาพปก (Cover Image)
        // const imageEl = document.querySelector('.topics-detail-block-image');
        // if (imageEl && item.coverImage) {
        //     imageEl.src = `${CONFIG.MEDIA_URL}${item.coverImage.url}`;
        //     imageEl.alt = item.title;
        // }

        // D. ส่วนเนื้อหา (Rich Text / Content) 📝
        // แปลงจาก Blocks JSON -> HTML
        const contentDiv = document.getElementById('detail-content');
        if (contentDiv) {
            // เรียกฟังก์ชันแปลงร่างที่อยู่ข้างล่าง
            contentDiv.innerHTML = renderRichText(item.content);
        }

        // E. ส่วนรูปภาพแนบ (Attachments) 🖼️
        const imagesContainer = document.getElementById('detail-images');
        if (imagesContainer) {
            imagesContainer.innerHTML = ""; // เคลียร์รูป Mockup เก่าออกให้หมด

            if (item.attachments && item.attachments.length > 0) {
                item.attachments.forEach(img => {
                    const imgHtml = `
                        <div class="col-lg-6 col-md-6 col-12 mb-4">
                            <img src="${CONFIG.MEDIA_URL}${img.url}" 
                                 class="img-fluid rounded shadow-sm" 
                                 alt="${img.alternativeText || 'Image'}"
                                 style="width: 100%; height: 300px; object-fit: cover;">
                        </div>
                    `;
                    imagesContainer.innerHTML += imgHtml;
                });
            }
        }

    } catch (error) {
        console.error("🔥 Error:", error);
        // แจ้งเตือน user หน้าเว็บ
        const titleEl = document.getElementById('hero-title');
        if (titleEl) titleEl.innerText = "Error loading content";
        
        const contentDiv = document.getElementById('detail-content');
        if (contentDiv) contentDiv.innerHTML = `<p class="text-danger">เกิดข้อผิดพลาด: ${error.message}</p>`;
    }
}

// === ฟังก์ชันเสริม: แปลง Strapi Rich Text (Blocks) เป็น HTML ===
function renderRichText(blocks) {
    if (!blocks) return "<p>ไม่มีเนื้อหา</p>";
    
    return blocks.map(block => {
        // จัดการย่อหน้า (Paragraph)
        if (block.type === 'paragraph' || !block.type) {
            const text = block.children.map(child => {
                let htmlText = child.text;
                // จัดการตัวหนา/ตัวเอียง/ขีดเส้นใต้
                if (child.bold) htmlText = `<strong>${htmlText}</strong>`;
                if (child.italic) htmlText = `<em>${htmlText}</em>`;
                if (child.underline) htmlText = `<u>${htmlText}</u>`;
                if (child.strikethrough) htmlText = `<del>${htmlText}</del>`;
                return htmlText;
            }).join('');
            
            // ถ้าเป็นบรรทัดว่างๆ ไม่ต้องโชว์
            if (!text.trim()) return "<br>";
            return `<p>${text}</p>`;
        }
        
        // จัดการหัวข้อ (Heading H1-H6)
        if (block.type === 'heading') {
            const text = block.children.map(child => child.text).join('');
            return `<h${block.level} class="mt-4 mb-3">${text}</h${block.level}>`;
        }

        // จัดการรายการ (List)
        if (block.type === 'list') {
            const tag = block.format === 'ordered' ? 'ol' : 'ul';
            const items = block.children.map(item => {
                const itemText = item.children.map(c => c.text).join('');
                return `<li>${itemText}</li>`;
            }).join('');
            return `<${tag}>${items}</${tag}>`;
        }

        return "";
    }).join('');
}

// สั่งทำงานทันที
loadTopicDetail();