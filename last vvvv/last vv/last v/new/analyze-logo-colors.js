const fs = require('fs');
const zlib = require('zlib');

// Parse PNG file and properly handle scanline filters
function parsePNG(filePath) {
    const data = fs.readFileSync(filePath);
    const signature = data.slice(0, 8);
    if (signature.toString('hex') !== '89504e470d0a1a0a') {
        throw new Error('Not a valid PNG file');
    }

    let offset = 8;
    let width = 0, height = 0, bitDepth = 0, colorType = 0;
    const idatChunks = [];

    while (offset < data.length) {
        const length = data.readUInt32BE(offset);
        const type = data.slice(offset + 4, offset + 8).toString('ascii');

        if (type === 'IHDR') {
            width = data.readUInt32BE(offset + 8);
            height = data.readUInt32BE(offset + 12);
            bitDepth = data[offset + 16];
            colorType = data[offset + 17];
        } else if (type === 'IDAT') {
            idatChunks.push(data.slice(offset + 8, offset + 8 + length));
        } else if (type === 'IEND') {
            break;
        }

        offset += 12 + length;
    }

    const compressed = Buffer.concat(idatChunks);
    const rawData = zlib.inflateSync(compressed);

    return { width, height, bitDepth, colorType, rawData };
}

// Unfilter PNG scanlines (Reconstructed scanline algorithm per PNG spec)
function unfilterPng(rawData, width, height, channels) {
    const bpp = channels; // bytes per pixel for 8-bit
    const stride = width * bpp;
    const out = Buffer.alloc(height * stride);

    const paeth = (a, b, c) => {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        if (pa <= pb && pa <= pc) return a;
        if (pb <= pc) return b;
        return c;
    };

    for (let y = 0; y < height; y++) {
        const filterType = rawData[y * (stride + 1)];
        const rowStart = y * (stride + 1) + 1;
        const outStart = y * stride;

        for (let x = 0; x < stride; x++) {
            const raw = rawData[rowStart + x];
            const left = x >= bpp ? out[outStart + x - bpp] : 0;
            const up = y > 0 ? out[outStart - stride + x] : 0;
            const upLeft = (y > 0 && x >= bpp) ? out[outStart - stride + x - bpp] : 0;

            let val;
            switch (filterType) {
                case 0: val = raw; break;                              // None
                case 1: val = raw + left; break;                       // Sub
                case 2: val = raw + up; break;                         // Up
                case 3: val = raw + Math.floor((left + up) / 2); break; // Average
                case 4: val = raw + paeth(left, up, upLeft); break;    // Paeth
                default: throw new Error(`Unknown filter type: ${filterType}`);
            }
            out[outStart + x] = val & 0xFF;
        }
    }

    return out;
}

// Count dominant colors
function findDominantColors(filePath) {
    const { width, height, bitDepth, colorType, rawData } = parsePNG(filePath);
    console.log(`Image size: ${width}x${height}, bit depth: ${bitDepth}, color type: ${colorType}`);

    const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
    if (channels === undefined) throw new Error(`Unsupported color type: ${colorType}`);

    const pixels = unfilterPng(rawData, width, height, channels);

    const colorCounts = new Map();
    const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 5000)));

    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const i = (y * width + x) * channels;
            let r, g, b, a = 255;

            switch (colorType) {
                case 0: r = g = b = pixels[i]; break;
                case 2: r = pixels[i]; g = pixels[i + 1]; b = pixels[i + 2]; break;
                case 4: r = g = b = pixels[i]; a = pixels[i + 1]; break;
                case 6: r = pixels[i]; g = pixels[i + 1]; b = pixels[i + 2]; a = pixels[i + 3]; break;
                default: continue;
            }

            if (a < 100) continue; // skip transparent

            // Quantize to reduce noise (6 levels per channel)
            const qr = Math.min(255, Math.round(r / 51) * 51);
            const qg = Math.min(255, Math.round(g / 51) * 51);
            const qb = Math.min(255, Math.round(b / 51) * 51);
            const key = `${qr},${qg},${qb}`;
            colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
        }
    }

    const sorted = [...colorCounts.entries()]
        .map(([key, count]) => {
            const [r, g, b] = key.split(',').map(Number);
            return {
                r, g, b, count,
                hex: '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
            };
        })
        .sort((a, b) => b.count - a.count);

    console.log('\nTop 12 dominant colors:');
    const total = sorted.reduce((sum, c) => sum + c.count, 0);
    sorted.slice(0, 12).forEach((c, i) => {
        const pct = ((c.count / total) * 100).toFixed(2);
        console.log(`${i + 1}. ${c.hex}  RGB(${c.r}, ${c.g}, ${c.b})  ${pct}%`);
    });

    return sorted;
}

// Sample specific points across the logo
function sampleAreas(filePath) {
    const { width, height, bitDepth, colorType, rawData } = parsePNG(filePath);
    const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
    const pixels = unfilterPng(rawData, width, height, channels);

    console.log('\nSampling grid across the logo (every 25px):');
    for (let y = 0; y < height; y += 25) {
        for (let x = 0; x < width; x += 25) {
            const i = (y * width + x) * channels;
            let r, g, b, a = 255;
            switch (colorType) {
                case 0: r = g = b = pixels[i]; break;
                case 2: r = pixels[i]; g = pixels[i + 1]; b = pixels[i + 2]; break;
                case 6: r = pixels[i]; g = pixels[i + 1]; b = pixels[i + 2]; a = pixels[i + 3]; break;
                default: continue;
            }
            if (a < 100) continue;
            const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
            console.log(`(${x}, ${y}): ${hex}  RGB(${r}, ${g}, ${b})  Alpha: ${a}`);
        }
    }
}

const filePath = process.argv[2] || 'img/logo.png';
console.log(`=== Analyzing ${filePath} ===`);
findDominantColors(filePath);
sampleAreas(filePath);