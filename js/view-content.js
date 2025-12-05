document.addEventListener("DOMContentLoaded", async () => {
    // 1. ดึง ID จาก URL
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');

    if (!docId) {
        alert("ไม่พบรหัสเนื้อหา (Missing ID)");
        return;
    }

    // ฟังก์ชันช่วย Copy Path (สำหรับ NAS)
    window.copyNasPath = function(path) {
        navigator.clipboard.writeText(path).then(() => {
            alert('คัดลอกที่อยู่ไฟล์แล้ว: ' + path + '\n\n(นำไปวางใน File Explorer เพื่อเปิดไฟล์)');
        });
    };

    try {
        console.log(`🚀 Loading Content ID: ${docId}`);

        // 2. เรียก API (แก้ไข URL ให้ถูกต้อง 100% ตามรูปภาพ)
        // 1. videoList: ยังคงใช้ populate=* ได้ (เพื่อให้ได้ข้อมูลข้างในครบ)
        // 2. coverImage: เปลี่ยนเป็น [fields]=url เพื่อเลี่ยง Error 'related'
        
        const apiUrl = `${CONFIG.API_URL}/api/knowledge-items/${docId}?populate[videoList][populate]=*&populate[coverImage][fields]=url`;
        
        console.log("Fetching:", apiUrl);
        const response = await fetch(apiUrl);
        
        // ถ้า Strapi ตอบกลับมาว่า Error ให้หยุดทำงานและแจ้งเตือน
        if (!response.ok) {
            const errorDetails = await response.json();
            console.error("API Error Details:", errorDetails);
            throw new Error(`API Error: ${response.status} (${errorDetails.error?.message || 'Unknown'})`);
        }
        
        const json = await response.json();
        const item = json.data;

        // 3. แสดงผล Title และ Description
        document.getElementById('content-title').innerText = item.title || 'Untitled';
        document.getElementById('content-body').innerHTML = item.description ? item.description.replace(/\n/g, '<br>') : '-';
        document.getElementById('view-count').innerText = `${item.views || 0} Views`;

        // // แสดงรูปปก (ถ้ามี)
        // if (item.coverImage) {
        //     const imgEl = document.getElementById('content-image');
        //     const imgContainer = document.getElementById('image-container');
        //     if(imgEl && imgContainer) {
        //         imgEl.src = `${CONFIG.MEDIA_URL}${item.coverImage.url}`;
        //         imgContainer.classList.remove('d-none');
        //     }
        // }

        // 4. Logic แสดงวิดีโอ (Video Player)
        const playerContainer = document.getElementById('video-player-container');
        const videoList = item.videoList || []; // ใช้ชื่อตัวเล็กตามรูปภาพ

        console.log("🎬 Video List Data:", videoList);

        if (videoList.length > 0) {
            const video = videoList[0];
            const type = video.sourceType; // ค่าจาก Enum: 'Direct', 'External', 'NAS'
            
            console.log("▶ Playing Type:", type);

            if (type === 'External' && video.externalUrl) {
                // --- YouTube / Link ---
                const getEmbed = (url) => {
                    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
                    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
                };
                const embedUrl = getEmbed(video.externalUrl);
                
                playerContainer.innerHTML = embedUrl 
                    ? `<iframe width="100%" height="100%" src="${embedUrl}" frameborder="0" allowfullscreen></iframe>`
                    : `<div class="text-white text-center p-5"><a href="${video.externalUrl}" target="_blank" class="btn btn-light">Open Link</a></div>`;

            } else if (type === 'Direct' && video.directFile) {
                // --- Upload File ---
                // เช็คว่ามีไฟล์จริงไหม
                const fileUrl = video.directFile.url;
                const mimeType = video.directFile.mime;
                
                playerContainer.innerHTML = `
                    <video width="100%" height="100%" controls controlsList="nodownload" style="background:black; max-height: 500px;">
                        <source src="${CONFIG.MEDIA_URL}${fileUrl}" type="${mimeType}">
                        Your browser does not support the video tag.
                    </video>`;

            } else if (type === 'NAS' && video.nasPath) {
                // --- NAS Path ---
                const safePath = video.nasPath.replace(/\\/g, '\\\\');
                playerContainer.innerHTML = `
                    <div class="text-center p-5 bg-light h-100 d-flex flex-column justify-content-center align-items-center">
                        <i class="bi bi-hdd-network display-1 text-secondary"></i>
                        <h5 class="mt-3 text-dark">Video on NAS</h5>
                        <div class="input-group mb-3 mt-3 w-75">
                            <input type="text" class="form-control" value="${video.nasPath}" readonly>
                            <button class="btn btn-primary" onclick="window.copyNasPath('${safePath}')">Copy Path</button>
                        </div>
                        <small class="text-muted">ไฟล์อยู่บนเซิร์ฟเวอร์ภายใน กรุณากด Copy แล้วเปิดใน File Explorer</small>
                    </div>`;
            } else {
                // กรณีเลือก Type แต่ไม่ใส่ข้อมูล
                playerContainer.innerHTML = `<div class="text-white h-100 d-flex align-items-center justify-content-center">Video source data is missing for type: ${type}</div>`;
            }
        } else {
            // ไม่มีวิดีโอ
            playerContainer.innerHTML = `<div class="text-white h-100 d-flex align-items-center justify-content-center">No video available</div>`;
        }

        // --------------------------------------------------------
        // 5. Logic สั่งนับยอดวิว (View Increment) - ใส่ตรงนี้ครับ!
        // --------------------------------------------------------
        try {
            // ยิงไปที่ Backend เพื่อบอกให้ +1
            const incrementUrl = `${CONFIG.API_URL}/api/knowledge-items/${docId}/increment-view`;
            const incResponse = await fetch(incrementUrl, {
                method: 'PUT', // สำคัญมาก: ต้องเป็น PUT
                headers: { 'Content-Type': 'application/json' }
            });

            // ถ้าสำเร็จ ให้เอาเลขล่าสุดมาโชว์ทันที
            if (incResponse.ok) {
                const incData = await incResponse.json();
                console.log("👁 View updated:", incData.views);
                
                // อัปเดตตัวเลขบนหน้าจอ (ถ้ามีข้อมูลกลับมา)
                if (incData && incData.views !== undefined) {
                    document.getElementById('view-count').innerText = `${incData.views} Views`;
                }
            } else {
                console.warn("View increment skipped (status):", incResponse.status);
            }
        } catch (viewErr) {
            // ถ้า Error ตรงนี้ ปล่อยผ่านได้เลย (อย่าให้กระทบการดูวิดีโอ)
            console.warn("View increment error:", viewErr);
        }

    } catch (error) {
        console.error("🔥 Error:", error);
        const playerContainer = document.getElementById('video-player-container');
        if(playerContainer) {
            playerContainer.innerHTML = `<div class="d-flex align-items-center justify-content-center h-100 text-white p-3 text-center">
                Error loading content.<br><small>${error.message}</small>
            </div>`;
        }
    }
});