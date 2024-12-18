document.addEventListener("DOMContentLoaded", () => {
    const tiktokUrlInput = document.getElementById("tiktokUrl");
    const downloadBtn = document.getElementById("downloadBtn");
    const resultContainer = document.getElementById("resultContainer");
    const mediaPreview = document.getElementById("mediaPreview");
    const downloadLinks = document.getElementById("downloadLinks");
    const pasteBtn = document.getElementById("pasteBtn");

    const API_BASE_URL = "https://api.tiklydown.eu.org";

    // Fungsi untuk generate nama file unik
    function generateUniqueFilename(baseTitle) {
        // Bersihkan karakter yang tidak diinginkan
        const cleanTitle = baseTitle
            .replace(/[^a-zA-Z0-9]/g, '_')  // Ganti karakter non-alphanumeric dengan underscore
            .toLowerCase()
            .substring(0, 20);  // Batasi panjang judul

        // Generate timestamp dan random number
        const timestamp = new Date().getTime();
        const randomSuffix = Math.floor(Math.random() * 10000);

        // Kombinasikan untuk nama file unik
        return `${cleanTitle}_${timestamp}_${randomSuffix}`;
    }

    // Fungsi untuk paste link
    async function pasteLink() {
        try {
            const text = await navigator.clipboard.readText();
            tiktokUrlInput.value = text;
            tiktokUrlInput.classList.add("border-success");
            setTimeout(() => {
                tiktokUrlInput.classList.remove("border-success");
            }, 1000);
        } catch (err) {
            Swal.fire({
                title: "Gagal!",
                text: "Tidak dapat mengakses clipboard",
                icon: "error",
                confirmButtonColor: "#3085d6"
            });
        }
    }

    async function downloadTikTokMedia() {
        const url = tiktokUrlInput.value.trim();

        if (!url) {
            Swal.fire({
                title: "Error!",
                text: "Silakan masukkan URL TikTok",
                icon: "error",
                confirmButtonColor: "#3085d6"
            });
            return;
        }

        try {
            // Disable buttons dan tampilkan loading
            downloadBtn.disabled = true;
            pasteBtn.disabled = true;

            Swal.fire({
                title: "Memproses...",
                html: "Sedang mengambil data media",
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Panggil API download
            const response = await fetch(
                `${API_BASE_URL}/api/download?url=${encodeURIComponent(url)}`
            );

            // Log response status
            console.log("Response status:", response.status);

            // Cek apakah response berhasil
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error response:", errorText);
                throw new Error(
                    `HTTP error! status: ${response.status}, message: ${errorText}`
                );
            }

            const apiResponse = await response.json();

            // Log full API response
            console.log(
                "Full API Response:",
                JSON.stringify(apiResponse, null, 2)
            );

            // Tutup loading alert
            Swal.close();

            // Fungsi untuk memaksa download langsung
            const forceDownload = async (url, baseTitle, isWatermark = false) => {
                try {
                    Swal.fire({
                        title: "Mengunduh...",
                        html: "Mohon tunggu sebentar",
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    const response = await fetch(url);
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.style.display = "none";
                    a.href = blobUrl;

                    // Generate nama file unik
                    const uniqueFilename = generateUniqueFilename(baseTitle);
                    const fileExtension = isWatermark ? '_watermark.mp4' : '_nowatermark.mp4';
                    a.download = uniqueFilename + fileExtension;

                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(blobUrl);
                    document.body.removeChild(a);

                    Swal.fire({
                        title: "Berhasil!",
                        text: "Media telah diunduh",
                        icon: "success",
                        timer: 2000,
                        showConfirmButton: false
                    });
                } catch (error) {
                    Swal.fire({
                        title: "Gagal!",
                        text: "Gagal mengunduh media: " + error.message,
                        icon: "error",
                        confirmButtonColor: "#3085d6"
                    });
                }
            };

            // Cek struktur apiResponse
            if (!apiResponse || (!apiResponse.video && !apiResponse.data)) {
                throw new Error("Invalid API response structure");
            }

            // Pilih sumber data
            const data = apiResponse.data || apiResponse;

            // Ambil judul video, gunakan default jika tidak ada
            const videoTitle = data.title || "TikTok_Video";

            // Cek apakah media adalah video
            if (data.video) {
                // Preview video
                mediaPreview.innerHTML = `
                    <video controls class="img-fluid rounded shadow-sm">
                        <source src="${data.video.noWatermark}" type="video/mp4">
                        Browser tidak mendukung video.
                    </video>
                    <p class="text-center mt-2 text-muted">${videoTitle}</p>
                `;

                // Tombol download untuk video
                downloadLinks.innerHTML = `
                    <div class="row">
                        <div class="col-md-6 mb-2">
                            <button 
                                onclick="forceDownloadNoWatermark()"
                                class="btn btn-success w-100"
                            >
                                <i class="fas fa-download me-2"></i>Tanpa Watermark
                            </button>
                        </div>
                        <div class="col-md-6 mb-2">
                            <button 
                                onclick="forceDownloadWithWatermark()"
                                class="btn btn-secondary w-100"
                            >
                                <i class="fas fa-tag me-2"></i>Dengan Watermark
                            </button>
                        </div>
                    </div>
                `;

                // Tambahkan fungsi download ke window
                window.forceDownloadNoWatermark = () => {
                    forceDownload(
                        data.video.noWatermark,
                        videoTitle,
                        false
                    );
                };
                window.forceDownloadWithWatermark = () => {
                    forceDownload(
                        data.video.watermark,
                        videoTitle,
                        true
                    );
                };
            } else {
                // Gagal mengambil media
                Swal.fire({
                    title: "Error!",
                    text: "Gagal mengidentifikasi media. Struktur data tidak valid.",
                    icon: "error",
                    confirmButtonColor: "#3085d6"
                });
                return;
            }

            // Tampilkan hasil
            resultContainer.style.display = "block";
        } catch (error) {
            console.error("Download error:", error);
            Swal.fire({
                title: "Error!",
                text: "Gagal mengunduh media: " + error.message,
                icon: "error",
                confirmButtonColor: "#3085d6"
            });
        } finally {
            // Kembalikan tombol ke keadaan semula
            downloadBtn.disabled = false;
            pasteBtn.disabled = false;
        }
    }

    // Event Listener untuk tombol download dan paste
    downloadBtn.addEventListener("click", downloadTikTokMedia);
    pasteBtn.addEventListener("click", pasteLink);
});