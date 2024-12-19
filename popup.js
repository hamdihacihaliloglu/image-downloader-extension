document.getElementById("detectImages").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: detectImages,
    },
    (results) => {
      const images = results[0].result;
      const imageList = document.getElementById("imageList");
      imageList.innerHTML = "";
      images.forEach((image) => {
        const listItem = document.createElement("li");

        // Preview image
        // Önizleme resmi
        const preview = document.createElement("img");
        preview.src = image;

        // Extract file name from URL
        // URL'den dosya adını çıkar
        const fileName = image.split("/").pop();

        // Create a link for the URL
        // URL için bir bağlantı oluştur
        const link = document.createElement("a");
        link.href = image;
        link.textContent = fileName;
        link.target = "_blank";

        // Create a download button
        // İndirme butonu oluştur
        const downloadButton = document.createElement("button");
        downloadButton.textContent = "Original";
        downloadButton.addEventListener("click", () => downloadImage(image));

        // Add an SVG to PNG conversion button if the file is SVG
        // Dosya SVG ise, SVG'den PNG'ye dönüştürme butonu ekle
        if (image.endsWith(".svg")) {
          const convertButton = document.createElement("button");
          convertButton.textContent = "Convert to PNG";
          convertButton.classList.add("convert-to-svg");
          convertButton.addEventListener("click", () => convertSvgToPng(image));
          listItem.appendChild(convertButton);
        }

        // Add a PNG to SVG conversion button if the file is PNG
        // Dosya PNG ise, PNG'den SVG'ye dönüştürme butonu ekle
        if (image.endsWith(".png")) {
          const convertButton = document.createElement("button");
          convertButton.textContent = "Convert to SVG";
          convertButton.classList.add("convert-to-png");
          convertButton.addEventListener("click", () => convertToSVG(image));
          listItem.appendChild(convertButton);
        }

        // Append elements to the list item
        // Liste öğesine elemanları ekle
        listItem.appendChild(preview);
        listItem.appendChild(link);
        listItem.appendChild(downloadButton);
        imageList.appendChild(listItem);
      });
    }
  );
});

// Function to detect all images on the current page
// Mevcut sayfadaki tüm resimleri algılayan işlev
function detectImages() {
  const images = Array.from(document.images).map((img) => img.src);
  return images;
}

// Function to download an image
// Bir resmi indirme işlevi
function downloadImage(url) {
  chrome.downloads.download({
    url: url,
    filename: url.split("/").pop(),
  });
}

// Function to convert PNG to SVG
// PNG'den SVG'ye dönüştürme işlevi
async function convertToSVG(imageUrl) {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const img = new Image();

  img.onload = () => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;

    context.drawImage(img, 0, 0);

    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}">
        <image href="${canvas.toDataURL()}" width="${img.width}" height="${img.height}" />
      </svg>
    `;

    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: svgUrl,
      filename: "converted_image.svg",
    });
  };

  img.src = URL.createObjectURL(blob);
}

// Function to convert SVG to PNG
// SVG'den PNG'ye dönüştürme işlevi
async function convertSvgToPng(imageUrl) {
  const response = await fetch(imageUrl);
  const svgText = await response.text();
  const img = new Image();

  const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  img.onload = () => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;

    context.drawImage(img, 0, 0);

    canvas.toBlob((blob) => {
      const pngUrl = URL.createObjectURL(blob);
      chrome.downloads.download({
        url: pngUrl,
        filename: "converted_image.png",
      });
    });
  };

  img.src = svgUrl;
}
