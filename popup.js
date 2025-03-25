document.getElementById("backToStart").addEventListener("click", () => {
  document.getElementById("imageScreen").classList.add("hidden");
  document.getElementById("startScreen").classList.remove("hidden");
});

// Detect Images 
function detectImages() {
  const images = Array.from(document.images)
    .map((img) => img.src)
    .filter((src) => 
      src && 
      !src.includes("svg%3e") && 
      !src.startsWith("data:image/svg") && 
      !src.startsWith("about:")
    );

  const formatPriority = (url) => {
    if (url.endsWith(".svg")) return 1;
    if (url.endsWith(".png")) return 2;
    if (url.endsWith(".jpg") || url.endsWith(".jpeg")) return 3; 
    if (url.endsWith(".webp") || url.endsWith(".avif")) return 4; 
    return 5; 
  };

  images.sort((a, b) => formatPriority(a) - formatPriority(b));

  return Array.from(new Set(images));
}

function downloadImage(url) {
  chrome.downloads.download({
    url: url,
    filename: url.split("/").pop(),
  });
}

document.getElementById("refreshImages").addEventListener("click", () => {
  document.getElementById("detectImages").click();
});

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

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = image;
        checkbox.classList.add("image-checkbox");

        const preview = document.createElement("img");
        preview.src = image;

        const fileName = image.split("/").pop();
        const link = document.createElement("a");
        link.href = image;
        link.textContent = fileName;
        link.target = "_blank";
        link.classList.add("image-url");

        const convertToPngButton = document.createElement("button");
        convertToPngButton.textContent = "SVG to PNG";
        convertToPngButton.classList.add("convert-to-png");
        convertToPngButton.addEventListener("click", () => convertSvgToPng(image));

        const convertToSvgButton = document.createElement("button");
        convertToSvgButton.textContent = "PNG to SVG";
        convertToSvgButton.classList.add("convert-to-svg");
        convertToSvgButton.addEventListener("click", () => convertToSVG(image));

        const downloadButton = document.createElement("button");
        downloadButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      `;
        downloadButton.classList.add("download-btn");
        downloadButton.addEventListener("click", () => downloadImage(image));

        listItem.appendChild(checkbox);
        listItem.appendChild(preview);
        listItem.appendChild(link);
        listItem.appendChild(downloadButton);
        if (image.endsWith(".svg")) listItem.appendChild(convertToPngButton);
        if (image.endsWith(".png")) listItem.appendChild(convertToSvgButton);
        imageList.appendChild(listItem);
      });

      document.getElementById("startScreen").classList.add("hidden");
      document.getElementById("imageScreen").classList.remove("hidden");
    }
  );
});

// Download 
document.getElementById("downloadSelected").addEventListener("click", () => {
  const selectedImages = Array.from(document.querySelectorAll(".image-checkbox:checked"))
    .map((checkbox) => checkbox.value);

  if (selectedImages.length === 0) {
    alert("Please select at least one image!");
    return;
  }

  selectedImages.forEach((imageUrl, index) => {
    setTimeout(() => {
      chrome.downloads.download({
        url: imageUrl,
        filename: imageUrl.split("/").pop(),
      });
    }, index * 500); 
  });
});


document.getElementById("convertSvgToPng").addEventListener("click", async () => {
  const selectedImages = Array.from(document.querySelectorAll(".image-checkbox:checked"))
    .map((checkbox) => checkbox.value)
    .filter((url) => url.endsWith(".svg")); 

  if (selectedImages.length === 0) {
    alert("Please select at least one SVG image!");
    return;
  }

  selectedImages.forEach((imageUrl, index) => {
    setTimeout(() => convertSvgToPng(imageUrl), index * 1000); 
  });
});


document.getElementById("convertPngToSvg").addEventListener("click", async () => {
  const selectedImages = Array.from(document.querySelectorAll(".image-checkbox:checked"))
    .map((checkbox) => checkbox.value)
    .filter((url) => url.endsWith(".png"));

  if (selectedImages.length === 0) {
    alert("Please select at least one PNG image!");
    return;
  }

  selectedImages.forEach((imageUrl, index) => {
    setTimeout(() => convertToSVG(imageUrl), index * 1000);
  });
});

// Function to convert PNG to SVG
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


// Resize and download images
document.getElementById("resizeAndDownload").addEventListener("click", async () => {
  const selectedImages = Array.from(document.querySelectorAll(".image-checkbox:checked"))
    .map((checkbox) => checkbox.value);

  if (selectedImages.length === 0) {
    alert("Please select at least one image!");
    return;
  }
  const width = parseInt(document.getElementById("resizeWidth").value, 10) || 100;
  const height = parseInt(document.getElementById("resizeHeight").value, 10) || 100;

  if (width <= 0 || height <= 0) {
    alert("Please enter a valid width and height!");
    return;
  }

  selectedImages.forEach((imageUrl, index) => {
    setTimeout(() => resizeImageAndDownload(imageUrl, width, height), index * 1000);
  });
});


async function resizeImageAndDownload(imageUrl, newWidth, newHeight) {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const img = new Image();

  img.onload = () => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = newWidth;
    canvas.height = newHeight;

    context.drawImage(img, 0, 0, newWidth, newHeight);
    canvas.toBlob((resizedBlob) => {
      const resizedUrl = URL.createObjectURL(resizedBlob);
      chrome.downloads.download({
        url: resizedUrl,
        filename: `resized_${imageUrl.split("/").pop()}`,
      });
    });
  };

  img.src = URL.createObjectURL(blob);
}
