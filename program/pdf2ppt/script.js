pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`;

const dropContainer = document.getElementById('drop-container');
const fileInput = document.getElementById('pdf-input');
const uploadLabel = document.getElementById('upload-label');

dropContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropContainer.classList.add('dragover');
});
dropContainer.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropContainer.classList.remove('dragover');
});
dropContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropContainer.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type === 'application/pdf') {
    processPdf(files[0]);
  } else {
    alert('Please choose a valid .pdf file!');
  }
});
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    processPdf(e.target.files[0]);
  }
});

async function processPdf(file) {
  if (!file) {
    alert('No file chosen');
    return;
  }

  uploadLabel.textContent = 'Reading file';
  uploadLabel.style.cursor = 'not-allowed';
  uploadLabel.style.backgroundColor = '#6c757d';

  try {
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);

    fileReader.onload = async (event) => {
      const typedarray = new Uint8Array(event.target.result);

      // =================== CJK FONT FIX START ===================
      // 定义 CMap 文件的路径
      const CMAP_URL = `https://unpkg.com/pdfjs-dist@3.4.120/cmaps/`;

      // 加载PDF文档，并提供 CMap 路径
      const pdf = await pdfjsLib
                      .getDocument({
                        data : typedarray,
                        cMapUrl : CMAP_URL,
                        cMapPacked : true,
                      })
                      .promise;
      // =================== CJK FONT FIX END =====================

      const numPages = pdf.numPages;

      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({scale : 1});
      const pdfWidth = viewport.width;
      const pdfHeight = viewport.height;

      const pptWidthInches = pdfWidth / 72;
      const pptHeightInches = pdfHeight / 72;

      let pptx = new PptxGenJS();
      pptx.defineLayout({
        name : 'CUSTOM_PDF_LAYOUT',
        width : pptWidthInches,
        height : pptHeightInches
      });
      pptx.layout = 'CUSTOM_PDF_LAYOUT';

      for (let i = 1; i <= numPages; i++) {
        uploadLabel.textContent = `Processing page ${i}/${numPages}`;

        const page = await pdf.getPage(i);

        const originalViewport = page.getViewport({scale : 1});
        const pxStr = document.getElementById("resolution-input").value;
        const targetPixels = pxStr == "" ? 2560 : parseInt(pxStr); // resolution

        const longestSide =
            Math.max(originalViewport.width, originalViewport.height);
        const scaleFor4k = targetPixels / longestSide;
        const renderViewport = page.getViewport({scale : scaleFor4k});

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = renderViewport.height;
        canvas.width = renderViewport.width;

        await page.render({canvasContext : context, viewport : renderViewport})
            .promise;

        const imageDataUrl = canvas.toDataURL('image/png');

        let slide = pptx.addSlide();
        slide.addImage(
            {data : imageDataUrl, x : 0, y : 0, w : '100%', h : '100%'});
      }

      uploadLabel.textContent = 'Generating .pptx file';
      const fileName = file.name.replace(/\.pdf$/i, '');
      await pptx.writeFile({fileName : `${fileName}.pptx`});

      resetButton();

      document.getElementById('info-text-downloaded').textContent =
          "Conversion complete! Downloaded: " + fileName + ".pptx";
    };
  } catch (error) {
    console.error('Error:', error);
    alert(`Error: ${error.message}`);
    resetButton();
  }
}

function resetButton() {
  uploadLabel.textContent = 'Choose PDF';
  uploadLabel.style.cursor = 'pointer';
  uploadLabel.style.backgroundColor = '#007bff';
  fileInput.value = '';
}
