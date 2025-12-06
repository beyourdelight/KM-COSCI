// frontend/web/js/browse-topics.js

// ==========================================
// Helper Functions (ฟังก์ชันช่วยทำงานทั่วไป)
// ==========================================

// 1. ฟังก์ชันสลับ Tab (ใช้โดย HTML onclick)
window.triggerTab = function(tabId) {
    const tabEl = document.querySelector(`#${tabId}`);
    if (tabEl) {
        const tab = new bootstrap.Tab(tabEl);
        tab.show();
    }
};

// 2. ฟังก์ชันหารูปภาพ (ถ้าไม่มีใช้รูป Default)
function getImageUrl(item) {
    return item.coverImage 
        ? `${CONFIG.MEDIA_URL}${item.coverImage.url}` 
        : 'images/topics/undraw_Remote_design_team_re_urdx.png';
}

// 3. ฟังก์ชันสร้างลิงก์ (เช็คว่ามี Video หรือไม่)
function getLinkUrl(item) {
    const hasVideo = item.videoList && item.videoList.length > 0;
    return hasVideo 
        ? `view-content.html?id=${item.documentId}` 
        : `topics-detail.html?id=${item.documentId}`;
}

// 4. ฟังก์ชันแปลงวันที่
function formatDate(dateString) {
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

// 5. ฟังก์ชันสร้าง Loading Spinner
function getSpinnerHtml(text = "กำลังโหลดข้อมูล...") {
    return `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">${text}</p>
        </div>`;
}

// ==========================================
// ส่วนที่ 1: Browse Topics (แยกตาม Tab)
// ==========================================

async function loadBrowseTopics() {
    // Mapping Slug -> HTML ID
    const categoryMap = {
        'academic': 'row-cat-1',
        'administration': 'row-cat-3',
        'human-resources': 'row-cat-5',
        'student-affairs': 'row-cat-7'
    };

    // แสดง Loading ในทุก Tab
    Object.values(categoryMap).forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = getSpinnerHtml();
    });

    try {
        const response = await fetch(`${CONFIG.API_URL}/api/knowledge-items?populate=*&pagination[pageSize]=100&sort[0]=createdAt:desc`);
        const result = await response.json();
        const items = result.data;

        // เคลียร์ Loading ออกก่อนเริ่มใส่ข้อมูล
        Object.values(categoryMap).forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = '';
        });

        if (!items || items.length === 0) return;

        items.forEach(item => {
            // หาหมวดหมู่ (รองรับโครงสร้างหลายแบบ)
            let catData = item.category || item.Category || item.categories;
            if (Array.isArray(catData)) catData = catData[0];

            if (!catData || !catData.slug) return; // ข้ามถ้าไม่มีหมวดหมู่

            const targetRowId = categoryMap[catData.slug];
            const targetContainer = document.getElementById(targetRowId);

            if (targetContainer) {
                const link = getLinkUrl(item);
                const imgUrl = getImageUrl(item);
                const views = item.views || 0;

                const cardHtml = `
                    <div class="col-lg-4 col-md-6 col-12 mb-4">
                        <div class="custom-block bg-white shadow-lg h-100">
                            <a href="${link}" class="d-block text-decoration-none">
                                <div class="d-flex align-items-center p-3">
                                    <div class="flex-grow-1 overflow-hidden">
                                        <h5 class="mb-1 text-truncate text-dark">${item.title}</h5>
                                        <p class="mb-0 text-muted small">Click to view</p>
                                    </div>
                                    <span class="badge bg-light text-secondary border rounded-pill ms-2">${views} Views</span>
                                </div>
                                <div style="height: 200px; overflow: hidden;">
                                    <img src="${imgUrl}" class="w-100 h-100" style="object-fit: cover;" alt="${item.title}">
                                </div>
                            </a>
                        </div>
                    </div>
                `;
                targetContainer.innerHTML += cardHtml;
            }
        });

        // เช็คว่า Tab ไหนว่าง ให้ขึ้นข้อความแจ้ง
        Object.values(categoryMap).forEach(rowId => {
            const el = document.getElementById(rowId);
            if(el && el.innerHTML.trim() === '') {
                el.innerHTML = '<div class="col-12 text-center text-muted py-4">ยังไม่มีเนื้อหาในหมวดหมู่นี้</div>';
            } 
        });

    } catch (error) {
        console.error("Error loading Browse Topics:", error);
    }
}

