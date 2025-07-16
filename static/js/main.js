// static/js/main.js

// --- HARDCODED PLACEMENT COORDINATES ---
// Change these X and Y values to set the placement position of the signature.
// (0, 0) is the top-left corner of the original contract image.
const PLACEMENT_X = 65;
const PLACEMENT_Y = 1460;

// --- DOM Element References ---
const contractInput = document.getElementById('contract-input');
const contractImage = document.getElementById('contract-image');
const placeSignatureBtn = document.getElementById('place-signature-btn');
const saveFinalBtn = document.getElementById('save-final-btn');
const statusDiv = document.getElementById('status');
const createSignatureBtn = document.getElementById('create-signature-btn');
const signatureOverlay = document.getElementById('signature-overlay');
const signaturePreview = document.getElementById('signature-preview');
const saveSignatureBtn = document.getElementById('save-signature-btn');
const loadSignatureInput = document.getElementById('load-signature-input');
const canvas = document.getElementById('signature-pad');
const signaturePad = new SignaturePad(canvas);

// --- State Variables ---
let contractB64 = null;
let finalImageB64 = null;
let savedSignature = { b64: null, width: 0, height: 0 };

// --- Functions and Event Handlers ---

function resizeCanvas() {
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.7;
    signaturePad.clear();
}

function checkState() {
    if (contractB64 && savedSignature.b64) {
        placeSignatureBtn.disabled = false;
        statusDiv.textContent = 'Ready to place signature.';
    } else {
        placeSignatureBtn.disabled = true;
    }
}

createSignatureBtn.addEventListener('click', () => {
    signatureOverlay.style.display = 'flex';
    resizeCanvas();
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && signatureOverlay.style.display === 'flex') {
        e.preventDefault();
        if (signaturePad.isEmpty()) {
            alert("Please draw a signature before saving.");
            return;
        }

        const TARGET_SIGNATURE_WIDTH = 200;
        const TARGET_SIGNATURE_HEIGHT = 100;
        const largeImageB64 = signaturePad.toDataURL('image/png');
        const img = new Image();
        img.src = largeImageB64;

        img.onload = () => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = TARGET_SIGNATURE_WIDTH;
            tempCanvas.height = TARGET_SIGNATURE_HEIGHT;
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0, TARGET_SIGNATURE_WIDTH, TARGET_SIGNATURE_HEIGHT);

            savedSignature.b64 = tempCanvas.toDataURL('image/png');
            savedSignature.width = TARGET_SIGNATURE_WIDTH;
            savedSignature.height = TARGET_SIGNATURE_HEIGHT;

            signaturePreview.src = savedSignature.b64;
            signatureOverlay.style.display = 'none';
            saveSignatureBtn.disabled = false;
            statusDiv.textContent = "Signature created.";
            checkState();
        };
    }
});

loadSignatureInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'image/png') { return; }
    
    const loadedB64 = await readFileAsBase64(file);
    const img = new Image();
    img.src = loadedB64;

    img.onload = () => {
        savedSignature.b64 = loadedB64;
        savedSignature.width = img.width;
        savedSignature.height = img.height;
        signaturePreview.src = savedSignature.b64;
        saveSignatureBtn.disabled = false;
        statusDiv.textContent = 'Signature loaded.';
        checkState();
    };
});

saveSignatureBtn.addEventListener('click', () => {
    if (!savedSignature.b64) return;
    const link = document.createElement('a');
    link.href = savedSignature.b64;
    link.download = 'signature.png';
    link.click();
});

contractInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    statusDiv.textContent = 'Loading contract...';
    saveFinalBtn.disabled = true;
    finalImageB64 = null;

    contractB64 = await readFileAsBase64(file);
    contractImage.src = contractB64;
    statusDiv.textContent = 'Contract loaded.';
    checkState();
});

placeSignatureBtn.addEventListener('click', async () => {
    if (!contractB64 || !savedSignature.b64) return;

    statusDiv.textContent = 'Processing... please wait.';
    placeSignatureBtn.disabled = true;

    const response = await fetch('/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contract: contractB64,
            signature: savedSignature.b64,
            x: PLACEMENT_X,
            y: PLACEMENT_Y
        })
    });

    const result = await response.json();
    if (result.status === 'success') {
        finalImageB64 = result.image;
        contractImage.src = finalImageB64;
        saveFinalBtn.disabled = false;
        statusDiv.textContent = 'Signature placed! Ready to save.';
    } else {
        statusDiv.textContent = `Error: ${result.message}`;
        contractImage.src = contractB64; // Restore original on error
        placeSignatureBtn.disabled = false;
    }
});

saveFinalBtn.addEventListener('click', () => {
    if (!finalImageB64) return;
    const link = document.createElement('a');
    link.href = finalImageB64;
    link.download = 'contract_signed.png';
    link.click();
});

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}