// ==========================================
// ส่วนที่ 2: Latest Updates (แนวนอน + Pagination)
// ==========================================

async function loadLatestUpdates(page = 1) {
    const container = document.getElementById('latest-container');
    const paginationContainer = document.getElementById('latest-pagination');
    
    if (!container) return;

    container.innerHTML = getSpinnerHtml("กำลังโหลดข้อมูลล่าสุด...");

    try {
        const pageSize = 3;
        const apiUrl = `${CONFIG.API_URL}/api/knowledge-items?sort[0]=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}&populate=*`;
        
        const response = await fetch(apiUrl);
        const result = await response.json();
        const items = result.data;
        const meta = result.meta.pagination;

        if (!items || items.length === 0) {
            container.innerHTML = '<div class="col-12 py-5"><p class="text-center text-muted">ยังไม่มีรายการอัปเดตล่าสุด</p></div>';
            if(paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        let htmlContent = '';

        items.forEach(item => {
            const linkUrl = getLinkUrl(item);
            const imgUrl = getImageUrl(item);
            const dateStr = formatDate(item.createdAt);
            const hasVideo = item.videoList && item.videoList.length > 0;

            htmlContent += `
                <div class="custom-block custom-block-topics-listing bg-white shadow-lg mb-4 p-4 border-0" style="border-radius: 20px;">
                    <div class="d-flex align-items-center flex-column flex-md-row">
                        
                        <div class="custom-block-image me-md-4 mb-3 mb-md-0" style="width: 180px; height: 120px; flex-shrink: 0; overflow: hidden; border-radius: 15px;">
                            <a href="${linkUrl}">
                                <img src="${imgUrl}" class="w-100 h-100" style="object-fit: cover; transition: transform 0.3s;" alt="${item.title}">
                            </a>
                        </div>

                        <div class="w-100">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h5 class="mb-0 text-truncate" style="max-width: 85%;">
                                    <a href="${linkUrl}" class="text-dark text-decoration-none fw-bold hover-primary">
                                        ${item.title}
                                    </a>
                                </h5>
                                <span class="badge bg-light text-secondary border rounded-pill px-3">${dateStr}</span>
                            </div>

                            <p class="text-muted mb-0" style="font-size: 0.95rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.6;">
                                ${item.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                            </p>

                            <div class="mt-2">
                                <a href="${linkUrl}" class="text-decoration-none small text-primary fw-bold">
                                    ${hasVideo ? '<i class="bi-play-circle-fill me-1"></i> Video Content' : '<i class="bi-file-text-fill me-1"></i> Article'}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = htmlContent;
        renderPagination(meta, paginationContainer); // เรียกใช้ฟังก์ชันสร้างปุ่ม

    } catch (error) {
        console.error("Error loading latest updates:", error);
        container.innerHTML = '<p class="text-center text-danger py-4">เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์</p>';
    }
}

// ==========================================
// ส่วนที่ 3: Pagination Logic (สร้างปุ่มเปลี่ยนหน้า)
// ==========================================

function renderPagination(meta, container) {
    if(!container) return;
    
    const currentPage = meta.page;
    const totalPages = meta.pageCount;

    if(totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    // ปุ่ม Previous
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="event.preventDefault(); loadLatestUpdates(${currentPage - 1})">ก่อนหน้า</a>
        </li>
    `;

    // ปุ่มตัวเลข
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="event.preventDefault(); loadLatestUpdates(${i})">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // ปุ่ม Next
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="event.preventDefault(); loadLatestUpdates(${currentPage + 1})">ถัดไป</a>
        </li>
    `;

    container.innerHTML = paginationHTML;
}

// ==========================================
// เริ่มทำงาน (Main Execution)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // เช็คว่ามี CONFIG ไหม ถ้าไม่มีให้เตือน
    if (typeof CONFIG === 'undefined') {
        console.error("❌ ไม่พบไฟล์ config.js กรุณาตรวจสอบการนำเข้าไฟล์");
        return;
    }

    // เรียกฟังก์ชันหลัก
    loadBrowseTopics();
    loadLatestUpdates(1);
});